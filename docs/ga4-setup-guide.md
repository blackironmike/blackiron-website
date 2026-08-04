# GA4 Setup Guide — Michael’s Runbook

The site is already wired for Google Analytics: `inject-pixel.js` injects the
Google tag at build time whenever the `GA4_MEASUREMENT_ID` environment variable
is set. Your job is to create the GA4 property, grab the ID, and drop it into
Vercel. No code changes.

## 1. Create the GA4 property

1. Go to https://analytics.google.com and sign in with the business Google
   account (the one that owns the Google Business Profile).
2. Open Admin (gear icon, bottom left) → Create → Property.
3. Property name: `Black Iron Athletics`.
4. Reporting time zone: United States → Central Time. Currency: US Dollar.
5. Fill in the business details screens (industry: Fitness; size: small) and
   pick “Generate leads” as the objective. Create the property.

## 2. Add the web data stream

1. When prompted for a platform, choose Web.
2. Website URL: `https://www.blackironathletics.com`. Stream name:
   `Black Iron website`.
3. Leave enhanced measurement on.
4. Create the stream. Skip any “install the tag” instructions — the build
   handles that.

## 3. Copy the measurement ID

1. On the stream details page, copy the Measurement ID. It looks like
   `G-XXXXXXXXXX`.

## 4. Add the Vercel environment variable

1. Go to the Vercel dashboard → the blackironathletics.com project →
   Settings → Environment Variables.
2. Add a new variable: name `GA4_MEASUREMENT_ID`, value the `G-XXXXXXXXXX` ID
   from step 3.
3. Check all three environments: Production, Preview, Development.
4. Save.

## 5. Redeploy

1. Go to the project’s Deployments tab.
2. Open the latest production deployment → Redeploy (env vars only apply to
   new builds).
3. After the deploy finishes, visit the live site, then open GA4 → Reports →
   Realtime. You should see yourself as an active user within a minute.

## 6. Later: mark key events

Do this once GA4 has data flowing and the redesign’s tracking work lands.

1. The two actions that matter: the “book a consult” thank-you flow and lead
   modal opens.
2. Note: today those actions fire `InitiateCheckout` on the Meta pixel only —
   GA4 has no matching event yet. They need GA4 events added on the site
   before this step works.
3. Once those GA4 events exist: Admin → Data display → Events → toggle
   “Mark as key event” next to each one.

## 7. Link Search Console

1. In GA4: Admin → Product links → Search Console links → Link.
2. Choose the `blackironathletics.com` Search Console property and the web
   stream from step 2. Confirm.
3. This puts Google search queries and landing-page data inside GA4 reports.
