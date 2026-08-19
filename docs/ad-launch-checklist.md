# Meta Ads Launch — Exact Settings

Everything needed to get the back-to-school and routine campaigns live, in the
order you click it. No nurture, no automation: every lead is worked by hand.

---

## What that means for the funnel

Nothing changes structurally. The capture page still earns its place, because a
person who fills it and does not book is still a name and a phone number sitting
in GHL for a coach to call. Automated or human, the follow-up needs the lead
captured first.

Two things do change:

- `docs/nurture-sequence.md` is on the shelf, not deleted. If you ever want it.
- The wider SMS consent wording in that doc is no longer urgent. The existing
  transactional consent covers appointment messages, which is all you are
  sending by hand.

---

## Structure

Two campaigns, four ad sets, eight ads.

```
Campaign: BIA — Back to School (laser)
  Ad set: Women 30-50 Frisco      -> laser-women-feed, laser-women-story
  Ad set: Men 30-50 Frisco        -> laser-men-feed,   laser-men-story
  All ads -> blackironathletics.com/start-back-to-school

Campaign: BIA — Routine (shotgun)
  Ad set: Women 30-55 Frisco      -> shotgun-women-feed, shotgun-women-story
  Ad set: Men 30-55 Frisco        -> shotgun-men-feed,   shotgun-men-story
  All ads -> blackironathletics.com/start-routine
```

Men and women split at the ad set so a losing audience can be switched off
without touching the winner. The landing pages are unisex on purpose.

---

## Campaign level

| Setting | Value |
|---------|-------|
| Objective | **Leads** |
| Conversion location | **Website** (not Instant Forms) |
| Campaign budget optimisation | **Off**. Budget at the ad set, so one audience cannot starve the other |
| Special ad category | **None**. A gym is not credit, employment, housing or social issues |
| A/B test | Off |

Do not use Instant Forms. The whole funnel depends on people landing on our
pages where the pixel fires and the calendar lives.

---

## Ad set level

| Setting | Value |
|---------|-------|
| Conversion event | **Lead** |
| Pixel | The Black Iron pixel already on the site |
| Budget | Daily, at the ad set. See the budget note below |
| Schedule | Start today, no end date |
| Location | **Frisco, TX + 10 miles.** Set to *People living in this location* |
| Age | 30-50 back to school, 30-55 routine |
| Gender | Set per ad set |
| Detailed targeting | **Leave empty** |
| Advantage+ audience | On |
| Placements | **Advantage+ placements** (automatic) |

**Optimise for `Lead`, not `Schedule`.** An ad set needs roughly 50 conversions
a week to leave the learning phase. Bookings will not hit that at a sane budget.
Leads will. Schedule is still tracked, it is just not what you optimise on.

**Leave detailed targeting empty.** Interest stacking on a 10-mile radius makes
the audience too small to optimise. Let the algorithm read the pixel.

**Location must be "People living in this location."** The default includes
people recently in the area, which on a Frisco radius means visitors.

---

## Budget

Meta needs about 50 `Lead` events per ad set per week to exit learning. Four ad
sets is a lot of learning to buy at once.

**Recommended start:** $25 a day per ad set, four ad sets, $100 a day total.

If that is more than you want to commit before it is proven, run **two ad sets
instead of four**: back-to-school women and routine men, $25 a day each, $50 a
day total. Add the other two once you have seen a cost per lead you like.

Do not run four ad sets at $10 a day. Nothing gets enough data and every one
of them stays in learning.

---

## Ad level, per ad

| Setting | Value |
|---------|-------|
| Format | Single image |
| Creative | The matching file from `images/ads/2026-08-back-to-school/` |
| Website URL | See the URL block below, exactly |
| Call to action | **Book Now** |
| Multi-advertiser ads | Off |
| Advantage+ creative enhancements | **Off**. It crops and filters images, which breaks the outline type and the Forge |

Turn creative enhancements off on every ad. Meta will otherwise add a border,
shift the crop, or bump the contrast, and the headline type is the whole design.

---

## The URLs, with tracking

Paste the base URL in **Website URL**, and the tracking string in the
**URL parameters** field underneath. Do not paste them as one string.

**Back to school ad set, women:**
```
https://www.blackironathletics.com/start-back-to-school
utm_source=meta&utm_medium=paid&utm_campaign=laser-bts&utm_content=women-{{ad.name}}
```

**Back to school ad set, men:**
```
https://www.blackironathletics.com/start-back-to-school
utm_source=meta&utm_medium=paid&utm_campaign=laser-bts&utm_content=men-{{ad.name}}
```

**Routine ad set, women:**
```
https://www.blackironathletics.com/start-routine
utm_source=meta&utm_medium=paid&utm_campaign=shotgun-routine&utm_content=women-{{ad.name}}
```

**Routine ad set, men:**
```
https://www.blackironathletics.com/start-routine
utm_source=meta&utm_medium=paid&utm_campaign=shotgun-routine&utm_content=men-{{ad.name}}
```

`{{ad.name}}` is a Meta dynamic parameter and fills itself in, so feed and story
separate in reporting without you typing anything.

**Never point an ad at `/back-to-school` or `/routine`.** Those are step two.

---

## Before you turn anything on

- [ ] Both GHL redirects set, pass form data **on** (done)
- [ ] Walk **each** campaign on a phone: capture page, submit, confirm the
      calendar arrives **prefilled**, book, land on `/thank-you`
- [ ] Pixel shows `ViewContent` on the capture page and `Lead` on the landing
      page, in Meta Events Manager Test Events
- [ ] Creative enhancements off on all eight ads
- [ ] URLs point at `/start-*`, never the landing pages
- [ ] Ad sets optimise for `Lead`

The prefill check is the one people skip. If the calendar asks for details a
second time, two steps convert worse than one and the funnel is worse than what
you had before.

---

## First week

Leave it alone for the first three to four days. Editing an ad set resets
learning, so early tinkering is the most expensive thing you can do.

What to watch:

- **Cost per lead.** For a local gym consult, anywhere from $8 to $25 is a
  normal range. You will know your own number after a week.
- **Lead to booking rate.** This is the number the funnel was built for. If
  leads are cheap but nobody books, the problem is the landing page or the
  calendar, not the ads.
- **Frequency.** Above 2.5 on a 10-mile radius means you are showing the same
  people the same ad repeatedly. Refresh creative rather than raising budget.

Switch off the weakest ad set before you raise budget on the strongest. Adding
money to a bad ad set is how a $50 a day test becomes a $200 a day one that does
not work either.
