/* =========================================================
   Draft des anciens, en ligne : chacun joue sur son téléphone
   - L'écran hôte crée la salle, tire les boosters, garde les équipes, et anime les moments en commun
     (roulette des jokers, présentation des tours, votes, roulettes bonus et malus, élections, podium).
   - Chaque téléphone ouvre son booster, construit son deck et utilise ses jokers, tous en même temps.
   - Les cartes, boosters, roulettes et équipes viennent de script.js (chargé en mode bibliothèque).
   ========================================================= */
(() => {
const CFG = window.EVG_CONFIG || {};
const HOST_KEY = "draft-multi-host", ME_KEY = "draft-multi-me";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const HAND = CATS.length; // 7 cartes par booster

/* ---------- Outils ---------- */
const q = s => app.querySelector(s), qa = s => app.querySelectorAll(s);
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const read = k => { try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
const write = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
const newId = () => Math.random().toString(36).slice(2, 10);
const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const cleanCode = s => String(s || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
const emptyTeam = () => Object.fromEntries(CATS.map(c => [c.id, []]));
// Les fonctions de script.js lisent S (malus « stats cachées », nom du marié, nombre de tours)
const setLib = (o) => { S = Object.assign({ blindNow: false, groom: "", rounds: ROUNDS }, o); };
setLib({});

/* =========================================================
   Connexion temps réel (Supabase Realtime)
   ========================================================= */
let sb = null, channel = null, conn = "off";
const connPill = document.createElement("div");
connPill.className = "conn"; connPill.setAttribute("role", "status");
document.body.appendChild(connPill);
function paintConn(){
  connPill.className = "conn " + conn;
  connPill.innerHTML = `<i aria-hidden="true"></i>${{ on:"En ligne", connecting:"Connexion…", error:"Hors ligne", off:"" }[conn]}`;
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
  channel = c.channel("draft-" + code, { config: { broadcast: { self: false }, presence: { key } } });
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

/* =========================================================
   Démarrage
   ========================================================= */
const params = new URLSearchParams(location.search);
let role = null;
function boot(){
  const h = read(HOST_KEY), me = read(ME_KEY), code = cleanCode(params.get("salle"));
  if(code){ role = "player"; P.code = code; P.name = (me && me.name) || ""; if(me && me.code === code && me.name){ joinRoom(); return; } renderJoin(); return; }
  if(h && h.phase && h.phase !== "setup"){ role = "host"; H = h; if(H.me){ P.id = H.me.id; P.code = H.code; P.name = H.me.name; } setLib({ groom: H.groom, rounds: H.rounds }); connectHost(); renderHost(); return; }
  if(me && me.code && me.name){ role = "player"; Object.assign(P, { code: me.code, name: me.name }); joinRoom(); return; }
  renderStart();
}
function renderStart(){
  role = null; if(typeof paintPlay === "function") paintPlay();
  app.innerHTML = `<section class="screen">
    <h1 class="title">Draft<br>en ligne</h1>
    <p class="lead">Chacun ouvre ses boosters et construit son équipe sur son propre téléphone, en même temps. L'écran hôte anime les présentations, les roulettes et les élections.</p>
    <div class="roles">
      <button class="role main" id="asHost"><b>Créer une salle</b><span>Sur l'écran que tout le monde regarde : la télé, un ordi ou un téléphone posé au milieu.</span></button>
      <button class="role" id="asPlayer"><b>Rejoindre une salle</b><span>Sur ton téléphone, avec le code affiché sur l'écran hôte.</span></button>
    </div>
    <a class="link" href="index.html">Jouer sur un seul téléphone</a>
  </section>`;
  q("#asHost").onclick = () => { role = "host"; H = { phase: "setup", rounds: SHORT_ROUNDS, groom: "", players: [] }; renderHost(); };
  q("#asPlayer").onclick = () => { role = "player"; P.code = ""; renderJoin(); };
}

/* =========================================================
   HÔTE
   ========================================================= */
let H = null, online = new Set(), lastHostKey = null;
const saveH = () => write(HOST_KEY, H);
const pName = id => (H.players.find(p => p.id === id) || {}).name || "?";
const asPlayer = id => ({ name: pName(id), team: H.teams[id] }); // forme attendue par roundCards / teamHTML

function draw(id, n, exclude = [], mode = null){
  const used = new Set([...Object.values(H.teams[id]).flat().map(c => c.id), ...exclude]);
  const avail = shuffle(H.pool.filter(c => !used.has(c.id)));
  if(mode === "legend") avail.sort((x, y) => TIER[cardData(x).rarity] - TIER[cardData(y).rarity]);
  if(mode === "cursed") avail.sort((x, y) => TIER[cardData(y).rarity] - TIER[cardData(x).rarity]);
  return avail.slice(0, n);
}
function publicState(){
  const st = { t: "state", code: H.code, phase: H.phase, round: H.round, rounds: H.rounds, groom: H.groom,
    players: H.players.map(p => ({ id: p.id, name: p.name })) };
  if(H.phase === "draft") st.status = Object.fromEntries(H.players.map(p => [p.id, { opened: !!H.opened[p.id], done: !!H.decks[p.id] }]));
  if(H.phase === "reveal" || H.phase === "revealTeams") st.revealName = H.players[H.revealIdx] ? H.players[H.revealIdx].name : "";
  if(H.phase === "election") st.electCat = CATS[H.elect.idx].label;
  return st;
}
const broadcast = () => send(publicState());
const sendMine = id => send({ t: "mine", to: id, team: H.teams[id], jokers: H.jokers[id] || [] });
const sendHand = id => { const h = H.hands[id]; if(h) send({ t: "hand", to: id, round: H.round, n: h.n, cards: h.cards, kind: h.kind, blind: h.blind }); };

function connectHost(){
  const ok = connect(H.code, "host", { role: "host" }, onHostMsg, ps => {
    online = new Set(Object.keys(ps).filter(k => k !== "host")); if(H && H.me) online.add(H.me.id);
    if(role === "host") renderHost();
  }, () => { broadcast(); if(H.teams) H.players.forEach(p => { sendMine(p.id); if(H.phase === "draft" && !H.decks[p.id]) sendHand(p.id); }); if(H.me) onHostMsg({ t: "hello", id: H.me.id, name: H.me.name }); });
  if(!ok) renderHost();
}
function onHostMsg(m){
  if(!H || !m.id) return;
  const known = H.players.some(p => p.id === m.id);
  if(m.t === "hello"){
    const name = String(m.name || "").trim().slice(0, 24) || "Joueur";
    if(!known){
      if(H.phase !== "lobby"){ send({ t: "started", to: m.id }); return; } // la partie a déjà commencé
      H.players.push({ id: m.id, name }); sfx.click();
    } else H.players.find(p => p.id === m.id).name = name;
    saveH(); broadcast();
    if(H.teams && H.teams[m.id]){ sendMine(m.id); if(H.phase === "draft" && !H.decks[m.id]) sendHand(m.id); }
    renderHost(); return;
  }
  if(!known) return;
  if(m.t === "leave" && H.phase === "lobby"){ H.players = H.players.filter(p => p.id !== m.id); saveH(); broadcast(); renderHost(); return; }
  if(H.phase !== "draft" || H.decks[m.id]) return;
  const hand = H.hands[m.id]; if(!hand) return;

  if(m.t === "opened"){ H.opened[m.id] = true; saveH(); broadcast(); renderHost(); return; }

  if(m.t === "deck" && m.n === hand.n){
    // Vérifie que chaque catégorie reçoit une carte différente de la main
    const ids = CATS.map(c => m.assign && m.assign[c.id]);
    const cards = ids.map(i => hand.cards.find(c => c.id === i));
    if(cards.some(c => !c) || new Set(ids).size !== CATS.length) return;
    CATS.forEach((c, k) => H.teams[m.id][c.id].push(cards[k]));
    H.decks[m.id] = true; H.opened[m.id] = true;
    saveH(); sendMine(m.id); broadcast(); sfx.place();
    if(H.players.every(p => H.decks[p.id])) endRound(); else renderHost();
    return;
  }

  if(m.t === "joker" && m.n === hand.n){
    const js = H.jokers[m.id] || [], k = js.indexOf(m.type);
    if(k < 0) return;
    if((m.type === "espion" || m.type === "sabotage") && !H.players.some(p => p.id === m.target && p.id !== m.id)) return;
    js.splice(k, 1);
    if(m.type === "relance") H.hands[m.id] = { cards: draw(m.id, HAND, hand.cards.map(c => c.id)), kind: "relance", blind: hand.blind, n: hand.n + 1 };
    if(m.type === "xl") H.hands[m.id] = { cards: draw(m.id, HAND, [], "legend"), kind: "legend", blind: hand.blind, n: hand.n + 1 };
    if(m.type === "espion") send({ t: "spy", to: m.id, name: pName(m.target), team: H.teams[m.target] });
    if(m.type === "sabotage"){ H.flags[m.target].cursed = true; send({ t: "notice", to: m.id, text: `${pName(m.target)} aura un booster maudit au prochain tour.` }); }
    if(m.type === "relance" || m.type === "xl"){ H.opened[m.id] = false; sendHand(m.id); }
    saveH(); sendMine(m.id); broadcast(); renderHost();
  }
}

function renderHost(){
  // Le jeu de l'hôte s'affiche seulement quand il a quelque chose à faire ; sinon, retour à l'écran hôte
  if(!PLAY_PHASES.includes(H.phase)) view = "host";
  if(view === "play" && hostPlays()){ renderPlayer(); return; }
  setLib({ groom: H.groom, rounds: H.rounds });
  ({ setup: hostSetup, lobby: hostLobby, startSpin: hostStartSpin, draft: hostDraft, show: hostShow, spin: hostSpin,
     revealTeams: hostRevealHandoff, reveal: hostReveal, election: hostElection, final: hostFinal })[H.phase]();
  const k = H.phase + (H.round || 0) + "-" + (H.revealIdx || 0) + "-" + (H.elect ? H.elect.idx : 0) + "-" + (H.startSpin ? H.startSpin.idx : 0) + "-" + (H.spin ? H.spin.stage : 0);
  if(k !== lastHostKey){ window.scrollTo(0, 0); lastHostKey = k; }
  paintPlay();
}
function closeRoom(){
  askConfirm("Fermer la salle ? La partie sera perdue et les joueurs déconnectés.", () => { send({ t: "closed" }); disconnect(); H = null; write(HOST_KEY, null); renderStart(); }, "Fermer la salle");
}
const closeLink = `<button class="link" id="close">Fermer la salle</button>`;
const bindClose = () => { const c = q("#close"); if(c) c.onclick = closeRoom; };

function hostSetup(){
  app.innerHTML = `<section class="screen">
    <button class="btn ghost" id="back">Retour</button>
    <h1 class="title">Créer<br>la salle</h1>
    <h2 class="h2">Futur marié</h2>
    <input class="solo" id="groom" value="${esc(H.groom)}" placeholder="Prénom du futur marié" aria-label="Prénom du futur marié">
    <p class="hint">Il aura une carte Mythique unique dans le paquet.</p>
    <h2 class="h2">Durée de la partie</h2>
    <div class="vote">${[[SHORT_ROUNDS, "Courte"], [ROUNDS, "Normale"]].map(([n, l]) => `<button class="btn ${H.rounds === n ? "main" : "ghost"}" data-rounds="${n}" aria-pressed="${H.rounds === n}">${l}<br><small>${n} tours</small></button>`).join("")}</div>
    ${CFG.supabaseUrl ? "" : `<p class="error-box">La connexion n'est pas configurée : le fichier config.js est introuvable.</p>`}
    <button class="btn main" id="create">Créer la salle</button>
  </section>`;
  q("#back").onclick = renderStart;
  q("#groom").oninput = e => { H.groom = e.target.value; };
  qa("[data-rounds]").forEach(b => b.onclick = () => { H.rounds = +b.dataset.rounds; sfx.click(); hostSetup(); });
  q("#create").onclick = () => { H.groom = H.groom.trim(); H.code = newCode(); H.phase = "lobby"; saveH(); connectHost(); renderHost(); };
}

const joinUrl = () => location.origin + location.pathname + "?salle=" + H.code;
function hostLobby(){
  app.innerHTML = `<section class="screen">
    <p class="meta">${H.rounds} tours${H.groom ? `, futur marié : ${esc(H.groom)}` : ""}</p>
    <div class="room">
      <p class="hint">Code de la salle</p>
      <span class="code">${esc(H.code)}</span>
      <div class="qr" id="qr" aria-label="QR code pour rejoindre la salle"></div>
      <span class="joinurl">${esc(joinUrl())}</span>
    </div>
    <h2 class="h2">${H.players.length} joueur${H.players.length > 1 ? "s" : ""} dans la salle</h2>
    <ul class="roster">${H.players.length ? H.players.map(p => `<li class="${online.has(p.id) ? "" : "off"}"><span class="dot" aria-hidden="true"></span>${esc(p.name)}
      <button class="kick" data-kick="${esc(p.id)}" aria-label="Retirer ${esc(p.name)}">×</button></li>`).join("") : `<li class="empty">Personne pour l'instant. Scannez le QR code ou tapez le code.</li>`}</ul>
    ${hostJoinHTML()}
    <p class="hint">Les joueurs doivent tous être dans la salle avant le lancement : personne ne peut rejoindre une partie commencée.</p>
    <button class="btn main" id="start" ${H.players.length >= 2 ? "" : "disabled"}>Lancer la partie</button>
    ${closeLink}
  </section>`;
  const qr = q("#qr");
  if(window.QRCode){ try{ new QRCode(qr, { text: joinUrl(), width: 180, height: 180, colorDark: "#160304", colorLight: "#FFFFFF" }); }catch(e){ qr.hidden = true; } } else qr.hidden = true;
  qa("[data-kick]").forEach(b => b.onclick = () => {
    const id = b.dataset.kick;
    askConfirm(`Retirer ${pName(id)} de la salle ?`, () => { if(H.me && H.me.id === id) H.me = null; H.players = H.players.filter(p => p.id !== id); send({ t: "kick", to: id }); saveH(); broadcast(); renderHost(); }, "Retirer");
  });
  q("#start").onclick = () => {
    H.pool = buildPool(H.groom);
    H.teams = {}; H.jokers = {}; H.flags = {}; H.roundWins = {};
    H.players.forEach(p => { H.teams[p.id] = emptyTeam(); H.jokers[p.id] = []; H.flags[p.id] = {}; H.roundWins[p.id] = 0; });
    H.round = 0; H.startSpin = { idx: 0, pick: Math.floor(Math.random() * Object.keys(JOKERS).length), spun: false };
    H.phase = "startSpin"; saveH(); broadcast(); H.players.forEach(p => sendMine(p.id)); renderHost();
  };
  bindClose(); bindHostJoin();
}

// Fait tourner une roue (wheelHTML de script.js) puis appelle done
function spinWheel(wh, done){
  const seg = 360 / wh.labels.length, target = 360 * 6 - (wh.pick + .5) * seg, wheel = q("#wheel");
  if(reduceMotion()){ done(); return; }
  sfx.spin(4);
  requestAnimationFrame(() => { wheel.classList.add("spinning"); wheel.style.transform = `rotate(${target}deg)`; });
  wheel.addEventListener("transitionend", done, { once: true });
}
const placeWheel = wh => { const seg = 360 / wh.labels.length; q("#wheel").style.transform = `rotate(${360 * 6 - (wh.pick + .5) * seg}deg)`; };

function hostStartSpin(){
  const T = H.startSpin, p = H.players[T.idx], keys = Object.keys(JOKERS), last = T.idx === H.players.length - 1;
  const wh = { labels: keys.map(k => JOKERS[k].name), keys, pick: T.pick };
  app.innerHTML = `<section class="screen center">
    <p class="meta">Joker de départ, joueur ${T.idx + 1} sur ${H.players.length}</p>
    <h1 class="reveal-name">${esc(p.name)}</h1>
    ${wheelHTML(wh)}
    <p class="note good" ${T.spun ? "" : "hidden"}>${esc(p.name)} commence avec le joker ${JOKERS[keys[T.pick]].name}. ${JOKERS[keys[T.pick]].text}</p>
    ${T.spun ? `<button class="btn main" id="next">${last ? "Distribuer les boosters" : "Joueur suivant"}</button>` : `<button class="btn main" id="spin">Lancer la roulette</button>`}
    ${closeLink}
  </section>`;
  if(T.spun) placeWheel(wh);
  const sb2 = q("#spin");
  if(sb2) sb2.onclick = () => { sb2.disabled = true; spinWheel(wh, () => { T.spun = true; H.jokers[p.id].push(keys[T.pick]); saveH(); sendMine(p.id); renderHost(); sfx.win(); }); };
  const nx = q("#next");
  if(nx) nx.onclick = () => {
    if(last){ H.startSpin = null; startRound(); return; }
    H.startSpin = { idx: T.idx + 1, pick: Math.floor(Math.random() * keys.length), spun: false }; saveH(); renderHost();
  };
  bindClose();
}

function startRound(){
  H.hands = {}; H.decks = {}; H.opened = {};
  H.players.forEach(p => {
    const f = H.flags[p.id];
    H.hands[p.id] = { cards: draw(p.id, HAND, [], f.cursed ? "cursed" : null), kind: f.cursed ? "cursed" : "normal", blind: !!f.blind, n: 1 };
    H.flags[p.id] = {};
  });
  H.phase = "draft"; saveH(); broadcast(); H.players.forEach(p => sendHand(p.id)); sfx.tear(); renderHost();
}
function endRound(){
  H.round++;
  if(H.round < H.rounds){ H.show = { revealed: 0, winner: null, loser: null, statsHint: false }; H.phase = "show"; }
  else { H.phase = "revealTeams"; H.revealIdx = 0; }
  saveH(); broadcast(); sfx.flip(); renderHost();
}

function hostDraft(){
  const done = H.players.filter(p => H.decks[p.id]).length;
  app.innerHTML = `<section class="screen">
    <p class="meta">Salle ${esc(H.code)}</p>
    <h1 class="title">Tour ${H.round + 1}<br>sur ${H.rounds}</h1>
    <p class="lead">Chacun ouvre son booster et construit son deck sur son téléphone. ${done} sur ${H.players.length} ont validé.</p>
    <ul class="prog">${H.players.map(p => { const d = H.decks[p.id], o = H.opened[p.id]; return `<li class="${d ? "done" : o ? "opened" : ""}">
      <span class="nm">${esc(p.name)}${online.has(p.id) ? "" : "<small>Déconnecté</small>"}</span>
      <span class="bar" aria-hidden="true"><i style="width:${d ? 100 : o ? 50 : 8}%"></i></span>
      <span class="ct">${d ? "✓" : o ? "Deck" : "Booster"}</span></li>`; }).join("")}</ul>
    <p class="hint">La présentation du tour démarre toute seule quand tout le monde a validé son deck.</p>
    ${H.players.filter(p => !H.decks[p.id]).map(p => `<button class="link" data-auto="${esc(p.id)}">Valider à la place de ${esc(p.name)}</button>`).join("")}
    ${closeLink}
  </section>`;
  qa("[data-auto]").forEach(b => b.onclick = () => {
    const id = b.dataset.auto;
    askConfirm(`Valider le deck de ${pName(id)} à sa place ? Ses cartes seront placées au mieux d'après les stats.`, () => {
      const h = H && H.hands && H.hands[id]; if(!h) return;
      const assign = {}, used = new Set();
      h.cards.flatMap(c => CATS.map(cat => [c, cat])).sort((x, y) => catScore(y[0], y[1]) - catScore(x[0], x[1]))
        .forEach(([c, cat]) => { if(assign[cat.id] == null && !used.has(c.id)){ assign[cat.id] = c.id; used.add(c.id); } });
      onHostMsg({ t: "deck", id, n: h.n, assign });
    }, "Valider");
  });
  bindClose();
}

function hostShow(){
  const T = H.show, r = H.round - 1, all = T.revealed >= H.players.length;
  const order = H.players.map(p => [p.id, roundScore(asPlayer(p.id), r)]).sort((a, b) => b[1] - a[1]);
  const best = order[0][0], worst = order[order.length - 1][0];
  app.innerHTML = `<section class="screen">
    <h1 class="title">Tour ${H.round},<br>présentation</h1>
    <p class="lead">On révèle les choix de chacun, on débat, puis on désigne la meilleure et la moins bonne équipe du tour.</p>
    ${H.players.slice(0, T.revealed).map((p, k) => `<article class="final-team"><h2>${esc(p.name)}</h2>
      <div class="hand row">${roundCards(asPlayer(p.id), r).map((x, i) => `<div class="labeled ${k === T.revealed - 1 ? "pop" : ""}" style="--cat:${x.cat.color};--d:${i}">
        <span class="lab">${x.cat.label}${isExpert(x.card, x.cat) ? " ★ Expert" : ""}</span>${cardHTML(x.card)}</div>`).join("")}</div></article>`).join("")}
    ${!all ? `<button class="btn main" id="more">Révéler les choix de ${esc(H.players[T.revealed].name)}</button>` : `
      <h2 class="h2">Meilleure équipe du tour (gagne un bonus)</h2>
      <div class="vote">${H.players.map(p => `<button class="btn ${T.winner === p.id ? "main" : "ghost"}" data-win="${esc(p.id)}" aria-pressed="${T.winner === p.id}">${esc(p.name)}</button>`).join("")}</div>
      <h2 class="h2">Moins bonne équipe du tour (prend le malus)</h2>
      <div class="vote">${H.players.map(p => `<button class="btn ${T.loser === p.id ? "main lose" : "ghost"}" data-lose="${esc(p.id)}" aria-pressed="${T.loser === p.id}">${esc(p.name)}</button>`).join("")}</div>
      ${T.statsHint ? `<p class="note">D'après les stats, le meilleur tour est celui de ${esc(pName(best))} et le moins bon celui de ${esc(pName(worst))}.</p>` : `<button class="link" id="hint">Et d'après les stats ?</button>`}
      <button class="btn main" id="validate" ${T.winner == null || T.loser == null ? "disabled" : ""}>Valider le vote</button>`}
    ${closeLink}
  </section>`;
  const more = q("#more");
  if(more) more.onclick = () => { T.revealed++; saveH(); renderHost(); setTimeout(() => { const a = qa(".final-team"); if(a.length) a[a.length - 1].scrollIntoView({ behavior: "smooth", block: "start" }); }, 30); };
  qa("[data-win]").forEach(b => b.onclick = () => { T.winner = b.dataset.win; if(T.loser === T.winner) T.loser = null; saveH(); renderHost(); });
  qa("[data-lose]").forEach(b => b.onclick = () => { T.loser = b.dataset.lose; if(T.winner === T.loser) T.winner = null; saveH(); renderHost(); q("#validate").scrollIntoView({ block: "center" }); });
  const h = q("#hint"); if(h) h.onclick = () => { T.statsHint = true; saveH(); renderHost(); };
  const v = q("#validate"); if(v) v.onclick = () => {
    const jk = Object.keys(JOKERS), mk = Object.keys(MALUS);
    H.roundWins[T.winner]++;
    H.spin = { stage: 0, winner: T.winner, loser: T.loser, spun: false, wheels: [
      { title: `Bonus de ${pName(T.winner)}`, labels: jk.map(k => JOKERS[k].name), keys: jk, pick: Math.floor(Math.random() * jk.length) },
      { title: `Malus de ${pName(T.loser)}`, labels: mk.map(k => MALUS[k].name), keys: mk, pick: Math.floor(Math.random() * mk.length) }] };
    H.phase = "spin"; saveH(); broadcast(); renderHost();
  };
  bindClose();
}

function hostSpin(){
  const sp = H.spin, wh = sp.wheels[sp.stage], last = sp.stage === sp.wheels.length - 1, key = wh.keys[wh.pick];
  const res = sp.stage === 0 ? `${esc(pName(sp.winner))} gagne le joker ${JOKERS[key].name}. ${JOKERS[key].text}` : `${esc(pName(sp.loser))} prend le malus ${MALUS[key].name}. ${MALUS[key].text}`;
  app.innerHTML = `<section class="screen center">
    <p class="meta">Tour ${H.round}, ${sp.stage === 0 ? `meilleure équipe : ${esc(pName(sp.winner))}` : `moins bonne équipe : ${esc(pName(sp.loser))}`}</p>
    <h1 class="reveal-name">${esc(wh.title)}</h1>
    ${wheelHTML(wh)}
    <p class="note ${sp.stage === 0 ? "good" : "bad"}" ${sp.spun ? "" : "hidden"}>${res}</p>
    ${sp.spun ? `<button class="btn main" id="next">${last ? "Tour suivant" : "Roulette suivante"}</button>` : `<button class="btn main" id="spin">Lancer la roulette</button>`}
    ${closeLink}
  </section>`;
  if(sp.spun) placeWheel(wh);
  const sb2 = q("#spin");
  if(sb2) sb2.onclick = () => { sb2.disabled = true; spinWheel(wh, () => { sp.spun = true; saveH(); renderHost(); sp.stage === 0 ? sfx.win() : sfx.malus(); }); };
  const nx = q("#next");
  if(nx) nx.onclick = () => {
    if(!last){ sp.stage++; sp.spun = false; saveH(); renderHost(); return; }
    // Applique le bonus et le malus, puis distribue les boosters du tour suivant
    const w = sp.wheels;
    H.jokers[sp.winner].push(w[0].keys[w[0].pick]);
    const malus = w[1].keys[w[1].pick], vj = H.jokers[sp.loser], f = H.flags[sp.loser];
    if(malus === "maudit") f.cursed = true;
    if(malus === "aveugle") f.blind = true;
    if(malus === "vol"){ if(vj.length) vj.splice(Math.floor(Math.random() * vj.length), 1); else f.cursed = true; }
    sendMine(sp.winner); sendMine(sp.loser);
    H.spin = null; H.show = null; startRound();
  };
  bindClose();
}

function hostRevealHandoff(){
  const p = H.players[H.revealIdx];
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">${H.revealIdx === 0 ? "Toutes les équipes sont prêtes. " : ""}Équipe ${H.revealIdx + 1} sur ${H.players.length}</p>
    ${cardHTML(playerCard(p.name), { player: true, tag: "h1" })}
    <button class="btn main" id="go">Révéler l'équipe</button>
    ${closeLink}
  </section>`;
  q("#go").onclick = () => { H.phase = "reveal"; saveH(); broadcast(); renderHost(); sfx.legend(); };
  bindClose();
}
function hostReveal(){
  const p = H.players[H.revealIdx], last = H.revealIdx >= H.players.length - 1;
  app.innerHTML = `<section class="screen">
    <p class="meta">L'équipe de</p>
    <h1 class="reveal-name">${esc(p.name)}</h1>
    ${teamHTML(asPlayer(p.id), true)}
    <button class="btn main" id="next">${last ? "Passer aux élections" : "Équipe suivante"}</button>
  </section>`;
  q("#next").onclick = () => {
    if(last){ H.elect = { idx: 0, choice: null, winners: {} }; H.phase = "election"; }
    else { H.revealIdx++; H.phase = "revealTeams"; }
    saveH(); broadcast(); renderHost();
  };
}
function hostElection(){
  const E = H.elect, cat = CATS[E.idx], last = E.idx === CATS.length - 1;
  app.innerHTML = `<section class="screen">
    <p class="meta">Élection ${E.idx + 1} sur ${CATS.length}</p>
    <h1 class="title" style="text-shadow:5px 5px 0 ${cat.color}">Meilleure<br>équipe ${esc(cat.label)}</h1>
    <p class="lead">Voici les ${H.rounds} danseurs ${esc(cat.label)} de chacun. Débattez, puis votez.</p>
    ${H.players.map(p => `<article class="final-team"><h2>${esc(p.name)}</h2><div class="hand row">${H.teams[p.id][cat.id].map(c => cardHTML(c)).join("")}</div></article>`).join("")}
    <h2 class="h2">Qui a la meilleure équipe ${esc(cat.label)} ?</h2>
    <div class="vote">${H.players.map(p => `<button class="btn ${E.choice === p.id ? "main" : "ghost"}" data-pick="${esc(p.id)}" aria-pressed="${E.choice === p.id}">${esc(p.name)}</button>`).join("")}</div>
    <button class="btn main" id="ok" ${E.choice == null ? "disabled" : ""}>${last ? "Voir le podium" : "Élection suivante"}</button>
  </section>`;
  qa("[data-pick]").forEach(b => b.onclick = () => { E.choice = b.dataset.pick; saveH(); renderHost(); q("#ok").scrollIntoView({ block: "center" }); });
  q("#ok").onclick = () => {
    E.winners[cat.id] = E.choice; E.choice = null; last ? sfx.fanfare() : sfx.win();
    if(last) H.phase = "final"; else E.idx++;
    saveH(); broadcast(); renderHost();
  };
}
let showStats = false;
function hostFinal(){
  const W = H.elect.winners;
  const podium = H.players.map(p => ({ name: p.name, cats: CATS.filter(c => W[c.id] === p.id).map(c => c.label), rounds: H.roundWins[p.id] || 0 }))
    .sort((a, b) => b.cats.length - a.cats.length || b.rounds - a.rounds);
  const totals = H.players.map(p => [p.name, CATS.reduce((sum, cat) => sum + H.teams[p.id][cat.id].reduce((s, c) => s + catScore(c, cat), 0), 0)]).sort((a, b) => b[1] - a[1]);
  app.innerHTML = `<section class="screen">
    <h1 class="title">Le<br>podium</h1>
    <ol class="ranking">${podium.map((x, i) => `<li><span class="pos">${i + 1}</span>
      <span class="nm">${esc(x.name)}<small class="sub">${x.cats.length ? esc(x.cats.join(", ")) : "Aucune catégorie"} · ${x.rounds} tour${x.rounds > 1 ? "s" : ""} gagné${x.rounds > 1 ? "s" : ""}</small></span>
      <span class="sc">${x.cats.length}</span></li>`).join("")}</ol>
    <p class="hint">Le chiffre à droite est le nombre de catégories remportées. En cas d'égalité, les tours gagnés départagent.</p>
    ${showStats ? `<h2 class="h2">Selon les stats</h2><ol class="ranking">${totals.map(([n, sc], i) => `<li><span class="pos">${i + 1}</span><span class="nm">${esc(n)}</span><span class="sc">${sc}</span></li>`).join("")}</ol>`
      : `<button class="btn ghost" id="rank">Comparer avec le classement des stats</button>`}
    <h2 class="h2">Toutes les équipes</h2>
    ${H.players.map(p => `<article class="final-team"><h2>${esc(p.name)}</h2>${teamHTML(asPlayer(p.id), false)}</article>`).join("")}
    <button class="btn main" id="again">Nouvelle partie avec les mêmes joueurs</button>
    ${closeLink}
  </section>`;
  const rk = q("#rank"); if(rk) rk.onclick = () => { showStats = true; renderHost(); };
  q("#again").onclick = () => { showStats = false; ["teams", "jokers", "flags", "hands", "decks", "opened", "elect", "show", "spin", "roundWins"].forEach(k => delete H[k]); H.phase = "lobby"; H.round = 0; saveH(); broadcast(); renderHost(); };
  bindClose();
}

/* =========================================================
   JOUEUR
   ========================================================= */
const P = { id: null, code: "", name: "", st: null, msg: "", waited: false, hostOnline: false,
  hand: null, team: emptyTeam(), jokers: [], open: false, placing: false, flipped: [], assign: {}, sel: null, sent: "", overlay: null };
{ const me = read(ME_KEY); P.id = (me && me.id) || newId(); }
const saveMe = () => write(ME_KEY, { id: P.id, code: P.code, name: P.name });
let waitTimer = null, lastPlayerKey = null;

function renderJoin(){
  app.innerHTML = `<section class="screen">
    <h1 class="title">Rejoindre<br>la salle</h1>
    ${P.msg ? `<p class="error-box">${esc(P.msg)}</p>` : ""}
    <form id="f" class="screen" novalidate>
      <label class="h2" for="code">Code de la salle</label>
      <input class="field code-in solo" id="code" autocomplete="off" autocapitalize="characters" maxlength="4" placeholder="ABCD" value="${esc(P.code)}">
      <label class="h2" for="name">Ton prénom</label>
      <input class="solo" id="name" maxlength="24" autocomplete="given-name" placeholder="Prénom" value="${esc(P.name)}">
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
  Object.assign(P, { st: null, hand: null, team: emptyTeam(), jokers: [], open: false, placing: false, flipped: [], assign: {}, sel: null, sent: "", overlay: null, msg: msg || "" });
  write(ME_KEY, { id: P.id, name: P.name });
  renderJoin();
}
function onPlayerMsg(m){
  if(role === "host" && !hostPlays()) return;
  if(m.to && m.to !== P.id) return;
  if(m.t === "state"){
    const first = !P.st; P.st = m;
    if(m.phase === "lobby" || m.phase === "startSpin"){ P.hand = null; P.sent = ""; }
    if(first) sfx.click();
    renderPlayer(); return;
  }
  if(m.t === "hand"){
    const fresh = !P.hand || P.hand.round !== m.round || P.hand.n !== m.n;
    P.hand = m;
    if(fresh){ P.open = false; P.placing = false; P.flipped = []; P.assign = {}; P.sel = null; P.overlay = null; filterOn = "all"; domainOn = "all"; }
    renderPlayer(); return;
  }
  if(m.t === "mine"){ P.team = m.team || emptyTeam(); P.jokers = m.jokers || []; renderPlayer(); return; }
  if(m.t === "spy"){ P.overlay = { kind: "spy", name: m.name, team: m.team }; renderPlayer(); return; }
  if(m.t === "notice"){ tell(m.text); return; }
  if(m.t === "started"){ leaveRoom("La partie a déjà commencé dans cette salle : impossible de la rejoindre en cours de route."); return; }
  if(m.t === "kick"){ leaveRoom("L'hôte t'a retiré de la salle."); return; }
  if(m.t === "closed") leaveRoom("La salle a été fermée par l'hôte.");
}

const myDone = () => P.st && P.st.status && P.st.status[P.id] && P.st.status[P.id].done;
function renderPlayer(){
  if(role === "host" && view !== "play"){ paintPlay(); return; }
  const st = P.st;
  setLib({ groom: st ? st.groom : "", rounds: st ? st.rounds : ROUNDS, blindNow: !!(P.hand && P.hand.blind) });
  if(!st || !st.phase) playerWaiting();
  else if(st.phase === "lobby") playerLobby();
  else if(st.phase === "draft" && P.hand && P.hand.round === st.round && !myDone() && P.sent !== P.hand.round + "-" + P.hand.n) (P.open ? (P.placing ? playerPick() : playerFlip()) : playerBooster());
  else playerWatch();
  const k = (st ? st.phase + st.round : "") + (P.hand ? P.hand.n : "") + P.open + P.placing + (myDone() ? "d" : "");
  if(k !== lastPlayerKey){ window.scrollTo(0, 0); lastPlayerKey = k; }
  paintPlay();
}
const leaveLink = `<button class="link" id="leave">Quitter la salle</button>`;
function bindLeave(){ const l = q("#leave"); if(l && role === "host"){ l.remove(); return; } if(l) l.onclick = () => askConfirm("Quitter la salle ?", () => { sendP({ t: "leave", id: P.id }); leaveRoom(); }, "Quitter"); }
const myJokers = () => P.jokers.length ? `<div class="my-jokers">${P.jokers.map(t => `<span>Joker ${JOKERS[t].name}</span>`).join("")}</div>` : "";
const teamBox = () => Object.values(P.team).some(a => a.length) ? `<details class="note"><summary>Voir mon équipe</summary>${teamHTML({ team: P.team }, false)}</details>` : "";

function playerWaiting(){
  const late = P.waited && conn === "on" && !P.hostOnline;
  app.innerHTML = `<section class="screen handoff">
    <div class="wait"><span class="pulse" aria-hidden="true"></span><p class="meta">Salle ${esc(P.code)}</p>
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
    <p class="meta">Salle ${esc(P.code)}</p>
    <div class="player-card-wrap">${cardHTML(playerCard(P.name), { player: true })}</div>
    <p class="hint">Tu es dans la salle. La partie commence dès que l'hôte la lance.</p>
    <ul class="roster">${P.st.players.map(p => `<li class="${p.id === P.id ? "me" : ""}"><span class="dot" aria-hidden="true"></span>${esc(p.name)}</li>`).join("")}</ul>
    ${leaveLink}
  </section>`;
  bindLeave();
}
// Pendant les moments en commun : on regarde l'écran hôte
function playerWatch(){
  const st = P.st, ph = st.phase;
  const done = st.status ? Object.values(st.status).filter(s => s.done).length : 0;
  const title = { startSpin: "Roulette<br>des jokers", draft: "Deck<br>envoyé", show: "Présen&shy;tation", spin: "Roulettes", revealTeams: "Révélation", reveal: "Révélation", election: "Élections", final: "Le<br>podium" }[ph] || "Regarde l'écran";
  const text = ph === "draft" ? (P.hand || myDone() ? `${done} sur ${st.players.length} ont validé. La présentation commence dès que tout le monde a fini.` : "Ton booster arrive…")
    : ph === "startSpin" ? "L'hôte fait tourner la roulette : chacun gagne un joker de départ."
    : ph === "show" ? `Tour ${st.round} : l'hôte révèle les choix de chacun. Prépare tes arguments.`
    : ph === "spin" ? "Bonus pour la meilleure équipe, malus pour la moins bonne."
    : ph === "revealTeams" || ph === "reveal" ? `Révélation de l'équipe de ${esc(st.revealName || "")}.`
    : ph === "election" ? `Meilleure équipe ${esc(st.electCat || "")} : débattez, puis votez sur l'écran.`
    : "La partie est terminée. Regarde le podium sur l'écran hôte.";
  app.innerHTML = `<section class="screen handoff">
    <div class="wait"><span class="pulse" aria-hidden="true"></span><p class="meta">Regarde l'écran hôte</p>
      <h1 class="big">${title}</h1><p class="hint">${text}</p></div>
    ${myJokers()}
    ${teamBox()}
    ${leaveLink}
  </section>`;
  bindLeave();
}

function playerBooster(){
  const h = P.hand, kind = h.kind;
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">${esc(P.name)}, tour ${P.st.round + 1} sur ${P.st.rounds}</p>
    ${kind === "cursed" ? `<p class="note bad">Booster maudit : que des cartes faibles.</p>` : ""}
    ${kind === "legend" ? `<p class="note good">Booster Légendaire : que des cartes fortes !</p>` : ""}
    ${kind === "relance" ? `<p class="note good">Joker Relance : voici un tout nouveau booster.</p>` : ""}
    ${h.blind ? `<p class="note bad">Malus stats cachées : stats et rareté cachées pendant ce tour.</p>` : ""}
    <button class="pack ${kind === "cursed" ? "cursed" : kind === "legend" ? "legend" : ""}" id="pack" aria-label="Ouvrir le booster">
      <span class="skin body-piece" style="clip-path:polygon(${TEAR_BODY})">
        <span class="p-brand">DRAFT DES ANCIENS</span>
        <span class="p-t">${kind === "legend" ? "Légende" : kind === "cursed" ? "Maudit" : "Booster"}</span>
        <span class="p-s">${kind === "legend" ? "Édition dorée" : kind === "cursed" ? "Que des faibles" : HAND + " cartes, édition EVG"}</span>
      </span>
      <span class="skin top-piece" style="clip-path:polygon(${TEAR_TOP})"></span>
      <span class="burst"></span><span class="rip"></span><span class="swipe-hint" aria-hidden="true"></span>
    </button>
    <p class="hint">Glisse ton doigt sur le haut du booster pour le déchirer, ou touche-le.</p>
  </section>`;
  bindTear(q("#pack"), () => { P.open = true; dealAnim = true; sendP({ t: "opened", id: P.id }); renderPlayer(); });
}
function playerFlip(){
  const h = P.hand;
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${esc(P.name)}</span><span>Tour ${P.st.round + 1}/${P.st.rounds}</span></header>
    <p class="hint">Touche chaque carte pour la retourner.</p>
    <div class="hand">${h.cards.map((c, i) => `<button class="flipwrap ${dealAnim ? "deal" : ""}" style="--d:${i}" data-flip="${i}" aria-label="Retourner la carte ${i + 1}">
      <span class="flipper ${P.flipped[i] ? "on" : ""}">${cardHTML(c, { cls: "front" + (h.blind ? " blind" : "") })}${backHTML()}</span></button>`).join("")}</div>
    <button class="btn ghost" id="all">Tout retourner</button>
    <button class="btn main" id="place">Placer mes cartes</button>
  </section>`;
  dealAnim = false;
  qa("[data-flip]").forEach(b => b.onclick = () => {
    const i = +b.dataset.flip; if(P.flipped[i]) return;
    b.querySelector(".flipper").classList.add("on"); P.flipped[i] = true; cardSound(h.cards[i]);
  });
  q("#all").onclick = () => qa("[data-flip]").forEach((b, k) => setTimeout(() => { if(b.isConnected) b.click(); }, k * 120));
  q("#place").onclick = () => { P.placing = true; renderPlayer(); };
}

function playerPick(){
  const h = P.hand, blind = h.blind;
  const placed = new Set(Object.values(P.assign));
  const free = h.cards.filter(c => !placed.has(c.id));
  const allFilled = CATS.every(c => P.assign[c.id] != null);
  const selCard = h.cards.find(c => c.id === P.sel);
  const filled = CATS.filter(cat => P.assign[cat.id] != null);
  const avg = filled.length ? Math.round(filled.reduce((sum, cat) => sum + catScore(h.cards.find(c => c.id === P.assign[cat.id]), cat), 0) / filled.length) : 0;
  const hint = selCard ? `Choisis l'emplacement de ${esc(selCard.name)} dans ton deck.`
    : !allFilled ? "Touche une carte de ta collection, puis un emplacement du deck."
    : "Deck complet. Touche un emplacement pour retirer une carte, ou valide.";
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${esc(P.name)}</span><span>Tour ${P.st.round + 1}/${P.st.rounds}</span></header>
    ${blind ? `<p class="note bad">Malus stats cachées : tu places tes cartes sans voir les stats ni la rareté.</p>` : ""}
    <div class="deck-panel">
      <div class="deck-head"><span class="deck-title">Ton deck</span><span class="deck-avg" title="Score moyen du deck">${blind ? "?" : avg}<small>score moyen</small></span></div>
      <div class="deck ${selCard ? "armed" : ""}">${CATS.map(cat => {
        const c = h.cards.find(x => x.id === P.assign[cat.id]);
        return `<button class="dslot ${c ? "full" : ""} ${!c && selCard && !blind && isExpert(selCard, cat) ? "spec" : ""} ${c && !blind && isExpert(c, cat) ? "match" : ""}" data-cat="${cat.id}" style="--cat:${cat.color}" aria-label="${cat.label}${c ? " : " + esc(c.name) : ", vide"}">
          ${c ? miniHTML(c, { badge: blind ? "?" : catScore(c, cat), expert: !blind && isExpert(c, cat) }) : `<span class="dslot-empty"><span class="plus">+</span></span>`}
          <span class="dslot-lab">${cat.label}${c && !blind && isExpert(c, cat) ? " ★" : ""}</span></button>`;
      }).join("")}</div>
    </div>
    <p class="hint">${hint}</p>
    ${selCard ? `<div class="detail">${cardHTML(selCard, { cls: blind ? "blind" : "" })}
      <div class="detail-side"><p class="detail-t">Meilleurs emplacements</p>
        ${blind ? `<p class="hint">Stats cachées, place au feeling.</p>` :
          CATS.filter(cat => P.assign[cat.id] == null).map(cat => [cat, catScore(selCard, cat)]).sort((x, y) => y[1] - x[1]).slice(0, 3)
          .map(([cat, sc]) => `<button class="fit ${isExpert(selCard, cat) ? "x" : ""}" data-cat="${cat.id}" style="--cat:${cat.color}"><span>${cat.label}${isExpert(selCard, cat) ? `<small>Spécialité, +${Math.round((SPECIALTY_BONUS - 1) * 100)} %</small>` : ""}</span><b>${sc}</b></button>`).join("")}
        <button class="btn ghost" id="unsel">Annuler</button></div></div>` : ""}
    <div class="coll-head"><span class="deck-title">Ta collection</span><span class="meta">${free.length} carte${free.length > 1 ? "s" : ""}</span></div>
    ${P.jokers.length ? `<div class="jokers">${P.jokers.map((t, i) => `<button class="jk" data-jk="${i}">Joker ${JOKERS[t].name}</button>`).join("")}</div>` : ""}
    ${!blind && free.length ? filterHTML(free) : ""}
    <div class="coll">${applyFilter(free).map(c => miniHTML(c, { badge: domainOn !== "all" ? catScore(c, CATS.find(k => k.id === domainOn)) : null, tag: "button", cls: P.sel === c.id ? "sel" : "", attrs: `data-card="${c.id}" aria-pressed="${P.sel === c.id}"` })).join("")
      || `<p class="hint">${free.length ? "Aucune carte de ce niveau dans ta main." : "Toutes tes cartes sont dans le deck."}</p>`}</div>
    <button class="btn main" id="ok" ${allFilled ? "" : "disabled"}>Valider mon deck</button>
    ${teamBox()}
  </section>${pickOverlay()}`;
  qa("[data-card]").forEach(b => b.onclick = () => { const id = +b.dataset.card; P.sel = P.sel === id ? null : id; sfx.click(); renderPlayer(); });
  qa("[data-cat]").forEach(b => b.onclick = () => {
    const cat = b.dataset.cat;
    if(P.sel != null){ P.assign[cat] = P.sel; P.sel = null; sfx.place(); }
    else if(P.assign[cat] != null){ delete P.assign[cat]; sfx.unplace(); }
    renderPlayer();
  });
  qa("[data-filter]").forEach(b => b.onclick = () => { filterOn = b.dataset.filter; sfx.click(); renderPlayer(); });
  qa("[data-domain]").forEach(b => b.onclick = () => { domainOn = b.dataset.domain; sfx.click(); renderPlayer(); });
  const u = q("#unsel"); if(u) u.onclick = () => { P.sel = null; renderPlayer(); };
  qa("[data-jk]").forEach(b => b.onclick = () => useMyJoker(P.jokers[+b.dataset.jk]));
  q("#ok").onclick = () => { sendP({ t: "deck", id: P.id, n: h.n, assign: P.assign }); P.sent = h.round + "-" + h.n; sfx.place(); renderPlayer(); };
  bindPickOverlay();
}
function useMyJoker(type){
  if(type === "espion" || type === "sabotage"){ P.overlay = { kind: "target", type }; renderPlayer(); return; }
  askConfirm(`Utiliser le joker ${JOKERS[type].name} ? ${JOKERS[type].text}`, () => { sendP({ t: "joker", id: P.id, n: P.hand.n, type }); sfx.click(); }, "Utiliser le joker");
}
function pickOverlay(){
  const o = P.overlay; if(!o) return "";
  if(o.kind === "target") return `<div class="ov"><div class="ov-box"><h2>Joker ${JOKERS[o.type].name}</h2><p class="hint">${JOKERS[o.type].text} Choisis ta cible.</p>
    ${P.st.players.filter(p => p.id !== P.id).map(p => `<button class="btn main" data-target="${esc(p.id)}">${esc(p.name)}</button>`).join("")}
    <button class="btn ghost" data-close>Annuler</button></div></div>`;
  if(o.kind === "spy") return `<div class="ov"><div class="ov-box"><h2>Équipe de ${esc(o.name)}</h2>${teamHTML({ team: o.team || emptyTeam() }, false)}<button class="btn main" data-close>Fermer</button></div></div>`;
  return "";
}
function bindPickOverlay(){
  qa("[data-close]").forEach(b => b.onclick = () => { P.overlay = null; renderPlayer(); });
  qa("[data-target]").forEach(b => b.onclick = () => { sendP({ t: "joker", id: P.id, n: P.hand.n, type: P.overlay.type, target: b.dataset.target }); P.overlay = null; sfx.click(); renderPlayer(); });
}

/* =========================================================
   L'hôte joue aussi, sur le même écran
   Ses actions de joueur vont directement à l'hôte, sans passer par internet,
   et ce que l'hôte envoie aux joueurs lui est aussi livré.
   ========================================================= */
let view = "host";
const PLAY_PHASES = ["draft"]; // phases où les joueurs agissent sur leur téléphone
const hostPlays = () => role === "host" && !!H && !!H.me;
function sendP(m){ if(role === "host"){ if(hostPlays()) setTimeout(() => onHostMsg(m), 0); } else send(m); }
function deliverLocal(payload){ if(hostPlays()){ const copy = JSON.parse(JSON.stringify(payload)); setTimeout(() => { if(hostPlays()) onPlayerMsg(copy); }, 0); } }
const myTurn = () => !!P.st && (P.st.phase === "draft" && !!P.hand && P.hand.round === P.st.round && !myDone() && P.sent !== P.hand.round + "-" + P.hand.n);
const playBtn = document.createElement("button");
playBtn.className = "play-switch"; playBtn.hidden = true;
document.body.appendChild(playBtn);
playBtn.onclick = () => { view = view === "play" ? "host" : "play"; sfx.click(); lastHostKey = lastPlayerKey = null; view === "play" ? renderPlayer() : renderHost(); };
function paintPlay(){
  const on = hostPlays() && PLAY_PHASES.includes(H.phase);
  playBtn.hidden = !on; document.body.classList.toggle("has-play", on);
  if(!on) return;
  const todo = view === "host" && myTurn();
  playBtn.textContent = view === "play" ? "Retour à l'écran hôte" : todo ? "À toi de jouer !" : "Voir mon jeu";
  playBtn.classList.toggle("todo", todo);
}
const hostJoinHTML = () => H.me
  ? `<p class="hint">Tu joues aussi, en tant que <strong>${esc(H.me.name)}</strong>. Pendant la partie, le bouton en bas de l'écran passe de l'écran hôte à ton jeu. <button class="link" id="unjoin">Ne plus jouer</button></p>`
  : `<form class="host-join" id="hj" novalidate><input class="field solo" id="hjName" maxlength="24" autocomplete="given-name" placeholder="Ton prénom" aria-label="Ton prénom"><button class="btn gold" type="submit">Je joue aussi</button></form>
     <p class="hint">Tu peux jouer depuis cet écran, ou rejoindre avec un autre téléphone.</p>`;
function bindHostJoin(){
  const f = q("#hj");
  if(f) f.onsubmit = e => { e.preventDefault(); const name = q("#hjName").value.trim().slice(0, 24); if(!name) return;
    H.me = { id: P.id, name }; online.add(P.id); P.code = H.code; P.name = name; P.st = null; saveH(); onHostMsg({ t: "hello", id: P.id, name }); };
  const u = q("#unjoin");
  if(u) u.onclick = () => { const id = H.me.id; H.me = null; H.players = H.players.filter(p => p.id !== id); saveH(); broadcast(); renderHost(); };
}

boot();
})();
