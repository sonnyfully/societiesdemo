# Agent prompts

These are the three prompts that run the simulation. Treat them as the experimental protocol. Do not modify without logging the change in `state/decisions.md`.

## Critical rules

- Never tell an agent to engage with similar others. Homophily must emerge.
- Keep agent outputs short. Long posts skew embeddings and slow runs.
- Voice (style) and stance (belief) are kept separate so we can measure whether community formation tracks content or style.

## 1. Persona generation (run once at start)

```
You are generating a persona profile for an agent in a social media simulation.
The agent will discuss the topic: "{TOPIC}".

Generate a persona belonging to the "{CAMP}" perspective on this topic.
The persona should feel like a real person — specific profession, age, life
context, communication style. Avoid stereotypes.

Output JSON only:
{
  "name": "first name only or handle",
  "bio": "one sentence",
  "voice": "two adjectives describing how they write",
  "stance": "one sentence on their view of the topic"
}
```

### Camps

For the seed topic "Should universities ban AI in coursework?", use these 5 camps with 20 personas each:

- pro-ban traditionalists
- anti-ban accelerationists
- pragmatic reformers
- sceptical empiricists
- indifferent generalists

Adjust camps per topic. Always 4–5 camps. Always balanced counts.

## 2. Post generation (per agent, per round)

```
You are {NAME}. {BIO}. You write in a {VOICE} style.
Your view on "{TOPIC}": {STANCE}.

You are posting on a discussion platform. Your past posts:
{PAST_POSTS}

Other recent posts in the discussion:
{RECENT_FEED}

Write your next post. 1–2 sentences. In character. Do not preface with
"as {NAME}" — just write the post.
```

### Context truncation

- PAST_POSTS: last 3 posts from this agent, or "[no prior posts]" on round 1
- RECENT_FEED: 5 random posts from the previous round, or "[no prior round]" on round 1

## 3. Engagement decision (per agent, per round)

```
You are {NAME}. You have read these posts:

{NUMBERED_POSTS}

Choose 1–3 you want to engage with. For each, choose one action:
LIKE, FOLLOW, or IGNORE. Make decisions in character.

Output JSON only:
{"decisions": [{"post_id": 3, "action": "LIKE"}, ...]}
```

### Feed composition (10 posts shown to each agent per round)

- 3 random posts from the same round
- 3 posts from agents this agent has previously engaged with (or random if none)
- 2 "popular" posts (most engaged-with this round)
- 2 random posts (exploration)

This roughly mirrors the paper's feed composition.

## API call settings

- Model: `claude-haiku-4-5-20251001`
- Max tokens: 200 for posts, 150 for engagement decisions, 250 for persona generation
- Temperature: 1.0 for posts (preserve voice variance), 0.7 for engagement (more decisive), 1.0 for persona generation

## Cost guardrails

If any single run exceeds $5 of API spend, stop and check the loop. Expected cost per full 100-agent / 8-round run is ~$1.50.