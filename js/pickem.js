async function guardarPicks() {
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre) return alert("Debes escribir tu nombre");

  const picks = ['grupoA', 'grupoB', 'grupoC'].map(grupo => {
    const pick = document.getElementById(grupo).value;
    return pick ? { usuario: nombre, grupo, pick } : null;
  }).filter(Boolean);

  if (picks.length === 0) return alert("Debes seleccionar al menos un jugador");

  await supabase.from("pickems").delete().eq("usuario", nombre);
  const { error } = await supabase.from("pickems").insert(picks);

  if (error) {
    alert("Error al guardar picks");
    console.error(error);
  } else {
    alert("✅ Tus picks fueron guardados correctamente");
  }
}
