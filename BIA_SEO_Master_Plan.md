# Black Iron Athletics — Master SEO Plan
# Paste this entire file into Claude Code and say: "Execute this SEO plan on my website codebase."

---

## CONTEXT FOR CLAUDE CODE

You are helping optimize the website for **Black Iron Athletics** (blackironathletics.com), a veteran-owned functional fitness gym in Frisco, Texas. The site is built on a modern stack. The owner's name is Michael. The gym was founded in 2013 and serves the Frisco/DFW area.

**Current SEO status (from Google Search Console):**
- Average position: 10.7 over 3 months (briefly hit ~5-6 in mid-February)
- CTR: 3.0%
- Impressions: 17,227
- Clicks: 517

**Goal:** Rank page 1 (positions 1-5) for high-intent local gym searches in Frisco, TX.

---

## PHASE 1 — TECHNICAL SEO AUDIT & FIXES

### 1.1 — Meta Titles & Descriptions
Audit every page and rewrite meta titles and descriptions using this formula:

**Homepage:**
```
Title: Black Iron Athletics | Veteran-Owned Gym in Frisco, TX
Description: Frisco's premier veteran-owned gym. Expert coaching, functional fitness, and a community that shows up for you. Try a free class today — no commitment required.
```

**Group Fitness / CrossFit page:**
```
Title: Group Fitness Classes in Frisco, TX | Black Iron Athletics
Description: High-energy group fitness classes for all levels in Frisco, TX. Strength, conditioning, and functional training led by certified coaches. Book your free class.
```

**Pricing page:**
```
Title: Gym Membership Pricing in Frisco, TX | Black Iron Athletics
Description: Flexible month-to-month gym memberships in Frisco, TX. Military, veteran, first responder, and teacher discounts available. No long-term contracts. Ever.
```

**Free Consultation page:**
```
Title: Free Gym Consultation in Frisco, TX | Black Iron Athletics
Description: Not sure where to start? Book a free no-pressure consultation with our coaches at Black Iron Athletics in Frisco, TX. We'll build a plan around your goals.
```

**Nutrition page:**
```
Title: Nutrition Coaching in Frisco, TX | Black Iron Body | Black Iron Athletics
Description: Science-backed nutrition coaching from Black Iron Athletics in Frisco, TX. Real food, sustainable habits, and expert guidance to fuel your performance.
```

**Classes page:**
```
Title: Fitness Class Schedule | Frisco, TX | Black Iron Athletics
Description: View the full class schedule at Black Iron Athletics in Frisco, TX. Morning, midday, and evening classes available. Expert-coached. Beginner-friendly.
```

### 1.2 — Add Structured Data (Schema Markup)
Add the following JSON-LD schema to the `<head>` of the homepage. This helps Google display rich results (stars, hours, address) directly in search.

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://blackironathletics.com",
  "name": "Black Iron Athletics",
  "description": "Veteran-owned functional fitness gym in Frisco, Texas offering group fitness classes, personal training, and nutrition coaching.",
  "url": "https://blackironathletics.com",
  "telephone": "(972) 785-7036",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "279 Main St, Suite 122",
    "addressLocality": "Frisco",
    "addressRegion": "TX",
    "postalCode": "75036",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 33.1584,
    "longitude": -96.8236
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "05:15",
      "closes": "19:30"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "08:30",
      "closes": "10:30"
    }
  ],
  "priceRange": "$$",
  "image": "https://blackironathletics.com/og-image.jpg",
  "sameAs": [
    "https://www.facebook.com/blackironathletics",
    "https://www.instagram.com/blackironathletics"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Gym Memberships",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Group Fitness Classes"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Nutrition Coaching"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Free Consultation"
        }
      }
    ]
  }
}
</script>
```

### 1.3 — Add Open Graph & Twitter Card Tags
Add to the `<head>` of every page for better social sharing signals:

```html
<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:title" content="Black Iron Athletics | Veteran-Owned Gym in Frisco, TX" />
<meta property="og:description" content="Frisco's premier veteran-owned gym. Expert coaching, functional fitness, and a community that shows up for you." />
<meta property="og:url" content="https://blackironathletics.com" />
<meta property="og:image" content="https://blackironathletics.com/og-image.jpg" />
<meta property="og:locale" content="en_US" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Black Iron Athletics | Veteran-Owned Gym in Frisco, TX" />
<meta name="twitter:description" content="Frisco's premier veteran-owned gym. Expert coaching and a community that pushes you." />
<meta name="twitter:image" content="https://blackironathletics.com/og-image.jpg" />
```

### 1.4 — Canonical Tags
Ensure every page has a canonical tag to prevent duplicate content issues:
```html
<link rel="canonical" href="https://blackironathletics.com/[page-slug]" />
```

### 1.5 — robots.txt & Sitemap
- Verify a `sitemap.xml` exists at `https://blackironathletics.com/sitemap.xml`
- If not, generate one that includes all public pages
- Verify `robots.txt` is not accidentally blocking Googlebot
- Submit sitemap to Google Search Console if not already done

