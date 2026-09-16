push-state: `main` ahead 0 / behind 0 / dirty 0 after the candidate-question release
visible-at: https://ramarahub.ca/candidate-questions/
needs-russell: none

# Handoff: Ramara Hub public site

## Current state

- **State**: live static civic-information site with a neutral 2026 candidate-question intake
- **Owner**: Russell
- **Verified**: 2026-09-15 by live browser, HTTP, GitHub Pages, and Facebook Sharing Debugger readback
- **Repository**: `/Users/russellcole/Developer/ramarahub`
- **Branch**: `main`
- **Release commit**: `fb90d92`
- **Deployment**: GitHub Pages from `main` to `ramarahub.ca`

## Candidate-question form

- Public URL: `https://ramarahub.ca/candidate-questions/`.
- The question is required. Name, email, and phone are optional.
- The homepage contains a visible entry point.
- The page is neutral and links the Township's public certified-candidate list.
- Unsourced event date and location copy was deliberately excluded. Add it only when a public
  organizer/event URL can be linked.
- Russell's September 15, 2026 instruction to put the form on `ramarahub.ca` was the exact
  public-release approval for this reviewed payload.

## Intake and privacy

- Submissions use the existing private `action_ideas` intake. No schema changed.
- Rows are tagged exactly `topics=meet-candidates-2026`.
- `idea` stores structured JSON with `question`, `name`, and `phone`; email remains in the
  existing email field.
- Form limits guarantee even worst-case escaped JSON remains below the existing 4,000-character
  intake boundary without truncation.
- The collection notice states purpose, private storage, non-sharing, provider metadata,
  deletion timing, and the early-deletion contact route.
- Contact details are not public, not shared with candidates, and not added to a mailing list.

## Retention task

- Optional contact details must be deleted after question follow-up and no later than
  October 31, 2026.
- On or before that date, identify only `action_ideas` rows with the exact
  `topics=meet-candidates-2026` tag and report the count.
- Obtain Russell's in-the-moment production-data deletion approval, delete only those tagged
  rows, and verify the count is zero.
- Do not export, publish, or share the contact details.

## Verification

- GitHub Pages built release commit `fb90d92`; the public form returned HTTP 200.
- Live desktop and 375 × 812 mobile layouts were inspected.
- Required-field, intercepted success, failure, structured-payload, and honeypot paths passed
  without creating a production test row.
- The live homepage link resolves to the form.
- Canonical, Open Graph, Twitter, favicon, and social-image metadata are present; asset and
  official source links return HTTP 200.
- Facebook Sharing Debugger fetched the page and rendered the expected title, description,
  canonical URL, and share image. Its only warning was the optional `fb:app_id` property.
- Final Deep review passed with 0 Critical and 0 Important findings.
- Detailed evidence: `_reports/2026-09-15-candidate-question-form.md`.

## Other live surface

- The newsletter front door remains `https://ramarahub.ca/subscribe/` and still hands residents
  to the existing beehiiv publication.
- Pre-existing Buttondown forms were not changed.

## Continuation

**Recommended next move:** Share the candidate-question form link through the approved event
channels so residents can submit questions.

**What follows:** Review tagged questions, combine duplicates without changing meaning, and
prepare a neutral question list for the candidates.

**Alternatives:** Add the event date/location to the page only after a stable public source URL
is available.

**Decision:** No Russell decision needed now. The October 31 production deletion remains a
future in-the-moment approval gate.
