/* =========================================================
   RÉGLAGES
   ========================================================= */
const DEFAULT_PLAYERS = ["Elange","Ismaël","Jovan","Chris","Ysli"];
// Exemples provisoires : remplace-les depuis l'écran « Préparer les situations »
const EXAMPLES = [
  "Annuler le battle une heure avant pour aller à un date.",
  "Reprendre le passage d'un autre en battle et dire que c'est ton style.",
  "Arriver au cours juste après l'échauffement pour ne pas le faire.",
  "Demander au DJ de passer ton son préféré juste avant ton passage.",
  "Prendre la dernière part de pizza sans demander à personne.",
  "Liker la story de l'ex d'un pote à 2 h du matin.",
  "Filmer un pote qui tombe en plein freeze et le poster direct.",
  "Dire « j'ai pas révisé la choré » alors que tu l'as bossée toute la semaine.",
  "Garder les meilleurs danseurs du crew pour ta propre équipe en compétition.",
  "Te faire inviter en soirée et repartir avec la bouteille que tu as ramenée.",
  "Mettre la vidéo d'un autre danseur en story sans le créditer.",
  "Partir de l'EVG avant le dernier verre « parce que demain je bosse »."
].map(text => ({ text, ex:true }));
// Danseurs des modes Danseurs et Battle (la catégorie All style du Battle prend toute cette liste)
const DANCER_NAMES = ["Ismaël", "Elange", "Vita", "Julie", "Dimust", "Aline", "Jikay", "Soyuz", "Yoh", "Kodi", "Dialo", "Ronyl", "Sobek", "Marie", "Ughost", "Viro", "Clément", "Suki", "Leah", "Noth", "Imou", "Semoss", "Lumi", "Paul (Meute Céleste)", "Evion", "Joann", "Youyou", "Missile", "Pakissi", "Richard Pop", "Ziko", "Forge", "Ma2t", "Hervé", "Ness", "Erine", "Spider", "Kuty", "Laura Nala", "Rubix", "Hamza", "Drop", "Poppin J", "Lossejoint", "Delannotche", "Mels", "Junior", "Miguel", "Xelyna", "Dyken", "Odilon", "Deadhomies", "Jean-Michel Cruel", "Willis", "Nastya", "Batalla", "Andrey Stylez", "Rochka", "Alex the Cage", "Icee", "Sam Yudat", "Lindsay", "Nicurl", "April", "Reverse", "Dereck", "Krissy", "Doyah", "Physs", "Jimmy Yudat", "Lilkens", "Joël Brown", "Dokyun", "Hozin", "Hoan", "Nikki Pop", "Slimboogie", "Greenteck", "Franqey", "Nelson", "Cinthia", "Sonya", "Eun-G", "Riha", "Nuria", "Lady C", "Ryu", "Sacha", "Paris", "Leila", "Bougito", "Creesto", "Iron Mike", "Linda", "Future", "Junior Boogaloo", "Super Dino", "Lemzo", "Gucchon", "Kei", "Breeze Lee", "Précise", "Jrock", "Jiggy Jaya", "Kinho", "Trakinas", "Jaygee", "Glory", "Jeff West Gang", "Poppin C", "Chams", "Kryss Boogie", "Jerems"];
// Catégories du mode Battle. Un danseur peut être dans plusieurs catégories.
const HIPHOP_NAMES = ["Alex the Cage", "Aline", "Andrey Stylez", "April", "Batalla", "Deadhomies", "Delannotche", "Dereck", "Dialo", "Dimust", "Doyah", "Drop", "Dyken", "Elange", "Erine", "Evion", "Forge", "Hamza", "Hervé", "Icee", "Imou", "Ismaël", "Jean-Michel Cruel", "Jikay", "Jimmy Yudat", "Joann", "Julie", "Junior", "Kodi", "Krissy", "Kuty", "Laura Nala", "Leah", "Lilkens", "Lindsay", "Lossejoint", "Lumi", "Ma2t", "Marie", "Mels", "Miguel", "Missile", "Nastya", "Ness", "Nicurl", "Noth", "Odilon", "Pakissi", "Physs", "Reverse", "Rochka", "Ronyl", "Rubix", "Sam Yudat", "Semoss", "Sobek", "Spider", "Viro", "Vita", "Willis", "Xelyna", "Yoh", "Ziko"];
const POPPING_NAMES = ["Poppin J", "Missile", "Joël Brown", "Ness", "Dokyun", "Hozin", "Joann", "Hoan", "Nikki Pop", "Slimboogie", "Greenteck", "Franqey", "Nelson", "Cinthia", "Sonya", "Eun-G", "Riha", "Nuria", "Lady C", "Ryu", "Sacha", "Paris", "Leila", "Bougito", "Creesto", "Iron Mike", "Linda", "Future", "Junior Boogaloo", "Super Dino", "Lemzo", "Gucchon", "Kei", "Breeze Lee", "Précise", "Jrock", "Jiggy Jaya", "Kinho", "Trakinas", "Jaygee", "Glory", "Jeff West Gang", "Poppin C", "Chams", "Kryss Boogie", "Jerems"];
const BCATS = {
  all:     { label:"All style", names:null },
  hiphop:  { label:"Hip hop",   names:HIPHOP_NAMES },
  popping: { label:"Popping",   names:POPPING_NAMES }
};
// Danseurs du tournoi selon la catégorie, parmi la liste de « Préparer »
const battlePool = (cat, names) => { const c = BCATS[cat] || BCATS.all; if(!c.names) return names; const set = new Set(c.names.map(n => n.toLowerCase())); return names.filter(n => set.has(n.toLowerCase())); };
const DANCERS_VERSION = 5; // à augmenter pour remplacer la liste enregistrée sur les téléphones
const EXAMPLE_DANCERS = DANCER_NAMES.map(text => ({ text }));
const MODES = {
  sit: { label:"Situations", one:"situation", many:"situations", card:"Dossier", bankTitle:"Les<br>dossiers",
         intro:"Écris une situation qui fait débat. Plus c'est tiré de vos vraies histoires, plus ça part en clash.",
         placeholder:"Ex. : Réserver la salle de répét et ne pas venir." },
  dan: { label:"Danseurs", one:"danseur", many:"danseurs", card:"Danseur", bankTitle:"Les<br>suspects",
         intro:"Ajoute les danseurs à juger. Chacun dira s'il est mafia ou pas mafia, puis devra se justifier.",
         placeholder:"Nom du danseur" },
  bat: { label:"Battle", one:"danseur", many:"danseurs", card:"Danseur", bankTitle:"Les<br>suspects",
         intro:"Ajoute les danseurs du tournoi. Ce sont les mêmes que pour le mode Danseurs.",
         placeholder:"Nom du danseur" }
};
const KEY = "mafia-v1";

