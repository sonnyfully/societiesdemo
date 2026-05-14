# Homophily under model substitution

**A partial replication of [He et al. (2026)](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjop.12764) using Claude Haiku 4.5.**

The original paper, published in the *British Journal of Psychology*, found that LLM-powered chatbots on a Twitter-like platform (Chirper.ai) spontaneously formed homophilous communities — clustering by language and, within the English-speaking subset, by content. The agents were never told to socialise like humans. The behaviour emerged.

The paper used GPT-3.5 in late 2023. Its discussion section explicitly flags model substitution as open future work:

> "the present findings are drawn from a single platform and may not be fully replicable in alternative simulation designs or with alternative LLMs."

This project re-runs the core mechanism with **Claude Haiku 4.5**, a different lab's small frontier model from May 2026 — two and a half years later. Same metrics, scaled-down environment.

**→ [Live dashboard](https://homophily-salon.vercel.app)**
**→ [Research note (PDF)](./note/note.pdf)**
**→ [2-minute Loom walkthrough](https://loom.com/...)**

---

## TL;DR

| Metric | He et al. (GPT-3.5, N=17,746, 28 days) | This work (Claude Haiku 4.5, N=100, 8 rounds) |
|---|---|---|
| Final modularity | 0.38 | [filled in after run] |
| Final assortativity | 0.61 | [filled in after run] |
| Content–engagement correlation | r = -0.013, p < .001 | [filled in after run] |
| Bootstrap p-value | < .001 | [filled in after run] |

Headline: [one sentence — filled in after the experiment runs].

---

## What "topic salon" means

The paper's environment was a Twitter clone with feeds, follows, likes, mentions, and many parallel topics. Replicating that infrastructure was outside the scope of a small project, and unnecessary for testing the homophily mechanism specifically.

Instead, 100 Claude Haiku 4.5 agents — each given a distinct persona seeded across 4–5 latent perspectives — discuss a single seed topic over 8 rounds. Each round, every agent posts a 1–2 sentence response and chooses 1–3 posts from a small feed to engage with (like / follow / ignore). The feed mixes random posts, popular posts, and posts from prior contacts, mirroring the paper's feed composition.

Crucially, agents are **never told to engage with similar others**. Whether they do is the empirical question.

The full prompts and feed composition rules live in [`docs/prompts.md`](./docs/prompts.md).

---

## The methodological stack

Identical, as far as practicable, to the original paper.

- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` — the same model used in the paper
- **Community detection:** Louvain (the paper used label propagation / fast-greedy; the choice is discussed in the research note's limitations)
- **Modularity:** Newman's standard definition, weighted by engagement count
- **Assortativity:** by detected community, computed on the engagement graph
- **Null distribution:** 100 iterations of degree-preserving rewiring (`networkx.double_edge_swap`)
- **Content–engagement correlation:** Pearson, between cosine similarity of mean post embeddings and engagement weight, with quadratic-assignment-style permutation (n=100)

All metric code is pure-functional and lives in [`backend/metrics.py`](./backend/metrics.py).

---

## What this is and isn't

**It is:** A small, honest replication of a published finding on a new model family. Sufficient sample size to detect the effect if it exists. Code that anyone can re-run.

**It is not:** A full replication. The original ran for 28 days on a multi-lingual platform with thousands of bots and emergent multi-topic dynamics. This runs for 8 rounds with 100 bots on one seed topic. The note's limitations section is candid about the gap.

The point isn't to relitigate the original. The point is to test whether the *core mechanism* — semantic similarity driving engagement — generalises beyond one model and one platform.

---

## Implications for synthetic-audience products

This is the bridge from academic curiosity to commercial relevance.

If homophily is robust across model families, then any product built on simulated audiences (market research, message testing, audience reaction simulation) inherits a structural risk: simulated populations will tend to homogenise as the simulation runs. A "diverse 5,000-persona F500 buyer committee" can collapse into agreement within a handful of rounds — not because the personas were poorly specified, but because the underlying LLMs' learned social patterns push toward consensus with like-minded others.

The diagnostic shown on the [live dashboard](https://homophily-salon.vercel.app) — modularity climbing, content-engagement correlation strengthening over rounds — is precisely the signal a synthetic-audience product would want to surface to its users.

---

## Running it yourself

### Prerequisites
- Python 3.11
- Node.js 20
- An Anthropic API key (~$5 will run several full experiments)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Running an experiment

```bash
cd backend
python -m salon --topic "Should universities ban AI in coursework?" --n-agents 100 --n-rounds 8
```

Results save to `backend/runs/{run_id}.json`. The frontend will pick them up automatically.

---

## Repo structure

```
homophily-salon/
├── AGENTS.md             # Agent/Codex instructions (always read first)
├── README.md             # This file
├── backend/              # FastAPI + simulation engine
├── frontend/             # Next.js dashboard
├── note/                 # LaTeX research note + PDF
├── docs/                 # Spec, prompts, metrics reference
├── state/                # Build status and locked decisions
└── architecture/         # System design and data shapes
```

---

## Citation

If you reference this work, please also cite the original:

> He, J. K., Wallis, F. P. S., Gvirtz, A., & Rathje, S. (2026). Artificial intelligence chatbots mimic human collective behaviour. *British Journal of Psychology*, 117, 761–776. https://doi.org/10.1111/bjop.12764

---

## About

Built by [Sonny Fullerton](https://linkedin.com/in/sonny-fullerton-358554251), an undergraduate at The Wharton School (Statistics + CIS). Questions, criticisms, or interest in talking about this work — [email](mailto:fuller1@wharton.upenn.edu).