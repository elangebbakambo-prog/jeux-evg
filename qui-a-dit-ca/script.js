/* =========================================================
   RÉGLAGES
   ========================================================= */
const DEFAULT_PLAYERS = ["Elange","Ismaël","Jovan","Chris","Ysli"];
// Exemples provisoires : remplace-les depuis l'écran « Préparer les questions »
const EXAMPLES = [
  { type:"dit",  text:"Je m'échauffe jamais, mon corps est déjà chaud.", answer:"Jovan" },
  { type:"fait", text:"S'est trompé de salle le jour d'une audition.", answer:"Elange" },
  { type:"dit",  text:"Le son était pas bon, c'est pour ça que j'ai raté mon passage.", answer:"Chris" },
  { type:"fait", text:"A ressorti la même routine pendant trois battles de suite.", answer:"Ysli" },
  { type:"dit",  text:"Je viens juste regarder ce soir. (Il a dansé jusqu'à 5 h.)", answer:"Ismaël" },
  { type:"fait", text:"A appris une choré entière la veille du spectacle.", answer:"Chris" },
  { type:"dit",  text:"Compte en 8, s'il te plaît, je suis perdu.", answer:"Ysli" },
  { type:"fait", text:"A tenté un freeze en soirée et a fini dans la table basse.", answer:"Jovan" },
  { type:"qui",  text:"Ce sont des jumeaux français.\nIls ont dansé pour Beyoncé.\nIls ont gagné la première saison de World of Dance.", answer:"Les Twins" }
].map(q => Object.assign({ ex:true }, q));
const POINTS_FOUND = 1;     // point pour chaque joueur qui a trouvé
const POINTS_HIDDEN = 2;    // points pour le coupable (s'il joue) si personne ne l'a trouvé
const TYPES = {
  dit:  { tag:"Dit",       title:"Qui a dit ça ?",  label:"Phrase culte" },
  fait: { tag:"Fait",      title:"Qui a fait ça ?", label:"Anecdote" },
  qui:  { tag:"Qui est-ce", title:"Qui est-ce ?",   label:"Indices" }
};
const KEY = "qui-a-dit-v1";

/* =========================================================
   Outils
   ========================================================= */
