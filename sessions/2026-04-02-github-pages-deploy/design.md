# GitHub Pages Deployment

**Date:** 2026-04-02
**Skills:** ideate

## Problem
The game has no online presence. Every push to `main` should automatically make the latest version playable on GitHub Pages without manual steps.

## Decision
Use GitHub Actions with the modern `actions/upload-pages-artifact` + `actions/deploy-pages` pattern. The workflow runs `npm run build` to produce a fresh `mvp/bundle.js`, then deploys the `mvp/` directory as a Pages artifact.

This is the GitHub-recommended approach: no orphan branches, no deploy keys, no PATs. The only manual step is a one-time repo settings change (Pages source → "GitHub Actions").

### Why not the alternatives?
- **gh-pages branch deploy** — older pattern requiring a deploy key or PAT; more moving parts for no benefit
- **Deploy without build step** — fragile; relies on `bundle.js` being current in the commit, defeating the purpose of CI

## Design

### Workflow: `.github/workflows/deploy.yml`

**Trigger:** push to `main`

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. `npm ci`
4. `npm run build`
5. Upload `mvp/` as Pages artifact
6. Deploy to GitHub Pages

**Permissions:** `contents: read`, `pages: write`, `id-token: write`

**Concurrency:** single deployment at a time with `cancel-in-progress: true` to avoid racing deploys.

### Path compatibility
All asset references in `index.html` are relative (`style.css`, `bundle.js`), so they resolve correctly whether served from `file://`, root, or a GitHub Pages subdirectory (`/repo-name/`). No `<base>` tag or path rewriting needed.

### Setup required
One-time: in the GitHub repo settings, set Pages → Build and deployment → Source to **"GitHub Actions"** (not the default "Deploy from a branch").

### Failure modes
- **Forgotten repo setting:** deploy step fails with a clear error about Pages not being configured — easily diagnosed.
- **Build failure:** workflow fails before deploy; previous version stays live. No partial deploys.
