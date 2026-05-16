"""Claude-backed persona, post, and engagement generation."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Union
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationError

try:
    from .models import Persona, Post
except ImportError:  # pragma: no cover - supports direct script execution.
    from models import Persona, Post


logger = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
DEFAULT_TOPIC = "Should universities ban AI in coursework?"
COST_CAP_USD = 5.0
INPUT_COST_PER_MILLION = 1.0
CACHE_WRITE_COST_PER_MILLION = 1.25
CACHE_READ_COST_PER_MILLION = 0.10
OUTPUT_COST_PER_MILLION = 5.0
RETRY_DELAYS_SECONDS = (2, 8, 30, 60, 120)
MAX_CLAUDE_CALLS_PER_MINUTE = 45
CLAUDE_TIMEOUT_SECONDS = 120.0
CLAUDE_CONNECT_TIMEOUT_SECONDS = 30.0

PERSONA_MAX_TOKENS = 250
POST_MAX_TOKENS = 200
ENGAGEMENT_MAX_TOKENS = 150

PERSONA_TEMPERATURE = 1.0
POST_TEMPERATURE = 1.0
ENGAGEMENT_TEMPERATURE = 0.7

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"
MessageContent = Union[str, list[dict[str, object]]]


class MissingAnthropicKeyError(RuntimeError):
    """Raised when no Anthropic API key is configured."""


class BudgetExceeded(RuntimeError):
    """Raised when a run exceeds the configured cost ceiling."""


class PersonaPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    bio: str
    voice: str
    stance: str


class EngagementChoice(BaseModel):
    model_config = ConfigDict(extra="forbid")

    post_id: int
    action: str = Field(pattern="^(LIKE|FOLLOW|IGNORE)$")


class EngagementPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decisions: list[EngagementChoice]


@dataclass
class CostTracker:
    input_tokens_uncached: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    output_tokens: int = 0
    cap_usd: float = COST_CAP_USD

    @property
    def cost_usd(self) -> float:
        return (
            self.input_tokens_uncached / 1_000_000 * INPUT_COST_PER_MILLION
            + self.cache_creation_input_tokens / 1_000_000 * CACHE_WRITE_COST_PER_MILLION
            + self.cache_read_input_tokens / 1_000_000 * CACHE_READ_COST_PER_MILLION
            + self.output_tokens / 1_000_000 * OUTPUT_COST_PER_MILLION
        )

    def record(
        self,
        *,
        input_tokens: int,
        cache_creation_input_tokens: int,
        cache_read_input_tokens: int,
        output_tokens: int,
    ) -> None:
        self.input_tokens_uncached += input_tokens
        self.cache_creation_input_tokens += cache_creation_input_tokens
        self.cache_read_input_tokens += cache_read_input_tokens
        self.output_tokens += output_tokens
        if self.cost_usd > self.cap_usd:
            raise BudgetExceeded(
                f"Run cost ${self.cost_usd:.4f} exceeded cap ${self.cap_usd:.2f}"
            )


_COST_TRACKER = CostTracker()
_CALL_TIMESTAMPS: list[float] = []


def get_total_cost_usd() -> float:
    return _COST_TRACKER.cost_usd


def reset_cost_tracking() -> None:
    global _COST_TRACKER
    _COST_TRACKER = CostTracker()


def _active_cost_tracker(cost_tracker: Optional[CostTracker]) -> CostTracker:
    return cost_tracker or _COST_TRACKER


def load_anthropic_api_key(env_path: Path = ENV_PATH) -> str:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        return key

    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            name, value = stripped.split("=", 1)
            if name.strip() == "ANTHROPIC_API_KEY" and value.strip():
                key = value.strip().strip('"').strip("'")
                os.environ["ANTHROPIC_API_KEY"] = key
                return key

    raise MissingAnthropicKeyError(
        f"Missing ANTHROPIC_API_KEY. Add it to {env_path} as ANTHROPIC_API_KEY=..."
    )


def _extract_text(response: object) -> str:
    content = getattr(response, "content", None)
    if isinstance(content, list):
        parts = []
        for block in content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        if parts:
            return "\n".join(parts).strip()
    text = getattr(response, "text", None)
    if text:
        return str(text).strip()
    return str(response).strip()


def _record_usage(response: object, cost_tracker: CostTracker) -> None:
    usage = getattr(response, "usage", None)
    input_tokens = int(getattr(usage, "input_tokens", 0) or 0)
    cache_creation_input_tokens = int(
        getattr(usage, "cache_creation_input_tokens", 0) or 0
    )
    cache_read_input_tokens = int(getattr(usage, "cache_read_input_tokens", 0) or 0)
    output_tokens = int(getattr(usage, "output_tokens", 0) or 0)
    cost_tracker.record(
        input_tokens=input_tokens,
        cache_creation_input_tokens=cache_creation_input_tokens,
        cache_read_input_tokens=cache_read_input_tokens,
        output_tokens=output_tokens,
    )


async def call_claude(
    content: MessageContent,
    *,
    request_name: str,
    max_tokens: int,
    temperature: float,
    cost_tracker: Optional[CostTracker] = None,
) -> str:
    api_key = load_anthropic_api_key()
    try:
        import httpx
        from anthropic import AsyncAnthropic
    except ImportError as exc:
        raise RuntimeError(
            "The anthropic package is not installed. Install backend/requirements.txt first."
        ) from exc

    client = AsyncAnthropic(
        api_key=api_key,
        max_retries=0,
        timeout=httpx.Timeout(
            CLAUDE_TIMEOUT_SECONDS,
            connect=CLAUDE_CONNECT_TIMEOUT_SECONDS,
        ),
    )
    tracker = _active_cost_tracker(cost_tracker)
    last_error: Optional[Exception] = None

    for attempt, delay in enumerate((0, *RETRY_DELAYS_SECONDS), start=1):
        if delay:
            await asyncio.sleep(delay)
        try:
            await _wait_for_rate_limit()
            response = await client.messages.create(
                model=MODEL,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": content}],
            )
            _record_usage(response, tracker)
            logger.info(
                (
                    "%s succeeded on attempt %s; input=%s cache_write=%s "
                    "cache_read=%s output=%s cost=$%.4f"
                ),
                request_name,
                attempt,
                tracker.input_tokens_uncached,
                tracker.cache_creation_input_tokens,
                tracker.cache_read_input_tokens,
                tracker.output_tokens,
                tracker.cost_usd,
            )
            return _extract_text(response)
        except BudgetExceeded:
            raise
        except Exception as exc:  # noqa: BLE001 - central retry boundary logs unknown SDK failures.
            last_error = exc
            logger.error("%s failed on attempt %s: %s", request_name, attempt, exc)

    raise RuntimeError(f"{request_name} failed after retries") from last_error


async def _wait_for_rate_limit() -> None:
    now = time.monotonic()
    window_start = now - 60.0
    active_timestamps = [
        timestamp for timestamp in _CALL_TIMESTAMPS if timestamp > window_start
    ]
    _CALL_TIMESTAMPS[:] = active_timestamps
    if len(_CALL_TIMESTAMPS) >= MAX_CLAUDE_CALLS_PER_MINUTE:
        sleep_for = max(0.0, 60.0 - (now - _CALL_TIMESTAMPS[0]))
        logger.info("Claude rate limiter sleeping %.1fs", sleep_for)
        await asyncio.sleep(sleep_for)
    _CALL_TIMESTAMPS.append(time.monotonic())


def _parse_json_object(text: str) -> dict:
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        parsed = json.loads(text[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("Claude response was not a JSON object")
    return parsed


async def generate_persona(
    topic: str,
    camp: str,
    cost_tracker: Optional[CostTracker] = None,
    existing_personas: Optional[list[Persona]] = None,
) -> Persona:
    existing_text = _format_existing_personas(existing_personas or [])
    prompt = f"""You are generating a persona profile for an agent in a social media simulation.
