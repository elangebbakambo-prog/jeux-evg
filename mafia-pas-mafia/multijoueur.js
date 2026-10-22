/* =========================================================
   Mafia ou pas mafia, en ligne : chacun vote sur son téléphone
   - L'écran hôte crée une salle (code à 4 lettres) et garde la partie en mémoire.
   - Les joueurs rejoignent la salle et envoient leurs votes à l'hôte.
   - Les messages passent par Supabase Realtime (canal « broadcast » + « presence »).
   ========================================================= */
const CFG = window.EVG_CONFIG || {}, DATA = window.MAFIA_DATA || { situations: [], dancers: [] };
const STORE_KEY = "mafia-v1";             // listes de « Préparer » du jeu sur un seul téléphone
const HOST_KEY = "mafia-multi-host";      // partie en cours, côté hôte
const ME_KEY = "mafia-multi-me";          // identité du joueur sur ce téléphone
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // pas de I ni de O, pour éviter les confusions
const MODES = {
  sit: { label: "Situations", card: "Dossier", many: "dossiers" },
  dan: { label: "Danseurs", card: "Danseur", many: "danseurs" },
  bat: { label: "Battle", card: "Danseur", many: "danseurs" }
};
const listOf = (L, mode) => mode === "bat" ? L.dan : L[mode];

/* ---------- Outils ---------- */
const app = document.getElementById("app");
const $ = s => app.querySelector(s), $$ = s => app.querySelectorAll(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = n => String(n).padStart(3, "0");
const read = k => { try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
const write = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
const newId = () => Math.random().toString(36).slice(2, 10);
const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const cleanCode = s => String(s || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

function askConfirm(text, onYes, yes = "Oui", no = "Annuler"){
  const box = document.createElement("div"); box.className = "ov";
  box.innerHTML = `<div class="ov-box" role="dialog" aria-modal="true"><p>${esc(text)}</p>
    <button class="btn main" data-yes>${esc(yes)}</button>${no ? `<button class="btn ghost" data-no>${esc(no)}</button>` : ""}</div>`;
  document.body.appendChild(box); box.querySelector("[data-yes]").focus();
  box.querySelector("[data-yes]").onclick = () => { box.remove(); if(onYes) onYes(); };
  const n = box.querySelector("[data-no]"); if(n) n.onclick = () => box.remove();
}

// Listes : celles de « Préparer » si le jeu a déjà été ouvert ici, sinon celles de départ
function lists(){
  const st = read(STORE_KEY);
  return {
    sit: st && st.bank && st.bank.length ? st.bank.map(q => q.text) : DATA.situations,
    dan: st && st.dancers && st.dancers.length ? st.dancers.map(q => q.text) : DATA.dancers
  };
}

/* ---------- Sons ---------- */
const sfx = (() => {
  let ctx = null, on = true;
  try{ on = localStorage.getItem(STORE_KEY + "-sound") !== "off"; }catch(e){}
  const ac = () => { if(!ctx){ const A = window.AudioContext || window.webkitAudioContext; if(!A) return null; ctx = new A(); } if(ctx.state === "suspended") ctx.resume(); return ctx; };
  function tone(f, dur, { type = "sine", vol = .18, at = 0, slide = null } = {}){
    const c = ac(); if(!c || !on) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if(slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
  }
  const seq = (fs, step, o) => fs.forEach((f, i) => tone(f, o.dur || .25, Object.assign({}, o, { at: i * step })));
  return {
    get on(){ return on; },
    toggle(){ on = !on; try{ localStorage.setItem(STORE_KEY + "-sound", on ? "on" : "off"); }catch(e){} if(on) this.click(); },
    click(){ tone(660, .06, { type:"triangle", vol:.12 }); },
    join(){ seq([523, 784], .08, { type:"triangle", vol:.1, dur:.15 }); },
    mafia(){ tone(110, .35, { type:"sawtooth", vol:.12, slide:70 }); },
    clean(){ seq([660, 880], .07, { type:"triangle", vol:.1, dur:.15 }); },
    swipe(){ tone(520, .12, { type:"triangle", vol:.08, slide:900 }); },
    reveal(){ seq([196, 233, 262, 294], .1, { type:"sawtooth", vol:.06, dur:.3 }); },
    fanfare(){ seq([392, 392, 392, 523, 659, 784, 1047], .13, { type:"square", vol:.08, dur:.25 }); tone(1047, 1.2, { type:"triangle", vol:.1, at:.95 }); }
  };
})();
const soundBtn = document.createElement("button");
soundBtn.className = "sound-btn";
const paintSound = () => { soundBtn.textContent = sfx.on ? "Son activé" : "Son coupé"; soundBtn.setAttribute("aria-pressed", sfx.on); };
soundBtn.onclick = () => { sfx.toggle(); paintSound(); };
paintSound(); document.body.appendChild(soundBtn);

/* =========================================================
   Connexion temps réel (Supabase Realtime)
   ========================================================= */
let sb = null, channel = null, conn = "off";
const connPill = document.createElement("div");
connPill.className = "conn"; connPill.setAttribute("role", "status");
document.body.appendChild(connPill);
function paintConn(){
  connPill.className = "conn " + conn;
  connPill.innerHTML = `<i aria-hidden="true"></i>${{ on:"En ligne", connecting:"Connexion…", error:"Hors ligne", off:"Pas connecté" }[conn]}`;
  connPill.hidden = conn === "off";
}
paintConn();

function client(){
  if(sb) return sb;
  if(!window.supabase || !CFG.supabaseUrl) throw new Error("supabase");
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 20 } } });
  return sb;
}
// Rejoint le canal de la salle. onUp est rappelé à chaque (re)connexion réussie.
function connect(code, key, meta, onMsg, onPresence, onUp){
  let c;
  try{ c = client(); }catch(e){ conn = "error"; paintConn(); return false; }
  if(channel) c.removeChannel(channel);
  conn = "connecting"; paintConn();
  channel = c.channel("mafia-" + code, { config: { broadcast: { self: false }, presence: { key } } });
  channel.on("broadcast", { event: "msg" }, ({ payload }) => onMsg(payload || {}));
  channel.on("presence", { event: "sync" }, () => onPresence(channel.presenceState()));
  channel.subscribe(async status => {
    if(status === "SUBSCRIBED"){ conn = "on"; paintConn(); try{ await channel.track(meta); }catch(e){} onUp(); }
    else if(status === "CHANNEL_ERROR" || status === "TIMED_OUT"){ conn = "error"; paintConn(); }
  });
  return true;
}
function send(payload){ if(channel) channel.send({ type: "broadcast", event: "msg", payload }); }
function disconnect(){ if(channel && sb) sb.removeChannel(channel); channel = null; conn = "off"; paintConn(); }

/* =========================================================
   Cartes et résultats (communs à l'hôte et aux joueurs)
   ========================================================= */
