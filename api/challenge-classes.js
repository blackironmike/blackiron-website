// Live class schedule for the challenge app: today and the six days after it.
// Read-only. Asks Wodify for the classes and returns only what a member needs
// to see: when, which program, and how many spots are left. No member data.
//
// GET /api/challenge-classes
// Cached at the edge for a minute so a busy morning does not hammer Wodify.

const WODIFY_BASE = 'https://api.wodify.com/v1';
const DAYS = 7;
const MAX_PAGES = 4;

// 'YYYY-MM-DD' for a day in gym time (Frisco is America/Chicago).
function gymDay(offsetDays) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  // Noon UTC keeps the date arithmetic clear of daylight saving edges.
  const t = new Date(Date.UTC(y, m - 1, d + offsetDays, 12));
  return t.toISOString().slice(0, 10);
}

async function wodifyClasses(key, from, to, page) {
  const q = `start_date|gte|${from};start_date|lte|${to};is_cancelled|eq|false`;
  const url = `${WODIFY_BASE}/classes/search?q=${encodeURIComponent(q)}&sort=start_date_time&page=${page}&page_size=100`;
  const res = await fetch(url, { headers: { 'x-api-key': key, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Wodify answered ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const key = process.env.WODIFY_API_KEY;
  if (!key) return res.status(503).json({ error: 'Schedule is not connected yet.' });

  const from = gymDay(0), to = gymDay(DAYS - 1);
  try {
    const rows = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await wodifyClasses(key, from, to, page);
      rows.push(...(data.classes || []));
      const more = data.pagination && data.pagination.has_more;
      if (!more) break;
    }

    const classes = rows
      // "Log ONLY" entries are for logging scores, not classes anyone attends.
      .filter(c => !c.is_cancelled && !c.is_deleted && !/^log only/i.test(c.name || ''))
      .map(c => {
        const limit = Number(c.class_limit) || 0;
        return {
          id: c.id,
          date: c.start_date,
          start: String(c.start_time || '').slice(0, 5),
          end: String(c.end_date_time || '').slice(11, 16),
          program: c.program_name || c.name || 'Class',
          // The app lists classes only. Open Gym blocks ride along so a day with
          // no classes can still say when the gym is open.
          kind: /open gym/i.test(c.program_name || c.name || '') ? 'open_gym' : 'class',
          // limit 0 means the class takes no reservations (Open Gym, Hyrox).
          limit,
          spots_left: limit ? Math.max(0, Number(c.available) || 0) : null,
          full: limit ? Boolean(c.is_full) : false,
        };
      })
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ from, to, as_of: new Date().toISOString(), classes });
  } catch (err) {
    console.error('challenge-classes:', err.message);
    return res.status(502).json({ error: 'The schedule is not loading right now.' });
  }
}
