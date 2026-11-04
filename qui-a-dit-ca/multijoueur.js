/* =========================================================
   Qui a dit ça ?, en ligne : chacun répond sur son téléphone, le plus rapide marque le plus
   - L'écran hôte crée la salle, affiche la question et révèle la réponse.
   - Les joueurs touchent leur réponse sur leur téléphone. Une seule réponse, pas de retour en arrière.
   - Les points dépendent de l'ordre d'arrivée des bonnes réponses (heure de réception sur l'écran hôte).
   - Questions et outils viennent de script.js (chargé en mode bibliothèque, window.QUI_LIB).
   ========================================================= */
(() => {
const CFG = window.EVG_CONFIG || {};
const HOST_KEY = "qui-multi-host", ME_KEY = "qui-multi-me";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
// Points des bonnes réponses, dans l'ordre d'arrivée : 1er, 2e, puis tous les suivants
const SPEED_POINTS = [3, 2, 1];
const FIRST_BONUS = 1;        // « Qui est-ce ? » : bonus pour le premier qui trouve
const MAX_CHOICES = 10;       // réponses proposées sur les téléphones
// Danseurs pour compléter les choix du mode « Qui est-ce ? » (liste de Mafia ou pas mafia)
const DECOYS = (window.MAFIA_DATA && window.MAFIA_DATA.dancers) || [];

/* ---------- Outils ---------- */
const q = s => app.querySelector(s), qa = s => app.querySelectorAll(s);
const read = k => { try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
const write = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
const newId = () => Math.random().toString(36).slice(2, 10);
const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const cleanCode = s => String(s || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
const secs = ms => (Math.max(0, +ms || 0) / 1000).toFixed(1).replace(".", ",") + " s";
const clueList = text => String(text || "").split(/\n+/).map(t => t.trim()).filter(Boolean);
const keepFocus = draw => {
  const a = document.activeElement, id = a && a.tagName === "INPUT" && a.id && app.contains(a) ? a.id : null;
  const v = id ? a.value : "", s = id ? a.selectionStart : 0, e = id ? a.selectionEnd : 0;
  draw();
  const b = id ? document.getElementById(id) : null;
  if(b && b !== a){ b.value = v; b.focus({ preventScroll: true }); b.setSelectionRange(s, e); }
};

/* ---------- Connexion temps réel (Supabase Realtime) ---------- */
let sb = null, channel = null, conn = "off";
const connPill = document.createElement("div");
connPill.className = "conn"; connPill.setAttribute("role", "status");
document.body.appendChild(connPill);
function paintConn(){
  connPill.className = "conn " + conn;
  connPill.innerHTML = `<i aria-hidden="true"></i>${{ on: "En ligne", connecting: "Connexion…", error: "Hors ligne", off: "" }[conn]}`;
  connPill.hidden = conn === "off";
}
paintConn();
function client(){
  if(sb) return sb;
  if(!window.supabase || !CFG.supabaseUrl) throw new Error("supabase");
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 20 } } });
  return sb;
}
function connect(code, key, meta, onMsg, onPresence, onUp){
  let c;
  try{ c = client(); }catch(e){ conn = "error"; paintConn(); return false; }
  if(channel) c.removeChannel(channel);
  conn = "connecting"; paintConn();
  channel = c.channel("qui-" + code, { config: { broadcast: { self: false }, presence: { key } } });
  channel.on("broadcast", { event: "msg" }, ({ payload }) => onMsg(payload || {}));
  channel.on("presence", { event: "sync" }, () => onPresence(channel.presenceState()));
  channel.subscribe(async status => {
    if(status === "SUBSCRIBED"){ conn = "on"; paintConn(); try{ await channel.track(meta); }catch(e){} onUp(); }
    else if(status === "CHANNEL_ERROR" || status === "TIMED_OUT"){ conn = "error"; paintConn(); }
  });
  return true;
}
const send = payload => { if(channel) channel.send({ type: "broadcast", event: "msg", payload }); if(role === "host") deliverLocal(payload); };
function disconnect(){ if(channel && sb) sb.removeChannel(channel); channel = null; conn = "off"; paintConn(); }

