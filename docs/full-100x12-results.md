# Canonical 100-agent results

Run completed on 2026-05-16.

## Run identity

- Run id: `full-100x12`
- Topic: `Should universities ban AI in coursework?`
- Model: `claude-haiku-4-5-20251001`
- Scale: 100 agents, 12 rounds
- Raw output: `backend/runs/full-100x12.json`
- Embedding cache: `backend/runs/full-100x12.embeddings.json`
- Total tracked cost: `$3.416`

## Final metrics

| Metric | Final value |
|---|---:|
| Communities | 7 |
| Modularity | 0.131 |
| Bootstrap 95% CI | [0.101, 0.117] |
| Bootstrap p-value | 0.000 |
| Assortativity | 0.069 |
| Content-engagement correlation | 0.018 |

## Interpretation

Classification: reproduces, with attenuated magnitude.

The final engagement graph's modularity is above the 100-iteration degree-preserving bootstrap null interval. None of the null runs met or exceeded the observed value, so the project displays the bootstrap p-value as 0.000 at three decimals. Assortativity is weakly positive and close to the earlier 50-agent run. Content-engagement correlation is also positive but weaker than the earlier run.

This larger run is more meaningful as the canonical artifact because it has twice as many agents and a longer interaction horizon while still staying below the approved $5 cap. It should not be framed as a magnitude match to He et al.; the honest claim is a cleaner replication of direction and statistical signal.
