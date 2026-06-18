# Ramara Hub — Style Guide

**System name:** *Civic editorial.* The dignity of a well-set public white paper crossed
with NYT / ProPublica longform readability, warmed for a rural township. Calm,
trustworthy, neutral, plain, warm, local. Not flashy, not partisan, not corporate-startup.

Everything below lives in **`assets/style.css`** (cache-busted as `?v=N`). One source of
truth — no one-off inline styles, no per-page `:root`.

---

## 1. Tokens (CSS custom properties)

Defined once in `:root`. **Never redefine these in a page-local `<style>`** — that was the
old pattern on `volunteer.html` / `comment-box.html` and it fragmented the system.

### Color — brand teal
| Token | Value | Use |
|---|---|---|
| `--teal-900` | `#0C3851` | Header & footer background, hero headline ink |
| `--teal-800` | `#0E3D59` | Nav hover, headings |
| `--teal-700` | `#14557B` | **Primary** — links, buttons, nav bar, focus |
| `--teal-600` | `#1C6592` | Hover borders |
| `--teal-100` | `#DCEAF2` | Tint |
| `--teal-50`  | `#EDF4F8` | Palest tint — chips, panels, input focus halo |

### Color — gold accent (precision only)
| Token | Value | Use |
|---|---|---|
| `--gold` | `#C8861A` | Keylines, rules, chart highlight, fills — **never body text** |
| `--gold-deep` | `#A96E12` | Gold button hover |
| `--gold-ink` | `#875610` | The **only** gold allowed on text (AA-safe ≈ 5.4:1) |
| `--gold-tint` | `#FBF3E2` | Soft gold panel (flags, "awaiting" pill) |

> **Gold is a scalpel, not a paintbrush.** It marks the active nav item, a brief-card top
> rule, the keybox tick, the pull-quote rule, the "Ramara" chart line. Do **not** bring back
> the old "gold left-border on every card."

### Color — warm neutrals (paper)
| Token | Value | Use |
|---|---|---|
| `--paper` (`--bg`) | `#FAF8F3` | Page background — warm off-white, never blue-white |
| `--paper-2` | `#F3EFE6` | Deeper warm panel |
| `--card` | `#FFFFFF` | Card "sheets" |
| `--ink` | `#1A2A33` | Body text (warm near-black) |
| `--ink-2` | `#354750` | Lede / secondary |
| `--muted` | `#586872` | Meta, captions (AA on paper) |
| `--rule` (`--line`) | `#E7E0D4` | Warm hairline |
| `--rule-2` | `#D8E0E6` | Cooler hairline inside teal-tinted areas |
| `--good` | `#2C6E49` | Phone numbers, "answered" status |

Back-compat aliases `--blue`, `--blue-dark`, `--blue-pale`, `--accent` map onto the teal/gold
scale so any older reference keeps working. **Keep them — do not delete.**

### Semantic text tokens + dark mode
Three tokens split teal-as-*text* from teal-as-*surface* so dark mode can flip them independently:
- `--ink-head` (primary heading text) · `--ink-head2` (secondary heading / teal-strong text) · `--link` (links + teal text).
- In **light** they resolve to `--teal-900 / --teal-800 / --teal-700`; the `@media (prefers-color-scheme: dark)` block re-points them to light values while the deep-teal *surfaces* (header, nav, footer, buttons) stay teal.

**Dark mode is shipped** and entirely token-driven: the dark block overrides `--paper/--card/--ink/--rule/--teal-50…` plus the three semantic tokens, so every page that rides the shared CSS adapts automatically. When you add a component, **reference tokens** (`var(--card)`, `var(--ink-head)`, `var(--link)`) — never raw hex for text/surfaces — and it gets dark mode for free. The handful of hardcoded light chips (status pills, `cl-tag.tag-fix`) carry explicit dark overrides in that block; follow that pattern for any new light-bg chip. Charts read `--muted`/`--rule` at runtime so axes + gridlines adapt too.

### Type
- `--sans` — system stack. **Body + all UI.** Fast, no download.
- `--serif` — **Source Serif 4** (`opsz 8..60`, weights 400/500/600, `display:swap`).
  Loaded via the Google Fonts `<link>`. **Scope: all display headings** — the home hero, every
  `h2.section` and interior-page `<h2>`, the `.page-hero` headline, and all brief headings,
  the keybox heading, brief-card titles, and pull quotes. **Not** UI labels, buttons, nav, or
  body copy (those stay `--sans`). The stack falls back to Georgia, so a page missing the
  `<link>` still renders serif headings — but add the link to every page for the real face.

Scale (root = 18px):
`--step--1 .83rem` · `--step-0 1rem` (body) · `--step-1 1.16rem` (lede) ·
`--step-2 1.4rem` (h3) · `--step-3 1.72rem` (h2) · `--step-4 2.15rem` (h1) · `--step-5 2.7rem` (hero).
Longform measure: **`--measure: 66ch`** (brief body column).

### Spacing · radii · shadows
- Spacing: `--s1`…`--s8` (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px).
- Radii: `--r-sm 6` · `--r 10` · `--r-lg 14` · `--r-pill 999`.
- Shadows: `--sh-1` (rest), `--sh-2` (raised), `--sh-3` (hover/lift). Warm, low-opacity.

