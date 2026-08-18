# Nurture Sequence — Capture Form, Not Yet Booked

Draft copy for the five emails and five texts that run after somebody fills a
capture form and does not book. The campaign drops the moment they book.

**Draft only.** Michael reviews and sends. Nothing here goes live until he says.

---

## Consent: widen the checkbox, and match the policy

The form currently collects **transactional** consent only:

> I consent to receive transactional messages from Black Iron Athletics LLC
> (appointment reminders, confirmations, membership updates).

That covers "you started a booking and did not finish." It does not cover
offers, promotions or gym news, so it would box in every future campaign, not
just this one.

Fix it in two places, together. Changing one without the other leaves the
checkbox and the policy contradicting each other, which is worse than either.

### 1. The checkbox, in the GHL form builder

Replace the consent text with this:

> I agree to receive text messages from Black Iron Athletics LLC at the number
> provided, including appointment reminders, confirmations, membership updates,
> and occasional offers and gym news. Consent is not a condition of purchase.
> Message frequency varies. Msg and data rates may apply. Reply STOP to opt out
> or HELP for help. See our Privacy Policy and Terms.

Three things make it work, and all three matter:

- **It names marketing.** "Occasional offers and gym news," not a vague catch-all.
- **It stays optional and unchecked.** Marketing consent cannot be a condition
  of anything, and your Terms already promise exactly that. If the box is
  currently required to submit, make it optional when you change the wording.
- **STOP and HELP are in the text**, along with frequency and rates.

Somebody who leaves it unticked still gets the emails. They just get no texts.

### 2. The privacy policy

Already done, on the branch. The SMS section used to scope your number to
"inquiry, appointments, membership, and related services," which did not cover
promotions. It now adds opted-in offers and news, and repeats that marketing
consent is optional.

### Worth a lawyer's half hour

This is standard practice rather than anything exotic, and your Terms were
already carrying the important line. But you are about to text at ad-driven
volume, and TCPA penalties are per message. A short review before you scale is
cheap next to that. I am not a lawyer and this is not legal advice.

## The link

Every message points at the landing page with the warm marker, so the person
arrives to "Got it, we have your details" rather than the cold pitch:

- Back to school leads: `blackironathletics.com/back-to-school?s=2`
- Routine leads: `blackironathletics.com/routine?s=2`

If one automation serves both campaigns, make this a GHL custom value and set
it per campaign. Sending a routine lead to the back-to-school pitch is the
exact mismatch we just built two forms to avoid.

Below, `[LINK]` means that URL.

---

## Cadence

Interleaved so nothing lands twice in one day. Adjust to fit your automation.

| When | What |
|------|------|
| 15 minutes | Text 1 |
| 1 hour | Email 1 |
| Day 1 | Text 2 |
| Day 2 | Email 2 |
| Day 3 | Text 3 |
| Day 4 | Email 3 |
| Day 6 | Email 4 |
| Day 7 | Text 4 |
| Day 10 | Email 5 |
| Day 11 | Text 5 |

---

# The five emails

## Email 1 — one hour

**Subject:** You haven’t picked a time yet

Hi {{contact.first_name}},

Thanks for putting your details in. There’s one thing left, and it takes about
thirty seconds: you haven’t picked a time.

Twenty minutes, no cost, and you stay in your street clothes. No workout and no
weigh-in.

**[Pick your time]([LINK])**

If it’s easier to just call, we’re at (972) 785-7036 and somebody who works
here will answer.

Mike Manning
Owner, Black Iron Athletics

---

## Email 2 — day 2

**Subject:** What actually happens in the twenty minutes

Hi {{contact.first_name}},

Most people who put off booking a consult are picturing a sales pitch. Here’s
the whole thing, so you know what you’re walking into.

**We sit down and talk.** You tell us where you’re starting, what hurts, and
what you want back. We ask questions and we listen. Nobody here thinks you’re
behind.

**We walk you through the gym.** The floor, the equipment, the class times, and
what a normal training week looks like.