const cardFace = (mode, text, i, cls = "") => `<div class="card ${cls} ${mode === "dan" ? "dancer" : ""}" ${cls === "top" ? `id="top" tabindex="0" aria-label="${esc(text)}. Glisse à droite pour Mafia, à gauche pour Pas mafia."` : `aria-hidden="true"`}>
  <span class="c-head"><span>${MODES[mode].card}</span><span class="c-file">N° ${pad(i + 1)}</span></span>
  ${mode === "dan" ? `<span class="c-mono" aria-hidden="true">${esc([...text][0] || "?")}</span><span class="c-name">${esc(text)}<small>Mafia ou pas mafia ?</small></span>` : `<span class="c-text">${esc(text)}</span>`}
  <span class="c-foot"><span>← Pas mafia</span><span>Mafia →</span></span>
  <span class="stamp yes">MAFIA</span><span class="stamp no">PAS MAFIA</span>
</div>`;
const verdictWord = (y, n) => y > n ? ["y", "Mafia"] : y < n ? ["n", "Pas mafia"] : ["t", "Égalité"];

/* =========================================================
   Démarrage : choisir son rôle
   ========================================================= */
const params = new URLSearchParams(location.search);
let role = null;
function boot(){
  const h = read(HOST_KEY), me = read(ME_KEY), code = cleanCode(params.get("salle"));
  if(code){ role = "player"; P.code = code; P.name = (me && me.name) || ""; if(me && me.code === code && me.name){ joinRoom(); return; } renderJoin(); return; }
  if(h && h.phase && h.phase !== "setup"){ role = "host"; H = h; connectHost(); renderHost(); return; }
  if(me && me.code && me.name){ role = "player"; Object.assign(P, { code: me.code, name: me.name }); joinRoom(); return; }
  renderStart();
}
function renderStart(){
  role = null;
  app.innerHTML = `<section class="screen">
    <h1 class="title">Mafia<br><em>en ligne</em></h1>
    <p class="lead">Chacun vote en secret sur son propre téléphone, en même temps. L'écran hôte affiche ensuite les verdicts pour tout le monde.</p>
    <div class="roles">
      <button class="role main" id="asHost"><b>Créer une salle</b><span>Sur l'écran que tout le monde regarde : la télé, un ordi ou un téléphone posé au milieu.</span></button>
      <button class="role" id="asPlayer"><b>Rejoindre une salle</b><span>Sur ton téléphone, avec le code affiché sur l'écran hôte.</span></button>
    </div>
    <a class="link" href="index.html">Jouer sur un seul téléphone</a>
  </section>`;
  $("#asHost").onclick = () => { role = "host"; H = { phase: "setup", mode: "sit", size: 10, bsize: 8, players: [], votes: {}, cards: [] }; renderHost(); };
  $("#asPlayer").onclick = () => { role = "player"; P.code = ""; renderJoin(); };
}

/* =========================================================
   HÔTE
   ========================================================= */
let H = null, online = new Set();
const saveH = () => write(HOST_KEY, H);
const playerName = id => (H.players.find(p => p.id === id) || {}).name || "?";
const doneCount = id => (H.votes[id] || []).length;
const isDone = id => doneCount(id) >= H.cards.length && H.cards.length > 0;
const voters = () => H.players.filter(p => doneCount(p.id) > 0).map(p => p.id);
function tallyH(i){
  const y = [], n = [];
  H.players.forEach(p => { const v = (H.votes[p.id] || [])[i]; if(v === true) y.push(p.name); else if(v === false) n.push(p.name); });
  return { y, n };
}
// Ce que voient les joueurs : jamais les votes des autres avant la révélation
function publicState(){
  const st = { t: "state", code: H.code, phase: H.phase, mode: H.mode, players: H.players.map(p => ({ id: p.id, name: p.name })),
    progress: Object.fromEntries(H.players.map(p => [p.id, doneCount(p.id)])), total: H.cards.length };
  if(H.phase === "vote") st.cards = H.cards;
  if(H.phase === "reveal"){ const i = H.revealIdx, t = tallyH(i); st.reveal = { i, text: H.cards[i], y: t.y, n: t.n }; }
  if(H.bat && ["bintro", "duel", "dreveal", "champion"].includes(H.phase)) Object.assign(st, batPublic());
  return st;
}
const broadcast = () => send(publicState());

function connectHost(){
  const ok = connect(H.code, "host", { role: "host" }, onHostMsg, ps => {
    online = new Set(Object.keys(ps).filter(k => k !== "host"));
    if(role === "host") renderHost();
  }, () => broadcast());
  if(!ok) renderHost();
}
function onHostMsg(m){
  if(!H || !m.id) return;
  if(m.t === "hello"){
    const name = String(m.name || "").trim().slice(0, 24) || "Joueur";
    const p = H.players.find(x => x.id === m.id);
    if(p) p.name = name;
    else { H.players.push({ id: m.id, name }); sfx.join(); }
    saveH(); broadcast();
    send({ t: "resume", to: m.id, votes: H.votes[m.id] || [], dvote: H.phase === "duel" && H.dvotes ? H.dvotes[m.id] || null : null });
    renderHost(); return;
  }
  if(!H.players.some(p => p.id === m.id)) return;
  if(m.t === "vote" && H.phase === "vote" && Number.isInteger(m.i) && m.i >= 0 && m.i < H.cards.length){
    const a = H.votes[m.id] || (H.votes[m.id] = []);
    if(m.i > a.length) return;          // vote hors ordre : ignoré, le joueur sera resynchronisé
    a[m.i] = !!m.v; a.length = m.i + 1;
    saveH(); broadcast(); renderHost();
    if(H.players.every(p => isDone(p.id))) sfx.clean();
    return;
  }
  if(m.t === "undo" && H.phase === "vote" && Number.isInteger(m.i)){
    const a = H.votes[m.id] || []; a.length = Math.max(0, Math.min(a.length, m.i));
    H.votes[m.id] = a; saveH(); broadcast(); renderHost(); return;
  }
  if(m.t === "dvote" && H.phase === "duel" && m.key === duelKey() && (m.side === "a" || m.side === "b" || m.side === null)){
    if(m.side === null) delete H.dvotes[m.id]; else H.dvotes[m.id] = m.side;
    saveH(); broadcast(); renderHost();
    if(H.players.every(p => H.dvotes[p.id])) sfx.clean();
    return;
  }
  if(m.t === "leave"){
    H.players = H.players.filter(p => p.id !== m.id); delete H.votes[m.id]; if(H.dvotes) delete H.dvotes[m.id];
    saveH(); broadcast(); renderHost();
  }
}

let lastHostKey = null, hostEditing = false;
function renderHost(){
  if(hostEditing) return hostSetupInRoom();
  ({ setup: hostSetup, lobby: hostLobby, vote: hostVote, reveal: hostReveal, end: hostEnd,
     bintro: hostBatIntro, duel: hostDuel, dreveal: hostDuelReveal, champion: hostChampion })[H.phase]();
  const k = H.phase + (H.revealIdx || 0) + (H.bat ? duelKey() : "");
  if(k !== lastHostKey){ window.scrollTo(0, 0); lastHostKey = k; }
}

