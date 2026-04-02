# GitHub Pages Index

**Date:** 2026-04-02
**Skills:** ideate

## Problem
The GitHub Pages deployment only served `mvp/`. There was no landing page linking visitors to the different game versions, making them undiscoverable and breaking the "show the design journey" goal.

## Decision
Create a root `index.html` as a themed landing page with cards linking to each playable version, update the deploy workflow to stage and upload all three MVP directories alongside the index, and add a `build:all` script. The page uses inline CSS matching the existing arcane aesthetic (dark background, monospace, golden accents).

### Why not the alternatives?
- Separate GitHub Pages repo — unnecessary indirection, versions already live in subdirectories
- Subdomain per version — overkill for a hackathon project with three versions

## Implementation
- `index.html` at repo root with inline CSS (no build step needed)
- `.nojekyll` to prevent GitHub Pages from processing with Jekyll
- `deploy.yml` stages only needed files into `_site/` (avoids uploading `node_modules/`, `.git/`, `sessions/`)
- `package.json` gains `build:mvp3` and `build:all` scripts
- All links use relative paths — works on both GitHub Pages and `file://`