**You get the prices and you decide.** Numbers in writing. If it fits, we book
your Foundations right there. If it doesn’t, you leave with a straight answer
and we don’t chase you.

That’s it. Twenty minutes, in your street clothes.

**[Pick your time]([LINK])**

Mike

---

## Email 3 — day 4

**Subject:** “I should get in shape first”

Hi {{contact.first_name}},

We hear this one more than any other, and it’s backwards.

Getting in shape first is the thing you’re coming to us for. If you could do it
on your own, you already would have, and there’s nothing wrong with you for
that. Most people can’t, because nobody ever taught them how to train.

That’s why everybody starts with Foundations. One-on-one with a coach, before
you’re ever in a group class. You learn the movements, we set your baseline,
and you find out how your body is actually working right now.

After that, every class is written three ways. Somebody in their first month
and somebody in their tenth year train in the same room, same hour, and both
get the right workout. Nobody is keeping up with anybody.

You don’t need to be ready. You need twenty minutes.

**[Pick your time]([LINK])**

Mike

---

## Email 4 — day 6

**Subject:** What it costs, before you have to ask

Hi {{contact.first_name}},

Most gyms save this for when you’re standing in the lobby. I’d rather you had
it now.

**Foundations** is $360 for the one week, three session track, or $720 for the
two week, six session track. One time, and you never pay it again. Your coach
recommends which one at the consult.

**Membership** after that is $200 a month for three classes a week, or $240 a
month for unlimited, which includes open gym seven days.

Military, first responders and teachers take 5% off. Memberships start with 90
days, then go month to month, cancel with 30 days notice.

No discount, no promotion, and no price that changes if you hesitate. If those
numbers work, the next step is twenty minutes.

**[Pick your time]([LINK])**

Mike

---

## Email 5 — day 10

**Subject:** Last one from me

Hi {{contact.first_name}},

This is the last email you’ll get from me about the consult.

If the timing is wrong, that’s a real answer and I’d rather you told me than
felt chased. We’re not going anywhere. We’ve been in Frisco since 2013 and
we’ll still be here in six months.

If it’s not the timing and you’re just not sure, the twenty minutes costs you
nothing and there’s no workout at the end of it. Worst case, you leave knowing
more about your own training than you did this morning.

**[Pick your time]([LINK])**

And if it’s a no, no hard feelings. Come say hello if you’re ever on Main
Street.

Mike Manning
Owner, Black Iron Athletics
279 Main St, Suite 122, Frisco TX

---

# The five texts

Short, and mostly about the booking they started. With marketing consent in
place these are no longer boxed in, but a text still costs somebody attention,
so none of them are filler.

## Text 1 — 15 minutes

> Hi {{contact.first_name}}, this is Mike at Black Iron Athletics. Got your
> details, but your consult time isn’t picked yet. Grab one here: [LINK]
> Reply STOP to opt out.

## Text 2 — day 1

> {{contact.first_name}}, your consult still isn’t on the calendar. Twenty
> minutes, no workout, street clothes. Pick a time: [LINK]

## Text 3 — day 3

> {{contact.first_name}}, 3,000 people have trained at Black Iron since 2013 and
> every one of them started with the same twenty minutes. Yours: [LINK]

## Text 4 — day 7

> {{contact.first_name}}, still holding a spot open for you. If none of the
> times work, reply here and tell me what does. Mike

## Text 5 — day 11

> Last reminder from me. If the timing is off, no problem. If it isn’t, we’re at
> 279 Main St Suite 122 and the door is open: [LINK] Reply STOP to opt out.

---

## Rules these follow

Straight from the handbook, so a future edit does not undo them.

- **No em dashes.** These go out under Michael’s name, so the rule is none.
- **No emojis**, and no exclamation points in body copy.
- Curly apostrophes throughout.
- No banned words: no unlock, elevate, journey, crush your goals.
- No fake urgency, no countdown, no discount that appears at email four.
  Steve bounced off gyms that felt like they were selling him.
- Text 3 mentions morning times filling first. That is only usable while it is
  actually true. If it stops being true, change the line.
