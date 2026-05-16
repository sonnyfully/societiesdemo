"""Pure metric functions for graph and content homophily analysis."""

from __future__ import annotations

import itertools
import logging
import math
import warnings
from collections import defaultdict
from functools import lru_cache
from typing import Callable, Optional

import networkx as nx
import numpy as np

try:
    from .models import Engagement, Persona, Post, RoundMetrics, RoundSnapshot
except ImportError:  # pragma: no cover - supports direct script execution.
    from models import Engagement, Persona, Post, RoundMetrics, RoundSnapshot


logger = logging.getLogger(__name__)

DEFAULT_BOOTSTRAP_ITERATIONS = 100
DEFAULT_EMBEDDING_MODEL = "all-MiniLM-L6-v2"
ENGAGEMENT_ACTION_WEIGHTS = {"LIKE": 1.0, "FOLLOW": 1.0}

EmbeddingFunction = Callable[[list[str]], list[list[float]]]


def build_weighted_engagement_graph(
    personas: list[Persona],
    engagements: list[Engagement],
) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(persona.id for persona in personas)

    for engagement in engagements:
        weight = ENGAGEMENT_ACTION_WEIGHTS.get(engagement.action, 0.0)
        if weight <= 0 or engagement.from_agent == engagement.to_agent:
            continue
        if graph.has_edge(engagement.from_agent, engagement.to_agent):
            graph[engagement.from_agent][engagement.to_agent]["weight"] += weight
        else:
            graph.add_edge(
                engagement.from_agent,
                engagement.to_agent,
                weight=weight,
            )
    return graph


def detect_communities(graph: nx.Graph) -> list[set[str]]:
    if graph.number_of_nodes() == 0:
        return []
    if graph.number_of_edges() == 0:
        return [{str(node)} for node in sorted(graph.nodes())]
    try:
        communities = nx.algorithms.community.louvain_communities(
            graph,
            weight="weight",
            seed=42,
        )
    except Exception as exc:  # noqa: BLE001 - sparse graphs can trip community detection.
        logger.warning("Community detection failed; falling back to singleton communities: %s", exc)
        return [{str(node)} for node in sorted(graph.nodes())]
    return [set(str(node) for node in community) for community in communities]


def community_id_by_agent(communities: list[set[str]]) -> dict[str, int]:
    ordered = sorted(communities, key=lambda community: sorted(community)[0] if community else "")
    return {
        agent_id: index
        for index, community in enumerate(ordered)
        for agent_id in community
    }


def modularity_score(graph: nx.Graph, communities: list[set[str]]) -> float:
    if graph.number_of_edges() == 0 or not communities:
        return 0.0
    try:
        return _finite(
            nx.algorithms.community.modularity(
                graph,
                communities,
                weight="weight",
            )
        )
    except Exception as exc:  # noqa: BLE001 - defensive metric fallback.
        logger.warning("Modularity failed; returning 0.0: %s", exc)
        return 0.0


def assortativity_by_community(
    graph: nx.Graph,
    agent_to_community: dict[str, int],
) -> float:
    if graph.number_of_edges() == 0 or len(set(agent_to_community.values())) < 2:
        return 0.0
    annotated = graph.copy()
    nx.set_node_attributes(annotated, agent_to_community, "community")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            return _finite(nx.attribute_assortativity_coefficient(annotated, "community"))
    except Exception as exc:  # noqa: BLE001 - defensive metric fallback.
        logger.warning("Assortativity failed; returning 0.0: %s", exc)
        return 0.0


def bootstrap_modularity_null(
    graph: nx.Graph,
    *,
    n_iter: int = DEFAULT_BOOTSTRAP_ITERATIONS,
) -> tuple[float, tuple[float, float], float]:
    observed = modularity_score(graph, detect_communities(graph))
    if graph.number_of_edges() < 2 or graph.number_of_nodes() < 4:
        return observed, (observed, observed), 1.0

    null_scores: list[float] = []
    for index in range(n_iter):
        candidate = graph.copy()
        try:
            nx.double_edge_swap(
                candidate,
                nswap=max(1, graph.number_of_edges()),
                max_tries=10_000,
                seed=42 + index,
            )
        except Exception:
            continue
        null_scores.append(modularity_score(candidate, detect_communities(candidate)))

    if not null_scores:
        return observed, (observed, observed), 1.0

    scores = np.array(null_scores, dtype=float)
    ci_low = _finite(float(np.percentile(scores, 2.5)))
    ci_high = _finite(float(np.percentile(scores, 97.5)))
    p_value = _finite(float((scores >= observed).mean()), fallback=1.0)
    return observed, (ci_low, ci_high), p_value


