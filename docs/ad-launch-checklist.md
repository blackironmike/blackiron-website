# Meta Ads Launch — Exact Settings

Everything needed to get the back-to-school and routine campaigns live, in the
order you click it. No nurture, no automation: every lead is worked by hand.

A presentable version of this document, with copy buttons on the URLs and the
ad copy, is published as an artifact. This file is the durable copy.

---

## The structure changed. Read this first.

The earlier plan said four ad sets, men and women split, $25 a day each. Two
findings say don't.

**Meta will not honour the gender split.** On the Leads objective the "switch to
original audience options" toggle is gone; Advantage+ audience is mandatory, and
under it only location, minimum age, language and custom-audience exclusions are
hard controls. Gender is a suggestion. You would be paying to maintain a split
Meta is free to ignore.

**Four ad sets cannot escape the learning phase.** An ad set needs roughly 50
optimisation events in the 7 days following its last significant edit. Four ad
sets at $25 a day is $175 a week each, so 50 leads means a $3.50 cost per lead.
No gym consult hits that. All four would sit in Learning limited indefinitely.

### Do this instead

**One campaign, one ad set, $100 a day, two ads.** Run back to school on its
own first: Frisco ISD went back last week and that window closes in a fortnight,
while routine is evergreen.

At $100 a day, 50 leads a week means a $14 cost per lead, which is a real number
for a local gym consult. It is the only structure here with a genuine chance of
leaving the learning phase.

The men and women read still happens; it moves from the ad set to the ad, where
Meta reports each creative separately anyway.

```
Campaign: BIA — Back to School
  Ad set: Frisco 10mi, 25+          $100/day
    Ad: women   -> laser-women-feed  + laser-women-story
    Ad: men     -> laser-men-feed    + laser-men-story
  Destination: blackironathletics.com/start-back-to-school
```

Launch routine the same way once back to school has a fortnight of data. If you
would rather run both from today, do it at $50 a day each and accept Learning
limited — Meta states plainly that this is not a penalty and the ads still
deliver, they just optimise less well and the cost per lead reads noisier.

---

## Before you open Ads Manager

Three of the four things this funnel needs are already live, verified against the
deployed site: the pixel loads and initialises (`791983533472044`), `ViewContent`
fires on both capture pages, and the creatives serve. The fourth is yours.

**The GHL redirect must carry `?s=2`.** The capture form is a cross-origin
iframe, so the page it sits on cannot see the submit. The landing page instead
fires `Lead` when someone arrives carrying `?s=2`, which only the form's redirect
adds. Drop it and the page still loads, still looks perfect, and reports zero
leads with no error.

| Form | Redirect URL |
|------|--------------|
| Lead Capture - Back to School | `https://www.blackironathletics.com/back-to-school?s=2&n={{contact.first_name}}` |
| Lead Capture - Routine | `https://www.blackironathletics.com/routine?s=2&n={{contact.first_name}}` |

Pass form data to the redirect: **on**, both forms. If the calendar asks for name,
phone and email a second time, two steps convert worse than one did.

---

## Campaign level

| Setting | Value |
|---------|-------|
| Buying type | Auction |
| Objective | **Leads** |
| Special ad category | **Leave empty** |
| Advantage campaign budget | Off |
| A/B test | Off |
| Campaign spending limit | Optional |

**Leads is a requirement, not a preference.** The standard `Lead` pixel event
only appears in the conversion-event dropdown under Leads and Engagement. Sales
does not offer it. Traffic has no conversion-event selector at all.

**Never declare a special ad category.** The categories are financial products,
employment, housing, and social issues or politics. A gym is none of them.
Declaring one forces a 15-mile minimum radius, locks age to 18-65+ and removes
gender: on a Frisco gym that sweeps in Plano, McKinney and half of north Dallas.
If automated review mis-flags an ad, use the **Categorize Your Ads** button in
that section rather than accepting the category.

---

## Ad set level

The order matters, because each field reveals the next.

| # | Setting | Value |
|---|---------|-------|
| 1 | Conversion location | **Website** |
| 2 | Dataset | `791983533472044` |
| 3 | Conversion event | **Lead** |
| 4 | Performance goal | **Maximize number of conversions** |
| 5 | Conversion count | All conversions |
| | Budget | $100 daily |
| | Schedule | Start today, no end date |
| | Location | Frisco, Texas + 10 mi |
| | Location inclusion | People living in this location |
| | Minimum age | 25 |
| | Gender | Leave alone |
| | Detailed targeting | **Empty** |
| | Placements | Advantage+ placements |
| | Attribution | 7-day click, 1-day view (the default) |

Notes on the ones that bite:

- **Not Instant forms**, and not the combined "Website and instant forms", which
  lets Meta divert people into its own form and away from your CRM.
- **Not "Maximize number of conversion leads"** — a different goal, Instant Forms
  only, and it needs a Conversions API feed.
- The pixel field is called **Dataset** now. Same object, same ID.
- **Location stays a hard control** under Advantage+ audience, so the radius
  holds. Type the city, click the dropdown on the chip, drag the slider (1-50 mi).
- **Gender is not an audience control.** Anything entered is a suggestion.
- **Detailed targeting is only a suggestion** on a lead goal now, and exclusions
  were removed entirely. Leave it empty.
- If **"People living in this location" is missing**, that is a reported effect of
  Advantage+ audience being mandatory on Leads. Not worth abandoning the objective
  over: the radius still holds. Check the estimated audience size looks like a
  Frisco number, not a metro one.

