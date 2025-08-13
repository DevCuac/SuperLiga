/**
 * resultados_json.js — FFA 4 jugadores
 * Muestra: Fecha | Grupo | Jugadores (top-4) | Ganador
 * - Autorefresco
 * - Filtros (grupo / búsqueda por jugador)
 * - Compatibilidad: si el JSON viene en 1v1 (jugador1/jugador2), lo convierte a lista de 2
 */

/* ====================== CONFIG ======================= */
const REFRESH_MS = 60000; // auto-refresh cada 60s (0 para desactivar)
const CANDIDATE_PATHS = [
  'data/resultados.json',
  '../data/resultados.json',
  './data/resultados.json',
  '/data/resultados.json'
];
/* ===================================================== */

const $ = (sel) => document.querySelector(sel);
const listEl = $('#resultados-list');
const estadoEl = $('#estado-carga');
const filtroGrupoEl = $('#filtro-grupo');
const buscarJugadorEl = $('#buscar-jugador');
const btnRefrescar = $('#btn-refrescar');

let DATA = [];
let LAST_URL = null;
let refreshTimer = null;

/* ---------- util ---------- */
function resolveURL(path) {
  try { return new URL(path, location.href).toString(); }
  catch { return path; }
}
async function tryFetch(urls) {
  const errors = [];
  for (const p of urls) {
    const url = resolveURL(p);
    try {
      const bust = `_=${Date.now()}`;
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(url + sep + bust, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error('El JSON debe ser un array');
      LAST_URL = url;
      return json;
    } catch (e) {
      errors.push(`${p} → ${e.message}`);
    }
  }
  throw new Error('No se pudo cargar el JSON. Intentos:\n' + errors.join('\n'));
}

/* ---------- normalización (acepta 4-FFA o 1v1) ---------- */
function toPlayersArray(it) {
  // Caso moderno: arreglo "jugadores"
  if (Array.isArray(it.jugadores) && it.jugadores.length) {
    // normaliza a { nombre, pos, score? }
    return it.jugadores
      .map(j => ({
        nombre: String(j.nombre ?? '').trim(),
        pos: Number(j.pos ?? j.puesto ?? 0) || 0,
        score: (j.score != null ? Number(j.score) : undefined)
      }))
      .filter(j => j.nombre);
  }
  // Caso retro: campos jugador1/jugador2 (+ opcional score1/score2)
  const j1 = String(it.jugador1 ?? '').trim();
  const j2 = String(it.jugador2 ?? '').trim();
  const s1 = Number(it.score1 ?? 0);
  const s2 = Number(it.score2 ?? 0);
  const arr = [];
  if (j1) arr.push({ nombre: j1, pos: s1 >= s2 ? 1 : 2, score: s1 });
  if (j2) arr.push({ nombre: j2, pos: s2 >  s1 ? 1 : 2, score: s2 });
  return arr;
}

function normalizarItem(it) {
  const jugadores = toPlayersArray(it)
    // si vienen sin pos, infiere pos por orden/score
    .map((j, idx) => ({ ...j, pos: j.pos || (idx + 1) }))
    // ordena por pos asc
    .sort((a, b) => a.pos - b.pos)
    .slice(0, 4); // garantizamos top-4

  const ganador =
    it.ganador?.toString().trim() ||
    (jugadores[0]?.nombre || '');

  return {
    id: it.id ?? crypto.randomUUID(),
    ts: Number(it.ts ?? Date.now()),
    fecha: String(it.fecha ?? '').slice(0, 10),
    fase: String(it.fase ?? 'Grupos'),
    grupo: String(it.grupo ?? '').toUpperCase().trim(),
    jugadores,
    ganador
  };
}

/* ---------- render ---------- */
function medalFor(pos) {
  if (pos === 1) return `<span class="medal gold">🥇</span>`;
  if (pos === 2) return `<span class="medal silver">🥈</span>`;
  if (pos === 3) return `<span class="medal bronze">🥉</span>`;
  return `<span class="medal pos4">4º</span>`;
}
function renderPlayers(players) {
  // players: [{nombre, pos, score?}, ...] (hasta 4)
  return `
    <div class="players-list">
      ${players.map(p => `
        <span class="player-chip">
          ${medalFor(p.pos)}
          <span>${p.nombre}${p.score != null ? ` (${p.score})` : ''}</span>
        </span>
      `).join('')}
    </div>
  `;
}

function filtrarOrdenar(data) {
  const g = (filtroGrupoEl?.value || '').toUpperCase();
  const q = (buscarJugadorEl?.value || '').toLowerCase().trim();

  const filtered = data.filter(r => {
    const okG = !g || r.grupo === g;
    const okQ = !q || r.jugadores.some(j => j.nombre.toLowerCase().includes(q)) ||
      r.ganador.toLowerCase().includes(q);
    return okG && okQ;
  });

  // Orden: fecha desc, ts desc
  filtered.sort((a, b) => (b.fecha.localeCompare(a.fecha)) || (b.ts - a.ts));
  return filtered;
}

function render() {
  const arr = filtrarOrdenar(DATA);
  listEl.innerHTML = arr.map(r => `
    <div class="group-row results-row">
      <div>${r.fecha}</div>
      <div>${r.grupo || '-'}</div>
      <div>${renderPlayers(r.jugadores)}</div>
      <div>
        <span class="winner-badge">🏆 ${r.ganador || '-'}</span>
      </div>
    </div>
  `).join('');

  const infoFuente = LAST_URL ? ` · Fuente: ${LAST_URL}` : '';
  estadoEl.textContent = `Mostrando ${arr.length} de ${DATA.length} resultado(s)${infoFuente}`;
}

/* ---------- carga ---------- */
async function cargarJSON() {
  estadoEl.textContent = 'Cargando…';
  try {
    const raw = await tryFetch(CANDIDATE_PATHS);
    DATA = raw.map(normalizarItem);
    render();
    const fecha = new Date().toLocaleString();
    estadoEl.textContent = `Actualizado: ${fecha} · Fuente: ${LAST_URL}`;
  } catch (e) {
    console.error(e);
    estadoEl.textContent = e.message + ' (ver consola)';
  }
}

/* ---------- eventos ---------- */
filtroGrupoEl?.addEventListener('change', render);
buscarJugadorEl?.addEventListener('input', render);
btnRefrescar?.addEventListener('click', cargarJSON);

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  await cargarJSON();
  if (REFRESH_MS > 0) setInterval(cargarJSON, REFRESH_MS);
});