// Réglages de la partie : mode, puis nombre de cartes ou taille du tournoi
function settingsHTML(L){
  return `<h2 class="h2">Mode de jeu</h2>
    <div class="seg" role="group" aria-label="Mode de jeu">${Object.entries(MODES).map(([k, md]) =>
      `<button data-mode="${k}" aria-pressed="${H.mode === k}">${md.label}<br><small>${listOf(L, k).length} ${md.many}</small></button>`).join("")}</div>
    ${H.mode === "bat" ? `<h2 class="h2">Taille du tournoi</h2>
    <div class="seg four" role="group" aria-label="Nombre de danseurs dans le tournoi">${[[4, "4"], [8, "8"], [16, "16"], [0, "Tous"]].map(([k, l]) =>
      `<button data-bsize="${k}" aria-pressed="${H.bsize === k}">${l}<br><small>${k ? "danseurs" : L.dan.length}</small></button>`).join("")}</div>
    <p class="hint">À chaque duel, chacun vote pour son danseur sur son téléphone. L'hôte révèle ensuite les votes un par un.</p>`
    : `<h2 class="h2">Cartes par partie</h2>
    <div class="seg" role="group" aria-label="Nombre de cartes">${[[6, "Rapide"], [10, "Normal"], [0, "Toutes"]].map(([k, l]) =>
      `<button data-size="${k}" aria-pressed="${H.size === k}">${l}<br><small>${k || L[H.mode].length} cartes</small></button>`).join("")}</div>`}`;
}
function bindSettings(redraw){
  $$("[data-mode]").forEach(b => b.onclick = () => { H.mode = b.dataset.mode; saveH(); sfx.click(); redraw(); });
  $$("[data-size]").forEach(b => b.onclick = () => { H.size = +b.dataset.size; saveH(); sfx.click(); redraw(); });
  $$("[data-bsize]").forEach(b => b.onclick = () => { H.bsize = +b.dataset.bsize; saveH(); sfx.click(); redraw(); });
}
function hostSetup(){
  const L = lists();
  app.innerHTML = `<section class="screen">
    <button class="btn ghost" id="back">Retour</button>
    <h1 class="title">Créer<br>la salle</h1>
    ${settingsHTML(L)}
    <p class="hint">Les cartes viennent des listes de « Préparer » du jeu sur ce téléphone ou cet ordi. Si tu ne les as jamais modifiées, ce sont les listes de départ.</p>
    ${CFG.supabaseUrl ? "" : `<p class="error-box">La connexion n'est pas configurée : le fichier config.js est introuvable.</p>`}
    <button class="btn main" id="create" ${listOf(L, H.mode).length >= (H.mode === "bat" ? 2 : 1) ? "" : "disabled"}>Créer la salle</button>
  </section>`;
  $("#back").onclick = renderStart;
  bindSettings(hostSetup);
  $("#create").onclick = () => { H.code = newCode(); H.phase = "lobby"; saveH(); connectHost(); renderHost(); };
}

const joinUrl = () => location.origin + location.pathname + "?salle=" + H.code;
function rosterHTML(){
  return H.players.length ? H.players.map(p => `<li class="${online.has(p.id) ? "" : "off"}"><span class="dot" aria-hidden="true"></span>${esc(p.name)}
    ${H.phase === "lobby" ? `<button class="kick" data-kick="${esc(p.id)}" aria-label="Retirer ${esc(p.name)}">×</button>` : ""}</li>`).join("")
    : `<li class="empty">Personne pour l'instant. Scannez le QR code ou tapez le code.</li>`;
}
function hostLobby(){
  const L = lists();
  app.innerHTML = `<section class="screen">
    <p class="meta">${H.mode === "bat" ? `Battle, tournoi à ${Math.min(H.bsize || L.dan.length, L.dan.length)} danseurs` : `${MODES[H.mode].label}, ${H.size || L[H.mode].length} cartes`}</p>
    <div class="room">
      <p class="hint">Code de la salle</p>
      <span class="code">${esc(H.code)}</span>
      <div class="qr" id="qr" aria-label="QR code pour rejoindre la salle"></div>
      <span class="joinurl">${esc(joinUrl())}</span>
    </div>
    <h2 class="h2">${H.players.length} joueur${H.players.length > 1 ? "s" : ""} dans la salle</h2>
    <ul class="roster">${rosterHTML()}</ul>
    <p class="hint">Cet écran sert d'écran de jeu. Pour voter aussi, rejoins la salle depuis ton téléphone.</p>
    <button class="btn main" id="start" ${H.players.length >= 2 ? "" : "disabled"}>Lancer la partie</button>
    <button class="link" id="close">Fermer la salle</button>
  </section>`;
  const qr = $("#qr");
  if(window.QRCode){ try{ new QRCode(qr, { text: joinUrl(), width: 180, height: 180, colorDark: "#160304", colorLight: "#FFFFFF" }); }catch(e){ qr.hidden = true; } } else qr.hidden = true;
  $$("[data-kick]").forEach(b => b.onclick = () => {
    const id = b.dataset.kick;
    askConfirm(`Retirer ${playerName(id)} de la salle ?`, () => { H.players = H.players.filter(p => p.id !== id); delete H.votes[id]; send({ t: "kick", to: id }); saveH(); broadcast(); renderHost(); }, "Retirer");
  });
  $("#start").onclick = () => {
    if(H.mode === "bat"){ startBattleH(); return; }
    H.bat = null;
    const L2 = lists()[H.mode];
    H.cards = shuffle(L2).slice(0, H.size ? Math.min(H.size, L2.length) : L2.length);
    H.votes = {}; H.revealIdx = 0; H.phase = "vote";
    saveH(); broadcast(); sfx.reveal(); renderHost();
  };
  $("#close").onclick = closeRoom;
}
function closeRoom(){
  askConfirm("Fermer la salle ? Les joueurs seront déconnectés.", () => { send({ t: "closed" }); disconnect(); H = null; write(HOST_KEY, null); renderStart(); }, "Fermer la salle");
}

function hostVote(){
  const N = H.cards.length, all = H.players.length && H.players.every(p => isDone(p.id)), nDone = H.players.filter(p => isDone(p.id)).length;
  app.innerHTML = `<section class="screen">
    <p class="meta">Salle ${esc(H.code)}, ${MODES[H.mode].label}</p>
    <h1 class="title">${all ? "Tout le<br>monde a voté" : "Vote<br>en cours"}</h1>
    <p class="lead">${all ? "Mettez-vous devant l'écran : on révèle les verdicts." : `${nDone} sur ${H.players.length} ont fini de voter. Chacun glisse les ${N} cartes sur son téléphone.`}</p>
    <ul class="prog">${H.players.map(p => { const c = doneCount(p.id), d = c >= N; return `<li class="${d ? "done" : ""}">
      <span class="nm">${esc(p.name)}${online.has(p.id) ? "" : "<small>Déconnecté</small>"}</span>
      <span class="bar" aria-hidden="true"><i style="width:${Math.round(c / N * 100)}%"></i></span>
      <span class="ct">${d ? "✓" : `${c}/${N}`}</span></li>`; }).join("")}</ul>
    <button class="btn main" id="go" ${all ? "" : "disabled"}>Révéler les votes</button>
    ${!all && voters().length ? `<button class="link" id="force">Révéler sans attendre les retardataires</button>` : ""}
    <p class="hint">Un joueur arrivé en retard peut encore rejoindre avec le code <strong>${esc(H.code)}</strong>.</p>
    <button class="link" id="close">Fermer la salle</button>
  </section>`;
  const go = () => { H.phase = "reveal"; H.revealIdx = 0; saveH(); broadcast(); sfx.reveal(); renderHost(); };
  $("#go").onclick = go;
  const f = $("#force"); if(f) f.onclick = () => askConfirm("Révéler maintenant ? Les cartes non votées ne compteront pas pour ceux qui n'ont pas fini.", go, "Révéler");
  $("#close").onclick = closeRoom;
}