/* ---------- Démarrage ---------- */
const params = new URLSearchParams(location.search);
let role = null;
function boot(){
  const h = read(HOST_KEY), me = read(ME_KEY), code = cleanCode(params.get("salle"));
  if(code){ role = "player"; P.code = code; P.name = (me && me.name) || ""; if(me && me.code === code && me.name){ joinRoom(); return; } renderJoin(); return; }
  if(h && h.phase && h.phase !== "setup"){ role = "host"; H = h; if(H.me){ P.id = H.me.id; P.code = H.code; P.name = H.me.name; } connectHost(); renderHost(); return; }
  if(me && me.code && me.name){ role = "player"; Object.assign(P, { code: me.code, name: me.name }); joinRoom(); return; }
  renderStart();
}
function renderStart(){
  role = null;
  app.innerHTML = `<section class="screen">
    <h1 class="title">Qui a dit ça ?<br>en ligne</h1>
    <p class="lead">L'écran hôte affiche la question, chacun touche sa réponse sur son téléphone. Le plus rapide à trouver marque le plus de points.</p>
    <div class="roles">
      <button class="role main" id="asHost"><b>Créer une salle</b><span>Sur l'écran que tout le monde regarde : la télé, un ordi ou un téléphone posé au milieu.</span></button>
      <button class="role" id="asPlayer"><b>Rejoindre une salle</b><span>Sur ton téléphone, avec le code affiché sur l'écran hôte.</span></button>
    </div>
    <a class="link" href="index.html">Jouer sur un seul téléphone</a>
  </section>`;
  q("#asHost").onclick = () => { role = "host"; H = { phase: "setup", mode: "dit", players: [] }; renderHost(); };
  q("#asPlayer").onclick = () => { role = "player"; P.code = ""; renderJoin(); };
}

/* =========================================================
   HÔTE
   ========================================================= */
let H = null, online = new Set(), lastHostKey = null;
const saveH = () => write(HOST_KEY, H);
const pName = id => (H.players.find(p => p.id === id) || {}).name || "?";
const curQ = () => H.order[H.idx];
// Le joueur de la salle qui est la réponse (il ne répond pas à sa propre question)
const culpritId = qq => { const p = H.players.find(x => same(x.name, qq.answer)); return p ? p.id : null; };
const canAnswer = id => H.phase === "question" && id !== culpritId(curQ());
const eligible = () => H.players.filter(p => p.id !== culpritId(curQ()));
const allIn = () => eligible().length > 0 && eligible().every(p => H.ans[p.id]);
const cluePts = (qq, clue) => { const n = clueList(qq.text).length; return Math.max(1, n - Math.min(clue || 1, n) + 1); };

// Réponses proposées : la bonne, et d'autres noms plausibles
function choicesFor(qq){
  const others = new Set(), add = n => { n = String(n || "").trim(); if(n && !same(n, qq.answer) && ![...others].some(o => same(o, n))) others.add(n); };
  if(qq.type === "qui"){
    playable("qui").forEach(x => add(x.answer));
    shuffle(DECOYS).forEach(add);
  } else {
    H.players.forEach(p => add(p.name));
    store.players.forEach(add);
    playable("dit").forEach(x => add(x.answer));
  }
  return shuffle([qq.answer, ...shuffle([...others]).slice(0, MAX_CHOICES - 1)]);
}
function startQuestion(){
  H.clue = 1; H.ans = {}; H.gained = null; H.qStart = Date.now();
  H.choices = choicesFor(curQ()); H.phase = "question";
}
// Bonnes réponses dans l'ordre d'arrivée, avec leurs points
function results(){
  const qq = curQ(), cul = culpritId(qq);
  const list = Object.entries(H.ans).filter(([id]) => H.players.some(p => p.id === id))
    .map(([id, a]) => ({ id, name: pName(id), choice: a.choice, t: a.t, clue: a.clue, ok: same(a.choice, qq.answer) }))
    .sort((a, b) => a.t - b.t);
  let rank = 0;
  list.forEach(x => {
    if(!x.ok){ x.pts = 0; return; }
    x.pts = qq.type === "qui" ? cluePts(qq, x.clue) + (rank === 0 ? FIRST_BONUS : 0) : SPEED_POINTS[Math.min(rank, SPEED_POINTS.length - 1)];
    x.rank = ++rank;
  });
  const hidden = cul && !list.some(x => x.ok) ? POINTS_HIDDEN : 0;
  return { list, cul, hidden };
}
function reveal(){
  const r = results();
  H.gained = {};
  r.list.forEach(x => { if(x.pts){ H.scores[x.id] = (H.scores[x.id] || 0) + x.pts; H.gained[x.id] = x.pts; } });
  if(r.hidden){ H.scores[r.cul] = (H.scores[r.cul] || 0) + r.hidden; H.gained[r.cul] = r.hidden; }
  H.result = r; H.phase = "reveal";
  saveH(); broadcast(); sfx.reveal(); renderHost();
}
const ranking = () => H.players.map(p => ({ name: p.name, sc: H.scores[p.id] || 0 })).sort((a, b) => b.sc - a.sc);