/* =========================================================
   Outils
   ========================================================= */
const app = document.getElementById("app");
const $ = s => app.querySelector(s), $$ = s => app.querySelectorAll(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = n => String(n).padStart(3, "0");

let store = load();
function load(){
  let st = null;
  try{ const r = localStorage.getItem(KEY); if(r) st = JSON.parse(r); }catch(e){}
  st = st || { players: DEFAULT_PLAYERS.slice(), bank: EXAMPLES.slice(), size: 10, game: null };
  if(!st.dancers) st.dancers = EXAMPLE_DANCERS.slice();
  // Nouvelle liste officielle : on remplace les anciens exemples, et on garde les danseurs ajoutés à la main
  if((st.dancersVersion || 1) < DANCERS_VERSION){
    const renamed = ["roehka", "rrubix", "demannotche"]; // anciennes orthographes, remplacées par Rochka, Rubix et Delannotche
    const mine = st.dancers.filter(d => !d.ex && !renamed.includes(d.text.toLowerCase()) && !DANCER_NAMES.some(n => n.toLowerCase() === d.text.toLowerCase()));
    st.dancers = EXAMPLE_DANCERS.slice().concat(mine);
    st.dancersVersion = DANCERS_VERSION;
  }
  if(!st.mode) st.mode = "sit";
  if(st.bsize == null) st.bsize = 8;
  if(!st.bcat) st.bcat = "all";
  return st;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} }

function askConfirm(text, onYes, yes = "Oui", no = "Annuler"){
  const box = document.createElement("div"); box.className = "ov";
  box.innerHTML = `<div class="ov-box" role="dialog" aria-modal="true"><p>${esc(text)}</p>
    <button class="btn main" data-yes>${esc(yes)}</button>${no ? `<button class="btn ghost" data-no>${esc(no)}</button>` : ""}</div>`;
  document.body.appendChild(box); box.querySelector("[data-yes]").focus();
  box.querySelector("[data-yes]").onclick = () => { box.remove(); if(onYes) onYes(); };
  const n = box.querySelector("[data-no]"); if(n) n.onclick = () => box.remove();
}

