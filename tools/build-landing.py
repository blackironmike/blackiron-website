#!/usr/bin/env python3
"""Build a back-to-school landing page from a copy deck.

A landing page, not a website page: no nav, no hamburger, no side menu, no
thumb bar. The only ways off it are booking, calling, or closing the tab.
Everything else about the page is the site's own component language so it
still looks like Black Iron.
"""
import html, json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHONE_HREF = "tel:+19727857036"
PHONE_TEXT = "(972) 785-7036"
CAL = "https://api.leadconnectorhq.com/widget/booking/aOyy4UPbwziVvHz35TCU"

# Deck key -> live slug. Anything not listed builds as an lp-* draft.
WARM = "<script>\n/* The capture page redirects here with ?s=2, so the page can tell a warm\n   arrival from a cold one. The name is optional: add &n={{contact.first_name}}\n   to the GHL redirect and it gets used, otherwise the greeting stays generic.\n   Written with textContent, never innerHTML: this value comes off the URL. */\n(function () {\n  var q = new URLSearchParams(window.location.search);\n  if (q.get('s') !== '2') { return; }\n  var bar = document.getElementById('warmbar');\n  if (!bar) { return; }\n  var raw = (q.get('n') || '').replace(/[^A-Za-z' -]/g, '').trim().slice(0, 24);\n  if (raw) {\n    var name = raw.charAt(0).toUpperCase() + raw.slice(1);\n    document.getElementById('warmgreet').textContent = 'Got it, ' + name + '. We have your details.';\n  }\n  bar.classList.add('on');\n  var cta = document.querySelector('.hero-ctas .btn');\n  if (cta) { cta.textContent = 'Pick your time'; }\n})();\n</script>\n"

LEAD = "<script>\n/* Lead: the capture form redirects here with ?s=2, so a warm arrival means\n   the form was submitted a moment ago. The form is a cross-origin iframe, so\n   its submit cannot be hooked directly and this is the closest signal there\n   is. Fired at most once per campaign per browser: the nurture emails link\n   here with ?s=2 as well, and without the guard every click would report a\n   fresh lead and inflate the number the ad sets optimise against. */\n(function () {\n  if (new URLSearchParams(window.location.search).get('s') !== '2') { return; }\n  var k = 'bia_lead' + window.location.pathname;\n  try {\n    if (window.localStorage.getItem(k)) { return; }\n    window.localStorage.setItem(k, '1');\n  } catch (e) { /* private mode: no guard available, fire anyway */ }\n  if (typeof fbq === 'function') { fbq('track', 'Lead'); }\n})();\n</script>\n"

SLUGS = {"laser-1": "back-to-school", "shotgun-2": "routine"}

# The site default card, the same one about/contact/faq/media use. These are
# ad pages, so the share preview should say what the gym is rather than borrow
# a blog post's header. It used to be the back-to-school post's card, which
# meant /routine shared a back-to-school image.
SHARE_CARD = "2026-08-05-default-share.jpg"

BAND = '    <div class="marquee" aria-hidden="true">\n        <div class="marquee-track">\n            <span>Coached every rep &mdash; Three levels, one floor &mdash; Forge the body, guard the mind &mdash;&nbsp;</span><span>Coached every rep &mdash; Three levels, one floor &mdash; Forge the body, guard the mind &mdash;&nbsp;</span>\n        </div>\n    </div>\n    <div class="stats-grid">\n        <div class="stat rv"><b>13+</b><span>Years in Frisco</span></div>\n        <div class="stat rv"><b>3,000+</b><span>Lives changed</span></div>\n        <div class="stat rv"><b>5.0</b><span>Google rating</span></div>\n        <div class="stat rv"><b>3</b><span>Levels in every class</span></div>\n    </div>\n'
PHONE_TRACK = "onclick=\"if(window.fbq)fbq('trackCustom','PhoneClick');\""

# The site's Google-rating chip, copied verbatim from index.html so the landing
# pages carry the same mark as every other page. Deliberately NOT a link: this
# page has one job, and a tap through to Google reviews is an exit.
_STAR = ('<svg viewBox="0 0 24 24"><path d="M12 2l3 7 7 .6-5.3 4.6L18.5 22 12 18'
         'l-6.5 4 1.8-7.8L2 9.6 9 9z"/></svg>')