// Ce que voient les joueurs : jamais la réponse avant la révélation, ni le choix des autres
function publicState(){
  const st = { t: "state", code: H.code, phase: H.phase, mode: H.mode, players: H.players.map(p => ({ id: p.id, name: p.name })) };
  if(["question", "reveal"].includes(H.phase)){
    const qq = curQ(), clues = clueList(qq.text);
    st.idx = H.idx; st.total = H.order.length;
    st.q = { type: qq.type, inRoom: !!culpritId(qq), culprit: H.phase === "question" ? culpritId(qq) : null,
      text: qq.type === "qui" ? null : qq.text, clues: qq.type === "qui" ? clues.slice(0, H.phase === "question" ? H.clue : clues.length) : null,
      nClues: clues.length, clue: H.clue, now: qq.type === "qui" ? cluePts(qq, H.clue) : SPEED_POINTS[0] };
    st.choices = H.choices; st.answered = Object.keys(H.ans);
  }
  if(H.phase === "reveal"){ const r = H.result; st.reveal = { answer: curQ().answer, list: r.list, hidden: r.hidden, culprit: r.cul ? pName(r.cul) : null }; }
  if(["reveal", "end"].includes(H.phase)) st.ranking = ranking();
  return st;
}
const broadcast = () => send(publicState());

function connectHost(){
  const ok = connect(H.code, "host", { role: "host" }, onHostMsg, ps => {
    online = new Set(Object.keys(ps).filter(k => k !== "host")); if(H && H.me) online.add(H.me.id);
    if(role === "host") renderHost();
  }, () => { broadcast(); if(H.me) onHostMsg({ t: "hello", id: H.me.id, name: H.me.name }); });
  if(!ok) renderHost();
}
function onHostMsg(m){
  // Les ids deviennent des clés d'objet : rien d'autre qu'un newId() (pas de « __proto__ »)
  if(!H || typeof m.id !== "string" || !/^[a-z0-9]{1,8}$/.test(m.id)) return;
  if(m.t === "hello"){
    const name = String(m.name || "").trim().slice(0, 24) || "Joueur";
    const p = H.players.find(x => x.id === m.id);
    if(p) p.name = name; else { H.players.push({ id: m.id, name }); if(H.scores) H.scores[m.id] = H.scores[m.id] || 0; sfx.point(); }
    saveH(); broadcast();
    send({ t: "resume", to: m.id, ans: H.ans && H.ans[m.id] ? H.ans[m.id] : null, idx: H.idx });
    renderHost(); return;
  }
  if(!H.players.some(p => p.id === m.id)) return;
  if(m.t === "ans" && canAnswer(m.id) && m.idx === H.idx && !H.ans[m.id] && typeof m.choice === "string" && H.choices.includes(m.choice)){
    H.ans[m.id] = { choice: m.choice, t: Date.now() - H.qStart, clue: H.clue };
    saveH(); broadcast(); renderHost(); sfx.click();
    if(allIn()) sfx.point();
    return;
  }
  if(m.t === "leave" && H.phase === "lobby"){ H.players = H.players.filter(p => p.id !== m.id); saveH(); broadcast(); renderHost(); }
}

function renderHost(){ keepFocus(() => {
  ({ setup: hostSetup, lobby: hostLobby, question: hostQuestion, reveal: hostReveal, end: hostEnd })[H.phase]();
  const k = H.phase + (H.idx || 0);
  if(k !== lastHostKey){ window.scrollTo(0, 0); lastHostKey = k; }
}); }
const closeLink = `<button class="link" id="close">Fermer la salle</button>`;
function bindClose(){ const c = q("#close"); if(c) c.onclick = () => askConfirm("Fermer la salle ? Les joueurs seront déconnectés.", () => { send({ t: "closed" }); disconnect(); H = null; write(HOST_KEY, null); renderStart(); }, "Fermer la salle"); }

