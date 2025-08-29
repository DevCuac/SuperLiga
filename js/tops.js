// js/tops.js
async function fetchResultados() {
  const res = await fetch("data/resultados.json");
  if (!res.ok) return {};
  const arr = await res.json();
  const winners = {};
  for (const m of arr) {
    if (m.winner) winners[m.id] = m.winner;
  }
  return winners;
}

async function buildRanking() {
  const tbody = document.getElementById("tops-tbody");
  tbody.innerHTML = `<tr><td colspan="5" class="muted">Cargando…</td></tr>`;

  const submissions = await window.fb.fetchSubmissions();
  const winners = await fetchResultados();

  const users = [];
  for (const sub of submissions) {
    const picks = sub.picks || {};
    let aciertos = 0, total = 0;
    for (const mid in winners) {
      total++;
      const pick = Array.isArray(picks)
        ? (picks.find(p=>p.id===mid)?.pick)
        : picks[mid];
      if (pick && pick === winners[mid]) aciertos++;
    }
    const eff = total ? (aciertos/total)*100 : 0;
    users.push({
      name: sub.user || "Anon",
      aciertos, total, eff
    });
  }

  // Orden inicial
  let sortMode = document.getElementById("tops-sort").value;
  let searchVal = document.getElementById("tops-search").value.toLowerCase();

  let ranked = users.filter(u => u.name.toLowerCase().includes(searchVal));
  if (sortMode === "best") {
    ranked.sort((a,b) => b.aciertos - a.aciertos || b.eff - a.eff || a.name.localeCompare(b.name));
  } else if (sortMode === "eff") {
    ranked.sort((a,b) => b.eff - a.eff || b.aciertos - a.aciertos || a.name.localeCompare(b.name));
  } else {
    ranked.sort((a,b)=> a.name.localeCompare(b.name));
  }

  // Render
  tbody.innerHTML = "";
  ranked.forEach((u,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${u.name}</td>
      <td class="num">${u.aciertos}</td>
      <td class="num">${u.total}</td>
      <td class="num">${u.eff.toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("tops-meta").innerText = 
    `Mostrando ${ranked.length} usuarios | Total de partidas resueltas: ${Object.keys(winners).length}`;
}

// Eventos
document.getElementById("tops-refresh").addEventListener("click", buildRanking);
document.getElementById("tops-sort").addEventListener("change", buildRanking);
document.getElementById("tops-search").addEventListener("input", buildRanking);

window.addEventListener("DOMContentLoaded", buildRanking);