**Expect Learning limited.** Meta's rule is that the daily budget should be at
least ten times the cost of the optimisation event, so $100/day holds only at a
$10 cost per lead. A local gym consult more typically runs $15-30, putting you at
25-45 leads a week against the 50 the learning phase wants. Meta is explicit that
Learning limited is not a penalty. The fix is never more ad sets; it is
consolidating further or raising the budget.

---

## Ad level

Two ads, one per concept. Each ad carries **both** its images: the 4:5 for feed,
the 9:16 for stories and reels. One ad with two assets, not two ads.

| Setting | Value |
|---------|-------|
| Format | Single image |
| Call to action | **Book Now** |
| Multi-advertiser ads | Off |
| Advantage+ creative enhancements | **All off** |
| Website URL | `https://www.blackironathletics.com/start-back-to-school` |
| URL parameters | `utm_source=meta&utm_medium=paid&utm_campaign=laser-bts&utm_content={{ad.name}}` |

**To give feed and story different images in one ad:** in the Ad creative
section, Add media and upload, then hover the placement group you want and click
its edit control. Placement groups bundle by shared aspect ratio, so the 9:16
group is where the story file goes. Use Change media rather than letting Meta
crop the 4:5 file to fill it.

**Turn off every Advantage+ creative enhancement.** Meta says in its own words
that some are on by default. They adjust brightness and contrast, apply filters
that sharpen or add a vignette, show a cropped version instead of yours, add
templates, and — via text improvements — rewrite copy and stamp text onto the
image in their own typeface. The outline headline and the Forge yellow *are* the
design, and rewritten copy walks straight through the banned-words list. Check
again immediately before publishing and after any edit: they are widely reported
to switch themselves back on.

**Not dynamic or flexible creative.** Those report only in aggregate, which would
hide which concept won.

UTMs go in the **URL parameters** field, not appended to the URL. `{{ad.name}}`
is a Meta dynamic parameter and fills itself in, so name the ads `women` and
`men` and that is what lands in reporting.

### The copy

Meta's limits: 125 characters of primary text before truncation, 27 headline,
27 description. Both ads run the same copy; the creative is what differs.

**Back to school**

```
Primary      You spent all summer on everyone else. The kids are back in school, so take an hour back for you. Free twenty minute consult.
Headline     Take an hour back for you.
Description  Frisco. Veteran-owned.
```

**Routine** (destination `/start-routine`, `utm_campaign=shotgun-routine`)

```
Primary      You’ve started before and it didn’t hold. This time you get a coach, and a plan written before you walked in.
Headline     This time, a coach.
Description  Frisco. Three levels.
```

---

## Verify, then spend

Two notes that will save you confusing yourself:

- The Meta Pixel Helper extension is now called **Meta Ads Data Advisor**.
  Searching the old name will not find it.
- `Lead` fires **once per campaign per browser**, on purpose, so a shared link
  cannot report the same person twice. Your second test from the same phone shows
  nothing. Use a private window to retest.

- [ ] Both GHL redirects carry `?s=2`, pass form data on
- [ ] Submit the capture form, confirm the calendar arrives **prefilled**
- [ ] Book a slot, land on `/thank-you`
- [ ] Events Manager → Test Events shows `ViewContent` then `Lead` (allow ~30s;
      a blank result is almost always an ad blocker or unsupported browser)
- [ ] The test contact reached GHL — check whether UTM fields came with it
- [ ] Creative enhancements off, checked a second time before publishing
- [ ] URL points at `/start-back-to-school`, never the landing page
- [ ] Estimated audience size looks like Frisco, not the metro

**Known gap: UTMs may not reach the GHL contact.** The site stores UTMs and
appends them to booking links, and tags GHL iframes that use a lazy-loaded
source. The capture form is not one of those — it loads directly, so that tagging
never touches it. Whether GHL's own embed script picks up parent-page parameters
is external to this repo and untested. The test submission answers it. If the
contact arrives without UTM fields you are not blind, you have lost the
cross-reference inside GHL; Meta still reports cost per lead per ad.

---

## Week one

Editing the ad set restarts the learning phase, and the clock runs seven days
from the last significant edit rather than a calendar week. A significant edit is
pausing, or changing the optimisation event, audience or creative; budget changes
count too, depending on size.

**Give it four days untouched.** Then three numbers:

- **Cost per lead.** $8-25 is a normal band for a local gym consult. Your own
  number after a week decides everything else.
- **Lead to booking rate.** What the three-step funnel exists to protect. Cheap
  leads that never book means the landing page or calendar is the problem.
- **Frequency.** Over 2.5 on a 10-mile radius means repeat exposure. Refresh
  creative rather than raising budget.

Everyone who fills the form and does not book is a name and a number in GHL. With
no automation running, working that list by hand is the highest-return hour in
the week.

**Rejection risk.** Fitness is not a special ad category, but Meta's health and
wellness standards still apply. What trips them is implying knowledge of
someone's body or generating negative self-perception, plus before-and-after
imagery and unrealistic outcomes. The creative has none of that. If an ad is
rejected, read the specific policy cited rather than guessing, and request review.

---

## What could not be verified

Meta's help pages are blocked from the environment this was researched in.
Settings above came through search returning Meta's own wording from those pages,
readable but not directly openable, and were cross-checked against independent
sources. Three things worth a glance rather than trust:

- Whether **Advantage campaign budget defaults on**. Sources split; one look at
  the toggle settles it.
- Whether the **location inclusion dropdown appears** under Advantage+ audience.
- Whether **ad set budget sharing** exists on the account — a checkbox letting
  Meta move up to 20% of an ad set's daily budget elsewhere. It only appears with
  two or more ad sets, so it is irrelevant until routine launches. Uncheck it then.

Everything about the funnel itself — URLs, pixel, events, form IDs — was verified
directly against the deployed site.
