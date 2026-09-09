#!/usr/bin/env python3
"""
build-supplements.py
Builds supplements.html from the shared page skeleton plus the product table.

    python3 tools/build-supplements.py

Nav, footer and head furniture are lifted from pricing.html at build time rather
than copied into this file, so a change to the site chrome reaches this page the
same as every other page. Only the middle is ours.

Products and links come from the dispensary export at
Documents/Claude/every-dad-carry/THORNE-LINKS.md. Links are tracked
s.thorne.com shortlinks tied to the practitioner account: never rewrite one by
hand and never point at a thorne.com product URL, because an untracked link is
a sale that pays nobody.

Every outbound link carries rel="nofollow sponsored noopener" and opens in a new
tab. sponsored is the one that matters for disclosure; nofollow keeps the link
equity; noopener is the security half of target=_blank.

Product shots are hotlinked from Thorne's own CDN rather than copied here. That
is deliberate. Rehosting their product photography would mean redistributing
someone else's copyrighted work from our domain, and hotlinking sidesteps the
question entirely: Thorne serves their own images, and if they change packaging
ours change with it. The files are transparent PNGs, which is why they sit on
our black without a white card around them.

The tradeoff is that the URL carries a content hash, so a re-upload on their
side can 404 a link. Every image therefore has an onerror handler that hides
the frame and leaves a working product tile behind rather than a broken-image
icon.

Claims are held to structure/function language ("supports") throughout. No
product on this page may be described as treating, preventing or curing
anything. The FDA disclaimer at the foot is not decoration.
"""

import io
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKELETON = os.path.join(REPO, "pricing.html")
OUT = os.path.join(REPO, "supplements.html")

STORE = "https://www.thorne.com/u/blackiron"
REL = 'target="_blank" rel="nofollow sponsored noopener"'
CDN = "https://d1vo8zfysxy97v.cloudfront.net/media/product/"

# SKU -> filename on Thorne's CDN. Harvested from the dispensary and the product
# pages; the hash is part of the path, so these cannot be guessed from the SKU.
IMG = {
    "SP111":    "sp111__v496b30d9bd6d9b49984937cf925408c168a0561f.png",
    "VM114NC":  "vm114nc__v59f2e2230168349549da2930659889eb3ad55612.png",
    "SP641":    "sp641__v5d864686891ec733704f50f55b51dbb6f3c911a5.png",
    "SF903":    "sf903__ve8382489c6ce9fb7f28cdddef00e6f1ece146591.png",
    "BUN022":   "bun022__v1914783f96651cfe5df9bbd27b90380c3210ae97.png",
    "BUN024":   "bun024__v9926b80e9ae7f432deb908bde4350e854ac1ff01.png",
    "BUN019":   "bun019__v50ae8e2dd9baa796c9e11016ce65483deafd4393.png",
    "BUN025":   "bun025__vf257313f781c4f8d1b56856753a1278863520150.png",
    "BUN010":   "bun010__ve9fc8b3bb783b65d957f8dcf3485a4b5c88de761.png",
    "SA518":    "sa518__v2676db816bc07d34680981434281b27beae46edd.png",
    "SF911P":   "sf911p__v59a9cae0f03398321a1ee93acdf66ebbce1e9c46.png",
    "M204":     "m204__vf94337d0b0a8cddf810ec0fea7908f179db431a7.png",
    "SP616":    "sp616__vb9b6e8c8d8273dcb69d1daf030bf4f42062976c1.png",
    "D128":     "d128__v9b9446043201339cad5c3fa591562d3b90f24456.png",
    "SP686":    "sp686__vf1745c596d6c9ca3dbcedc07a96af37e31dbe5ac.png",
    "TRBOTTLE": "trbottle__v984fb9d117f22c8471f26cfd2d6fe9d2dc521fe4.png",
}

# name, sku, price, one-line benefit in supports language, shortlink, badge
FOUNDATION = [
    ("Whey Protein Isolate", "SP111", "65", "Supports your daily protein target. Chocolate or vanilla.", "https://s.thorne.com/gOquC", None),
    ("Multi-Vitamin Elite", "VM114NC", "76", "Supports energy metabolism and immune function.", "https://s.thorne.com/7qflr", None),
    ("Amino Complex", "SP641", "52", "Supports recovery after hard sessions. Berry or lemon.", "https://s.thorne.com/4AYih", None),
    ("Creatine", "SF903", "44", "Supports strength, power output and muscle hydration.", "https://s.thorne.com/ivqHX", "Start here"),
]

