# Build status

Last updated: 2026-05-15

## Current phase

Stage 9 complete. The next phase is deploy polish: confirm production environment variables, deploy the dashboard, record the Loom, and finalise the outreach email.

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

## In progress

- Deploy polish has not started.

## Next

1. Confirm production `NEXT_PUBLIC_DEFAULT_RUN_ID=full-stage8`
2. Confirm production `NEXT_PUBLIC_API_BASE_URL` points at the deployed backend
3. Deploy frontend and backend
4. Record the Loom walkthrough
5. Finalise outreach email

## Blockers

None for deploy polish. Do not run another paid full experiment without a new explicit approval.

## Hours used / 20 budget

Stage 8 complete; hours not backfilled.

## Notes for next session

- The raw full run is gitignored at `backend/runs/full-stage8.json`; preserve it locally.
- The dashboard should default to `full-stage8` when started with `NEXT_PUBLIC_DEFAULT_RUN_ID=full-stage8`.
- Synthetic/dev data remains acceptable for UI testing only; do not cite `dev-stage7` as empirical output.
- The Stage 8 classification is "reproduces, with attenuated magnitude."