function hostReveal(){
  const i = H.revealIdx, { y, n } = tallyH(i), last = i >= H.cards.length - 1, md = MODES[H.mode];
  const [cls, word] = verdictWord(y.length, n.length);
  const li = (arr, other) => arr.length ? arr.map(p => `<li class="${arr.length === 1 && other.length > 1 ? "alone" : ""}">${esc(p)}</li>`).join("") : `<li class="none">Personne</li>`;
  const alone = y.length === 1 && n.length > 1 ? y[0] : n.length === 1 && y.length > 1 ? n[0] : null;
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>Verdict</span><span>${md.card} ${i + 1} sur ${H.cards.length}</span></header>
    <article class="verdict ${H.mode === "dan" ? "dancer" : ""}">
      <span class="c-head"><span>${md.card}</span><span class="c-file">N° ${pad(i + 1)}</span></span>
      <span class="${H.mode === "dan" ? "c-name" : "c-text"}">${esc(H.cards[i])}</span>
      <p class="big-verdict ${cls}">${word}</p>
      <div class="split" aria-label="${y.length} Mafia, ${n.length} Pas mafia">
        <span class="y" style="flex-grow:${y.length || .0001}">${y.length ? y.length + " Mafia" : ""}</span>
        <span class="n" style="flex-grow:${n.length || .0001}">${n.length ? n.length + " Pas mafia" : ""}</span>
      </div>
      <div class="who"><div class="y"><h3>Mafia</h3><ul>${li(y, n)}</ul></div><div class="n"><h3>Pas mafia</h3><ul>${li(n, y)}</ul></div></div>
    </article>
    ${alone ? `<p class="hint center"><strong style="color:var(--paper)">${esc(alone)}</strong> est seul de son côté. Explique-toi.</p>` : ""}
    <button class="btn main" id="next">${last ? "Voir les titres" : `${md.card} suivant`}</button>
  </section>`;
  $("#next").onclick = () => {
    if(last){ H.phase = "end"; saveH(); broadcast(); sfx.fanfare(); renderHost(); return; }
    H.revealIdx++; saveH(); broadcast(); sfx.reveal(); renderHost();
  };
}

function hostEnd(){
  const N = H.cards.length, ids = voters();
  const P2 = ids.map(id => ({ id, name: playerName(id), v: H.votes[id] || [] }));
  const mafiaCount = p => p.v.filter(x => x === true).length;
  const majority = i => { const { y, n } = tallyH(i); return y.length === n.length ? null : y.length > n.length; };
  const withMaj = p => p.v.filter((x, i) => majority(i) !== null && x === majority(i)).length;
  const used = new Set();
  const pick = (fn, dir) => { const s = P2.slice().sort((a, b) => dir * (fn(b) - fn(a))); const p = s.find(x => !used.has(x.id)) || s[0]; used.add(p.id); return p; };
  const awards = P2.length ? (() => { const pa = pick(mafiaCount, -1), ju = pick(mafiaCount, 1), mo = pick(withMaj, 1), re = pick(withMaj, -1); return [
    ["P", "Le Parrain", pa.name, `Seulement ${mafiaCount(pa)} « mafia » sur ${N}. Pour lui, tout ça c'est normal.`, true],
    ["J", "Le Juge", ju.name, `${mafiaCount(ju)} « mafia » sur ${N}. Rien ne lui échappe.`],
    ["M", "Le Mouton", mo.name, `D'accord avec la majorité ${withMaj(mo)} fois sur ${N}.`],
    ["R", "Le Rebelle", re.name, `D'accord avec la majorité seulement ${withMaj(re)} fois sur ${N}. Toujours un avis à part.`]].slice(0, Math.max(1, P2.length)); })() : [];
  const tot = i => { const t = tallyH(i); return t.y.length + t.n.length; };
  const pct = i => tot(i) ? Math.round(tallyH(i).y.length / tot(i) * 100) : 0;
  const order = H.cards.map((c, i) => [i, pct(i)]).sort((a, b) => b[1] - a[1]);
  const divisive = H.cards.map((c, i) => [i, Math.abs(tallyH(i).y.length - tallyH(i).n.length)]).sort((a, b) => a[1] - b[1])[0][0];
  app.innerHTML = `<section class="screen">
    <h1 class="title">Les<br>titres</h1>
    <div class="awards">${awards.map(([ico, t, p, why, gold], k) => `<div class="award ${gold ? "gold" : ""}" style="--d:${k}"><span class="ico" aria-hidden="true">${ico}</span>
      <p><span class="t">${t}</span><strong>${esc(p)}</strong><span class="why">${esc(why)}</span></p></div>`).join("")}</div>
    <h2 class="h2">${H.mode === "dan" ? "Le danseur" : "Le dossier"} qui a le plus divisé</h2>
    <p class="note">${esc(H.cards[divisive])}</p>
    <h2 class="h2">Du plus mafia au moins mafia</h2>
    <ol class="top-list">${order.map(([i, v]) => `<li><span class="pc">${v} %</span><span>${esc(H.cards[i])}</span></li>`).join("")}</ol>
    <button class="btn main" id="again">Rejouer avec les mêmes joueurs</button>
    <button class="btn ghost" id="mode">Changer de mode ou de cartes</button>
    <button class="link" id="close">Fermer la salle</button>
  </section>`;
  $("#again").onclick = () => { H.phase = "lobby"; H.votes = {}; H.cards = []; saveH(); broadcast(); renderHost(); $("#start").click(); };
  $("#mode").onclick = () => { H.phase = "lobby"; H.votes = {}; H.cards = []; saveH(); broadcast(); hostEditing = true; hostSetupInRoom(); };
  $("#close").onclick = closeRoom;
}
// Changer le mode sans fermer la salle : les joueurs restent connectés
function hostSetupInRoom(){
  const L = lists();
  app.innerHTML = `<section class="screen">
    <h1 class="title">Nouvelle<br>partie</h1>
    <p class="lead">Les joueurs restent dans la salle ${esc(H.code)}.</p>
    ${settingsHTML(L)}
    <button class="btn main" id="ok">Retour à la salle</button>
  </section>`;
  bindSettings(hostSetupInRoom);
  $("#ok").onclick = () => { hostEditing = false; saveH(); broadcast(); renderHost(); };
}

/* =========================================================
   HÔTE : mode Battle (tournoi, chacun vote sur son téléphone)
   ========================================================= */
const roundName = n => ({ 1:"Finale", 2:"Demi-finales", 4:"Quarts de finale", 8:"Huitièmes de finale", 16:"Seizièmes de finale", 32:"32es de finale", 64:"64es de finale" })[n] || `Tour de ${n * 2}`;
const curDuel = () => H.bat.rounds[H.bat.r][H.bat.m];
const duelKey = () => H.bat ? String(H.bat.seq || 0) : ""; // change à chaque nouveau duel, même rejoué
const duelLabel = () => { const cur = H.bat.rounds[H.bat.r], real = cur.filter(y => !y.bye); return cur.length === 1 ? "Le duel final" : `Duel ${real.indexOf(curDuel()) + 1} sur ${real.length}`; };