STACKS = [
    ("Foundational Stack", "BUN022", "133", "The starting four, bundled cheaper than the parts.", "https://s.thorne.com/cwYqr", "Best value"),
    ("Training Stack", "BUN024", "128", "For the block where volume is climbing.", "https://s.thorne.com/Uo5rW", None),
    ("Sleep Stack", "BUN019", "62", "Supports sleep quality and overnight recovery.", "https://s.thorne.com/YOVO8", None),
    ("Joint Support Stack", "BUN025", "105", "Supports joint comfort and connective tissue.", "https://s.thorne.com/03HJ7", None),
]

SHELF = [
    ("Daily Electrolytes", "SF911P", "40", "Supports hydration in a Texas summer.", "https://s.thorne.com/Er4TL", None),
    ("Magnesium Bisglycinate", "M204", "52", "Supports sleep quality and muscle relaxation.", "https://s.thorne.com/L38nt", None),
    ("Omega-3 with CoQ10", "SP616", "55", "Supports recovery and joint comfort.", "https://s.thorne.com/C5q7J", None),
    ("Vitamin D-1,000", "D128", "17", "Supports bone health and immune function.", "https://s.thorne.com/jDB7w", None),
    ("Collagen Fit", "SP686", "56", "Supports connective tissue and skin.", "https://s.thorne.com/DVvLI", None),
    ("Weight Management Stack", "BUN010", "142", "Metabolic support while you are in a deficit.", "https://s.thorne.com/uNZkL", None),
    ("L-Glutamine", "SA518", "26", "Supports recovery through higher training volume.", "https://s.thorne.com/nE57k", None),
    ("Shaker Bottle", "TRBOTTLE", "16", "Twenty ounces. Does what it says.", "https://s.thorne.com/pzsJT", None),
]


def tile(name, sku, price, blurb, url, badge=None):
    """One product. The whole tile is the link: three links to the same place
    reads badly to a screen reader and gives the thumb three targets where it
    wants one."""
    src = CDN + IMG[sku]
    b = f'<span class="ptag">{badge}</span>' if badge else ""
    return f'''                <a class="ptile" href="{url}" {REL}>
                    {b}<span class="ptile-img"><img src="{src}" alt="Thorne {name}"
                         loading="lazy" decoding="async" width="1000" height="1000"
                         onerror="this.closest('.ptile-img').style.display='none'"></span>
                    <span class="ptile-name">{name}</span>
                    <span class="ptile-blurb">{blurb}</span>
                    <span class="ptile-foot"><b>${price}</b><em>Shop<span aria-hidden="true">&nbsp;&rarr;</span></em></span>
                </a>'''


def grid(items):
    return '\n'.join(tile(*i) for i in items)


PAGE_CSS = '''    <style>
    /* Supplements-only. The shelf components (.shop-grid, .ptile*, .disclose,
       .lede, .fda) live in css/bia.css section 37, shared with /gear. */
    .nsf{display:inline-block;margin-top:14px;font-size:.72rem;font-weight:900;
         letter-spacing:.14em;text-transform:uppercase;color:var(--yellow)}
    .phase-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--steel-line);
                border:1px solid var(--steel-line);margin-top:34px}
    .phase-col{background:var(--black);padding:clamp(26px,3.5vw,44px)}
    .phase-col h3{margin-bottom:14px}
    .phase-col li{border-top:1px solid var(--steel-line);padding:12px 0;font-size:.93rem;line-height:1.6}
    .phase-col a{color:var(--yellow);font-weight:700}
    @media (max-width:760px){.phase-grid{grid-template-columns:1fr}}
    </style>'''

