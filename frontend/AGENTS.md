# Frontend — agent instructions

## Scope

Next.js 14 App Router, TypeScript, Tailwind. Reads pre-computed simulation runs from the backend (or from public JSON files if the backend is down).

## Pages

- `app/page.tsx` — landing. Hero, thesis sentence, "start a run" CTA, link to research note.
- `app/simulation/page.tsx` — live simulation view. Left: post feed. Right: metrics + small network graph.
- `app/results/[id]/page.tsx` — post-run analysis. Force-directed community graph, UMAP embedding map, headline numbers, comparison table.

## Components

- `SimulationFeed.tsx` — vertical feed of recent posts. Posts colour-shift over rounds as the agent joins a community.
- `NetworkGraph.tsx` — d3-force graph. Nodes coloured by detected community. Edge thickness = engagement weight.
- `MetricsPanel.tsx` — modularity, assortativity, content correlation. Numbers update each round.
- `EmbeddingMap.tsx` — 2D UMAP projection of agent post embeddings, coloured by community. Mirrors Figure 2b of the paper.

## Design language

Match societies.io. Flat, white surfaces. Sans-serif. 0.5px borders. Generous whitespace. No gradients, no shadows. The aesthetic signal matters — the design hire is open at the company and this is implicitly an audition.

## Numbers

- Modularity: 2 decimal places
- p-values: 3 decimal places (or "< 0.001")
- Percentages: 1 decimal place
- Counts: integer with thousand separators

Use `Intl.NumberFormat`. Never display raw JS floats.

## Loading and error states

Every async component needs:
- A skeleton loader (not a spinner — skeletons match the eventual layout)
- A typed error state ("Run not found" vs "Simulation failed")

## State management

No global state library. React state + URL params is enough. Run ID lives in the URL.

## Accessibility

- Every interactive element has a visible focus ring.
- The network graph has an aria-label describing what it shows.
- Colour is never the only signal for community membership — use colour + a community label on hover.