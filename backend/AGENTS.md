# Backend — agent instructions

## Scope

This directory contains the FastAPI server, the simulation engine, and the metrics module. It does not contain frontend code. If a task crosses the boundary, stop and ask.

## Files and their responsibilities

- `main.py` — FastAPI app, route handlers, no business logic
- `salon.py` — the simulation loop, orchestrates rounds and agents
- `agents.py` — Claude API calls, persona generation, post generation, engagement decisions
- `metrics.py` — pure functions for stats. No I/O. No API calls.
- `models.py` — Pydantic models. Single source of truth for data shapes.
- `personas/seeds.json` — pre-generated persona seeds (saves API calls)
- `runs/` — output JSON files, one per run

## Critical rules

- `metrics.py` is pure. No file reads, no API calls, no global state. This makes it testable.
- Every Claude API call goes through one function in `agents.py`. Centralised retries, logging, cost tracking.
- All inter-module data is Pydantic. No raw dicts crossing module boundaries.
- Every run gets a UUID and saves its full state to `runs/{run_id}.json` after each round. If the process dies, you can resume.
- Use `asyncio` for the round loop — agents within a round run in parallel. ~10x speedup.

## Cost tracking

Maintain a global counter for total tokens (input/output) and dollar cost. Log it after every round. Hard-stop the run if cost exceeds $5.

## Logging

```python
import logging
logger = logging.getLogger(__name__)
```

Log at INFO for round transitions, agent counts, and final metrics. DEBUG for individual API calls. ERROR for any failed API call (then retry with exponential backoff).

## Testing

No unit tests required for the 20-hour build. Instead: every module has a `if __name__ == "__main__":` block that runs a smoke test. Run those before you trust the module.