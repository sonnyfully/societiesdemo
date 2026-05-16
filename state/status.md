# Build status

Last updated: 2026-05-16

## Current phase

Stage 9 deploy polish is effectively complete. Backend is deployed on Railway, frontend production build is deployed on Vercel, and the remaining share step is recording the Loom walkthrough and finalising the outreach email.

## Done

- Repo scaffolded
- Context files written
- Stage 1 foundation scaffold
- Stage 2 backend data model
- Stage 3 Claude prompt layer
- Stage 4 simulation engine
- Experiment scale reduced to 50 agents (5 camps × 10 personas)
- Anthropic ephemeral prompt caching added for stable persona prompt blocks
- Cost tracking now separates standard input, cache writes, cache reads, and output tokens
- $5 per-run hard cap added with partial run save on budget abort
- Stage 5 metrics module implemented with cumulative graph/content metrics
- Stage 6 FastAPI surface implemented with explicit spend confirmation for live runs
- MiniLM (`all-MiniLM-L6-v2`) preloaded into the local Hugging Face cache
- Stage 7 frontend dashboard implemented with landing, simulation playback, results analysis, typed API layer, force graph, metrics panel, and embedding map
- Stage 8 runbook written with persona inspection and full-run gates
- Stage 8 full experiment completed with run id `full-stage8`
- First 10 generated personas inspected and accepted before scaling
- Final result recorded in `docs/stage8-results.md`: modularity 0.133, 95% null CI [0.100, 0.130], p = 0.010, assortativity 0.067, content-engagement correlation 0.066
- Research note written in `note/note.tex`
- Two-page research note PDF generated at `note/note.pdf` and served by the frontend at `/note.pdf`
- Web research note page added at `/note`
- Home page now links directly to the default run replay when `NEXT_PUBLIC_DEFAULT_RUN_ID=full-stage8`
- Railway backend deployed at `https://societiesdemo-production.up.railway.app`
- Vercel frontend configured to use `NEXT_PUBLIC_DEFAULT_RUN_ID=full-stage8` and `NEXT_PUBLIC_API_BASE_URL=https://societiesdemo-production.up.railway.app`
- Frontend fallback API base updated to the Railway URL so production does not default to local development
- Root Railway deployment files added: `requirements.txt`, `.python-version`, `main.py`, and `railway.json`
- `backend/runs/full-stage8.json` is force-tracked for production serving

## In progress

- Loom walkthrough planning.

## Next

1. Smoke-test the public Vercel URLs end-to-end after the latest deploy settles
2. Record the 2-minute Loom walkthrough
3. Finalise outreach email with dashboard, note, and Loom links

## Blockers

None for deploy polish. Do not run another paid full experiment without a new explicit approval.

## Hours used / 20 budget

Stage 8 complete; hours not backfilled.

## Notes for next session

- The raw full run is force-tracked at `backend/runs/full-stage8.json` for production serving, despite the broader `backend/runs/*.json` ignore rule.
- The dashboard should default to `full-stage8` when started with `NEXT_PUBLIC_DEFAULT_RUN_ID=full-stage8`.
- Synthetic/dev data remains acceptable for UI testing only; do not cite `dev-stage7` as empirical output.
- The Stage 8 classification is "reproduces, with attenuated magnitude."