/* ---------- Sons ---------- */
const sfx = (() => {
  let ctx = null, on = true;
  try{ on = localStorage.getItem(KEY + "-sound") !== "off"; }catch(e){}
  const ac = () => { if(!ctx){ const A = window.AudioContext || window.webkitAudioContext; if(!A) return null; ctx = new A(); } if(ctx.state === "suspended") ctx.resume(); return ctx; };
  function tone(f, dur, { type="sine", vol=.18, at=0, slide=null } = {}){
    const c = ac(); if(!c || !on) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if(slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, { vol=.25, at=0, from=4000, to=600 } = {}){
    const c = ac(); if(!c || !on) return;
    const t = c.currentTime + at, b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = b; f.type = "bandpass"; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.value = vol; src.connect(f).connect(g).connect(c.destination); src.start(t);
  }
  const seq = (fs, step, o) => fs.forEach((f,i) => tone(f, o.dur || .25, Object.assign({}, o, { at:i*step })));
  return {
    get on(){ return on; },
    toggle(){ on = !on; try{ localStorage.setItem(KEY + "-sound", on ? "on" : "off"); }catch(e){} if(on) this.click(); },
    click(){ tone(660, .06, { type:"triangle", vol:.12 }); },
    swipe(){ noise(.22, { vol:.3, from:2500, to:6000 }); },
    mafia(){ tone(110, .35, { type:"sawtooth", vol:.12, slide:70 }); noise(.08, { vol:.3, from:900, to:300 }); },
    clean(){ seq([660, 880], .07, { type:"triangle", vol:.1, dur:.15 }); },
    reveal(){ seq([196, 233, 262, 294], .1, { type:"sawtooth", vol:.06, dur:.3 }); noise(.12, { vol:.3, at:.42, from:700, to:200 }); },
    fanfare(){ seq([392,392,392,523,659,784,1047], .13, { type:"square", vol:.08, dur:.25 }); tone(1047, 1.2, { type:"triangle", vol:.1, at:.95 }); }
  };
})();
const soundBtn = document.createElement("button");
soundBtn.className = "sound-btn";
const paintSound = () => { soundBtn.textContent = sfx.on ? "Son activé" : "Son coupé"; soundBtn.setAttribute("aria-pressed", sfx.on); };
soundBtn.onclick = () => { sfx.toggle(); paintSound(); };
paintSound(); document.body.appendChild(soundBtn);

/* =========================================================
   Navigation
   ========================================================= */
let screen = store.game ? "game" : "home", lastScreen = null, draftText = "";
function render(){
  ({ home:renderHome, bank:renderBank, game:renderGame })[screen]();
  const key = screen + (store.game ? [store.game.step, store.game.turn, store.game.revealIdx, store.game.r, store.game.m].join("-") : "");
  if(key !== lastScreen){ window.scrollTo(0,0); lastScreen = key; }
}
const players = () => store.players.map(n => n.trim()).filter(Boolean);
const M = () => MODES[store.mode];
const isDan = () => store.mode !== "sit";
const list = () => isDan() ? store.dancers : store.bank;
const setList = v => { if(isDan()) store.dancers = v; else store.bank = v; };
const exList = () => isDan() ? EXAMPLE_DANCERS : EXAMPLES;
const deckSize = () => Math.min(store.size || list().length, list().length);

/* ---------- Accueil ---------- */
function renderHome(){
  const exs = list().filter(q => q.ex).length, n = list().length, m = M();
  const nb = battlePool(store.bcat, store.dancers.map(d => d.text)).length;
  app.innerHTML = `<section class="screen">
    <h1 class="title">Mafia<br><em>ou pas</em><br>mafia</h1>
    <p class="lead">${store.mode === "bat" ? "Le mode Battle : vos danseurs s'affrontent en tournoi, duel après duel, jusqu'à ce qu'il n'en reste qu'un." : "Chacun glisse les cartes en secret : à droite c'est mafia, à gauche ça passe. Ensuite on révèle les votes carte par carte, et chacun doit se justifier."}</p>
    ${window.MULTI_URL ? `<a class="btn gold" href="${window.MULTI_URL}">Jouer sur plusieurs téléphones</a>` : ""}
    <h2 class="h2">Mode de jeu</h2>
    <div class="seg" role="group" aria-label="Mode de jeu">${Object.entries(MODES).map(([k,md]) =>
      `<button data-mode="${k}" aria-pressed="${store.mode === k}">${md.label}<br><small>${(k === "sit" ? store.bank : store.dancers).length} ${md.many}</small></button>`).join("")}</div>
    <p class="hint">${store.mode === "bat" ? "Un tournoi à élimination directe : à chaque duel, vous débattez et choisissez le meilleur des deux, jusqu'au champion." : store.mode === "dan" ? "Chaque carte est un danseur : est-il mafia ou pas mafia ?" : "Chaque carte est une situation : c'est mafia ou ça passe ?"}</p>
    ${store.mode === "bat" ? `
    <h2 class="h2">Catégorie</h2>
    <div class="seg" role="group" aria-label="Catégorie du battle">${Object.entries(BCATS).map(([k,c]) =>
      `<button data-bcat="${k}" aria-pressed="${store.bcat === k}">${c.label}<br><small>${battlePool(k, store.dancers.map(d => d.text)).length} danseurs</small></button>`).join("")}</div>
    <h2 class="h2">Taille du tournoi</h2>
    <div class="seg four" role="group" aria-label="Nombre de danseurs dans le tournoi">${[[4,"4"],[8,"8"],[16,"16"],[0,"Tous"]].map(([k,l]) =>
      `<button data-bsize="${k}" aria-pressed="${store.bsize === k}">${l}<br><small>${k ? roundName(k / 2) : nb + " danseurs"}</small></button>`).join("")}</div>
    <div class="stat"><span><strong>Danseurs prêts</strong><br><span class="hint">${exs ? `Dont ${exs} exemple${exs > 1 ? "s" : ""} à remplacer.` : "Tous ajoutés par vous."}</span></span><b>${n}</b></div>
    <button class="btn gold" id="bank">Préparer les danseurs</button>
    <p class="hint">Les catégories Hip hop et Popping prennent leurs danseurs dans cette liste. Un danseur ajouté à la main ne joue qu'en All style.</p>
    <button class="btn main" id="start" ${nb >= 2 ? "" : "disabled"}>Lancer le tournoi</button>
  </section>` : `
    <h2 class="h2">Joueurs</h2>
    <ol class="players">${store.players.map((p,i) => `<li>
      <input class="field" id="pl-${i}" data-i="${i}" value="${esc(p)}" placeholder="Prénom" aria-label="Joueur ${i+1}">
      <button class="x" data-rm="${i}" aria-label="Retirer ce joueur">×</button></li>`).join("")}</ol>
    <button class="btn ghost" id="add">Ajouter un joueur</button>
    <div class="stat"><span><strong>${m.label} prêts</strong><br><span class="hint">${exs ? `Dont ${exs} exemple${exs > 1 ? "s" : ""} à remplacer.` : "Toutes écrites par vous."}</span></span><b>${n}</b></div>
    <h2 class="h2">Cartes par partie</h2>
    <div class="seg" role="group" aria-label="Nombre de cartes par partie">${[[6,"Rapide"],[10,"Normal"],[0,"Toutes"]].map(([k,l]) =>
      `<button data-size="${k}" aria-pressed="${(store.size || 0) === k}">${l}<br><small>${k ? k : n} cartes</small></button>`).join("")}</div>
    <button class="btn gold" id="bank">Préparer les ${m.many}</button>
    <button class="btn main" id="start" ${n && players().length >= 2 ? "" : "disabled"}>Lancer la partie</button>
  </section>`}`;
  $$("[data-bcat]").forEach(b => b.onclick = () => { store.bcat = b.dataset.bcat; save(); sfx.click(); render(); });
  $$("[data-bsize]").forEach(b => b.onclick = () => { store.bsize = +b.dataset.bsize; save(); sfx.click(); render(); });
  $$("input[data-i]").forEach(inp => inp.oninput = () => { store.players[+inp.dataset.i] = inp.value; save(); $("#start").disabled = !(n && players().length >= 2); });
  $$("[data-rm]").forEach(b => b.onclick = () => { if(store.players.length > 2){ store.players.splice(+b.dataset.rm, 1); save(); render(); } });
  const ad = $("#add"); if(ad) ad.onclick = () => { store.players.push(""); save(); render(); const all = $$("input[data-i]"); all[all.length-1].focus(); };
  $$("[data-mode]").forEach(b => b.onclick = () => { store.mode = b.dataset.mode; save(); sfx.click(); render(); });
  $$("[data-size]").forEach(b => b.onclick = () => { store.size = +b.dataset.size; save(); sfx.click(); render(); });
  $("#bank").onclick = () => { screen = "bank"; render(); };
  $("#start").onclick = () => store.mode === "bat" ? startBattle() : startGame();
}

/* ---------- Préparer les situations ---------- */
// Sélection multiple dans l'écran de préparation
let selMode = false, selected = new Set(), bankMsg = "";
// Plusieurs danseurs d'un coup : séparés par des virgules, points-virgules ou retours à la ligne
// Accord : danseur (masculin), situation (féminin)
const agree = (w, n) => w + (isDan() ? "" : "e") + (n > 1 ? "s" : "");
const splitEntries = t => (isDan() ? t.split(/[\n,;]+/) : t.split(/\n+/)).map(x => x.trim()).filter(Boolean);

function renderBank(){
  const m = M(), L = list(), nSel = selected.size;
  app.innerHTML = `<section class="screen">
    <button class="btn ghost" id="back">Retour</button>
    <h1 class="title">${m.bankTitle}</h1>
    <div class="seg two" role="group" aria-label="Liste à préparer">${Object.entries(MODES).filter(([k]) => k !== "bat").map(([k,md]) =>
      `<button data-mode="${k}" aria-pressed="${(isDan() ? "dan" : "sit") === k}">${md.label}</button>`).join("")}</div>
    <p class="lead">${m.intro}</p>
    <textarea class="field ${isDan() ? "short" : ""}" id="qtext" rows="${isDan() ? 2 : 3}" placeholder="${isDan() ? "Nom du danseur, ou plusieurs : Kodi, Ughost, Viro" : m.placeholder}" aria-label="${isDan() ? "Nouveaux danseurs" : "Nouvelle situation"}">${esc(draftText)}</textarea>
    <p class="hint">${isDan() ? "Tu peux en ajouter plusieurs d'un coup, séparés par des virgules ou des retours à la ligne." : "Une situation par ligne : tu peux en coller plusieurs d'un coup."}</p>
    <button class="btn main" id="addq" ${draftText.trim() ? "" : "disabled"}>Ajouter</button>
    ${bankMsg ? `<p class="note">${esc(bankMsg)}</p>` : ""}

    <div class="list-head"><h2 class="h2">${L.length} ${L.length > 1 ? m.many : m.one}</h2>
      ${L.length ? (selMode
        ? `<button class="chipbtn" id="selAll">${nSel === L.length ? "Tout désélectionner" : "Tout sélectionner"}</button>`
        : `<button class="chipbtn" id="selOn">Sélectionner</button>`) : ""}</div>
    ${L.length && !selMode ? `<div class="tools"><button class="chipbtn" id="copy">Copier la liste</button><button class="chipbtn danger" id="wipe">Tout supprimer</button></div>` : ""}
    ${selMode ? `<div class="selbar"><button class="btn main danger" id="delSel" ${nSel ? "" : "disabled"}>Supprimer la sélection (${nSel})</button><button class="btn ghost" id="selOff">Annuler</button></div>` : ""}

    ${L.length ? `<ol class="qlist ${selMode ? "selecting" : ""}">${L.map((q,i) => selMode
        ? `<li><label class="qitem pick ${selected.has(q.text) ? "on" : ""}"><input type="checkbox" data-sel="${i}" ${selected.has(q.text) ? "checked" : ""}><p>${q.ex ? `<span class="tag">Exemple</span>` : ""}${esc(q.text)}</p></label></li>`
        : `<li class="qitem"><p>${q.ex ? `<span class="tag">Exemple</span>` : ""}${esc(q.text)}</p><button class="del" data-del="${i}" aria-label="Supprimer ${esc(q.text)}">×</button></li>`).join("")}</ol>`
      : `<p class="hint">La liste est vide. Ajoute ${isDan() ? "le premier danseur" : "la première situation"} juste au-dessus.</p>`}
    ${selMode ? "" : L.some(q => q.ex) ? `<button class="btn ghost" id="clearEx">Supprimer les exemples</button>` : `<button class="link" id="restoreEx">${isDan() ? "Remettre la liste de départ" : "Remettre les exemples"}</button>`}
  </section>`;

  $("#back").onclick = () => { screen = "home"; selMode = false; selected.clear(); bankMsg = ""; render(); };
  $$("[data-mode]").forEach(b => b.onclick = () => { if(!(store.mode === "bat" && b.dataset.mode === "dan")) store.mode = b.dataset.mode; draftText = ""; bankMsg = ""; selMode = false; selected.clear(); save(); sfx.click(); render(); });
  const ta = $("#qtext");
  ta.oninput = () => { draftText = ta.value; $("#addq").disabled = !draftText.trim(); };
  const add = () => {
    const items = splitEntries(draftText); if(!items.length) return;
    const have = new Set(L.map(q => q.text.toLowerCase())), fresh = [];
    let dup = 0;
    items.forEach(t => { const k = t.toLowerCase(); if(have.has(k)) dup++; else { have.add(k); fresh.push({ text:t }); } });
    setList([...fresh, ...L]);
    bankMsg = `${fresh.length} ${fresh.length > 1 ? m.many : m.one} ${agree("ajouté", fresh.length)}${dup ? `, ${dup} déjà dans la liste` : ""}.`;
    draftText = ""; save(); sfx.clean(); render(); $("#qtext").focus();
  };
  $("#addq").onclick = add;
  if(isDan()) ta.onkeydown = e => { if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); add(); } };

  // Suppression une par une
  $$("[data-del]").forEach(b => b.onclick = () => {
    const q = L[+b.dataset.del];
    askConfirm(`Supprimer « ${q.text.slice(0, 60)}${q.text.length > 60 ? "…" : ""} » ?`, () => { setList(L.filter((_,k) => k !== +b.dataset.del)); bankMsg = ""; save(); render(); }, "Supprimer");
  });
  // Sélection multiple
  const on = $("#selOn"); if(on) on.onclick = () => { selMode = true; selected.clear(); bankMsg = ""; sfx.click(); render(); };
  const off = $("#selOff"); if(off) off.onclick = () => { selMode = false; selected.clear(); render(); };
  const all = $("#selAll"); if(all) all.onclick = () => { if(selected.size === L.length) selected.clear(); else L.forEach(q => selected.add(q.text)); render(); };
  $$("[data-sel]").forEach(c => c.onchange = () => { const t = L[+c.dataset.sel].text; c.checked ? selected.add(t) : selected.delete(t); render(); });
  const ds = $("#delSel"); if(ds) ds.onclick = () => askConfirm(`Supprimer ${selected.size} ${selected.size > 1 ? m.many : m.one} ?`, () => {
    const n = selected.size;
    setList(L.filter(q => !selected.has(q.text))); selected.clear(); selMode = false;
    bankMsg = `${n} ${n > 1 ? m.many : m.one} ${agree("supprimé", n)}.`; save(); render();
  }, "Supprimer");
  // Tout supprimer
  const w = $("#wipe"); if(w) w.onclick = () => askConfirm(`Supprimer les ${L.length} ${m.many} de la liste ? Tu pourras remettre la liste de départ.`, () => { setList([]); bankMsg = "Liste vidée."; save(); render(); }, "Tout supprimer");
  // Copier la liste (pour la garder, l'envoyer ou la coller ailleurs)
  const cp = $("#copy"); if(cp) cp.onclick = () => {
    const txt = L.map(q => q.text).join(isDan() ? ", " : "\n");
    const done = () => { bankMsg = `Liste copiée : ${L.length} ${L.length > 1 ? m.many : m.one}. Tu peux la coller dans un message.`; render(); };
    const fallback = () => showCopyBox(txt);
    try{ navigator.clipboard.writeText(txt).then(done, fallback); }catch(e){ fallback(); }
  };
  const ce = $("#clearEx"); if(ce) ce.onclick = () => askConfirm(`Supprimer les ${m.many} d'exemple ? Les tiens restent.`, () => { setList(L.filter(q => !q.ex)); save(); render(); }, "Supprimer les exemples");
  const re = $("#restoreEx"); if(re) re.onclick = () => { const before = L.length; setList(L.concat(exList().filter(e => !L.some(q => q.text.toLowerCase() === e.text.toLowerCase())))); bankMsg = `${list().length - before} remis dans la liste.`; save(); render(); };
}
// Si la copie automatique est refusée : on affiche le texte, déjà sélectionné, à copier à la main
function showCopyBox(txt){
  const box = document.createElement("div"); box.className = "ov";
  box.innerHTML = `<div class="ov-box" role="dialog" aria-modal="true"><p>Sélectionne le texte et copie-le.</p>
    <textarea class="field" readonly rows="8"></textarea><button class="btn main" data-yes>Fermer</button></div>`;
  document.body.appendChild(box);
  const t = box.querySelector("textarea"); t.value = txt; t.focus(); t.select();
  box.querySelector("[data-yes]").onclick = () => box.remove();
}

