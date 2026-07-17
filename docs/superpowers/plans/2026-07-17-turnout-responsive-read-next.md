# Voter-turnout responsive layout and read-next path

**Goal:** The voter-turnout Issue Brief displays its four headline statistics as one balanced column on phones and a balanced two-by-two grid on larger screens, then offers one clearly labelled, accessible “Read next” link to the Sports Dome brief after the sources.

## Scope

- Replace the turnout page's auto-fitting headline-stat wrapper with the site's existing responsive two-column helper.
- Keep all four verified statistics and their wording unchanged.
- Add one neutral, full-width “Read next” card linking to `sports-dome.html` after the voter-turnout sources.
- Reuse existing Ramara Hub components and styles. Add no new CSS, JavaScript, dependency, tracking, or external service.

## Excluded

- Any edits to the Sports Dome brief itself.
- Site-wide recommendation logic, personalization, carousels, or automatic “most viewed” ranking.
- Changes to voter-turnout facts, methodology, sources, downloads, or social copy.
- Commit, push, deploy, or public publishing. Russell's election-adjacent review gate remains in place.

## Verification

- At 375 px, the four stats form one column with equal widths and no horizontal overflow.
- At 768, 1024, and 1280 px, the four stats form two columns and two rows with equal widths and no lone fourth card.
- The page contains exactly one “Read next” card, with a unique local link to `sports-dome.html`.
- The related card is keyboard-accessible and uses existing card focus/hover behaviour.
- All local links resolve, the page has one H1, and browser console checks show no page errors.
- A fresh independent reviewer returns 0 Critical / 0 Important and names the weakest remaining point.

## Final verification

- Browser checks at 375 px showed one 263 px-wide column with no horizontal overflow.
- Browser checks at 768, 1024, and 1280 px showed two equal 310 px-wide columns and two balanced rows, with no lone fourth card or horizontal overflow.
- The page contains exactly one Read next link. A browser click reached `briefs/sports-dome.html` successfully.
- The Read next card was visually checked at phone and desktop widths. Browser error and warning logs were empty.
- Deterministic HTML checks found one H1, four stat cards, no missing local links, and no candidate names added.
- The fresh independent reviewer passed the task with 0 Critical / 0 Important / 0 Minor. Its weakest-point note was that its own review was static; the separate browser evidence above covers that point.

Status: review-ready for Russell. Not committed, pushed, deployed, or published.
