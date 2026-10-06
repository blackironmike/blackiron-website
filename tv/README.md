# Black Iron TV

The gym TV display. One page, at **https://www.blackironathletics.com/tv**, that runs on its own for weeks. It knows today's date in Frisco, works out which week of the cycle we are in, and loops the panels with motion. There are no images to regenerate and no USB sticks.

| Address | What it is |
|---|---|
| `/tv` | The display. Put this on the TVs. |
| `/tv/preview` | Every panel in one grid, frozen. Use it to proof a cycle before it goes up. |

Everything you edit lives in **`tv/config.js`**. You should never need to touch `tv.js` or `tv.css`.

## How a change reaches the TVs

1. Edit `tv/config.js` and bump `version` at the top.
2. Push. Vercel deploys in about a minute.
3. Each TV checks for a new version every 10 minutes and reloads at the end of the panel it is showing.

The version is printed small in the bottom-left corner of every TV. If one screen shows an old version, it is not getting updates (usually its Wi-Fi).

The TV only reloads when it can reach the site, so a dropped connection never turns a screen into a browser error page. If the internet is down when a TV restarts, it boots from its saved copy and keeps looping. A small "OFFLINE" appears bottom-right while it cannot reach the site. The saved copy needs a browser that supports offline pages (Chrome, Edge, Fully Kiosk, and recent TV browsers do). On one that does not, a TV that restarts with no internet shows the browser's own error page until the connection is back and the page is reloaded (Fully Kiosk can do that reload for you: turn on its reload-on-network-reconnect setting).

**If a push has a mistake in `config.js`,** the TVs do not reload into it. They keep playing the last good version and the corner reads `UPDATE BLOCKED: CONFIG ERROR`. Fix the file, bump `version`, push again, and they pick it up on the next check.

Every TV also reloads itself once every 6 hours as a safety net, and a watchdog reloads the page if it ever stops moving for 5 minutes. Both wait until the site answers first.

## Start a new cycle

In `tv/config.js`, under `cycle`:

```js
cycle: {
  name: "Harder to Kill",
  titleLines: ["Harder", "~to Kill~"],   // ~ ~ = outlined lettering
  tagline: "Stronger. Faster. ~Harder to Kill.~",
  start: "2026-09-21",                    // the Monday of week 1
  end: "2026-11-21",
  lifts: ["Snatch", "Sumo Deadlift", "Back Squat", "and a whole lot of running"],
  weeks: [
    { label: "Foundation", phase: "intro" },
    { label: "Test",       phase: "test",   note: "Set the numbers" },
    ...
  ]
}
```

- **You type week labels, not dates.** Week dates come from `start`, so two weeks can never land on the same Monday.
- `phase` is one of `intro`, `test`, `build`, `deload`. It sets the phase colors, which match the cycle timeline on `/programs`.
- `note` is the short line under a week on the timeline. Leave it out for no note.
- Phase colors only ever appear on the timeline, the current-week chip and the benchmark chips. Every other highlight is Forge yellow.
- Then update the benchmark, explainer and event panels in `deck` for the new cycle.

Panels marked `cycle: true` only show while the cycle is running. Between cycles the TVs keep looping the brand panels (mission, programs, FuelPath, review, links) on their own.

## Add a panel

Add an object to `deck`. It plays in the order it appears.

```js
{ id: "open-house", type: "spotlight", seconds: 8, until: "2026-12-06",
  chip: "Open house",
  title: ["Bring a friend.", "*Train free.*"],
  dateLine: "Saturday • December 6",
  sub: "All levels. Coffee after.",
  cards: [{ title: "...", text: "..." }],
  footer: "brand" }
```

Fields every panel understands:

| Field | Meaning |
|---|---|
| `id` | Short unique name. Used in `/tv?panel=id` and on the preview page. |
| `type` | Which layout (list below). |
| `seconds` | How long it stays up. Defaults to `defaultSeconds` (10). Keep it at 8 or more; a panel takes about 3 seconds to build in. |
| `from` | First day it shows, `"YYYY-MM-DD"`. |
| `until` | Last day it shows. It is gone the next morning. |
| `cycle` | `true` = only while the cycle is running. |
| `status` | `"draft"` = never on the TVs, only on `/tv/preview`. |
| `skull` | `"right"` (default), `"off"`, or `"pattern"` (the tiled Halloween background). |
| `footer` | `"cycle"`, `"brand"`, `"chips"`, or `"none"`. |