STARS = f'<span class="stars" aria-hidden="true">{_STAR * 5}</span>'

# Same embed the other eight pages use, same place ID. src (not data-src), so
# the UTM pass-through in inject-pixel.js — which only rewrites data-src on
# leadconnectorhq frames — never touches it.
MAP_SRC = ("https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3344.9875647886857"
           "!2d-96.89026308820058!3d33.15034697358084!2m3!1f0!2f0!3f0!3m2!1i1024!2i768"
           "!4f13.1!3m3!1m2!1s0x864c3a240f77e3f7%3A0x9f460209df528d6e"
           "!2sBlack%20Iron%20Athletics!5e0!3m2!1sen!2sus!4v1737509000000!5m2!1sen!2sus")

MAP = f'''    <div class="map-section" aria-label="Our location on Google Maps">
        <iframe
            src="{MAP_SRC}"
            title="Black Iron Athletics location on Google Maps"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
'''


def e(s):
    """Escape, then restore the typographic marks the handbook requires."""
    s = html.escape(str(s), quote=False)
    return (s.replace("'", "&rsquo;").replace('"', "&rdquo;")
             .replace("&amp;rsquo;", "&rsquo;").replace("&amp;", "&amp;"))


def calendar(n, head, sub, anchor):
    return f'''            <div class="bookwrap rv rv-d2" id="{anchor}">
                <span class="book-head">{e(head)}</span>
                <p class="book-sub">{e(sub)}</p>
                <iframe
                    data-src="{CAL}"
                    id="aOyy4UPbwziVvHz35TCU_bts{n}"
                    title="Book a free consult at Black Iron Athletics"
                    loading="lazy" scrolling="no" allow="payment"></iframe>
                <p class="book-fallback">Calendar not loading? <a href="{PHONE_HREF}" {PHONE_TRACK}>Call {PHONE_TEXT}</a>.</p>
            </div>'''


HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!-- CONTRACT: keep this exact viewport tag — inject-pixel.js insertion marker -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex,follow">
    <title>{meta_title}</title>
    <meta name="description" content="{meta_description}">
    <meta name="geo.region" content="US-TX">
    <meta name="geo.placename" content="Frisco">
    <meta name="geo.position" content="33.15035;-96.89026">
    <meta property="og:title" content="{og_title}">
    <meta property="og:description" content="{meta_description}">
    <meta property="og:url" content="https://www.blackironathletics.com/{slug}">
    <meta property="og:image" content="https://www.blackironathletics.com/images/social/{share}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Members training on the floor at Black Iron Athletics in Frisco, Texas. We help everyday people become everyday athletes.">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Black Iron Athletics">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{og_title}">
    <meta name="twitter:description" content="{meta_description}">
    <meta name="twitter:image" content="https://www.blackironathletics.com/images/social/{share}">
    <link rel="icon" type="image/png" href="/images/anvil-favicon.png">
    <link rel="apple-touch-icon" href="/images/anvil-favicon.png">
    <meta name="theme-color" content="#000000">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet"></noscript>
    <link rel="stylesheet" href="/css/bia.css">
    <style>
    /* ── Landing page chrome. Deliberately not the site nav: this page has
          no menu, no hamburger and no thumb bar, so the only exits are
          booking, calling, or closing the tab. ─────────────────────────── */
    .lp-bar{{position:sticky;top:0;z-index:60;background:rgba(0,0,0,.92);
      backdrop-filter:blur(8px);border-bottom:1px solid var(--steel-line)}}
    .lp-bar-in{{display:flex;align-items:center;justify-content:space-between;
      gap:16px;padding:14px clamp(16px,4vw,40px);max-width:1240px;margin:0 auto}}
    .lp-bar img{{height:34px;width:auto;display:block}}
    .lp-call{{display:inline-flex;align-items:center;gap:9px;color:var(--white);
      font-weight:900;font-size:.86rem;letter-spacing:.06em;white-space:nowrap}}
    .lp-call svg{{flex:0 0 auto}}
    @media(max-width:420px){{.lp-call span{{display:none}}}}

    /* Warm arrival. Hidden unless the capture page sent them, so a cold
       visitor and a no-JS visitor both see the page exactly as before. */
    .warmbar{{display:none;background:var(--coal);border-bottom:1px solid var(--steel-line)}}
    .warmbar.on{{display:block}}
    .warmbar-in{{display:flex;align-items:center;justify-content:space-between;gap:16px;
      flex-wrap:wrap;padding:16px clamp(16px,4vw,40px);max-width:1240px;margin:0 auto}}
    .warmbar p{{margin:0;color:var(--white);font-weight:700;font-size:.98rem}}
    .warmbar p span{{display:block;font-weight:400;color:var(--gray);font-size:.9rem;margin-top:3px}}
    .warmbar .btn{{flex:0 0 auto}}
    .hero h1{{font-size:clamp(2.2rem,5.4vw,4.2rem)}}
    /* The review is the proof that travels furthest, so it is sized to be seen. */
    .trust-lg{{gap:14px;padding:15px 22px;font-size:1.3rem}}
    .trust-lg .stars svg{{width:25px;height:25px}}
    .trust-lg b{{font-weight:900}}
    .trust-lg span{{font-weight:600;color:var(--gray);font-size:1rem}}
    @media(max-width:400px){{.trust-lg{{font-size:1.15rem;padding:13px 18px}}
      .trust-lg .stars svg{{width:21px;height:21px}}}}
    .hero-short{{padding-top:clamp(46px,7vw,86px)}}
    /* The rating chip is the site component. The sentence that used to sit in
       .trust moves below it, plain, so the proof reads first. */

    /* Mike's note. Coal ground, so --hole follows or outlined type inside
       would show a black interior on coal. */
    .note{{background:var(--coal);--hole:var(--coal)}}
    .note-in{{display:grid;gap:30px;align-items:center;grid-template-columns:1fr}}
    @media(min-width:820px){{.note-in{{grid-template-columns:240px 1fr;gap:44px}}}}
    .note-img img{{width:100%;max-width:240px;border:1px solid var(--steel-line);
      filter:grayscale(1) contrast(1.06) brightness(.94)}}
    .note-body p{{margin-bottom:15px;max-width:62ch}}
    .note-body p:last-of-type{{margin-bottom:0}}
    .note-sig{{display:block;margin-top:20px;font-weight:900;font-size:.88rem;
      letter-spacing:.06em;text-transform:uppercase;color:var(--yellow)}}

    /* Stakes. What it costs to do nothing, stated once and quietly. */
    .stake-grid{{display:grid;gap:1px;background:var(--steel-line);
      border:1px solid var(--steel-line);margin-top:34px;grid-template-columns:1fr}}
    @media(min-width:780px){{.stake-grid{{grid-template-columns:repeat(3,1fr)}}}}
    .stake{{background:var(--black);padding:30px 26px}}
    .stake h3{{margin:0 0 10px;font-size:1.06rem}}
    .stake p{{margin:0;color:var(--gray);font-size:.95rem}}

    /* Booking calendar. Full width and tall: the owner found the first pass
       cramped, and this is the only thing on the page that has a job. */
    .bookwrap{{border:1px solid var(--steel-line);background:var(--coal);
      padding:clamp(18px,3vw,34px);margin-top:36px}}
    .bookwrap .book-head{{display:block;font-size:.74rem;font-weight:700;
      letter-spacing:.16em;text-transform:uppercase;color:var(--yellow);margin-bottom:8px}}
    .bookwrap .book-sub{{margin:0 0 22px;font-size:.96rem;color:var(--gray);max-width:60ch}}
    .bookwrap iframe{{display:block;width:100%;min-height:900px;border:0;background:var(--black)}}
    @media(max-width:600px){{.bookwrap iframe{{min-height:1000px}}}}
    .book-fallback{{margin:16px 0 0;font-size:.88rem;color:var(--gray)}}
    .final .bookwrap{{text-align:left;max-width:none}}

    .mission-list{{list-style:none;margin:30px 0 0;padding:0;display:grid;gap:1px;
      background:var(--steel-line);border:1px solid var(--steel-line)}}
    @media(min-width:780px){{.mission-list{{grid-template-columns:repeat(3,1fr)}}}}
    .mission-list li{{background:var(--black);padding:26px 24px;color:var(--white);
      font-weight:700;font-size:1.02rem}}
    .mission-list li::before{{content:"";display:block;width:26px;height:3px;
      background:var(--yellow);margin-bottom:14px}}
    .cmd-where{{margin-top:22px;padding-top:20px;border-top:1px solid var(--steel-line);
      color:var(--gray);font-size:.92rem}}
    .cmd-where a{{color:var(--white);font-weight:700}}
    /* Google's frame paints white before it draws. On a black page that is a
       420px flash on a slow phone, so hold black underneath it. */
    .map-section,.map-section iframe{{background:var(--black)}}
    .map-section{{border-top:1px solid var(--steel-line);
      border-bottom:1px solid var(--steel-line)}}
    @media(max-width:600px){{.map-section iframe{{height:320px}}}}
    /* Three cards, not the stylesheet default of four. A class, not an inline
       style: inline beats the mobile media query in bia.css and pushed the
       third card off a 390px screen. */
    .price-grid.three{{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:900px){{.price-grid.three{{grid-template-columns:1fr 1fr}}}}
    @media(max-width:640px){{.price-grid.three{{grid-template-columns:1fr}}}}
    .price-notes b{{color:var(--white)}}
    .pcard.start{{background:var(--coal)}}
    .pnum.once{{font-size:clamp(2rem,2.8vw,2.7rem)}}
    .pnum.once small{{display:block;font-size:.8rem;font-weight:700;letter-spacing:.1em;
      text-transform:uppercase;color:var(--gray);margin-top:8px}}

    /* Landing footer. Address, phone, and the legal links ad platforms
       expect. No navigation. */
    .lp-foot{{border-top:1px solid var(--steel-line);background:var(--black);
      padding:44px clamp(16px,4vw,40px) 56px;text-align:center}}
    .lp-foot p{{margin:0 0 10px;color:var(--gray);font-size:.9rem}}
    .lp-foot a{{color:var(--gray)}}
    .lp-foot .lp-foot-legal{{margin-top:18px;font-size:.8rem;color:var(--gray)}}
    </style>
    <script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <header class="lp-bar">
        <div class="lp-bar-in">
            <img src="/images/logos/logo.png" alt="Black Iron Athletics" width="150" height="34">
            <a class="lp-call" href="{phone_href}" {phone_track}><svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6.5 2.5 8.2 6l-1.7 1.6a11 11 0 0 0 4.9 4.9L13 10.8l3.5 1.7v3.2c0 .6-.5 1-1.1 1A13.6 13.6 0 0 1 2.3 3.6c0-.6.4-1.1 1-1.1h3.2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span>{phone_text}</span></a>
        </div>
    </header>
'''

FOOT = '''
    <footer class="lp-foot">
        <p><b style="color:var(--white)">Black Iron Athletics</b></p>
        <p>279 Main St, Suite 122, Frisco, TX 75036</p>
        <p><a href="{phone_href}" {phone_track}>{phone_text}</a></p>
        <p class="lp-foot-legal">Veteran-owned &middot; Est. 2013 &middot;
           <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
    </footer>

<script>
/* Reveal-on-scroll, matched to the site's own .rv/.on behaviour. */
(function(){{
  var els=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)){{els.forEach(function(e){{e.classList.add('on');}});return;}}
  var io=new IntersectionObserver(function(en){{en.forEach(function(x){{
    if(x.isIntersecting){{x.target.classList.add('on');io.unobserve(x.target);}}}});}},
    {{rootMargin:'0px 0px -8% 0px'}});
  els.forEach(function(e){{io.observe(e);}});
}})();
</script>
<script>
/* Booking calendar: lazy load, and rebuild the funnel events that the
   outbound booking link used to fire. data-src (not src) is what the UTM
   pass-through in inject-pixel.js looks for, so the booking stays
   attributable to the ad set that earned it. Do not change it to src. */
