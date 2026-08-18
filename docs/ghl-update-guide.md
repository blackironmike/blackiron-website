# GHL Update Guide — Michael’s Runbook

Everything the bot knows lives in two repo files: `ghl-chatbot-knowledge-base.md`
and `ghl-chatbot-personality.md`. GHL does not sync with the repo — whenever
either file changes, you re-upload and re-paste by hand. Here’s how.

## 1. Re-upload the knowledge base

1. Log in to GHL and open the Black Iron sub-account.
2. Go to AI Agents → Knowledge Base.
3. Delete the old `ghl-chatbot-knowledge-base.md` upload (trash icon next to it).
4. Upload the current `ghl-chatbot-knowledge-base.md` from the repo.
5. Wait for it to finish processing before testing.

## 2. Re-paste the personality fields

1. Go to AI Agents → Conversation AI → your agent.
2. Open `ghl-chatbot-personality.md` from the repo.
3. Paste the PERSONALITY section into the Personality field.
4. Paste the GOAL section into the Goal field.
5. Paste the GUIDELINES section into the Guidelines field.
6. Save.
7. Test in the preview: ask “How much is a membership?” — the bot should answer
   with real numbers ($200, $240, $50, $120–150/hour), not “pricing is
   personalized.”

## 3. Restrict the consult calendar to a rolling 3-day window

Calendar ID: `aOyy4UPbwziVvHz35TCU` (the free-consult calendar behind /book).

1. Go to Calendars → Calendar Settings.
2. Open the consult calendar (match the ID above if the name is ambiguous).
3. Open the Availability tab.
4. Find the booking window setting (labeled “Date range” or “Maximum booking
   window,” depending on GHL version).
5. Set it to a rolling 3 days into the future.
6. Save, then load /book and confirm only the next 3 days show slots.

Why: near-term slots book at a much higher show rate. A lead picking a time
three weeks out is a lead who cools off.

## 4. Instant SMS on new lead form submissions

Forms: `vw0hMdDkTCL6K5N3i7vF` (lead modal) and `TtM4VqCtmx8o3ZuBgseK` (contact).

1. Go to Automation → Workflows → Create Workflow → Start from Scratch.
2. Name it “New lead — instant SMS.”
3. Add trigger: Form Submitted. Add a filter so it fires only for the two form
   IDs above (add the trigger twice or use an “is any of” filter, depending on
   GHL version).
4. Add action: Send SMS. Suggested text:

   > Thanks for reaching out to Black Iron Athletics. A real coach — not a
   > bot — will text you shortly to set up your free consultation. Want to
   > grab a time now? Book here: https://www.blackironathletics.com/book

5. Set the workflow to Publish (not Draft) and save.
6. Test: submit the lead form on the live site with your own number and
   confirm the SMS lands within a minute.

## 5. When the site redesign merges

1. Re-upload the knowledge base (Section 1) — same file, fresh upload, so the
   live bot matches the live site.
2. Verify pricing answers: ask the chatbot “How much does a membership cost?”
   and confirm it states $200 / $240 / $50 / $120–150 per hour.
3. Spot-check two more: “Do you teach Olympic weightlifting?” (classes paused,
   lifts still in programming and open gym) and “Are you moving?” (next door,
   Suite 110, opening October 2026).
4. On moving day — not before — update the Google Business Profile address
   from Suite 122 to Suite 110 (Google Business Profile → Edit profile →
   Location → Business address). Changing it early sends people to a door
   that isn’t open yet.

## 6. Form background must match the site's coal

Every GHL form on the site sits inside a container the site paints `--coal`
(`#101010`): the three modals (`.modal-container`) and the inline embeds
(`.embed-box`, `.booking-embed`, `.contact-form-container`, which add 6–10px
of padding so the frame is wider there).

If a form's own background is any other shade, that coal shows as a ring
around it and reads as a mismatched border. Forms shipped at `#1A1A1A`, which
is six points lighter than coal — close enough to look like a mistake rather
than a choice.

**Set Background to `#101010FF`** in Styles → Colors & Background, on all five:

| Form | Where it appears |
|------|------------------|
| Lead Capture - Website | consult modal, every page |
| Lead Capture - Back to School | `/start-back-to-school` capture page |
| Lead Capture - Routine | `/start-routine` capture page |
| Subscribe | footer modal |
| Membership Cancellation | cancellation modal |

Leave **Input Background** at `#000000FF`. Black fields on coal is the same
layering the rest of the site uses, and it gives the inputs their edge.

Do **not** use transparent. It would inherit our coal correctly on the site,
but a form opened through its own GHL share link renders on white, and white
input borders on white is an invisible form.

If the site palette is ever reskinned, this value changes here too. It is the
one brand colour that lives outside `css/bia.css`.
