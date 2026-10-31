// Coach check-in form on /book.
//
// The page posts the visitor's info here, and this hands it to GHL as a
// contact tagged "website check-in", with their answers in a note. That tag
// is what the GHL workflow listens for: it texts and emails Mike and
// Lawrence and creates the pipeline opportunity, so the pipeline and stage
// are managed in GHL, not here. Nothing here messages the lead:
// a coach reaches out personally from their own phone.

const GHL_BASE = 'https://services.leadconnectorhq.com';

const CHOICES = {
  goal: {
    stronger: 'Get stronger',
    weight: 'Lose weight',
    back: 'Get back into it',
    unsure: 'Not sure yet',
  },
  interest: {
    group: 'Group classes',
    pt: 'Personal training',
    unsure: 'Not sure yet',
  },
  start: {
    week: 'This week',
    weeks: 'In the next few weeks',
    looking: 'Just looking',
  },
  contact_time: {
    morning: 'Morning',
    midday: 'Midday',
    evening: 'Evening',
  },
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

function env(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

async function ghl(path, options = {}) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env('GHL_API_KEY')}`,
      Version: '2021-07-28',
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) throw new Error(`GHL ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

function clean(v, max = 200) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// US numbers only: 10 digits, or 11 starting with 1. Returned as E.164.
function normalizePhone(raw) {
  const d = clean(raw, 40).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // Honeypot: a field people never see. Bots fill it; pretend it worked.
  if (clean(b.company)) return res.status(200).json({ ok: true });

  const name = clean(b.name, 100);
  const email = clean(b.email, 160).toLowerCase();
  const phone = normalizePhone(b.phone);
  const pick = (k) => CHOICES[k][clean(b[k], 20)] || '';
  const goal = pick('goal');
  const interest = pick('interest');
  const start = pick('start');
  const contactTime = pick('contact_time');
  const notes = clean(b.notes, 1000);

  const errors = {};
  if (!name) errors.name = 'Please add your name.';
  if (!phone) errors.phone = 'Please add a US mobile number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please add a valid email.';
  if (!goal) errors.goal = 'Pick the one that fits best.';
  if (!interest) errors.interest = 'Pick the one that fits best.';
  if (!start) errors.start = 'Pick the one that fits best.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'invalid', fields: errors });

  const [firstName, ...rest] = name.split(/\s+/);
  const lastName = rest.join(' ');
  const utm = {};
  UTM_KEYS.forEach((k) => { const v = clean(b[k], 120); if (v) utm[k] = v; });

  const tags = ['website check-in'];
  if (start === 'Just looking') tags.push('check-in: just looking');
  if (interest === 'Personal training') tags.push('interest: personal training');
  if (interest === 'Group classes') tags.push('interest: group classes');
  if (utm.utm_source) tags.push(`source: ${utm.utm_source.toLowerCase()}`);

  try {
    const locationId = env('GHL_LOCATION_ID');
    const up = await ghl('/contacts/upsert', {
      method: 'POST',
      body: JSON.stringify({
        locationId, firstName, lastName, email, phone, tags,
        source: 'Website check-in (/book)',
      }),
    });
    const contactId = up.contact && up.contact.id;
    if (!contactId) throw new Error('GHL upsert returned no contact id');

    const lines = [
      'Website check-in (/book)',
      `What brings them in: ${goal}`,
      `Interested in: ${interest}`,
      `Wants to start: ${start}`,
      `Best time to reach: ${contactTime || 'No preference'}`,
      notes ? `Anything we should know: ${notes}` : null,
      Object.keys(utm).length ? `Ad source: ${Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(', ')}` : null,
    ].filter(Boolean);
    await ghl(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: lines.join('\n') }),
    });

    return res.status(200).json({ ok: true, firstName });
  } catch (e) {
    console.error('check-in failed', e.message);
    return res.status(502).json({ error: 'upstream' });
  }
}
