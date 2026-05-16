# Homophily Simulation Implementation Roadmap

## 0. Project Compass

Build a scaled-down replication of He et al. (2026), using Claude Haiku 4.5 in a topic simulation environment to test whether homophily emerges without prompting.

Core constraints:

- Seed topic: "Should universities ban AI in coursework?"
- Model: `claude-haiku-4-5-20251001`
- Scale: 100 agents, 12 rounds
- Backend: Python 3.11, FastAPI, Pydantic, Anthropic SDK, NetworkX, sentence-transformers, scipy, numpy
- Frontend: Next.js 14 App Router, TypeScript, Tailwind, d3-force, umap-js
- Storage: JSON files in `backend/runs/`
- Deliverables: live dashboard, 2-page research note, README/deploy/outreach assets

Do not instruct agents to be homophilous. The result must emerge from agent choices.

## 1. Foundation

Goal: make the repo ready for implementation without leaking local state or secrets.

Tasks:

- Keep `.gitignore` in place for local cruft, env files, build outputs, generated runs, and LaTeX build artifacts.
- Create the backend, frontend, and note directory structures described in `docs/spec.md`.
- Add `.env.example` with `ANTHROPIC_API_KEY=`.
- Add placeholder files only where they clarify structure, such as `backend/runs/.gitkeep`.
- Make the first commit with scaffold and context files once the structure is stable.

Acceptance checks:

- `git status --short` does not show `.DS_Store` or real env files.
- The repo shape matches the spec at a high level.
- No real API keys are present in tracked files.

## 2. Backend Data Model

Goal: establish one source of truth for data flowing between simulation, API, saved runs, and frontend.

Tasks:

- Implement `backend/models.py` with Pydantic models matching `architecture/data-shapes.md`.
- Include models for personas, posts, engagements, round metrics, round snapshots, and runs.
- Use typed status and action literals.
- Ensure datetimes serialize cleanly to JSON.

Acceptance checks:

- A sample `Run` can be created, serialized, and loaded back without losing fields.
- No raw dicts cross backend module boundaries where a Pydantic model should be used.

## 3. Claude Prompt Layer

Goal: centralize all Claude access and preserve the experimental protocol.

Tasks:

- Implement `backend/agents.py`.
- Add one Claude call wrapper with retries, logging, cost/token tracking, and a $5 per-run hard stop.
- Implement persona generation, post generation, and engagement decision functions using `docs/prompts.md`.
- Enforce max token limits:
  - Persona generation: 250
  - Post generation: 200
  - Engagement decisions: 150
- Use temperatures:
  - Persona generation: 1.0
  - Post generation: 1.0
  - Engagement decisions: 0.7
- Add hand-curated persona camp seeds for the five AI-coursework camps.

Acceptance checks:

- One test Claude call succeeds with the configured model.
- Generated persona JSON parses into the `Persona` model.
- Engagement output parses into the expected decision shape.
- Failed API calls retry with backoff and log errors.

## 4. Simulation Engine

Goal: run the simulation end to end and persist recoverable snapshots.

Tasks:

- Implement `backend/simulation.py`.
- Generate or load personas for a run.
- Run 8 sequential rounds.
- Within each round:
  - Generate one post per agent.
  - Build each agent's 10-post feed.
  - Generate 1-3 engagement decisions per agent.
  - Update engagement state.
  - Compute round metrics.
  - Save the full run snapshot to `backend/runs/{run_id}.json`.
- Use `asyncio.gather` within posting and engagement phases.
- Cap concurrent Claude calls at 20.
- Support resuming from the latest saved snapshot where practical.

Acceptance checks:

- A 5-agent, 2-round smoke run completes.
- The saved JSON contains personas, posts, engagements, metrics, cost, and status.
- A partial run can be inspected manually from disk.

## 5. Metrics And Analysis

Goal: produce the statistical evidence needed for the dashboard and research note.

Tasks:

- Implement `backend/metrics.py` as pure functions only.
- Build weighted engagement graphs from engagement records.
- Detect communities with Louvain.
- Compute:
  - Number of communities
  - Modularity
  - Community assortativity
  - Content-engagement correlation
  - 100-iteration degree-preserving bootstrap null
  - 95% null interval and p-value
- Use `all-MiniLM-L6-v2` embeddings and cosine similarity.
- Use fixed seeds where supported.

Acceptance checks:

- Synthetic graph smoke tests run without API calls or file I/O.
- Metrics return finite values or explicit safe fallbacks for sparse early rounds.
- Final run metrics can be compared honestly against the He et al. reference table.

## 6. FastAPI Surface

Goal: expose saved and running simulations through thin JSON endpoints.

Tasks:

- Implement `backend/main.py`.
- Add endpoints:
  - `POST /runs`
  - `GET /runs/{run_id}`
  - `GET /runs/{run_id}/feed?round=N`
  - `GET /runs/{run_id}/graph?round=N`
  - `GET /runs/{run_id}/analysis`
- Keep route handlers thin; route code should call simulation, storage, or analysis helpers.
- Prefer serving precomputed runs in production.
- Return clear typed errors for missing or failed runs.

Acceptance checks:

- API can start a smoke run locally.
- API can read a saved run from disk.
- Feed, graph, and analysis endpoints return stable JSON for the frontend.

## 7. Frontend Dashboard

Goal: make the experiment readable, credible, and visually aligned with societies.io.

Tasks:

- Build the Next.js app with:
  - `app/page.tsx`
  - `app/simulation/page.tsx`
  - `app/results/[id]/page.tsx`
- Mirror backend models in `frontend/lib/types.ts`.
- Add `frontend/lib/api.ts` for typed API access.
- Implement:
  - `SimulationFeed`
  - `NetworkGraph`
  - `MetricsPanel`
  - `EmbeddingMap`
- Use skeleton loading states, not spinners.
- Provide typed error states such as "Run not found" and "Simulation failed."
- Use visible focus rings and graph accessibility labels.
- Format numbers with `Intl.NumberFormat`.

Design rules:

- Flat white surfaces
- Sans-serif type
- 0.5px borders
- Generous whitespace
- No gradients
- No shadows
- Colour plus hover labels for communities

Acceptance checks:

- Landing, simulation, and results pages render against a saved run.
- Network graph and embedding map are nonblank.
- Values are rounded according to project rules.
- Mobile and desktop layouts do not overlap or clip text.

## 8. Full Experiment Run

Goal: produce real results before writing conclusions.

Tasks:

- Inspect 10 generated personas before scaling.
- Regenerate personas only if they are generic, stereotyped, or too similar.
- Run one full 50-agent, 8-round experiment.
- Preserve the raw JSON output.
- Generate final summary values and figures from the saved run.
- Record whether the effect reproduces, partially reproduces, or fails against the bootstrap null.

Acceptance checks:

- One complete run exists in `backend/runs/`.
- The dashboard renders the complete run.
- The final metrics include modularity, assortativity, content-engagement correlation, CI, and p-value.

## 9. Research Note

Goal: write a concise, honest 2-page note after results exist.

Tasks:

- Create `note/note.tex`.
- Include:
  - Research question
  - Method
  - Seed topic and agent setup
  - Metrics
  - Main result table
  - Network or embedding figure
  - Comparison to He et al.
  - Limitations
- Note the Louvain deviation from the original paper.
- Do not invent, soften, or overclaim results.

Acceptance checks:

- `note/note.pdf` builds successfully.
- The note cites actual run outputs.
- The conclusion matches the observed data.

## 10. Deployment And Outreach

Goal: package the artifact for Artificial Societies only after the experiment and note are real.

Tasks:

- Finalize README with setup, methodology, and artifact links.
- Deploy frontend to Vercel.
- Deploy backend to Railway with `ANTHROPIC_API_KEY` set in env.
- Precompute 2-3 runs locally if budget allows.
- Record a 2-minute Loom walkthrough.
- Draft outreach email from `docs/outreach-context.md`.

Acceptance checks:

- Dashboard is live at a real URL.
- Research note PDF is in the repo.
- Loom exists.
- README has been read end to end and edited for tone.
- Outreach email includes no fabricated result claims.

## Cut Order

If time runs tight, cut in this order:

1. Stretch "drop your own message" mode
2. Live updating
3. Multi-run comparison
4. Multiple seed topics

Do not cut:

- Research note
- Bootstrap null distribution
- Honest reporting of weak or failed replication results

## Working Rules

- Follow `state/decisions.md` before making architectural changes.
- Update `state/status.md` as phases complete.
- Log any prompt or methodological change in `state/decisions.md`.
- Keep backend metrics pure.
- Keep Claude calls centralized.
- Keep frontend and backend types in sync.
- Make small commits with imperative commit messages.
