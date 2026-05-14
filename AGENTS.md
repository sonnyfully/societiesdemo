# Homophily salon — agent instructions

## What this project is

A scaled-down replication of He et al. (2026), "Artificial intelligence chatbots mimic human collective behaviour" (British Journal of Psychology), using Claude Haiku 4.5 instead of the paper's GPT-3.5. The deliverable is a live web dashboard plus a 2-page research note, intended as an outreach artifact to Artificial Societies Ltd (the company founded by the paper's lead author, James He).

## The thesis (do not drift from this)

Homophily in LLM agent societies generalises across model families and time. Re-running the He et al. mechanism with Claude Haiku 4.5 in May 2026 — a different lab, two and a half years after the paper's data collection — reproduces the core finding: agents preferentially engage with semantically similar others, and structural communities emerge. This has implications for synthetic-audience products that rely on simulated populations remaining diverse.

## Stack — do not add dependencies without asking

- Backend: Python 3.11, FastAPI, networkx, sentence-transformers (all-MiniLM-L6-v2), anthropic SDK, scipy, numpy
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind, d3-force for the network graph, umap-js for the embedding map
- Deploy: Vercel (frontend), Railway (backend)
- LaTeX for the research note

## Scope discipline

Total build budget is 20 hours. Read `state/status.md` for current progress. Read `state/decisions.md` before making any architectural choice — if a decision is logged there, follow it; if not, ask before deviating.

Cut order if running out of time: stretch goals → live updating → multi-run comparison → multiple seed topics. Do not cut the research note. Do not cut the bootstrap null distribution.

## How to read this repo

Before starting any task, read these in order:
1. `state/status.md` — what's done, what's next
2. `state/decisions.md` — locked-in choices
3. `architecture/system.md` — system design
4. `docs/spec.md` — full build specification
5. The relevant subdirectory `AGENTS.md` (backend or frontend)
6. The specific doc the task touches (e.g. `docs/prompts.md` for agent prompts)

## Style preferences

- Functional style in Python; pure functions for metrics. Pydantic for data models. Type hints everywhere.
- Small commits, imperative commit messages.
- No print statements; use `logging` at module level.
- TypeScript: explicit return types on exported functions. No `any` unless commented why.
- Tailwind: utility-first, no custom CSS modules unless necessary. Match the visual language of societies.io (flat, white, generous whitespace, sans-serif).
- Numbers in UI: always rounded. Modularity to 2 decimals, p-values to 3, percentages to 1.

## What not to do

- Do not tell agents in the simulation to be homophilous. The whole point is that homophily emerges without instruction.
- Do not change the metric definitions to match what the paper reports if your numbers differ. Report your numbers honestly.
- Do not invent results in the research note. If something didn't replicate, say so.
- Do not exceed 200-token agent responses.
- Do not over-engineer. This is a 20-hour build, not a product launch.

## When uncertain

Ask. Especially on: the choice of seed topic, persona generation strategy, anything that touches the validity of the replication.