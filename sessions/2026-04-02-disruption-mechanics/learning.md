## Ideate — 2026-04-02

- In shared-screen multiplayer games for non-gamers, UI corruption mechanics (scrambled labels, input delays) create "I didn't know what happened" frustration rather than fun chaos. Disruption should change what the game *pieces do*, not make the interface unreadable. Legibility is non-negotiable for demo audiences.
- UNO's disruption loop works because of four properties: targeted (hits a specific person), legible (everyone sees what happened), reversible (you can come back), and socially deniable ("I had to play it"). All four must be present or the mechanic feels punishing rather than playful.
- For hackathon games, the "memorable to watch once" standard matters more than "fun to play repeatedly." Design for spectator comprehension and social moments over strategic depth.
- When a mechanic has an escape valve (e.g., casting Chaos resets your slot), that escape must be visually distinct from the penalty. If reset looks like degradation, players never discover the way out and the game collapses to pure attrition.
- Two-tier systems (normal + chaos) are more demoable than three-tier systems when the audience has 30 seconds to self-onboard. The intermediate tier adds nuance that only matters after multiple plays — which a hackathon demo won't reach.

## Blueprint — 2026-04-02

- When a game state machine already has post-resolution delays (overlay display, score animation), new mechanics can be inlined into those delays rather than adding dedicated states. Each new timed state adds timer management, pause/resume handling, and input gating — costs that compound in single-file game architectures.
- In single-file game architectures where logic and rendering are interleaved, UI restructuring must follow logic changes, not run in parallel. Even "independent" DOM changes conflict when the same file handles both concerns.
- Replacing one complexity source (key shuffling) with another (spell morphing) is a net simplification only if the old mechanic is fully removed. Leaving shuffling code alongside morphing code creates two competing mental models for the same design goal.

## Implement — 2026-04-02

- When game UI elements (spell panels) need to remain visible during overlay states (HIT/BLOCKED popups), z-index layering must be planned upfront — overlays that cover the full game container will hide information the player needs to see during resolution.
- Morph feedback timers (e.g., 600ms label removal) that run independently of the state machine are safe in games where `renderSlots()` overwrites the DOM on every state transition — the orphaned timer just removes an already-replaced element. This pattern breaks if rendering becomes incremental/diffed.
- In a two-tier spell system (Standard + Chaos), the morph-on-cast logic is symmetrical: Standard degrades, Chaos resets. This means the same slot alternates between states across turns, creating a natural rhythm that players can learn to anticipate and plan around.
