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

  const clientId = process.env.CRONOMETER_CLIENT_ID;
  const clientSecret = process.env.CRONOMETER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CRONOMETER_CLIENT_ID or CRONOMETER_CLIENT_SECRET not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { action, code, access_token } = req.body || {};

  if (action === 'exchange') {
    // Exchange authorization code for access token
    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret
      });

      const response = await fetch('https://cronometer.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Cronometer token exchange error:', response.status, errBody);
        return res.status(502).json({ error: 'Failed to exchange token', detail: errBody });
      }

      const data = await response.json();
      return res.status(200).json({
        access_token: data.access_token,
        user_id: data.user_id
      });
    } catch (err) {
      console.error('Error exchanging Cronometer token:', err);
      return res.status(502).json({ error: 'Failed to exchange token' });
    }
  }

  if (action === 'disconnect') {
    // Revoke access token
    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }

    try {
      const params = new URLSearchParams({ access_token: access_token });
      const response = await fetch('https://cronometer.com/oauth/deauthorize?' + params.toString(), {
        method: 'POST'
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Cronometer deauthorize error:', response.status, errBody);
        // Still return success — token may already be invalid
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error deauthorizing Cronometer:', err);
      return res.status(200).json({ success: true });
    }
  }

  return res.status(400).json({ error: 'Invalid action. Use "exchange" or "disconnect".' });
}