The agent will discuss the topic: "{topic}".

Generate a persona belonging to the "{camp}" perspective on this topic.
The persona should feel like a real person — specific profession, age, life
context, communication style. Avoid stereotypes.

Avoid reusing any of these existing names, occupations, or life contexts:
{existing_text}

Use a distinctive first name or handle, and vary age, profession, sector,
region, and educational background from the examples above.

Output JSON only:
{{
  "name": "first name only or handle",
  "bio": "one sentence",
  "voice": "two adjectives describing how they write",
  "stance": "one sentence on their view of the topic"
}}"""
    text = await call_claude(
        prompt,
        request_name="persona_generation",
        max_tokens=PERSONA_MAX_TOKENS,
        temperature=PERSONA_TEMPERATURE,
        cost_tracker=cost_tracker,
    )
    payload = PersonaPayload.model_validate(_parse_json_object(text))
    return Persona(
        id=str(uuid4()),
        name=payload.name,
        bio=payload.bio,
        voice=payload.voice,
        stance=payload.stance,
        camp=camp,
    )


async def generate_post(
    persona: Persona,
    topic: str,
    past_posts: list[Post],
    recent_feed: list[Post],
    cost_tracker: Optional[CostTracker] = None,
) -> str:
    past_post_text = _format_posts_for_context(past_posts, "[no prior posts]")
    recent_feed_text = _format_posts_for_context(recent_feed, "[no prior round]")
    content: list[dict[str, object]] = [
        {
            "type": "text",
            "text": (
                f"You are {persona.name}. {persona.bio}. "
                f"You write in a {persona.voice} style.\n"
                f'Your view on "{topic}": {persona.stance}.'
            ),
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": f"""You are posting on a discussion platform. Your past posts:
{past_post_text}

