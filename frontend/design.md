# Design system — Artificial Societies adjacent

This project is an outreach artifact to Artificial Societies (societies.io). The visual language is deliberately built to feel like it could live in their ecosystem — not a clone, but unmistakably from the same world. Felix and James should recognise the design vocabulary on first glance.

## Verify before locking

These tokens are reverse-engineered from societies.io with some inference. **Before treating them as canonical, open societies.io in Chrome DevTools and verify:**

1. Exact hex values of the primary text colour, background, and any accent
2. The font-family used for headings and body
3. The exact font-weight (likely 400 for body, 500 for headings — they explicitly avoid 600/700)
4. The corner-radius used on the stats cards
5. Whether they use a system font stack or a custom font (e.g. Inter, Söhne, GT Walsheim)

If anything below conflicts with what you see on the live site, the live site wins. Update this file and `state/decisions.md`.

## Design philosophy

Three principles, in priority order:

1. **Editorial, not SaaS.** This is a research-led product. The aesthetic borrows from academic publications, FT.com, and Stripe's docs — not from typical AI startup landing pages with gradients and 3D glass. Generous whitespace. Restrained palette. Numbers and prose given space to breathe.

2. **Confident understatement.** No screaming headlines. No emoji. No badges with sparkles. Authority comes from the content, not from visual shouting. If a section seems to need decoration to land, the copy isn't strong enough — rewrite the copy.

3. **Flat. Always flat.** No gradients. No drop shadows (other than functional focus rings). No blur. No frosted glass. No noise textures. Solid surfaces, hairline borders.

## Colour tokens

Observed from societies.io — verify exact hex values from DevTools.

```css
:root {
  /* Backgrounds */
  --bg-primary: #FFFFFF;          /* main canvas */
  --bg-secondary: #F7F6F2;        /* subtle off-white, used for stat cards. INFERRED — verify */
  --bg-tertiary: #FAFAF7;         /* page wash, even more subtle. INFERRED */
  
  /* Text */
  --text-primary: #0A0A0A;        /* near-black, not pure black */
  --text-secondary: #5F5F5C;      /* muted body text. INFERRED */
  --text-tertiary: #8A8A85;       /* hints, timestamps, labels. INFERRED */
  
  /* Borders */
  --border-subtle: rgba(10, 10, 10, 0.08);     /* 0.5px on most surfaces */
  --border-default: rgba(10, 10, 10, 0.15);    /* hover/emphasis */
  
  /* Accent — used sparingly */
  --accent: #1A1A1A;              /* CTA buttons, often just dark on dark */
  --accent-hover: #2A2A2A;
  
  /* Semantic — only when needed */
  --success: #1D9E75;             /* matched to community detection success states */
  --warning: #BA7517;
  --danger: #A32D2D;
}
```

**Critical rule:** colour is used to communicate *information*, never decoration. Detected community colours are the only place you should have multiple distinct colours on screen. Everything else stays in the neutral ramp.

## Typography

Likely candidates for their stack (verify): Inter, Söhne, GT America, or a system font stack falling back to `-apple-system`. The serif feel in their hero (the period after "Simulated.") suggests they *might* use a serif for display — verify whether "Human Behavior, Simulated." is sans or serif.

```css
/* If they use a custom font, host it via next/font/google or next/font/local */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-serif: 'Tiempos', 'Source Serif Pro', Georgia, serif;  /* only if needed for editorial moments */
--font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
```

### Scale

Match their hero proportions — display sizes are large, body stays modest.

| Token | Size / line-height | Weight | Usage |
|---|---|---|---|
| `text-display` | 56px / 1.05 | 500 | Landing hero only |
| `text-h1` | 36px / 1.2 | 500 | Page titles |
| `text-h2` | 24px / 1.3 | 500 | Section headers |
| `text-h3` | 18px / 1.4 | 500 | Sub-sections |
| `text-body` | 16px / 1.6 | 400 | Default prose |
| `text-small` | 14px / 1.5 | 400 | Secondary text |
| `text-mono-stat` | 32px / 1.0 | 500 | Stat-card numbers |
| `text-label` | 12px / 1.4 | 400 | Labels above stats. Often uppercase, letterspaced |
| `text-caption` | 11px / 1.3 | 400 | Footnotes, timestamps |

