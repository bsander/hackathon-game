## Blueprint — 2026-04-02

- When extracting resolution logic from a function that mixes outcome determination with display text generation, return only the outcome enum from the pure function and let the caller build display strings. This prevents the pure module from acquiring presentation concerns and keeps it trivially testable.
- When a function reads module-level mutable state (like `defender()` reading `attacker`), the extraction must change its signature to accept the value as a parameter. Grep for all call sites before committing — the rename is the only API-breaking change in a pure extraction.

## Implement — 2026-04-02

- When refactoring score-threshold logic (e.g. "check if score >= 3 after incrementing"), verify that the new pure function's arithmetic matches the original's sequencing. The original incremented then checked; the extraction must compute `currentScore + 1 >= winScore` to be equivalent. Off-by-one here would only surface at game-winning score.
- ES modules (`import`/`export`) do not work over `file://` protocol. When a hard requirement is "open HTML directly in browser", use a bundler (esbuild) to produce a single IIFE script for the browser. Keep ES modules as the source of truth for testing only. This constraint should be established before the module extraction, not discovered after.
