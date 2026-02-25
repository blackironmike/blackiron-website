export default async function handler(req, res) {
  const allowedOrigin = 'https://www.blackironathletics.com';
  const origin = req.headers.origin || '';

  // CORS headers
  if (origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate } = req.query;

  // Validate required params
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate query params are required (YYYY-MM-DD)' });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  // Validate date range (max 31 days)
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date values' });
  }
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) {
    return res.status(400).json({ error: 'endDate must be after startDate' });
  }
  if (diffDays > 31) {
    return res.status(400).json({ error: 'Date range cannot exceed 31 days' });
  }

  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    console.error('GHL_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const calendarId = 'aOyy4UPbwziVvHz35TCU';
  // GHL API expects epoch milliseconds for startDate/endDate
  const startMs = start.getTime();
  const endMs = end.getTime();
  const ghlUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${startMs}&endDate=${endMs}&timezone=America/Chicago`;

  try {
    const response = await fetch(ghlUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`GHL API error: ${response.status} ${response.statusText} - ${errBody}`);
      return res.status(502).json({ error: 'Failed to fetch availability' });
    }

    const data = await response.json();

    // Cache for 5 minutes at Vercel CDN, serve stale for 10 min while revalidating
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching free slots:', err);
    return res.status(502).json({ error: 'Failed to fetch availability' });
  }
}