def agent_posts_by_id(posts: list[Post]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for post in posts:
        grouped[post.agent_id].append(post.content)
    return dict(grouped)


def agent_embeddings_for_posts(
    personas: list[Persona],
    posts: list[Post],
    *,
    embed_texts: Optional[EmbeddingFunction] = None,
) -> dict[str, list[float]]:
    grouped_posts = agent_posts_by_id(posts)
    agent_ids = [persona.id for persona in personas if grouped_posts.get(persona.id)]
    if not agent_ids:
        return {}

    texts = [" ".join(grouped_posts[agent_id]) for agent_id in agent_ids]
    vectors = (embed_texts or _default_embed_texts)(texts)
    return {
        agent_id: [float(value) for value in vector]
        for agent_id, vector in zip(agent_ids, vectors)
    }


def content_engagement_correlation(
    personas: list[Persona],
    posts: list[Post],
    graph: nx.Graph,
    *,
    embed_texts: Optional[EmbeddingFunction] = None,
) -> float:
    try:
        embeddings = agent_embeddings_for_posts(personas, posts, embed_texts=embed_texts)
    except Exception as exc:  # noqa: BLE001 - keep runs inspectable if local model is unavailable.
        logger.warning("Embedding calculation failed; returning content correlation 0.0: %s", exc)
        return 0.0

    agent_ids = sorted(embeddings)
    if len(agent_ids) < 2:
        return 0.0

    similarities = []
    weights = []
    for left, right in itertools.combinations(agent_ids, 2):
        similarities.append(_cosine_similarity(embeddings[left], embeddings[right]))
        edge = graph.get_edge_data(left, right, default={})
        weights.append(float(edge.get("weight", 0.0)))

    if len(similarities) < 2 or np.std(similarities) == 0 or np.std(weights) == 0:
        return 0.0
    return _finite(float(np.corrcoef(similarities, weights)[0, 1]))


def cumulative_round_data(
    rounds: list[RoundSnapshot],
    *,
    through_round: Optional[int] = None,
) -> tuple[list[Post], list[Engagement]]:
    selected = [
        snapshot
        for snapshot in rounds
        if through_round is None or snapshot.round <= through_round
    ]
    posts = [post for snapshot in selected for post in snapshot.posts]
    engagements = [engagement for snapshot in selected for engagement in snapshot.engagements]
    return posts, engagements


def compute_round_metrics(
    personas: list[Persona],
    rounds: list[RoundSnapshot],
    *,
    through_round: Optional[int] = None,
    cost_usd: float = 0.0,
    embed_texts: Optional[EmbeddingFunction] = None,
    bootstrap_iterations: int = DEFAULT_BOOTSTRAP_ITERATIONS,
) -> RoundMetrics:
    posts, engagements = cumulative_round_data(rounds, through_round=through_round)
    graph = build_weighted_engagement_graph(personas, engagements)
    communities = detect_communities(graph)
    agent_to_community = community_id_by_agent(communities)
    observed, interval, p_value = bootstrap_modularity_null(
        graph,
        n_iter=bootstrap_iterations,
    )
    return RoundMetrics(
        n_communities=len(communities),
        modularity=observed,
        modularity_ci_low=interval[0],
        modularity_ci_high=interval[1],
        modularity_p=p_value,
        assortativity=assortativity_by_community(graph, agent_to_community),
        content_engagement_correlation=content_engagement_correlation(
            personas,
            posts,
            graph,
            embed_texts=embed_texts,
        ),
        cost_usd=cost_usd,
    )


@lru_cache(maxsize=1)
def _default_embedding_model() -> object:
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(DEFAULT_EMBEDDING_MODEL, local_files_only=True)


def _default_embed_texts(texts: list[str]) -> list[list[float]]:
    model = _default_embedding_model()
    vectors = model.encode(texts)
    return [[float(value) for value in vector] for vector in vectors]


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    left_vector = np.array(left, dtype=float)
    right_vector = np.array(right, dtype=float)
    denominator = float(np.linalg.norm(left_vector) * np.linalg.norm(right_vector))
    if denominator == 0:
        return 0.0
    return _finite(float(np.dot(left_vector, right_vector) / denominator))


def _finite(value: float, *, fallback: float = 0.0) -> float:
    if math.isfinite(value):
        return float(value)
    return fallback


def _synthetic_embed_texts(texts: list[str]) -> list[list[float]]:
    vectors = []
    for text in texts:
        lowered = text.lower()
        vectors.append(
            [
                float(lowered.count("ai")),
                float(lowered.count("ban")),
                float(len(lowered.split())),
            ]
        )
    return vectors


def _smoke() -> None:
    from datetime import datetime, timezone

    timestamp = datetime.now(timezone.utc)
    personas = [
        Persona(id="a", name="A", bio="Bio A", voice="calm", stance="pro", camp="pro"),
        Persona(id="b", name="B", bio="Bio B", voice="sharp", stance="anti", camp="anti"),
        Persona(id="c", name="C", bio="Bio C", voice="plain", stance="mixed", camp="mixed"),
    ]
    posts = [
        Post(id="p1", agent_id="a", round=1, content="Ban AI for exams.", timestamp=timestamp),
        Post(id="p2", agent_id="b", round=1, content="AI helps students learn.", timestamp=timestamp),
        Post(id="p3", agent_id="c", round=1, content="Disclose AI use.", timestamp=timestamp),
    ]
    engagements = [
        Engagement(from_agent="a", to_post="p3", to_agent="c", action="LIKE", round=1),
        Engagement(from_agent="c", to_post="p1", to_agent="a", action="FOLLOW", round=1),
        Engagement(from_agent="b", to_post="p1", to_agent="a", action="IGNORE", round=1),
    ]
    snapshot = RoundSnapshot(
        round=1,
        posts=posts,
        engagements=engagements,
        metrics=RoundMetrics(
            n_communities=0,
            modularity=0.0,
            modularity_ci_low=0.0,
            modularity_ci_high=0.0,
            modularity_p=1.0,
            assortativity=0.0,
            content_engagement_correlation=0.0,
            cost_usd=0.0,
        ),
    )
    metrics = compute_round_metrics(
        personas,
        [snapshot],
        embed_texts=_synthetic_embed_texts,
        bootstrap_iterations=5,
    )
    assert metrics.n_communities >= 1
    assert math.isfinite(metrics.modularity)
    assert math.isfinite(metrics.assortativity)
    assert math.isfinite(metrics.content_engagement_correlation)


if __name__ == "__main__":
    _smoke()
