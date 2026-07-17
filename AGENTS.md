---
repo: ramarahub
name: Ramara Hub (public site)
liveURL: https://ramarahub.ca
deploy: GitHub Pages from main → ramarahub.ca
---

# Ramara Hub — agent rules (public repo)

Public site for ramarahub.ca. A neutral, independent civic resource for the Township of Ramara, Ontario. Safe to read publicly.

## Firewall
- Public content stands only on public, verifiable records.
- Never import private/internal content, framing, or wording into this repo.
- Strictly neutral: never promotes or opposes any candidate or party. Nothing reads as campaign material.

## Content
- Facts only. No guessing numbers, quotes, dates, positions.
- Every claim sourced, linked with a full `https://` URL.
- Both sides on contested issues. If the record is thin or one-sided, say so.
- No endorsements or grades. Plain voice, resident benefit. Show last-checked date.

## Review before publishing
- Routine factual/maintenance edits: publish, review after.
- Sensitive, contested, election-adjacent, legal, or new claims about how the Hub works: human review first.
- Resident replies are drafted for a human to send, never auto-sent.

## Publish
- Any authorized coding agent may commit and push site changes. Follow the review rules above, inspect the exact diff, and stage only the intended files.
- Bump `?v=N` on any CSS/JS change.
- Changelog is DB-driven (goes live without a push); pages need a push. Keep them consistent.

## Where content lives
- KB: `data/kb.json` (renders client-side via `assets/app.js`).
- Briefs: hand-written HTML in `briefs/` — update "Last verified" on edit.
- Pages: top-level `.html`.

## Compliance
- Verify current Ontario rules before publishing anything election-adjacent.
