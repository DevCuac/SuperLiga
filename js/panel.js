// js/panel.js
const nameInput = document.getElementById("profile-name");
const emailInput = document.getElementById("profile-email");
const picInput = document.getElementById("profile-pic");
const picPreview = document.getElementById("profile-pic-preview");
const form = document.getElementById("profile-form");

const resetBtn = document.getElementById("reset-pass");
const logoutBtn = document.getElementById("logout-btn");
const statsList = document.getElementById("stats-list");

// Al autenticar usuario
fb.onAuth(async user => {
  if (!user) {
    window.location.href = "auth.html?returnTo=panel.html";
    return;
  }

  nameInput.value = user.displayName || "";
  emailInput.value = user.email || "";
  picPreview.src = user.photoURL || "img/default-avatar.png";

  await loadUserStats(user.uid);
});

// Guardar perfil
form.addEventListener("submit", async e => {
  e.preventDefault();
  const user = fb.auth.currentUser;
  if (!user) return;

  try {
    let photoURL = user.photoURL;
    if (picInput.files[0]) {
      photoURL = await fb.uploadProfilePic(user.uid, picInput.files[0]);
    }
    await fb.saveUserProfile(user.uid, nameInput.value, photoURL);

    picPreview.src = photoURL || "img/default-avatar.png";
    alert("Perfil actualizado correctamente.");
  } catch (err) {
    console.error(err);
    alert("Error al actualizar perfil.");
  }
});

// Resetear contraseña
resetBtn.addEventListener("click", async () => {
  const user = fb.auth.currentUser;
  if (!user?.email) return alert("Tu cuenta no tiene correo.");
  try {
    await fb.emailReset(user.email);
    alert("Se envió un correo para restablecer la contraseña.");
  } catch (e) {
    console.error(e);
    alert("Error al enviar correo.");
  }
});

// Cerrar sesión
logoutBtn.addEventListener("click", async () => {
  await fb.signOutUser();
  window.location.href = "index.html";
});

// Cargar estadísticas
async function loadUserStats(uid) {
  try {
    const submissions = await fb.fetchSubmissions();
    const mySubmission = submissions.find(s => s.uid === uid);

    if (!mySubmission) {
      statsList.innerHTML = "<li>Aún no has hecho ningún pick.</li>";
      return;
    }

    // Cargar resultados oficiales
    const res = await fetch("data/resultados.json");
    const resultados = await res.json();

    let totalPicks = 0;
    let aciertos = 0;
    let fallos = 0;

    for (const matchId in mySubmission.picks || {}) {
      totalPicks++;
      const pick = mySubmission.picks[matchId];
      const result = resultados[matchId];

      if (result?.winner) {
        if (pick === result.winner) aciertos++;
        else fallos++;
      }
    }

    statsList.innerHTML = `
      <li><strong>Total de picks:</strong> ${totalPicks}</li>
      <li><strong>Aciertos:</strong> ${aciertos}</li>
      <li><strong>Fallos:</strong> ${fallos}</li>
    `;
  } catch (e) {
    console.error(e);
    statsList.innerHTML = "<li>Error al cargar estadísticas.</li>";
  }
}
