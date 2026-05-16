# Stage 8 results

Run completed on 2026-05-15.

## Run identity

- Run id: `full-stage8`
- Topic: `Should universities ban AI in coursework?`
- Model: `claude-haiku-4-5-20251001`
- Scale: 50 agents, 8 rounds
- Raw output: `backend/runs/full-stage8.json` (force-tracked for production serving)
- Total tracked cost: `$1.21995`

## Persona gate

The first 10 generated personas were inspected before starting the full rounds. They covered distinct locations, professions, and institutional contexts across the five seed camps. The personas were accepted for the full run because they were topic-specific and did not contain instructions to prefer similar others.

## Final metrics

| Metric | Final value |
|---|---:|
| Communities | 5 |
| Modularity | 0.133 |
| Bootstrap 95% CI | [0.100, 0.130] |
| Bootstrap p-value | 0.010 |
| Assortativity | 0.067 |
| Content-engagement correlation | 0.066 |

## Interpretation

Classification: reproduces, with attenuated magnitude.

The final engagement graph's modularity is slightly above the 100-iteration degree-preserving bootstrap null interval and is significant at p = 0.010. Assortativity and content-engagement correlation are both positive, indicating weak but directionally consistent homophilous structure. The effect is much smaller than the He et al. reference values, so the research note should describe this as a core-effect reproduction with a modest effect size, not a magnitude match.

## Verification

- `./.venv/bin/python backend/models.py`
- `./.venv/bin/python backend/metrics.py`
- FastAPI route check: `GET /runs/full-stage8`, `GET /runs/full-stage8/feed?round=8`, `GET /runs/full-stage8/graph?round=8`, and `GET /runs/full-stage8/analysis` all returned 200.
- Spend guard check: unconfirmed `POST /runs` returned 403.
- CORS check for the dashboard returned `access-control-allow-origin: *`.
- `npm run build` in `frontend/` completed successfully.
