const CANDIDATES = [
  'data/resultados.json','../data/resultados.json','/data/resultados.json'
];

const $ = s => document.querySelector(s);
const out = $('#resultados-list');
const sel = $('#filtro-grupo');
const q   = $('#buscar-jugador');
const btn = $('#btn-refrescar');
const status = $('#estado-carga');

let DATA = [];

function medalIcon(pos){
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return '🏅';
}

function normalize(row){
  const fecha = row.fecha || row.date || '';
  const grupo = (row.grupo || row.group || '').toString().toUpperCase();
  const fase  = row.fase || 'Grupos';
  const jugadores = Array.isArray(row.jugadores) ? [...row.jugadores] : [];

  // Orden estable: pos asc; si no hay pos, por score desc
  jugadores.sort((a,b)=>{
    const pa = Number(a.pos ?? 99), pb = Number(b.pos ?? 99);
    if (pa !== pb) return pa - pb;
    return Number(b.score ?? 0) - Number(a.score ?? 0);
  });

  const ganador = row.ganador || (jugadores[0]?.nombre || '');
  return { fecha, grupo, fase, jugadores, ganador };
}

async function fetchFirstOK(cands){
  const errors=[];
  for (const p of cands){
    const url = p + (p.includes('?')?'&':'?') + '_=' + Date.now();
    try{
      const res = await fetch(url, {cache:'no-store'});
      if (!res.ok) throw new Error('HTTP '+res.status);
      return await res.json();
    }catch(e){ errors.push(`${p} → ${e.message}`); }
  }
  throw new Error('No se pudo cargar resultados.json:\n'+errors.join('\n'));
}

function render(){
  const term = (q?.value||'').trim().toLowerCase();
  const grp = (sel?.value||'').toUpperCase();

  const rows = DATA.filter(r=>{
    const okG = !grp || r.grupo===grp;
    const hay = r.jugadores?.some(j=> (j.nombre||'').toLowerCase().includes(term) );
    return okG && (!term || hay);
  });

  if (!rows.length){
    out.innerHTML = `<div class="card" style="padding:1rem">No hay resultados.</div>`;
    return;
  }

  out.innerHTML = rows.map(r=>{
    // Mostrar SIEMPRE los 4 (si vienen menos, pinta los que haya)
    const players = r.jugadores.slice(0, 4).map(j =>
      `<span class="pill pill-ghost">
        ${medalIcon(Number(j.pos||0))}&nbsp;<strong>${j.nombre}</strong>${j.score!=null?`&nbsp;<small>(${j.score})</small>`:''}
      </span>`
    ).join('');

    return `
      <div class="result-row">
        <div class="col-fecha">${r.fecha || '-'}</div>
        <div class="col-grupo">${r.grupo || '-'}</div>
        <div class="col-jugadores">${players}</div>
        <div class="col-ganador"><span class="pill pill-gold">🏆 ${r.ganador || '-'}</span></div>
      </div>
    `;
  }).join('');
}

async function load(){
  try{
    status.textContent = 'Cargando...';
    const raw = await fetchFirstOK(CANDIDATES);
    DATA = Array.isArray(raw) ? raw.map(normalize) : [];
    render();
    status.textContent = `Mostrando: ${DATA.length}`;
  }catch(e){
    console.error(e);
    out.innerHTML = `<div class="card" style="padding:1rem">Error al cargar.</div>`;
    status.textContent = 'Error';
  }
}

sel?.addEventListener('change', render);
q?.addEventListener('input', render);
btn?.addEventListener('click', load);
document.addEventListener('DOMContentLoaded', load);