Other recent posts in the discussion:
{recent_feed_text}

Write your next post. 1–2 sentences. In character. Do not preface with
"as {persona.name}" — just write the post.""",
        },
    ]
    text = await call_claude(
        content,
        request_name="post_generation",
        max_tokens=POST_MAX_TOKENS,
        temperature=POST_TEMPERATURE,
        cost_tracker=cost_tracker,
    )
    return text.strip()


async def choose_engagements(
    persona: Persona,
    numbered_posts: list[Post],
    cost_tracker: Optional[CostTracker] = None,
) -> list[EngagementChoice]:
    if not numbered_posts:
        return []

    numbered_text = "\n".join(
        f"{index}. {post.content}" for index, post in enumerate(numbered_posts, start=1)
    )
    content: list[dict[str, object]] = [
        {
            "type": "text",
            "text": f"You are {persona.name}. {persona.bio}.",
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": f"""You have read these posts:

{numbered_text}

Choose 1–3 you want to engage with. For each, choose one action:
LIKE, FOLLOW, or IGNORE. Make decisions in character.

Output JSON only:
{{"decisions": [{{"post_id": 3, "action": "LIKE"}}, ...]}}""",
        },
    ]
    text = await call_claude(
        content,
        request_name="engagement_decision",
        max_tokens=ENGAGEMENT_MAX_TOKENS,
        temperature=ENGAGEMENT_TEMPERATURE,
        cost_tracker=cost_tracker,
    )
    try:
        payload = EngagementPayload.model_validate(_parse_json_object(text))
    except (json.JSONDecodeError, ValidationError, ValueError) as exc:
        logger.error("Skipping malformed engagement response for %s: %s", persona.id, exc)
        return []
    return [
        choice
        for choice in payload.decisions[:3]
        if 1 <= choice.post_id <= len(numbered_posts)
    ]


def _format_posts_for_context(posts: list[Post], empty: str) -> str:
    if not posts:
        return empty
    return "\n".join(f"- {post.content}" for post in posts)


def _format_existing_personas(personas: list[Persona]) -> str:
    if not personas:
        return "- [none yet]"
    return "\n".join(
        f"- {persona.name}: {persona.bio}"
        for persona in personas[-20:]
    )


async def _smoke() -> None:
    logging.basicConfig(level=logging.INFO)
    tracker = CostTracker()
    persona = await generate_persona(
        DEFAULT_TOPIC,
        "pragmatic reformers",
        tracker,
    )
    logger.info(
        "Smoke persona parsed: %s (%s); estimated cost=$%.4f",
        persona.name,
        persona.camp,
        tracker.cost_usd,
    )


if __name__ == "__main__":
    try:
        asyncio.run(_smoke())
    except MissingAnthropicKeyError as exc:
        raise SystemExit(str(exc)) from exc
