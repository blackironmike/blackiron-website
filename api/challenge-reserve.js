// Class reservations for the challenge app. A signed-in member reserves or
// cancels their own spot, and nobody else's.
//
//   GET  /api/challenge-reserve                 -> which classes this week I'm in
//   POST /api/challenge-reserve {class_id, action: 'reserve' | 'cancel'}
//
// Who is asking is never taken from the request. The member's sign-in token is
// handed to the black-iron database, which answers with that member's own
// Wodify ID and whether reservations are switched on for them
// (challenges.reservations: off, admin, all). Only then do we talk to Wodify.
//
// Wodify's API books as staff, so it may not apply the rules its own app
// applies to members. The class's reservation window is checked here before
// anything is sent. Whatever Wodify refuses (attendance limits, full classes)
// comes back to the member in Wodify's own words.

const WODIFY_BASE = 'https://api.wodify.com/v1';
// Public by design, the same pair that ships to the browser in challenge/config.js.
const SUPABASE_URL = 'https://zlqhllywjuphjfcokjrw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7syHNQKK9fNxqBIYEmfuXA_oVohRpVF';

const RESERVED = 2, SIGNED_IN = 3, WAITLIST = 5;
const UNIT_MS = { 1: 60e3, 2: 3600e3, 3: 86400e3 }; // Wodify time formats: minutes, hours, days

function send(res, code, body) {
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(code).json(body);
}

// 'YYYY-MM-DD' for today in gym time (Frisco is America/Chicago).
function gymToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
}

// Wodify sends local times with a Z on the end and the real instant in the
// *_server fields. Always read the instant from the server field.
function instant(s) {
  const t = Date.parse(s || '');
  return Number.isFinite(t) && t > Date.parse('2000-01-01') ? t : null;
}

function when(ms) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', weekday: 'long', hour: 'numeric', minute: '2-digit',
  }).format(new Date(ms));
}

async function identity(token) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reserve_identity`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  return d && Number(d.client_id) > 0 ? { clientId: Number(d.client_id), allowed: d.allowed === true } : null;
}

async function wodify(key, method, path, body) {
  const r = await fetch(`${WODIFY_BASE}${path}`, {
    method,
    headers: { 'x-api-key': key, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* not JSON */ }
  return { ok: r.ok, status: r.status, data };
}

// Wodify's own sentence for the member, when it gave one.
function wodifySays(out) {
  const d = out.data || {};
  const first = Array.isArray(d.errors) && d.errors[0] ? (d.errors[0].message || d.errors[0].detail || d.errors[0]) : '';
  const msg = [d.wodify_validation_result, d.message, d.error, first].find(m => typeof m === 'string' && m.trim());
  return msg ? msg.trim().replace(/<[^>]*>/g, '').slice(0, 240) : '';
}

async function mine(key, clientId) {
  const q = `local_class_start_datetime|gte|${gymToday()}`;
  const out = await wodify(key, 'GET', `/clients/${clientId}/classes/reservations/search?q=${encodeURIComponent(q)}&page_size=100`);
  if (!out.ok) throw new Error(`Wodify answered ${out.status}`);
  const map = {};
  for (const r of (out.data && out.data.client_class_reservations) || []) {
    const s = Number(r.reservation_status_id);
    if (s === RESERVED) map[r.class_id] = 'reserved';
    else if (s === SIGNED_IN) map[r.class_id] = 'in';
    else if (s === WAITLIST) map[r.class_id] = 'waitlist';
  }
  return map;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed' });
  }
  const key = process.env.WODIFY_API_KEY;
  if (!key) return send(res, 503, { error: 'Reservations are not connected yet.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return send(res, 401, { error: 'Sign in first.' });

  try {
    const me = await identity(token);
    if (!me) return send(res, 401, { error: 'Sign in again to reserve.' });
    if (!me.allowed) return send(res, 403, { error: 'Reserve your spot in the Wodify app for now.' });

    if (req.method === 'GET') return send(res, 200, { mine: await mine(key, me.clientId) });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const classId = Number(body.class_id), action = body.action;
    if (!Number.isInteger(classId) || classId <= 0 || (action !== 'reserve' && action !== 'cancel')) {
      return send(res, 400, { error: 'That request doesn’t look right.' });
    }

    if (action === 'cancel') {
      const out = await wodify(key, 'PUT', `/classes/${classId}/clients/${me.clientId}/cancel-reservation`, { cancel_this_and_following: false });
      if (!out.ok || wodifySays(out)) {
        console.error('challenge-reserve cancel:', out.status, wodifySays(out));
        return send(res, 409, { error: wodifySays(out) || 'That didn’t cancel. Try again, or cancel in the Wodify app.' });
      }
      return send(res, 200, { status: 'cancelled', late: Boolean(out.data && out.data.is_late_cancellation) });
    }

    // Reserve. Read the class as it stands right now and apply its own rules.
    const got = await wodify(key, 'GET', `/classes/${classId}`);
    const c = got.data;
    if (!got.ok || !c || !c.id || c.is_cancelled || c.is_deleted) return send(res, 404, { error: 'That class isn’t on the schedule.' });
    if (/open gym/i.test(c.program_name || '') || !(Number(c.class_limit) > 0)) {
      return send(res, 409, { error: 'That one doesn’t take reservations.' });
    }
    const now = Date.now(), start = instant(c.start_date_time_server);
    if (!start) return send(res, 409, { error: 'That class can’t be reserved here. Use the Wodify app.' });
    const closes = instant(c.reservation_close_date_time_server) || start;
    if (now >= closes) return send(res, 409, { error: 'Reservations for that class have closed.' });
    const openMs = Number(c.reservation_open) * (UNIT_MS[c.reservation_open_time_format_id] || 0);
    if (openMs > 0 && now < start - openMs) {
      return send(res, 409, { error: `Reservations for that class open ${when(start - openMs)}.` });
    }

    const out = await wodify(key, 'POST', `/classes/${classId}/clients/${me.clientId}/reserve`, { is_recurring: false });
    const st = Number(out.data && out.data.reservation_status_id);
    if (!out.ok || wodifySays(out) || (st !== RESERVED && st !== WAITLIST && st !== SIGNED_IN)) {
      console.error('challenge-reserve reserve:', out.status, wodifySays(out));
      return send(res, 409, { error: wodifySays(out) || 'That didn’t go through. Try again, or reserve in the Wodify app.' });
    }
    return send(res, 200, { status: st === WAITLIST ? 'waitlist' : 'reserved' });
  } catch (err) {
    console.error('challenge-reserve:', err.message);
    return send(res, 502, { error: 'Reservations aren’t working right now. Use the Wodify app.' });
  }
}
