# Website redesign — research notes and prototype guide

Prepared August 1, 2026. Full visual report (the ten sites, comparison, three proposals):
shared separately as a Claude artifact. This folder holds the three clickable homepage
prototypes. Nothing here is linked from the live site, and every page carries
`noindex,nofollow`.

## What's in this folder

| File | What it is |
|------|------------|
| `index.html` | Review hub linking the three directions |
| `direction-1.html` | "Main Street" — the locked rebrand palette (Iron `#1A1D21` / Forge `#F5C518` / Bone `#F1ECE3` / Smoked Oak `#B8895A`), premium editorial, alternating dark and light sections |
| `direction-2.html` | "Forged Bold" — current black + `#FFD202` yellow, disciplined to ~12 yellow moments per page, huge type, conversion-machine architecture |
| `direction-3.html` | "Iron & Ember" — black + yellow plus a new highlight set (copper `#C97B4A` for coaching/nutrition, parchment `#F4F1EA` for light sections), two-lane local + online architecture |

All three share the same skeleton (hero, proof strip, 3-step plan, programs, three levels,
the new building, the 23 hours, coaches, member proof, FAQ, visit, final CTA) so the
comparison is purely about visual language. All copy follows the handbook: mission line
verbatim, no banned words, no emojis, curly punctuation, real member quotes only
(Ashley Kim, Marcus), real photography from `/images/`, no invented offers. The only
priced offer shown is the existing $30 day pass credited toward the first month.

Review on the Vercel preview for this branch: `/redesign/`. Check phones first.

## The ten sites studied (verified live via 2026 search index)

1. **Phive** (phive.pt) — Awwwards Site of the Day; timelapse heroes, no public pricing, one "Schedule a Visit" CTA
2. **Kinective** (kinective.com, El Paso TX) — Awwwards Honorable Mention; tour booked like a class
3. **Skulpt Fitness** (skulptfitness.nl) — single-room indie with an award; radical anti-complexity offer
4. **Third Space** (thirdspace.london) — adult premium voice; location pages written like hotel pages
5. **DEUCE Gym** (deucegym.com) — daily essays for a decade; mandatory free one-hour coach intro
6. **MADabolic** (madabolic.com) — anti-HIIT argument; productized method with named intervals
7. **Solace New York** (solacenewyork.com) — HYROX-first positioning; above-fold booking form
8. **TRAIN Manchester** (trainmanchester.co.uk) — Men's Health badge at the CTA; free intro funnel
9. **Unleash'd Strength** (unleashdstrength.com) — Two-Brain case study: ~200 leads/60 consults a month; 3-day booking window
10. **Mayhem Nation** (mayhemnation.com) — local gym inside a global brand hub; B2B programming revenue

Benchmarks noted but kept off the list: Equinox (dual-CTA readiness split, hidden pricing)
and Barry's (the /first-timers page pattern).

## The patterns the proposals are built on

- One position argued site-wide beats a menu of services.
- The universal high-converting funnel is a booked free conversation with a coach
  (Two-Brain: ~94% close once seated; median gym books 7/month, leaders 30–91).
- Speed to lead is the biggest lever (SMS within a minute; 3-day booking windows kill ghosting).
- Proof belongs beside the CTA (5.0 · 68 reviews, veteran-owned, est. 2013).
- Local is won with GBP activity, review velocity, and city-plus-program pages.
- The online lane (Mayhem/PRVN pattern) is already ours: FuelPath — it's just not visible
  on blackironathletics.com yet.

## Current-site facts the redesign must not break

- Page-one ranking for "best gym Frisco TX": keep URLs, title formula, and the blog; 301 anything that moves.
- GHL wiring (lead modal `vw0hMdDkTCL6K5N3i7vF`, booking calendar, chat widget, nurture emails) carries over as-is.
- Known issues worth fixing regardless of direction: fake-scarcity banner on book.html,
  schema says 50 reviews while pages say 68, schema claims 24/7 hours, missing sticky
  mobile CTA (referenced in JS, absent from pages), no GA4, macro-calculator lead magnet
  redirects off-site with no capture.

## Status

Prototypes only. Michael picks a direction (or a mix); implementation of the real pages
happens after that decision. No existing page, image, or config file was modified.