function startBattleH(){
  const all = shuffle(lists().dan), n = H.bsize ? Math.min(H.bsize, all.length) : all.length, ent = all.slice(0, n);
  // Taille du tableau = puissance de 2 ; les places vides sont des exempts (qualifiés d'office)
  let N = 1; while(N < n) N *= 2;
  const byes = N - n, first = []; let k = 0;
  for(let i = 0; i < N / 2; i++) first.push(i < byes ? { a: ent[k++], b: null, w: null } : { a: ent[k++], b: ent[k++], w: null });
  H.bat = { rounds: [shuffle(first).map(x => x.b === null ? Object.assign(x, { w: x.a, bye: true }) : x)], r: 0, m: 0, hist: [] };
  H.cards = []; H.votes = {}; H.dvotes = {};
  seekH(); H.phase = "bintro";
  saveH(); broadcast(); sfx.reveal(); renderHost();
}
// Passe au prochain duel à jouer, ou au tour suivant quand le tour est fini
function seekH(){
  const B = H.bat, cur = B.rounds[B.r], i = cur.findIndex(x => x.w == null);
  H.dvotes = {}; H.shown = 0; H.order = []; B.seq = (B.seq || 0) + 1;
  if(i >= 0){ B.m = i; return "duel"; }
  const ws = cur.map(x => x.w);
  if(ws.length === 1) return "champion";
  const nx = [];
  for(let j = 0; j < ws.length; j += 2) nx.push({ a: ws[j], b: ws[j + 1], w: null });
  B.rounds.push(nx); B.r++; B.m = 0; return "bintro";
}
function chooseH(side){
  const B = H.bat, x = curDuel();
  x.w = side === "a" ? x.a : x.b; x.score = countSides();
  B.hist.push([B.r, B.m]);
  H.phase = seekH();
  saveH(); broadcast(); renderHost();
  H.phase === "champion" ? sfx.fanfare() : H.phase === "bintro" ? sfx.reveal() : sfx.swipe();
}
function undoH(){
  const B = H.bat, h = B.hist.pop(); if(!h) return;
  const [r, m] = h;
  B.rounds.length = r + 1; delete B.rounds[r][m].score; B.rounds[r][m].w = null;
  B.r = r; B.m = m; B.seq = (B.seq || 0) + 1; H.dvotes = {}; H.shown = 0; H.order = []; H.phase = "duel";
  saveH(); broadcast(); sfx.click(); renderHost();
}
// Votes révélés : dans l'ordre de H.order, seulement les H.shown premiers
function countSides(upTo){
  const ids = upTo == null ? Object.keys(H.dvotes) : H.order.slice(0, upTo);
  return { a: ids.filter(id => H.dvotes[id] === "a").length, b: ids.filter(id => H.dvotes[id] === "b").length };
}
function batPublic(){
  const B = H.bat, cur = B.rounds[B.r], o = { battle: true };
  if(H.phase === "bintro") o.bintro = { name: roundName(cur.length), duels: cur.filter(x => !x.bye).map(x => [x.a, x.b]), byes: cur.filter(x => x.bye).map(x => x.a) };
  if(H.phase === "duel" || H.phase === "dreveal"){
    const x = curDuel();
    o.duel = { key: duelKey(), a: x.a, b: x.b, round: roundName(cur.length), label: duelLabel() };
    o.voted = Object.keys(H.dvotes);
  }
  if(H.phase === "dreveal"){
    o.shown = H.order.slice(0, H.shown).map(id => ({ name: playerName(id), side: H.dvotes[id] }));
    o.total = H.order.length; o.score = countSides(H.shown);
  }
  if(H.phase === "champion"){ const f = B.rounds[B.r][0]; o.champ = f.w; o.runner = f.w === f.a ? f.b : f.a; }
  return o;
}
const undoLink = () => H.bat.hist.length ? `<button class="link" id="undo">Annuler le dernier duel</button>` : "";
function bindBatLinks(){ const u = $("#undo"); if(u) u.onclick = () => askConfirm("Annuler le résultat du dernier duel ? Il sera rejoué.", undoH, "Annuler le duel"); const c = $("#close"); if(c) c.onclick = closeRoom; }

function hostBatIntro(){
  const B = H.bat, cur = B.rounds[B.r], name = roundName(cur.length);
  const duels = cur.filter(x => !x.bye), byes = cur.filter(x => x.bye);
  app.innerHTML = `<section class="screen">
    <p class="meta">Battle, tour ${B.r + 1} sur ${Math.log2(B.rounds[0].length) + 1}</p>
    <h1 class="title">${name.replace(" ", "<br>")}</h1>
    <p class="lead">${cur.length === 1 ? "Plus que deux. Un seul repartira avec la couronne." : `${duels.length} duel${duels.length > 1 ? "s" : ""} au programme. À chaque duel, chacun vote sur son téléphone.`}</p>
    <ol class="mlist">${duels.map(x => `<li><span>${esc(x.a)}</span><b>VS</b><span>${esc(x.b)}</span></li>`).join("")}</ol>
    ${byes.length ? `<p class="hint">Qualifié${byes.length > 1 ? "s" : ""} d'office pour le tour suivant : ${byes.map(x => esc(x.a)).join(", ")}.</p>` : ""}
    <button class="btn main" id="go">${cur.length === 1 ? "Lancer la finale" : "Lancer le premier duel"}</button>
    ${undoLink()}
    <button class="link" id="close">Fermer la salle</button>
  </section>`;
  $("#go").onclick = () => { H.phase = "duel"; saveH(); broadcast(); sfx.swipe(); renderHost(); };
  bindBatLinks();
}
const fighterH = (name, side, extra = "") => `<div class="fighter ${extra}" data-side="${side}">
  <span class="f-mono" aria-hidden="true">${esc([...name][0] || "?")}</span>
  <span class="f-name">${esc(name)}</span></div>`;

function hostDuel(){
  const x = curDuel(), nV = Object.keys(H.dvotes).length, N = H.players.length, all = N > 0 && H.players.every(p => H.dvotes[p.id]);
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${roundName(H.bat.rounds[H.bat.r].length)}</span><span>${duelLabel()}</span></header>
    <div class="duel">${fighterH(x.a, "a")}<span class="vs" aria-hidden="true">VS</span>${fighterH(x.b, "b")}</div>
    <p class="lead center">${all ? "Tout le monde a voté." : `Votez sur vos téléphones. ${nV} vote${nV > 1 ? "s" : ""} sur ${N}.`}</p>
    <ul class="roster">${H.players.map(p => `<li class="${H.dvotes[p.id] ? "" : "off"}"><span class="dot" aria-hidden="true"></span>${esc(p.name)}${H.dvotes[p.id] ? " ✓" : ""}</li>`).join("")}</ul>
    <button class="btn main" id="go" ${all ? "" : "disabled"}>Révéler les votes</button>
    ${!all && nV ? `<button class="link" id="force">Révéler sans attendre les retardataires</button>` : ""}
    ${undoLink()}
    <button class="link" id="close">Fermer la salle</button>
  </section>`;
  const go = () => { H.order = shuffle(Object.keys(H.dvotes).filter(id => H.players.some(p => p.id === id))); H.shown = 0; H.phase = "dreveal"; saveH(); broadcast(); sfx.reveal(); renderHost(); };
  $("#go").onclick = go;
  const f = $("#force"); if(f) f.onclick = () => askConfirm("Révéler maintenant ? Ceux qui n'ont pas voté ne compteront pas pour ce duel.", go, "Révéler");
  bindBatLinks();
}

