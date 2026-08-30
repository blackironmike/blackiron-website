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


def buy(url, label="Shop on Thorne"):
    return f'<a class="buy" href="{url}" {REL}>{label}<span aria-hidden="true">&nbsp;&rarr;</span></a>'


def card(name, price, who, bullets, url, tag=None, pop=False):
    cls = "pcard rv pop" if pop else "pcard rv"
    t = f'<span class="tag">{tag}</span>' if tag else ""
    lis = "".join(f"<li>{b}</li>" for b in bullets)
    return f'''                <article class="{cls}">
                    {t}<h3>{name}</h3>
                    <p class="who">{who}</p>
                    <b class="pnum">${price}</b>
                    <ul>{lis}</ul>
                    {buy(url)}
                </article>'''


FOUNDATION = [
    card("Whey Protein Isolate", "65",
         "The one most people are short on. Chocolate or vanilla.",
         ["Supports your daily protein target",
          "Fast absorbing, post-workout or between meals",
          "NSF Certified for Sport"],
         "https://s.thorne.com/gOquC"),
    card("Multi-Vitamin Elite", "76",
         "Covers the micronutrient gaps a training diet leaves.",
         ["Supports energy metabolism and immune function",
          "Built for people who train, not a shelf multivitamin",
          "NSF Certified for Sport"],
         "https://s.thorne.com/7qflr"),
    card("Amino Complex", "52",
         "Aminos around training. Berry or lemon.",
         ["Supports muscle recovery after hard sessions",
          "Useful on days the appetite is not there",
          "NSF Certified for Sport"],
         "https://s.thorne.com/4AYih"),
    card("Creatine", "44",
         "Five grams a day, year round. The least glamorous, most proven.",
         ["Supports strength, power output and muscle hydration",
          "The most researched supplement in sport",
          "NSF Certified for Sport"],
         "https://s.thorne.com/ivqHX", tag="Start here", pop=True),
]

STACKS = [
    card("Foundational Stack for Athletes", "133",
         "The four above, bundled. The simplest way to start.",
         ["Multivitamin, omega, creatine and recovery",
          "Cheaper than the parts bought separately"],
         "https://s.thorne.com/cwYqr", tag="Best value", pop=True),
    card("Training Stack", "128",
         "For the block where volume is climbing.",
         ["Built around performance and recovery",
          "Berry"],
         "https://s.thorne.com/Uo5rW"),
    card("Sleep Stack for Athletes", "62",
         "The 23 hours matter more than the 1.",
         ["Supports sleep quality and overnight recovery",
          "No morning hangover"],
         "https://s.thorne.com/YOVO8"),
    card("Joint Support Stack", "105",
         "For the lifter with a knee or a shoulder that talks back.",
         ["Supports joint comfort and connective tissue",
          "Worth it before it becomes a problem"],
         "https://s.thorne.com/03HJ7"),
]

SHELF = [
    ("Daily Electrolytes", "40", "Supports hydration in a Texas summer.", "https://s.thorne.com/Er4TL"),
    ("Magnesium Bisglycinate", "52", "Supports sleep quality and muscle relaxation.", "https://s.thorne.com/L38nt"),
    ("Omega-3 with CoQ10", "55", "Supports recovery and joint comfort.", "https://s.thorne.com/C5q7J"),
    ("Vitamin D-1,000", "17", "Supports bone health and immune function.", "https://s.thorne.com/jDB7w"),
    ("Collagen Fit", "56", "Supports connective tissue and skin.", "https://s.thorne.com/DVvLI"),
    ("Shaker Bottle", "16", "Twenty ounces. Does what it says.", "https://s.thorne.com/pzsJT"),
]

