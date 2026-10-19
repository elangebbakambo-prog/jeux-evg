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
// Exemples de danseurs pour le mode Danseurs (à remplacer)
const EXAMPLE_DANCERS = ["Cody","Julien","Yo","Johan","Christian","Mehdi","Sofiane","Kenzo"].map(text => ({ text, ex:true }));
const MODES = {
  sit: { label:"Situations", one:"situation", many:"situations", card:"Dossier", bankTitle:"Les<br>dossiers",
         intro:"Écris une situation qui fait débat. Plus c'est tiré de vos vraies histoires, plus ça part en clash.",
         placeholder:"Ex. : Réserver la salle de répét et ne pas venir." },
  dan: { label:"Danseurs", one:"danseur", many:"danseurs", card:"Danseur", bankTitle:"Les<br>suspects",
         intro:"Ajoute les danseurs à juger. Chacun dira s'il est mafia ou pas mafia, puis devra se justifier.",
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
  if(!st.mode) st.mode = "sit";
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
  const key = screen + (store.game ? store.game.step + store.game.turn + store.game.revealIdx : "");
  if(key !== lastScreen){ window.scrollTo(0,0); lastScreen = key; }
}
const players = () => store.players.map(n => n.trim()).filter(Boolean);
const M = () => MODES[store.mode];
const list = () => store.mode === "dan" ? store.dancers : store.bank;
const setList = v => { if(store.mode === "dan") store.dancers = v; else store.bank = v; };
const exList = () => store.mode === "dan" ? EXAMPLE_DANCERS : EXAMPLES;
const deckSize = () => Math.min(store.size || list().length, list().length);

/* ---------- Accueil ---------- */
function renderHome(){
  const exs = list().filter(q => q.ex).length, n = list().length, m = M();
  app.innerHTML = `<section class="screen">
    <h1 class="title">Mafia<br><em>ou pas</em><br>mafia</h1>
    <p class="lead">Chacun glisse les cartes en secret : à droite c'est mafia, à gauche ça passe. Ensuite on révèle les votes carte par carte, et chacun doit se justifier.</p>
    <h2 class="h2">Mode de jeu</h2>
    <div class="seg two" role="group" aria-label="Mode de jeu">${Object.entries(MODES).map(([k,md]) =>
      `<button data-mode="${k}" aria-pressed="${store.mode === k}">${md.label}<br><small>${(k === "dan" ? store.dancers : store.bank).length} ${md.many}</small></button>`).join("")}</div>
    <p class="hint">${store.mode === "dan" ? "Chaque carte est un danseur : est-il mafia ou pas mafia ?" : "Chaque carte est une situation : c'est mafia ou ça passe ?"}</p>
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
  </section>`;
  $$("input[data-i]").forEach(inp => inp.oninput = () => { store.players[+inp.dataset.i] = inp.value; save(); $("#start").disabled = !(n && players().length >= 2); });
  $$("[data-rm]").forEach(b => b.onclick = () => { if(store.players.length > 2){ store.players.splice(+b.dataset.rm, 1); save(); render(); } });
  $("#add").onclick = () => { store.players.push(""); save(); render(); const all = $$("input[data-i]"); all[all.length-1].focus(); };
  $$("[data-mode]").forEach(b => b.onclick = () => { store.mode = b.dataset.mode; save(); sfx.click(); render(); });
  $$("[data-size]").forEach(b => b.onclick = () => { store.size = +b.dataset.size; save(); sfx.click(); render(); });
  $("#bank").onclick = () => { screen = "bank"; render(); };
  $("#start").onclick = startGame;
}

/* ---------- Préparer les situations ---------- */
function renderBank(){
  const m = M(), L = list();
  app.innerHTML = `<section class="screen">
    <button class="btn ghost" id="back">Retour</button>
    <h1 class="title">${m.bankTitle}</h1>
    <div class="seg two" role="group" aria-label="Liste à préparer">${Object.entries(MODES).map(([k,md]) =>
      `<button data-mode="${k}" aria-pressed="${store.mode === k}">${md.label}</button>`).join("")}</div>
    <p class="lead">${m.intro}</p>
    ${store.mode === "dan"
      ? `<input class="field" id="qtext" placeholder="${m.placeholder}" aria-label="Nouveau danseur" value="${esc(draftText)}">`
      : `<textarea class="field" id="qtext" placeholder="${m.placeholder}" aria-label="Nouvelle situation">${esc(draftText)}</textarea>`}
    <button class="btn main" id="addq" ${draftText.trim() ? "" : "disabled"}>Ajouter ${store.mode === "dan" ? "le danseur" : "la situation"}</button>
    <h2 class="h2">${L.length} ${L.length > 1 ? m.many : m.one}</h2>
    ${L.length ? `<ol class="qlist">${L.map((q,i) => `<li class="qitem">
        <p>${q.ex ? `<span class="tag">Exemple</span>` : ""}${esc(q.text)}</p>
        <button class="del" data-del="${i}" aria-label="Supprimer">×</button></li>`).join("")}</ol>`
      : `<p class="hint">La liste est vide. Ajoute ${store.mode === "dan" ? "le premier danseur" : "la première situation"} juste au-dessus.</p>`}
    ${L.some(q => q.ex) ? `<button class="btn ghost" id="clearEx">Supprimer les exemples</button>` : `<button class="link" id="restoreEx">Remettre les exemples</button>`}
  </section>`;
  $("#back").onclick = () => { screen = "home"; render(); };
  $$("[data-mode]").forEach(b => b.onclick = () => { store.mode = b.dataset.mode; draftText = ""; save(); sfx.click(); render(); });
  const ta = $("#qtext");
  ta.oninput = () => { draftText = ta.value; $("#addq").disabled = !draftText.trim(); };
  const add = () => {
    const t = draftText.trim(); if(!t) return;
    if(store.mode === "dan" && L.some(q => q.text.toLowerCase() === t.toLowerCase())){ askConfirm(`${t} est déjà dans la liste.`, null, "OK", null); return; }
    setList([{ text:t }, ...L]); draftText = ""; save(); sfx.clean(); render(); $("#qtext").focus();
  };
  $("#addq").onclick = add;
  if(store.mode === "dan") ta.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); add(); } };
  $$("[data-del]").forEach(b => b.onclick = () => {
    const q = L[+b.dataset.del];
    askConfirm(`Supprimer « ${q.text.slice(0, 60)}${q.text.length > 60 ? "…" : ""} » ?`, () => { setList(L.filter((_,k) => k !== +b.dataset.del)); save(); render(); }, "Supprimer");
  });
  const ce = $("#clearEx"); if(ce) ce.onclick = () => askConfirm(`Supprimer les ${m.many} d'exemple ? Les tiens restent.`, () => { setList(L.filter(q => !q.ex)); save(); render(); }, "Supprimer les exemples");
  const re = $("#restoreEx"); if(re) re.onclick = () => { setList(L.concat(exList())); save(); render(); };
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
  ({ handoff:renderHandoff, swipe:renderSwipe, revealIntro:renderRevealIntro, reveal:renderReveal, end:renderEnd })[g.step]();
}

function renderHandoff(){
  const g = G(), p = g.players[g.turn];
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">Joueur ${g.turn + 1} sur ${g.players.length}</p>
    <p class="hint" style="font-size:1.15rem">Passe le téléphone à</p>
    <h1 class="big">${esc(p)}</h1>
    <p class="hint">${g.cards.length} ${GM().many === "danseurs" ? "danseurs à juger" : "dossiers"} t'attendent. Personne ne regarde, tu glisses en secret.</p>
    <button class="btn main" id="go">C'est moi, je commence</button>
    <button class="link" id="quit">Arrêter la partie</button>
  </section>`;
  $("#go").onclick = () => { g.step = "swipe"; g.idx = 0; save(); render(); };
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
  card.focus({ preventScroll:true });
}

function renderRevealIntro(){
  const g = G();
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">Tout le monde a voté</p>
    <h1 class="big">L'heure<br>du verdict</h1>
    <p class="hint">Mettez-vous autour du téléphone. On révèle les ${g.cards.length} ${GM().many === "danseurs" ? "danseurs" : "dossiers"} un par un, et chacun défend son vote.</p>
    <button class="btn main" id="go">Révéler ${GM().many === "danseurs" ? "le premier danseur" : "le premier dossier"}</button>
  </section>`;
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