function hostDuelReveal(){
  const x = curDuel(), tot = H.order.length, done = H.shown >= tot, sc = countSides(H.shown);
  const lead = sc.a > sc.b ? "a" : sc.b > sc.a ? "b" : null;
  const last = H.shown ? H.order[H.shown - 1] : null;
  const col = side => H.order.slice(0, H.shown).filter(id => H.dvotes[id] === side)
    .map(id => `<li class="${id === last ? "pop" : ""}">${esc(playerName(id))}</li>`).join("") || `<li class="none">Personne</li>`;
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${roundName(H.bat.rounds[H.bat.r].length)}</span><span>${duelLabel()}</span></header>
    <div class="duel">${fighterH(x.a, "a", (done && lead === "a" ? "win" : done && lead === "b" ? "lose" : "") + (lead === "a" && !done ? " hot" : ""))}
      <span class="vs" aria-hidden="true">${sc.a}-${sc.b}</span>
      ${fighterH(x.b, "b", (done && lead === "b" ? "win" : done && lead === "a" ? "lose" : "") + (lead === "b" && !done ? " hot" : ""))}</div>
    ${last ? `<p class="big-reveal" aria-live="polite"><strong>${esc(playerName(last))}</strong> a voté <strong>${esc(H.dvotes[last] === "a" ? x.a : x.b)}</strong></p>` : `<p class="hint center">${tot} vote${tot > 1 ? "s" : ""} à révéler, un par un.</p>`}
    <div class="who"><div class="y"><h3>${esc(x.a)}</h3><ul>${col("a")}</ul></div><div class="n"><h3>${esc(x.b)}</h3><ul>${col("b")}</ul></div></div>
    ${!done ? `<button class="btn main" id="next">${H.shown ? "Vote suivant" : "Révéler le premier vote"}</button>
      <button class="link" id="all">Tout révéler d'un coup</button>`
    : lead ? `<p class="lead center"><strong>${esc(lead === "a" ? x.a : x.b)}</strong> gagne ${Math.max(sc.a, sc.b)} à ${Math.min(sc.a, sc.b)}.</p>
      <button class="btn main" id="win">Qualifier ${esc(lead === "a" ? x.a : x.b)}</button>`
    : `<p class="lead center">Égalité ${sc.a} partout. Débattez, puis choisissez, ou laissez le hasard décider.</p>
      <div class="vote2"><button class="btn ghost" data-pick="a">${esc(x.a)}</button><button class="btn ghost" data-pick="b">${esc(x.b)}</button></div>
      <button class="btn ghost" id="coin">Pile ou face</button>`}
    ${undoLink()}
    <button class="link" id="close">Fermer la salle</button>
  </section>`;
  const nx = $("#next"); if(nx) nx.onclick = () => { H.shown++; saveH(); broadcast(); H.dvotes[H.order[H.shown - 1]] === "a" ? sfx.mafia() : sfx.clean(); renderHost(); };
  const al = $("#all"); if(al) al.onclick = () => { H.shown = tot; saveH(); broadcast(); sfx.reveal(); renderHost(); };
  const w = $("#win"); if(w) w.onclick = () => chooseH(lead);
  $$("[data-pick]").forEach(b => b.onclick = () => chooseH(b.dataset.pick));
  const coin = $("#coin");
  if(coin) coin.onclick = () => {
    coin.disabled = true;
    const side = Math.random() < .5 ? "a" : "b", fa = $('[data-side="a"]'), fb = $('[data-side="b"]');
    if(reduce()){ chooseH(side); return; }
    let t = 0, d = 70, i = 0; const steps = [];
    while(t < 1600){ steps.push([t, i % 2 ? "b" : "a"]); t += d; d *= 1.15; i++; }
    if(steps[steps.length - 1][1] !== side) steps.push([t, side]);
    steps.forEach(([at, sd]) => setTimeout(() => { fa.classList.toggle("hot", sd === "a"); fb.classList.toggle("hot", sd === "b"); sfx.click(); }, at));
    setTimeout(() => chooseH(side), steps[steps.length - 1][0] + 600);
  };
  bindBatLinks();
}

function hostChampion(){
  const B = H.bat, fin = B.rounds[B.r][0], champ = fin.w, runner = fin.w === fin.a ? fin.b : fin.a;
  const sc = x => x.score ? ` <small>${x.score.a}-${x.score.b}</small>` : "";
  app.innerHTML = `<section class="screen">
    <div class="champ">
      <span class="crown" aria-hidden="true">♛</span>
      <p class="meta">Champion du tournoi</p>
      <h1 class="champ-name">${esc(champ)}</h1>
      <p class="hint">A battu ${esc(runner)} en finale${fin.score ? `, ${Math.max(fin.score.a, fin.score.b)} votes à ${Math.min(fin.score.a, fin.score.b)}` : ""}.</p>
    </div>
    <h2 class="h2">Le tableau</h2>
    <div class="bracket">${B.rounds.map(rd => `<section><h3>${roundName(rd.length)}</h3><ul>${rd.map(x => x.bye
        ? `<li><span class="w">${esc(x.a)}</span><span class="q">qualifié d'office</span></li>`
        : `<li><span class="${x.w === x.a ? "w" : "l"}">${esc(x.a)}</span><b>VS</b><span class="${x.w === x.b ? "w" : "l"}">${esc(x.b)}</span>${sc(x)}</li>`).join("")}</ul></section>`).join("")}</div>
    <button class="btn main" id="again">Nouveau tournoi avec les mêmes joueurs</button>
    <button class="btn ghost" id="mode">Changer de mode</button>
    ${undoLink()}
    <button class="link" id="close">Fermer la salle</button>
  </section>`;
  $("#again").onclick = startBattleH;
  $("#mode").onclick = () => { H.phase = "lobby"; H.bat = null; saveH(); broadcast(); hostEditing = true; hostSetupInRoom(); };
  bindBatLinks();
}

/* =========================================================
   JOUEUR
   ========================================================= */
const P = { id: null, code: "", name: "", st: null, votes: [], sig: "", hostOnline: false, msg: "", waited: false, dv: null };
{ const me = read(ME_KEY); P.id = (me && me.id) || newId(); }
const saveMe = () => write(ME_KEY, { id: P.id, code: P.code, name: P.name });
const sigOf = cards => (cards || []).join("|");
let waitTimer = null;

function renderJoin(){
  app.innerHTML = `<section class="screen">
    <h1 class="title">Rejoindre<br>la salle</h1>
    ${P.msg ? `<p class="error-box">${esc(P.msg)}</p>` : ""}
    <form id="f" class="screen" novalidate>
      <label class="h2" for="code">Code de la salle</label>
      <input class="field code-in" id="code" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="4" placeholder="ABCD" value="${esc(P.code)}">
      <label class="h2" for="name">Ton prénom</label>
      <input class="field" id="name" maxlength="24" autocomplete="given-name" placeholder="Prénom" value="${esc(P.name)}">
      <button class="btn main" id="go" type="submit">Rejoindre</button>
    </form>
    <button class="link" id="back">Retour</button>
  </section>`;
  const code = $("#code"), name = $("#name"), go = $("#go");
  const check = () => { go.disabled = !(cleanCode(code.value).length === 4 && name.value.trim()); };
  code.oninput = () => { code.value = cleanCode(code.value); check(); };
  name.oninput = check; check();
  (P.code.length === 4 ? name : code).focus();
  $("#f").onsubmit = e => { e.preventDefault(); if(go.disabled) return; P.code = cleanCode(code.value); P.name = name.value.trim(); P.msg = ""; joinRoom(); };
  $("#back").onclick = () => { history.replaceState(null, "", location.pathname); renderStart(); };
}

