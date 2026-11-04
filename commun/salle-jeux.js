// Jeux en ligne : changer de jeu en gardant la même salle (même code, mêmes joueurs).
// L'hôte choisit un autre jeu dans la salle d'attente : il prévient les téléphones, puis
// tout le monde ouvre le nouveau jeu, qui recrée la salle avec le même code.
// Le passage d'un jeu à l'autre se fait par le stockage du navigateur (clé « evg-suite »).
(() => {
  const JEUX = [
    { id: "mafia-pas-mafia",   nom: "Mafia ou pas mafia" },
    { id: "draft-des-anciens", nom: "Draft des anciens" },
    { id: "qui-a-dit-ca",      nom: "Qui a dit ça ?" }
  ];
  const cur = (location.pathname.match(/\/([^/]+)\/multijoueur\.html$/) || [])[1];
  const rd = k => { try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
  const wr = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const url = id => `../${id}/multijoueur.html`;
  const valide = id => JEUX.some(j => j.id === id);
  window.EVG_SALLE = {
    // Bloc de la salle d'attente de l'hôte
    html: () => `<h2 class="h2">Changer de jeu</h2>
      <p class="hint">Même salle, mêmes joueurs : les téléphones passent au nouveau jeu tout seuls.</p>
      <div class="vote">${JEUX.filter(j => j.id !== cur).map(j => `<button class="btn ghost" data-jeu="${j.id}">${esc(j.nom)}</button>`).join("")}</div>`,
    // o : { code, moi (prénom de l'hôte s'il joue), envoyer(message), fermer() }
    bind(root, o){
      root.querySelectorAll("[data-jeu]").forEach(b => b.onclick = () => {
        const j = JEUX.find(x => x.id === b.dataset.jeu); if(!j) return;
        window.askConfirm(`Passer à ${j.nom} avec les mêmes joueurs ?`, () => {
          o.envoyer({ t: "goto", jeu: j.id, code: o.code });
          wr("evg-suite", { role: "host", jeu: j.id, code: o.code, moi: o.moi || null, t: Date.now() });
          // Laisse le temps au message de partir avant de changer de page
          setTimeout(() => { o.fermer(); location.href = url(j.id); }, 600);
        }, "Changer de jeu");
      });
    },
    // Téléphone d'un joueur : l'hôte a changé de jeu (message non authentifié : jeu vérifié)
    suivre(m, code, name){
      if(!m || m.t !== "goto" || !valide(m.jeu) || m.jeu === cur || m.code !== code || !name) return false;
      wr("evg-suite", { role: "player", jeu: m.jeu, code, name, t: Date.now() });
      location.href = url(m.jeu);
      return true;
    },
    // Au démarrage d'un jeu : la salle à reprendre, si on vient de changer de jeu
    suite(){
      const s = rd("evg-suite"); wr("evg-suite", null);
      if(!s || s.jeu !== cur || !/^[A-Z]{4}$/.test(s.code || "") || Date.now() - (+s.t || 0) > 120000) return null;
      if(s.role === "player" && !s.name) return null;
      return { role: s.role === "host" ? "host" : "player", code: s.code, name: String(s.name || "").slice(0, 24), moi: s.moi ? String(s.moi).slice(0, 24) : null };
    }
  };
})();
