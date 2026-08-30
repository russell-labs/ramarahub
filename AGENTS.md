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
- Changelog is checked-in HTML. All public changes require a reviewed commit and push to `main`.

## Where content lives
- KB: `data/kb.json` (renders client-side via `assets/app.js`).
- Briefs: hand-written HTML in `briefs/` — update "Last verified" on edit.
- Pages: top-level `.html`.

## Read-only boundary
- No database, account, login, submission, save, sync, moderation, or admin dependency belongs in the public site.
- Reader search runs locally against `data/kb.json` and must never claim that a query was logged or submitted.

## Compliance
- Verify current Ontario rules before publishing anything election-adjacent.


## Handoff

Before this session ends, write or refresh this venture's `HANDOFF.md`:

- Procedure: `~/Developer/RussellLabs/ops/agent-operating-standard.md`, rule 6. It wins over any other handoff instruction in this tree.
- Method: `~/Developer/RussellLabs/russell-labs-skills/skills/handoff/SKILL.md`. If your tool has slash commands, `/handoff` runs the same file.

One current photograph, not a work log. Around 120 lines. It opens with three status lines, refreshed every time it is touched:

    push-state: <branch> ahead A / behind B / dirty N
    visible-at: <URL, install target, or none-yet>
    needs-russell: <short list, or none>

An uncommitted or unpushed handoff is not done. Session detail and gate output go in dated files under `_reports/`, referenced by path, never inlined.
