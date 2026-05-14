# Build status

Last updated: 2026-05-15

## Current phase

Ready for Stage 3 — Claude prompt layer.

## Done

- Repo scaffolded
- Context files written
- Stage 1 foundation scaffold
- Stage 2 backend data model

## In progress

- (nothing yet)

## Next

1. Hand-curate 5 persona seeds for the seed topic
2. Wire up Claude API in `agents.py` — test with 1 call
3. Smoke test: 5 agents, 2 rounds, end-to-end
4. Persist results to JSON
5. Scale to 100 agents, 8 rounds
6. Build metrics module
7. First end-to-end run with full stats

## Blockers

None.

## Hours used / 20 budget

0 / 20

## Notes for next session

- Pick the seed topic first. Default: "Should universities ban AI in coursework?" — but consider alternatives that map more cleanly to commercial use cases (e.g. a B2B SaaS positioning debate).
- Before scaling to 100 agents, eyeball 10 generated personas. If they feel like cardboard, regenerate with a stricter "feel like a real person" instruction.
