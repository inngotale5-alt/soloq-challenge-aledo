export default async function handler(req, res) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "RIOT_API_KEY no configurada" });
    return;
  }

  const name = (req.query.name || "").toString().trim();
  const region = (req.query.region || "EUW").toString().toUpperCase();

  if (!name) return res.status(400).json({ error: "Falta parámetro 'name'." });

  const platformMap = { EUW:"euw1", NA:"na1", EUNE:"eun1", KR:"kr", BR:"br1", LAN:"la1", LAS:"la2", OCE:"oc1", RU:"ru", TR:"tr1" };
  const platform = platformMap[region] || "euw1";

  try {
    const summRes = await fetch(`https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`, {
      headers: { "X-Riot-Token": apiKey }
    });
    if (!summRes.ok) return res.status(summRes.status).json({ error: "Summoner no encontrado" });
    const summ = await summRes.json();

    const rankedRes = await fetch(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summ.id}`, {
      headers: { "X-Riot-Token": apiKey }
    });
    const rankedArr = rankedRes.ok ? await rankedRes.json() : [];

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json({
      id: summ.id,
      puuid: summ.puuid,
      name: summ.name,
      profileIconId: summ.profileIconId,
      summonerLevel: summ.summonerLevel,
      ranked: rankedArr
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
}
