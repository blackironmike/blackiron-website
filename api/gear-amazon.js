/**
 * gear-amazon.js
 * Live photo + price for the Amazon tiles on /gear and /programs.
 *
 * Amazon's Associates Operating Agreement: product images and prices shown on
 * our pages must come from the API and be refreshed at least every 24 hours.
 * This endpoint is the only place that happens. The response is cached at the
 * edge for an hour, then served stale while it refreshes for up to 22 more,
 * so nothing a visitor sees is ever older than 23 hours, and the Creators API
 * (1 request per second on new credentials) sees a handful of calls an hour.
 *
 * GET /api/gear-amazon?asins=B0113UZJE2,B09HM2TN5Z  (max 40)
 * Returns { items: { ASIN: { img, price, url } } }
 */

const TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const API = 'https://creatorsapi.amazon/catalog/v1/getItems';
const ASIN_RE = /^[A-Z0-9]{10}$/;

let cached = null;

async function token() {
  if (cached && Date.now() < cached.exp) return cached.token;
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'creatorsapi::default',
      client_id: process.env.AMAZON_CREATORS_CREDENTIAL_ID || '',
      client_secret: process.env.AMAZON_CREATORS_CREDENTIAL_SECRET || '',
    }),
  });
  if (!r.ok) throw new Error('token ' + r.status);
  const j = await r.json();
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return cached.token;
}

async function getItems(asins) {
  const t = await token();
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', 'x-marketplace': 'www.amazon.com' },
    body: JSON.stringify({
      itemIds: asins,
      itemIdType: 'ASIN',
      marketplace: 'www.amazon.com',
      partnerTag: process.env.AMAZON_ASSOCIATE_TAG,
      resources: ['images.primary.large', 'offersV2.listings.price', 'offersV2.listings.isBuyBoxWinner'],
    }),
  });
  if (!r.ok) throw new Error('getItems ' + r.status);
  const j = await r.json();
  const res = j.itemsResult || j.itemResults || {};
  return res.items || [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  const asins = String((req.query && req.query.asins) || '')
    .split(',').map((s) => s.trim().toUpperCase()).filter((s) => ASIN_RE.test(s));
  const unique = [...new Set(asins)].slice(0, 40);
  if (!unique.length) {
    res.status(400).json({ error: 'no asins' });
    return;
  }

  const items = {};
  try {
    for (let i = 0; i < unique.length; i += 10) {
      if (i) await sleep(1100); // stay under 1 request per second
      const batch = await getItems(unique.slice(i, i + 10));
      for (const it of batch) {
        const ls = (it.offersV2 && it.offersV2.listings) || [];
        const l = ls.find((x) => x.isBuyBoxWinner) || ls[0];
        const p = l && l.price && (l.price.money || l.price);
        items[it.asin] = {
          img: (it.images && it.images.primary && it.images.primary.large && it.images.primary.large.url) || null,
          price: p && typeof p.amount === 'number' ? p.amount : null,
          url: it.detailPageURL || null,
        };
      }
    }
  } catch (e) {
    // Return whatever we have; tiles without data stay plain links.
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    res.status(200).json({ items, partial: true });
    return;
  }

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=79200');
  res.status(200).json({ items });
}
