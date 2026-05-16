# System architecture

## High-level

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Next.js    │ HTTP   │   FastAPI    │ HTTP   │  Anthropic   │
│   frontend   │ ─────► │   backend    │ ─────► │   Claude     │
│  (Vercel)    │ ◄───── │  (Railway)   │ ◄───── │   Haiku 4.5  │
└──────────────┘        └──────┬───────┘        └──────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   runs/*.json │
                        │  (file system)│
                        └──────────────┘
```

## Why this shape

- The simulation is offline. Runs are computed once, saved to disk, served as static-ish data.
- The frontend never talks to Claude directly. All API keys live in the backend env.
- The backend is stateless except for the `runs/` directory. Easy to redeploy.
- No database. JSON files are sufficient at this scale.

## Request flows

### Starting a run (only used during development; in production, runs are pre-computed)

```
1. POST /runs with { topic, n_agents, n_rounds, confirm_spend: true }
2. Backend generates UUID, starts async task, returns { run_id }
3. Async task:
   a. Generate personas (1 Claude call per persona × N agents)
   b. For each round:
      - For each agent: 2 Claude calls (post + engagement)
      - Cache stable persona prompt blocks; keep round-specific context uncached
      - Update graph
      - Compute metrics
      - Snapshot to runs/{run_id}.json
4. Frontend polls GET /runs/{run_id} every 5s for progress
```

### Viewing a completed run (the production path)

```
1. User lands on /results/abc123
2. Frontend fetches GET /runs/abc123/analysis
3. Backend reads runs/abc123.json, returns full data
4. Frontend renders network graph + UMAP + stats
```

## Data flow within a single round

```
For each agent:
  1. Build post prompt (persona + past posts + recent feed)
  2. Claude call → new post
  3. Save post to round state
  
After all posts written:
  4. For each agent:
     a. Build feed (10 posts mixing random/similar/popular)
     b. Build engagement prompt (numbered posts)
     c. Claude call → JSON engagement decisions
     d. Update engagement graph

After all engagements written:
  5. Compute metrics for this round
  6. Snapshot full state to disk
```

## Concurrency model

- Agents within a single phase (e.g. "all agents post") run concurrently via `asyncio.gather`.
- Phases run sequentially within a round.
- Rounds run sequentially.

Concurrency cap: 20 simultaneous Claude calls. Higher risks rate limits.

## Failure modes and recovery

- Claude API failure → exponential backoff (1s, 2s, 4s, 8s), then skip that agent for that phase. Log it.
- Process crash mid-round → on restart, read the last snapshot from `runs/{run_id}.json`, resume from the next phase.
- Cost overrun → hard-stop at $5 per run. Save partial state and surface the failed run status in the UI.
