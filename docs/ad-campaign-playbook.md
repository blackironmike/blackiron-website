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

The capture page exists so a person who bails at step three is already in GHL
and already in a nurture campaign. That is the whole reason for the extra step.

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

Men and women split at the ad, not the page. Keep the ad sets separate so the
reporting separates itself, and so a losing audience can be turned off without
touching the winner.

---

## 4. GHL settings that have to be right

One form per campaign, so each can redirect to its own landing page. A single
shared form could only point at one of them, which would send routine traffic
to the back-to-school pitch.

| Capture page | Form | Form id |
|--------------|------|---------|
| `/start-back-to-school` | Lead Capture - Ads | `9bTVJ7mcDsr29X0mCJbz` |
| `/start-routine` | Lead Capture - Routine | `sKw4RYzEQvvWqnulR49N` |

**On each form, in Settings:**

| Form | Redirect URL | Pass form data |
|------|--------------|----------------|
| Lead Capture - Ads | `https://www.blackironathletics.com/back-to-school` | **on** |
| Lead Capture - Routine | `https://www.blackironathletics.com/routine` | **on** |

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

| Page | Event |
|------|-------|
| Capture page | `ViewContent` |
| Landing page, on arrival | `Lead` |
| `/thank-you` | `Schedule` |

`Lead` fires on arrival at the landing page rather than on form submit, because
the form is a cross-origin iframe and its submit cannot be hooked directly.
Arriving at step two means the form was submitted, so it is the same signal one
moment later.

**Optimise the ad sets for `Lead`, not `Schedule`.** An ad set needs roughly 50
conversions a week to leave the learning phase. Bookings will not hit that at a
sane budget. Leads will.

---

## 6. UTMs

The capture pages carry hidden UTM fields, so whatever is on the ad URL is
captured with the contact in GHL.

Use the standard five on every ad URL:

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
- [ ] The nurture campaign fired for that contact
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
