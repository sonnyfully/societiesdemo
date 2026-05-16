# Data shapes

Pydantic models for every piece of state that crosses a module boundary. These are authoritative — `backend/models.py` should mirror this file exactly.

## Persona

```python
class Persona(BaseModel):
    id: str            # uuid
    name: str          # handle, e.g. "@maya_kpi"
    bio: str
    voice: str         # two adjectives
    stance: str
    camp: str          # which latent group
```

## Post

```python
class Post(BaseModel):
    id: str            # uuid
    agent_id: str
    round: int
    content: str
    timestamp: datetime
```

## Engagement

```python
class Engagement(BaseModel):
    from_agent: str
    to_post: str
    to_agent: str
    action: Literal["LIKE", "FOLLOW", "IGNORE"]
    round: int
```

## RoundSnapshot

```python
class RoundSnapshot(BaseModel):
    round: int
    posts: list[Post]
    engagements: list[Engagement]
    metrics: RoundMetrics
```

## RoundMetrics

```python
class RoundMetrics(BaseModel):
    n_communities: int
    modularity: float
    modularity_ci_low: float
    modularity_ci_high: float
    modularity_p: float
    assortativity: float
    content_engagement_correlation: float
    cost_usd: float
```

## Run

```python
class Run(BaseModel):
    id: str
    topic: str
    n_agents: int
    n_rounds: int
    started_at: datetime
    completed_at: datetime | None
    status: Literal["pending", "running", "complete", "failed"]
    cost_usd: float
    total_cost_usd: float
    personas: list[Persona]
    rounds: list[RoundSnapshot]
```

## File format

`runs/{run_id}.json` is a serialised `Run` model. Pretty-printed for human inspection during development. Compact in production.

## API additions

`backend/models.py` also defines Pydantic response shapes for run creation, enriched feed items, graph nodes/edges, round metric points, and analysis embeddings. `POST /runs` requires `confirm_spend: true`; otherwise the API rejects without starting a live Claude run.

## Frontend types

Generate TypeScript types from these Pydantic models using `datamodel-code-generator` or hand-mirror them in `frontend/lib/types.ts`. Either way, keep them in sync — drift between backend and frontend types is the #1 source of bugs in this kind of project.
