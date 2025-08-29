/* ============================
 * Calendario FFA (2–4 jugadores) + Filtro de fecha
 * ============================ */

const CALENDAR_SOURCES = [
  'data/partidas.json',  // recomendado (nuevo)
  'data/duelos.json',    // legacy
  'data/proximos.json'   // fallback
];

const $ = s => document.querySelector(s);
const list   = $('#calendario-lista');
const sel    = $('#filtro-grupo');
const q      = $('#buscar');
const status = $('#cal-status');

/* NUEVO: controles de fecha */
const presetSel = $('#preset-fecha');
const desdeInp  = $('#desde');
const hastaInp  = $('#hasta');
const btnClear  = $('#btn-limpiar');

let MATCHES = [];

/* ---------- helpers ---------- */
function tryFields(o, keys, fallback='') {
  for (const k of keys) {
    if (o && o[k] != null && String(o[k]).trim() !== '') return o[k];
  }
  return fallback;
}

function collectPlayersLegacy(row) {
  // Intenta leer hasta 4 jugadores desde múltiples alias
  const cand = [
    ['player1','jugador1','j1','team_a','a','p1','t1','uno'],
    ['player2','jugador2','j2','team_b','b','p2','t2','dos'],
    ['player3','jugador3','j3','team_c','c','p3','t3','tres'],
    ['player4','jugador4','j4','team_d','d','p4','t4','cuatro'],
  ];
  const players = [];
  for (const arr of cand) {
    const name = tryFields(row, arr, '');
    if (name) players.push(name);
  }
  return players;
}

/* ---------- normalizador ---------- */
/** Salida estándar:
 * {
 *   start: Date|null,
 *   group: "A"|"B"|"C"|"D"|string,
 *   mode: string,             // "Bo1" por defecto
 *   players: string[],        // 2–4 jugadores
 *   winner?: string           // opcional
 * }
 */
function normalize(item){
  // Esquema tipo proximos.json → {start, group, mode, teams:[...], winner?}
  if (item.start && Array.isArray(item.teams)) {
    return {
      start: new Date(item.start),
      group: String(item.group||'').toUpperCase(),
      mode: item.mode || 'Bo1',
      players: item.teams.slice(0,4).filter(Boolean),
      winner: item.winner || ''
    };
  }

  // Esquemas legacy (partidas/duelos)
  const date  = tryFields(item, ['date','fecha']);
  const time  = tryFields(item, ['time','hora'], '00:00');
  const tz    = tryFields(item, ['tz'], '');
  const group = tryFields(item, ['group','grupo']).toString().toUpperCase();
  const mode  = tryFields(item, ['mode','modo'], 'Bo1');
  const winner= tryFields(item, ['winner','ganador'], '');

  // construir Date respetando tz si viene como ±HH:MM
  let start = null;
  if (date) {
    start = tz && /^([+-]\d{2}:\d{2})$/.test(tz)
      ? new Date(`${date}T${time}${tz}`)
      : new Date(`${date}T${time}`);
  }

  const players = collectPlayersLegacy(item);
  return { start, group, mode, players, winner };
}

/* ---------- fechas ---------- */
function atMidnight(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}
function endOfDay(d){
  const x = new Date(d);
  x.setHours(23,59,59,999);
  return x;
}
function startOfWeek(d){
  // semana Lunes–Domingo (ajústalo si prefieres)
  const x = new Date(d);
  const day = x.getDay(); // 0 Dom .. 6 Sáb
  const diff = (day === 0 ? -6 : 1 - day); // mover a lunes
  x.setDate(x.getDate() + diff);
  return atMidnight(x);
}
function endOfWeek(d){
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate()+6);
  return endOfDay(e);
}

function matchDateOK(m, now=new Date()){
  const ms = m.start ? m.start.getTime() : null;

  // Rango custom tiene prioridad si hay al menos un campo
  const hasFrom = !!desdeInp.value;
  const hasTo   = !!hastaInp.value;
  if (hasFrom || hasTo) {
    const from = hasFrom ? atMidnight(desdeInp.value).getTime() : -Infinity;
    const to   = hasTo   ? endOfDay(hastaInp.value).getTime()   :  Infinity;
    if (ms == null) return false; // sin fecha no califica cuando filtras por rango
    return ms >= from && ms <= to;
  }

  // Preset
  const p = presetSel.value || 'all';
  if (p === 'all') return true;
  if (ms == null) return false;

  const today0 = atMidnight(now).getTime();
  const today1 = endOfDay(now).getTime();

  if (p === 'today')   return ms >= today0 && ms <= today1;
  if (p === 'upcoming')return ms > today1;
  if (p === 'past')    return ms < today0;
  if (p === 'week') {
    const s = startOfWeek(now).getTime();
    const e = endOfWeek(now).getTime();
    return ms >= s && ms <= e;
  }
  return true;
}

