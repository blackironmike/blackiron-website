/**
 * push-crawler.js
 * Manages the web-crawler sources on the chatbot knowledge base.
 *
 * The FAQ records pushed by push-knowledge-base.js are the curated authority on
 * facts. The crawler covers what those cannot: depth, narrative, and pages that
 * change on their own schedule. The two are complementary, which is also why
 * the crawl list deliberately leaves out anything the FAQ already answers
 * plainly.
 *
 * Crawling is two phases in GHL, and they are split into two calls here rather
 * than one, because discovery is asynchronous. A single call would either
 * finish before the crawl did or sit burning the function's time budget:
 *
 *   step=discover   queue each URL for crawling
 *   step=train      ingest whatever has finished crawling
 *
 * Train is safe to run repeatedly. It only ever picks up pages that have
 * finished crawling and have not been ingested yet, so running it twice after
 * a slow crawl is the intended way to catch stragglers, not a mistake.
 *
 * Safety, same contract as the other endpoints:
 *   - Requires CRON_SECRET, fails closed.
 *   - Dry run by default. Writing needs BOTH a POST and ?apply=1.
 *   - A GET can never change anything.
 *
 * Usage:
 *   GET  /api/push-crawler                          dry run, shows current vs wanted
 *   POST /api/push-crawler?apply=1&step=discover    queue the crawls
 *   POST /api/push-crawler?apply=1&step=train       ingest what finished
 *   ...&kb=<name>                                   target a base by name
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';
const KB_VERSION = '2021-04-15';
const DEFAULT_KB_NAME = 'Black Iron Knowledge base (synced)';
const CALL_SPACING_MS = 150;
const SITE = 'https://www.blackironathletics.com';

/* Chosen against what the FAQ records already cover.
 *
 * The blog goes in as one Path entry rather than nineteen Exact ones, so new
 * posts are picked up without anyone remembering to add them. The six URLs on
 * the old knowledge base sat untrained from 27 July onward precisely because
 * re-crawling was a thing someone had to remember.
 *
 * Deliberately absent: /start-back-to-school and /start-routine, which are ad
 * capture pages and would teach the bot sales copy as fact; /privacy-policy
 * and /terms, which would have it quoting legalese when the FAQ already
 * answers cancellation plainly; and the homepage, whose marketing copy the FAQ
 * covers in plainer language. */
const CRAWL_TARGETS = [
  [`${SITE}/pricing`, 'Exact'],
  [`${SITE}/schedule`, 'Exact'],
  [`${SITE}/programs`, 'Exact'],
  [`${SITE}/getting-started`, 'Exact'],
  [`${SITE}/faq`, 'Exact'],
  [`${SITE}/about`, 'Exact'],
  [`${SITE}/mike-manning`, 'Exact'],
  [`${SITE}/contact`, 'Exact'],
  [`${SITE}/blog`, 'Path'],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ghl(path, key, options = {}, retries = 2) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      Version: KB_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (res.status === 429 && retries > 0) {
    await sleep(5000);
    return ghl(path, key, options, retries - 1);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  await sleep(CALL_SPACING_MS);
  return text ? JSON.parse(text) : {};
}

async function listCrawled(key, locationId, knowledgeBaseId) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const qs = new URLSearchParams({ locationId, knowledgeBaseId, page: String(page), pageLength: '100' });
    const body = await ghl(`/knowledge-bases/crawler?${qs}`, key);
    const urls = body.urls || (body.data && body.data.urls) || [];
    all.push(...urls);
    if (urls.length < 100) break;
  }
  return all;
}

/* Compare on origin + pathname so a trailing slash or a stray query string
   does not read as a different page and get queued twice. */
function normalise(u) {
  try {
    const p = new URL(u);
    return (p.origin + p.pathname).replace(/\/$/, '').toLowerCase();
  } catch (e) {
    return String(u).toLowerCase();
  }
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return res.status(503).json({ error: 'CRON_SECRET not configured; disabled' });
  const authorized =
    req.headers.authorization === `Bearer ${cronSecret}` || req.query.secret === cronSecret;
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const key = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!key || !locationId) return res.status(503).json({ error: 'GHL_API_KEY or GHL_LOCATION_ID not set' });

  const apply = req.method === 'POST' && req.query.apply === '1';
  const step = (req.query.step || '').toLowerCase();

  try {
    const kbList = await ghl(`/knowledge-bases/?locationId=${locationId}&limit=50`, key);
    const bases = (kbList.data && kbList.data.knowledgeBases) || kbList.knowledgeBases || [];
    const wanted = req.query.kb || DEFAULT_KB_NAME;
    const target = bases.find(b => (b.name || '').toLowerCase() === wanted.toLowerCase());
    if (!target) {
      return res.status(200).json({
        error: `No knowledge base named "${wanted}"`,
        available: bases.map(b => b.name),
      });
    }

    const current = await listCrawled(key, locationId, target.id);
    const have = new Set(current.map(u => normalise(u.url)));
    const missing = CRAWL_TARGETS.filter(([url]) => !have.has(normalise(url)));
    const untrained = current.filter(u => String(u.status || '').toLowerCase() !== 'trained');

    const state = {
      mode: apply ? `APPLIED:${step}` : 'dry-run',
      knowledgeBase: { id: target.id, name: target.name },
      currentUrls: current.length,
      currentByStatus: current.reduce((a, u) => ((a[u.status || 'unknown'] = (a[u.status || 'unknown'] || 0) + 1), a), {}),
      wantedUrls: CRAWL_TARGETS.length,
      willDiscover: missing.map(([url, option]) => `${option.padEnd(5)} ${url}`),
      awaitingTraining: untrained.map(u => `${u.status} ${u.url}`),
    };

    if (!apply) {
      state.note =
        'Nothing changed. POST with ?apply=1&step=discover to queue the crawls, ' +
        'then ?apply=1&step=train once they have finished crawling.';
      return res.status(200).json(state);
    }

    if (step === 'discover') {
      const queued = [];
      const failed = [];
      /* The discover response is documented only as "data: any", so whatever
         comes back is echoed rather than assumed. The operationId for training
         lives somewhere in it, and this is how we find out where. */
      for (const [url, option] of missing) {
        try {
          const r = await ghl('/knowledge-bases/crawler', key, {
            method: 'POST',
            body: JSON.stringify({ locationId, knowledgeBaseId: target.id, url, option }),
          });
          queued.push({ url, option, response: r });
        } catch (e) {
          failed.push({ url, error: e.message });
        }
      }
      return res.status(200).json({ ...state, queued: queued.length, failed, rawResponses: queued.slice(0, 3) });
    }

    if (step === 'train') {
      const ready = current.filter(u => {
        const s = String(u.status || '').toLowerCase();
        return s !== 'trained' && s !== 'crawling' && s !== 'pending' && s !== 'failed';
      });
      if (!ready.length) {
        return res.status(200).json({ ...state, trained: 0, note: 'Nothing is waiting to be trained.' });
      }
      const operationId = req.query.operationId || ready[0].operationId || '';
      const r = await ghl('/knowledge-bases/crawler/train', key, {
        method: 'POST',
        body: JSON.stringify({
          locationId,
          knowledgeBaseId: target.id,
          urlIds: ready.map(u => u.id),
          operationId,
        }),
      });
      return res.status(200).json({ ...state, trainedCount: ready.length, operationIdUsed: operationId, response: r });
    }

    return res.status(400).json({ error: 'apply=1 needs step=discover or step=train', ...state });
  } catch (e) {
    return res.status(500).json({ mode: apply ? `APPLIED:${step}:PARTIAL` : 'dry-run', error: e.message });
  }
}
