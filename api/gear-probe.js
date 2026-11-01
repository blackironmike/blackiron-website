/**
 * gear-probe.js
 * TEMPORARY, preview-only discovery tool for the Gear storefront build.
 * Answers: which Impact programs are we in, what do their catalogs hold,
 * and what does the Amazon Creators API return for a search or ASIN list.
 *
 * Safety:
 *   - Refuses to run in production (404). Previews sit behind Vercel
 *     deployment protection.
 *   - GET to Impact only (no link creation, nothing written). Amazon calls
 *     are read-only catalog lookups.
 *   - Never returns tokens, the account SID, or auth headers. Only product
 *     and program data, which is public on the brands' own sites anyway.
 *
 * Delete before merging to main.
 */

const IMPACT = 'https://api.impact.com/Mediapartners';
const AMZ_TOKEN = 'https://api.amazon.com/auth/o2/token';
const AMZ_API = 'https://creatorsapi.amazon/catalog/v1';
const TIMEOUT = 15000;

function withTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

async function impactGet(path) {
  const sid = process.env.IMPACT_ACCOUNT_SID;
  const tok = process.env.IMPACT_AUTH_TOKEN;
  if (!sid || !tok) return { status: 0, error: 'impact env missing' };
  const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
  const sep = path.includes('?') ? '&' : '?';
  const url = `${IMPACT}/${sid}/${path}`;
  const t = withTimeout(TIMEOUT);
  try {
    const r = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }, signal: t.signal });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: r.status, json, text: json ? undefined : text.slice(0, 300) };
  } catch (e) {
    return { status: 0, error: String(e).slice(0, 200) };
  } finally { t.done(); }
}

let amzTok = null;
async function amazonToken() {
  if (amzTok && Date.now() < amzTok.exp) return amzTok.token;
  const r = await fetch(AMZ_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'creatorsapi::default',
      client_id: process.env.AMAZON_CREATORS_CREDENTIAL_ID || '',
      client_secret: process.env.AMAZON_CREATORS_CREDENTIAL_SECRET || '',
    }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`token ${r.status} ${txt.slice(0, 200)}`);
  const j = JSON.parse(txt);
  amzTok = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return amzTok.token;
}

