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
  dan: { label: "Danseurs", card: "Danseur", many: "danseurs" }
};

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
  $("#asHost").onclick = () => { role = "host"; H = { phase: "setup", mode: "sit", size: 10, players: [], votes: {}, cards: [] }; renderHost(); };
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
    send({ t: "resume", to: m.id, votes: H.votes[m.id] || [] });
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
  if(m.t === "leave"){
    H.players = H.players.filter(p => p.id !== m.id); delete H.votes[m.id];
    saveH(); broadcast(); renderHost();
  }
}

let lastHostKey = null, hostEditing = false;
function renderHost(){
  if(hostEditing) return hostSetupInRoom();
  ({ setup: hostSetup, lobby: hostLobby, vote: hostVote, reveal: hostReveal, end: hostEnd })[H.phase]();
  const k = H.phase + (H.revealIdx || 0);
  if(k !== lastHostKey){ window.scrollTo(0, 0); lastHostKey = k; }
}

function hostSetup(){
  const L = lists();
  app.innerHTML = `<section class="screen">
    <button class="btn ghost" id="back">Retour</button>
    <h1 class="title">Créer<br>la salle</h1>
    <h2 class="h2">Mode de jeu</h2>
    <div class="seg two" role="group" aria-label="Mode de jeu">${Object.entries(MODES).map(([k, md]) =>
      `<button data-mode="${k}" aria-pressed="${H.mode === k}">${md.label}<br><small>${L[k].length} ${md.many}</small></button>`).join("")}</div>
    <h2 class="h2">Cartes par partie</h2>
    <div class="seg" role="group" aria-label="Nombre de cartes">${[[6, "Rapide"], [10, "Normal"], [0, "Toutes"]].map(([k, l]) =>
      `<button data-size="${k}" aria-pressed="${H.size === k}">${l}<br><small>${k || L[H.mode].length} cartes</small></button>`).join("")}</div>
    <p class="hint">Les cartes viennent des listes de « Préparer » du jeu sur ce téléphone ou cet ordi. Si tu ne les as jamais modifiées, ce sont les listes de départ.</p>
    ${CFG.supabaseUrl ? "" : `<p class="error-box">La connexion n'est pas configurée : le fichier config.js est introuvable.</p>`}
    <button class="btn main" id="create" ${L[H.mode].length ? "" : "disabled"}>Créer la salle</button>
  </section>`;
  $("#back").onclick = renderStart;
  $$("[data-mode]").forEach(b => b.onclick = () => { H.mode = b.dataset.mode; sfx.click(); hostSetup(); });
  $$("[data-size]").forEach(b => b.onclick = () => { H.size = +b.dataset.size; sfx.click(); hostSetup(); });
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
    <p class="meta">${MODES[H.mode].label}, ${H.size || L[H.mode].length} cartes</p>
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
    <h2 class="h2">Mode de jeu</h2>
    <div class="seg two" role="group" aria-label="Mode de jeu">${Object.entries(MODES).map(([k, md]) =>
      `<button data-mode="${k}" aria-pressed="${H.mode === k}">${md.label}<br><small>${L[k].length} ${md.many}</small></button>`).join("")}</div>
    <h2 class="h2">Cartes par partie</h2>
    <div class="seg" role="group" aria-label="Nombre de cartes">${[[6, "Rapide"], [10, "Normal"], [0, "Toutes"]].map(([k, l]) =>
      `<button data-size="${k}" aria-pressed="${H.size === k}">${l}<br><small>${k || L[H.mode].length} cartes</small></button>`).join("")}</div>
    <button class="btn main" id="ok">Retour à la salle</button>
  </section>`;
  $$("[data-mode]").forEach(b => b.onclick = () => { H.mode = b.dataset.mode; saveH(); sfx.click(); hostSetupInRoom(); });
  $$("[data-size]").forEach(b => b.onclick = () => { H.size = +b.dataset.size; saveH(); sfx.click(); hostSetupInRoom(); });
  $("#ok").onclick = () => { hostEditing = false; saveH(); broadcast(); renderHost(); };
}

/* =========================================================
   JOUEUR
   ========================================================= */
const P = { id: null, code: "", name: "", st: null, votes: [], sig: "", hostOnline: false, msg: "", waited: false };
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
    if(first) sfx.join();
    renderPlayer(); return;
  }
  if(m.t === "resume"){
    if(P.st && P.st.phase === "vote" && P.sig === sigOf(P.st.cards)) P.votes = (m.votes || []).slice(0, P.st.cards.length);
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
  else playerEnd();
  const k = (st ? st.phase : "") + P.votes.length + (st && st.reveal ? st.reveal.i : "");
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