(function () {{
  var frames = [].slice.call(document.querySelectorAll('.bookwrap iframe[data-src]'));
  if (!frames.length) return;
  var fired = {{}};
  function once(n, custom) {{
    if (fired[n]) return; fired[n] = true;
    if (typeof fbq === 'function') fbq(custom ? 'trackCustom' : 'track', n);
  }}
  function activate(f) {{ if (!f.src && f.dataset.src) {{ f.src = f.dataset.src; f.dataset.loadedAt = String(Date.now()); }} }}
  if ('IntersectionObserver' in window) {{
    var io = new IntersectionObserver(function (en) {{
      en.forEach(function (x) {{ if (x.isIntersecting) {{ activate(x.target); io.unobserve(x.target); }} }});
    }}, {{ rootMargin: '400px 0px' }});
    frames.forEach(function (f) {{ io.observe(f); }});
    var seen = new IntersectionObserver(function (en) {{
      en.forEach(function (x) {{ if (x.isIntersecting && x.intersectionRatio >= 0.4) {{
        once('CalendarView', true); seen.unobserve(x.target); }} }});
    }}, {{ threshold: [0.4] }});
    frames.forEach(function (f) {{ seen.observe(f); }});
  }} else {{ frames.forEach(activate); }}
  window.fpBookingMessages = [];
  window.addEventListener('message', function (ev) {{
    var host = ''; try {{ host = new URL(ev.origin).hostname; }} catch (e) {{ return; }}
    if (!/(^|\\.)leadconnectorhq\\.com$|(^|\\.)msgsndr\\.com$/.test(host)) return;
    window.fpBookingMessages.push({{ t: Date.now(), origin: ev.origin, data: ev.data }});
    var raw = ''; try {{ raw = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data); }} catch (e) {{}}
    if (/appointment|booked|booking[_-]?(success|complete)|slot[_-]?selected|scheduled/i.test(raw)) {{
      once('InitiateCheckout');
      /* Schedule is NOT fired here. It used to be, and a completed booking
         then reported it twice: once from this listener and again when the
         calendar landed the visitor on /thank-you, which fires it too. The
         thank-you page is the better of the two signals because it also
         frame-busts to top, so it fires whether the calendar redirects the
         iframe or the whole window. One booking, one Schedule. */
      return;
    }}
    var oldest = frames.reduce(function (a, f) {{
      var v = Number(f.dataset.loadedAt || 0); return v && (!a || v < a) ? v : a; }}, 0);
    if (oldest && Date.now() - oldest > 2500) once('InitiateCheckout');
  }}, false);
}})();
</script>
<script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript" defer></script>
</body>
</html>
'''

PRICING = '''
    <section class="sect alt">
        <div class="wrap">
            <span class="eyebrow rv">Membership</span>
            <h2 class="rv">What it costs.<br><span class="outline">In writing.</span></h2>
            <p class="lead rv rv-d1">No discount, no promotion, no price that changes if you hesitate.</p>
            <div class="price-grid three rv rv-d2">
                <div class="pcard start">
                    <span class="tag">Start here</span>
                    <h3>Foundations</h3>
                    <div class="pnum once">$360<span>&nbsp;or&nbsp;$720</span><small>One time, never again</small></div>
                    <ul>
                        <li>One-on-one with a coach before any class</li>
                        <li>Body composition scan and movement analysis</li>
                        <li>One week and three sessions, or two weeks and six</li>
                        <li>Your coach recommends which at the consult</li>
                    </ul>
                </div>
                <div class="pcard">
                    <h3>Standard</h3>
                    <div class="pnum">$200<span>/mo</span></div>
                    <ul>
                        <li>3 Strength &amp; Conditioning classes per week</li>
                        <li>A coach on every rep</li>
                        <li>Monthly body composition scan</li>
                        <li>Community events</li>
                    </ul>
                </div>
                <div class="pcard pop">
                    <span class="tag">Most popular</span>
                    <h3>Unlimited</h3>
                    <div class="pnum">$240<span>/mo</span></div>
                    <ul>
                        <li>Unlimited Strength &amp; Conditioning classes</li>
                        <li>Everything in Standard</li>
                        <li>Open gym access seven days a week</li>
                    </ul>
                </div>
            </div>
            <div class="price-notes rv rv-d3">
                <p><b>Military, first responders and teachers:</b> 5% off any membership.</p>
                <p><b>Foundations is once.</b> It is how everybody starts, and you never pay it again.</p>
                <p><b>Commitment:</b> 90 days to start, then month to month, cancel with 30 days notice.</p>
            </div>
        </div>
    </section>
