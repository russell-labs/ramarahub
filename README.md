# Ramara Hub

One simple place for Ramara Township residents to find answers — a Ramara Civic Forum project.
Live at https://ramarahub.ca

## How it works

Static site, no build step. The knowledge base lives in `data/kb.json`; the search bar and
category browsing render from it client-side (`assets/app.js`). Issue briefs are hand-written
HTML in `briefs/`. Every fact links to an official source.

## Editing content

- **Add/edit an answer:** edit `data/kb.json` (fields: id, cat, q, a, phone, links, keywords). Commit and push.
- **Add a category:** add to `categories` in `kb.json`.
- **Issue briefs:** edit the HTML in `briefs/` directly. Update the "Last verified" date.
- **Hard rules:** facts only, every claim sourced, no guessing, both sides on contested issues, no endorsements.

## Deploy

GitHub Pages from `main`, custom domain `ramarahub.ca` (CNAME file in repo;
DNS A records → GitHub Pages, www CNAME → russellcolevop.github.io).

## Roadmap

Phase 2: AI plain-language answers (Supabase edge function + retrieval over this knowledge base).
Phase 3: "Didn't find it? Ask" intake. Phase 4: budget/project/decision transparency tools.
Venture system of record: `RussellLabs/ramara/`.
