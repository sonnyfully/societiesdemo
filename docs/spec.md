# Build specification

## Repo structure

```
homophily-salon/
├── AGENTS.md
├── README.md
├── backend/
│   ├── AGENTS.md
│   ├── main.py              # FastAPI app, 3 endpoints
│   ├── salon.py             # Core simulation loop
│   ├── agents.py            # Persona generation + Claude calls
│   ├── metrics.py           # Modularity, assortativity, embeddings
│   ├── models.py            # Pydantic data models
│   ├── personas/seeds.json
│   ├── runs/                # Saved simulation outputs (JSON)
│   ├── requirements.txt
│   └── .env                 # ANTHROPIC_API_KEY (gitignored)
├── frontend/
│   ├── AGENTS.md
│   ├── app/
│   │   ├── page.tsx
│   │   ├── salon/page.tsx
│   │   ├── results/[id]/page.tsx
│   │   └── api/
│   ├── components/
│   │   ├── SalonFeed.tsx
│   │   ├── NetworkGraph.tsx
│   │   ├── MetricsPanel.tsx
│   │   └── EmbeddingMap.tsx
│   └── lib/api.ts
├── note/
│   ├── note.tex
│   ├── figures/
│   └── note.pdf
├── docs/
├── state/
├── architecture/
└── .gitignore
```

## The simulation loop

```
1. Generate 100 persona prompts spanning 4–5 latent camps on the seed topic
2. For each of 8 rounds:
   For each agent:
     a. Agent posts a 1–2 sentence response, with their full prior history
        + persona in context
     b. Agent sees a feed of 10 posts (mix of similar/dissimilar from
        semantic space)
     c. Agent picks 1–3 to engage with (like / follow / ignore)
3. After each round, snapshot:
   - Engagement graph
   - All posts (for embeddings)
   - Modularity, assortativity scores
4. Final analysis:
   - Detect communities (Louvain via networkx)
   - Compute pairwise cosine distance vs engagement frequency
   - Bootstrap null distribution (100 iterations)
   - Compare to paper's published effect sizes
```

## Cost estimate

100 agents × 8 rounds × ~2 Haiku calls per agent per round = 1,600 API calls.
At Haiku 4.5 pricing (~$1/M input, $5/M output), ~500 input / 100 output tokens per call.
Approximate cost per full run: $1.50. Budget allows 3–4 full runs.

## Time budget

| Block | Hours |
|---|---|
| Backend: persona generation + agent loop | 5 |
| Backend: metrics + bootstrap | 2 |
| Frontend: landing + salon view | 4 |
| Frontend: results page + UMAP viz | 3 |
| Run the experiment + tune | 2 |
| Research note (LaTeX, figure, table) | 3 |
| Deploy + Loom + README | 1 |
| **Total** | **20** |

Stretch: "drop your own message" mode (+2h). Do not start until everything else is shipped.

## Build order

1. Persona seeds (hand-curated, 5 first, then 100)
2. Smoke test: 5 agents, 2 rounds, end-to-end
3. Metrics module with synthetic input
4. Scale to 100 agents, 8 rounds
5. Frontend landing + results page (static, reading saved JSON)
6. Frontend salon view (live or simulated-live)
7. Research note
8. Deploy
9. Loom walkthrough

Each step ships before the next starts. No parallelism.

## API endpoints

```
POST /runs              # Start a new run. Returns run_id immediately, runs async.
GET  /runs/{run_id}     # Get run metadata + current round + metrics
GET  /runs/{run_id}/feed?round=N
GET  /runs/{run_id}/graph?round=N
GET  /runs/{run_id}/analysis        # Final analysis (communities, embeddings, stats)
```

For the 20-hour build, the dashboard can read pre-computed runs from disk rather than streaming live. This is the path of least resistance.

## Deployment

- Frontend: `vercel deploy` from `frontend/`. Custom domain if available.
- Backend: Railway, deploy from GitHub. Set `ANTHROPIC_API_KEY` as env var.
- Pre-compute 2–3 full runs locally before deploying. Backend only needs to serve saved JSON in production.

## Outreach

After deployment, draft the outreach email referencing `docs/outreach-context.md`. Do not send until:
- The dashboard is live at a real URL
- The research note PDF is in the repo
- A 2-minute Loom is recorded
- The README has been read end-to-end and edited for tone