'''


def build(slug, c, share, note_paras):
    """Page body follows the five paragraph order: situation, mission,
    execution (including a literal walk-through of the consult), administration
    (price, then the cost of waiting), then command and control."""
    h = HEAD.format(meta_title=e(c["meta_title"]), meta_description=e(c["meta_description"]),
                    og_title=e(c["og_title"]), slug=slug, share=share,
                    phone_href=PHONE_HREF, phone_text=PHONE_TEXT, phone_track=PHONE_TRACK)
    P = ['    <main id="main-content">\n']

    # ── warm arrival, for people arriving from the capture page ───────
    P.append('''    <div class="warmbar" id="warmbar">
        <div class="warmbar-in">
            <p><span id="warmgreet">Got it. We have your details.</span>
               <span>Your spot is not held yet. Pick a time to lock it in.</span></p>
            <a href="#book" class="btn btn-y">Pick your time</a>
        </div>
    </div>
''')

    # ── hero: the situation in one line, and the ask ──────────────────
    P.append(f'''    <section class="hero hero-short">
        <div class="hero-bg">
            <img class="ph-soft" src="/images/training/group-training.webp" alt="A coach working with members on the floor at Black Iron Athletics in Frisco" fetchpriority="high" width="1024" height="683">
        </div>
        <div class="hero-in wrap">
            <span class="eyebrow eyebrow-y rv">Frisco, TX &middot; Veteran-owned &middot; Est. 2013</span>
            <h1 class="rv">{e(c["hero_h1_line1"])}<br><span class="outline">{e(c["hero_h1_line2"])}</span></h1>
            <p class="lead rv rv-d1">{e(c["hero_lead"])}</p>
            <div class="hero-ctas rv rv-d2">
                <a href="#book" class="btn btn-y">{e(c["hero_cta"])}</a>
            </div>
            <p class="trust trust-lg rv rv-d3">{STARS}<b>5.0</b> <span>on Google</span></p>
        </div>
    </section>
