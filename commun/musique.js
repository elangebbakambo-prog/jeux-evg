/* =========================================================
   Musique des battles : lecteur SoundCloud partagé par les jeux
   - L'hôte colle le lien d'une playlist SoundCloud par catégorie (Hip hop, Popping, All style).
   - À chaque duel, « Tirer un son » choisit un morceau au hasard dans la playlist,
     démarre à un moment au hasard et coupe après la durée choisie.
   - Le lecteur vit dans une barre fixe en bas de l'écran, hors de <main id="app"> :
     il continue de jouer quand l'écran du jeu se redessine (votes qui arrivent…).
   Utilisation : Musique.settingsHTML() + Musique.bindSettings(el) dans les réglages,
   Musique.show(categorie) pendant un duel, Musique.hide() sinon.
   ========================================================= */
window.Musique = (() => {
  const KEY = "battle-musique";
  const CATS = { all: "All style", hiphop: "Hip hop", popping: "Popping" };
  const LENS = [[30, "30 s"], [45, "45 s"], [60, "1 min"], [0, "Entier"]];
  // Sons par défaut (trouvés sur SoundCloud depuis la playlist « Training » d'Elange).
  // Un lien « /sets/ » est une playlist : le lecteur y tire un morceau au hasard.
  const SONS = {
    hiphop: [
      "https://soundcloud.com/keltheartist/facebook",
      "https://soundcloud.com/keltheartist/too-flyyy-doechii-flip",
      "https://soundcloud.com/keltheartist/genie",
      "https://soundcloud.com/keltheartist/sets/no-ls",
      "https://soundcloud.com/randytchik/airmax-w-leonoxis-gab-v-jd",
      "https://soundcloud.com/randytchik/patapim",
      "https://soundcloud.com/randytchik/le-lac-des-cygnes",
      "https://soundcloud.com/tellaxthemonster/i-am-music-evil-tellax",
      "https://soundcloud.com/michael-camino-650943282/save-my-people-through-the-music",
      "https://soundcloud.com/wassim-ramdani-38095672/wass-p-m-p-m-1",
      "https://soundcloud.com/storyteller2k/jude2k-airbang-5",
      "https://soundcloud.com/storyteller2k/sets/realboss2k",
      "https://soundcloud.com/storyteller2k/bigkiss-o4newg-star-edition-1",
      "https://soundcloud.com/storyteller2k/moonagi-full-liberation-on-bandcamp",
      "https://soundcloud.com/z_zeti_z/no-effort",
      "https://soundcloud.com/creatxrhowyoudothat/da-don-b4",
      "https://soundcloud.com/stanso-beats/brand-new-fizzycal-beats-x-stanso",
      "https://soundcloud.com/gabriel-viurna/n-y-s",
      "https://soundcloud.com/ferdijan-dudaj-505544900/dfusion-beyound-doubt-majid",
      "https://soundcloud.com/ferdijan-dudaj-505544900/dfusion-circle-undergrund-ukay-diablo",
      "https://soundcloud.com/monteosthisyou/durag-activity",
      "https://soundcloud.com/diogo-nery-619586774/battle-bad-doyah-x-majid-3"
    ],
    popping: []
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  /* ---------- Réglages (gardés sur l'appareil hôte) ---------- */
  function load(){
    let c = null;
    try{ c = JSON.parse(localStorage.getItem(KEY)); }catch(e){}
    const d = window.MUSIQUE_DEFAUT || {};
    c = c || {};
    c.links = Object.assign({ all: d.all || "", hiphop: d.hiphop || "", popping: d.popping || "" }, c.links || {});
    if(c.len == null) c.len = 30;
    if(c.on == null) c.on = true;
    return c;
  }
  function save(c){ try{ localStorage.setItem(KEY, JSON.stringify(c)); }catch(e){} }
  const okLink = s => /^https:\/\/(www\.|m\.)?soundcloud\.com\/[^\s]+/.test(String(s || "").trim());
  const clean = s => String(s || "").trim().replace(/^https:\/\/m\.soundcloud\.com/, "https://soundcloud.com").split("?")[0];
  // Son ou playlist pour une catégorie : le lien collé par l'hôte, sinon les sons par défaut
  // (ceux de la catégorie, sinon tous). All style pioche dans tout.
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const defaults = c => c === "all" || !(SONS[c] || []).length ? Object.values(SONS).flat() : SONS[c];
  let lastLink = "";
  function linkFor(cat){
    const L = load().links;
    if(okLink(L[cat])) return clean(L[cat]);
    if(okLink(L.all)) return clean(L.all);
    const any = Object.values(L).filter(okLink);
    if(any.length) return clean(pick(any));
    const d = defaults(cat); if(!d.length) return "";
    let l = pick(d); if(l === lastLink && d.length > 1) l = pick(d.filter(x => x !== lastLink));
    return lastLink = l;
  }
  const configured = () => load().on && (Object.values(load().links).some(okLink) || Object.values(SONS).flat().length > 0);

  function settingsHTML(){
    const c = load();
    return `<h2 class="h2">Musique des battles</h2>
    <div class="seg two" role="group" aria-label="Musique pendant les duels">
      <button type="button" data-mus-on="1" aria-pressed="${c.on}">Avec musique</button>
      <button type="button" data-mus-on="0" aria-pressed="${!c.on}">Sans musique</button></div>
    ${c.on ? `<p class="hint">Déjà prêt : ${SONS.hiphop.length} sons hip hop choisis dans ta playlist « Training ». Tu n'as rien à coller. Pour utiliser une autre playlist SoundCloud, colle son lien ci-dessous (« … », Partager, Copier le lien).</p>
    ${Object.entries(CATS).map(([k, l]) => `<label class="mus-row"><span>${l}</span>
      <input class="field solo" data-mus-link="${k}" inputmode="url" autocomplete="off" placeholder="https://soundcloud.com/…" value="${esc(c.links[k] || "")}">
      <small class="mus-check" data-mus-check="${k}">${c.links[k] ? (okLink(c.links[k]) ? "Lien OK" : lnkHint(c.links[k])) : ""}</small></label>`).join("")}
    <h2 class="h2">Durée de l'extrait</h2>
    <div class="seg four" role="group" aria-label="Durée de l'extrait">${LENS.map(([v, l]) =>
      `<button type="button" data-mus-len="${v}" aria-pressed="${c.len === v}">${l}</button>`).join("")}</div>` : ""}`;
  }
  const lnkHint = s => /on\.soundcloud\.com|snd\.sc/.test(s) ? "Lien court : ouvre-le dans le navigateur et copie l'adresse complète" : "Ce n'est pas un lien SoundCloud";
  function bindSettings(root, redraw){
    root = root || document;
    root.querySelectorAll("[data-mus-on]").forEach(b => b.onclick = () => { const c = load(); c.on = b.dataset.musOn === "1"; save(c); redraw && redraw(); });
    root.querySelectorAll("[data-mus-len]").forEach(b => b.onclick = () => { const c = load(); c.len = +b.dataset.musLen; save(c); redraw && redraw(); });
    root.querySelectorAll("[data-mus-link]").forEach(inp => inp.oninput = () => {
      const c = load(), k = inp.dataset.musLink; c.links[k] = inp.value.trim(); save(c);
      const chk = root.querySelector(`[data-mus-check="${k}"]`);
      if(chk) chk.textContent = inp.value.trim() ? (okLink(inp.value) ? "Lien OK" : lnkHint(inp.value)) : "";
    });
  }

  /* ---------- Lecteur ---------- */
  let dock = null, iframe = null, widget = null, apiP = null, curLink = "", cat = "all";
  let lastIdx = -1, stopTimer = null, playing = false, wantSeek = false, title = "", state = "idle", errTimer = null;

  // Charge l'API du lecteur SoundCloud une seule fois
  function api(){
    if(window.SC && window.SC.Widget) return Promise.resolve();
    if(apiP) return apiP;
    apiP = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://w.soundcloud.com/player/api.js";
      s.onload = res; s.onerror = () => { apiP = null; rej(new Error("api")); };
      document.head.appendChild(s);
    });
    return apiP;
  }
  function style(){
    if(document.getElementById("mus-style")) return;
    const st = document.createElement("style"); st.id = "mus-style";
    st.textContent = `
.mus-dock{ position:fixed; left:0; right:0; bottom:0; z-index:14; display:flex; align-items:center; gap:10px; padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));
  background:rgba(22,3,4,.96); border-top:2px solid var(--gold,#F2C14E); color:var(--paper,#F5EBDD); box-shadow:0 -8px 24px rgba(0,0,0,.45); }
.mus-dock[hidden]{ display:none; }
.mus-ico{ flex:0 0 auto; width:38px; height:38px; border-radius:50%; display:grid; place-items:center; background:var(--red,#E1192B); font-weight:800; }
.mus-dock.on .mus-ico{ animation:musPulse 1s ease-in-out infinite; }
@keyframes musPulse{ 50%{ transform:scale(1.12); } }
.mus-txt{ flex:1; min-width:0; }
.mus-txt b{ display:block; font-size:.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mus-txt small{ display:block; font-size:.75rem; opacity:.75; }
.mus-btns{ display:flex; gap:6px; flex:0 0 auto; }
.mus-btns button{ border:2px solid var(--gold,#F2C14E); background:transparent; color:var(--gold,#F2C14E); border-radius:999px; padding:8px 12px; font-weight:800; font-size:.85rem; }
.mus-btns button.main{ background:var(--gold,#F2C14E); color:var(--ink,#160304); }
.mus-frame{ position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; left:0; bottom:0; border:0; }
body.has-music{ padding-bottom:78px; }
body.has-music .play-switch{ bottom:calc(84px + env(safe-area-inset-bottom,0px)); }
.mus-row{ display:grid; gap:4px; margin-bottom:6px; } .mus-row > span{ font-weight:800; } .mus-check{ font-size:.75rem; opacity:.8; }
@media (prefers-reduced-motion: reduce){ .mus-dock.on .mus-ico{ animation:none; } }`;
    document.head.appendChild(st);
  }
  function build(){
    if(dock) return;
    style();
    dock = document.createElement("div");
    dock.className = "mus-dock"; dock.hidden = true; dock.setAttribute("role", "region"); dock.setAttribute("aria-label", "Musique du battle");
    document.body.appendChild(dock);
  }
  function paint(){
    if(!dock) return;
    const len = load().len;
    const sub = state === "loading" ? "Chargement…" : state === "error" ? "Lecture impossible : vérifie le lien de la playlist" :
      state === "playing" ? (len ? `Extrait de ${len >= 60 ? len / 60 + " min" : len + " s"}` : "Morceau entier") : state === "done" ? "Extrait terminé" : CATS[cat] || "";
    dock.className = "mus-dock" + (state === "playing" ? " on" : "");
    dock.innerHTML = `<span class="mus-ico" aria-hidden="true">♪</span>
      <span class="mus-txt"><b>${state === "idle" ? "Musique du duel" : esc(title || "…")}</b><small>${esc(sub)}</small></span>
      <span class="mus-btns">${state === "playing" ? `<button data-m="stop">Stop</button><button data-m="next" class="main">Autre son</button>`
        : state === "idle" ? `<button data-m="draw" class="main">Tirer un son</button>`
        : `<button data-m="draw" class="main">${state === "error" ? "Réessayer" : "Autre son"}</button>`}</span>`;
    dock.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { const m = b.dataset.m; if(m === "stop") stop(); else draw(); });
  }
  function setState(s){ state = s; paint(); }
  function clearTimers(){ clearTimeout(stopTimer); clearTimeout(errTimer); stopTimer = errTimer = null; }

  // Tire un son au hasard dans la playlist et le joue
  function draw(){
    const link = linkFor(cat);
    if(!link){ title = ""; setState("error"); return; }
    clearTimers(); setState("loading");
    errTimer = setTimeout(() => { if(state === "loading") setState("error"); }, 12000);
    api().then(() => {
      if(!iframe){
        iframe = document.createElement("iframe");
        iframe.className = "mus-frame"; iframe.allow = "autoplay"; iframe.title = "Lecteur SoundCloud";
        iframe.src = "https://w.soundcloud.com/player/?url=" + encodeURIComponent(link) + "&auto_play=false&visual=false&show_comments=false&hide_related=true&sharing=false&buying=false&download=false";
        document.body.appendChild(iframe);
        curLink = link;
        widget = window.SC.Widget(iframe);
        const E = window.SC.Widget.Events;
        widget.bind(E.READY, () => { if(pending) pickAndPlay(); });
        pending = true;
        widget.bind(E.PLAY, onPlay);
        widget.bind(E.FINISH, () => { if(playing){ playing = false; setState("done"); } });
        widget.bind(E.ERROR, () => setState("error"));
      } else if(curLink !== link){ curLink = link; pending = true; widget.load(link, { auto_play: false, show_comments: false, hide_related: true, visual: false, callback: () => pickAndPlay() }); }
      else pickAndPlay();
    }).catch(() => setState("error"));
  }
  let pending = false;
  function pickAndPlay(){
    pending = false;
    widget.getSounds(list => {
      const n = (list || []).length;
      wantSeek = true;
      if(n > 1){ // playlist : un morceau au hasard, différent du précédent
        let i = Math.floor(Math.random() * n); if(i === lastIdx) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
        lastIdx = i; widget.skip(i);
      }
      else { widget.seekTo(0); widget.play(); }
    });
  }
  function onPlay(){
    widget.getCurrentSound(s => {
      if(!s) return;
      title = (s.title || "Son") + (s.user && s.user.username ? " · " + s.user.username : "");
      playing = true; clearTimeout(errTimer); setState("playing");
      const len = load().len, dur = s.duration || 0;
      if(wantSeek){
        wantSeek = false;
        // Départ au hasard entre 20 % et 55 % du morceau, en gardant de quoi jouer l'extrait
        if(len && dur > (len + 20) * 1000){
          const from = Math.min(dur * (.2 + Math.random() * .35), dur - len * 1000 - 3000);
          widget.seekTo(Math.max(0, Math.round(from)));
        }
        clearTimeout(stopTimer);
        if(len) stopTimer = setTimeout(() => { widget.pause(); playing = false; setState("done"); }, len * 1000);
      }
    });
  }
  function stop(){ clearTimers(); if(widget) widget.pause(); playing = false; setState("done"); }

  // Affiche la barre pendant un duel. Un nouveau duel (clé différente) remet le lecteur à zéro.
  let lastKey = null;
  function show(category, key){
    if(!configured()){ hide(); return; }
    build();
    if(key !== lastKey){ if(widget && playing) widget.pause(); clearTimers(); playing = false; title = ""; state = "idle"; lastKey = key; }
    cat = category || "all";
    dock.hidden = false; document.body.classList.add("has-music");
    paint();
  }
  function hide(){
    if(!dock || dock.hidden) return;
    clearTimers(); if(widget && playing) widget.pause(); playing = false;
    dock.hidden = true; document.body.classList.remove("has-music");
  }
  return { settingsHTML, bindSettings, show, hide, configured };
})();
