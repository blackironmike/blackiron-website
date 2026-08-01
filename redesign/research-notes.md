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

## Pricing decision (2026-08-01, Michael's call)

Pricing is PUBLIC on the prototypes, premium-transparent, no apologies — the
THIS Gym / Third Space lane. Rationale: hide-pricing is a founder-phase tactic
(Two-Brain doctrine — hidden prices maximize conversations, but those conversations
are mostly about price); an established premium gym posts prices to pre-qualify,
so fewer, better consults that actually show. Also the Steve test: his fears are
wasting time and money, and hidden pricing reads as a sales trap.

Published numbers (from Michael):

| Plan | Price |
|------|-------|
| Standard (3 classes/week) | $200/mo |
| Unlimited + Open Gym (most popular) | $240/mo |
| Open Gym Only | $50/mo |
| Personal Training | $120–150/hour |
| Day pass | $30, credited toward first month |
| Military & first responder | special pricing, ask |

No initiation fee is shown (none was specified). The consult + Foundations week
stays the only path to joining — the pricing page ends in the consult CTA.

### Go-live checklist for transparent pricing (NOT done in this commit — prototypes only)

1. `ghl-chatbot-knowledge-base.md` must change in the SAME commit that puts prices
   on the live site (handbook rule), then Michael re-uploads it in GHL
   (AI Agents → Knowledge Base). Entries that currently deflect:
   "How much does a membership cost?" (~line 91) and "How much do gyms in Frisco
   cost?" (~line 335). Draft replacement wording:
   - *How much does a membership cost?* — "Standard is $200 a month (3 classes a
     week). Unlimited plus open gym is $240 a month. Open gym only is $50 a month.
     Personal training runs $120–150 an hour. Every membership starts with a free
     consultation and the Foundations week. Want to try first? A $30 day pass covers
     any class, credited toward your first month if you join:
     https://www.blackironathletics.com/book"
   - *How much do gyms in Frisco cost?* — keep the market breakdown and blog link,
     then state our own numbers plainly instead of "personalized by plan."
2. Update the gym-membership-cost-frisco-tx blog post to include our numbers
   (it currently prices the whole market except us — naming ours is the trust play
   and strengthens the page-one asset).
3. Update FAQ page + getting-started membership section + schema/FAQPage JSON-LD
   to match, and the landing/step1 funnel pages if they mention pricing.
4. Expect the consult count to dip slightly while show quality rises — that's the
   filter working. Watch consults booked, show rate, and close rate for 60 days.

## Status

Prototypes only. Michael picks a direction (or a mix); implementation of the real pages
happens after that decision. No existing page, image, or config file was modified.
