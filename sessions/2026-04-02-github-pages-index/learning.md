## Ideate — 2026-04-02

- When deploying a whole repo root to GitHub Pages, use a staging directory (`_site/`) to avoid uploading `node_modules/` and other dev artifacts — `upload-pages-artifact` does not filter by `.gitignore`.
