// api/player.js
// Vercel serverless function (Node 18+)
// Requiere la variable de entorno RIOT_API_KEY

export default async function handler(req, res) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "RIOT_API_KEY no configurada en variables de entorno del servidor." });
    return;
  }

  const name = (req.query.name || "").toString().trim();
  const region = (req.query.region || "EUW").toString().toUpperCase(); // aceptamos 'EUW' por compatibilidad

  if (!name) {
    res.status(400).json({ error: "Falta parámetro 'name'." });
    return;
  }

  // mapa simple region -> platform host
  const platformMap = {
    "EUW": "euw1",
    "NA": "na1",
    "EUNE": "eun1",
    "KR": "kr",
    "BR": "br1",
    "LAN": "la1",
    "LAS": "la2",
    "OCE": "oc1",
    "RU": "ru",
    "TR": "tr1"
  };
  const platform = platformMap[region] || "euw1";

  try {
    // 1) obtener summoner por nombre
    const summonerUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`;
    const summRes = await fetch(summonerUrl, {
      headers: { "X-Riot-Token": apiKey }
    });
    if (summRes.status === 404) {
      res.status(404).json({ error: "Summoner no encontrado", name });
      return;
    }
    if (!summRes.ok) {
      const txt = await summRes.text();
      res.status(502).json({ error: `Error al consultar summoner: ${summRes.status} ${txt}`});
      return;
    }
    const summ = await summRes.json();
    // summ has id (encryptedSummonerId), accountId, puuid, name, profileIconId, summonerLevel

    // 2) obtener ranked entries por summoner id
    const rankedUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summ.id}`;
    const rankRes = await fetch(rankedUrl, {
      headers: { "X-Riot-Token": apiKey }
    });
    let rankedArr = [];
    if (rankRes.ok) {
      rankedArr = await rankRes.json();
    } else {
      // no fatal; algunos summoners no tienen ranked entries (unranked)
      rankedArr = [];
    }

    // Devolver un objeto compacto al frontend
    const out = {
      id: summ.id,
      puuid: summ.puuid,
      name: summ.name,
      profileIconId: summ.profileIconId,
      summonerLevel: summ.summonerLevel,
      ranked: rankedArr // array con entradas (p. ej. RANKED_SOLO_5x5, RANKED_FLEX_SR)
    };

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120"); // cache corta en Vercel
    res.status(200).json(out);

  } catch (err) {
    console.error("Error handler:", err);
    res.status(500).json({ error: "Error interno del servidor", detail: err.message });
  }
}
