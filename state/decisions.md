# Locked-in decisions

Each entry: date, decision, reasoning. Do not deviate without amending here.

## 2026-05-14 — model

**Decision:** Claude Haiku 4.5 only (`claude-haiku-4-5-20251001`).

**Reasoning:** Single-model story is cleaner for the research note. Adding a second model is greedy for a 20-hour build. The paper used GPT-3.5 (OpenAI); we use Claude (Anthropic) — already a different lab, already a meaningful comparison.

## 2026-05-14 — interaction surface

**Decision:** Topic simulation, not faithful mini-Chirper, not pairwise.

**Reasoning:** Preserves the paper's homophily mechanism (agents choose what to engage with based on similarity) while avoiding 4+ hours of Twitter-clone plumbing. Also maps more directly to Artificial Societies' commercial use case (small targeted audiences reacting to a seed topic, like Radiant).

## 2026-05-14 — scale

**Decision:** Superseded on 2026-05-15. Original plan was 100 agents, 8 rounds.

**Reasoning:** Cost ceiling (~$1.50 per full run). Statistically sufficient to detect homophily effect if it exists — the paper's effect sizes are large. Honestly reportable as a "scaled-down replication" in the note.

## 2026-05-15 — reduced experiment scale

**Decision:** Superseded on 2026-05-16. Use 50 agents, 8 rounds, balanced as 5 camps × 10 personas each.

**Reasoning:** Keeps the replication lightweight enough for the 20-hour build while preserving the balanced latent-camp structure and enough observations for the bootstrap null distribution.

## 2026-05-16 — canonical experiment scale

**Decision:** Use `full-100x12` as the canonical run: 100 agents, 12 rounds, balanced as 5 camps x 20 personas each.

**Reasoning:** The initial 50-agent run reproduced the direction but looked weak relative to the paper. After explicit approval for paid credits with an absolute $5 cap, a larger run gives a cleaner final null comparison while staying under budget. The completed run cost $3.416 and is now the main dashboard/note result. The earlier `full-stage8` run remains historical.

## 2026-05-15 — prompt caching

**Decision:** Use Anthropic ephemeral prompt caching on stable persona identity blocks for post-generation and engagement-decision calls. Round-specific context stays uncached.

**Reasoning:** Persona text is stable within each agent's session, while past posts, recent feed, and numbered engagement posts change every round. Caching the stable block reduces input-token cost without changing the round dynamics.

## 2026-05-15 — run budget cap

**Decision:** Enforce a $5 hard cap per run, counting standard input, cache writes, cache reads, and output tokens separately.

**Reasoning:** The cap catches accidental runaway loops or prompt inflation. If it trips, the backend saves the partial run state before aborting.

## 2026-05-15 — FastAPI spend guard

**Decision:** `POST /runs` must reject by default unless the request body includes `confirm_spend: true`.

**Reasoning:** The project has an $8 total Anthropic account budget. API access should make accidental live Claude runs difficult while still preserving a deliberate development path.

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