async function amazonCall(op, body) {
  const token = await amazonToken();
  const r = await fetch(`${AMZ_API}/${op}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-marketplace': 'www.amazon.com' },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  let json = null;
  try { json = JSON.parse(txt); } catch { /* */ }
  return { status: r.status, json, text: json ? undefined : txt.slice(0, 300) };
}

const AMZ_RESOURCES = [
  'itemInfo.title', 'itemInfo.byLineInfo', 'itemInfo.features',
  'images.primary.large', 'customerReviews.count', 'customerReviews.starRating',
  'offersV2.listings.price', 'offersV2.listings.availability', 'offersV2.listings.isBuyBoxWinner',
];

function slimAmazon(json) {
  const res = json?.searchResult ?? json?.itemsResult ?? json?.itemResults ?? {};
  const items = res.items ?? [];
  return {
    total: res.totalResultCount,
    errors: (res.errors ?? json?.errors ?? []).map(e => e.message || e.code),
    items: items.map(it => {
      const ls = it?.offersV2?.listings ?? [];
      const l = ls.find(x => x.isBuyBoxWinner) ?? ls[0];
      const p = l?.price?.money ?? l?.price;
      return {
        asin: it.asin,
        title: it?.itemInfo?.title?.displayValue,
        brand: it?.itemInfo?.byLineInfo?.brand?.displayValue,
        price: p?.amount ?? null,
        stars: it?.customerReviews?.starRating?.value ?? null,
        reviews: it?.customerReviews?.count ?? null,
        img: it?.images?.primary?.large?.url ?? null,
        url: it?.detailPageURL,
      };
    }),
  };
}

function slimImpactList(json, key) {
  const arr = json?.[key] ?? [];
  return arr;
}

module.exports = async (req, res) => {
  if (process.env.VERCEL_ENV === 'production') {
    res.status(404).send('Not found');
    return;
  }
  const q = req.query || {};
  const op = q.op || 'status';
  const out = { op };

  try {
    if (op === 'status') {
      out.impact = { sid: !!process.env.IMPACT_ACCOUNT_SID, token: !!process.env.IMPACT_AUTH_TOKEN };
      out.amazon = {
        id: !!process.env.AMAZON_CREATORS_CREDENTIAL_ID,
        secret: !!process.env.AMAZON_CREATORS_CREDENTIAL_SECRET,
        tag: !!process.env.AMAZON_ASSOCIATE_TAG,
        version: process.env.AMAZON_CREATORS_VERSION ? 'set' : 'missing',
      };
      const c = await impactGet('Campaigns?PageSize=200');
      out.campaignsStatus = c.status;
      out.campaigns = (c.json?.Campaigns ?? []).map(x => ({
        id: x.CampaignId, name: x.CampaignName, adv: x.AdvertiserName, status: x.ContractStatus,
        link: x.TrackingLink, url: x.CampaignUrl,
      }));
      if (!c.json) out.campaignsRaw = c.text || c.error;
    } else if (op === 'catalogs') {
      const c = await impactGet('Catalogs?PageSize=200');
      out.status = c.status;
      out.catalogs = (c.json?.Catalogs ?? []).map(x => ({
        id: x.Id, name: x.Name, adv: x.AdvertiserName, campaign: x.CampaignName, campaignId: x.CampaignId,
        items: x.NumberOfItems, updated: x.DateLastUpdated,
      }));
      if (!c.json) out.raw = c.text || c.error;
    } else if (op === 'items') {
      const id = String(q.catalog || '').replace(/\D/g, '');
      const page = String(q.page || '1').replace(/\D/g, '') || '1';
      const kw = q.q ? `&Keyword=${encodeURIComponent(q.q)}` : '';
      const c = await impactGet(`Catalogs/${id}/Items?PageSize=${Math.min(200, Number(q.size) || 100)}&Page=${page}${kw}`);
      out.status = c.status;
      out.total = c.json?.['@total'];
      out.items = (c.json?.Items ?? []).map(x => ({
        id: x.CatalogItemId || x.Id, name: x.Name, price: x.CurrentPrice, orig: x.OriginalPrice,
        stock: x.StockAvailability, img: x.ImageUrl, url: x.Url, cat: x.Category, sub: x.SubCategory,
        mfr: x.Manufacturer, gtin: x.Gtin,
      }));
      if (!c.json) out.raw = c.text || c.error;
    } else if (op === 'list') {
      // compact, filtered, de-duplicated listing across all pages of one catalog
      const id = String(q.catalog || '').replace(/\D/g, '');
      const terms = String(q.q || '').toLowerCase().split('|').filter(Boolean);
      const seen = new Set();
      const lines = [];
      for (let page = 1; page <= 40; page++) {
        const c = await impactGet(`Catalogs/${id}/Items?PageSize=200&Page=${page}`);
        const items = c.json?.Items ?? [];
        for (const x of items) {
          const name = String(x.Name || '');
          const base = name.replace(/\s+-\s+[^-]*$/, '').replace(/^[^:]+:\s*/, '');
          if (terms.length && !terms.some(t => name.toLowerCase().includes(t))) continue;
          if (q.min && Number(x.CurrentPrice) < Number(q.min)) continue;
          if (q.instock && x.StockAvailability !== 'InStock') continue;
          if (seen.has(base)) continue;
          seen.add(base);
          lines.push([x.CatalogItemId || x.Id, x.CurrentPrice, x.OriginalPrice || '', x.StockAvailability === 'InStock' ? 'in' : 'out', name.slice(0, 110)].join(' | '));
        }
        if (items.length < 200) break;
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(lines.join('\n') || 'none');
      return;
    } else if (op === 'item') {
      const id = String(q.catalog || '').replace(/\D/g, '');
      const ids = String(q.ids || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 40);
      out.items = [];
      for (const iid of ids) {
        const c = await impactGet(`Catalogs/${id}/Items/${encodeURIComponent(iid)}`);
        const x = c.json || {};
        out.items.push({ id: iid, status: c.status, name: x.Name, price: x.CurrentPrice, orig: x.OriginalPrice, stock: x.StockAvailability, img: x.ImageUrl, url: x.Url });
      }
    } else if (op === 'og') {
      const u = new URL(String(q.url || ''));
      if (!/(^|\.)(transparentlabs\.com|shopbeam\.com|fuelmeals\.com|trifectanutrition\.com|litmethod\.com|1stphorm\.com|thorne\.com|coachsoak\.com)$/.test(u.hostname)) {
        res.status(400).json({ error: 'host not allowed' });
        return;
      }
      const r = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BIA-gear-probe)' } });
      const html = await r.text();
      const meta = (prop) => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)`, 'i')) || [])[1];
      out.status = r.status;
      out.title = meta('og:title') || (html.match(/<title>([^<]+)/i) || [])[1];
      out.image = meta('og:image');
      out.price = meta('product:price:amount') || meta('og:price:amount');
      // Shopify stores expose /products.json; list product handles + first image for discovery
      if (q.products === '1') {
        const pr = await fetch(`${u.origin}/products.json?limit=250`);
        const pj = pr.ok ? await pr.json() : {};
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send((pj.products || []).map(p => [p.handle, p.variants?.[0]?.price, (p.images?.[0]?.src || '').slice(0, 140), p.title].join(' | ')).join('\n') || `none ${pr.status}`);
        return;
      }
    } else if (op === 'search') {
      const kw = encodeURIComponent(String(q.q || ''));
      const c = await impactGet(`Catalogs/ItemSearch?Keyword=${kw}&PageSize=100`);
      out.status = c.status;
      out.items = (c.json?.Items ?? []).map(x => ({
        name: x.Name, price: x.CurrentPrice, campaign: x.CampaignName, catalog: x.CatalogId,
        img: x.ImageUrl, url: x.Url,
      }));
      if (!c.json) out.raw = c.text || c.error;
    } else if (op === 'path') {
      // raw GET of a whitelisted read path, for endpoint discovery
      const p = String(q.p || '');
      if (!/^(Campaigns|Catalogs|Ads|Deals|PromoCodes|MediaProperties|Programs)[\w/?=&%.-]*$/.test(p)) {
        res.status(400).json({ error: 'path not allowed' });
        return;
      }
      const c = await impactGet(p);
      out.status = c.status;
      out.body = c.json ?? c.text ?? c.error;
    } else if (op === 'amazon-search') {
      const body = {
        keywords: String(q.q || ''),
        searchIndex: q.index || 'All',
        itemCount: 10,
        itemPage: Number(q.page) || 1,
        marketplace: 'www.amazon.com',
        partnerTag: process.env.AMAZON_ASSOCIATE_TAG,
        resources: AMZ_RESOURCES,
      };
      if (q.sort) body.sortBy = q.sort;
      const r = await amazonCall('searchItems', body);
      out.status = r.status;
      out.result = r.json ? slimAmazon(r.json) : r.text;
      if (q.compact && r.json) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(out.result.items.map(i => [i.asin, i.price, i.brand, (i.title || '').slice(0, 90)].join(' | ')).join('\n') || 'none');
        return;
      }
    } else if (op === 'amazon-items') {
      const ids = String(q.ids || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
      const r = await amazonCall('getItems', {
        itemIds: ids, itemIdType: 'ASIN', marketplace: 'www.amazon.com',
        partnerTag: process.env.AMAZON_ASSOCIATE_TAG, resources: AMZ_RESOURCES,
      });
      out.status = r.status;
      out.result = r.json ? slimAmazon(r.json) : r.text;
    } else {
      res.status(400).json({ error: 'unknown op' });
      return;
    }
  } catch (e) {
    out.error = String(e && e.message || e).slice(0, 300);
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
};