**Only two weights:** 400 regular and 500 medium. Never 600 or 700 — they read heavy and break the editorial tone. Bold is reserved for headings and stat numbers only. Never mid-sentence bold.

**Sentence case everywhere.** Never Title Case in headings. Never ALL CAPS except for `text-label`.

### Italics

Used deliberately for emphasis on a single word in a heading, mirroring "instant" / "impossible" in their hero copy. Use sparingly — once per page maximum.

## Spacing

Vertical rhythm in rem. Component-internal spacing in pixels.

```
Section gap:       6rem (landing) / 4rem (interior pages)
Block gap:         2rem
Paragraph gap:     1.25rem
Tight gap:         0.75rem

Component padding: 24px (cards), 16px (tight cards), 12px (chips)
Element gap:       12px / 8px / 4px
```

No margin smaller than 4px. No padding smaller than 8px.

## Borders and radius

- Borders are hairline: `0.5px solid var(--border-subtle)`. This is the defining detail of the design language.
- Radius: `12px` for cards, `8px` for buttons and inputs, `6px` for chips and badges.
- Never use single-sided borders with rounded corners — looks broken.

## Components

### Stat card

Reproduce the "2.5m+ Personas / 18m+ Responses / 95% Accuracy" cards directly. No border. Off-white background. Large number, small label below.

```tsx
<div className="rounded-xl bg-[var(--bg-secondary)] px-6 py-5">
  <p className="text-[32px] font-medium leading-none text-[var(--text-primary)]">
    0.34
  </p>
  <p className="mt-3 text-[14px] text-[var(--text-secondary)]">
    Final modularity
  </p>
</div>
```

Grid them in 3 or 4 across with `gap-3`. Mobile: stack to 2 columns.

### Section header

```tsx
<div className="mb-8">
  <p className="mb-2 text-[12px] uppercase tracking-wider text-[var(--text-tertiary)]">
    Our offering
  </p>
  <h2 className="text-[36px] font-medium leading-tight">
    Research that was <em className="font-normal italic">impossible</em> is now instant
  </h2>
</div>
```

The small label above the heading is a signature move on their site. Use it for `Method`, `Results`, `Implications`, etc.

### Quote block

Their testimonials are large quote marks, the quote, then a small attribution. Use this for academic citations too:

```tsx
<figure>
  <blockquote className="text-[20px] leading-[1.5] text-[var(--text-primary)]">
    "What we were able to accomplish with Artificial Societies would simply have been impossible with traditional market research."
  </blockquote>
  <figcaption className="mt-4 text-[14px] text-[var(--text-secondary)]">
    <span className="font-medium text-[var(--text-primary)]">Sparky Zivin</span> · Senior Managing Director, Teneo Research
  </figcaption>
</figure>
```

### Button — primary

```tsx
<button className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
  Get in touch
</button>
```

### Button — secondary

```tsx
<button className="rounded-lg border border-[var(--border-default)] bg-transparent px-5 py-2.5 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
  Book a meeting
</button>
```

## Page-level layout

### Landing (`/`)

```
[ Top nav — minimal: logo left, "GitHub" link + "Read the note" right ]

[ Hero — centered, narrow column max-width 720px ]
  Small label: "A replication of He et al. (2026)"
  Display heading: "Homophily, replicated."
  Subheading: "A scaled-down test of whether AI agents still form 
               echo chambers when you swap GPT-3.5 for Claude Haiku 4.5."
  Two buttons: "View results →" / "Read the note"

[ 4-up stat strip ]
  Final modularity / Content-engagement r / Bootstrap p / Effect vs paper

[ Section: "How it works" — short explainer with one diagram ]

[ Section: "Implications for synthetic audiences" — the bridge paragraph ]

[ Footer — minimal, link to GitHub + citation to original paper ]
```

