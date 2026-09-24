export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY não configurada' });

  const p = req.method === 'GET' ? req.query : (req.body || {});
  const nicho = p.nicho || p.textQuery;
  const cidade = p.cidade || '';
  const estado = p.estado || '';
  if (!nicho) return res.status(400).json({ error: 'Informe o nicho' });

  const local = cidade && estado ? `${cidade}, ${estado}` : 'Brasil';
  const body = {
    textQuery: `${nicho} em ${local}`,
    pageSize: 20, languageCode: 'pt-BR', regionCode: 'BR'
  };
  if (p.pageToken) body.pageToken = p.pageToken;

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
  if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || 'Erro no Google Places', status: resp.status });

  const empresas = (data.places || []).map(x => ({
    nome: x.displayName?.text,
    endereco: x.formattedAddress,
    telefone: x.nationalPhoneNumber || null,
    website: x.websiteUri || null,
    semSite: !x.websiteUri
  }));

  res.json({ total: empresas.length, empresas, nextPageToken: data.nextPageToken || null });
}
