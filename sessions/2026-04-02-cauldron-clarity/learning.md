## Ideate — 2026-04-02

- When a spell dominates in a real-time game, the fix is often tempo cost (longer cooldown) rather than reducing per-cast stats. Per-cast nerfs make the spell feel weaker; tempo costs preserve the satisfying moment while limiting spam frequency.
- A tutorial round in a 2-player simultaneous game cannot demonstrate the most important mechanics (cross-player reactions) because those require both players acting. Static onboarding + learn-through-play feedback is more honest about what can be taught.
- "Invisible consequences" as a diagnosis applies recursively: the Cauldron game's reaction system is invisible for the same reason the old game's morph system was invisible. The pattern generalises to any mechanic that changes game state without per-action visual feedback.
- In hackathon demos, every second of non-gameplay (tutorials, loading, configuration) is dead time for spectators. Onboarding must be skimmable and non-blocking.

## Blueprint — 2026-04-02

- When multiple tasks all modify the same file (here: `game.js`), sequential execution is the only safe ordering regardless of logical independence. Parallel clusters only work when tasks touch disjoint files.
- Per-ingredient cooldown creates a coupling point between the balance change and the visual feedback (dimming) — the dim duration must be derived from the same computed value, not from a separate constant. When a mechanic change and its visual feedback are designed as separate pillars, blueprint must flag shared variables explicitly.
- Dead CSS classes (`.on-cooldown` existed but was unwired) are easy to miss during impact analysis. Checking the stylesheet for classes that match the design's intent before writing new CSS avoids duplication.

## Implement — 2026-04-02

- Floating delta labels that describe directional effects need to be player-aware — "direction →" means different things for P1 (toward P2) and P2 (toward P1). Static label text per ingredient is insufficient when the effect is relative to the caster.
- `setTimeout`-based visual effects (cooldown dimming) are detached from game state transitions. In a state-machine game, visual cleanup timers can fire after the state has changed (e.g. explosion during cooldown). For cosmetic effects this is harmless, but for gameplay-affecting timers it would be a bug class worth guarding against.
