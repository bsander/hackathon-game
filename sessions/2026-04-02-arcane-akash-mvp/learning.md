## Ideate — 2026-04-02

- In duel games with deterministic counters, the tension must come from execution pressure (time, spatial confusion) rather than from information hiding — otherwise the mechanic either collapses to "always pick the counter" or feels arbitrary. Key shuffling under time pressure is a high-value mechanic: the player knows the *answer* but must solve a spatial puzzle to *execute* it.
- For hackathon demos, spectator legibility matters as much as player experience. Large text, win pips instead of numbers, and visible countdown bars communicate game state to someone watching from distance.
- Variable timing (both reveal delay and response window) prevents rhythm-based muscle memory more effectively than a single fixed timer. Two RNG draws per round, zero extra states.

## Blueprint — 2026-04-02

- For a single-file greenfield game, impact analysis confirms there are no hidden dependencies — but it's still worth checking that the chosen browser APIs (visibilitychange, rAF, setTimeout) behave correctly under the specific usage pattern (e.g., setTimeout throttling in background tabs is neutralised by the pause handler, not by ignoring the problem).
- Keeping key shuffling as a separate task from input handling pays off in verification: shuffling correctness (is the mapping fresh? is it what's used for resolution?) is a distinct concern from input gating (is the right player's input accepted?).

## Implement — 2026-04-02

- When a state machine has multiple states that use timers with pause/resume support, every timed state must update the shared timing variables (`countdownStart`, `countdownDuration`) — not just the states with visible countdowns. Transition states like REVEAL_DELAY are easy to miss because they don't render a countdown bar, but the pause handler still needs correct timing data to calculate remaining time.