function joinRoom(){
  role = "player"; saveMe(); P.st = null; P.waited = false;
  history.replaceState(null, "", location.pathname + "?salle=" + P.code);
  renderPlayer();
  const ok = connect(P.code, P.id, { role: "player", name: P.name }, onPlayerMsg, ps => {
    P.hostOnline = !!ps.host; renderPlayer();
  }, () => send({ t: "hello", id: P.id, name: P.name }));
  if(!ok){ P.msg = "Connexion impossible. Vérifie ta connexion internet, puis réessaie."; renderJoin(); return; }
  clearTimeout(waitTimer);
  waitTimer = setTimeout(() => { P.waited = true; if(!P.st) renderPlayer(); }, 6000);
}
function leaveRoom(msg){
  disconnect(); clearTimeout(waitTimer);
  P.st = null; P.votes = []; P.sig = ""; P.msg = msg || "";
  write(ME_KEY, { id: P.id, name: P.name });
  renderJoin();
}
function onPlayerMsg(m){
  if(m.to && m.to !== P.id) return;
  if(m.t === "state"){
    const first = !P.st;
    P.st = m;
    if(m.phase === "vote"){ const s = sigOf(m.cards); if(s !== P.sig){ P.sig = s; P.votes = []; } }
    if(m.duel && (!P.dv || P.dv.key !== m.duel.key)) P.dv = { key: m.duel.key, side: null };
    if(first) sfx.join();
    renderPlayer(); return;
  }
  if(m.t === "resume"){
    if(P.st && P.st.phase === "vote" && P.sig === sigOf(P.st.cards)) P.votes = (m.votes || []).slice(0, P.st.cards.length);
    if(P.st && P.st.duel && m.dvote) P.dv = { key: P.st.duel.key, side: m.dvote };
    renderPlayer(); return;
  }
  if(m.t === "kick"){ leaveRoom("L'hôte t'a retiré de la salle."); return; }
  if(m.t === "closed"){ leaveRoom("La salle a été fermée par l'hôte."); }
}

let lastPlayerKey = null;
function renderPlayer(){
  const st = P.st;
  if(!st || !st.phase) playerWaiting();
  else if(st.phase === "lobby") playerLobby();
  else if(st.phase === "vote") (P.votes.length < (st.cards || []).length ? playerSwipe() : playerDone());
  else if(st.phase === "reveal") playerReveal();
  else if(st.phase === "bintro") playerBatIntro();
  else if(st.phase === "duel") (P.dv && P.dv.side ? playerDuelDone() : playerDuel());
  else if(st.phase === "dreveal") playerDuelReveal();
  else if(st.phase === "champion") playerChampion();
  else playerEnd();
  const k = (st ? st.phase : "") + P.votes.length + (st && st.reveal ? st.reveal.i : "") + (st && st.duel ? st.duel.key : "") + (P.dv && P.dv.side ? "v" : "");
  if(k !== lastPlayerKey){ window.scrollTo(0, 0); lastPlayerKey = k; }
}
const leaveLink = `<button class="link" id="leave">Quitter la salle</button>`;
function bindLeave(){ const l = $("#leave"); if(l) l.onclick = () => askConfirm("Quitter la salle ?", () => { send({ t: "leave", id: P.id }); leaveRoom(); }, "Quitter"); }

function playerWaiting(){
  const late = P.waited && conn === "on" && !P.hostOnline;
  app.innerHTML = `<section class="screen handoff">
    <div class="wait"><span class="pulse" aria-hidden="true"></span>
      <p class="meta">Salle ${esc(P.code)}</p>
      <h1 class="big">${conn === "error" ? "Hors ligne" : "Connexion"}</h1>
      <p class="hint">${conn === "error" ? "Impossible de joindre la salle. Vérifie ta connexion internet." : late ? "Aucun écran hôte trouvé avec ce code. Vérifie le code affiché sur l'écran." : "Connexion à la salle…"}</p></div>
    ${late || conn === "error" ? `<button class="btn main" id="retry">Changer de code</button>` : ""}
    ${leaveLink}
  </section>`;
  const r = $("#retry"); if(r) r.onclick = () => leaveRoom();
  bindLeave();
}
function rosterP(){
  const st = P.st;
  return st.players.map(p => `<li class="${p.id === P.id ? "me" : ""}"><span class="dot" aria-hidden="true"></span>${esc(p.name)}</li>`).join("");
}
function playerLobby(){
  app.innerHTML = `<section class="screen handoff">
    <div class="wait"><span class="pulse" aria-hidden="true"></span>
      <p class="meta">Salle ${esc(P.code)}</p>
      <h1 class="big">${esc(P.name)}</h1>
      <p class="hint">Tu es dans la salle. La partie commence dès que l'hôte la lance.</p></div>
    <ul class="roster">${rosterP()}</ul>
    ${leaveLink}
  </section>`;
  bindLeave();
}

