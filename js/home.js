/* ========= HOME (index) =========
   Próximos | Preview Grupos | Top Pick'em (Resumen)
   ================================================ */

const $ = s => document.querySelector(s);

/* ---- DOM ---- */
const elGridDuels = $('#proximos-grid');
const elSelGrupo  = $('#home-grupo');
const elSelFecha  = $('#home-fecha');
const elStatus    = $('#home-status');
const elGroups    = $('#preview-grupos');

/* ---- Fuentes ---- */
const MATCH_SOURCES = ['data/proximos.json','data/duelos.json','data/partidas.json','data/agenda.json','data/calendario.json'];
const GROUP_SOURCES = ['data/grupos.json','data/grupos_puntos.json','data/puntos.json','data/resultados.json'];
const BOARD_SOURCES = ['data/pickem_submissions.json','data/pickem_global.json'];

const MATCH_DURATION_MIN = 75;
const MAX_HOME_DUELS = 2;

let MATCHES = [];
let GROUPMAP = new Map();

/* ---------- Utils ---------- */
async function fetchFirstOK(paths){
  for (const p of paths){
    try{
      const url = p + (p.includes('?')?'&':'?') + '_=' + Date.now();
      const r = await fetch(url, {cache:'no-store'});
      if (!r.ok) continue;
      const j = await r.json();
      if (j && (Array.isArray(j) ? j.length : true)) return j;
    }catch(_){}
  }
  return null;
}
function get(o, keys, fallback=''){
  for (const k of keys) { const v = o?.[k]; if (v !== undefined && String(v).trim()!=='') return v; }
  return fallback;
}
function collectPlayers(row){
  const list = row.jugadores || row.players || row.teams;
  if (Array.isArray(list)){
    return list.slice(0,4).map(x => (typeof x==='string') ? x : (x?.nombre || x?.name || x?.player || x?.team || '')).filter(Boolean);
  }
  const CANDS = [
    ['player1','jugador1','j1','p1','t1','uno','a'],
    ['player2','jugador2','j2','p2','t2','dos','b'],
    ['player3','jugador3','j3','p3','t3','tres','c'],
    ['player4','jugador4','j4','p4','t4','cuatro','d'],
  ];
  const out = [];
  for (const ks of CANDS){
    const n = get(row, ks, ''); if (n) out.push(n);
  }
  return out;
}
function parseTimestampMaybe(ts){ const n=Number(ts); if(!isFinite(n))return null; const ms=n<1e12?n*1000:n; const d=new Date(ms); return isNaN(d)?null:d; }
function parseStart(row){
  const ts = get(row, ['timestamp','ts'], '');
  if (ts){ const d = parseTimestampMaybe(ts); if (d) return d; }
  const iso = get(row, ['start','inicio','inicioIso','start_iso','fechaIso','fechaISO','datetime','datetime_iso','fechaHora','fecha_hora'], '');
  if (iso){ const d = new Date(iso); if (!isNaN(d)) return d; }
  const date = get(row, ['date','fecha','dia'], '');
  if (date){
    const time = get(row, ['time','hora'], '00:00');
    const tz   = get(row, ['tz','timezone','zona'], '');
    const stamp = tz && /^([+-]\d{2}:\d{2}|GMT[+-]\d{2}:\d{2})$/.test(tz)
      ? `${date}T${time}${tz.replace('GMT','')}` : `${date}T${time}`;
    const d = new Date(stamp); if (!isNaN(d)) return d;
  }
  return null;
}
function normalizeMatch(item){
  return {
    start:  parseStart(item),
    group:  String(get(item, ['grupo','group','gpo','g'], '')).toUpperCase(),
    mode:   get(item, ['modo','mode'], 'Bo1'),
    players: collectPlayers(item).slice(0,4),
    winner: get(item, ['winner','ganador'], '')
  };
}
function matchState(start, now = new Date()){
  if (!start) return {label:'—', tone:'-'};
  const end = new Date(start.getTime() + MATCH_DURATION_MIN*60000);
  if (now < start){
    const mins = Math.round((start-now)/60000);
    if (mins >= 60){ const h=Math.floor(mins/60), m=mins%60; return {label:`Comienza en ${h}h ${m}m`, tone:'up'}; }
    return {label:`Comienza en ${mins}m`, tone:'up'};
  }
  if (now <= end) return {label:'En juego', tone:'live'};
  return {label:'Finalizado', tone:'done'};
}
function fmtDateTime(d){
  if (!d) return '—';
  const fD = new Intl.DateTimeFormat('es-PE',{weekday:'short', day:'2-digit', month:'short'}).format(d);
  const fT = new Intl.DateTimeFormat('es-PE',{hour:'2-digit', minute:'2-digit'}).format(d);
  return `${fD} · ${fT}`;
}
function pill(txt, cls=''){ return `<span class="pill ${cls}">${txt}</span>`; }