### Simulation (`/simulation`)

Two-column. Left: feed. Right: live metrics + small network graph. Sidebar metrics use the stat-card pattern at a smaller scale.

### Results (`/results/[id]`)

Editorial layout. Sections:
- The headline result (stat card row)
- The community graph (large, centered, room to breathe)
- The UMAP embedding map
- Comparison table vs the paper
- Methodology summary
- Link to PDF note

## Specifically don't do these

- ❌ Glassmorphism, frosted backgrounds, backdrop blur
- ❌ Gradient text or buttons
- ❌ Drop shadows on cards (only on focus rings)
- ❌ Icons throwing colour around (icons are 1.5px stroke, inherit text colour)
- ❌ Emoji anywhere in the UI
- ❌ Animated gradients, particle effects, "AI-feel" floating shapes
- ❌ Dark mode hero with neon blue/purple
- ❌ Pricing tier cards with one highlighted "most popular" (you have nothing to sell)
- ❌ Trust badges or "as seen in" rows (you don't have logos to show)

## Numbers in UI

- Modularity, assortativity, correlations: 2 decimals
- p-values: 3 decimals, or `< 0.001` if smaller
- Percentages: 1 decimal
- Counts: integer with thousand separators via `Intl.NumberFormat`

```ts
const fmt = (n: number, dp = 2) => n.toLocaleString('en-GB', { 
  minimumFractionDigits: dp, 
  maximumFractionDigits: dp 
});
```

## Network graph styling

The community graph is the visual centrepiece. It must not look like a generic d3 force demo.

- Background: transparent (sits on the page bg)
- Nodes: 6px radius circles, no stroke
- Edges: 0.5–1.5px thickness based on engagement weight, opacity 0.4
- Community colours: pull from a curated 5-colour palette (see below), not d3's default category10
- No labels on nodes by default. On hover, show a small tooltip with persona handle + camp
- The whole graph should be no more than 600px tall

### Community colour palette

5 muted colours, chosen to be distinguishable without being loud. Pulled from the broader visual tradition of academic data viz (think Our World in Data).

```css
--community-1: #3D5A80;   /* slate blue */
--community-2: #98C1A2;   /* sage */
--community-3: #E0846D;   /* terracotta */
--community-4: #C7A66F;   /* mustard */
--community-5: #7A6E94;   /* mauve */
```

Use these in order. If a 6th community emerges, log it and decide whether to merge two visually or extend the palette. Six categorical colours starts to overwhelm.

## Loading and empty states

- Skeletons match the layout of the eventual content (rectangles where text will be, circles where stat numbers will be)
- Skeleton fill: `var(--bg-secondary)` with a subtle pulse animation
- Empty states: a single short sentence, centered, in `var(--text-secondary)`. No illustrations.

## Mobile

The dashboard is laptop-first. James will open the link from his laptop. Mobile should be functional but not optimised:

- Stack two-column layouts to single column
- Network graph: full width, smaller height (400px)
- Stat strips: 2 across instead of 4
- Hide the simulation's right-hand metrics panel on screens under 768px; surface them via a collapsible button instead

## Accessibility minimum bar

- All interactive elements have visible focus rings (`outline-2 outline-offset-2 outline-[var(--text-primary)]`)
- Colour is never the only signal for community membership — hover always reveals the community label
- All charts have an aria-label summarising the data
- Contrast ratios meet WCAG AA on every text/background combination
- Page is keyboard-navigable end-to-end

## Final test

Before pushing live, open the live site side-by-side with societies.io. If a designer glancing at both could plausibly believe they were built by the same team, you're done. If your project looks "more modern" or "more interesting," you've overcooked it — pull it back toward restraint.