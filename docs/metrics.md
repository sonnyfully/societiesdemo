# Metrics module reference

The full statistical stack lives in `backend/metrics.py`. This file is the spec; the code should match.

## Required outputs per round

- Engagement graph (NetworkX `Graph` with weighted edges)
- List of detected communities (Louvain)
- Modularity score
- Assortativity coefficient by detected community
- Bootstrap p-value for modularity (100 iterations)
- Content-engagement correlation (Pearson, between cosine similarity of post embeddings and engagement weight)

## Reference implementation

```python
import networkx as nx
from networkx.algorithms.community import louvain_communities
from sentence_transformers import SentenceTransformer
import numpy as np
from scipy.spatial.distance import cosine

embedder = SentenceTransformer("all-MiniLM-L6-v2")  # same model the paper used

def build_graph(engagements: list[tuple[str, str, float]]) -> nx.Graph:
    G = nx.Graph()
    for a, b, w in engagements:
        if G.has_edge(a, b):
            G[a][b]["weight"] += w
        else:
            G.add_edge(a, b, weight=w)
    return G

def detect_communities(G: nx.Graph) -> list[set]:
    return louvain_communities(G, weight="weight", seed=42)

def modularity(G: nx.Graph, communities: list[set]) -> float:
    return nx.community.modularity(G, communities, weight="weight")

def assortativity_by_community(G: nx.Graph, agent_to_community: dict) -> float:
    nx.set_node_attributes(G, agent_to_community, "community")
    return nx.attribute_assortativity_coefficient(G, "community")

def bootstrap_null(G: nx.Graph, n_iter: int = 100) -> tuple[float, tuple[float, float], float]:
    observed = modularity(G, detect_communities(G))
    null_scores = []
    for _ in range(n_iter):
        H = nx.double_edge_swap(G.copy(), nswap=len(G.edges()), max_tries=10000)
        null_scores.append(modularity(H, detect_communities(H)))
    p = float((np.array(null_scores) >= observed).mean())
    return observed, (np.percentile(null_scores, 2.5), np.percentile(null_scores, 97.5)), p

def content_homophily(agents_with_posts: dict[str, list[str]], engagement_pairs: list[tuple[str, str, float]]) -> float:
    embeddings = {a: embedder.encode(" ".join(posts)) for a, posts in agents_with_posts.items()}
    distances = []
    weights = []
    for a, b, w in engagement_pairs:
        distances.append(cosine(embeddings[a], embeddings[b]))
        weights.append(w)
    return float(np.corrcoef(weights, [-d for d in distances])[0, 1])
```

## Methodological choices (do not deviate without logging)

- Use `all-MiniLM-L6-v2` for embeddings. The paper used this exact model. Changing it breaks comparability.
- Use Louvain rather than the paper's label propagation or fast-greedy. Louvain is the modern default and handles weighted graphs cleanly. Note this in the research note's limitations section.
- Bootstrap with degree-preserving rewiring (`nx.double_edge_swap`), not random rewiring. Paper does this too.
- Cosine, not Euclidean, for embedding distances. Standard in NLP and matches the paper.

## What the paper reports (your comparison targets)

From He et al. (2026), among the English-speaking chatbots:

| Day | Modularity | Assortativity |
|---|---|---|
| 7 | 0.50 | 0.54 |
| 14 | 0.42 | 0.51 |
| 21 | 0.40 | 0.58 |
| 28 | 0.38 | 0.61 |

You will not get numbers this high — you have 50 agents, not 17,746, and 8 rounds, not 28 days. Expected modularity in your setup: 0.15–0.35. The story is "the effect is in the same direction and statistically significant against null."