''')

    # ── the homepage band: proof and rhythm before the first block of prose ──
    P.append(BAND)

    # ── S: situation ──────────────────────────────────────────────────
    sit = "".join(f'            <p class="lead rv rv-d1">{e(x)}</p>\n'
                  for x in c["situation_body"].split("\n\n") if x.strip())
    P.append(f'''    <section class="sect">
        <div class="wrap">
            <span class="eyebrow rv">Where you are</span>
            <h2 class="rv">{e(c["situation_h2"])}</h2>
{sit}        </div>
    </section>
''')

    # ── M: mission ────────────────────────────────────────────────────
    pts = "".join(f'                <li>{e(x)}</li>\n' for x in c["mission_points"])
    P.append(f'''    <section class="sect alt">
        <div class="wrap">
            <span class="eyebrow rv">The mission</span>
            <h2 class="rv">{e(c["mission_h2"])}</h2>
            <p class="lead rv rv-d1">{e(c["mission_body"])}</p>
            <ul class="mission-list rv rv-d2">
{pts}            </ul>
        </div>
    </section>
''')

    # ── E: execution, how it gets done ────────────────────────────────
    pil = "".join(f'''                <div class="lvl">
                    <h3>{e(x["title"])}</h3>
                    <p>{e(x["body"])}</p>
                </div>
''' for x in c["execution_pillars"])
    P.append(f'''    <section class="sect">
        <div class="wrap">
            <span class="eyebrow rv">How it works</span>
            <h2 class="rv">{e(c["execution_h2"])}</h2>
            <p class="lead rv rv-d1">{e(c["execution_body"])}</p>
            <div class="lvl-grid rv rv-d2">
{pil}            </div>
        </div>
    </section>
''')

    # ── E: the consult, step by step, then the calendar ───────────────
    steps = "".join(f'''                <div class="step">
                    <em>0{i+1}</em>
                    <h3>{e(s["title"])}</h3>
                    <p>{e(s["body"])}</p>
                </div>
