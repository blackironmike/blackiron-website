/**
 * api-probe.js
 * Read-only diagnostic. Answers one question: which GHL and Wodify endpoints
 * does our token ACTUALLY reach, as opposed to which scopes are ticked in a
 * settings screen. A scope list is an upper bound; several GHL scopes have no
 * public endpoint behind them, and the only way to know is to ask.
 *
 * Safety, deliberately stricter than the sync jobs:
 *   - GET only, on every probe. Nothing here writes.
 *   - Requires CRON_SECRET. A missing secret fails closed rather than open.
 *   - Never returns response bodies, record contents, or key values. Status
 *     codes, timings, and the top-level shape of the response, nothing else.
 *
 * Usage:
 *   /api/api-probe?secret=<CRON_SECRET>
 *   /api/api-probe?secret=<CRON_SECRET>&group=ghl      (or wodify)
 *   /api/api-probe?secret=<CRON_SECRET>&detail=1       (shape trees, no values)
 *
 * Reading the results:
 *   200/201  endpoint exists and the token reaches it
 *   401/403  authenticated but the scope is missing
 *   404      wrong path guess, or no public endpoint behind that scope
 *   429      rate limited, tells us nothing about access, re-run it
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';
const WODIFY_BASE = 'https://api.wodify.com/v1';
const GHL_VERSION = '2021-07-28';
const TIMEOUT_MS = 8000;
const CONCURRENCY = 4;

function ghlProbes(loc) {
  return [
    ['location',         `/locations/${loc}`],
    ['contacts',         `/contacts/?locationId=${loc}&limit=1`],
    ['tags',             `/locations/${loc}/tags`],
    ['customValues',     `/locations/${loc}/customValues`],
    ['customFields',     `/locations/${loc}/customFields`],
    ['tasks',            `/locations/${loc}/tasks`],
    ['templates',        `/locations/${loc}/templates?originId=${loc}&limit=1`],
    ['calendars',        `/calendars/?locationId=${loc}`],
    ['calendarGroups',   `/calendars/groups?locationId=${loc}`],
    ['forms',            `/forms/?locationId=${loc}&limit=1`],
    ['formSubmissions',  `/forms/submissions?locationId=${loc}&limit=1`],
    ['surveys',          `/surveys/?locationId=${loc}&limit=1`],
    ['workflows',        `/workflows/?locationId=${loc}`],
    ['emailTemplates',   `/emails/builder?locationId=${loc}&limit=1`],
    ['emailSchedules',   `/emails/schedule?locationId=${loc}`],
    ['conversations',    `/conversations/search?locationId=${loc}&limit=1`],
    ['opportunities',    `/opportunities/search?location_id=${loc}&limit=1`],
    ['pipelines',        `/opportunities/pipelines?locationId=${loc}`],
    ['users',            `/users/?locationId=${loc}`],
    ['links',            `/links/?locationId=${loc}`],
    ['businesses',       `/businesses/?locationId=${loc}`],
    ['medias',           `/medias/files?altId=${loc}&altType=location&limit=1&offset=0&sortBy=createdAt&sortOrder=desc`],
    ['blogs',            `/blogs/site/all?locationId=${loc}&limit=1&skip=0`],
    ['knowledgeBases',   `/knowledge-bases/?locationId=${loc}`],
    ['invoices',         `/invoices/?altId=${loc}&altType=location&limit=1&offset=0`],
    ['products',         `/products/?locationId=${loc}&limit=1`],
    ['numberPools',      `/phone-system/number-pools?locationId=${loc}`],
  ];
}

const WODIFY_PROBES = [
  ['clients',            '/clients?page=1&pageSize=1'],
  ['leads',              '/leads?page=1&pageSize=1'],
  ['leadStatus',         '/leadstatus'],
  ['leadSource',         '/leadsource'],
  ['leadTags',           '/leadtags'],
  ['clientTags',         '/clienttags'],
  ['clientStatus',       '/clientstatus'],
  ['clientGroup',        '/clientgroup'],
  ['memberships',        '/memberships?page=1&pageSize=1'],
  ['membershipTemplate', '/membershiptemplates?page=1&pageSize=1'],
  ['membershipHold',     '/membershipholds?page=1&pageSize=1'],
  ['programs',           '/programs'],
  ['classes',            '/classes?page=1&pageSize=1'],
  ['classReservations',  '/classreservations?page=1&pageSize=1'],
  ['classSignins',       '/classsignins?page=1&pageSize=1'],
  ['appointmentBookings','/appointmentbookings?page=1&pageSize=1'],
  ['invoices',           '/invoices?page=1&pageSize=1'],
  ['transactions',       '/transactions?page=1&pageSize=1'],
  ['paymentMethods',     '/paymentmethods?page=1&pageSize=1'],
  ['discounts',          '/discounts'],
  ['emailTemplates',     '/emailtemplates?page=1&pageSize=1'],
  ['emails',             '/emails?page=1&pageSize=1'],
  ['sms',                '/sms?page=1&pageSize=1'],
  ['tasks',              '/tasks?page=1&pageSize=1'],
  ['employees',          '/employees?page=1&pageSize=1'],
  ['locations',          '/locations'],
  ['workouts',           '/workouts?page=1&pageSize=1'],
  ['contractTemplates',  '/contracttemplates?page=1&pageSize=1'],
  ['clientWaivers',      '/clientwaivers?page=1&pageSize=1'],
];

/* Structure only. Top-level key names and the length of the first array we
   find, so we learn the response shape without carrying a single field of
   member data out of the account. */
