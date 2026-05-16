# Outreach context — Artificial Societies

This file exists so the assistant has the framing when drafting the README, the research note, or the outreach email.

## The company

- Founded 2024 by James He (CEO) and Patrick Sharpe (CPO), joined later by Tom Whittle (CTO).
- London HQ + SF presence. ~6 employees.
- $7.3M raised total: $2M pre-seed (Kindred, YC, angels from DeepMind, Sequoia Scout) + $5.3M seed led by Point72 Ventures (Aug 2025).
- YC W25 batch.
- James was named Forbes 30 Under 30 of 2026.

## What they sell

Originally a horizontal "simulate any audience" SaaS product. Pivoted in late 2025 toward enterprise consulting + bespoke simulations. Current flagship: **Radiant** — purpose-built networks of 300 to 5,000+ AI personas modelling specific high-value audiences (shareholders, policy influencers, F500 buyer committees). 18M+ responses delivered. Partnerships with Teneo and Pulsar.

They have publicly killed "Reach" (their LinkedIn-post simulator). Do not pitch a Reach clone.

## Key people

- **James He** — CEO, Cambridge behavioural sciences, ex-Yonder ML lead. Lead author on the BJP paper. Active on LinkedIn, writes long-form on his personal site about company-building. Forbes 30U30 2026.
- **Felix Wallis** — Head of Research. Co-author on the BJP paper. The most direct technical reader for the research note.
- **Patrick Sharpe** — CPO, behavioural econ background.
- **Tom Whittle** — CTO.

## The paper (He et al. 2026)

- Title: "Artificial intelligence chatbots mimic human collective behaviour"
- Journal: British Journal of Psychology
- Data: 33,299 GPT-3.5-powered chatbots on Chirper.ai over 28 days
- Core finding: Homophily emerges without prompting. Bots form communities by language; English-only subset forms sub-communities by post content. Engagement frequency correlates with content similarity.
- Discussion explicitly calls for: replication across model families; investigation of boundary conditions; network-level RCTs varying prompts.

## Why this artifact matters to them

The thesis maps to a real Radiant risk. If a simulated F500 buyer committee homogenises by round 4 of a multi-round simulation, the customer's "insights" are corrupted. A diagnostic that flags diversity collapse in real time is a feature, not a critique.

## Outreach principles

- Lead with the artifact, not the credentials. Wharton, Eton, GPA — none of it appears in the first email.
- Subject line names the paper and gives the result.
- The "bridge" paragraph connects your finding to Radiant's commercial use case.
- Ask is small: 15 minutes.
- One link to the demo, one link to the note, one Loom. Three artifacts max.
- Send to James first. If no reply in 5 working days, send a different angle to Felix (research-led framing).

## Draft email (final version finalised after build)

```
Subject: Re-ran your BJP homophily study on Claude Haiku — finding holds, with one twist

Hi James,

I'm Sonny, a freshman at Wharton (Stats + CIS). Read your BJP paper on AI
chatbot societies last week and got curious about something your discussion
section flagged: whether the homophily result holds across model families.

So I built a scaled-down replication. 50 Claude Haiku 4.5 agents in a
topic simulation environment, 8 rounds, same metrics as your paper (modularity,
assortativity, content–engagement correlation). The finding reproduces,
with [headline result].

The build: [link]
The 2-page note: [link]
Loom walkthrough: [link]

The reason I'm sending this rather than just sitting with it: I think the
"diversity-collapse-over-time" diagnostic is interesting for Radiant — if
a simulated F500 buyer committee homogenises by round 4, the user should
probably know.

I'm in London for the summer with full UK work rights. Would value 15
minutes to talk about whether there's any way I could be useful.

Sonny
[linkedin]
```