---

## PHASE 2 — ON-PAGE KEYWORD OPTIMIZATION

### 2.1 — Primary Target Keywords (High Intent, Local)
Optimize existing pages around these keywords:

| Page | Primary Keyword | Secondary Keywords |
|------|----------------|-------------------|
| Homepage | gym in Frisco TX | veteran owned gym Frisco, functional fitness Frisco TX |
| Group Fitness | group fitness classes Frisco TX | CrossFit Frisco TX, functional training Frisco |
| Pricing | gym membership Frisco TX | affordable gym Frisco, no contract gym Frisco TX |
| Classes | fitness classes Frisco TX | gym class schedule Frisco |
| Nutrition | nutrition coaching Frisco TX | nutrition program Frisco gym |
| Blog | best gym in Frisco TX | how to choose a gym Frisco |
| Free Consult | free gym consultation Frisco TX | try a gym free Frisco TX |

### 2.2 — Homepage H1/H2 Hierarchy
Restructure heading tags to include keywords naturally:

```
H1: Veteran-Owned Gym in Frisco, TX
H2: Group Fitness Classes for Every Level
H2: Expert Coaches. Real Results. Real Community.
H2: Flexible Gym Memberships — No Long-Term Contracts
H2: Nutrition Coaching That Actually Works
```

### 2.3 — Add "Frisco, TX" to Key Body Copy
Audit every page — the city name "Frisco, TX" or "Frisco, Texas" should appear naturally in:
- First paragraph of body copy
- At least one H2
- Image alt text
- Footer address block

### 2.4 — Image Alt Text
Audit all images and add descriptive alt text:
```
Bad:  alt="image1.jpg"
Good: alt="Group fitness class at Black Iron Athletics gym in Frisco TX"
Good: alt="Veteran-owned gym in Frisco Texas - strength training class"
Good: alt="Black Iron Athletics members doing functional fitness workout Frisco TX"
```

---

## PHASE 3 — CONTENT EXPANSION (New Pages to Create)

These pages directly target searches with high local intent that you're currently missing:

### 3.1 — New Page: Personal Training Frisco TX
**URL:** `/personal-training`
**Target keyword:** "personal training Frisco TX"
**Content outline:**
- H1: Personal Training in Frisco, TX | Black Iron Athletics
- What makes our coaches different (veteran background, certifications)
- How 1-on-1 training works at BIA
- Who it's for (beginners, athletes returning from injury, performance goals)
- CTA: Book a free consultation

### 3.2 — New Page: Veteran & Military Gym Frisco TX
**URL:** `/veteran-military-gym-frisco`
**Target keyword:** "veteran gym Frisco TX" / "military gym Frisco"
**Content outline:**
- H1: Veteran & Military Gym in Frisco, TX
- Michael's story — Marine Corps background, why he built BIA
- Military/Veteran discount details
- The culture: discipline, community, no BS
- CTA: Book free class

### 3.3 — New Page: Beginner's Guide to Working Out Frisco TX
**URL:** `/beginners-gym-frisco-tx`
**Target keyword:** "beginner gym Frisco TX" / "how to start working out Frisco"
**Content outline:**
- H1: New to the Gym? Start Here | Black Iron Athletics Frisco
- Common fears and how BIA handles them
- What your first class looks like step by step
- Scalable workouts explained
- CTA: Book free class — zero pressure

