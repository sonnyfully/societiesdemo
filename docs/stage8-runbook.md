# Stage 8 runbook

Stage 8 produces real empirical outputs. Do not run paid Claude calls unless the spend is explicitly approved.

## 1. Confirm local prerequisites

```bash
cd /Users/sonnyfullerton/Projects/societies
./.venv/bin/python backend/models.py
./.venv/bin/python backend/metrics.py
./.venv/bin/python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2'); print('MiniLM ready')"
```

MiniLM is expected to occupy roughly 90-150 MB in the Hugging Face cache. On this machine, the first preload used 87 MB at `/Users/sonnyfullerton/.cache/huggingface`.

## 2. Inspect personas before scaling

Before spending on a full run, generate or review at least 10 personas. Reject and regenerate if they are generic, stereotyped, duplicated, or too similar within a camp.

Generate the exact run shell first:

```bash
cd /Users/sonnyfullerton/Projects/societies
./.venv/bin/python backend/simulation.py --run-id full-stage8 --agents 50 --rounds 8 --topic "Should universities ban AI in coursework?" --personas-only
```

If the generated personas are repetitive or generic, regenerate the saved shell before starting rounds:

```bash
./.venv/bin/python backend/simulation.py --run-id full-stage8 --agents 50 --rounds 8 --topic "Should universities ban AI in coursework?" --personas-only --regenerate-personas
```

Then inspect the first 10 generated/saved personas:

```bash
./.venv/bin/python - <<'PY'
from pathlib import Path
from backend.models import Run

run = Run.model_validate_json(Path("backend/runs/full-stage8.json").read_text())
for persona in run.personas[:10]:
    print(f"{persona.name} | {persona.camp} | {persona.bio} | {persona.stance}")
PY
```

Use these criteria:

- specific profession, age, or life context
- stance is relevant to the seed topic
- voice and stance are not the same field in disguise
- no instruction implies the agent should prefer similar others

## 3. Run the full experiment

Only after explicit spend approval:

```bash
cd /Users/sonnyfullerton/Projects/societies
./.venv/bin/python backend/simulation.py --run-id full-stage8 --agents 50 --rounds 8 --topic "Should universities ban AI in coursework?"
```

The run saves to `backend/runs/{run_id}.json`. These JSON outputs are gitignored, but should be preserved locally for the research note.

## 4. Verify the saved run

Start the backend:

```bash
cd /Users/sonnyfullerton/Projects/societies
./.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Start the frontend:

```bash
cd /Users/sonnyfullerton/Projects/societies/frontend
npm run dev
```

Open:

- `http://localhost:3000/simulation?runId={run_id}`
- `http://localhost:3000/results/{run_id}`

Confirm:

- final metrics include modularity, assortativity, content-engagement correlation, null interval, and p-value
- network graph is nonblank
- embedding map is nonblank
- no claims in README or the research note use synthetic/dev data as results
