async function cargarRanking() {
  const { data: picks } = await supabase.from("pickems").select("*");
  const { data: partidas } = await supabase.from("partidas").select("ganador, jugadores");

  const resultados = {};
  partidas.forEach(p => {
    const grupo = Object.entries(grupoReferencias).find(([_, lista]) =>
      lista.some(j => p.jugadores.some(jp => jp.nombre === j))
    )?.[0];

    if (grupo && !resultados[grupo]) {
      resultados[grupo] = p.ganador;
    }
  });

  const usuarios = {};
  picks.forEach(pick => {
    if (!usuarios[pick.usuario]) usuarios[pick.usuario] = { aciertos: 0, fallos: 0 };
    const predicho = pick.pick;
    const real = resultados[pick.grupo];
    if (!real) return;
    if (predicho === real) usuarios[pick.usuario].aciertos++;
    else usuarios[pick.usuario].fallos++;
  });

  const tabla = document.getElementById("ranking-body");
  Object.entries(usuarios)
    .sort((a, b) => b[1].aciertos - a[1].aciertos)
    .forEach(([usuario, { aciertos, fallos }]) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${usuario}</td>
        <td style="color:#00ff88">${aciertos}</td>
        <td style="color:#ff6666">${fallos}</td>
        <td>${aciertos + fallos}</td>
      `;
      tabla.appendChild(fila);
    });
}

const grupoReferencias = {
  grupoA: ['Jugador1', 'Jugador2', 'Jugador3', 'Jugador4'],
  grupoB: ['Jugador5', 'Jugador6', 'Jugador7', 'Jugador8'],
  grupoC: ['Jugador9', 'Jugador10', 'Jugador11', 'Jugador12'],
};

cargarRanking();
