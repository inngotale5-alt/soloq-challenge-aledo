// --- CONFIG: cambia aquí tus invocadores ---
const SUMMONERS = [
  "Jesucrítico#AMEN"
  // añade más como "OtroInvocador#TAG", "OtraCuenta"
];
// --- FIN CONFIG ---

const API_ENDPOINT = "/api/player"; // serverless backend

const tableBody = document.querySelector("#ranking tbody");
const lastUpdateEl = document.getElementById("lastUpdate");
const refreshBtn = document.getElementById("refreshBtn");

async function fetchPlayer(nameRaw){
  // si viene con '#', tomar la parte antes del '#'
  const name = nameRaw.split("#")[0].trim();
  try {
    const res = await fetch(`${API_ENDPOINT}?name=${encodeURIComponent(name)}&region=EUW`);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error backend: ${res.status} ${txt}`);
    }
    return await res.json();
  } catch (err) {
    return { error: err.message, inputName: nameRaw };
  }
}

async function actualizarTabla(){
  tableBody.innerHTML = "";
  lastUpdateEl.textContent = "Actualizando...";
  refreshBtn.disabled = true;

  const promises = SUMMONERS.map(s => fetchPlayer(s));
  const datos = await Promise.all(promises);

  datos.forEach((d, idx) => {
    const tr = document.createElement("tr");
    if (d.error){
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td>${d.inputName || "Desconocido"}</td>
        <td colspan="4" style="color:#ff8b8b">Error: ${d.error}</td>
      `;
    } else {
      // d: { name, summonerLevel, profileIconId, ranked (array), puuid, id }
      const soloq = Array.isArray(d.ranked) && d.ranked.find(r => r.queueType === "RANKED_SOLO_5x5");
      const rankText = soloq ? `${soloq.tier} ${soloq.rank}` : "Unranked";
      const lp = soloq ? soloq.leaguePoints : "-";
      const wins = soloq ? soloq.wins : "-";
      const losses = soloq ? soloq.losses : "-";
      const type = soloq ? soloq.queueType.replace("RANKED_","").replace("_"," ") : "-";

      tr.innerHTML = `
        <td>${idx+1}</td>
        <td><a class="opgg" href="https://www.op.gg/summoners/euw/${encodeURIComponent(d.name)}" target="_blank" rel="noopener noreferrer">${d.name}</a></td>
        <td>${rankText}</td>
        <td>${lp}</td>
        <td>${wins} / ${losses}</td>
        <td>${type}</td>
      `;
    }
    tableBody.appendChild(tr);
  });

  const now = new Date();
  lastUpdateEl.textContent = now.toLocaleString();
  refreshBtn.disabled = false;
}

refreshBtn.addEventListener("click", actualizarTabla);

// inicial
actualizarTabla();
