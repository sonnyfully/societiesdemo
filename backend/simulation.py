"""Core simulation loop for the homophily simulation."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, TypeVar
from uuid import uuid4

try:
    from .agents import (
        DEFAULT_TOPIC,
        BudgetExceeded,
        CostTracker,
        MissingAnthropicKeyError,
        choose_engagements,
        generate_persona,
        generate_post,
        get_total_cost_usd,
        load_anthropic_api_key,
        reset_cost_tracking,
    )
    from .metrics import compute_round_metrics
    from .models import Engagement, Persona, Post, RoundMetrics, RoundSnapshot, Run
except ImportError:  # pragma: no cover - supports direct script execution.
    from agents import (
        DEFAULT_TOPIC,
        BudgetExceeded,
        CostTracker,
        MissingAnthropicKeyError,
        choose_engagements,
        generate_persona,
        generate_post,
        get_total_cost_usd,
        load_anthropic_api_key,
        reset_cost_tracking,
    )
    from metrics import compute_round_metrics
    from models import Engagement, Persona, Post, RoundMetrics, RoundSnapshot, Run


logger = logging.getLogger(__name__)
T = TypeVar("T")

BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_SEEDS_PATH = BACKEND_DIR / "personas" / "seeds.json"
DEFAULT_RUNS_DIR = BACKEND_DIR / "runs"
CONCURRENCY_LIMIT = 1
DEFAULT_N_AGENTS = 50
DEFAULT_N_ROUNDS = 8
RANDOM_SEED = 42


def placeholder_round_metrics(cost_usd: float = 0.0) -> RoundMetrics:
    """Stage 4 placeholder only; real analytical metrics arrive in Stage 5."""

    return RoundMetrics(
        n_communities=0,
        modularity=0.0,
        modularity_ci_low=0.0,
        modularity_ci_high=0.0,
        modularity_p=1.0,
        assortativity=0.0,
        content_engagement_correlation=0.0,
        cost_usd=cost_usd,
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
    cost_tracker: Optional[CostTracker],
    semaphore: asyncio.Semaphore,
) -> list[Persona]:
    seeds = load_seed_personas()
    personas = seeds[:n_agents]
    if len(personas) >= n_agents:
        return personas

    camps = load_camps()
    if not camps:
        raise ValueError("No persona camps configured in backend/personas/seeds.json")

    async def generate_for_camp(camp: str, existing_personas: list[Persona]) -> Persona:
        async with semaphore:
            return await generate_persona(
                topic,
                camp,
                cost_tracker,
                existing_personas=existing_personas,
            )

    while len(personas) < n_agents:
        camp_counts = {
            camp: sum(1 for persona in personas if persona.camp == camp)
            for camp in camps
        }
        camp = min(camps, key=lambda camp_name: (camp_counts[camp_name], camps.index(camp_name)))
        personas.append(await generate_for_camp(camp, personas))
    return personas


async def run_simulation(
    *,
    n_agents: int = DEFAULT_N_AGENTS,
    n_rounds: int = DEFAULT_N_ROUNDS,
    topic: str = DEFAULT_TOPIC,
    out_dir: Path = DEFAULT_RUNS_DIR,
    run_id: Optional[str] = None,
    personas_only: bool = False,
    regenerate_personas: bool = False,
) -> Run:
    reset_cost_tracking()

    random.seed(RANDOM_SEED)
    out_dir.mkdir(parents=True, exist_ok=True)
    resolved_run_id = run_id or str(uuid4())
    run_path = out_dir / f"{resolved_run_id}.json"
    started_at = datetime.now(timezone.utc)
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

    run = _load_run(run_path) if run_path.exists() else None
    if run is None:
        run = Run(
            id=resolved_run_id,
            topic=topic,
            n_agents=n_agents,
            n_rounds=n_rounds,
            started_at=started_at,
            completed_at=None,
            status="running",
            cost_usd=0.0,
            total_cost_usd=0.0,
            personas=[],
            rounds=[],
        )
    else:
        run.status = "running"
        run.n_agents = n_agents
        run.n_rounds = n_rounds
        run.topic = topic
        if regenerate_personas:
            run.personas = []
            run.rounds = []
            run.cost_usd = 0.0
            run.total_cost_usd = 0.0
            run.completed_at = None
        logger.info(
            "Resuming run %s from %s saved rounds and %s personas",
            run.id,
            len(run.rounds),
            len(run.personas),
        )
    baseline_cost_usd = run.total_cost_usd
    cost_tracker: Optional[CostTracker] = CostTracker(
        cap_usd=max(0.0, CostTracker().cap_usd - baseline_cost_usd)
    )
    save_run(run, run_path)

    try:
        load_anthropic_api_key()
        if len(run.personas) < n_agents:
            run.personas = await build_personas(n_agents, topic, cost_tracker, semaphore)
            run.cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
            run.total_cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
            save_run(run, run_path)

        if personas_only:
            run.status = "pending"
            run.completed_at = None
            save_run(run, run_path)
            logger.info("Saved %s personas for inspection in run %s", len(run.personas), run.id)
            return run

        for round_number in range(len(run.rounds) + 1, n_rounds + 1):
            logger.info("Starting round %s/%s", round_number, n_rounds)
            posts: list[Post] = []
            engagements: list[Engagement] = []
            try:
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
            except BudgetExceeded as exc:
                partial_posts = getattr(exc, "partial_posts", posts)
                partial_engagements = getattr(exc, "partial_engagements", engagements)
                if partial_posts or partial_engagements:
                    run.rounds.append(
                        RoundSnapshot(
                            round=round_number,
                            posts=partial_posts,
                            engagements=partial_engagements,
                            metrics=placeholder_round_metrics(
                                _total_cost_usd(cost_tracker, baseline_cost_usd)
                            ),
                        )
                    )
                run.status = "failed"
                run.completed_at = datetime.now(timezone.utc)
                run.cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
                run.total_cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
                save_run(run, run_path)
                raise
            round_cost = _total_cost_usd(cost_tracker, baseline_cost_usd)
            snapshot = RoundSnapshot(
                round=round_number,
                posts=posts,
                engagements=engagements,
                metrics=placeholder_round_metrics(round_cost),
            )
            snapshot.metrics = _compute_snapshot_metrics(
                run.personas,
                [*run.rounds, snapshot],
                round_number,
                round_cost,
            )
            run.rounds.append(snapshot)
            run.cost_usd = round_cost
            run.total_cost_usd = round_cost
            save_run(run, run_path)
            logger.info("Round %s complete. Running cost: $%.3f", round_number, round_cost)

        run.status = "complete"
        run.completed_at = datetime.now(timezone.utc)
        run.cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
        run.total_cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
        save_run(run, run_path)
        logger.info("Completed run %s; cost=$%.4f", run.id, run.total_cost_usd)
        return run
    except BudgetExceeded:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        run.cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
        run.total_cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
        save_run(run, run_path)
        raise
    except Exception:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        run.cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
        run.total_cost_usd = _total_cost_usd(cost_tracker, baseline_cost_usd)
        save_run(run, run_path)
        raise


async def _generate_round_posts(
    run: Run,
    round_number: int,
    cost_tracker: Optional[CostTracker],
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

    tasks = [asyncio.create_task(post_for_persona(persona)) for persona in run.personas]
    try:
        return await _gather_with_budget_cancel(tasks)
    except BudgetExceeded as exc:
        setattr(exc, "partial_posts", getattr(exc, "partial_results", []))
        raise


async def _generate_round_engagements(
    personas: list[Persona],
    posts: list[Post],
    prior_rounds: list[RoundSnapshot],
    round_number: int,
    cost_tracker: Optional[CostTracker],
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

    tasks = [asyncio.create_task(engagements_for_persona(persona)) for persona in personas]
    try:
        nested = await _gather_with_budget_cancel(tasks)
    except BudgetExceeded as exc:
        partial_nested = getattr(exc, "partial_results", [])
        setattr(
            exc,
            "partial_engagements",
            [engagement for group in partial_nested for engagement in group],
        )
        raise
    return [engagement for group in nested for engagement in group]


async def _gather_with_budget_cancel(tasks: list[asyncio.Task[T]]) -> list[T]:
    results: list[T] = []
    try:
        for task in asyncio.as_completed(tasks):
            results.append(await task)
    except BudgetExceeded as exc:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        setattr(exc, "partial_results", results)
        raise
    return results


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


def _compute_snapshot_metrics(
    personas: list[Persona],
    rounds: list[RoundSnapshot],
    round_number: int,
    cost_usd: float,
) -> RoundMetrics:
    try:
        return compute_round_metrics(
            personas,
            rounds,
            through_round=round_number,
            cost_usd=cost_usd,
        )
    except Exception as exc:  # noqa: BLE001 - keep costly runs inspectable if metrics fail.
        logger.error("Round %s metrics failed; using safe fallback: %s", round_number, exc)
        return placeholder_round_metrics(cost_usd)


def save_run(run: Run, path: Path) -> None:
    path.write_text(run.model_dump_json(indent=2), encoding="utf-8")


def _load_run(path: Path) -> Optional[Run]:
    try:
        return Run.model_validate_json(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None


def _total_cost_usd(cost_tracker: Optional[CostTracker], baseline_cost_usd: float) -> float:
    if cost_tracker is None:
        return baseline_cost_usd + get_total_cost_usd()
    return baseline_cost_usd + cost_tracker.cost_usd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a homophily simulation.")
    parser.add_argument("--agents", type=int, default=DEFAULT_N_AGENTS)
    parser.add_argument("--rounds", type=int, default=DEFAULT_N_ROUNDS)
    parser.add_argument("--topic", default=DEFAULT_TOPIC)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_RUNS_DIR)
    parser.add_argument("--run-id", default=None)
    parser.add_argument(
        "--regenerate-personas",
        action="store_true",
        help="Discard saved personas and rounds for the run id before generating personas.",
    )
    parser.add_argument(
        "--personas-only",
        action="store_true",
        help="Generate/load personas, save the run, and stop before posting rounds.",
    )
    return parser.parse_args()


async def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    args = parse_args()
    run = await run_simulation(
        n_agents=args.agents,
        n_rounds=args.rounds,
        topic=args.topic,
        out_dir=args.out_dir,
        run_id=args.run_id,
        personas_only=args.personas_only,
        regenerate_personas=args.regenerate_personas,
    )
    logger.info("Saved run %s in %s", run.id, args.out_dir)


if __name__ == "__main__":
    try:
        asyncio.run(_main())
    except MissingAnthropicKeyError as exc:
        raise SystemExit(str(exc)) from exc
