"""Core simulation loop for the homophily salon."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

try:
    from .agents import (
        DEFAULT_TOPIC,
        CostCapExceededError,
        CostTracker,
        MissingAnthropicKeyError,
        choose_engagements,
        generate_persona,
        generate_post,
        load_anthropic_api_key,
    )
    from .models import Engagement, Persona, Post, RoundMetrics, RoundSnapshot, Run
except ImportError:  # pragma: no cover - supports direct script execution.
    from agents import (
        DEFAULT_TOPIC,
        CostCapExceededError,
        CostTracker,
        MissingAnthropicKeyError,
        choose_engagements,
        generate_persona,
        generate_post,
        load_anthropic_api_key,
    )
    from models import Engagement, Persona, Post, RoundMetrics, RoundSnapshot, Run


logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_SEEDS_PATH = BACKEND_DIR / "personas" / "seeds.json"
DEFAULT_RUNS_DIR = BACKEND_DIR / "runs"
CONCURRENCY_LIMIT = 20
DEFAULT_N_AGENTS = 5
DEFAULT_N_ROUNDS = 1
RANDOM_SEED = 42


def placeholder_round_metrics() -> RoundMetrics:
    """Stage 4 placeholder only; real analytical metrics arrive in Stage 5."""

    return RoundMetrics(
        n_communities=0,
        modularity=0.0,
        modularity_ci_low=0.0,
        modularity_ci_high=0.0,
        modularity_p=1.0,
        assortativity=0.0,
        content_engagement_correlation=0.0,
    )


def load_seed_personas(path: Path = DEFAULT_SEEDS_PATH) -> list[Persona]:
    data = json.loads(path.read_text(encoding="utf-8"))
    personas: list[Persona] = []
    for camp in data.get("camps", []):
        camp_name = camp["name"]
        for seed in camp.get("seeds", []):
            personas.append(Persona.model_validate({**seed, "camp": camp_name}))
    return personas


def load_camps(path: Path = DEFAULT_SEEDS_PATH) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [camp["name"] for camp in data.get("camps", [])]


async def build_personas(
    n_agents: int,
    topic: str,
    cost_tracker: CostTracker,
    semaphore: asyncio.Semaphore,
) -> list[Persona]:
    seeds = load_seed_personas()
    personas = seeds[:n_agents]
    if len(personas) >= n_agents:
        return personas

    camps = load_camps()
    if not camps:
        raise ValueError("No persona camps configured in backend/personas/seeds.json")

    async def generate_for_camp(camp: str) -> Persona:
        async with semaphore:
            return await generate_persona(topic, camp, cost_tracker)

    missing = n_agents - len(personas)
    generated = await asyncio.gather(
        *(generate_for_camp(camps[index % len(camps)]) for index in range(missing))
    )
    return [*personas, *generated]


async def run_salon(
    *,
    n_agents: int = DEFAULT_N_AGENTS,
    n_rounds: int = DEFAULT_N_ROUNDS,
    topic: str = DEFAULT_TOPIC,
    out_dir: Path = DEFAULT_RUNS_DIR,
) -> Run:
    load_anthropic_api_key()

    random.seed(RANDOM_SEED)
    out_dir.mkdir(parents=True, exist_ok=True)
    run_id = str(uuid4())
    run_path = out_dir / f"{run_id}.json"
    started_at = datetime.now(timezone.utc)
    cost_tracker = CostTracker()
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

    run = Run(
        id=run_id,
        topic=topic,
        n_agents=n_agents,
        n_rounds=n_rounds,
        started_at=started_at,
        completed_at=None,
        status="running",
        cost_usd=0.0,
        personas=[],
        rounds=[],
    )

    try:
        run.personas = await build_personas(n_agents, topic, cost_tracker, semaphore)
        run.cost_usd = cost_tracker.cost_usd
        save_run(run, run_path)

        for round_number in range(1, n_rounds + 1):
            logger.info("Starting round %s/%s", round_number, n_rounds)
            posts = await _generate_round_posts(
                run,
                round_number,
                cost_tracker,
                semaphore,
            )
            engagements = await _generate_round_engagements(
                run.personas,
                posts,
                run.rounds,
                round_number,
                cost_tracker,
                semaphore,
            )
            snapshot = RoundSnapshot(
                round=round_number,
                posts=posts,
                engagements=engagements,
                metrics=placeholder_round_metrics(),
            )
            run.rounds.append(snapshot)
            run.cost_usd = cost_tracker.cost_usd
            save_run(run, run_path)

        run.status = "complete"
        run.completed_at = datetime.now(timezone.utc)
        run.cost_usd = cost_tracker.cost_usd
        save_run(run, run_path)
        logger.info("Completed run %s; cost=$%.4f", run.id, run.cost_usd)
        return run
    except CostCapExceededError:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        run.cost_usd = cost_tracker.cost_usd
        save_run(run, run_path)
        raise
    except Exception:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        run.cost_usd = cost_tracker.cost_usd
        save_run(run, run_path)
        raise


async def _generate_round_posts(
    run: Run,
    round_number: int,
    cost_tracker: CostTracker,
    semaphore: asyncio.Semaphore,
) -> list[Post]:
    previous_round_posts = run.rounds[-1].posts if run.rounds else []

    async def post_for_persona(persona: Persona) -> Post:
        own_posts = [
            post
            for snapshot in run.rounds
            for post in snapshot.posts
            if post.agent_id == persona.id
        ][-3:]
        recent_feed = _sample(previous_round_posts, 5)
        async with semaphore:
            content = await generate_post(
                persona,
                run.topic,
                own_posts,
                recent_feed,
                cost_tracker,
            )
        return Post(
            id=str(uuid4()),
            agent_id=persona.id,
            round=round_number,
            content=content,
            timestamp=datetime.now(timezone.utc),
        )

    return list(await asyncio.gather(*(post_for_persona(persona) for persona in run.personas)))


async def _generate_round_engagements(
    personas: list[Persona],
    posts: list[Post],
    prior_rounds: list[RoundSnapshot],
    round_number: int,
    cost_tracker: CostTracker,
    semaphore: asyncio.Semaphore,
) -> list[Engagement]:
    post_by_id = {post.id: post for post in posts}
    agent_by_id = {persona.id: persona for persona in personas}

    async def engagements_for_persona(persona: Persona) -> list[Engagement]:
        feed = build_engagement_feed(persona.id, posts, prior_rounds)
        if not feed:
            return []
        async with semaphore:
            choices = await choose_engagements(persona, feed, cost_tracker)
        engagements = []
        for choice in choices:
            target = feed[choice.post_id - 1]
            if target.id not in post_by_id or target.agent_id not in agent_by_id:
                continue
            engagements.append(
                Engagement(
                    from_agent=persona.id,
                    to_post=target.id,
                    to_agent=target.agent_id,
                    action=choice.action,
                    round=round_number,
                )
            )
        return engagements

    nested = await asyncio.gather(
        *(engagements_for_persona(persona) for persona in personas)
    )
    return [engagement for group in nested for engagement in group]


def build_engagement_feed(
    agent_id: str,
    same_round_posts: list[Post],
    prior_rounds: list[RoundSnapshot],
) -> list[Post]:
    candidates = [post for post in same_round_posts if post.agent_id != agent_id]
    if not candidates:
        return []

    prior_engaged_agents = {
        engagement.to_agent
        for snapshot in prior_rounds
        for engagement in snapshot.engagements
        if engagement.from_agent == agent_id
    }
    prior_engaged_posts = [
        post for post in candidates if post.agent_id in prior_engaged_agents
    ]
    popular_posts = _popular_posts(candidates, prior_rounds)

    feed: list[Post] = []
    _extend_unique(feed, _sample(candidates, 3))
    _extend_unique(feed, _sample(prior_engaged_posts or candidates, 3))
    _extend_unique(feed, popular_posts[:2] or _sample(candidates, 2))
    _extend_unique(feed, _sample(candidates, 2))

    if len(feed) < min(10, len(candidates)):
        _extend_unique(feed, candidates)
    return feed[:10]


def _popular_posts(posts: list[Post], prior_rounds: list[RoundSnapshot]) -> list[Post]:
    counts = {
        engagement.to_post: 0
        for snapshot in prior_rounds
        for engagement in snapshot.engagements
    }
    for snapshot in prior_rounds:
        for engagement in snapshot.engagements:
            counts[engagement.to_post] = counts.get(engagement.to_post, 0) + 1
    return sorted(posts, key=lambda post: counts.get(post.id, 0), reverse=True)


def _sample(items: list[Post], count: int) -> list[Post]:
    if len(items) <= count:
        return list(items)
    return random.sample(items, count)


def _extend_unique(target: list[Post], additions: list[Post]) -> None:
    existing = {post.id for post in target}
    for post in additions:
        if post.id not in existing:
            target.append(post)
            existing.add(post.id)


def save_run(run: Run, path: Path) -> None:
    path.write_text(run.model_dump_json(indent=2), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a cheap homophily salon smoke test.")
    parser.add_argument("--agents", type=int, default=DEFAULT_N_AGENTS)
    parser.add_argument("--rounds", type=int, default=DEFAULT_N_ROUNDS)
    parser.add_argument("--topic", default=DEFAULT_TOPIC)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_RUNS_DIR)
    return parser.parse_args()


async def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    args = parse_args()
    run = await run_salon(
        n_agents=args.agents,
        n_rounds=args.rounds,
        topic=args.topic,
        out_dir=args.out_dir,
    )
    logger.info("Saved run %s in %s", run.id, args.out_dir)


if __name__ == "__main__":
    try:
        asyncio.run(_main())
    except MissingAnthropicKeyError as exc:
        raise SystemExit(str(exc)) from exc
