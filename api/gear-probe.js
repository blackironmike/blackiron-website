/**
 * gear-probe.js
 * TEMPORARY, preview-only Amazon discovery for the Storefront build.
 * Read-only Creators API searchItems, with sales rank so picks can be
 * weighed by real sales volume. Refuses to run in production (404).
 * Never returns tokens or credentials. Delete before merging to main.
 */
const AMZ_TOKEN = 'https://api.amazon.com/auth/o2/token';
const AMZ_API = 'https://creatorsapi.amazon/catalog/v1';
const RESOURCES = [
  'itemInfo.title', 'itemInfo.byLineInfo', 'images.primary.large',
  'customerReviews.count', 'customerReviews.starRating',
  'browseNodeInfo.websiteSalesRank', 'browseNodeInfo.browseNodes.salesRank',
  'offersV2.listings.price', 'offersV2.listings.isBuyBoxWinner',
];
let tok = null;
async function token() {
  if (tok && Date.now() < tok.exp) return tok.token;
  const r = await fetch(AMZ_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', scope: 'creatorsapi::default',
      client_id: process.env.AMAZON_CREATORS_CREDENTIAL_ID || '',
      client_secret: process.env.AMAZON_CREATORS_CREDENTIAL_SECRET || '',
    }),
  });
  if (!r.ok) throw new Error('token ' + r.status);
  const j = await r.json();
  tok = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return tok.token;
}
async function call(op, body) {
  const r = await fetch(`${AMZ_API}/${op}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', 'x-marketplace': 'www.amazon.com' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* */ }
  return { status: r.status, json, text: json ? null : text.slice(0, 300) };
}
function line(it) {
  const ls = it?.offersV2?.listings ?? [];
  const l = ls.find(x => x.isBuyBoxWinner) ?? ls[0];
  const p = l?.price?.money ?? l?.price;
  const bn = it?.browseNodeInfo ?? {};
  const rank = bn.websiteSalesRank?.salesRank ?? '';
  const node = (bn.browseNodes ?? []).find(n => n.salesRank);
  return [it.asin, 'r' + rank, node ? `${node.salesRank}@${(node.displayName || '').slice(0, 24)}` : '',
    it?.customerReviews?.starRating?.value ?? '', it?.customerReviews?.count ?? '', p?.amount ?? '',
    it?.itemInfo?.byLineInfo?.brand?.displayValue ?? '', (it?.itemInfo?.title?.displayValue ?? '').slice(0, 80)].join(' | ');
}
module.exports = async (req, res) => {
  if (process.env.VERCEL_ENV === 'production') { res.status(404).send('Not found'); return; }
  const q = req.query || {};
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  try {
    let r;
    if (q.ids) {
      r = await call('getItems', { itemIds: String(q.ids).split(',').slice(0, 10), itemIdType: 'ASIN', marketplace: 'www.amazon.com', partnerTag: process.env.AMAZON_ASSOCIATE_TAG, resources: RESOURCES });
    } else {
      const body = { keywords: String(q.q || ''), searchIndex: q.index || 'All', itemCount: 10, itemPage: Number(q.page) || 1, marketplace: 'www.amazon.com', partnerTag: process.env.AMAZON_ASSOCIATE_TAG, resources: RESOURCES };
      if (q.sort) body.sortBy = q.sort;
      r = await call('searchItems', body);
    }
    if (!r.json) { res.status(200).send(`status ${r.status} ${r.text}`); return; }
    const resu = r.json.searchResult ?? r.json.itemsResult ?? r.json.itemResults ?? {};
    const errs = (resu.errors ?? r.json.errors ?? []).map(e => e.message || e.code).join('; ');
    res.status(200).send((resu.items ?? []).map(line).join('\n') + (errs ? `\nERR ${errs}` : '') || `none ${r.status}`);
  } catch (e) {
    res.status(200).send('error ' + String(e && e.message || e).slice(0, 200));
  }
};
