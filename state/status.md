# Build status

Last updated: 2026-05-15

## Current phase

Ready for Stage 5 — metrics and analysis.

## Done

- Repo scaffolded
- Context files written
- Stage 1 foundation scaffold
- Stage 2 backend data model
- Stage 3 Claude prompt layer
- Stage 4 simulation engine

## In progress

- (nothing yet)

## Next

1. Configure `backend/.env` with `ANTHROPIC_API_KEY`
2. Run one-call Claude smoke: `python3 backend/agents.py`
3. Run cheap salon smoke: `python3 backend/salon.py --agents 5 --rounds 1`
4. Build metrics module
5. Replace Stage 4 placeholder metrics with real round metrics
6. Scale to 100 agents, 8 rounds
7. First end-to-end run with full stats

## Blockers

Live Claude verification is blocked until `backend/.env` contains `ANTHROPIC_API_KEY`.

## Hours used / 20 budget

0 / 20

## Notes for next session

- The first 5-agent salon smoke uses hand-curated seed personas, so it should only pay for post and engagement calls.
- Stage 4 writes explicit placeholder metrics. Do not interpret them as statistical output; Stage 5 replaces them.
- Before scaling to 100 agents, eyeball 10 generated personas. If they feel like cardboard, regenerate with a stricter "feel like a real person" instruction.