function modesHTML(){
  return `<h2 class="h2">Mode de jeu</h2>
    ${Object.entries(MODES).map(([k, m]) => { const n = playable(k).length; return `<button class="mode-pick ${H.mode === k ? "on" : ""}" data-mode="${k}" aria-pressed="${H.mode === k}" ${n ? "" : "disabled"}>
      <b>${m.title}</b><span>${n} question${n > 1 ? "s" : ""}. ${k === "qui" ? "Des indices un par un : trouve tôt et avant les autres." : "Phrases cultes et anecdotes : le plus rapide à trouver marque 3 points, le 2e 2 points, les suivants 1."}</span></button>`; }).join("")}
    <p class="hint">Les questions viennent de « Préparer les questions » du jeu sur ce téléphone ou cet ordi.</p>`;
}
function bindModes(redraw){ qa("[data-mode]").forEach(b => b.onclick = () => { H.mode = b.dataset.mode; saveH(); sfx.click(); redraw(); }); }
function hostSetup(){
  if(!playable(H.mode).length) H.mode = playable("dit").length ? "dit" : "qui";
  app.innerHTML = `<section class="screen">
    <button class="btn ghost" id="back">Retour</button>
    <h1 class="title">Créer<br>la salle</h1>
    ${modesHTML()}
    ${CFG.supabaseUrl ? "" : `<p class="error-box">La connexion n'est pas configurée : le fichier config.js est introuvable.</p>`}
    <button class="btn main" id="create" ${playable(H.mode).length ? "" : "disabled"}>Créer la salle</button>
    <a class="link" href="index.html">Préparer les questions</a>
  </section>`;
  q("#back").onclick = renderStart;
  bindModes(hostSetup);
  q("#create").onclick = () => { H.code = newCode(); H.phase = "lobby"; saveH(); connectHost(); renderHost(); };
}
const joinUrl = () => location.origin + location.pathname + "?salle=" + H.code;
function hostLobby(){
  app.innerHTML = `<section class="screen">
    <p class="meta">${esc(MODES[H.mode].title)}, ${playable(H.mode).length} questions</p>
    <div class="room">
      <p class="hint">Code de la salle</p>
      <span class="code">${esc(H.code)}</span>
      <div class="qr" id="qr" aria-label="QR code pour rejoindre la salle"></div>
      <span class="joinurl">${esc(joinUrl())}</span>
    </div>
    <h2 class="h2">${H.players.length} joueur${H.players.length > 1 ? "s" : ""} dans la salle</h2>
    <ul class="roster">${H.players.length ? H.players.map(p => `<li class="${online.has(p.id) ? "" : "off"}"><span class="dot" aria-hidden="true"></span>${esc(p.name)}
      <button class="kick" data-kick="${esc(p.id)}" aria-label="Retirer ${esc(p.name)}">×</button></li>`).join("") : `<li class="empty">Personne pour l'instant. Scannez le QR code ou tapez le code.</li>`}</ul>
    ${H.me ? `<p class="hint">Tu joues aussi, en tant que <strong>${esc(H.me.name)}</strong> : tes réponses se touchent sur cet écran. <button class="link" id="unjoin">Ne plus jouer</button></p>`
      : `<form class="host-join" id="hj" novalidate><input class="field" id="hjName" maxlength="24" autocomplete="given-name" placeholder="Ton prénom" aria-label="Ton prénom"><button class="btn gold" type="submit">Je joue aussi</button></form>`}
    ${modesHTML()}
    <button class="btn main" id="start" ${H.players.length >= 2 && playable(H.mode).length ? "" : "disabled"}>Lancer la partie</button>
    ${closeLink}
  </section>`;
  const qr = q("#qr");
  if(window.QRCode){ try{ new QRCode(qr, { text: joinUrl(), width: 180, height: 180, colorDark: "#160304", colorLight: "#FFFFFF" }); }catch(e){ qr.hidden = true; } } else qr.hidden = true;
  qa("[data-kick]").forEach(b => b.onclick = () => {
    const id = b.dataset.kick;
    askConfirm(`Retirer ${pName(id)} de la salle ?`, () => { if(H.me && H.me.id === id) H.me = null; H.players = H.players.filter(p => p.id !== id); send({ t: "kick", to: id }); saveH(); broadcast(); renderHost(); }, "Retirer");
  });
  const hj = q("#hj");
  if(hj) hj.onsubmit = e => { e.preventDefault(); const name = q("#hjName").value.trim().slice(0, 24); if(!name) return;
    H.me = { id: P.id, name }; online.add(P.id); P.code = H.code; P.name = name; saveH(); onHostMsg({ t: "hello", id: P.id, name }); };
  const un = q("#unjoin"); if(un) un.onclick = () => { const id = H.me.id; H.me = null; H.players = H.players.filter(p => p.id !== id); saveH(); broadcast(); renderHost(); };
  bindModes(hostLobby);
  q("#start").onclick = () => {
    H.order = shuffle(playable(H.mode)); H.idx = 0; H.scores = Object.fromEntries(H.players.map(p => [p.id, 0]));
    startQuestion(); saveH(); broadcast(); sfx.go(); renderHost();
  };
  bindClose();
}

// La question, telle qu'elle s'affiche sur l'écran hôte et les téléphones
function quoteHTML(s, full){
  if(s.type === "qui"){
    const clues = s.clues || [];
    return `<div class="quote qui"><ol class="clues">${clues.map((c, i) => `<li class="${!full && i === clues.length - 1 ? "fresh" : ""}"><span>Indice ${i + 1}</span>${esc(c)}</li>`).join("")}</ol>
      <small>${full ? "Qui est ce danseur ?" : `Indice ${clues.length} sur ${esc(s.nClues)}`}</small></div>`;
  }
  const who = s.inRoom ? "Quelqu'un dans cette salle" : "Un danseur";
  return `<blockquote class="quote ${s.type === "fait" ? "fait" : "dit"}">${esc(s.text || "")}<small>${who} ${s.type === "fait" ? "a fait ça" : "a dit ça"}</small></blockquote>`;
}
const headHTML = st => `<header class="bar"><span>Question ${esc(st.idx + 1)} sur ${esc(st.total)}</span><span>${esc((TYPES[st.q.type] || TYPES.dit).label)}</span></header>
    <div class="progress" aria-hidden="true"><i style="width:${(st.idx / st.total) * 100}%"></i></div>`;
const choicesHTML = (choices, mine) => `<div class="answers">${choices.map((c, i) => `<button class="answer ${mine && mine === c ? "on" : ""}" data-pick="${i}" ${mine ? "disabled" : ""}>${av(c)}<span>${esc(c)}</span></button>`).join("")}</div>`;

function hostQuestion(){
  const st = publicState(), qq = curQ(), clues = clueList(qq.text), cul = culpritId(qq), el = eligible(), nIn = el.filter(p => H.ans[p.id]).length;
  const meCan = H.me && H.me.id !== cul;
  app.innerHTML = `<section class="screen">${headHTML(st)}
    <h1 class="qtype">${TYPES[qq.type].title}</h1>
    ${quoteHTML(st.q, false)}
    ${qq.type === "qui" && H.clue < clues.length ? `<button class="btn gold" id="clue">Indice suivant (${H.clue + 1}/${clues.length})</button>
      <p class="hint center">Trouver maintenant : +${cluePts(qq, H.clue)}, et +${FIRST_BONUS} pour le premier.</p>` : ""}
    ${meCan ? `<h2 class="h2">Ta réponse, ${esc(H.me.name)}</h2>${choicesHTML(H.choices, H.ans[H.me.id] && H.ans[H.me.id].choice)}` : ""}
    <p class="lead center">${allIn() ? "Tout le monde a répondu." : `Répondez sur vos téléphones. ${nIn} sur ${el.length}.`}</p>
    <ul class="roster">${el.map(p => `<li class="${H.ans[p.id] ? "" : "off"}"><span class="dot" aria-hidden="true"></span>${esc(p.name)}${H.ans[p.id] ? ` <small>${secs(H.ans[p.id].t)}</small>` : ""}</li>`).join("")}</ul>
    ${cul ? `<p class="hint">${esc(pName(cul))} ne répond pas : c'est sa question. Si personne ne trouve, il gagne +${POINTS_HIDDEN}.</p>` : ""}
    <button class="btn main" id="go" ${allIn() ? "" : "disabled"}>Révéler la réponse</button>
    ${allIn() ? "" : `<button class="link" id="force">Révéler sans attendre les retardataires</button>`}
    ${closeLink}
  </section>`;
  const cl = q("#clue"); if(cl) cl.onclick = () => { H.clue++; saveH(); broadcast(); sfx.point(); renderHost(); };
  qa("[data-pick]").forEach(b => b.onclick = () => onHostMsg({ t: "ans", id: H.me.id, idx: H.idx, choice: H.choices[+b.dataset.pick] }));
  q("#go").onclick = reveal;
  const f = q("#force"); if(f) f.onclick = () => askConfirm("Révéler maintenant ? Ceux qui n'ont pas répondu ne marquent pas de point.", reveal, "Révéler");
  bindClose();
}

// Résultat d'une question : la réponse, puis qui a trouvé, dans l'ordre d'arrivée
function resultHTML(rv, meId){
  const list = Array.isArray(rv.list) ? rv.list : [];
  return `<div class="culprit">${av(rv.answer)}<p><span class="meta">La réponse</span><strong>${esc(rv.answer)}</strong></p></div>
    ${list.length ? `<ol class="results">${list.map(x => `<li class="${x.ok ? "ok" : "ko"} ${x.id === meId ? "me" : ""}">
      <span class="pos">${x.ok ? esc(x.rank) : "✗"}</span>
      <span class="nm">${esc(x.name)}<small>${esc(x.choice)} · ${secs(x.t)}</small></span>
      <span class="sc">${x.pts ? "+" + esc(x.pts) : "0"}</span></li>`).join("")}</ol>` : `<p class="hint">Personne n'a répondu.</p>`}
    ${rv.hidden ? `<p class="note">Personne n'a trouvé : ${esc(rv.culprit)} gagne +${esc(rv.hidden)} pour s'être bien caché.</p>` : ""}`;
}
const rankingHTML = rk => `<ol class="ranking">${rk.map((x, i) => `<li><span class="pos">${i + 1}</span>${av(x.name)}<span class="nm">${esc(x.name)}</span><span class="sc">${esc(x.sc)}</span></li>`).join("")}</ol>`;

function hostReveal(){
  const st = publicState(), last = H.idx + 1 >= H.order.length;
  app.innerHTML = `<section class="screen">${headHTML(st)}
    ${quoteHTML(st.q, true)}
    ${resultHTML(st.reveal, null)}
    <button class="btn main" id="next">${last ? "Voir le classement" : "Question suivante"}</button>
    <div class="mini-rank" aria-label="Scores">${st.ranking.map(x => `<span>${esc(x.name)} <b>${esc(x.sc)}</b></span>`).join("")}</div>
    ${closeLink}
  </section>`;
  q("#next").onclick = () => {
    if(last){ H.phase = "end"; saveH(); broadcast(); sfx.fanfare(); renderHost(); return; }
    H.idx++; startQuestion(); saveH(); broadcast(); sfx.go(); renderHost();
  };
  bindClose();
}
function hostEnd(){
  const rk = ranking();
  app.innerHTML = `<section class="screen">
    <p class="meta">${esc(MODES[H.mode].title)}</p>
    <h1 class="title">Le<br>classement</h1>
    <p class="lead">${esc(rk[0] ? rk[0].name : "")} connaît la bande mieux que personne.</p>
    ${rankingHTML(rk)}
    <button class="btn main" id="again">Rejouer avec les mêmes joueurs</button>
    ${closeLink}
  </section>`;
  q("#again").onclick = () => { H.phase = "lobby"; H.order = []; H.scores = {}; H.ans = {}; saveH(); broadcast(); renderHost(); };
  bindClose();
}

/* =========================================================
   JOUEUR
   ========================================================= */
const P = { id: null, code: "", name: "", st: null, msg: "", waited: false, hostOnline: false, mine: null };
{ const me = read(ME_KEY); P.id = (me && me.id) || newId(); }
const saveMe = () => write(ME_KEY, { id: P.id, code: P.code, name: P.name });
let waitTimer = null, lastPlayerKey = null;

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
  const code = q("#code"), name = q("#name"), go = q("#go");
  const check = () => { go.disabled = !(cleanCode(code.value).length === 4 && name.value.trim()); };
  code.oninput = () => { code.value = cleanCode(code.value); check(); };
  name.oninput = check; check();
  (P.code.length === 4 ? name : code).focus();
  q("#f").onsubmit = e => { e.preventDefault(); if(go.disabled) return; P.code = cleanCode(code.value); P.name = name.value.trim(); P.msg = ""; joinRoom(); };
  q("#back").onclick = () => { history.replaceState(null, "", location.pathname); renderStart(); };
}
function joinRoom(){
  role = "player"; saveMe(); P.st = null; P.waited = false;
  history.replaceState(null, "", location.pathname + "?salle=" + P.code);
  renderPlayer();
  const ok = connect(P.code, P.id, { role: "player", name: P.name }, onPlayerMsg, ps => { P.hostOnline = !!ps.host; renderPlayer(); },
    () => sendP({ t: "hello", id: P.id, name: P.name }));
  if(!ok){ P.msg = "Connexion impossible. Vérifie ta connexion internet, puis réessaie."; renderJoin(); return; }
  clearTimeout(waitTimer);
  waitTimer = setTimeout(() => { P.waited = true; if(!P.st) renderPlayer(); }, 6000);
}
function leaveRoom(msg){
  disconnect(); clearTimeout(waitTimer);
  P.st = null; P.mine = null; P.msg = msg || "";
  write(ME_KEY, { id: P.id, name: P.name });
  renderJoin();
}
function onPlayerMsg(m){
  // Messages non authentifiés : tout ce qui arrive dans le HTML passe par esc()
  if(role === "host") return;
  if(m.to && m.to !== P.id) return;
  if(m.t === "state"){
    const first = !P.st;
    if(P.mine && P.mine.idx !== m.idx) P.mine = null;
    P.st = m; if(first) sfx.point();
    renderPlayer(); return;
  }
  if(m.t === "resume"){ if(m.ans && typeof m.ans.choice === "string") P.mine = { idx: m.idx, choice: m.ans.choice, t: m.ans.t }; renderPlayer(); return; }
  if(m.t === "kick"){ leaveRoom("L'hôte t'a retiré de la salle."); return; }
  if(m.t === "closed") leaveRoom("La salle a été fermée par l'hôte.");
}
function renderPlayer(){
  const st = P.st;
  if(!st || !st.phase) playerWaiting();
  else if(st.phase === "question" && st.q && Array.isArray(st.choices)) playerQuestion();
  else if(st.phase === "reveal" && st.reveal) playerReveal();
  else if(st.phase === "end" && Array.isArray(st.ranking)) playerEnd();
  else playerLobby();
  const k = (st ? st.phase + st.idx : "") + (P.mine ? "a" : "");
  if(k !== lastPlayerKey){ window.scrollTo(0, 0); lastPlayerKey = k; }
}
const leaveLink = `<button class="link" id="leave">Quitter la salle</button>`;
function bindLeave(){ const l = q("#leave"); if(l) l.onclick = () => askConfirm("Quitter la salle ?", () => { sendP({ t: "leave", id: P.id }); leaveRoom(); }, "Quitter"); }

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
  const r = q("#retry"); if(r) r.onclick = () => leaveRoom();
  bindLeave();
}
function playerLobby(){
  app.innerHTML = `<section class="screen handoff">
    <div class="wait"><span class="pulse" aria-hidden="true"></span>
      <p class="meta">Salle ${esc(P.code)}</p>
      <h1 class="big">${esc(P.name)}</h1>
      <p class="hint">Tu es dans la salle. La partie commence dès que l'hôte la lance. Garde ton téléphone en main : le plus rapide marque le plus.</p></div>
    <ul class="roster">${(P.st.players || []).map(p => `<li class="${p.id === P.id ? "me" : ""}"><span class="dot" aria-hidden="true"></span>${esc(p.name)}</li>`).join("")}</ul>
    ${leaveLink}
  </section>`;
  bindLeave();
}
function playerQuestion(){
  const st = P.st, s = st.q, mine = P.mine && P.mine.idx === st.idx ? P.mine : null;
  const me = s.culprit && s.culprit === P.id;
  const n = (st.answered || []).length;
  app.innerHTML = `<section class="screen">${headHTML(st)}
    ${quoteHTML(s, false)}
    ${me ? `<p class="note">C'est ta question : tu ne réponds pas. Fais-toi discret. Si personne ne trouve, tu gagnes +${POINTS_HIDDEN}.</p>`
      : mine ? `<div class="sent"><p class="meta">Réponse envoyée</p><b>${esc(mine.choice)}</b><small>Regarde l'écran hôte pour la réponse. ${esc(n)} sur ${esc((st.players || []).length - (s.culprit ? 1 : 0))} ont répondu.</small></div>`
      : `<p class="hint center">Touche ta réponse. Le premier qui trouve marque +${esc(s.now)}${s.type === "qui" ? ` et +${FIRST_BONUS}` : ""}. Une seule réponse.</p>${choicesHTML(st.choices, null)}`}
    ${leaveLink}
  </section>`;
  qa("[data-pick]").forEach(b => b.onclick = () => {
    if(P.mine && P.mine.idx === st.idx) return;
    const choice = st.choices[+b.dataset.pick]; if(typeof choice !== "string") return;
    P.mine = { idx: st.idx, choice }; sfx.go();
    sendP({ t: "ans", id: P.id, idx: st.idx, choice });
    renderPlayer();
  });
  bindLeave();
}
function playerReveal(){
  const st = P.st, rv = st.reveal, list = Array.isArray(rv.list) ? rv.list : [];
  const mine = list.find(x => x.id === P.id);
  const verdict = mine ? (mine.ok ? `<p class="verdict-line ok">Trouvé ! ${mine.rank === 1 ? "Le plus rapide. " : ""}+${esc(mine.pts)}</p>` : `<p class="verdict-line ko">Raté. Tu avais mis ${esc(mine.choice)}.</p>`)
    : st.q && st.q.inRoom && same(rv.culprit || "", P.name) ? `<p class="verdict-line ${rv.hidden ? "ok" : "ko"}">${rv.hidden ? `Personne ne t'a trouvé : +${esc(rv.hidden)}` : "Ils t'ont trouvé."}</p>` : "";
  app.innerHTML = `<section class="screen">${headHTML(st)}
    ${verdict}
    ${resultHTML(rv, P.id)}
    <h2 class="h2">Le classement</h2>
    ${rankingHTML(st.ranking || [])}
    ${leaveLink}
  </section>`;
  bindLeave();
}
function playerEnd(){
  const rk = P.st.ranking, pos = rk.findIndex(x => same(x.name, P.name));
  app.innerHTML = `<section class="screen">
    <p class="meta">Fin de la partie</p>
    <h1 class="title">Le<br>classement</h1>
    ${pos >= 0 ? `<p class="lead">Tu finis ${pos === 0 ? "premier" : `${pos + 1}e`} avec ${esc(rk[pos].sc)} point${rk[pos].sc > 1 ? "s" : ""}.</p>` : ""}
    ${rankingHTML(rk)}
    <p class="hint">Si l'hôte relance une partie, elle s'affichera ici toute seule.</p>
    ${leaveLink}
  </section>`;
  bindLeave();
}

/* L'hôte joue aussi : ses réponses vont directement à l'hôte, sans passer par internet */
const hostPlays = () => role === "host" && !!H && !!H.me;
function sendP(m){ if(role === "host"){ if(hostPlays()) setTimeout(() => onHostMsg(m), 0); } else send(m); }
function deliverLocal(){ /* l'hôte voit tout sur son propre écran */ }

// Revenir au menu des jeux depuis une salle (lien ajouté par commun/menu-salle.js)
window.EVG_QUITTER = retour => {
  if(role === "host" && H && H.phase && H.phase !== "setup")
    return askConfirm("Fermer la salle et revenir au menu des jeux ? Les joueurs seront déconnectés.", () => { send({ t: "closed" }); disconnect(); write(HOST_KEY, null); retour(); }, "Fermer et revenir");
  if(role === "player" && P.code)
    return askConfirm("Quitter la salle et revenir au menu des jeux ?", () => { sendP({ t: "leave", id: P.id }); disconnect(); write(ME_KEY, { id: P.id, name: P.name }); retour(); }, "Quitter");
  retour();
};

boot();
})();