/* ---------- fetch con fallback ---------- */
async function fetchFirstOK(paths){
  const errs=[];
  for (const p of paths){
    const url = p + (p.includes('?')?'&':'?') + '_=' + Date.now();
    try{
      const r = await fetch(url, {cache:'no-store'});
      if (!r.ok) throw new Error('HTTP '+r.status);
      const json = await r.json();
      if (!json || (Array.isArray(json) && json.length===0)) throw new Error('JSON vacío');
      return { source:p, data:json };
    }catch(e){ errs.push(`${p} → ${e.message}`); }
  }
  throw new Error('No se pudo cargar calendario:\n'+errs.join('\n'));
}

/* ---------- render ---------- */
function pill(txt, cls=''){
  return `<span class="pill ${cls}">${txt}</span>`;
}

function render(){
  const term = (q.value||'').trim().toLowerCase();
  const grp  = (sel.value||'').toUpperCase();

  const now = new Date();

  const data = MATCHES
    .filter(m=>{
      const okG = !grp || (m.group||'').toUpperCase()===grp;
      const names = (m.players||[]).join(' ').toLowerCase();
      const okQ = !term || names.includes(term);
      const okDate = matchDateOK(m, now);
      return okG && okQ && okDate;
    })
    .sort((a,b)=> (a.start?.getTime()||0) - (b.start?.getTime()||0));

  list.innerHTML = data.map(match=>{
    const dt = match.start ? new Date(match.start) : null;
    const fecha = dt ? dt.toLocaleDateString([], {day:'2-digit', month:'short'}) : '—';
    const hora  = dt ? dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';

    // Render FFA: muestra TODOS los jugadores presentes (2–4)
    const playersHTML = (match.players||[]).slice(0,4).map(n=> pill(n, 'pill-ghost')).join(' ');

    const winnerHTML = match.winner
      ? pill(`Ganó: ${match.winner}`, 'pill-success')
      : '';

    return `
      <div class="duelo-card card">
        <div class="duelo-fecha">${fecha}${hora?` — ${hora}`:''}</div>
        <div class="duelo-jugadores">
          ${playersHTML}
        </div>
        <div class="duelo-detalles">
          ${pill(`Grupo ${match.group||'-'}`, 'pill-gold')}
          ${pill(`Modo ${match.mode||'Bo1'}`)}
          ${winnerHTML}
        </div>
      </div>
    `;
  }).join('');
}

/* ---------- main ---------- */
async function cargar(){
  try{
    status.textContent = 'Cargando…';
    const { source, data } = await fetchFirstOK(CALENDAR_SOURCES);
    MATCHES = (Array.isArray(data)?data:[])
      .map(normalize)
      .filter(m=> (m.players||[]).length >= 2); // exige al menos 2, soporta hasta 4
    render();
    status.textContent = `Cargados: ${MATCHES.length} · Fuente: ${source}`;
  }catch(e){
    console.error(e);
    list.innerHTML = `<div class="card" style="padding:1rem">No se pudo cargar el calendario.</div>`;
    status.textContent = 'Error';
  }
}

/* eventos */
sel?.addEventListener('change', render);
q?.addEventListener('input', render);
presetSel?.addEventListener('change', render);
desdeInp?.addEventListener('change', ()=>{ presetSel.value='all'; render(); });
hastaInp?.addEventListener('change', ()=>{ presetSel.value='all'; render(); });
btnClear?.addEventListener('click', ()=>{
  presetSel.value='all';
  desdeInp.value=''; hastaInp.value='';
  q.value=''; sel.value='';
  render();
});

document.addEventListener('DOMContentLoaded', cargar);

/* ---------- clases de apoyo (si no están en tu CSS) ----------
.pill-ghost { background: rgba(255,255,255,.06); border:1px solid var(--line); color:#e8e0c8; }
.pill-success { border-color:#2a5e35; color:#8cff98; }
----------------------------------------------------------------*/
