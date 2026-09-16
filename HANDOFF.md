push-state: `main` ahead 4 / behind 0 / dirty 0; publication hold blocks push
visible-at: https://ramarahub.ca (live query UI remains until the hold is released)
needs-russell: release the RamaraHub publication hold so the static cutover can push

# Handoff: Ramara Hub public site

## Current state

- **State**: static read-only civic-information site, verified locally and not yet published
- **Owner**: Russell
- **Verified**: 2026-09-16
- **Repository**: `/Users/russellcole/Developer/ramarahub`
- **Branch**: `main`
- **Deployment**: GitHub Pages from `main` to `ramarahub.ca`

## Static cutover

- The homepage question/query bar is removed.
- All deployed forms and hosted-database references are removed.
- Existing information remains browsable as static pages.
- Local verification passed across 38 text files and 26 pages. Browser QA found zero forms, zero query bars, zero hosted-database references, zero console warnings/errors, and no horizontal overflow at 1280px.
- Commits: `65410e5`, `a505407`, `ad21b3d`.
- Release evidence: `_reports/2026-09-16-static-cutover.md`.

## Publication gate

- A normal `git push origin main` was attempted and refused by the managed `.git/PUBLISH_HOLD` guard.
- Do not remove or bypass the hold. The live site still has the old query bar until publication is explicitly released.

## Backend retirement

- The public RamaraHub site no longer needs its hosted database after the static cutover publishes.
- The separate Meet the Candidates page still writes to the shared `action_ideas` table with topic `meet-candidates-2026-standalone`.
- Keep that backend active through the September 29 event and question follow-up.
- Then take a fresh final dump, verify it locally and on LifeVault, and use a guarded human-only deletion.
- Current archives are complete and restore-tested at 1,204 public rows. Optional contact details must be deleted after follow-up and no later than October 31, 2026.

## Candidate-event separation

- Ramara Hub no longer promotes or hosts the 2026 Meet the Candidates intake.
- The former `/candidate-questions/` URL is a minimal no-index redirect to the independent event page.
- Event questions and optional contact data remain outside Ramara Hub's editorial surface.

## Continuation

Release the publication hold, push `main`, verify the live query bar is gone, and leave the shared backend active until the event intake has closed and a fresh backup passes.
