export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const key = process.env.GOOGLE_PLACES_API_KEY || '';
    return res.json({
      configured: Boolean(key),
      keyHint: key ? '••••••••' + key.slice(-4) : null
    });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY não configurada no servidor' });

  const {
    nicho, cidade, estado, pageToken
  } = req.body || {};
  const local = cidade && estado ? `${cidade}, ${estado}` : 'Brasil';
  const textQuery = `${nicho} em ${local}`;

  const body = { textQuery, pageSize: 20, languageCode: 'pt-BR', regionCode: 'BR' };
  if (pageToken) body.pageToken = pageToken;

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.googleMapsUri,places.websiteUri,places.types,places.rating,places.userRatingCount,nextPageToken'
    },
    body: JSON.stringify(body)
  });

  const data = await resp.json();
  if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || 'Erro no Google Places' });

  const empresas = (data.places || []).map(p => ({
    id: p.id,
    nome: p.displayName?.text,
    endereco: p.formattedAddress,
    telefone: p.nationalPhoneNumber || null,
    categoria: (p.types || [])[0] || null,
    avaliacao: p.rating ?? null,
    numAvaliacoes: p.userRatingCount ?? 0,
    mapsUrl: p.googleMapsUri,
    website: p.websiteUri || null,
    semSite: !p.websiteUri
  }));

  res.json({ empresas, nextPageToken: data.nextPageToken || null, total: empresas.length });
}
