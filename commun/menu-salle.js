// Jeux en ligne : un lien « ← Menu des jeux » en bas de chaque écran.
// Chaque jeu peut définir window.EVG_QUITTER(retour) pour fermer ou quitter proprement
// la salle avant de revenir au menu (avec une confirmation).
(() => {
  const app = document.getElementById("app");
  if(!app) return;
  const retour = () => { location.href = "../index.html"; };
  const ajouter = () => {
    const s = app.querySelector(":scope > section");
    if(!s || s.querySelector("#menuBack")) return;
    const b = document.createElement("button");
    b.className = "link"; b.id = "menuBack"; b.type = "button"; b.textContent = "← Menu des jeux";
    b.onclick = () => window.EVG_QUITTER ? window.EVG_QUITTER(retour) : retour();
    s.appendChild(b);
  };
  // L'écran est redessiné souvent : on remet le lien à chaque fois
  new MutationObserver(ajouter).observe(app, { childList: true });
  ajouter();
})();
