push-state: `main` ahead 0 / behind 0 / dirty 0 after this handoff commit
visible-at: https://ramarahub.ca (static read-only site live; query UI removed)
needs-russell: run `RussellLabs/scripts/Retire RamaraHub Supabase.command` when at the Mac

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
- Project `ramarahub` (`pchdckgdrigevxfjwgom`) still exists pending the guarded human-only retirement action.
- A fresh full backup is complete and restore-tested at 1,204 public rows across 11 tables, with 0 Auth and 0 Storage rows.
- Four Edge Functions are preserved in the archive: `comment-notify`, `hub-answer`, `hub-apply`, and `hub-notify`.
- Local and LifeVault archive hashes match.
- Run `/Users/russellcole/Developer/RussellLabs/scripts/Retire RamaraHub Supabase.command`; it refuses unless the exact project, live row counts, and both archive copies still match.

## Candidate-event separation

- Ramara Hub no longer promotes or hosts the 2026 Meet the Candidates intake.
- The independent candidate-form repository was never published and its GitHub Pages URL returns 404.
- The former `/candidate-questions/` URL now shows a no-index closed notice and does not redirect or accept submissions.
- GitHub Pages deployment `35157677180` completed successfully at commit `7f592b9`.

## Continuation

The public site and retired candidate intake no longer depend on Supabase. Run
the guarded retirement script when at the Mac. Do not alter any other Supabase
project.
