# Ramara Hub

One simple place for Ramara Township residents to find answers — a Ramara Civic Forum project.
Live at https://ramarahub.ca

## How it works

Static site, no build step. The knowledge base lives in `data/kb.json`; the search bar and
category browsing render from it client-side (`assets/app.js`). Issue briefs are hand-written
HTML in `briefs/`. Every fact links to an official source. The site is read-only and has no
database dependency: searches stay in the browser, and submissions, live feeds, and the
database-backed document index are unavailable.

## Editing content

- **Add/edit an answer:** edit `data/kb.json` (fields: id, cat, q, a, phone, links, keywords). Commit and push.
- **Add a category:** add to `categories` in `kb.json`.
- **Issue briefs:** edit the HTML in `briefs/` directly. Update the "Last verified" date.
- **Hard rules:** facts only, every claim sourced, no guessing, both sides on contested issues, no endorsements.

## Deploy

GitHub Pages from `main` (repo: github.com/russell-labs/ramarahub), custom domain
`ramarahub.ca` (CNAME file in repo; Namecheap DNS: 4× A records @ →
185.199.108/109/110/111.153, CNAME www → russell-labs.github.io).

## Roadmap

The checked-in knowledge base, issue briefs, budget pages, council contacts, and source links
remain useful without a backend. Any future live answer engine, document index, feed, or form
requires a separately approved backend and data migration.