---

## 2. Components

| Component | Class / selector | Notes |
|---|---|---|
| Header | `.site-header` | Teal-900, 3px gold keyline, wordmark with gold tab `::before` |
| Nav | `.site-nav` / `#siteNav` | Teal-700 bar; **active = gold underline**; hamburger `#menuBtn` under 720px |
| Hero + answer box | `.hero`, `.askbar`, `#chat` | The centerpiece: eyebrow + large headline + tactile ask field |
| Topic tiles | `.tiles` / `.tile` | White, hairline, hover lift + teal border |
| Brief cards | `.brief-cards` / `.brief-card` | Gold **top** rule, serif title, eyebrow tag |
| Trust panel | `.trust-panel` | Teal left keyline (`::before`), not a heavy border box |
| Article | `article.brief` | 720px sheet, 66ch text, serif headings, ruled `h2` |
| Keybox | `.keybox` | Teal-tint gradient, gold tick before heading |
| Tables | `.table-scroll > table` | Ruled (not filled) head, `tabular-nums`, subtle zebra |
| Pull quote | `.pullquote` | Serif, gold left rule |
| Charts | `.chartcard` / `.chartwrap` | See §3 |
| Flag / contested | `.flag` | Soft gold callout |
| Callouts | `.callout` + `.callout-gold` / `.callout-teal` | Reusable; replaces ad-hoc boxes |
| Forms | `form.civic-form` | Labels, inputs, `.req`, `.hint`, `.check`, submit — all themed |
| Page hero | `.page-hero` | Teal-gradient banner for interior pages (volunteer, comment-box) |
| Layout helpers | `.grid-2`, `.steplist` | 2-up grid; stepped "week / detail" list |
| News | `.news-feed` / `.news-item` | Own card markup (never reuses `.doc-row`) |
| Accordions | `.ask`, `.faq-item`, `.cl-row` | Teal headings, gold/teal focus rings |
| Status pills | `.status-pill .status-*` | awaiting=gold, answered=green, follow-up=teal, closed=gray |
| Footer | `.site-footer` | Teal-900, 3px gold keyline; newsletter `.footer-sub` |
| Buttons | `.cta-btn`, `.askbar button`, `.civic-form button` | Teal-700, hover teal-800 |

---

## 3. Chart.js theming

Match every chart to the palette. Set once per page (inline script, after Chart loads):

```js
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
Chart.defaults.font.size = 13;
Chart.defaults.color = '#586872';            // --muted
// grid lines: '#ECE6DA'  (warm faint)
```

Series palette:
- **Ramara / "this is us"** → `#C8861A` (gold), the heaviest line/bar.
- Comparators → `#14557B` (teal), `#586872` (gray), dashed/dotted to differentiate.
- Illustrative / low-confidence → `#CFC8BA` (warm faint), thin, `pointRadius:0`.

Always keep the `<canvas>` fallback text and `aria-label` (accessibility + no-JS).

---

## 4. Accessibility (WCAG 2.1 AA — non-negotiable)

- **Contrast:** body/headings clear AA on paper; gold text only at `--gold-ink`.
- **Focus:** every interactive element shows a visible ring (`:focus-visible` → gold/teal). Don't remove outlines.
- **Keyboard:** nav, hamburger (`#menuBtn`/`#siteNav`), and accordions operate from the keyboard.
- **Motion:** `prefers-reduced-motion` collapses transitions/animations — keep it.
- **Semantics:** real headings in order, `alt` text on images, `aria-label` on icon-only controls and charts.
- **Targets:** ≥ 44px touch targets on mobile (tiles, nav, buttons already meet this).

---

## 5. Do / Don't

**Do**
- Put all styling in `assets/style.css`; reuse tokens and components.
- Use `.callout-gold` / `.callout-teal` for highlighted notes.
- Reserve the serif for **display headings + pull quotes** (it's wired in the stylesheet); keep UI labels, buttons, nav, and body in the system sans.
- The home answer box has **tap-to-ask chips** (`.ask-chip[data-ask]`) and a **`#clearChat`** control — both handled by `app.js`'s `initChat`. Keep those IDs/attrs if you edit the hero.
- Bump `?v=N` on `assets/style.css` (and `app.js` if touched) on **every** page when you ship CSS.

**Don't**
- Redefine tokens in a page-local `<style>`, or hard-code hex that a token already covers.
- Use gold for text (except `--gold-ink`) or as a decorative left-border on cards.
- Rename or remove any `app.js` DOM hook (IDs/classes) — see `ROLLOUT.md`.
- Add gradients-for-decoration, emoji outside the existing civic set, or new accent colors.

---

## 6. Cache discipline

**Current versions:** `style.css?v=34`, `app.js?v=33`. When you change `style.css`, bump the query string
**everywhere it's referenced** (`?v=34` → `?v=35`). Same for `app.js` (it now carries the chat chips/clear feature).
A site-wide find-and-replace on `style.css?v=` / `app.js?v=` is the safe way.
