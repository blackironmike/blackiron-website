# Handoff — ad funnel, supplements, affiliate strategy

Written 2026-09-02, at the end of the session titled "Black Iron ad funnel
verification". That session cannot be merged into another one, so this file is
the carry-over. Everything below is either verified or explicitly marked as
unverified.

Read the two urgent items first. Everything else can wait.

---

## 1. URGENT: undisclosed affiliate links are live right now

Production serves nine Thorne affiliate links carrying only `rel="noopener"`.
Affiliate links need `sponsored`, which is what discloses the link to Google and
is the half that matters for the FTC. Verified live on 2026-09-02:

```
curl -sS https://www.blackironathletics.com/blog/why-creatine-is-important \
  | grep -o '<a[^>]*thorne[^>]*>'
```

Returns `rel="noopener"` on every one.

**The fix is already written** and sits in commit `e38fd4b` on the branch
`claude/gym-website-research-redesign-zrxjhh`. It has not been merged. Merging
that branch fixes this. Until then the exposure stands.

Affected: `blog/why-creatine-is-important.html` (4 links),
`macro-calculator.html` (4), `links.html` (1). `links.html` also had no
affiliate disclosure at all.

## 2. URGENT: the ad funnel has never been verified in a browser

This was the original job of the session and it never got done. The browser
crashed early, and by the time it was usable the work had moved on.

Not verified, on live pages:

- Both capture pages render, and the GHL form actually appears
- The form background is `#101010` on `#101010`, with no grey ring
- Submitting redirects to the right landing page with `?s=2`, and the warm bar shows
- **The calendar arrives prefilled.** Michael called this the single most
  important check. If it asks for name, phone and email a second time, the
  pass-through toggle did not take and the two-step funnel is worse than the
  one-step it replaced.
- `/thank-you` renders with the map
- Pixel events fire in the right places

Needs a single agreed test contact in production GHL, cleaned up afterwards.
Do not fire repeated test submissions.

---

## 3. State of the repo

`main` is at `6a09b3f`. The branch
`claude/gym-website-research-redesign-zrxjhh` is **four commits ahead** and
unmerged:

| Commit | What |
|---|---|
| `4d426ca` | The `/supplements` page and the Thorne dispensary behind it |
| `7daddb6` | Fix: supplements was missing from the mobile menu |
| `029abe4` | Make the supplements page look like a shelf, with product imagery |
| `e38fd4b` | Fix: the affiliate links we already had were not disclosed |

`/supplements` returns 404 on production. It exists only on the branch and its
Vercel preview.

### What did reach main

- **Pixel map corrected.** `Lead` now fires on warm landing-page arrival
  (`?s=2`), guarded in `localStorage` to fire once per campaign per browser,
  because the nurture links all carry `?s=2` and would otherwise inflate it.
  `/thank-you` fires `Schedule` only.
- **`META_VIEWCONTENT_PATHS`** is `/start-back-to-school,/start-routine`.
- **The eight ad creatives** in `images/ads/2026-08-back-to-school/`, generated
  by `tools/ads.py`.
- **Three about-page creatives** in `images/ads/2026-08-about/`, 9:16 only.
- **`docs/ad-launch-checklist.md`**, including the about-page campaign copy
  inside Meta's 125/27/27 character limits.
- **Knowledge base endpoints**: `api/push-knowledge-base.js`,
  `api/push-crawler.js`, `api/api-probe.js`.

---

## 4. Decisions made, so they are not relitigated

**Nurture automation is cancelled.** Michael decided all lead follow-up is
manual: a real call, a voicemail and a text from his own iPhone within minutes.
No drip campaign, no GHL email templates. `docs/nurture-sequence.md` is now
mostly obsolete and was never reviewed.

**Canonical content split between the two sites.** Reviews live on Every Dad
Carry. Black Iron links out to them. Do not republish the same product review on
both domains: Google picks one and the other loses ranking it already earned.

**Feed placements are out.** Michael's read is that the 4:5 feed cards have not
performed. New creative is 9:16 only. `tools/ads.py` still supports feed per
concept; the about ads set `sizes=["story"]`.

**The routine tagline** is "You don't need more discipline. You need a
community." It replaced "You've started before. This time, a coach.", whose
second half was a fragment with no verb.

---

## 5. Every Dad Carry, and what it changes

