push-state: `main` ahead 0 / behind 0 / dirty 0 after static-cutover closeout
visible-at: https://ramarahub.ca (static read-only site live; query UI removed)
needs-russell: none

# Handoff: Ramara Hub public site

## Current state

- **State**: live static read-only civic-information site
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
- Cutover commits: `65410e5`, `a505407`, `ad21b3d`, `420e342`.
- Release evidence: `_reports/2026-09-16-static-cutover.md`.

## Publication

- Russell explicitly released the managed publication hold on 2026-09-16.
- GitHub Pages workflow `35131734509` built and deployed `420e342` successfully.
- Reader-facing verification reopened `https://ramarahub.ca`: the page contains the static browse experience and no question/query input.

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

Leave the shared backend active until the event intake has closed. Then take and verify a fresh final backup before the approved human-only retirement.