/* =========================================================
   Partie
   ========================================================= */
function startGame(){
  const ps = players();
  store.game = { mode: store.mode, players: ps, cards: shuffle(list().map(q => q.text)).slice(0, deckSize()),
    step:"handoff", turn:0, idx:0, revealIdx:0, votes: Object.fromEntries(ps.map(p => [p, []])) };
  save(); screen = "game"; render();
}
const G = () => store.game;
const GM = () => MODES[(store.game && store.game.mode) || "sit"];
// votes[joueur][carte] = true (mafia) ou false (pas mafia)
const tally = i => { const g = G(); const y = g.players.filter(p => g.votes[p][i]), n = g.players.filter(p => !g.votes[p][i]); return { y, n }; };

function renderGame(){
  const g = G();
  if(g.mode === "bat") return renderBattle();
  ({ handoff:renderHandoff, swipe:renderSwipe, revealIntro:renderRevealIntro, reveal:renderReveal, end:renderEnd })[g.step]();
}

// Revenir au vote précédent (même joueur, ou dernier vote du joueur d'avant)
function undoVote(){
  const g = G();
  if(g.step === "swipe" && g.idx > 0){ g.idx--; }
  else if((g.step === "handoff" || g.step === "revealIntro") && g.turn > 0){ g.turn--; g.idx = g.cards.length - 1; g.step = "swipe"; }
  else return;
  g.votes[g.players[g.turn]].length = g.idx;
  save(); sfx.click(); render();
}

