# Ramara voter-turnout issue brief

**Goal:** A neutral, source-backed Ramara Hub issue brief at `briefs/voter-turnout.html` presents the verified 2018 and 2022 turnout findings, explains the cohort and limitations, exposes downloadable audit data, and passes factual, structural, accessibility, and independent-review checks with no candidate promotion.

## Scope

- Add one hand-written issue brief using the existing civic-editorial components and Chart.js treatment.
- Add the brief to the Issue Brief index and the home-page brief cards.
- Publish the complete derived small-municipality ranking as CSV and the reviewed workbook as a download.
- Show Ramara's exact voter/elector calculations, broad and contested-head rankings, nearest turnout neighbours, methodology, source conflict, and correction path.
- Use municipality-wide turnout language throughout; never describe the measure as mayor-ballot turnout.
- Preserve the current stylesheet and JavaScript versions; add no dependency or new service.

## Excluded

- Candidate names, endorsements, criticism, campaign messaging, or discussion rules for social-media comments.
- Changes to `AGENTS.md`, `briefs/development-charges.html`, `data/kb.json`, or other unrelated in-progress work.
- Commit, push, deploy, or public publishing. Election-adjacent content requires Russell's review first.
- A new visual system, stylesheet revision, interactive account feature, or database work.

## Execution

1. Create the issue brief from the validated study outputs and existing Ramara Hub brief patterns.
2. Add audit downloads and direct official-source links.
3. Add the brief cards to `briefs/index.html` and `index.html` without reformatting unrelated markup.
4. Run deterministic data assertions, HTML parsing, internal-link checks, and a local static-server smoke check.
5. Run an independent adversarial content/code review. Pass requires 0 Critical and 0 Important findings; recycle if needed.
6. Stop at a review-ready handoff for Russell. Do not publish.

## Verification evidence

- Ramara values reconcile to 4,344 / 11,146 = 38.97% for 2018 and 4,282 / 11,869 = 36.08% for 2022.
- Broad 2022 rank is 188 of 329; strict contested-head rank is 119 of 161.
- The public CSV contains all 352 under-30,000 municipalities and no duplicate municipality names.
- All new local links resolve; all external source links use full `https://` URLs.
- Charts have text fallbacks and accessible labels.
- Independent reviewer reports 0 Critical / 0 Important and names the weakest remaining point.

## Tripwire note

Available disk space is below the studio's 15 GiB floor. This task remains limited to lightweight static-file edits and checks: no dependency install, heavy build, media render, or cache generation.

## Recycle 1 — adversarial review remediation

The first independent review returned 0 Critical / 2 Important / 1 Minor:

- Renamed the public CSV's ambiguous `rank_change_small` field to `rank_by_turnout_change_small`; it ranks municipalities by percentage-point turnout change and is not the difference between their two rank numbers.
- Removed the unsupported phrase "and local reporting" from the 2018 source-conflict disclosure. The sentence now attributes the selected figures only to AMO's linked published workbook.
- Replaced the imprecise home-card phrase "small-town ranking" with "ranking among Ontario municipalities under 30,000."

The corrected artifact must pass a fresh independent review at 0 Critical / 0 Important before handoff.

## Recycle 2 — workbook remediation

The second independent review returned 0 Critical / 1 Important / 1 Minor:

- Removed the same unsupported “and local reports” attribution from `Summary!A57` in the public workbook. The caveat now attributes the selected 2018 figure only to AMO.
- Renamed `All Municipalities!X1` from “Change rank” to “Rank by turnout change,” matching the clarified CSV header and the formula’s actual meaning.

Both edits were made with the bundled spreadsheet workflow. The corrected workbook was re-imported, all six worksheets were visually checked, the two cells were inspected, the formula-error scan returned zero matches, the formula count stayed unchanged, and the archive passed an integrity test. A third fresh independent reviewer must still return 0 Critical / 0 Important before handoff.

## Final verification

The third fresh independent review passed with 0 Critical / 0 Important / 0 Minor. It confirmed both corrected workbook cells, 13,171 preserved formulas with no cached formula errors, archive integrity, and Ramara's headline figures and ranks. The reviewer named the study-defined under-30,000 cohort as the weakest remaining point; the brief already discloses that this is not an official municipal class.

Status: review-ready for Russell. Not committed, pushed, deployed, or published.