Text shortcuts work in any text field: `*word*` turns it Forge yellow, `~word~` gives it the outlined lettering, and `•` becomes a drawn dot.

### Layouts

| `type` | Used for | Key fields |
|---|---|---|
| `title` | The cycle title card | `photo` (uses `cycle` for the rest) |
| `timeline` | The week cards with YOU ARE HERE | `headline`, `phases`, `note` |
| `columns` | The Focus | `title`, `columns: [{heading, items, foot}]`, `note`. A foot of `"@benchmarks"` counts down to the retest week on its own. |
| `benchmark` | A tested workout | `name`, `format`, `day` ("Monday"), `movements`, `note`, optional `weeks: [2, 9]` |
| `explainer` | Eccentric Strength, the snatch | `eyebrow`, `title`, `lead`, `points: [{title, text}]`, `close`, `photo`, `tempo` (seconds, draws a countdown ring), `eyebrowDay` (lights up as "Today" on that weekday) |
| `event` | The 633 Run | `title`, `starts: {date, time}`, `countLabel`, `when`, `where`, `items`, `body`, `cta`, `qr` |
| `spotlight` | Halloween, centered announcements | `chip`, `title`, `starts`, `dateLine`, `sub`, `cards` or `images` |
| `statement` | The mission | `lines`, `sub`, `photo` |
| `fuelpath` | FuelPath, with the live phone | `title`, `points`, `ask` |
| `programs` | Black Iron Athletics and the four programs | `chips`, `title`, `mission`, `cards: [{title, text, photo}]` |
| `qr` | Google review, the links page | `title`, `body` or `list`, `stars`, `steps`, `qr`, `photo` |
| `offer` | Personal Training and Nutrition Coaching, side by side | `eyebrow`, `title` (two short lines read best), `columns: [{heading, items}]` (two columns of three short items read best), `cta`, `photo`. Longer text shrinks to fit rather than covering the footer. |
| `schedule` | The new evening class times, as a week grid | `eyebrow`, `title`, `lead`, `days` (defaults to Mon to Fri), `rows: [{time, on, tag}]`, `note`. `on` lists the days a time runs, as a list like `["Mon", "Wed"]` (leave it out for every day). Three rows fit; put more on a second panel. `tag` puts a chip like "New" beside the time. Today's column lights up on its own. |

A brand new kind of layout is one new function in `tv.js` (`RENDER.yourtype`), registered by name. Nothing else changes.

## The clock

Every panel can show a live clock, always Frisco time, in the same spot. Set `clock` near the top of `config.js`:

| `clock` | What it looks like |
|---|---|
| `"corner"` | Small, top right: day and time |
| `"footer"` | Bottom center, on the footer line: weekday and time |
| `"tab"` | Big, in a black tab hanging from the top bar at top right. Readable from across the room. |
| `"off"` | No clock |

Each format moves whatever it would have covered (the week chips, a countdown, the FuelPath phone) out of its way. The colon blinks once a second so you can tell the screen is live. To try a format before switching every TV, use the Clock buttons on `/tv/preview`, or open `/tv?clock=tab`.

## What updates itself

- The timeline lights up the current week, checks off past weeks, and moves the progress line through the week.
- The title card shows "Week 3 of 9 • Build" and a nine-segment bar.
- Benchmarks count down to their test or retest day, then say "Today" on the day and "Done" after.
- The Focus counts down the weeks to the retest.
- Events with a start time (`starts: { date, time: "08:00" }`) count down live, down to the second in the last minute, then say "Today", then disappear after their `until` date. Events with only a date count whole days, then say "Today". Leave the time out rather than guessing one.
- The snatch panel's chip turns into "Today • Monday" on Mondays.
- The FuelPath phone shows today's date and time.