function renderHandoff(){
  const g = G(), p = g.players[g.turn];
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">Joueur ${g.turn + 1} sur ${g.players.length}</p>
    <p class="hint" style="font-size:1.15rem">Passe le téléphone à</p>
    <h1 class="big">${esc(p)}</h1>
    <p class="hint">${g.cards.length} ${GM().many === "danseurs" ? "danseurs à juger" : "dossiers"} t'attendent. Personne ne regarde, tu glisses en secret.</p>
    <button class="btn main" id="go">C'est moi, je commence</button>
    ${g.turn > 0 ? `<button class="link" id="undo">${esc(g.players[g.turn - 1])} : revenir à ton dernier vote</button>` : ""}
    <button class="link" id="quit">Arrêter la partie</button>
  </section>`;
  $("#go").onclick = () => { g.step = "swipe"; g.idx = 0; save(); render(); };
  const u = $("#undo"); if(u) u.onclick = undoVote;
  $("#quit").onclick = () => askConfirm("Arrêter la partie ? Les votes seront perdus.", () => { store.game = null; save(); screen = "home"; render(); }, "Arrêter");
}

const cardFace = (text, i, total, cls = "") => `<div class="card ${cls} ${GM() === MODES.dan ? "dancer" : ""}" ${cls === "top" ? `id="top" tabindex="0" aria-label="${esc(text)}. Glisse à droite pour Mafia, à gauche pour Pas mafia."` : `aria-hidden="true"`}>
  <span class="c-head"><span>${GM().card}</span><span class="c-file">N° ${pad(i + 1)}</span></span>
  ${GM() === MODES.dan ? `<span class="c-mono" aria-hidden="true">${esc([...text][0] || "?")}</span><span class="c-name">${esc(text)}<small>Mafia ou pas mafia ?</small></span>` : `<span class="c-text">${esc(text)}</span>`}
  <span class="c-foot"><span>← Pas mafia</span><span>Mafia →</span></span>
  <span class="stamp yes">MAFIA</span><span class="stamp no">PAS MAFIA</span>
</div>`;

function renderSwipe(){
  const g = G(), p = g.players[g.turn], i = g.idx, n = g.cards.length;
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${esc(p)}</span><span>${GM().card} ${i + 1} sur ${n}</span></header>
    <div class="deck">
      ${i + 2 < n ? cardFace(g.cards[i + 2], i + 2, n, "back2") : ""}
      ${i + 1 < n ? cardFace(g.cards[i + 1], i + 1, n, "back") : ""}
      ${cardFace(g.cards[i], i, n, "top")}
    </div>
    <div class="choices">
      <button class="choice no" id="no">Pas mafia<small>ou glisse à gauche</small></button>
      <button class="choice yes" id="yes">Mafia<small>ou glisse à droite</small></button>
    </div>
    ${i > 0 ? `<button class="undo-btn" id="undo"><span aria-hidden="true">↶</span> Revenir à la carte précédente<small>Tu avais mis : ${g.votes[p][i - 1] ? "Mafia" : "Pas mafia"}</small></button>` : ""}
  </section>`;
  const card = $("#top"), sy = card.querySelector(".stamp.yes"), sn = card.querySelector(".stamp.no");
  let start = null, dx = 0, done = false;
  const paint = () => {
    card.style.transform = `translateX(${dx}px) rotate(${dx / 16}deg)`;
    sy.style.opacity = Math.max(0, Math.min(1, dx / 90));
    sn.style.opacity = Math.max(0, Math.min(1, -dx / 90));
  };
  // Vote : la carte s'envole du bon côté
  const fly = mafia => {
    if(done) return; done = true;
    sfx.swipe(); mafia ? sfx.mafia() : sfx.clean();
    g.votes[p][i] = mafia;
    const next = () => {
      g.idx++;
      if(g.idx >= n){ g.turn++; g.idx = 0; g.step = g.turn >= g.players.length ? "revealIntro" : "handoff"; }
      save(); render();
    };
    if(reduce()){ next(); return; }
    card.style.transition = "transform .35s ease-in";
    dx = (mafia ? 1 : -1) * window.innerWidth * 1.2; paint();
    setTimeout(next, 330);
  };
  card.addEventListener("pointerdown", e => { if(done) return; start = e.clientX; card.style.transition = ""; if(card.setPointerCapture) card.setPointerCapture(e.pointerId); });
  card.addEventListener("pointermove", e => { if(start == null || done) return; dx = e.clientX - start; paint(); });
  const release = () => {
    if(start == null) return; start = null;
    if(Math.abs(dx) > 100) fly(dx > 0);
    else { card.style.transition = "transform .25s ease-out"; dx = 0; paint(); }
  };
  card.addEventListener("pointerup", release);
  card.addEventListener("pointercancel", release);
  card.addEventListener("keydown", e => { if(e.key === "ArrowRight") fly(true); if(e.key === "ArrowLeft") fly(false); });
  $("#yes").onclick = () => fly(true);
  $("#no").onclick = () => fly(false);
  const u = $("#undo"); if(u) u.onclick = () => { if(!done) undoVote(); };
  card.focus({ preventScroll:true });
}

