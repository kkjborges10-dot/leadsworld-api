export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.GOOGLE_PLACES_API_KEY || '';
  res.status(200).json({
    configured: Boolean(key),
    keyHint: key ? '••••••••' + key.slice(-4) : null
  });
}
