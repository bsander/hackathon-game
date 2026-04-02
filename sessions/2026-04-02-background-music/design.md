# Background Music — Bubble Brew Arcade

## Decision

Add `Bubble Brew Arcade.mp3` as looping background music for the Chaos Brewing game (mvp3-final-dog).

## Approach

- Create an `Audio` element in `game.js` pointing at the co-located MP3
- Loop enabled, volume at 0.4 (not overwhelming for a duel game)
- Playback triggered on the first SPACE press (onboarding screen 1 → 2) to satisfy the browser's user-gesture autoplay policy
- Silent `.catch()` on `play()` for edge cases where the browser still blocks
- Music persists across rounds and game restarts — no need to restart the track

## Files Changed

- `mvp3-final-dog/js/game.js` — added music initialisation and `startMusic()` call
- `mvp3-final-dog/bundle.js` — rebuilt via `npm run build:mvp3`

## Constraints

- Must work from `file://` protocol (no server) — relative `Audio` path resolves fine for local files in the same directory
- No CORS issues since both HTML and MP3 are local filesystem resources