function renderRevealIntro(){
  const g = G();
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">Tout le monde a voté</p>
    <h1 class="big">L'heure<br>du verdict</h1>
    <p class="hint">Mettez-vous autour du téléphone. On révèle les ${g.cards.length} ${GM().many === "danseurs" ? "danseurs" : "dossiers"} un par un, et chacun défend son vote.</p>
    <button class="btn main" id="go">Révéler ${GM().many === "danseurs" ? "le premier danseur" : "le premier dossier"}</button>
    <button class="link" id="undo">${esc(g.players[g.players.length - 1])} : revenir à ton dernier vote</button>
  </section>`;
  $("#undo").onclick = undoVote;
  $("#go").onclick = () => { g.step = "reveal"; g.revealIdx = 0; save(); render(); sfx.reveal(); };
}

function renderReveal(){
  const g = G(), i = g.revealIdx, { y, n } = tally(i), last = i >= g.cards.length - 1;
  const word = y.length > n.length ? ["y", "Mafia"] : y.length < n.length ? ["n", "Pas mafia"] : ["t", "Égalité"];
  const list = (arr, other) => arr.length ? arr.map(p => `<li class="${arr.length === 1 && other.length > 1 ? "alone" : ""}">${esc(p)}</li>`).join("") : `<li class="none">Personne</li>`;
  const alone = y.length === 1 && n.length > 1 ? y[0] : n.length === 1 && y.length > 1 ? n[0] : null;
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>Verdict</span><span>${GM().card} ${i + 1} sur ${g.cards.length}</span></header>
    <article class="verdict ${GM() === MODES.dan ? "dancer" : ""}">
      <span class="c-head"><span>${GM().card}</span><span class="c-file">N° ${pad(i + 1)}</span></span>
      <span class="${GM() === MODES.dan ? "c-name" : "c-text"}">${esc(g.cards[i])}</span>
      <p class="big-verdict ${word[0]}">${word[1]}</p>
      <div class="split" aria-label="${y.length} Mafia, ${n.length} Pas mafia">
        <span class="y" style="flex-grow:${y.length || .0001}">${y.length ? y.length + " Mafia" : ""}</span>
        <span class="n" style="flex-grow:${n.length || .0001}">${n.length ? n.length + " Pas mafia" : ""}</span>
      </div>
      <div class="who">
        <div class="y"><h3>Mafia</h3><ul>${list(y, n)}</ul></div>
        <div class="n"><h3>Pas mafia</h3><ul>${list(n, y)}</ul></div>
      </div>
    </article>
    ${alone ? `<p class="hint center"><strong style="color:var(--paper)">${esc(alone)}</strong> est seul de son côté. Explique-toi.</p>` : ""}
    <button class="btn main" id="next">${last ? "Voir les titres" : GM() === MODES.dan ? "Danseur suivant" : "Dossier suivant"}</button>
  </section>`;
  $("#next").onclick = () => {
    if(last){ g.step = "end"; save(); render(); sfx.fanfare(); return; }
    g.revealIdx++; save(); render(); sfx.reveal();
  };
}

