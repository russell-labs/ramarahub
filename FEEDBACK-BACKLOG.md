# Ramara Hub — research / sourcing backlog

Open items where a resident question could **not** be fully answered from a township,
court, or established-news source. The Hub's standard is "every claim sourced, never
guess," so these stay here as a research queue rather than becoming KB entries until a
qualifying source is found. (See `data/kb.json` for what shipped.)

Last reviewed: 2026-06-13.

---

## Partially answered (KB entry shipped, but a gap remains)

### Sewer amalgamation history — `ww-sewer-amalgamation`
Recurring question (asked 5+ times): "When did Ramara combine the Brechin/Lagoon City
sewer system with Bayshore, under what bylaw, and why did that trigger the EA and
effluent hauling?"

**Sourced and shipped:** Ramara runs two *separate* wastewater treatment facilities
(Brechin/Lagoon City and Bayshore Village — `ww-who-pays`, sewer-systems page); bills
"one water system and one wastewater system" for rate-setting (utility-billing page,
verified); the EA work and effluent hauling trace to Bayshore's sprayfields reaching
end of life, leading to the $24.1M tile-bed project (verified: township news post +
existing `ww-bayshore`).

**Still NOT sourceable — do not publish without a qualifying source:**
- A specific bylaw or date that "amalgamated" the two sewer systems. None found in the
  township record; the available evidence actually contradicts the "merged into one
  system" framing. If a resident can point to a council report or bylaw number, verify
  and add it.
- Bayshore Class EA specifics (reported as original 2017, update 2025, notice of study
  completion). The township EA study page now 301-redirects to a govstack mirror that
  returns 404, so these dates could not be verified from a live page.
- Effluent-hauling specifics (e.g. volume hauled, annual cost, the ~$1.5M loan and
  hauling-contract figures). These appear only in OrillaMatters coverage, which returns
  HTTP 403 to the fetcher; the *fact* of hauling and the $1.5M loan are already in
  `ww-bayshore`, but the precise numbers were not independently verifiable here.
- The 2004 Sanitary Sewer Master Servicing Plan document itself (a resident asked for the
  actual document) — not located online.

### Public beach in Lagoon City — `pk-lagoon-beach`
**Sourced and shipped:** Lagoon City Park Beach is a public township beach (beaches page);
the two North/South beaches are private/residents-only (lagoon-city-beaches-and-footbridges
page).

**Still NOT sourceable:** the exact **street address** of Lagoon City Park Beach. The
township publishes only a map pin, not an address. (Real-estate/community listings place
it on Laguna Parkway, but that is not a township/court/news source, so it was not stated
as fact.)

---

## Not yet started (from the 2026-06-13 fallback-questions review, section B)

These were asked and hit the honest "I don't have that" fallback. Add only when sourced:
- **Turtle Path repaving timeline** (asked 3+ times) — specific-street roads question.
- **Open litigation / lawsuit count** against the township (asked twice) — answerable
  from public records if someone chooses to track it.
- **2004 Sanitary Sewer Master Servicing Plan** — the actual document (see above).
- **Map of new proposed roads near Atherley.**
- **Money specifics:** "How much has been spent on Bayshore wastewater problems?" and the
  exact current Lagoon City levy amount — tie into the Money page.

---

## Product / UX (not sourcing)

- **Standalone newsletter signup link/page.** Signup currently lives only in a section near
  the bottom of the homepage ("Get the free weekly update by email" / "Sign me up"). A
  resident asked where to sign up and couldn't find it. Add a dedicated link (e.g. /newsletter)
  or a nav/footer entry so it's shareable and easy to point people to. (Raised 2026-06-14 from
  a Facebook comment.)

---

## Known quality note

The keyword fallback matcher (used when the AI engine is offline) was hardened on
2026-06-13: "Can I rent out my home?" now resolves to the STR rules card (was the
Connect-and-Protect grant card), and `an-limit` keywords were tightened so dog-limit
phrasings hit reliably. The "tree removal → septic card" mismatch noted in the review is
still open — there is no tree/clearing entry yet, so a tree-removal question will still
fall back. Add a sourced tree/site-alteration entry when the bylaw basis is confirmed.
