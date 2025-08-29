// js/nav-auth.js
window.addEventListener("DOMContentLoaded", () => {
  const loginBtn  = document.getElementById("nav-login");
  const panelBtn  = document.getElementById("nav-panel");

  if (!window.fb) {
    console.error("Firebase client not loaded");
    return;
  }

  fb.onAuth(user => {
    if (user) {
      // Usuario logueado
      if (loginBtn) loginBtn.style.display = "none";
      if (panelBtn) panelBtn.style.display = "inline-block";
    } else {
      // Usuario deslogueado
      if (loginBtn) loginBtn.style.display = "inline-block";
      if (panelBtn) panelBtn.style.display = "none";
    }
  });
});
