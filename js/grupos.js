/* ===== Grupos Dinámicos ===== */

const SOURCES = ['data/puntos.json'];

document.addEventListener('DOMContentLoaded', initGroups);

async function initGroups() {
  const data = await fetchFirstOK(SOURCES);
  const map = normalize(Array.isArray(data) ? data : []);
  render(map);
}

/* --- Utils --- */
async function fetchFirstOK(paths) {
  for (const p of paths) {
    try {
      const url = p + (p.includes('?') ? '&' : '?') + '_=' + Date.now();
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && (Array.isArray(j) ? j.length : true)) return j;
    } catch (_) {}
  }
  console.warn('No se pudo cargar ningún archivo de grupos.');
  return [];
}

/* Convierte el JSON a un Map por grupo con {nombre,puntos} acumulados. */
function normalize(arr) {
  const map = new Map(); // 'A' -> [{nombre,puntos}, ...]
  for (const g of arr) {
    const group = String(g.grupo || g.group || '').toUpperCase();
    if (!group) continue;

    if (!map.has(group)) map.set(group, []);

    const jugadores = Array.isArray(g.jugadores || g.players)
      ? (g.jugadores || g.players)
      : [];

    for (const j of jugadores) {
      const nombre = (j.nombre || j.name || '').trim();
      const puntos = Number(j.puntos ?? j.pts ?? 0);
      if (!nombre) continue;

      // Si el mismo jugador aparece más de una vez en el MISMO grupo, acumulamos.
      const list = map.get(group);
      const i = list.findIndex(x => x.nombre === nombre);
      if (i >= 0) list[i].puntos += puntos;
      else list.push({ nombre, puntos });
    }
  }
  return map;
}

/* Renderiza A..D en #groups-grid */
function render(map) {
  const container = document.querySelector('#groups-grid');
  if (!container) return;

  const order = ['A', 'B', 'C', 'D'];
  container.innerHTML = order.map(g => renderGroup(g, map.get(g) || [])).join('');
}

function renderGroup(grupo, rows) {
  const ordered = rows
    .slice()
    .sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre, 'es'));

  const body = [
    `<div class="group-row-alt group-row-header"><div>Jugador</div><div style="text-align:right">Puntos</div></div>`,
    ...(ordered.length
      ? ordered.map(r => `<div class="group-row-alt"><div>${r.nombre}</div><div style="text-align:right">${r.puntos}</div></div>`)
      : [`<div class="group-row-alt"><div>—</div><div style="text-align:right">0</div></div>`])
  ].join('');

  return `
    <div class="scoreboard">
      <div class="group-header">Grupo ${grupo}</div>
      <div class="group-table-alt">
        ${body}
      </div>
    </div>
  `;
}
