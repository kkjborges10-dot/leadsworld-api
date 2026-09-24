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
  const variant = parseInt(p.variant || '0', 10);

  // 9 variantes: base, plural e 8 círculos ao redor do centro da cidade
  const OFFSETS = [[-0.05,0],[0.05,0],[0,-0.05],[0,0.05],[-0.05,-0.05],[0.05,0.05],[-0.05,0.05],[0.05,-0.05]];
  const textQuery = `${nicho} em ${local}`;
  const body = { textQuery, pageSize: 20, languageCode: 'pt-BR', regionCode: 'BR' };
  if (p.pageToken) body.pageToken = p.pageToken;
  if (variant >= 1 && p.centerLat && p.centerLng) {
    const [dlat, dlng] = OFFSETS[variant - 1] || [0, 0];
    body.locationBias = { circle: { center: { latitude: parseFloat(p.centerLat) + dlat, longitude: parseFloat(p.centerLng) + dlng }, radius: 6000 } };
  }

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.googleMapsUri,places.websiteUri,places.types,places.rating,places.userRatingCount,places.location,nextPageToken'
    },
    body: JSON.stringify(body)
  });

  const data = await resp.json();
  if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || 'Erro no Google Places', status: resp.status });

  const empresas = (data.places || []).map(x => ({
    id: x.id,
    nome: x.displayName?.text,
    endereco: x.formattedAddress,
    telefone: x.nationalPhoneNumber || null,
    mapsUrl: x.googleMapsUri || null,
    website: x.websiteUri || null,
    semSite: !x.websiteUri,
    avaliacao: x.rating ?? null,
    numAvaliacoes: x.userRatingCount ?? 0,
    lat: x.location?.latitude ?? null,
    lng: x.location?.longitude ?? null
  }));

  const exhausted = !data.nextPageToken;
  res.json({
    empresas,
    nextPageToken: data.nextPageToken || null,
    exhausted,
    nextVariant: exhausted ? variant + 1 : null,
    hasMoreVariants: variant + 1 <= 8,
    centerLat: p.centerLat || (empresas[0]?.lat ?? null),
    centerLng: p.centerLng || (empresas[0]?.lng ?? null)
  });
}
