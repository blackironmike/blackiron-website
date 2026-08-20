#!/usr/bin/env python3
"""Meta ad creatives for the two-campaign funnel.

    python3 tools/ads.py

Writes eight files into images/ads/2026-08-back-to-school: four concepts,
feed (1080x1350) and story (1080x1920) each. Self-contained apart from
Pillow and the Montserrat TTFs in tools/fonts, which are gitignored, so a
fresh clone needs them dropped in once (same three files blog-header.py uses).

Every concept names its own photo, its own crop per placement and whether it
runs monochrome. Photos are colour by default: Michael's call, they are more
dynamic. The one exception is member-blessed, which was shot black and white.
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageStat

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(REPO, "tools", "fonts")
OUT = os.path.join(REPO, "images", "ads", "2026-08-back-to-school")

BLACK = (0, 0, 0)
YELLOW = (255, 210, 2)
WHITE = (255, 255, 255)
GRAY = (210, 210, 210)

# Meta's current recommended resolutions, not the long-standing 1080 figures:
# 1440x1800 for 4:5 feed, and 9:16 built at 1440 wide to match. Both are far
# under the 30MB ceiling and well over the 600px minimum width.
SIZES = {"feed": (1440, 1800), "story": (1440, 2560)}

# The 9:16 asset has to survive Reels, not just Stories, because Advantage+
# placements buys both and Reels has the stricter chrome. Meta asks for
# roughly 14% of the top, 35% of the bottom and 6% of each side left clear of
# text and logos, against Stories' 14% and 20%. Building to Stories' numbers
# put the CTA 270px inside the Reels footer, where the profile row and the
# Send message bar would have covered it. These fractions are the Reels ones,
# so one asset serves both. Feed has no equivalent chrome.
REELS_TOP_F, REELS_BOT_F, REELS_SIDE_F = 0.14, 0.35, 0.06
SAFE = {"story": dict(base_f=0.610, lock_f=0.170),
        "feed":  dict(base_f=0.885, lock_f=0.055)}


# --- type helpers -----------------------------------------------------------

def F(weight, size):
    return ImageFont.truetype(os.path.join(FONTS, f"mont-{weight}.ttf"), size)


def track(d, xy, text, font, fill, sp=0):
    """Draw with letter-spacing, which Pillow has no native setting for."""
    x, y = xy
    total = 0
    for ch in text:
        d.text((x + total, y), ch, font=font, fill=fill)
        total += d.textlength(ch, font=font) + sp
    return total - sp if text else 0


def track_w(d, text, font, sp=0):
    return sum(d.textlength(c, font=font) for c in text) + sp * max(0, len(text) - 1)


def wrap(d, text, font, maxw, sp=0):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if track_w(d, t, font, sp) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


PROBE = ImageDraw.Draw(Image.new("RGB", (8, 8)))


def fit(text, size, maxw, weight=900, sp=-1):
    while size > 26 and track_w(PROBE, text, F(weight, size), sp=sp) > maxw:
        size -= 2
    return size


# --- image helpers ----------------------------------------------------------

def cover(path, W, H, fx=0.5, fy=0.5, bw=False):
    """Fill WxH, cropping the overflow axis around a 0..1 focus point."""
    im = Image.open(os.path.join(REPO, path)).convert("RGB")
    if bw:
        im = im.convert("L").convert("RGB")
    ratio = max(W / im.width, H / im.height)
    nw, nh = int(im.width * ratio + 1), int(im.height * ratio + 1)
    im = im.resize((nw, nh), Image.LANCZOS)
    left, top = int((nw - W) * fx), int((nh - H) * fy)
    return im.crop((left, top, left + W, top + H))


def scrim(im, side="bottom", strength=232, frac=0.72):
    W, H = im.size
    g = Image.new("L", (1, H), 0)
    px = g.load()
    for y in range(H):
        p = y / H
        if side == "bottom":
            v = 0 if p < (1 - frac) else int(strength * ((p - (1 - frac)) / frac) ** 1.25)
        else:
            v = int(strength * (1 - p / frac) ** 1.25) if p < frac else 0
        px[0, y] = min(255, v)
    im = im.copy()
    im.paste(Image.new("RGB", (W, H), BLACK), (0, 0), g.resize((W, H)))
    return im


def mean_l(im, box):
    return ImageStat.Stat(im.crop(box).convert("L")).mean[0]


def bed(photo, W, H, fx, fy, floor, bw, lock_box):
    """Photo plus scrims, darkened further wherever type still has to sit.

    Two zones, checked separately because they fail separately. The bottom
    block is the headline and it gets the whole frame pulled down until it
    reads. The lockup up top only needs its own band, so it gets more top
    scrim rather than another global blend, which would flatten the photo
    for the sake of two small words.

    laser-women-story is why the second check exists: the crop puts the
    lockup straight onto a blown-out window, where white type greys out and
    the yellow line all but disappears. Every other card sits under 75 and
    takes no extra passes at all.
    """
    im = cover(photo, W, H, fx, fy, bw=bw)
    im = scrim(im, "bottom", 248, 0.80)
    im = scrim(im, "top", 200, 0.26)

    n = 0
    while mean_l(im, (60, max(0, floor), W - 60, H - 90)) > 29 and n < 20:
        im = Image.blend(im, Image.new("RGB", (W, H), BLACK), 0.15)
        n += 1

    n = 0
    while mean_l(im, lock_box) > 62 and n < 12:
        im = scrim(im, "top", 150, 0.34)
        n += 1
    return im


def lockup(d, x, y, s=26):
    f = F(900, s)
    track(d, (x, y), "BLACK IRON", f, WHITE, sp=s * .16)
    track(d, (x, y + s * 1.36), "ATHLETICS", f, YELLOW, sp=s * .16)


def outline_line(d, xy, text, font, sp, hole=BLACK, rim=WHITE, r=3):
    """The site's halo build: opaque interior, rim from eight stacked copies.
    Never color:transparent plus a stroke, which collides at this tracking."""
    x, y = xy
    for dx, dy in [(r, 0), (-r, 0), (0, r), (0, -r),
                   (r * .7, r * .7), (-r * .7, r * .7),
                   (r * .7, -r * .7), (-r * .7, -r * .7)]:
        track(d, (x + dx, y + dy), text, font, rim, sp=sp)
    track(d, (x, y), text, font, hole, sp=sp)


# --- the card ---------------------------------------------------------------

def build(c, kind, W, H):
    M = int(W * 0.078)
    MAXW = W - M * 2
    s = SAFE[kind]
    base = int(H * s["base_f"])
    fx, fy = c["focus"][kind]

    bigf = fit(c["big"], int(W * 0.150), MAXW)
    lines = [(c["big"], bigf, "solid"),
             (c["outlined"], fit(c["outlined"], bigf, MAXW), "outline")]
    subf = F(700, int(W * 0.0335))
    subl = wrap(PROBE, c["sub"], subf, MAXW, sp=.2)

    h = (sum(int(sz * 1.05) for _, sz, _ in lines) + 44
         + len(subl) * int(W * 0.048) + 52)
    y = base - h

    lock_y = int(H * s["lock_f"])
    lock_s = 26 if kind == "feed" else 27
    lock_box = (M, max(0, lock_y - 6), M + int(W * 0.55), lock_y + int(lock_s * 2.6))

    im = bed(c["photo"], W, H, fx, fy, floor=int(y - 105),
             bw=c.get("bw", False), lock_box=lock_box)
    d = ImageDraw.Draw(im)
    lockup(d, M, lock_y, lock_s)

    track(d, (M, y - int(W * 0.046)), c["kicker"], F(700, int(W * 0.0245)),
          YELLOW, sp=3.4)
    for txt, sz, style in lines:
        f = F(900, sz)
        if style == "outline":
            outline_line(d, (M, y), txt, f, -1, r=max(2, int(sz * .035)))
        else:
            track(d, (M, y), txt, f, WHITE, sp=-1)
        y += int(sz * 1.05)
    y += 44
    d.line([(M, y), (M + int(W * 0.17), y)], fill=YELLOW, width=5)
    y += int(W * 0.036)
    for ln in subl:
        track(d, (M, y), ln, subf, GRAY, sp=.2)
        y += int(W * 0.048)
    track(d, (M, base + int(H * 0.020)), c["foot"], F(900, int(W * 0.0275)),
          YELLOW, sp=2.6)

    im.save(os.path.join(OUT, f"{c['key']}-{kind}.jpg"), quality=92, subsampling=0)


# --- the four concepts ------------------------------------------------------
# Copy echoes the landing page each ad points at, so the click does not land on
# a different promise. Photos are all 2400px or larger on their long edge: the
# first men's laser pair was built from a 600x400 file and rendered soft.
#
# Crops are per placement because a story is 9:16 and a feed card is 4:5, and
# one focus point cannot serve both. laser-men is the clearest case: its source
# is landscape, so the feed crop is wide enough to hold the member and the
# woman behind him, while the story crop is narrow enough that keeping both
# would push him to the edge. Feed keeps the pair, story keeps him.

CONCEPTS = [
    # -> /start-back-to-school
    #    "The kids are back in school. Take an hour back for you."
    dict(key="laser-women",
         photo="images/members/members-laughing.webp",
         focus={"feed": (.50, .30), "story": (.50, .30)},
         kicker="FRISCO, TX  ·  SINCE 2013",
         big="The kids are back", outlined="in school.",
         sub="Take an hour back for you. Six coached class times a day, Monday to Friday.",
         foot="BOOK A FREE CONSULT"),

    dict(key="laser-men",
         photo="images/members/3I1A0424.jpeg",
         focus={"feed": (.35, .50), "story": (.20, .50)},
         kicker="FRISCO, TX  ·  SINCE 2013",
         big="The kids are back", outlined="in school.",
         sub="Take an hour back for you. Six coached class times a day, Monday to Friday.",
         foot="BOOK A FREE CONSULT"),

    # -> /start-routine
    #    "You've started before and it didn't hold. This time you get a coach."
    dict(key="shotgun-women",
         photo="images/members/3I1A0778.jpeg",
         focus={"feed": (.50, .08), "story": (.55, .08)},
         bw=True,   # shot monochrome; the flag keeps it that way if it is ever re-exported
         kicker="FRISCO, TX  ·  SINCE 2013",
         big="You've started before.", outlined="This time, a coach.",
         sub="Coached classes, three levels, and a plan that was written before you walked in.",
         foot="BOOK A FREE CONSULT"),

    dict(key="shotgun-men",
         photo="images/members/3I1A0188.jpeg",
         focus={"feed": (.50, .10), "story": (.35, .10)},
         kicker="FRISCO, TX  ·  SINCE 2013",
         big="You've started before.", outlined="This time, a coach.",
         sub="Coached classes, three levels, and a plan that was written before you walked in.",
         foot="BOOK A FREE CONSULT"),
]


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    made = []
    for c in CONCEPTS:
        for kind, (W, H) in SIZES.items():
            build(c, kind, W, H)
            made.append(f"{c['key']}-{kind}")
    print(f"wrote {len(made)} files to images/ads/2026-08-back-to-school")

    # Safe-zone proof against the REELS bounds, measured on the yellow marks
    # (the lockup's second line and the CTA), which are the outermost elements.
    W0, H0 = SIZES["story"]
    lim_top = int(H0 * REELS_TOP_F)
    lim_bot = int(H0 * (1 - REELS_BOT_F))
    lim_side = int(W0 * REELS_SIDE_F)
    print(f"\nREELS SAFE ZONE (need top >= {lim_top}, bottom <= {lim_bot}, "
          f"sides inside {lim_side}..{W0 - lim_side})")
    ok = True
    for m in [x for x in made if x.endswith("story")]:
        im = Image.open(os.path.join(OUT, f"{m}.jpg")).convert("RGB")
        W, H = im.size
        px = im.load()
        pts = [(x, y) for y in range(H) for x in range(0, W, 4)
               if px[x, y][0] > 200 and 165 < px[x, y][1] < 235 and px[x, y][2] < 90]
        top, bot = min(p[1] for p in pts), max(p[1] for p in pts)
        left, right = min(p[0] for p in pts), max(p[0] for p in pts)
        good = (top >= lim_top and bot <= lim_bot
                and left >= lim_side and right <= W - lim_side)
        ok &= good
        print(f"  {m:22s} top {top:4d}  bottom {bot:4d}  x {left:4d}-{right:4d}"
              f"  {'OK' if good else 'FAIL'}")
    print("every 9:16 file clears Reels and Stories:", ok)
