let partidas = [], pagina = 1, porPagina = 10;

async function cargarPartidas() {
  const { data } = await supabase.from('partidas').select('*').order('fecha', { ascending: false });
  partidas = data;
  poblarFiltroGanadores(data);
  mostrarPagina();
}

function poblarFiltroGanadores(data) {
  const select = document.getElementById("filtrarGanador");
  select.innerHTML = `<option value="">Todos</option>`;
  [...new Set(data.map(p => p.ganador))].forEach(g => {
    const op = document.createElement("option");
    op.value = g;
    op.textContent = g;
    select.appendChild(op);
  });
}

function mostrarPagina() {
  const contenedor = document.getElementById('tabla-partidas');
  contenedor.innerHTML = '';

  const filtro = document.getElementById("buscarJugador").value.toLowerCase();
  const ganadorFiltro = document.getElementById("filtrarGanador").value;

  const filtradas = partidas.filter(p => {
    const nombres = p.jugadores.map(j => j.nombre.toLowerCase());
    return (!filtro || nombres.some(n => n.includes(filtro))) &&
           (!ganadorFiltro || p.ganador === ganadorFiltro);
  });

  const totalPaginas = Math.ceil(filtradas.length / porPagina);
  if (pagina > totalPaginas) pagina = totalPaginas;

  const visibles = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  visibles.forEach(p => {
    const fila = document.createElement("div");
    fila.className = "group-row";
    const jugadores = p.jugadores.map(j => `${j.nombre} (${j.faccion})${j.nombre === p.ganador ? ' ✅' : ''}`).join(', ');
    const duracion = `${Math.floor(p.duracion / 60)}m ${p.duracion % 60}s`;
    fila.innerHTML = `<div>${new Date(p.fecha).toLocaleString()}</div><div>${duracion}</div><div>${p.ganador}</div><div>${jugadores}</div>`;
    contenedor.appendChild(fila);
  });

  document.getElementById("pagina-actual").textContent = `Página ${pagina}`;
  document.getElementById("anterior").disabled = pagina === 1;
  document.getElementById("siguiente").disabled = pagina === totalPaginas;
}

document.getElementById("anterior").onclick = () => { if (pagina > 1) pagina--; mostrarPagina(); };
document.getElementById("siguiente").onclick = () => { pagina++; mostrarPagina(); };
document.getElementById("buscarJugador").oninput = () => { pagina = 1; mostrarPagina(); };
document.getElementById("filtrarGanador").onchange = () => { pagina = 1; mostrarPagina(); };

cargarPartidas();
