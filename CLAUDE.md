# Arcane Akash

Two-player local spell duel. Hackathon game.

## Hard Requirements

- **Browser only, no server.** The game must work by opening `mvp/index.html` directly in a browser (`file://` protocol). Never require a dev server to play.

## Development

- Source modules live in `mvp/js/` as ES modules (for vitest).
- `npm run build` bundles them into `mvp/bundle.js` (esbuild, IIFE format) for the browser.
- `npm test` runs vitest against the source modules.
- After changing source modules, run `npm run build` before testing in the browser.
