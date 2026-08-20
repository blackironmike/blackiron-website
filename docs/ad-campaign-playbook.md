# Ad Campaign Playbook — Michael’s Runbook

How paid traffic moves from a Meta ad to a booked consult, and every setting
that has to be right for it to work.

Last updated when the three-step funnel shipped.

---

## 1. The flow

Three steps. Nobody sees a calendar until we already have their details, so a
drop-out at the calendar is still a lead we can call.

```
Meta ad  ->  capture page  ->  landing page + calendar  ->  thank you
             (name/phone/     (the pitch, then book)       (confirmed
              email)                                        + map)
```

The capture page exists so a person who bails at step three is already in GHL,
with a name and a number a coach can call. That is the whole reason for the
extra step. Follow-up is by hand, not automated.

---

## 2. The pages

Two campaigns, each with its own capture page and its own landing page. The
landing pages are unisex; the ad creative does the men/women split.

| Campaign | Capture page (ads point here) | Landing page (form redirects here) |
|----------|-------------------------------|------------------------------------|
| Laser (back to school) | `/start-back-to-school` | `/back-to-school` |
| Shotgun (routine) | `/start-routine` | `/routine` |

Both landing pages end at `/thank-you`, which the calendar redirects to.

Full URLs, which is what goes in the ad:

- `https://www.blackironathletics.com/start-back-to-school`
- `https://www.blackironathletics.com/start-routine`

**Never point an ad at `/back-to-school` or `/routine` directly.** Those are
step two. Traffic landing there skips the capture and we lose the drop-outs.

---

## 3. Creative to capture page

Eight files, four concepts, two placements each.

| Creative | Points at |
|----------|-----------|
| `laser-women-feed` · `laser-women-story` | `/start-back-to-school` |
| `laser-men-feed` · `laser-men-story` | `/start-back-to-school` |
| `shotgun-women-feed` · `shotgun-women-story` | `/start-routine` |
| `shotgun-men-feed` · `shotgun-men-story` | `/start-routine` |

Men and women split at the ad, not the page and not the ad set. Gender is no
longer an audience control under Advantage+ audience, which is mandatory on the
Leads objective, so splitting ad sets by gender buys a separation Meta is free to
ignore while quartering the budget each ad set needs to leave the learning phase.
Meta reports per ad, so the read survives.

The feed and story files for one concept are two placements of the same ad, not
two ads. They go in together via placement asset customization. Sizes are
1440x1800 and 1440x2560, and the 9:16 files are built inside the Reels safe zone
(14% top, 35% bottom, 6% sides), which is stricter than the Stories one and so
covers both.

---

## 4. GHL settings that have to be right

One form per campaign, so each can redirect to its own landing page. A single
shared form could only point at one of them, which would send routine traffic
to the back-to-school pitch.

| Capture page | Form | Form id |
|--------------|------|---------|
| `/start-back-to-school` | Lead Capture - Back to School | `9bTVJ7mcDsr29X0mCJbz` |
| `/start-routine` | Lead Capture - Routine | `sKw4RYzEQvvWqnulR49N` |

**On each form, in Settings:**

| Form | Redirect URL | Pass form data |
|------|--------------|----------------|
| Lead Capture - Back to School | `https://www.blackironathletics.com/back-to-school?s=2&n={{contact.first_name}}` | **on** |
| Lead Capture - Routine | `https://www.blackironathletics.com/routine?s=2&n={{contact.first_name}}` | **on** |

**The `?s=2` is not decoration and it is not optional.** It is the only thing
that tells a landing page the visitor came through the form. Two things run off
it, and both fail silently without it:

- The warm bar, which turns the cold pitch into "Got it, we have your details."
- The `Lead` pixel event, which is what the ad sets optimise against.

Drop `?s=2` from the redirect and the page still loads, still looks right, and
reports no leads at all. Nothing errors. That is what makes it worth checking
first.

`&n={{contact.first_name}}` is the optional half. With it the bar greets them by
name, without it the greeting stays generic. The name is filtered to letters
before it is written, and written as text rather than markup, so a junk value
cannot do anything but look odd.

The form id appears in four places in each capture page: `src`, `id`,
`data-layout-iframe-id` and `data-form-id`. Change all four or the embed script
will not find the frame it is meant to resize.

Pass-through is not optional. If the calendar asks for name, phone and email a
second time, two steps convert worse than one did and the whole exercise is a
loss. Test it before spending money.

**On both forms, in Styles → Colors & Background:** background `#101010FF`. See
`ghl-update-guide.md` section 6 for why.

---

## 5. Pixel events

One event per step, so Meta has something plentiful to optimise against while
we still measure the thing that pays rent.

