# Locked-in decisions

Each entry: date, decision, reasoning. Do not deviate without amending here.

## 2026-05-14 — model

**Decision:** Claude Haiku 4.5 only (`claude-haiku-4-5-20251001`).

**Reasoning:** Single-model story is cleaner for the research note. Adding a second model is greedy for a 20-hour build. The paper used GPT-3.5 (OpenAI); we use Claude (Anthropic) — already a different lab, already a meaningful comparison.

## 2026-05-14 — interaction surface

**Decision:** Topic salon, not faithful mini-Chirper, not pairwise.

**Reasoning:** Preserves the paper's homophily mechanism (agents choose what to engage with based on similarity) while avoiding 4+ hours of Twitter-clone plumbing. Also maps more directly to Artificial Societies' commercial use case (small targeted audiences reacting to a seed topic, like Radiant).

## 2026-05-14 — scale

**Decision:** 100 agents, 8 rounds.

**Reasoning:** Cost ceiling (~$1.50 per full run). Statistically sufficient to detect homophily effect if it exists — the paper's effect sizes are large. Honestly reportable as a "scaled-down replication" in the note.

## 2026-05-14 — stack

**Decision:** Python 3.11 + FastAPI backend, Next.js 14 + TypeScript + Tailwind frontend. Vercel + Railway.

**Reasoning:** Sonny's existing stack. No learning curve. FastAPI matches the Meridian project's conventions.

## 2026-05-14 — embedding model

**Decision:** sentence-transformers `all-MiniLM-L6-v2`.

**Reasoning:** Identical to the paper. Changes to embedding model would break direct comparability of content-similarity metrics.

## 2026-05-14 — community detection

**Decision:** Louvain (via networkx), not label propagation or fast-greedy.

**Reasoning:** Louvain is the modern default, handles weighted graphs cleanly, is widely cited. The deviation from the paper's choice is noted in the research note's limitations section.

## 2026-05-14 — stretch goal

**Decision:** "Drop your own message and see how agents react" is a stretch goal, not core scope.

**Reasoning:** It's compelling but adds 2 hours. Core scope must ship first. Build only if everything else is deployed.