function playerSwipe(){
  const st = P.st, cards = st.cards, i = P.votes.length, n = cards.length, mode = st.mode;
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${esc(P.name)}</span><span>${MODES[mode].card} ${i + 1} sur ${n}</span></header>
    <div class="deck">
      ${i + 2 < n ? cardFace(mode, cards[i + 2], i + 2, "back2") : ""}
      ${i + 1 < n ? cardFace(mode, cards[i + 1], i + 1, "back") : ""}
      ${cardFace(mode, cards[i], i, "top")}
    </div>
    <div class="choices">
      <button class="choice no" id="no">Pas mafia<small>ou glisse à gauche</small></button>
      <button class="choice yes" id="yes">Mafia<small>ou glisse à droite</small></button>
    </div>
    ${i > 0 ? `<button class="undo-btn" id="undo"><span aria-hidden="true">↶</span> Revenir à la carte précédente<small>Tu avais mis : ${P.votes[i - 1] ? "Mafia" : "Pas mafia"}</small></button>` : ""}
  </section>`;
  const card = $("#top"), sy = card.querySelector(".stamp.yes"), sn = card.querySelector(".stamp.no");
  let start = null, dx = 0, done = false;
  const paint = () => {
    card.style.transform = `translateX(${dx}px) rotate(${dx / 16}deg)`;
    sy.style.opacity = Math.max(0, Math.min(1, dx / 90));
    sn.style.opacity = Math.max(0, Math.min(1, -dx / 90));
  };
  const fly = mafia => {
    if(done) return; done = true;
    mafia ? sfx.mafia() : sfx.clean();
    P.votes.push(mafia);
    send({ t: "vote", id: P.id, i, v: mafia });
    if(reduce()){ renderPlayer(); return; }
    card.style.transition = "transform .35s ease-in";
    dx = (mafia ? 1 : -1) * window.innerWidth * 1.2; paint();
    setTimeout(renderPlayer, 330);
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
  const u = $("#undo"); if(u) u.onclick = () => { if(!done) undoMine(); };
  card.focus({ preventScroll: true });
}
function undoMine(){
  if(!P.votes.length) return;
  P.votes.pop(); send({ t: "undo", id: P.id, i: P.votes.length });
  sfx.click(); renderPlayer();
}
function playerDone(){
  const st = P.st, ids = st.players.map(p => p.id), done = ids.filter(id => (st.progress[id] || 0) >= st.total).length;
  app.innerHTML = `<section class="screen handoff">
    <div class="wait"><span class="pulse" aria-hidden="true"></span>
      <p class="meta">Salle ${esc(P.code)}</p>
      <h1 class="big">Votes<br>envoyés</h1>
      <p class="hint">${done} sur ${ids.length} ont fini. Regarde l'écran hôte pour la révélation.</p></div>
    <button class="undo-btn" id="undo"><span aria-hidden="true">↶</span> Revenir à ma dernière carte<small>Tu avais mis : ${P.votes[P.votes.length - 1] ? "Mafia" : "Pas mafia"}</small></button>
    ${leaveLink}
  </section>`;
  $("#undo").onclick = undoMine;
  bindLeave();
}
function playerReveal(){
  const r = P.st.reveal || {}, y = r.y || [], n = r.n || [], [cls, word] = verdictWord(y.length, n.length);
  const mine = y.includes(P.name) ? ["y", "Mafia"] : n.includes(P.name) ? ["n", "Pas mafia"] : null;
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">Regarde l'écran hôte</p>
    <article class="verdict ${P.st.mode === "dan" ? "dancer" : ""}">
      <span class="c-head"><span>${MODES[P.st.mode].card}</span><span class="c-file">N° ${pad((r.i || 0) + 1)}</span></span>
      <span class="${P.st.mode === "dan" ? "c-name" : "c-text"}">${esc(r.text || "")}</span>
      <p class="big-verdict ${cls}">${word}</p>
    </article>
    ${mine ? `<p>Tu as voté <span class="mine ${mine[0]}">${mine[1]}</span></p>` : ""}
    ${leaveLink}
  </section>`;
  bindLeave();
}
// Mode Battle, côté joueur
function playerBatIntro(){
  const b = P.st.bintro || { duels: [], byes: [] };
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">Regarde l'écran hôte</p>
    <h1 class="big">${esc(b.name || "Battle")}</h1>
    <ol class="mlist">${b.duels.map(([a, c]) => `<li><span>${esc(a)}</span><b>VS</b><span>${esc(c)}</span></li>`).join("")}</ol>
    ${b.byes.length ? `<p class="hint">Qualifié${b.byes.length > 1 ? "s" : ""} d'office : ${b.byes.map(esc).join(", ")}.</p>` : ""}
    <p class="hint">Le premier duel arrive sur ton téléphone dès que l'hôte le lance.</p>
    ${leaveLink}
  </section>`;
  bindLeave();
}
function sendDuelVote(side){
  P.dv = { key: P.st.duel.key, side };
  send({ t: "dvote", id: P.id, key: P.st.duel.key, side });
}
function playerDuel(){
  const d = P.st.duel;
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${esc(d.round)}</span><span>${esc(d.label)}</span></header>
    <div class="duel">
      <button class="fighter" data-side="a" aria-label="Voter pour ${esc(d.a)}"><span class="f-mono" aria-hidden="true">${esc([...d.a][0] || "?")}</span><span class="f-name">${esc(d.a)}<small>Touche pour voter</small></span></button>
      <span class="vs" aria-hidden="true">VS</span>
      <button class="fighter" data-side="b" aria-label="Voter pour ${esc(d.b)}"><span class="f-mono" aria-hidden="true">${esc([...d.b][0] || "?")}</span><span class="f-name">${esc(d.b)}<small>Touche pour voter</small></span></button>
    </div>
    <p class="hint center">Ton vote reste secret jusqu'à la révélation sur l'écran hôte.</p>
    ${leaveLink}
  </section>`;
  let busy = false;
  $$("[data-side]").forEach(b => b.onclick = () => {
    if(busy) return; busy = true;
    const side = b.dataset.side;
    b.classList.add("win"); $(`[data-side="${side === "a" ? "b" : "a"}"]`).classList.add("lose");
    sfx.swipe(); sendDuelVote(side);
    reduce() ? renderPlayer() : setTimeout(renderPlayer, 450);
  });
  bindLeave();
}
function playerDuelDone(){
  const d = P.st.duel, n = (P.st.voted || []).length, N = P.st.players.length;
  app.innerHTML = `<section class="screen handoff">
    <div class="wait"><span class="pulse" aria-hidden="true"></span>
      <p class="meta">${esc(d.label)}</p>
      <h1 class="big">Vote<br>envoyé</h1>
      <p>Tu as voté <span class="mine y">${esc(P.dv.side === "a" ? d.a : d.b)}</span></p>
      <p class="hint">${n} sur ${N} ont voté. Regarde l'écran hôte pour la révélation.</p></div>
    <button class="undo-btn" id="change"><span aria-hidden="true">↶</span> Changer mon vote</button>
    ${leaveLink}
  </section>`;
  $("#change").onclick = () => { P.dv.side = null; send({ t: "dvote", id: P.id, key: d.key, side: null }); sfx.click(); renderPlayer(); };
  bindLeave();
}
function playerDuelReveal(){
  const st = P.st, d = st.duel, sc = st.score || { a: 0, b: 0 }, shown = st.shown || [];
  const mine = P.dv && P.dv.key === d.key && P.dv.side ? (P.dv.side === "a" ? d.a : d.b) : null;
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">Regarde l'écran hôte</p>
    <h1 class="big">${esc(d.a)}<br><span class="score-line">${sc.a} - ${sc.b}</span><br>${esc(d.b)}</h1>
    <p class="hint">${shown.length} vote${shown.length > 1 ? "s" : ""} révélé${shown.length > 1 ? "s" : ""} sur ${st.total || 0}.</p>
    ${mine ? `<p>Tu as voté <span class="mine y">${esc(mine)}</span></p>` : ""}
    ${leaveLink}
  </section>`;
  bindLeave();
}
function playerChampion(){
  app.innerHTML = `<section class="screen handoff">
    <div class="champ"><span class="crown" aria-hidden="true">♛</span><p class="meta">Champion du tournoi</p>
      <h1 class="champ-name">${esc(P.st.champ || "")}</h1><p class="hint">A battu ${esc(P.st.runner || "")} en finale.</p></div>
    <p class="hint">Si l'hôte relance un tournoi, il s'affichera ici tout seul.</p>
    ${leaveLink}
  </section>`;
  bindLeave();
}
function playerEnd(){
  app.innerHTML = `<section class="screen handoff">
    <div class="wait"><p class="meta">Salle ${esc(P.code)}</p>
      <h1 class="big">Les<br>titres</h1>
      <p class="hint">Regarde l'écran hôte. Si l'hôte relance une partie, elle s'affichera ici toute seule.</p></div>
    ${leaveLink}
  </section>`;
  bindLeave();
}

boot();