/* ---------- Filtros ---------- */
function filterByPreset(m){
  const p = String((elSelFecha?.value||'upcoming')).toLowerCase();
  if (!m.start) return false;
  const now = new Date();
  const t   = m.start.getTime();
  if (p==='all')   return true;
  if (p==='today'){ const d0=new Date(now); d0.setHours(0,0,0,0); const d1=new Date(now); d1.setHours(23,59,59,999); return t>=d0.getTime() && t<=d1.getTime(); }
  if (p==='past'){ const d0=new Date(now); d0.setHours(0,0,0,0); return t < d0.getTime(); }
  if (p==='week'){
    const dow = now.getDay(); const diff = (dow===0 ? -6 : 1-dow);
    const w0 = new Date(now); w0.setDate(now.getDate()+diff); w0.setHours(0,0,0,0);
    const w1 = new Date(w0);  w1.setDate(w0.getDate()+6);     w1.setHours(23,59,59,999);
    return t>=w0.getTime() && t<=w1.getTime();
  }
  return t > now.getTime(); // upcoming
}

/* ---------- Próximos ---------- */
function renderMatches(){
  if (!elGridDuels) return;
  const grp = (elSelGrupo?.value||'').toUpperCase();
  const filtered = MATCHES
    .filter(m => (!grp || m.group===grp) && filterByPreset(m))
    .sort((a,b)=> (a.start?.getTime()||0) - (b.start?.getTime()||0));
  const show = filtered.slice(0, MAX_HOME_DUELS);
  if (elStatus) elStatus.textContent = `Mostrando: ${show.length} / ${filtered.length}`;
  elGridDuels.innerHTML = show.length ? show.map(m=>{
    const st = matchState(m.start);
    const players = (m.players||[]).map(n=>pill(n,'pill-ghost')).join(' ');
    return `
      <div class="duelo-mini card">
        <div class="duelo-mini-top">
          <div class="left">${pill(m.group||'-','pill-gold')} ${pill(m.mode||'Bo1')}</div>
          <div class="mini-time">${fmtDateTime(m.start)}</div>
        </div>
        <div class="duelo-mini-body"><div class="players">${players}</div></div>
        <div class="duelo-mini-footer">
          ${pill(st.label, st.tone==='live'?'pill-live': st.tone==='up'?'pill-ghost':'pill')}
        </div>
      </div>
    `;
  }).join('') : `<div class="muted" style="padding:8px 2px;font-weight:700">No hay duelos próximos con los filtros actuales.</div>`;
}
async function loadMatches(){
  const raw = await fetchFirstOK(MATCH_SOURCES);
  const arr = Array.isArray(raw) ? raw : (raw?.proximos || raw?.items || raw?.matches || raw?.duelos || []);
  MATCHES = (arr||[]).map(normalizeMatch).filter(m => (m.players||[]).length>=2 && m.start);
  renderMatches();
}

/* ---------- Preview Grupos ---------- */
function normalizeGroups(arr){
  const map = new Map();
  for (const g of (arr||[])){
    const key = String(g.grupo || g.group || '').toUpperCase();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    const js = Array.isArray(g.jugadores || g.players) ? (g.jugadores || g.players) : [];
    const list = map.get(key);
    for (const j of js){
      const nombre = (j.nombre || j.name || '').trim();
      const puntos = Number(j.puntos ?? j.pts ?? 0);
      if (!nombre) continue;
      const i = list.findIndex(x=>x.nombre===nombre);
      if (i>=0) list[i].puntos += puntos; else list.push({nombre, puntos});
    }
  }
  return map;
}
function renderGroupPreview(map){
  if (!elGroups) return;
  const want = ['A','B'];
  elGroups.innerHTML = want.map(g=>{
    const rows = (map.get(g)||[])
      .slice()
      .sort((a,b)=> b.puntos - a.puntos || a.nombre.localeCompare(b.nombre,'es'))
      .slice(0,7);
    const body = [
      `<div class="group-row-alt group-row-header"><div>Jugador</div><div style="text-align:right">Puntos</div></div>`,
      ...(rows.length ? rows.map(r=>`<div class="group-row-alt"><div>${r.nombre}</div><div style="text-align:right">${r.puntos}</div></div>`)
                      : [`<div class="group-row-alt"><div>—</div><div style="text-align:right">0</div></div>`])
    ].join('');
    return `
      <div class="scoreboard">
        <div class="group-header">GRUPO ${g}</div>
        <div class="group-table-alt">${body}</div>
      </div>
    `;
  }).join('');
}
async function loadGroups(){
  const raw = await fetchFirstOK(GROUP_SOURCES);
  GROUPMAP = normalizeGroups(Array.isArray(raw)?raw:[]);
  renderGroupPreview(GROUPMAP);
}