/* =========================================================
   Battle : tournoi à élimination directe
   ========================================================= */
// Nom d'un tour selon son nombre de duels
const roundName = n => ({ 1:"Finale", 2:"Demi-finales", 4:"Quarts de finale", 8:"Huitièmes de finale", 16:"Seizièmes de finale", 32:"32es de finale", 64:"64es de finale" })[n] || `Tour de ${n * 2}`;

function startBattle(){
  const all = shuffle(battlePool(store.bcat, store.dancers.map(d => d.text)));
  const n = store.bsize ? Math.min(store.bsize, all.length) : all.length;
  const ent = all.slice(0, n);
  // Taille du tableau = puissance de 2 ; les places vides sont des exempts (qualifiés d'office)
  let P = 1; while(P < n) P *= 2;
  const byes = P - n, first = [];
  let k = 0;
  for(let i = 0; i < P / 2; i++) first.push(i < byes ? { a: ent[k++], b: null, w: null } : { a: ent[k++], b: ent[k++], w: null });
  const round = shuffle(first).map(x => x.b === null ? Object.assign(x, { w: x.a, bye: true }) : x);
  store.game = { mode:"bat", cat:store.bcat, rounds:[round], r:0, m:0, step:"intro", hist:[] };
  seek(); store.game.step = "intro";
  save(); screen = "game"; render();
}
// Passe au prochain duel à jouer, ou au tour suivant quand le tour est fini
function seek(){
  const g = G(), cur = g.rounds[g.r], i = cur.findIndex(x => x.w == null);
  if(i >= 0){ g.m = i; return; }
  const ws = cur.map(x => x.w);
  if(ws.length === 1){ g.step = "champion"; return; }
  const nx = [];
  for(let j = 0; j < ws.length; j += 2) nx.push({ a: ws[j], b: ws[j + 1], w: null });
  g.rounds.push(nx); g.r++; g.m = 0; g.step = "intro";
}
function choose(side){
  const g = G(), x = g.rounds[g.r][g.m];
  x.w = side === "a" ? x.a : x.b;
  g.hist.push([g.r, g.m]);
  seek(); save(); render();
  if(g.step === "champion") sfx.fanfare(); else if(g.step === "intro") sfx.reveal();
}
function undoBattle(){
  const g = G(), h = g.hist.pop(); if(!h) return;
  const [r, m] = h;
  g.rounds.length = r + 1; g.rounds[r][m].w = null;
  g.r = r; g.m = m; g.step = "duel";
  save(); sfx.click(); render();
}
const quitBattle = () => askConfirm("Arrêter le tournoi ? Le tableau sera perdu.", () => { store.game = null; save(); screen = "home"; render(); }, "Arrêter");

function renderBattle(){
  const g = G();
  ({ intro:renderBattleIntro, duel:renderDuel, champion:renderChampion })[g.step]();
}

function renderBattleIntro(){
  const g = G(), cur = g.rounds[g.r], name = roundName(cur.length);
  const duels = cur.filter(x => !x.bye), byes = cur.filter(x => x.bye);
  app.innerHTML = `<section class="screen">
    <p class="meta">Battle ${(BCATS[g.cat] || BCATS.all).label}, tour ${g.r + 1} sur ${Math.log2(g.rounds[0].length) + 1}</p>
    <h1 class="title">${name.replace(" ", "<br>")}</h1>
    <p class="lead">${cur.length === 1 ? "Plus que deux. Un seul repartira avec la couronne." : `${duels.length} duel${duels.length > 1 ? "s" : ""} au programme. Débattez, puis choisissez le gagnant de chaque duel.`}</p>
    <ol class="mlist">${duels.map(x => `<li><span>${esc(x.a)}</span><b>VS</b><span>${esc(x.b)}</span></li>`).join("")}</ol>
    ${byes.length ? `<p class="hint">Qualifié${byes.length > 1 ? "s" : ""} d'office pour le tour suivant : ${byes.map(x => esc(x.a)).join(", ")}.</p>` : ""}
    <button class="btn main" id="go">${cur.length === 1 ? "Lancer la finale" : "Lancer les duels"}</button>
    ${g.hist.length ? `<button class="link" id="undo">Annuler le dernier choix</button>` : ""}
    <button class="link" id="quit">Arrêter le tournoi</button>
  </section>`;
  $("#go").onclick = () => { g.step = "duel"; save(); render(); sfx.swipe(); };
  const u = $("#undo"); if(u) u.onclick = undoBattle;
  $("#quit").onclick = quitBattle;
}

const fighter = (name, side) => `<button class="fighter" data-side="${side}" aria-label="Faire gagner ${esc(name)}">
  <span class="f-mono" aria-hidden="true">${esc([...name][0] || "?")}</span>
  <span class="f-name">${esc(name)}<small>Touche pour le qualifier</small></span></button>`;

function renderDuel(){
  const g = G(), cur = g.rounds[g.r], x = cur[g.m];
  const real = cur.filter(y => !y.bye), num = real.indexOf(x) + 1;
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${roundName(cur.length)}</span><span>${cur.length === 1 ? "Le duel final" : `Duel ${num} sur ${real.length}`}</span></header>
    <div class="duel">${fighter(x.a, "a")}<span class="vs" aria-hidden="true">VS</span>${fighter(x.b, "b")}</div>
    <p class="hint center">Débattez, puis touchez le gagnant.</p>
    <button class="btn ghost" id="coin">Pas d'accord ? Pile ou face</button>
    ${g.hist.length ? `<button class="link" id="undo">Annuler le dernier choix</button>` : ""}
    <button class="link" id="quit">Arrêter le tournoi</button>
  </section>`;
  let busy = false;
  const fa = $('[data-side="a"]'), fb = $('[data-side="b"]');
  const win = side => {
    if(busy) return; busy = true;
    sfx.swipe(); sfx.mafia();
    (side === "a" ? fa : fb).classList.add("win"); (side === "a" ? fb : fa).classList.add("lose");
    reduce() ? choose(side) : setTimeout(() => choose(side), 650);
  };
  fa.onclick = () => win("a"); fb.onclick = () => win("b");
  // Pile ou face : la lumière passe d'un danseur à l'autre en ralentissant, puis s'arrête
  $("#coin").onclick = () => {
    if(busy) return; busy = true;
    const side = Math.random() < .5 ? "a" : "b";
    if(reduce()){ busy = false; win(side); return; }
    let t = 0, d = 70, i = 0;
    const steps = [];
    while(t < 1600){ steps.push([t, i % 2 ? "b" : "a"]); t += d; d *= 1.15; i++; }
    if(steps[steps.length - 1][1] !== side) steps.push([t, side]);
    steps.forEach(([at, sd]) => setTimeout(() => { fa.classList.toggle("hot", sd === "a"); fb.classList.toggle("hot", sd === "b"); sfx.click(); }, at));
    setTimeout(() => { fa.classList.remove("hot"); fb.classList.remove("hot"); busy = false; win(side); }, steps[steps.length - 1][0] + 350);
  };
  const u = $("#undo"); if(u) u.onclick = undoBattle;
  $("#quit").onclick = quitBattle;
}

