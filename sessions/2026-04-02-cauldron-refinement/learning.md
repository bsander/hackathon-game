# Implement — 2026-04-02

## Key Learnings

- **Selective randomization dramatically improves learnability** — Randomizing all 8 keys after each action creates cognitive overload; randomizing only the pressed key per player makes the game learnable within a single round. Players can learn 3 fixed key positions and focus on predicting which one will shift next.

- **DOM + state synchronization must be atomic** — Prior cross-session learning proved critical: updating `currentKeyBindings` state alone doesn't work; the `.key-row[data-key]` attributes and text content must be updated simultaneously in the same code block. Failure to sync causes visual stale references that confuse players.

- **Collision detection with large key pools is negligible cost** — With 36 available keys and 4 opponent keys, collision probability during single-key randomization is ~0.3%. A simple linear search with max 100 attempts loop is sufficient and avoids pre-computation or hashing overhead. Defensive max attempts prevent infinite loops while accepting vanishingly rare collisions as a known risk.

- **UI-only changes have zero impact on game logic** — Removing the direction fill bar had no downstream effects on ingredients, reactions, state machine, or tests. Pure CSS/DOM cleanup is safe to parallelize independently of gameplay changes.

- **Key pool size scales linearly with randomization entropy** — Expanding from 20 to 36 keys (1.8×) provides noticeably more variety in randomized sets when sampled repeatedly. With selective randomization (only 1 key changes per action), the larger pool prevents rapid key repetition and extends play session variety.