| Page | Event | Fired by |
|------|-------|----------|
| Every page with the pixel | `PageView` | the base snippet |
| Capture page | `ViewContent` | `META_VIEWCONTENT_PATHS` |
| Landing page, on warm arrival (`?s=2`) | `Lead` | inline, guarded |
| Landing page, calendar 40% in view | `CalendarView` (custom) | inline |
| Landing page, calendar interaction | `InitiateCheckout` | inline |
| Any click on a `book.blackironathletics.com` link | `InitiateCheckout` | injected handler |
| Any click on a `tel:` link | `PhoneClick` (custom) | inline |
| `/thank-you` | `Schedule` | inline |

`Schedule` fires in exactly one place. It used to fire on the landing pages too,
via the calendar's postMessage, which double-counted every booking that then
landed on `/thank-you`. `/thank-you` is the better of the two signals because it
also frame-busts to top, so it fires whether the calendar redirects the iframe or
the whole window.

Both the pixel itself and `ViewContent` are build-time injections from Vercel
environment variables, so **changing either does nothing until a redeploy runs**:

- `META_PIXEL_ID` — the pixel ID. If it is unset, `inject-pixel.js` exits cleanly
  and no pixel is injected anywhere. Currently `791983533472044`.
- `META_VIEWCONTENT_PATHS` — must be exactly `/start-back-to-school,/start-routine`.
  The check is an exact match against `window.location.pathname`, and `vercel.json`
  sets `cleanUrls`, so a `.html` suffix or a trailing slash means it silently never
  fires.

`Lead` fires on arrival at the landing page rather than on form submit, because
the form is a cross-origin iframe and its submit cannot be hooked directly.
Arriving at step two means the form was submitted, so it is the same signal one
moment later.

Two details keep that number honest, and both matter more than they look:

- **It fires only on `?s=2`,** never on a bare landing page load. Someone who
  reaches `/routine` from a bookmark or a shared link did not fill in anything,
  and counting them would mean paying Meta to find more people who do not
  convert.
- **It fires once per campaign per browser,** guarded in `localStorage`. Any
  link a coach sends carries `?s=2`, so without the guard one lead who opens it
  twice reports as two leads.

`/thank-you` fires `Schedule` only. It used to fire `Lead` as well, back when
nothing else did. Now that the landing page fires it, thank-you firing it too
would count the same person twice, once for arriving and once for booking.

**Optimise the ad sets for `Lead`, not `Schedule`.** An ad set needs roughly 50
conversions a week to leave the learning phase. Bookings will not hit that at a
sane budget. Leads will.

---

## 6. UTMs

UTMs land in `sessionStorage` on arrival and ride onto any booking link. They do
**not** currently reach the GHL contact: the capture form is a cross-origin iframe
embedded with `src=`, and the tagging in `inject-pixel.js` only rewrites iframes
that use `data-src` (the lazy-loaded calendar). Whether GHL's own embed script
picks up parent-page parameters is external to this repo and untested — the
pre-launch test submission answers it.

Use these four on every ad URL:

```
?utm_source=meta&utm_medium=paid&utm_campaign=laser-bts&utm_content=women-feed
```

Keep `utm_campaign` to the campaign (`laser-bts`, `shotgun-routine`) and
`utm_content` to the creative (`women-feed`, `men-story`). That is what makes
the GHL contact list sortable by which ad actually worked.

---

## 7. Before you spend money

- [ ] Redirect set on BOTH forms, each pointing at its own landing page
- [ ] Pass form data to the redirect is **on**, on both forms
- [ ] Walk one lead through EACH campaign: capture, submit, confirm the calendar
      is **prefilled**, book, land on `/thank-you`
- [ ] The test contact appears in GHL with its UTM fields populated
- [ ] Ads point at `/start-*`, never at the landing pages directly
- [ ] Ad sets optimise for `Lead`

The prefill check is the one people skip. Do it.

---

## 8. Editing the pages

The two landing pages are generated, not hand-written:

```
python3 tools/build-landing.py
```

Copy lives in `tools/landing-copy.json`, one deck per page. `laser-1` builds
`back-to-school.html`, `shotgun-2` builds `routine.html`; the other two decks
build as `lp-*.html` drafts and are gitignored. Editing the HTML directly works
until somebody regenerates, and then it is gone. Edit the JSON.

The capture pages are hand-written and stand alone: `start-back-to-school.html`
and `start-routine.html`.

Both landing pages follow the five paragraph order — situation, mission,
execution, then the consult, the cost of waiting, and command. That structure
is the point. Cut words inside it rather than removing a beat.
