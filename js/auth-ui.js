// js/auth-ui.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { app } from "./firebaseClient.js"; // 👈 debe coincidir con tu archivo real

const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("nav-login");
  const panelBtn = document.getElementById("nav-panel");

  if (!loginBtn || !panelBtn) return;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginBtn.style.display = "none";
      panelBtn.style.display = "inline-block";
    } else {
      loginBtn.style.display = "inline-block";
      panelBtn.style.display = "none";
    }
  });
});
