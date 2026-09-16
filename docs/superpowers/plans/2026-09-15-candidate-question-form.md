# Candidate question form

Goal: publish a neutral, mobile-friendly form at `ramarahub.ca/candidate-questions/` that accepts one required question plus optional name, email, and phone number, and reliably stores each submission in the existing private Ramara Hub intake.

## Scope

- Add one public form page using the existing Ramara Hub design and static-site architecture.
- Add one prominent homepage link.
- Reuse the existing private `action_ideas` intake to avoid a production schema change.
- Store the question and optional contact details in a readable labelled record; keep email in the existing email field as well.
- State a short neutral moderation/privacy notice and link the official certified-candidate source.

## Excluded

- Candidate promotion, endorsements, candidate biographies, or issue framing.
- A new database table, automation, mailing list, or public display of submissions.
- Promising that every submitted question will be asked.
- Publishing event logistics without a public source URL.

## Verification

- Validate HTML structure, required/optional fields, metadata, canonical URL, keyboard labels, error and success paths.
- Exercise submission logic locally with a mocked network response; do not create a production test record containing personal data.
- Inspect desktop and mobile rendering.
- Run one focused independent Deep review of the final diff.
- After deployment, verify the live URL, metadata, form fields, and homepage link.