# The donor page (pricing.html) keeps its JSON-LD AFTER </main>, so a verbatim
# tail copies pricing's identity and its whole membership offer catalogue onto
# this page. Google then reads /supplements as though it were /pricing. Replace
# the block outright rather than string-patching it.
#
# Deliberately NO Offer or Product markup here: we are a Thorne affiliate, we
# do not fulfil these orders, and claiming offers we do not honour is exactly
# what structured-data guidance exists to stop.
PAGE_SCHEMA = """    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": "https://www.blackironathletics.com/supplements",
          "url": "https://www.blackironathletics.com/supplements",
          "name": "Supplements We Stock | Black Iron Athletics \u2014 Frisco, TX",
          "description": "The Thorne supplements we stock and use at Black Iron Athletics in Frisco, TX. A four-part year-round stack, what changes in a cut or a build, and the pre-built athlete stacks. All NSF Certified for Sport.",
          "isPartOf": {
            "@type": "WebSite",
            "name": "Black Iron Athletics",
            "url": "https://www.blackironathletics.com"
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://www.blackironathletics.com/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Supplements",
              "item": "https://www.blackironathletics.com/supplements"
            }
          ]
        }
      ]
    }
    </script>"""

HEAD_REPLACEMENTS = [
    ("Membership Pricing | Black Iron Athletics — Frisco, TX",
     "Supplements We Stock | Black Iron Athletics — Frisco, TX"),
    ("Membership pricing at Black Iron Athletics in Frisco, TX — in writing: Standard $200/mo, "
     "Unlimited + Open Gym $240/mo, Open Gym $50/mo, personal training $120–150/hour. Try any "
     "class with a $30 day pass, credited toward your first month.",
     "The Thorne supplements we stock and use at Black Iron Athletics in Frisco, TX. A four-part "
     "year-round stack, what changes in a cut or a build, and the pre-built athlete stacks. All "
     "NSF Certified for Sport."),
    ("https://www.blackironathletics.com/pricing", "https://www.blackironathletics.com/supplements"),
]