const app = document.getElementById("app");
const $ = s => app.querySelector(s), $$ = s => app.querySelectorAll(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const HUES = ["#E1192B","#B10E1C","#D63A2F","#8A0F18","#C41E3A","#9E1B32","#E0434F","#A4161A"];
const hue = name => { let h = 0; for(const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return HUES[h % HUES.length]; };
const av = name => `<span class="av" style="--h:${hue(name)}" aria-hidden="true">${esc([...String(name)][0] || "?")}</span>`;
const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

let store = load();
function load(){
  try{ const r = localStorage.getItem(KEY); if(r) return JSON.parse(r); }catch(e){}
  return { players: DEFAULT_PLAYERS.slice(), bank: EXAMPLES.slice(), game: null };
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
  const seq = (fs, step, o) => fs.forEach((f,i) => tone(f, o.dur || .25, Object.assign({}, o, { at:i*step })));
  return {
    get on(){ return on; },
    toggle(){ on = !on; try{ localStorage.setItem(KEY + "-sound", on ? "on" : "off"); }catch(e){} if(on) this.click(); },
    click(){ tone(660, .06, { type:"triangle", vol:.12 }); },
    beep(){ tone(523, .18, { type:"square", vol:.1 }); },
    go(){ seq([784, 1047], .1, { type:"square", vol:.1, dur:.3 }); },
    tick(){ tone(1500 + Math.random()*300, .03, { type:"square", vol:.05 }); },
    reveal(){ seq([392, 523, 659, 784], .09, { type:"sawtooth", vol:.07, dur:.3 }); tone(1047, .9, { type:"triangle", vol:.1, at:.36 }); },
    point(){ tone(880, .1, { type:"triangle", vol:.12, slide:1320 }); },
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
let screen = store.game ? "game" : "home", lastScreen = null;
let draft = { type:"dit", text:"", answer:null };
let timers = [];
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

function render(){
  ({ home:renderHome, bank:renderBank, game:renderGame })[screen]();
  if(screen !== lastScreen){ window.scrollTo(0,0); lastScreen = screen; }
}
const players = () => store.players.map(n => n.trim()).filter(Boolean);
const MODES = {
  dit: { title:"Qui a dit ça ?", text:"Phrases cultes et anecdotes. Tout le monde pointe ou crie le coupable en même temps.", types:["dit","fait"] },
  qui: { title:"Qui est-ce ?",   text:"Des indices révélés un par un. Plus tu trouves tôt, plus tu marques de points.", types:["qui"] }
};
const playable = mode => store.bank.filter(q => String(q.answer || "").trim() && (!mode || MODES[mode].types.includes(q.type)));
const isPlayer = name => players().some(p => same(p, name));
// Danseurs extérieurs déjà utilisés comme réponse (pour les retrouver en un clic)
const others = () => [...new Set(store.bank.map(q => q.answer).filter(a => a && !isPlayer(a)))];

/* ---------- Accueil ---------- */
function renderHome(){
  const exs = store.bank.filter(q => q.ex).length;
  app.innerHTML = `<section class="screen">
    <h1 class="title">Qui a<br>dit ça ?</h1>
    <p class="lead">Deux modes de jeu sur la bande et sur les danseurs que vous connaissez. Préparez les questions, choisissez un mode, puis jouez tous autour du téléphone.</p>
    <h2 class="h2">Joueurs</h2>
    <ol class="players">${store.players.map((n,i) => `<li>${av(n || "?")}
      <input class="field" id="pl-${i}" data-i="${i}" value="${esc(n)}" placeholder="Prénom" aria-label="Joueur ${i+1}">
      <button class="x" data-rm="${i}" aria-label="Retirer ce joueur">×</button></li>`).join("")}</ol>
    <button class="btn ghost" id="add">Ajouter un joueur</button>
    <h2 class="h2">Modes de jeu</h2>
    ${Object.entries(MODES).map(([k,m]) => { const n = playable(k).length; return `<article class="mode ${k}">
      <h3>${m.title}</h3><p>${m.text}</p>
      <div class="mode-foot"><span><b>${n}</b> question${n > 1 ? "s" : ""}</span>
        <button class="btn main" data-mode="${k}" ${n ? "" : "disabled"}>Jouer</button></div>
      ${n ? "" : `<p class="hint">Ajoute d'abord des questions ${k === "qui" ? "« Qui est-ce ? »" : "« Qui a dit ça ? » ou « Qui a fait ça ? »"}.</p>`}</article>`; }).join("")}
    ${exs ? `<p class="hint">Dont ${exs} question${exs > 1 ? "s" : ""} d'exemple à remplacer par les vraies.</p>` : ""}
    <button class="btn gold" id="bank">Préparer les questions</button>
  </section>`;
  $$("input[data-i]").forEach(inp => inp.oninput = () => { store.players[+inp.dataset.i] = inp.value; save(); });
  $$("input[data-i]").forEach(inp => inp.onchange = () => render());
  $$("[data-rm]").forEach(b => b.onclick = () => { if(store.players.length > 2){ store.players.splice(+b.dataset.rm, 1); save(); render(); } });
  $("#add").onclick = () => { store.players.push(""); save(); render(); const all = $$("input[data-i]"); all[all.length-1].focus(); };
  $("#bank").onclick = () => { screen = "bank"; render(); };
  $$("[data-mode]").forEach(b => b.onclick = () => startGame(b.dataset.mode));
}

/* ---------- Préparer les questions ---------- */
function renderBank(){
  const ps = players();
  const known = others();
  app.innerHTML = `<section class="screen">
    <button class="btn ghost" id="back">Retour</button>
    <h1 class="title">Les<br>questions</h1>
    <p class="lead">Écris une phrase, une anecdote ou des indices, puis choisis la réponse : l'un de vous ou n'importe quel danseur. Tout reste sur ce téléphone.</p>

    <h2 class="h2">Nouvelle question</h2>
    <div class="seg three" role="group" aria-label="Type de question">${Object.entries(TYPES).map(([k,t]) =>
      `<button data-type="${k}" aria-pressed="${draft.type === k}">${t.title}</button>`).join("")}</div>
    <textarea class="field" id="qtext" placeholder="${draft.type === "dit" ? "La phrase, mot pour mot. Ex. : On fait juste un dernier passage." : draft.type === "fait" ? "L'anecdote. Ex. : A perdu sa chaussure en plein battle." : "Un indice par ligne, du plus dur au plus facile."}" aria-label="Texte de la question">${esc(draft.text)}</textarea>
    ${draft.type === "qui" ? `<p class="hint">Va à la ligne entre chaque indice : ils seront révélés un par un.</p>` : ""}
    <p class="hint">La réponse, parmi vous :</p>
    <div class="pick">${ps.map(p => `<button class="chip" data-ans="${esc(p)}" aria-pressed="${!!draft.answer && same(draft.answer, p)}">${av(p)}${esc(p)}</button>`).join("")}</div>
    <p class="hint">Ou un autre danseur :</p>
    ${known.length ? `<div class="pick">${known.map(p => `<button class="chip" data-ans="${esc(p)}" aria-pressed="${!!draft.answer && same(draft.answer, p)}">${av(p)}${esc(p)}</button>`).join("")}</div>` : ""}
    <div class="row"><input class="field" id="other" placeholder="Nom du danseur" aria-label="Nom d'un autre danseur" value="${draft.answer && !isPlayer(draft.answer) && !known.some(k => same(k, draft.answer)) ? esc(draft.answer) : ""}"></div>
    <button class="btn main" id="addq" ${draft.text.trim() && draft.answer ? "" : "disabled"}>Ajouter la question</button>

    <h2 class="h2">${store.bank.length} question${store.bank.length > 1 ? "s" : ""}</h2>
    ${store.bank.length ? `<ol class="qlist">${store.bank.map((q,i) => `<li class="qitem">
        <p><span class="tag ${q.type}">${TYPES[q.type].tag}</span>${q.ex ? `<span class="tag ex">Exemple</span>` : ""}${esc(q.text).replace(/\n/g, " · ")}</p>
        <button class="del" data-del="${i}" aria-label="Supprimer cette question">×</button>
        <p class="q-ans">Réponse : <b>${esc(q.answer)}</b>${isPlayer(q.answer) ? "" : " (danseur extérieur)"}</p></li>`).join("")}</ol>`
      : `<p class="hint">Aucune question pour l'instant. Ajoute la première juste au-dessus.</p>`}
    ${store.bank.some(q => q.ex) ? `<button class="btn ghost" id="clearEx">Supprimer les exemples</button>` : `<button class="link" id="restoreEx">Remettre les exemples</button>`}
  </section>`;
  $("#back").onclick = () => { screen = "home"; render(); };
  $$("[data-type]").forEach(b => b.onclick = () => { draft.type = b.dataset.type; draft.text = $("#qtext").value; render(); });
  const ta = $("#qtext");
  ta.oninput = () => { draft.text = ta.value; $("#addq").disabled = !(draft.text.trim() && draft.answer); };
  $$("[data-ans]").forEach(b => b.onclick = () => { draft.answer = b.dataset.ans; draft.text = ta.value; sfx.click(); render(); $("#addq").focus(); });
  const oth = $("#other");
  oth.oninput = () => {
    if(oth.value.trim()){ draft.answer = oth.value.trim(); $$("[data-ans]").forEach(b => b.setAttribute("aria-pressed", "false")); }
    else if(draft.answer && !isPlayer(draft.answer) && !known.some(k => same(k, draft.answer))) draft.answer = null;
    $("#addq").disabled = !(ta.value.trim() && draft.answer);
  };
  $("#addq").onclick = () => {
    store.bank.unshift({ type:draft.type, text:draft.text.trim().replace(/^[«"“]\s*|\s*[»"”]$/g, ""), answer:draft.answer.trim() });
    draft = { type:draft.type, text:"", answer:null }; save(); sfx.point(); render(); $("#qtext").focus();
  };
  $$("[data-del]").forEach(b => b.onclick = () => {
    const q = store.bank[+b.dataset.del];
    askConfirm(`Supprimer « ${q.text.slice(0, 60)}${q.text.length > 60 ? "…" : ""} » ?`, () => { store.bank.splice(+b.dataset.del, 1); save(); render(); }, "Supprimer");
  });
  const ce = $("#clearEx"); if(ce) ce.onclick = () => askConfirm("Supprimer les questions d'exemple ? Les tiennes restent.", () => { store.bank = store.bank.filter(q => !q.ex); save(); render(); }, "Supprimer les exemples");
  const re = $("#restoreEx"); if(re) re.onclick = () => { store.bank = store.bank.concat(EXAMPLES); save(); render(); };
}

/* =========================================================
   Partie
   ========================================================= */
function startGame(mode){
  const ps = players();
  store.game = { mode, players: ps, order: shuffle(playable(mode)), idx:0, clue:1, step:"question", found:[], scores: Object.fromEntries(ps.map(p => [p, 0])) };
  save(); screen = "game"; render();
}
const G = () => store.game;
const curQ = () => G().order[G().idx];
const culprit = q => G().players.find(p => same(p, q.answer)) || q.answer;
// Mode « Qui est-ce ? » : trouver au 1er indice rapporte le plus
const cluePoints = q => { const n = q.text.split(/\n+/).filter(t => t.trim()).length; return Math.max(1, n - Math.min(G().clue || 1, n) + 1); };
const pointsFor = q => q.type === "qui" ? cluePoints(q) : POINTS_FOUND;
const inRoom = q => G().players.some(p => same(p, q.answer));

function renderGame(){
  clearTimers();
  const g = G();
  if(g.step === "end") return renderEnd();
  const q = curQ(), n = g.order.length;
  const head = `<header class="bar"><span>Question ${g.idx + 1} sur ${n}</span><span>${TYPES[q.type].label}</span></header>
    <div class="progress" aria-hidden="true"><i style="width:${(g.idx / n) * 100}%"></i></div>`;
  const clues = q.text.split(/\n+/).map(t => t.trim()).filter(Boolean);
  const shown = q.type === "qui" ? Math.max(1, Math.min(g.clue || 1, clues.length)) : 0;
  const who = inRoom(q) ? "Quelqu'un dans cette pièce" : "Un danseur";
  const quote = q.type === "qui"
    ? `<div class="quote qui"><ol class="clues">${clues.slice(0, g.step === "question" ? shown : clues.length).map((c,i) => `<li class="${i === shown - 1 && g.step === "question" ? "fresh" : ""}"><span>Indice ${i+1}</span>${esc(c)}</li>`).join("")}</ol>
        <small>${g.step === "question" ? `Indice ${shown} sur ${clues.length}` : "Qui est ce danseur ?"}</small></div>`
    : `<blockquote class="quote ${q.type}">${esc(q.text)}<small>${who} ${q.type === "dit" ? "a dit ça" : "a fait ça"}</small></blockquote>`;
  const shout = inRoom(q) && q.type !== "qui" ? "Pointez !" : "Criez<br>le nom !";

  if(g.step === "question"){
    app.innerHTML = `<section class="screen">${head}
      <h1 class="qtype">${TYPES[q.type].title}</h1>
      ${quote}
      <p class="hint">${q.type === "qui" ? "Révèle les indices un par un. Dès que quelqu'un pense savoir, lance le compte à rebours : tout le monde crie son nom en même temps." : inRoom(q) ? "Lis à voix haute, puis lance le compte à rebours : tout le monde pointe le coupable du doigt." : "Lis à voix haute, puis lance le compte à rebours : tout le monde crie son nom en même temps."}</p>
      ${q.type === "qui" && shown < clues.length ? `<button class="btn gold" id="clue">Indice suivant (${shown + 1}/${clues.length})</button>
        <p class="hint center">Trouver maintenant : +${cluePoints(q)} point${cluePoints(q) > 1 ? "s" : ""}. Au prochain indice : +${Math.max(1, cluePoints(q) - 1)}.</p>` : ""}
      <button class="btn main" id="count">3, 2, 1… ${shout.replace("<br>", " ")}</button>
      <button class="link" id="quit">Arrêter la partie</button>
    </section>`;
    const cl = $("#clue"); if(cl) cl.onclick = () => { g.clue = shown + 1; save(); sfx.point(); render(); };
    $("#count").onclick = () => { g.step = "count"; save(); render(); };
    $("#quit").onclick = () => askConfirm("Arrêter la partie ? Les scores seront perdus.", () => { store.game = null; save(); screen = "home"; render(); }, "Arrêter");
    return;
  }

  if(g.step === "count"){
    const show = (txt, go) => { app.innerHTML = `<section class="screen count"><div class="num ${go ? "go" : ""}" aria-live="assertive">${txt}</div></section>`; };
    if(reduce()){ show(shout, true); sfx.go(); later(() => { g.step = "reveal"; save(); render(); }, 900); return; }
    show("3"); sfx.beep();
    later(() => { show("2"); sfx.beep(); }, 900);
    later(() => { show("1"); sfx.beep(); }, 1800);
    later(() => { show(shout, true); sfx.go(); }, 2700);
    later(() => { g.step = "reveal"; save(); render(); }, 4200);
    return;
  }

  if(g.step === "reveal"){
    const c = culprit(q);
    app.innerHTML = `<section class="screen">${head}
      ${quote}
      <p class="meta center">Le coupable est…</p>
      <div class="slot" id="slot"><span class="slot-name" id="slotName">?</span></div>
      <div id="after"></div>
    </section>`;
    const nameEl = $("#slotName"), slot = $("#slot");
    const land = () => {
      nameEl.textContent = c; slot.classList.add("landed"); sfx.reveal();
      $("#after").innerHTML = `<div class="screen"><div class="culprit">${av(c)}<p><span class="meta">${q.type === "dit" ? "L'a dit" : q.type === "fait" ? "L'a fait" : "C'était"}</span><strong>${esc(c)}</strong></p></div>
        <button class="btn main" id="toScore">Qui avait trouvé ?</button></div>`;
      $("#toScore").onclick = () => { g.step = "score"; g.found = []; save(); render(); };
    };
    if(reduce()){ land(); return; }
    // Les prénoms défilent de plus en plus lentement, puis s'arrêtent sur le coupable
    const answers = [...new Set(g.order.map(x => culprit(x)))];
    const pool = shuffle([...new Set([...g.players, ...answers, c])]);
    let i = 0, delay = 55, t = 0;
    while(t < 2600){
      const name = pool[i++ % pool.length];
      later(() => { nameEl.textContent = name; sfx.tick(); }, t);
      t += delay; delay *= 1.12;
    }
    later(land, t + 120);
    return;
  }

  if(g.step === "score"){
    const c = culprit(q), guessers = g.players.filter(p => !same(p, c));
    app.innerHTML = `<section class="screen">${head}
      <div class="culprit">${av(c)}<p><span class="meta">${q.type === "dit" ? "L'a dit" : q.type === "fait" ? "L'a fait" : "C'était"}</span><strong>${esc(c)}</strong></p></div>
      <h2 class="h2">Qui avait trouvé ${esc(c)} ?</h2>
      <p class="hint">Touche tous ceux qui ont trouvé (+${pointsFor(q)}${q.type === "qui" ? `, trouvé à l'indice ${Math.min(g.clue || 1, clues.length)}` : ""}).${inRoom(q) ? ` Si personne n'a trouvé, ${esc(c)} gagne +${POINTS_HIDDEN} pour s'être bien caché.` : ""}</p>
      <div class="pick">${guessers.map(p => `<button class="chip found" data-found="${esc(p)}" aria-pressed="${g.found.includes(p)}">${av(p)}${esc(p)}</button>`).join("")}</div>
      <button class="btn main" id="next">${g.idx + 1 >= g.order.length ? "Voir le classement" : "Question suivante"}</button>
      <div class="mini-rank" aria-label="Scores">${Object.entries(g.scores).sort((a,b) => b[1] - a[1]).map(([p,s]) => `<span>${esc(p)} <b>${s}</b></span>`).join("")}</div>
    </section>`;
    $$("[data-found]").forEach(b => b.onclick = () => {
      const p = b.dataset.found, k = g.found.indexOf(p);
      k >= 0 ? g.found.splice(k, 1) : (g.found.push(p), sfx.point());
      b.setAttribute("aria-pressed", k < 0); save();
    });
    $("#next").onclick = () => {
      g.found.forEach(p => g.scores[p] += pointsFor(q));
      if(!g.found.length && g.scores[c] != null) g.scores[c] += POINTS_HIDDEN;
      g.idx++; g.found = []; g.clue = 1;
      g.step = g.idx >= g.order.length ? "end" : "question";
      save(); render(); if(g.step === "end") sfx.fanfare();
    };
  }
}

function renderEnd(){
  const g = G(), rank = Object.entries(g.scores).sort((a,b) => b[1] - a[1]);
  app.innerHTML = `<section class="screen">
    <p class="meta">${esc(MODES[g.mode || "dit"].title)}</p>
    <h1 class="title">Le<br>classement</h1>
    <p class="lead">${esc(rank[0][0])} connaît la bande mieux que personne.</p>
    <ol class="ranking">${rank.map(([p,s],i) => `<li><span class="pos">${i+1}</span>${av(p)}<span class="nm">${esc(p)}</span><span class="sc">${s}</span></li>`).join("")}</ol>
    <button class="btn main" id="again">Rejouer</button>
    <button class="btn ghost" id="home">Retour à l'accueil</button>
  </section>`;
  $("#again").onclick = () => startGame(g.mode || "dit");
  $("#home").onclick = () => { store.game = null; save(); screen = "home"; render(); };
}

render();