## QR codes

The QR codes are image files in `images/tv/` (`qr-633-run.svg`, `qr-google-review.svg`, `qr-links.svg`). For a new event, make an SVG of the sign-up address with any QR generator, save it as `images/tv/qr-your-event.svg`, and point the panel's `qr.src` at it. Scan it with your phone before you push.

## Photos

Panel photos live in `images/tv/` as black and white JPEGs. Use real members only. Each TV keeps its own copy of every image (for up to 30 days, and longer in its offline copy), so give a replacement photo a **new filename** and point the panel at it, rather than overwriting the old file.

## Proofing

- `/tv/preview` shows every panel, its status (On air, Off, Draft) and why.
- Pick a date or a week at the top to see the deck the way it will look then.
- `/tv?panel=reaper` plays a single panel on a loop.
- `/tv?date=2026-11-16` or `/tv?week=9` plays the whole loop as of that day.
- `/tv?date=2026-10-24&time=07:59:30` checks a countdown at an exact moment.
- `/tv?speed=0.25` plays the loop four times faster (it is a multiplier, so `2` is twice as slow).
- `/tv?lite=1` drops the heavier background effects if an older TV stutters.
- `/tv?still=1` turns off all motion, `/tv?stamp=0` hides the version line.
- `/tv?clock=corner`, `footer`, `tab` or `off` overrides the clock format for that screen only.

Any of these puts a "preview" date in the corner, so you can always tell a test screen from a live one.

## Putting it on a TV

The TVs only need a web browser that stays on, open to **`https://www.blackironathletics.com/tv`**, full screen. Use the same setup that already shows the workouts.

**Mini PC or laptop (most reliable).** In Chrome or Edge, launch in kiosk mode so it opens full screen with no address bar:

```
chrome --kiosk --noerrdialogs --disable-session-crashed-bubble https://www.blackironathletics.com/tv
```

Put that command in the computer's startup items so it comes back by itself after a power cut. Turn off the computer's sleep and screen saver.

**The TV's own browser.** Open the address, then switch the browser to full screen. Check the TV's power settings: Samsung TVs switch off after 4 hours without a remote press unless Auto Power Off is turned off.

**Google TV or Android TV box.** The free browsers cannot launch on boot. Fully Kiosk Browser (about $10 per TV, one time) launches on boot and keeps the screen on. Set the start URL to the address above.

**Not Fire TV sticks bought in 2026.** The newer sticks run Amazon's Vega OS, which cannot install a kiosk browser and switches the display off when no video is playing.

**Picture size.** Most TVs crop the edges of an HDMI picture by default ("overscan"), which cuts off the footer and the version line. In the TV's picture settings, set the size to **Screen Fit** (Samsung), **Just Scan** (LG), or **Full Pixel** / **16:9 Original** (Sony and others).

**Browser age.** The page needs a browser from about 2017 or later (Chrome 57 and up). Samsung TVs from 2019 on and LG TVs from 2020 on are fine. Older built-in TV browsers may show a black screen with "Black Iron TV could not start in this browser" after a minute; use a mini PC or a streaming box on that screen instead.

**If the corner says STILL,** the computer has its "reduce motion" accessibility setting on, so the TV holds each panel without the animation. Turn that setting off, or open `/tv?motion=1` to keep the motion anyway.

The page hides the mouse cursor and asks the browser to keep the screen awake. If a screen ever looks frozen, check the version in the bottom-left corner first.

## Files

```
tv/index.html     the display, served at /tv
tv/preview.html   the proofing grid, served at /tv/preview
tv/config.js      the cycle and the deck (the only file you edit)
tv/tv.js          the engine: date math, scheduler, panel layouts
tv/tv.css         the look and the motion
tv-sw.js          offline cache for /tv (lives at the site root so it can cover /tv)
images/tv/        skull, photos, QR codes, FuelPath marks
```

`/tv` is left out of the Meta Pixel and GA4 injection (`inject-pixel.js`) and out of the sitemap (`generate-sitemap.js`), so the TVs never count as website visitors and the page stays off Google.
