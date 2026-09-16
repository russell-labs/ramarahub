# Candidate question form release evidence

Date: 2026-09-15
State: live and verified

## Outcome

- New neutral form at `/candidate-questions/`.
- Required question; optional name, email, and phone.
- Homepage entry point.
- Existing private `action_ideas` intake reused, with structured JSON in `idea` and email in the existing email field. No production schema change.
- Collection-point privacy notice names the controller, purpose, non-sharing boundary, October 31, 2026 deletion deadline, early-deletion route, and provider metadata caveat.
- Site-wide privacy copy now distinguishes the anonymous homepage search from optional contact-detail forms.
- Unsourced event date/location copy was deliberately excluded. The page links the Township's public certified-candidate list.

## Verification

- Local desktop and 375 × 812 mobile browser render inspected.
- Accessibility tree exposed the required question field, optional contact fields, labelled Submit button, privacy link, source link, and status region.
- Required-field browser validation moved focus to the empty question field and blocked submission.
- Success flow exercised with Chrome request interception. No production row was created.
- Captured payload decoded as structured JSON and preserved a question containing `Name:` without confusing it with the contact field.
- Failure state displayed the retry/email fallback.
- The 500-character question, 100-character name, and 30-character phone limits keep worst-case escaped JSON under the existing 4,000-character intake boundary without truncating structured records.
- Supabase CORS preflight for the existing `action_ideas` endpoint returned HTTP 200 and allowed the required headers/method.
- Inline JavaScript passed `node --check`; `git diff --check` passed.
- Independent Deep review initially found source, privacy, spam, and structured-data issues.
  All were remediated. A fresh final review and targeted boundary recheck passed with
  0 Critical and 0 Important findings.

## Publication proof

- Release commit `fb90d92` reached `origin/main` and GitHub Pages reported `built`.
- `https://ramarahub.ca/candidate-questions/` returned HTTP 200 and showed the expected live
  form, optional fields, privacy notice, source, and metadata.
- The live homepage displayed its candidate-question link with destination
  `candidate-questions/`.
- Facebook Sharing Debugger fetched the canonical URL and rendered the expected title,
  description, canonical URL, and `https://ramarahub.ca/assets/og-image.png` preview.
- Facebook's only warning was a missing optional `fb:app_id`; the share preview itself rendered.
