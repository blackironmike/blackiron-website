export default async function handler(req, res) {
  const allowedOrigin = 'https://www.blackironathletics.com';
  const origin = req.headers.origin || '';

  // CORS headers
  if (origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token, day } = req.body || {};

  if (!access_token) {
    return res.status(400).json({ error: 'access_token is required' });
  }

  if (!day) {
    return res.status(400).json({ error: 'day is required (YYYY-MM-DD)' });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return res.status(400).json({ error: 'day must be in YYYY-MM-DD format' });
  }

  try {
    const response = await fetch('https://cronometer.com/api_v1/diary_summary', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ day: day, food: true })
    });

    if (response.status === 401) {
      return res.status(401).json({ error: 'Cronometer token expired or revoked' });
    }

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Cronometer diary error:', response.status, errBody);
      return res.status(502).json({ error: 'Failed to fetch diary' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching Cronometer diary:', err);
    return res.status(502).json({ error: 'Failed to fetch diary' });
  }
}