function shapeOf(body) {
  if (body === null || typeof body !== 'object') return typeof body;
  if (Array.isArray(body)) return { array: body.length };
  const keys = Object.keys(body).slice(0, 12);
  const out = { keys };
  for (const k of keys) {
    if (Array.isArray(body[k])) {
      out.firstArray = { key: k, length: body[k].length };
      break;
    }
  }
  return out;
}

/* Endpoints whose schema we need before we can build against them. With
   ?detail=1 these return a shape tree: nested KEY NAMES and value TYPES only,
   never a value. That is enough to write a client against and carries nothing
   out of the account. */
const DETAIL_TARGETS = new Set([
  'ghl:forms',
  'ghl:emailTemplates',
  'ghl:knowledgeBases',
  'ghl:customValues',
  'ghl:workflows',
]);

function keysDeep(v, depth) {
  if (depth > 3) return '...';
  if (Array.isArray(v)) return v.length ? [keysDeep(v[0], depth + 1)] : [];
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).slice(0, 30)) out[k] = keysDeep(v[k], depth + 1);
    return out;
  }
  return typeof v;
}

async function probe(label, url, headers, detail) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal });
    const ms = Date.now() - started;
    let shape = null;
    let structure;
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      try {
        const body = await res.json();
        shape = shapeOf(body);
        if (detail && DETAIL_TARGETS.has(label)) structure = keysDeep(body, 0);
      } catch (e) {
        shape = 'unparseable-json';
      }
    }
    return { label, status: res.status, ok: res.ok, ms, shape, ...(structure ? { structure } : {}) };
  } catch (e) {
    return {
      label,
      status: null,
      ok: false,
      ms: Date.now() - started,
      error: e.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(jobs, size) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < jobs.length) {
      results.push(await jobs[i++]());
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, worker));
  return results;
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(503).json({ error: 'CRON_SECRET not configured; probe disabled' });
  }
  const authorized =
    req.headers.authorization === `Bearer ${cronSecret}` || req.query.secret === cronSecret;
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const group = (req.query.group || 'all').toLowerCase();
  const detail = req.query.detail === '1';
  const ghlKey = process.env.GHL_API_KEY;
  const ghlLoc = process.env.GHL_LOCATION_ID;
  const wodKey = process.env.WODIFY_API_KEY;

  const jobs = [];
  const skipped = [];

  if (group === 'all' || group === 'ghl') {
    if (!ghlKey || !ghlLoc) {
      skipped.push('ghl: GHL_API_KEY or GHL_LOCATION_ID not set');
    } else {
      const h = {
        Authorization: `Bearer ${ghlKey}`,
        Version: GHL_VERSION,
        Accept: 'application/json',
      };
      for (const [label, path] of ghlProbes(ghlLoc)) {
        jobs.push(() => probe(`ghl:${label}`, `${GHL_BASE}${path}`, h, detail).then(r => ({ ...r, path })));
      }
    }
  }

  if (group === 'all' || group === 'wodify') {
    if (!wodKey) {
      skipped.push('wodify: WODIFY_API_KEY not set');
    } else {
      const h = { 'x-api-key': wodKey, Accept: 'application/json' };
      for (const [label, path] of WODIFY_PROBES) {
        jobs.push(() => probe(`wodify:${label}`, `${WODIFY_BASE}${path}`, h, detail).then(r => ({ ...r, path })));
      }
    }
  }

  const results = await runPool(jobs, CONCURRENCY);
  results.sort((a, b) => a.label.localeCompare(b.label));

  const bucket = r =>
    r.ok ? 'reachable'
      : r.status === 401 || r.status === 403 ? 'forbidden'
        : r.status === 404 ? 'notFound'
          : r.status === 429 ? 'rateLimited'
            : 'other';

  const summary = { reachable: 0, forbidden: 0, notFound: 0, rateLimited: 0, other: 0 };
  for (const r of results) summary[bucket(r)]++;

  return res.status(200).json({
    ranAt: new Date().toISOString(),
    group,
    skipped,
    summary,
    reachable: results.filter(r => r.ok).map(r => r.label),
    results,
  });
}