''' for i, s in enumerate(c["consult_steps"]))
    P.append(f'''    <section class="sect alt" id="how">
        <div class="wrap">
            <span class="eyebrow rv">Your first twenty minutes</span>
            <h2 class="rv">{e(c["consult_h2"])}</h2>
            <p class="lead rv rv-d1">{e(c["consult_lead"])}</p>
            <div class="steps rv rv-d2">
{steps}            </div>
{calendar(1, c["booking_head"], c["booking_sub"], "book")}
        </div>
    </section>
''')

    # ── A: administration. Price first, then the cost of waiting ──────
    P.append(PRICING)
    wait = "".join(f'''                <div class="stake">
                    <h3>{e(x["title"])}</h3>
                    <p>{e(x["body"])}</p>
                </div>
''' for x in c["waiting_points"])
    P.append(f'''    <section class="sect">
        <div class="wrap">
            <span class="eyebrow rv">The other price</span>
            <h2 class="rv">{e(c["waiting_h2"])}</h2>
            <p class="lead rv rv-d1">{e(c["waiting_lead"])}</p>
            <div class="stake-grid rv rv-d2">
{wait}            </div>
        </div>
    </section>
''')

    # ── C: command and control. Who you deal with, where we are ───────
    cmd = "".join(f'                    <p>{e(x)}</p>\n'
                  for x in c["command_body"].split("\n\n") if x.strip())
    P.append(f'''    <section class="sect note">
        <div class="wrap">
            <span class="eyebrow rv">Who you are dealing with</span>
            <h2 class="rv">{e(c["command_h2"])}</h2>
            <div class="note-in" style="margin-top:30px">
                <div class="note-img rv">
                    <img src="/images/team/owner-headcoach-mike.webp" alt="Mike Manning, owner and head coach of Black Iron Athletics" loading="lazy" width="240" height="360">
                </div>
                <div class="note-body rv rv-d1">
{cmd}                    <span class="note-sig">Mike Manning, owner and head coach</span>
                    <p class="cmd-where">279 Main St, Suite 122, Frisco, TX 75036<br>
                       Free parking directly out front &middot;
                       <a href="{PHONE_HREF}" {PHONE_TRACK}>{PHONE_TEXT}</a></p>
                </div>
            </div>
        </div>
    </section>
''')
    # The map sits with the address, not at the very end. The last thing on the
    # page stays the booking calendar.
    P.append(MAP)

    # ── FAQ ───────────────────────────────────────────────────────────
    fa = "".join(f'''                <details>
                    <summary>{e(f["q"])}</summary>
                    <p>{e(f["a"])}</p>
                </details>
''' for f in c["faq"])
    P.append(f'''    <section class="sect alt">
        <div class="wrap">
            <span class="eyebrow rv">Before you book</span>
            <h2 class="rv">{e(c["faq_h2"])}</h2>
            <div class="faq rv rv-d1">
{fa}            </div>
        </div>
    </section>
''')

    # ── close ─────────────────────────────────────────────────────────
    P.append(f'''    <section class="final">
        <div class="final-in wrap">
            <h2 class="rv" style="text-align:center">{e(c["final_h2_line1"])}<br><span class="outline">{e(c["final_h2_line2"])}</span></h2>
            <p class="lead rv rv-d1" style="text-align:center">{e(c["final_lead"])}</p>
{calendar(2, c["booking_head"], c["booking_sub"], "book-close")}
        </div>
    </section>

    </main>
''')
    P.append(WARM)
    P.append(LEAD)
    tail = FOOT.format(phone_href=PHONE_HREF, phone_text=PHONE_TEXT, phone_track=PHONE_TRACK)
    return h + "".join(P) + tail


if __name__ == "__main__":
    decks = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "landing-copy.json")))
    for key, c in decks.items():
        # The two live ad pages own real slugs; the other decks stay drafts.
        # Passing the slug (not the deck key) keeps og:url honest.
        slug = SLUGS.get(key, f"lp-{key}")
        out = build(slug, c, SHARE_CARD, None)
        p = os.path.join(REPO, f"{slug}.html")
        open(p, "w").write(out)
        print(f"  {os.path.basename(p):26s} {len(out)//1024} KB")