### 3.4 — Expand Blog Strategy
Create 1 blog post per month targeting long-tail local searches:

**Priority posts to write:**
1. "How to Choose a Gym in Frisco, TX" *(already exists — expand and update it)*
2. "Best Functional Fitness Gyms in Frisco, TX" *(rank for competitor searches)*
3. "Workout Programs for Beginners in Frisco, TX"
4. "Is CrossFit Right for Me? A Guide for Frisco Athletes"
5. "Nutrition Tips for Frisco TX Gym Members"
6. "What to Expect Your First Week at Black Iron Athletics"

---

## PHASE 4 — LOCAL SEO SIGNALS

### 4.1 — NAP Consistency Check
Audit that Name, Address, Phone (NAP) is **identical** everywhere:
```
Black Iron Athletics
279 Main St, Suite 122
Frisco, TX 75036
(972) 785-7036
```
Check these platforms and fix any discrepancies:
- Google Business Profile
- Yelp
- Facebook
- Apple Maps
- Bing Places
- Foursquare
- YellowPages

### 4.2 — Footer Update
Ensure the site footer contains the full NAP + a link to Google Maps:
```html
<footer>
  <p>Black Iron Athletics</p>
  <p>279 Main St, Suite 122, Frisco, TX 75036</p>
  <p>(972) 785-7036</p>
  <a href="https://maps.google.com/?q=Black+Iron+Athletics+Frisco+TX">Get Directions</a>
</footer>
```

### 4.3 — Embed Google Map on Contact/About Page
Add an embedded Google Map iframe to your contact or about page. This is a direct local SEO signal.

---

## PHASE 5 — SITE PERFORMANCE

### 5.1 — Core Web Vitals Targets
Run the site through https://pagespeed.web.dev and fix any issues flagged.
Target scores:
- Mobile Performance: 85+
- Desktop Performance: 90+
- LCP (Largest Contentful Paint): under 2.5s
- CLS (Cumulative Layout Shift): under 0.1

### 5.2 — Image Optimization
- Convert all images to **WebP format**
- Add `width` and `height` attributes to all `<img>` tags to prevent layout shift
- Add `loading="lazy"` to all below-the-fold images
- Hero/above-fold image should use `loading="eager"` and be pre-loaded

### 5.3 — Mobile Optimization
- Confirm all pages pass Google's Mobile-Friendly Test
- Tap targets (buttons/links) should be at least 48x48px
- No horizontal scrolling on mobile

---

## PHASE 6 — QUICK WINS CHECKLIST

Run through these immediately after the technical fixes above:

- [ ] Add `<title>` and `<meta description>` to every page using Phase 1 copy
- [ ] Add LocalBusiness schema JSON-LD to homepage `<head>`
- [ ] Add canonical tags to every page
- [ ] Verify sitemap.xml exists and is submitted to Search Console
- [ ] Verify robots.txt is not blocking crawlers
- [ ] Add "Frisco, TX" naturally to first paragraph of every main page
- [ ] Fix all image alt text to include location + description
- [ ] Add full NAP to footer
- [ ] Embed Google Map on contact page
- [ ] Add Open Graph tags to every page

---

## WHAT THIS PLAN DOES NOT COVER (Do These Separately)

These require action **outside the codebase** — Claude Code can't do these for you:

1. **Google Business Profile** — Log in and ensure it's 100% complete with photos, posts, services, and Q&A answered. This is your #1 local ranking lever.
2. **Review Generation** — Actively ask members to leave Google reviews after great classes. Volume and recency matter.
3. **Backlinks** — Reach out to Frisco community sites, local news, DFW fitness directories for links back to your site.
4. **Social Signals** — Regular Instagram/Facebook posts with location tags reinforce local relevance.

---

*Generated for Black Iron Athletics | blackironathletics.com | Frisco, TX*
*Paste this file into Claude Code and say: "Execute this SEO plan on my website codebase."*