/* ---------- TOP Pick'em (Resumen) ---------- */
function ensureTopHost(){
  let host = document.querySelector('#home-top, #summary-top, #resumen-torneo, .summary-card');
  if (host){ host.classList.add('home-top-card'); return host; }
  host = document.createElement('section');
  host.id = 'home-top';
  host.className = 'home-top-card';
  const main = document.querySelector('.main-wrap') || document.body;
  main.prepend(host);
  return host;
}

function renderHomeTop(rows){
  const host = ensureTopHost();

  const tableRows = (rows && rows.length)
    ? rows.map((r,i)=>`
        <tr>
          <td style="width:42px;text-align:right;font-weight:800">${i+1}</td>
          <td>${r.user}</td>
          <td style="text-align:right">${r.ok}</td>
          <td style="text-align:right">${r.total}</td>
          <td style="text-align:right">${r.eff.toFixed(0)}%</td>
        </tr>`).join('')
    : `<tr><td colspan="5" class="muted">Aún no hay envíos.</td></tr>`;

  host.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h2>🏆 Top Pick'em (Global)</h2>
        <a class="btn btn-ghost" href="tops.html" style="margin-left:auto">Ver tabla completa →</a>
      </div>
      <div class="panel-body">
        <table class="home-top-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Usuario</th>
              <th style="text-align:right">Aciertos</th>
              <th style="text-align:right">Total</th>
              <th style="text-align:right">Efectividad</th>
            </tr>
          </thead>
          <tbody id="home-top-tbody">
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// --- reemplaza COMPLETO ---
async function loadHomeTop(){
  // 1) lee envíos globales (si hay)
  const submissions = await window.fb.fetchSubmissions().catch(()=>[]);

  // 2) si no hay nada, usa tu pick local como “preview”
  let entries = submissions;
  if (!entries.length){
    const me = (localStorage.getItem('lc_pickem_user') || '').replace(/(^"|"$)/g,'') || 'anon';
    const picksLocal = JSON.parse(localStorage.getItem('lc_pickem_v1') || '{}'); // {id: "Jugador"}
    if (Object.keys(picksLocal).length){
      entries = [{ user: me, picks: picksLocal }];
    }
  }

  // winners (traídos desde Firebase igual que en tops.js)
  const winners = {};
  try {
    const res = await fetch("data/resultados.json", {cache:"no-store"});
    if (res.ok){
      const arr = await res.json();
      for (const m of arr){
        if (m.id && m.winner) winners[m.id] = m.winner;
      }
    }
  } catch(e){}

  // normaliza submissions
  const norm = entries.map(row=>{
    const user = row.user || row.usuario || row.nick || 'anon';
    let picks = {};
    if (Array.isArray(row.picks)){
      for (const p of row.picks){
        if (p && p.id) picks[p.id] = p.pick || p.choice || p.ganador || '';
      }
    } else if (row.picks && typeof row.picks==='object'){
      picks = row.picks;
    }
    return { user, picks };
  });

  // score
  const scored = norm.map(e=>{
    let ok=0,total=0;
    for (const mid in winners){
      total++;
      const pick = e.picks[mid];
      if (pick && String(pick).trim() === String(winners[mid]).trim()) ok++;
    }
    const eff = total ? (ok/total*100) : 0;
    return { user:e.user, ok, total, eff };
  })
  .sort((a,b)=> b.ok - a.ok || b.eff - a.eff || a.user.localeCompare(b.user,'es'))
  .slice(0, 8); // preview corto en el home

  renderHomeTop(scored);
}

/* ---------- Boot ---------- */
function bind(){ elSelGrupo?.addEventListener('change', renderMatches); elSelFecha?.addEventListener('change', renderMatches); }
async function init(){ bind(); await loadMatches(); await Promise.all([loadGroups(), loadHomeTop()]); }
document.addEventListener('DOMContentLoaded', init);