function renderChampion(){
  const g = G(), fin = g.rounds[g.r][0], champ = fin.w, runner = fin.w === fin.a ? fin.b : fin.a;
  app.innerHTML = `<section class="screen">
    <div class="champ">
      <span class="crown" aria-hidden="true">♛</span>
      <p class="meta">Champion ${(BCATS[g.cat] || BCATS.all).label}</p>
      <h1 class="champ-name">${esc(champ)}</h1>
      <p class="hint">A battu ${esc(runner)} en finale.</p>
    </div>
    <h2 class="h2">Le tableau</h2>
    <div class="bracket">${g.rounds.map(rd => `<section><h3>${roundName(rd.length)}</h3><ul>${rd.map(x => x.bye
        ? `<li><span class="w">${esc(x.a)}</span><span class="q">qualifié d'office</span></li>`
        : `<li><span class="${x.w === x.a ? "w" : "l"}">${esc(x.a)}</span><b>VS</b><span class="${x.w === x.b ? "w" : "l"}">${esc(x.b)}</span></li>`).join("")}</ul></section>`).join("")}</div>
    <button class="btn main" id="again">Nouveau tournoi</button>
    <button class="link" id="undo">Annuler le dernier choix</button>
    <button class="btn ghost" id="home">Retour à l'accueil</button>
  </section>`;
  $("#again").onclick = startBattle;
  $("#undo").onclick = undoBattle;
  $("#home").onclick = () => { store.game = null; save(); screen = "home"; render(); };
}

/* ---------- Titres de fin ---------- */
function renderEnd(){
  const g = G(), N = g.cards.length;
  const mafiaCount = p => g.votes[p].filter(Boolean).length;
  const majority = i => { const { y, n } = tally(i); return y.length === n.length ? null : y.length > n.length; };
  const withMaj = p => g.votes[p].filter((v,i) => majority(i) !== null && v === majority(i)).length;
  // Chaque titre va à une personne différente quand c'est possible
  const used = new Set();
  const pick = (fn, dir) => { const s = g.players.slice().sort((a,b) => dir * (fn(b) - fn(a))); const p = s.find(x => !used.has(x)) || s[0]; used.add(p); return p; };
  const parrain = pick(mafiaCount, -1), juge = pick(mafiaCount, 1), mouton = pick(withMaj, 1), rebelle = pick(withMaj, -1);
  const pct = i => Math.round(tally(i).y.length / g.players.length * 100);
  const order = g.cards.map((c,i) => [i, pct(i)]).sort((a,b) => b[1] - a[1]);
  const divisive = g.cards.map((c,i) => [i, Math.abs(tally(i).y.length - tally(i).n.length)]).sort((a,b) => a[1] - b[1])[0][0];
  const awards = [
    ["P", "Le Parrain", parrain, `Seulement ${mafiaCount(parrain)} « mafia » sur ${N}. Pour lui, tout ça c'est normal.`, true],
    ["J", "Le Juge", juge, `${mafiaCount(juge)} « mafia » sur ${N}. Rien ne lui échappe.`],
    ["M", "Le Mouton", mouton, `D'accord avec la majorité ${withMaj(mouton)} fois sur ${N}.`],
    ["R", "Le Rebelle", rebelle, `D'accord avec la majorité seulement ${withMaj(rebelle)} fois sur ${N}. Toujours un avis à part.`]
  ];
  app.innerHTML = `<section class="screen">
    <h1 class="title">Les<br>titres</h1>
    <div class="awards">${awards.map(([ico,t,p,why,gold],k) => `<div class="award ${gold ? "gold" : ""}" style="--d:${k}"><span class="ico" aria-hidden="true">${ico}</span>
      <p><span class="t">${t}</span><strong>${esc(p)}</strong><span class="why">${esc(why)}</span></p></div>`).join("")}</div>
    <h2 class="h2">${GM() === MODES.dan ? "Le danseur" : "Le dossier"} qui a le plus divisé</h2>
    <p class="note" style="margin:0;background:var(--bg2);border-radius:10px;padding:10px 12px;border-left:6px solid var(--gold);font-weight:700">${esc(g.cards[divisive])}</p>
    <h2 class="h2">Du plus mafia au moins mafia</h2>
    <ol class="top-list">${order.map(([i,v]) => `<li><span class="pc">${v} %</span><span>${esc(g.cards[i])}</span></li>`).join("")}</ol>
    <button class="btn main" id="again">Rejouer en mode ${GM().label}</button>
    <button class="btn ghost" id="home">Retour à l'accueil</button>
  </section>`;
  $("#again").onclick = () => { store.mode = g.mode || "sit"; startGame(); };
  $("#home").onclick = () => { store.game = null; save(); screen = "home"; render(); };
}

render();
