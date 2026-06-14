# Task 4 (revised): Build the /start paid-traffic landing page

**Date:** June 11, 2026
**Replaces:** all sessionStorage / history.replaceState / iframe-src-injection work for UTM persistence. Strip that code — it's obsolete. We're removing the wander problem instead of surviving it.

## Why this exists
Paid ad traffic should land on a single-decision page, not the homepage. UTMs land on this page's URL and the form loads on the same page with no navigation, so GHL's native fetch-query-params reads them directly — the mechanism that passed our first diagnostic. No replay logic needed. The homepage Book-button flow stays as-is for organic/direct visitors.

## Route
`/start` (new). Homepage and its Book modal flow remain unchanged.

## Design — brand locked
- Background: Iron Black `#0A0A0A`
- Accent: Forge Yellow `#FFD300` (form submit button, key accents)
- Text: white headline, Bone `#F1ECE3` body
- Logo: white anvil + BLACK IRON / ATHLETICS wordmark, top, centered, **not linked** (no click-out)
- Fonts: Montserrat Black display / Arial fallback, matching the rest of the site
- No top nav, no menu, no outbound links except the legal footer. Working back button stays (don't trap; just don't distract).
- Mobile-first: most paid traffic is in the Facebook in-app browser. Headline must not wrap ugly; form fully usable thumb-only.

## Copy (use as-is)

**Eyebrow:** VETERAN-OWNED · FRISCO, TX · EST. 2013

**Subhead:** You just haven't been trained properly yet. Expert coaching, programmed strength and conditioning, and a community that won't let you quit.

**Above the form:** Book your free consultation. 20 minutes, no pressure, no sales pitch — just a plan for where you want to go.

**Form:** the existing Lead Capture form (with the four hidden UTM fields already added). Embedded directly on /start.

**Below form (small, Bone):** You'll meet with a coach, not a salesperson.

**Footer (muted #6B6B6B, centered):** BLACK IRON ATHLETICS · EST. 2013 · FRISCO, TX — plus Privacy Policy and Terms links (the only outbound links allowed).

**Forge Yellow bar** at the very bottom edge, flush, like the email template.

## Tracking
- Meta Pixel already site-wide (env `META_PIXEL_ID`). Confirm it loads on /start.
- Add `/start` to the config-driven **ViewContent** path list (the list you built in Task 3) so a /start visit fires ViewContent — this is our primary paid landing, it's the strongest mid-funnel signal we have.
- InitiateCheckout: not needed here (no modal — form is inline). Lead fires from the form on submit as already configured.
- Hidden UTM fields on the form: already done. No parent-page replay needed since there's no navigation.

## Tests (all must pass before merge)
1. `/start?utm_source=fbtest&utm_medium=paid&utm_campaign=june_test&utm_content=start_v1` → submit fresh number → all four UTM fields populate on the contact.
2. Plain `/start` (no UTMs) → form loads and submits clean; UTM fields blank, no errors.
3. ViewContent fires on /start load (check Test Events with the Test Event Code).
4. Mobile render check in a narrow viewport / actual phone: headline, form, button all clean and tappable.

Screenshots of the test-1 contact (four fields populated) and the Test Events view to Mike. That closes Task 4.

## Note for later (don't build yet)
This page is the template for Phase 4. Each ad campaign may get its own landing variant; the config-driven ViewContent list makes tagging them a one-line change. Keep /start clean and componentized so variants are cheap.
