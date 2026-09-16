# RamaraHub static cutover evidence

Date: 2026-09-16

Status: **DEPLOYED AND VERIFIED**

## Scope

- Removed the homepage question/query bar.
- Preserved the existing static civic-information pages.
- Removed all deployed forms and Supabase client references.
- Kept the separate Meet the Candidates intake untouched.

## Verification

- Deterministic static check: passed across 38 text files and 26 pages.
- Local browser QA: 0 forms, 0 query bars, no Supabase references, no console warnings or errors.
- Layout QA at 1280px: body width equalled viewport width; no horizontal overflow.
- `git diff --check`: passed.
- Commits under review: `65410e5`, `a505407`, `ad21b3d`.

## Publication result

Russell explicitly released the managed publication hold on 2026-09-16. `main` was pushed at `420e3423e001ae11a817cb00b383bde2354662c3`.

- GitHub Pages workflow: `35131734509`
- Build: passed in 23 seconds
- Deploy: passed in 46 seconds
- Live URL: `https://ramarahub.ca/`
- Reader-facing verification: page title and content loaded; the homepage shows the static browse experience and no question/query input.

The release changed only the public RamaraHub site. The separate candidate-event intake remains available and its backend dependency is unchanged.

## Database dependency

The static public site will not require Supabase after publication. The independent September 29 Meet the Candidates form still writes to RamaraHub project `pchdckgdrigevxfjwgom`, table `action_ideas`, using topic `meet-candidates-2026-standalone`. Keep the project active through event follow-up, then take and verify a fresh final dump before human-only deletion.

Current archive evidence: 1,204 public rows restored successfully; local and LifeVault copies match by SHA-256.
