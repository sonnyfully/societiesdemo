"""FastAPI entrypoint for the homophily simulation backend."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

try:
    from .agents import DEFAULT_TOPIC
    from .metrics import (
        DEFAULT_EMBEDDING_MODEL,
        agent_embeddings_for_posts,
        build_weighted_engagement_graph,
        community_id_by_agent,
        cumulative_round_data,
        detect_communities,
    )
    from .models import (
        AgentEmbedding,
        AnalysisResponse,
        FeedItem,
        GraphEdge,
        GraphNode,
        GraphResponse,
        Post,
        RoundMetricPoint,
        Run,
        RunCreateRequest,
        RunCreateResponse,
        RoundSnapshot,
        EmbeddingCache,
    )
    from .simulation import DEFAULT_N_AGENTS, DEFAULT_N_ROUNDS, DEFAULT_RUNS_DIR, run_simulation
except ImportError:  # pragma: no cover - supports running from backend/ directly.
    from agents import DEFAULT_TOPIC
    from metrics import (
        DEFAULT_EMBEDDING_MODEL,
        agent_embeddings_for_posts,
        build_weighted_engagement_graph,
        community_id_by_agent,
        cumulative_round_data,
        detect_communities,
    )
    from models import (
        AgentEmbedding,
        AnalysisResponse,
        FeedItem,
        GraphEdge,
        GraphNode,
        GraphResponse,
        Post,
        RoundMetricPoint,
        Run,
        RunCreateRequest,
        RunCreateResponse,
        RoundSnapshot,
        EmbeddingCache,
    )
    from simulation import DEFAULT_N_AGENTS, DEFAULT_N_ROUNDS, DEFAULT_RUNS_DIR, run_simulation


logger = logging.getLogger(__name__)

app = FastAPI(title="Homophily Simulation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.post("/runs", response_model=RunCreateResponse)
async def create_run(
    request: RunCreateRequest,
    background_tasks: BackgroundTasks,
) -> RunCreateResponse:
    if not request.confirm_spend:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "spend_confirmation_required",
                "message": "Set confirm_spend=true to start a live Claude run.",
            },
        )

    run_id = str(uuid4())
    background_tasks.add_task(
        _run_simulation_background,
        run_id,
        request.topic or DEFAULT_TOPIC,
        request.n_agents,
        request.n_rounds,
    )
    return RunCreateResponse(run_id=run_id, status="pending")


@app.get("/runs/{run_id}", response_model=Run)
async def get_run(run_id: str) -> Run:
    return _load_run_or_404(run_id)


@app.get("/runs/{run_id}/feed", response_model=list[FeedItem])
async def get_feed(
    run_id: str,
    round: int = Query(..., ge=1),  # noqa: A002 - API query parameter is named round.
) -> list[FeedItem]:
    run = _load_run_or_404(run_id)
    snapshot = _round_or_400(run, round)
    return _feed_items(run, snapshot.round)


@app.get("/runs/{run_id}/graph", response_model=GraphResponse)
async def get_graph(
    run_id: str,
    round: int = Query(..., ge=1),  # noqa: A002 - API query parameter is named round.
) -> GraphResponse:
    run = _load_run_or_404(run_id)
    snapshot = _round_or_400(run, round)
    return _graph_response(run, snapshot.round)


@app.get("/runs/{run_id}/analysis", response_model=AnalysisResponse)
async def get_analysis(run_id: str) -> AnalysisResponse:
    run = _load_run_or_404(run_id)
    round_number = run.rounds[-1].round if run.rounds else 0
    communities = {}
    if round_number:
        graph_response = _graph_response(run, round_number)
        communities = {node.id: node.community for node in graph_response.nodes}

    posts, _ = cumulative_round_data(run.rounds)
    embeddings: list[AgentEmbedding] = []
    embeddings_available = False
    cached_embeddings = _load_embedding_cache(run, posts)
    if cached_embeddings is not None:
        embeddings = cached_embeddings
        embeddings_available = bool(embeddings)
    else:
        try:
            embedding_map = agent_embeddings_for_posts(run.personas, posts)
            embeddings = [
                AgentEmbedding(agent_id=agent_id, embedding=embedding)
                for agent_id, embedding in embedding_map.items()
            ]
            embeddings_available = bool(embeddings)
        except Exception as exc:  # noqa: BLE001 - endpoint should still return metrics.
            logger.warning("Analysis embeddings unavailable for run %s: %s", run.id, exc)

    return AnalysisResponse(
        run_id=run.id,
        status=run.status,
        topic=run.topic,
        per_round_metrics=[
            RoundMetricPoint(round=snapshot.round, metrics=snapshot.metrics)
            for snapshot in run.rounds
        ],
        final_metrics=run.rounds[-1].metrics if run.rounds else None,
        communities=communities,
        embeddings=embeddings,
        embeddings_available=embeddings_available,
    )


async def _run_simulation_background(
    run_id: str,
    topic: str,
    n_agents: int,
    n_rounds: int,
) -> None:
    try:
        await run_simulation(
            run_id=run_id,
            topic=topic,
            n_agents=n_agents,
            n_rounds=n_rounds,
            out_dir=DEFAULT_RUNS_DIR,
        )
    except Exception as exc:  # noqa: BLE001 - background boundary must log failures.
        logger.error("Background run %s failed: %s", run_id, exc)


def _run_path(run_id: str) -> Path:
    if Path(run_id).name != run_id or run_id.endswith(".json"):
        raise HTTPException(status_code=400, detail={"code": "invalid_run_id"})
    return DEFAULT_RUNS_DIR / f"{run_id}.json"


def _embedding_cache_path(run_id: str) -> Path:
    if Path(run_id).name != run_id or run_id.endswith(".json"):
        raise HTTPException(status_code=400, detail={"code": "invalid_run_id"})
    return DEFAULT_RUNS_DIR / f"{run_id}.embeddings.json"


def _load_embedding_cache(run: Run, posts: list[Post]) -> list[AgentEmbedding] | None:
    path = _embedding_cache_path(run.id)
    if not path.exists():
        return None

    try:
        cache = EmbeddingCache.model_validate_json(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001 - invalid cache should not break analysis.
        logger.warning("Embedding cache invalid for run %s: %s", run.id, exc)
        return None

    posted_agent_ids = {post.agent_id for post in posts}
    expected_agent_ids = {persona.id for persona in run.personas if persona.id in posted_agent_ids}
    cached_agent_ids = {embedding.agent_id for embedding in cache.embeddings}
    if cache.run_id != run.id or cache.model != DEFAULT_EMBEDDING_MODEL:
        logger.warning("Embedding cache metadata mismatch for run %s", run.id)
        return None
    if cached_agent_ids != expected_agent_ids:
        logger.warning("Embedding cache agent ids mismatch for run %s", run.id)
        return None
    return cache.embeddings


def _load_run_or_404(run_id: str) -> Run:
    path = _run_path(run_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail={"code": "run_not_found"})
    try:
        return Run.model_validate_json(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail={"code": "run_file_invalid_json"},
        ) from exc


def _round_or_400(run: Run, round_number: int) -> RoundSnapshot:
    for snapshot in run.rounds:
        if snapshot.round == round_number:
            return snapshot
    raise HTTPException(
        status_code=400,
        detail={
            "code": "round_not_available",
            "available_rounds": [snapshot.round for snapshot in run.rounds],
        },
    )


def _feed_items(run: Run, round_number: int) -> list[FeedItem]:
    snapshot = _round_or_400(run, round_number)
    persona_by_id = {persona.id: persona for persona in run.personas}
    counts = _post_action_counts(snapshot)
    return [
        FeedItem(
            post_id=post.id,
            agent_id=post.agent_id,
            agent_name=persona_by_id[post.agent_id].name,
            agent_camp=persona_by_id[post.agent_id].camp,
            round=post.round,
            content=post.content,
            timestamp=post.timestamp,
            like_count=counts[post.id]["LIKE"],
            follow_count=counts[post.id]["FOLLOW"],
            ignore_count=counts[post.id]["IGNORE"],
            engagement_count=counts[post.id]["LIKE"] + counts[post.id]["FOLLOW"],
        )
        for post in snapshot.posts
        if post.agent_id in persona_by_id
    ]


def _graph_response(run: Run, round_number: int) -> GraphResponse:
    posts, engagements = cumulative_round_data(run.rounds, through_round=round_number)
    graph = build_weighted_engagement_graph(run.personas, engagements)
    communities = community_id_by_agent(detect_communities(graph))
    post_counts: dict[str, int] = {}
    for post in posts:
        post_counts[post.agent_id] = post_counts.get(post.agent_id, 0) + 1

    nodes = [
        GraphNode(
            id=persona.id,
            name=persona.name,
            camp=persona.camp,
            community=communities.get(persona.id, -1),
            post_count=post_counts.get(persona.id, 0),
        )
        for persona in run.personas
    ]
    edges = [
        GraphEdge(
            source=str(source),
            target=str(target),
            weight=float(data.get("weight", 0.0)),
        )
        for source, target, data in graph.edges(data=True)
    ]
    return GraphResponse(run_id=run.id, round=round_number, nodes=nodes, edges=edges)


def _post_action_counts(snapshot: RoundSnapshot) -> dict[str, dict[str, int]]:
    counts = {
        post.id: {"LIKE": 0, "FOLLOW": 0, "IGNORE": 0}
        for post in snapshot.posts
    }
    for engagement in snapshot.engagements:
        if engagement.to_post in counts:
            counts[engagement.to_post][engagement.action] += 1
    return counts


if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app, host="127.0.0.1", port=8000)
