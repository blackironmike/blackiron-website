#!/usr/bin/env python3
"""Blog header card generator — Black Iron Athletics.

One 1200x630 designed card per post, serving three placements: the lead image
inside the article, the og:image share preview, and the blog index thumbnail.
The rule and the reasoning live in CLAUDE.md, Section 4, "Blog header cards."

Geometry is measured from images/social/2026-08-02-start-over-share-a.png, the
card this template was derived from. The left rail is identical on every card so
a column of them reads as a set. Everything renders at 2x and downsamples, so
Montserrat Black stays crisp at thumbnail size.

Usage
-----
    python3 tools/blog-header.py \
        --slug 2026-08-13-back-to-school-header \
        --line "The kids got theirs. Now get yours." \
        --photo images/members/members-laughing.webp --photo-fy .30

Ground A is the default (solid black, no --photo). Pass --photo for ground B,
which cuts a monochrome photo panel into the right third.

Fonts
-----
Needs Montserrat 400 / 700 / 900 as TTFs in tools/fonts/ (mont-400.ttf etc).
They are not committed; see the error message for where to get them.
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(REPO, "tools", "fonts")
OUT_DIR = os.path.join(REPO, "images", "social")

S = 2                                   # supersample factor
W, H = 1200, 630
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREY = (199, 199, 199)
FORGE = (255, 210, 2)

# --- fixed left rail, in 1x coordinates. Do not tune per post. ---
MARGIN = 72
EYEBROW_BASE = 93
HEAD_BOX = (72, 708)                    # left, right -> 636 wide
HEAD_CENTRE = 248
AVATAR_C, AVATAR_D = (118, 484), 92
NAME_X, NAME_BASE = 182, 481
ROLE_X, ROLE_BASE = 182, 509
RULE = (72, 562, 80, 5)                 # x, y, w, h
PANEL_X = 768                           # right panel left edge

LADDER = [96, 84, 76, 68, 62]           # first size that fits three lines
PITCH = 1.085

BYLINE = ("images/team/owner-headcoach-mike.webp", "Mike Manning",
          "Owner & Head Coach  ·  20 years coaching")

# The byline photo is a full-length portrait, so the circle needs a real crop
# box, not just a vertical offset: (side as a fraction of image width, centre x,
# centre y). Tuned so the circle is head and shoulders, which is the only thing
# readable at blog-index thumbnail size. Re-tune if the portrait is replaced.
AVATAR_CROP = (0.45, 0.50, 0.37)


def F(weight, size):
    path = os.path.join(FONT_DIR, f"mont-{weight}.ttf")
    if not os.path.exists(path):
        sys.exit(
            f"Missing {path}\n"
            "This tool needs Montserrat 400, 700 and 900 as TTFs in tools/fonts/,\n"
            "named mont-400.ttf, mont-700.ttf and mont-900.ttf.\n"
            "Grab them from https://fonts.google.com/specimen/Montserrat (OFL)."
        )
    return ImageFont.truetype(path, int(round(size * S)))


def track(d, xy, text, font, fill, sp=0):
    """Draw with letter-spacing. Pillow has no tracking, so this steps by char."""
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + sp


def track_w(d, text, font, sp=0):
    return sum(d.textlength(c, font=font) for c in text) + sp * max(0, len(text) - 1)


def cover(path, w, h, fx=0.5, fy=0.5, bw=True):
    im = Image.open(os.path.join(REPO, path)).convert("RGB")
    if bw:
        im = im.convert("L").convert("RGB")
    sr = max(w / im.width, h / im.height)
    nw, nh = int(im.width * sr + 1), int(im.height * sr + 1)
    im = im.resize((nw, nh), Image.LANCZOS)
    l, t = int((nw - w) * fx), int((nh - h) * fy)
    return im.crop((l, t, l + w, t + h))


def _baseline(d, xy, text, font, fill, sp=0):
    """Draw with the baseline at y, the way the geometry above is measured."""
    x, y = xy
    asc, _ = font.getmetrics()
    track(d, (x * S, y * S - asc), text, font, fill, sp=sp * S)


def _wrap(d, words, font, maxw, sp):
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if track_w(d, t, font, sp) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _fit_headline(d, text):
    """Walk the ladder, take the first size that fits in three lines. Fail loudly."""
    words = text.upper().split()
    box = (HEAD_BOX[1] - HEAD_BOX[0]) * S
    for size in LADDER:
        f = F(900, size)
        lines = _wrap(d, words, f, box, -0.5 * S)
        if len(lines) <= 3:
            return size, lines, f
    sys.exit(
        f"Card line will not fit in three lines at the {LADDER[-1]}px floor:\n"
        f"  {text!r}\n"
        f"Shorten it. Target 42 characters, hard stop 45. This one is {len(text)}."
    )


def _corner(im):
    """Two Forge slashes, bleeding off the top edge. Geometry measured off the
    reference card, not guessed: 27px wide, slope dx/dy = -1.2, 35px apart.
    They are most of the yellow budget, so the width is load-bearing."""
    d = ImageDraw.Draw(im)
    WID, SLOPE, PITCH_X, TOP_X, BOT_Y = 27, 1.2, 35, 1121, 124
    for i in (0, 1):
        x0 = TOP_X + i * PITCH_X
        pts = [(x0, 0), (x0 + WID, 0),
               (x0 + WID - SLOPE * BOT_Y, BOT_Y), (x0 - SLOPE * BOT_Y, BOT_Y)]
        d.polygon([(x * S, y * S) for x, y in pts], fill=FORGE)


def _circle(path, dia, crop):
    """Crop a square from the portrait, then mask it to a circle.

    crop is (side, cx, cy) as fractions. Cropping first is the point: a plain
    cover-fill of a full-length portrait puts the subject's whole torso in a
    92px circle, which reads as a smudge at thumbnail size."""
    px = dia * S
    src = Image.open(os.path.join(REPO, path)).convert("L").convert("RGB")
    W0, H0 = src.size
    side, cx, cy = crop
    b = int(W0 * side)
    l = max(0, min(int(W0 * cx - b / 2), W0 - b))
    t = max(0, min(int(H0 * cy - b / 2), H0 - b))
    im = src.crop((l, t, l + b, t + b)).resize((px, px), Image.LANCZOS)
    m = Image.new("L", (px * 4, px * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, px * 4 - 1, px * 4 - 1), fill=255)
    m = m.resize((px, px), Image.LANCZOS)
    out = Image.new("RGB", (px, px), BLACK)
    out.paste(im, (0, 0), m)
    return out, m


def build(slug, card_line, *, eyebrow_tail="FRISCO, TX", photo=None, photo_fy=.30,
          byline=BYLINE, avatar_crop=AVATAR_CROP, out_dir=OUT_DIR):
    im = Image.new("RGB", (W * S, H * S), BLACK)
    probe = ImageDraw.Draw(im)

    if photo:                                    # ground B: right-hand panel
        im.paste(cover(photo, (W - PANEL_X) * S, H * S, 0.5, photo_fy), (PANEL_X * S, 0))

    d = ImageDraw.Draw(im)
    _corner(im)

    _baseline(d, (MARGIN, EYEBROW_BASE),
              f"BLACK IRON ATHLETICS  ·  {eyebrow_tail}", F(700, 26), FORGE, sp=4.5)

    size, lines, hf = _fit_headline(probe, card_line)
    pitch = size * PITCH
    top = HEAD_CENTRE - (len(lines) - 1) * pitch / 2
    asc, _ = hf.getmetrics()
    for i, ln in enumerate(lines):
        track(d, (MARGIN * S, (top + i * pitch) * S - asc * 0.62), ln, hf, WHITE, sp=-0.5 * S)

    rule_y = RULE[1]
    if byline:
        path, name, role = byline
        av, mask = _circle(path, AVATAR_D, avatar_crop)
        im.paste(av, ((AVATAR_C[0] - AVATAR_D // 2) * S,
                      (AVATAR_C[1] - AVATAR_D // 2) * S), mask)
        _baseline(d, (NAME_X, NAME_BASE), name, F(700, 26), WHITE)
        _baseline(d, (ROLE_X, ROLE_BASE), role, F(400, 20), GREY)
    else:
        rule_y = 470                             # collapse the zone, lift the rule
    d.rectangle([RULE[0] * S, rule_y * S,
                 (RULE[0] + RULE[2]) * S, (rule_y + RULE[3]) * S], fill=FORGE)

    im = im.resize((W, H), Image.LANCZOS)

    # Forge is punctuation, not a sentence. Fail the build above 2%.
    px = list(im.convert("RGB").tobytes())
    yellow = sum(1 for i in range(0, len(px), 3)
                 if px[i] > 200 and 165 < px[i + 1] < 235 and px[i + 2] < 90)
    pct = yellow * 300 / len(px)
    if pct > 2.0:
        sys.exit(f"{slug}: Forge is {pct:.2f}% of the card, ceiling is 2%")

    os.makedirs(out_dir, exist_ok=True)
    ext = "jpg" if photo else "png"
    p = os.path.join(out_dir, f"{slug}.{ext}")
    im.save(p, quality=92, subsampling=0) if ext == "jpg" else im.save(p)
    print(f"{os.path.relpath(p, REPO)}  {size}px x{len(lines)} lines  "
          f"forge {pct:.2f}%  {os.path.getsize(p) // 1024} KB")
    return p


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slug", required=True, help="filename without extension, YYYY-MM-DD-topic-header")
    ap.add_argument("--line", required=True, help="card line, 42 chars target, 45 hard stop")
    ap.add_argument("--eyebrow", default="FRISCO, TX", help="text after the BLACK IRON ATHLETICS lockup")
    ap.add_argument("--photo", help="repo-relative image for the right panel (ground B)")
    ap.add_argument("--photo-fy", type=float, default=.30, help="vertical crop focus, 0 top to 1 bottom")
    ap.add_argument("--no-byline", action="store_true", help="drop the byline for a non-Mike post")
    a = ap.parse_args()
    build(a.slug, a.line, eyebrow_tail=a.eyebrow, photo=a.photo, photo_fy=a.photo_fy,
          byline=None if a.no_byline else BYLINE)
