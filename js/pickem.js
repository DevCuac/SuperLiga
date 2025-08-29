// pickem.js
// Sistema de Pick'em para Latin Chaos
// Lee partidos desde data/proximos.json y resultados desde data/resultados.json

let duelos = [];
let userPicks = JSON.parse(localStorage.getItem("userPicks") || "{}");

// Fusiona proximos.json con resultados.json
async function loadMatches() {
  try {
    const [proxRes, resRes] = await Promise.all([
      fetch("data/proximos.json"),
      fetch("data/resultados.json")
    ]);

    const proximos = await proxRes.json();
    const resultados = await resRes.json();

    // Mapear resultados por fecha+hora o id
    const resultMap = {};
    resultados.forEach(r => {
      const key = `${r.fecha}_${r.hora}_${r.grupo}`;
      resultMap[key] = r;
    });

    // Insertar winner en los duelos
    duelos = proximos.map(d => {
      const key = `${d.fecha}_${d.hora}_${d.grupo}`;
      return {
        ...d,
        winner: resultMap[key]?.winner || ""
      };
    });

    document.getElementById("pick-filter").value = "open"; // por defecto solo mostrar abiertos
    renderPickems();
  } catch (err) {
    console.error("❌ Error cargando archivos JSON", err);
  }
}

// Renderizar lista de partidos
function renderPickems() {
  const list = document.getElementById("pickem-list");
  const filter = document.getElementById("pick-filter").value;
  list.innerHTML = "";

  duelos.forEach((d, i) => {
    const now = new Date();
    const start = new Date(d.start);

    // Estado dinámico
    let estado = "open";
    if (now >= start) estado = "locked";
    if (d.winner && d.winner !== "") estado = "resolved";

    if (filter !== "all" && estado !== filter) return;

    const card = document.createElement("div");
    card.className = "pick-card";
    card.dataset.status = estado;

    card.innerHTML = `
      <div class="pick-head">
        <span><b>${d.modo}</b> — Grupo ${d.grupo} — ${d.fecha} ${d.hora}</span>
        <span class="status" style="color:${
          estado === "open" ? "#0f0" : estado === "locked" ? "#ffb200" : "#999"
        }">${estado.toUpperCase()}</span>
      </div>
      <div class="pick-grid">
        ${d.jugadores
          .map(j => {
            const checked = userPicks[i] === j ? "checked" : "";
            const disabled = estado !== "open" ? "disabled" : "";
            const winnerMark = d.winner === j ? "🏆 " : "";
            return `
              <label class="pick-opt">
                <input type="radio" name="match-${i}" value="${j}" ${checked} ${disabled}>
                <span>${winnerMark}${j}</span>
              </label>`;
          })
          .join("")}
      </div>
    `;

    // Guardar selección en memoria/localStorage
    card.querySelectorAll("input[type=radio]").forEach(radio => {
      radio.addEventListener("change", e => {
        userPicks[i] = e.target.value;
        localStorage.setItem("userPicks", JSON.stringify(userPicks));
        updateStats();
      });
    });

    list.appendChild(card);
  });

  updateStats();
}

// Actualizar estadísticas rápidas
function updateStats() {
  const stats = document.getElementById("stats-inline");
  const total = duelos.length;
  const picks = Object.keys(userPicks).length;
  const abiertos = duelos.filter(d => new Date(d.start) > new Date()).length;
  const resueltos = duelos.filter(d => d.winner && d.winner !== "").length;

  stats.textContent = `Total ${total} • Con pick ${picks} • Abiertos ${abiertos} • Resueltos ${resueltos}`;
}

// Confirmar picks
document.getElementById("btn-submit-picks").addEventListener("click", () => {
  if (!Object.keys(userPicks).length) {
    alert("No has hecho ningún pick todavía.");
    return;
  }
  console.log("✅ Enviando picks confirmados:", userPicks);

  // Aquí podrías enviar los picks a tu backend (Supabase/Firebase)
  alert("✅ Tus picks han sido confirmados.");
});

// Filtro dinámico
document.getElementById("pick-filter").addEventListener("change", renderPickems);

// Cargar JSON al inicio
window.addEventListener("DOMContentLoaded", loadMatches);
