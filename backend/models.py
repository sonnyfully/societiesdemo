"""Pydantic data contracts for homophily simulation runs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class StrictBaseModel(BaseModel):
    """Base model that rejects unexpected fields to prevent schema drift."""

    model_config = ConfigDict(extra="forbid")


class Persona(StrictBaseModel):
    id: str
    name: str
    bio: str
    voice: str
    stance: str
    camp: str


class Post(StrictBaseModel):
    id: str
    agent_id: str
    round: int
    content: str
    timestamp: datetime


class Engagement(StrictBaseModel):
    from_agent: str
    to_post: str
    to_agent: str
    action: Literal["LIKE", "FOLLOW", "IGNORE"]
    round: int


class RoundMetrics(StrictBaseModel):
    n_communities: int
    modularity: float
    modularity_ci_low: float
    modularity_ci_high: float
    modularity_p: float
    assortativity: float
    content_engagement_correlation: float
    cost_usd: float


class RoundSnapshot(StrictBaseModel):
    round: int
    posts: list[Post]
    engagements: list[Engagement]
    metrics: RoundMetrics


class Run(StrictBaseModel):
    id: str
    topic: str
    n_agents: int
    n_rounds: int
    started_at: datetime
    completed_at: Optional[datetime]
    status: Literal["pending", "running", "complete", "failed"]
    cost_usd: float
    total_cost_usd: float
    personas: list[Persona]
    rounds: list[RoundSnapshot]


class RunCreateRequest(StrictBaseModel):
    topic: Optional[str] = None
    n_agents: int = 50
    n_rounds: int = 8
    confirm_spend: bool = False


class RunCreateResponse(StrictBaseModel):
    run_id: str
    status: Literal["pending", "running"]


class FeedItem(StrictBaseModel):
    post_id: str
    agent_id: str
    agent_name: str
    agent_camp: str
    round: int
    content: str
    timestamp: datetime
    like_count: int
    follow_count: int
    ignore_count: int
    engagement_count: int


class GraphNode(StrictBaseModel):
    id: str
    name: str
    camp: str
    community: int
    post_count: int


class GraphEdge(StrictBaseModel):
    source: str
    target: str
    weight: float


class GraphResponse(StrictBaseModel):
    run_id: str
    round: int
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class RoundMetricPoint(StrictBaseModel):
    round: int
    metrics: RoundMetrics


class AgentEmbedding(StrictBaseModel):
    agent_id: str
    embedding: list[float]


class EmbeddingCache(StrictBaseModel):
    run_id: str
    model: str
    embeddings: list[AgentEmbedding]


class AnalysisResponse(StrictBaseModel):
    run_id: str
    status: Literal["pending", "running", "complete", "failed"]
    topic: str
    per_round_metrics: list[RoundMetricPoint]
    final_metrics: Optional[RoundMetrics]
    communities: dict[str, int]
    embeddings: list[AgentEmbedding]
    embeddings_available: bool


def _sample_run() -> Run:
    timestamp = datetime.now(timezone.utc)
    persona = Persona(
        id="agent-1",
        name="@maya_kpi",
        bio="A university teaching fellow who redesigns assessment policies.",
        voice="measured, pragmatic",
        stance="AI should be allowed when coursework is redesigned around disclosure and process.",
        camp="pragmatic reformers",
    )
    post = Post(
        id="post-1",
        agent_id=persona.id,
        round=1,
        content="A blanket ban misses the point; assessment needs to make AI use visible and discussable.",
        timestamp=timestamp,
    )
    engagement = Engagement(
        from_agent=persona.id,
        to_post=post.id,
        to_agent=persona.id,
        action="LIKE",
        round=1,
    )
    metrics = RoundMetrics(
        n_communities=1,
        modularity=0.0,
        modularity_ci_low=0.0,
        modularity_ci_high=0.0,
        modularity_p=1.0,
        assortativity=0.0,
        content_engagement_correlation=0.0,
        cost_usd=0.0,
    )
    return Run(
        id="run-1",
        topic="Should universities ban AI in coursework?",
        n_agents=1,
        n_rounds=1,
        started_at=timestamp,
        completed_at=timestamp,
        status="complete",
        cost_usd=0.0,
        total_cost_usd=0.0,
        personas=[persona],
        rounds=[
            RoundSnapshot(
                round=1,
                posts=[post],
                engagements=[engagement],
                metrics=metrics,
            )
        ],
    )


if __name__ == "__main__":
    run = _sample_run()
    serialized = run.model_dump_json()
    parsed = Run.model_validate_json(serialized)

    assert parsed.id == run.id
    assert parsed.personas[0].id == run.personas[0].id
    assert parsed.rounds[0].posts[0].timestamp == run.rounds[0].posts[0].timestamp
    assert parsed.rounds[0].engagements[0].action == "LIKE"
    assert parsed.rounds[0].metrics.modularity_p == 1.0
    assert parsed.model_dump(mode="json")["rounds"][0]["posts"][0]["timestamp"]