`C:\Users\micha\Documents\Claude\every-dad-carry` is a live affiliate site with
**25 gear reviews, 9 guides and 45 photos**, all first-person, following
`REVIEW-VOICE.md`. Twelve reviews are fitness-category and **eight are Thorne
products already reviewed properly with photos**: creatine, whey isolate, daily
electrolytes, magnesium bisglycinate, omega-3 with CoQ10, deep sleep complex,
basic nutrients 2/day, advanced pre-workout.

**The `/supplements` page on this site uses generic blurbs written by Claude.**
Michael's real reviews are better and already exist. They should replace them,
by linking out rather than copying.

**`AFFILIATES.md` in that repo is out of date.** It says Impact.com "unlocks
after account appeal/reapproval". Michael was approved on 2026-09-01. That
unlocks the largest cluster on his map, including **WHOOP at $50 to $100 per
member**, which is the best-paying partner he has by a wide margin, roughly five
times a Thorne creatine sale.

Do not assume products. He has a real catalogue. Read it first.

---

## 6. The affiliate economics, which should drive design

| Source | Per sale |
|---|---|
| Thorne dispensary | ~$21 (creatine: $23 wholesale, $44 retail) |
| WHOOP via Impact | $50 to $100 per member |
| Amazon Associates | ~$0.90 on a $30 item, at 3% |

Gear links are a trust play that pays a little. The dispensary and WHOOP are the
revenue. Design accordingly.

Amazon tracking ID is `everydadcar03-20`, which belongs to Every Dad Carry. A
separate Black Iron tracking ID is needed or the reporting is useless.

---

## 7. Design work approved but not built

Two artifacts, reachable from any session:

- **Three affiliate models**, mocked in the Black Iron design system:
  https://claude.ai/code/artifact/38de9a7b-c8c9-41c1-8264-f1e7e8acd026
- **The gear page**, with working keyword search:
  https://claude.ai/code/artifact/0b05d622-eb42-4f04-a485-dbccfe1fcb36

The gear page is the approved direction. It is organised by when you would need
something rather than by product category, has a search that matches hidden
keywords (so "treadmill" finds the walking pad), and an empty state that turns
an unmatched search into a question capture. Two cards recommend nothing and
earn nothing, which is what makes the rest credible.

**It has not been built in the repo, and its product list is invented.** Rebuild
it from the real Every Dad Carry catalogue.

Every photo slot in that mockup carries direction for a real shot to take in the
gym. Ten shots, one session, available light. The supplement shelf is the hero.

---

## 8. Facts worth not rediscovering

- GHL Knowledge Base API needs `Version: 2021-04-15`. The rest of the v2 API
  uses `2021-07-28`. A wrong value reads as a confusing 400.
- The GHL crawler accepts a discovery request, answers `Processing`, then
  sometimes never produces the page, with no error anywhere. Discovery is
  inherently retry-based. Two of nine URLs took three attempts.
- A GHL `operationId` exists only in the discover response. Nothing lists
  operations, and the status endpoint needs an `operationId` to tell you about
  an `operationId`.
- GHL cannot create or edit workflows by API. There is no `workflows.write`
  scope. The automation builder is UI-only, permanently.
- Vercel serves stale CDN copies for a couple of minutes. Add `?cb=123` or
  hard-reload when verifying a change, or you will conclude an edit did not take.
- Google no longer ships static Montserrat TTFs, only `Montserrat[wght].ttf`.
  Both `tools/ads.py` and `tools/ad-card.py` fall back to the variable font.
- The live chatbot knowledge base was three weeks stale when checked, missing 27
  changed answers including every membership price. It now pushes from the repo
  via `/api/push-knowledge-base`.

---

## 9. Rules that bit us

- Never merge to `main` without asking. Every time, not once per project.
- After merging, switch back to the feature branch.
- The gym opened 2013. Michael became an owner in 2014 and sole owner in 2018.
  Never let "veteran-owned" and "since 2013" share a clause.
- No em dashes in anything written as Michael. No emojis anywhere.
- Another session works in this repo at the same time. Fetch before pushing;
  a rebase has already been needed twice.

---

## 10. Suggested order when picking this up

1. Ask Michael whether to merge the branch. It fixes the live disclosure gap.
2. Verify the ad funnel in a browser, with one agreed test contact.
3. Update `AFFILIATES.md` in every-dad-carry for the Impact approval.
4. Rebuild the gear page from the real catalogue.
5. Replace the generic supplement blurbs with links to the real reviews.