PAGE_CSS = '''    <style>
    /* Supplements page — page-unique components, same token language */
    .pcard .who{font-size:.85rem;color:var(--gray);line-height:1.55;margin-top:10px}
    .pcard .pnum{margin:18px 0 20px}
    .buy{display:inline-block;margin-top:20px;font-weight:900;font-size:.82rem;
         letter-spacing:.12em;text-transform:uppercase;color:var(--yellow);
         border-bottom:1px solid rgba(255,210,2,.35);padding-bottom:3px}
    .buy:hover{border-bottom-color:var(--yellow)}
    .disclose{background:var(--coal);border:1px solid var(--steel-line);
              padding:clamp(20px,2.4vw,28px);margin-top:clamp(20px,2.6vw,30px);
              font-size:.88rem;line-height:1.65;color:var(--gray);max-width:74ch}
    .disclose b{color:var(--white)}
    .phase-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--steel-line);
                border:1px solid var(--steel-line);margin-top:34px}
    .phase-col{background:var(--black);padding:clamp(26px,3.5vw,44px)}
    .phase-col h3{margin-bottom:14px}
    .phase-col li{border-top:1px solid var(--steel-line);padding:12px 0;font-size:.93rem;line-height:1.6}
    @media (max-width:760px){.phase-grid{grid-template-columns:1fr}}
    .shelf{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
           gap:1px;background:var(--steel-line);border:1px solid var(--steel-line);margin-top:34px}
    .shelf-item{background:var(--black);padding:clamp(20px,2.4vw,28px)}
    .shelf-item b{display:block;color:var(--white);font-weight:900;font-size:1rem;margin-bottom:6px}
    .shelf-item .p{color:var(--yellow);font-weight:900;font-size:.95rem;margin-bottom:8px}
    .shelf-item p{font-size:.87rem;color:var(--gray);line-height:1.55;margin-bottom:14px}
    .fda{margin-top:clamp(26px,3vw,40px);padding-top:22px;border-top:1px solid var(--steel-line);
         font-size:.8rem;line-height:1.7;color:var(--gray);max-width:80ch}
    </style>'''

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

    for a, b in HEAD_REPLACEMENTS:
        head = head.replace(a, b)
    # Share image: the pricing card would be wrong here. Fall back to the default.
    head = re.sub(r'(2026-08-05-pricing-share\.jpg)', 'og-default.jpg', head)
    head = re.sub(r'<meta property="og:image:alt"[^>]*>',
                  '<meta property="og:image:alt" content="Black Iron Athletics, Frisco TX.">', head)
    # Swap the pricing page's private styles for ours.
    head = re.sub(r'    <style>\n.*?\n    </style>', PAGE_CSS, head, flags=re.S)

    main = f'''    <main id="main-content">

    <section class="hero hero-short no-top" aria-label="Supplements we stock">
        <div class="wrap">
            <span class="eyebrow">On the shelf &middot; Thorne partner</span>
            <h1>What we stock<br><span class="outline">at the gym.</span></h1>
            <p class="lede">We are a Thorne practitioner partner, which means every product below is
               one we actually use and keep on the shelf. All of it is NSF Certified for Sport, so it
               has been independently tested for purity, potency and banned substances. That matters
               whether you compete or you just want to know what is in the tub.</p>

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
            <p class="lede">Four products, and they do not change with the season. If you take
               nothing else, take these. Everything after this section is an adjustment on top.</p>
            <div class="price-grid">
{chr(10).join(FOUNDATION)}
            </div>
        </div>
    </section>

    <section class="sect" aria-label="What changes by training phase">
        <div class="wrap">
            <span class="eyebrow">By phase</span>
            <h2>What changes<br><span class="outline">in a cut or a build.</span></h2>
            <p class="lede">If you are running FuelPath phases with your coach, two things move.
               Everything else in the foundation stack stays exactly where it is.</p>
            <div class="phase-grid">
                <div class="phase-col">
                    <h3>In a cut</h3>
                    <ul>
                        <li><b>Pause the creatine.</b> It holds water, and that water hides fat loss
                            on the scale. Nothing is lost by stopping for the block.</li>
                        <li><b>Add the Weight Management Stack</b> for metabolic support while you
                            are in a deficit. {buy("https://s.thorne.com/uNZkL", "Weight Management Stack, $142")}</li>
                        <li>Whey, multivitamin and aminos carry on unchanged.</li>
                    </ul>
                </div>
                <div class="phase-col">
                    <h3>In a build</h3>
                    <ul>
                        <li><b>Creatine goes back in at 10g a day</b> while you are in a surplus,
                            double the year-round dose.</li>
                        <li><b>Add glutamine at 5g</b> to support recovery through the higher
                            training volume. {buy("https://s.thorne.com/nE57k", "L-Glutamine, $26")}</li>
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
            <p class="lede">Thorne bundles these themselves, and they come out cheaper than the same
               products bought one at a time.</p>
            <div class="price-grid">
{chr(10).join(STACKS)}
            </div>
        </div>
    </section>

    <section class="sect" aria-label="Also on the shelf">
        <div class="wrap">
            <span class="eyebrow">Also stocked</span>
            <h2>The rest of<br><span class="outline">the shelf.</span></h2>
            <div class="shelf">
{chr(10).join(f"""                <div class="shelf-item">
                    <b>{n}</b>
                    <div class="p">${p}</div>
                    <p>{d}</p>
                    {buy(u, "Shop")}
                </div>""" for n, p, d, u in SHELF)}
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
            <p class="lede">Fifty-odd products sit in our dispensary. This page is the part we
               actually reach for. If you want something specific, it is probably in there.</p>
            <p><a class="btn btn-y" href="{STORE}" {REL}>Browse the full dispensary</a></p>
        </div>
    </section>

'''
    io.open(OUT, "w", encoding="utf-8").write(head + "\n" + nav + "\n" + main + tail)
    print(f"wrote {os.path.relpath(OUT, REPO)}")


if __name__ == "__main__":
    build()