def build():
    src = io.open(SKELETON, encoding="utf-8").read().split("\n")
    body_i = next(i for i, l in enumerate(src) if l.strip() == "<body>")
    main_i = next(i for i, l in enumerate(src) if "<main id=" in l)
    endmain_i = next(i for i, l in enumerate(src) if l.strip() == "</main>")

    head = "\n".join(src[:body_i])
    nav = "\n".join(src[body_i:main_i])
    tail = "\n".join(src[endmain_i:])

    # Swap the donor page's structured data for this page's own.
    tail, n_schema = re.subn(
        r'[ \t]*<script type="application/ld\+json">.*?</script>',
        lambda _m: PAGE_SCHEMA,
        tail, count=1, flags=re.S,
    )
    if n_schema != 1:
        raise SystemExit(
            "build-supplements: expected exactly one JSON-LD block after </main> "
            f"in the skeleton, replaced {n_schema}. The donor page changed shape."
        )

    for a, b in HEAD_REPLACEMENTS:
        head = head.replace(a, b)
    head = re.sub(r'(2026-08-05-pricing-share\.jpg)', 'og-default.jpg', head)
    head = re.sub(r'<meta property="og:image:alt"[^>]*>',
                  '<meta property="og:image:alt" content="Black Iron Athletics, Frisco TX.">', head)
    head = re.sub(r'    <style>\n.*?\n    </style>', PAGE_CSS, head, flags=re.S)
    # The product shots come from Thorne's CDN, so warm the connection early.
    head = head.replace('<link rel="preconnect" href="https://fonts.googleapis.com">',
                        '<link rel="preconnect" href="https://d1vo8zfysxy97v.cloudfront.net">\n'
                        '    <link rel="preconnect" href="https://fonts.googleapis.com">')

    main = f'''    <main id="main-content">

    <section class="hero hero-short no-top" aria-label="Supplements we stock">
        <div class="wrap">
            <span class="eyebrow">On the shelf &middot; Thorne partner</span>
            <h1>What we stock<br><span class="outline">at the gym.</span></h1>
            <p class="lead">We are a Thorne practitioner partner, which means everything below is
               something we actually use and keep on the shelf. All of it is NSF Certified for Sport,
               independently tested for purity, potency and banned substances. That matters whether
               you compete or you just want to know what is in the tub.</p>
            <span class="nsf">Every product NSF Certified for Sport</span>

            <div class="disclose">
                <b>How this works.</b> The links on this page are tracked to our Thorne dispensary,
                and we earn a commission on anything bought through them. It costs you nothing extra.
                We list what we stock and use, and nothing gets on this page because it pays better.
            </div>
        </div>
    </section>

    <section class="sect alt" aria-label="The year-round foundation stack">
        <div class="wrap">
            <span class="eyebrow">Start here</span>
            <h2>The year-round<br><span class="outline">foundation stack.</span></h2>
            <p class="lead">Four products, and they do not change with the season. If you take
               nothing else, take these. Everything after this is an adjustment on top.</p>
            <div class="shop-grid">
{grid(FOUNDATION)}
            </div>
        </div>
    </section>

    <section class="sect" aria-label="What changes by training phase">
        <div class="wrap">
            <span class="eyebrow">By phase</span>
            <h2>What changes<br><span class="outline">in a cut or a build.</span></h2>
            <p class="lead">If you are running FuelPath phases with your coach, two things move.
               Everything else in the foundation stack stays exactly where it is.</p>
            <div class="phase-grid">
                <div class="phase-col">
                    <h3>In a cut</h3>
                    <ul>
                        <li><b>Pause the creatine.</b> It holds water, and that water hides fat loss
                            on the scale. Nothing is lost by stopping for the block.</li>
                        <li><b>Add the Weight Management Stack</b> for metabolic support while you
                            are in a deficit.
                            <a href="https://s.thorne.com/uNZkL" {REL}>Weight Management Stack, $142</a></li>
                        <li>Whey, multivitamin and aminos carry on unchanged.</li>
                    </ul>
                </div>
                <div class="phase-col">
                    <h3>In a build</h3>
                    <ul>
                        <li><b>Creatine goes back in at 10g a day</b> while you are in a surplus,
                            double the year-round dose.</li>
                        <li><b>Add glutamine at 5g</b> to support recovery through the higher
                            training volume.
                            <a href="https://s.thorne.com/nE57k" {REL}>L-Glutamine, $26</a></li>
                        <li>Whey, multivitamin and aminos carry on unchanged.</li>
                    </ul>
                </div>
            </div>
            <p class="compare-close">Your coach sets the phase and adjusts this with you. If you are
               not sure which one you are in, ask at the desk.</p>
        </div>
    </section>

    <section class="sect alt" aria-label="Pre-built Thorne stacks">
        <div class="wrap">
            <span class="eyebrow">Bundled</span>
            <h2>Pre-built stacks,<br><span class="outline">if you would rather not think.</span></h2>
            <p class="lead">Thorne bundles these themselves, and they come out cheaper than the same
               products bought one at a time.</p>
            <div class="shop-grid">
{grid(STACKS)}
            </div>
        </div>
    </section>

    <section class="sect" aria-label="Also on the shelf">
        <div class="wrap">
            <span class="eyebrow">Also stocked</span>
            <h2>The rest of<br><span class="outline">the shelf.</span></h2>
            <div class="shop-grid">
{grid(SHELF)}
            </div>

            <p class="fda">These statements have not been evaluated by the Food and Drug
               Administration. These products are not intended to diagnose, treat, cure or prevent
               any disease. Supplements support a diet and a training plan; they do not replace
               either. If you are pregnant, nursing, taking medication or managing a health
               condition, talk to your doctor before starting anything on this page.</p>
        </div>
    </section>

    <section class="final" aria-label="Browse the full dispensary">
        <div class="wrap">
            <h2>The full shelf<br><span class="outline">is bigger than this.</span></h2>
            <p class="lead">Fifty-odd products sit in our dispensary. This page is the part we
               actually reach for. If you want something specific, it is probably in there.</p>
            <p><a class="btn btn-y" href="{STORE}" {REL}>Browse the full dispensary</a></p>
        </div>
    </section>

'''
    io.open(OUT, "w", encoding="utf-8").write(head + "\n" + nav + "\n" + main + tail)
    n = len(FOUNDATION) + len(STACKS) + len(SHELF)
    print(f"wrote {os.path.relpath(OUT, REPO)}  ({n} products, {len(IMG)} images)")


if __name__ == "__main__":
    build()
