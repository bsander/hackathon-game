## Ideate — 2026-04-02

- In shared-keyboard games, any mechanic requiring `keyup` detection (hold-to-commit, charge meters) is fragile: the other player grazing a key causes phantom cancellations indistinguishable from bugs. Stick to `keydown`-only input for shared-keyboard designs.
- When playtesters report "button mashing," the root cause is usually invisible consequences, not missing penalties. Making existing consequence systems (like spell morphing) visible is a lower-risk fix than adding new punishment mechanics.
- Playtest feedback that sounds like "the game needs more complexity" (progressive HP, new mechanics) often actually means "I can't see what's already there." Diagnosis: check whether the game's existing systems are perceptible before adding new ones.
- For shared-screen games, global visual effects (screen shake, full-screen flashes) penalise both players equally regardless of who caused the event. Use localised effects scoped to the responsible player's screen region.
- In hackathon demos, the number of discrete health units should be small enough that spectators can count them at a glance. Losing 1 of 3 pips is more dramatic than losing 3 of 10 HP, even though the proportional damage is the same.
- When designing anti-mashing mechanics, distinguish between pressing the wrong player's keys (orientation confusion — harmless fizzle) and pressing your own keys out of turn (deliberate mashing — escalating consequence). Different causes deserve different responses.
- UNO's four disruption properties (targeted, legible, reversible, socially deniable) also apply to punishment mechanics: a backfire that's visible, self-inflicted, and avoidable creates a social moment ("you did that to yourself!") rather than frustration.

## Blueprint — 2026-04-02

- When a design introduces mechanics that remove resources (pip loss from backfire), verify that the underlying data model supports removal — not just accumulation. An additive score model (0→3 wins) semantically cannot lose pips; a health model (3→0) can. This semantic direction must be decided before any removal mechanic is implemented.
- In single-file game architectures with interleaved logic/rendering, DOM elements that visually "belong" to a player column may be separate DOM siblings (e.g., spell panels outside the player-col div). Any visual effect targeting "the player's side" must account for elements that aren't descendants of the column node.
- When adding a blocking display state between two existing states (e.g., MORPH_DISPLAY between RESOLVE and the next attack), the routing decision (which state comes after?) must be computed and stored *before* the blocking state runs — the blocking state's only job is display and timer, not decision-making.

## Implement — 2026-04-02

- In state machines with transition micro-states (REVEAL_DELAY between ATTACK and DEFEND), resetting per-phase counters (like misfire counts) on every `enterState()` call creates an exploit: the counter resets on transition states that don't represent new input phases. Reset only when entering states that accept player input.
- When a state machine routes through the same post-state logic from multiple paths (normal flow, pause/resume, skip-when-empty), extract the routing into a named function immediately. Three copies of "what happens after MORPH_DISPLAY" will diverge within one editing session.
- On shared keyboards, the "fizzle" concept (active player pressing opponent's keys) is indistinguishable from "backfire" (inactive player pressing their own keys) because we can only observe which key was pressed, not who pressed it. Design for what's observable, not what's theoretically distinct.
