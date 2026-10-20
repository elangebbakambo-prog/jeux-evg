/* =========================================================
   RÉGLAGES : c'est ici que tu modifies le jeu
   ========================================================= */
const DEFAULT_PLAYERS = ["Elange","Ismaël","Jovan","Chris","Ysli"];
const ROUNDS = 5;          // partie normale
const SHORT_ROUNDS = 3;    // partie courte
const R = () => (S && S.rounds) || ROUNDS;
const JOKER_CHANCE = 0;   // chance de trouver un joker dans un booster (0 = jokers uniquement par la roulette)

const DANCERS = ["Ismaël","Elange","Vita","Julie","Dimust","Aline","Jikay","Soyuz","Yoh","Kodi","Dialo","Ronyl","Sobek",
  "Marie","Ughost","Viro","Clément","Suki","Leah","Noth","Imou","Semoss","Lumi","Paul (Meute Céleste)","Evion",
  "Joann","Youyou","Missile","Pakissi","Richard Pop","Ziko","Forge","Ma2t","Hervé","Ness","Erine","Spider",
  "Kuty","Laura Nala","Rubix","Hamza","Drop","Poppin J","Lossejoint","Demannotche","Mels","Junior","Miguel",
  "Xelyna","Dyken","Odilon","Deadhomies","Jean-Michel Cruel","Willis","Nastya","Batalla","Andrey Stylez",
  "Rochka","Alex the Cage","Icee","Sam Yudat","Lindsay","Nicurl","April","Reverse","Dereck","Krissy","Doyah",
  "Physs","Jimmy Yudat","Lilkens"];

// Carte spéciale du futur marié (rareté Mythique). Son prénom se règle sur l'écran d'accueil.
const GROOM = {
  moves: [["Dernier jour de liberté", 200], ["Oui fatal", 180]],
  talent: ["Enterrement de vie de garçon", "Toute son équipe gagne +10 en ambiance ce soir."],
  weak: "La belle-famille", res: "La gueule de bois",
  flavor: "Il a dit oui. On lui doit au moins un dernier battle."
};

// Spécialités : chaque danseur est expert dans un domaine. Placé dans sa spécialité, son score est multiplié.
const SPECIALTY_BONUS = 1.3; // +30 % dans sa spécialité
// Choisis toi-même la spécialité de certains danseurs (battle, crea, presta, chore, workshop, best, bad).
// Les autres reçoivent automatiquement la catégorie où leurs stats sont les meilleures.
const SPECIALTY_OVERRIDES = {}; // ex. : { "Kodi":"battle", "Ughost":"chore" }

// Choisis toi-même la rareté de certains danseurs. Les autres sont tirés au hasard.
const RARITY_OVERRIDES = {}; // ex. : { "Kodi":"Légendaire", "Ughost":"Rare" }

// Chaque catégorie rapporte des points selon certaines stats (pour le score et les bonus/malus)
const CATS = [
  { id:"battle",   label:"Battle",      color:"var(--battle)",   hint:"Flow + Cardio",          score:s => s.Flow + s.Cardio },
  { id:"crea",     label:"Créa",        color:"var(--crea)",     hint:"Musicalité + Flow",      score:s => s["Musicalité"] + s.Flow },
  { id:"presta",   label:"Prestation",  color:"var(--presta)",   hint:"Technique + Cardio",     score:s => s.Technique + s.Cardio },
  { id:"chore",    label:"Chorégraphe", color:"var(--chore)",    hint:"Musicalité + Technique", score:s => s["Musicalité"] + s.Technique },
  { id:"workshop", label:"Workshop",    color:"var(--workshop)", hint:"Technique + Flow",       score:s => s.Technique + s.Flow },
  { id:"best",     label:"Best dancer", color:"var(--best)",     hint:"Toutes les stats",       score:s => (s.Flow + s.Technique + s["Musicalité"] + s.Cardio) / 2 },
  { id:"bad",      label:"Bad dancer",  color:"var(--bad)",      hint:"Stats les plus basses",  score:s => 200 - (s.Flow + s.Technique + s["Musicalité"] + s.Cardio) / 2 }
];

const JOKERS = {
  relance:  { name:"Relance",    text:"Retire un booster complet pour ce tour." },
  espion:   { name:"Espion",     text:"Regarde l'équipe d'un adversaire." },
  sabotage: { name:"Sabotage",   text:"Le prochain booster d'un adversaire ne contiendra que des Communes." },
  xl:       { name:"Booster Légendaire", text:"Remplace ta main par un booster doré : que des Légendaires (complété par des Rares s'il en manque)." }
};

const STYLES = ["Hip-hop","Popping","Locking","Krump","House","Breaking","Waacking","Dancehall","Afro","Voguing"];
const STYLE_COLORS = { "Hip-hop":"#E1192B","Popping":"#B10E1C","Locking":"#D63A2F","Krump":"#8A0F18","House":"#C41E3A",
  "Breaking":"#9E1B32","Waacking":"#E0434F","Dancehall":"#A4161A","Afro":"#BF3A2B","Voguing":"#D1203C" };
const MOVES = {
  "Hip-hop":["Bounce du quartier","Groove infini"], "Popping":["Hit sec","Animation robot"],
  "Locking":["Point qui tue","Lock et sourire"], "Krump":["Chest pop","Stomp de rage"],
  "House":["Jack sans fin","Lofting aérien"], "Breaking":["Freeze éclair","Windmill tornade"],
  "Waacking":["Bras hélice","Pose de star"], "Dancehall":["Gully creepa","Bad man forward"],
  "Afro":["Pas du village","Gwara gwara"], "Voguing":["Dip mortel","Duckwalk royal"]
};
const STAT_NAMES = ["Flow","Technique","Musicalité","Cardio"];
const FLAVORS = [
  "A gagné un battle en 2009. En parle encore.", "Ne s'échauffe jamais. Se plaint du genou après.",
  "Connaît toute la choré, sauf le début.", "Refuse de danser sans casquette.", "Arrive toujours 20 minutes en retard au cours.",
  "Filme tout pour les réseaux, même l'échauffement.", "Danse mieux à 3 h du matin qu'en compétition.",
  "Fait un freeze à chaque anniversaire.", "A toujours une excuse pour ne pas faire le cercle.", "Compte en 8, même pour payer."
];
const PLAYER_FLAVORS = [
  "Ancien pro. Les genoux ont pris leur retraite avant lui.", "Ancien pro. Toujours capable d'un dernier passage.",
  "Ancien pro. Juge les cypher depuis le canapé.", "Ancien pro. Assure que c'était mieux avant.", "Ancien pro. Ressort la tenue de 2012 pour l'occasion."
];
const WEAKNESSES = ["Choré imposée","Sol glissant","Son trop lent","Échauffement obligatoire","Battle à 10 h du matin","Miroir de la salle","Prof qui compte trop vite","Chaussures neuves"];
const RESISTANCES = ["Cypher à 4 h du matin","Son saturé","Public hostile","Dos qui craque","Juge qui dort","Retard du DJ","Scène minuscule","Premier tour de battle"];
const TALENTS = [["Retour de retraite","+20 en Cardio pendant un tour."],["Regard qui tue","L'adversaire perd ses moyens."],
  ["Mémoire de choré","Rattrape n'importe quel compte de 8."],["Freestyle de survie","Ne tombe jamais en panne d'idées."],
  ["Échauffement éclair","Prêt en 30 secondes."],["Ambianceur","Tout le cercle s'enflamme."],
  ["Musicalité divine","Tombe sur chaque break."],["Vieux sage","Donne des conseils que personne n'a demandés."]];

/* ---- Plages de valeurs par rareté ---- */
const RANGES = {
  "Commune":    { stat:[35,74], lvl:[15,55], dmg:[2,7] },
  "Rare":       { stat:[60,88], lvl:[45,80], dmg:[5,10] },
  "Légendaire": { stat:[82,99], lvl:[80,99], dmg:[9,15] },
  "Joueur":     { stat:[60,99], lvl:[70,99], dmg:[6,14] },
  "Mythique":   { stat:[94,99], lvl:[99,99], dmg:[18,20] }
};
const RCLASS = { "Commune":"r-c", "Rare":"r-r", "Légendaire":"r-l", "Joueur":"r-p", "Mythique":"r-m" };
const KEY = "draft-evg-v4";

/* =========================================================
   Outils
   ========================================================= */
const app = document.getElementById("app");
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $ = sel => app.querySelector(sel);
const $$ = sel => app.querySelectorAll(sel);
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function seedFrom(str){ let h = 2166136261; for(const ch of str){ h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pickR = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const randomJoker = () => shuffle(Object.keys(JOKERS))[0];

function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function load(){ try{ const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; }catch(e){ return null; } }
function clearSave(){ try{ localStorage.removeItem(KEY); }catch(e){} }

/* =========================================================
   Sons (générés par le navigateur, aucun fichier à charger)
   ========================================================= */
const sfx = (() => {
  let ctx = null, on = true;
  try{ on = localStorage.getItem("draft-evg-sound") !== "off"; }catch(e){}
  const ac = () => { if(!ctx){ const A = window.AudioContext || window.webkitAudioContext; if(!A) return null; ctx = new A(); } if(ctx.state === "suspended") ctx.resume(); return ctx; };
  function tone(f, dur, { type="sine", vol=.18, at=0, slide=null } = {}){
    const c = ac(); if(!c || !on) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if(slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
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
  const notes = (seq, step, opt) => seq.forEach((f,i) => tone(f, opt.dur || .25, Object.assign({}, opt, { at: i * step })));
  return {
    get on(){ return on; },
    toggle(){ on = !on; try{ localStorage.setItem("draft-evg-sound", on ? "on" : "off"); }catch(e){} if(on) this.click(); },
    click(){ tone(660, .06, { type:"triangle", vol:.12 }); },
    tear(){ noise(.45, { vol:.5, from:6000, to:500 }); tone(140, .3, { type:"sawtooth", vol:.06, slide:60 }); },
    crinkle(){ noise(.05, { vol:.18, from:6000 + Math.random()*2000, to:2500 }); },
    flip(){ noise(.08, { vol:.25, from:3000, to:1500 }); tone(880, .08, { type:"triangle", vol:.08, at:.03 }); },
    rare(){ notes([660, 990], .08, { type:"triangle", vol:.12, dur:.2 }); },
    legend(){ notes([523, 659, 784, 1047], .09, { type:"square", vol:.07, dur:.3 }); tone(1568, .8, { vol:.06, at:.36 }); },
    mythic(){ notes([392, 523, 659, 784, 1047, 1319], .1, { type:"sawtooth", vol:.06, dur:.35 });
      [1568, 2093, 2637].forEach((f,i) => tone(f, 1.2, { vol:.05, at:.6 + i*.08 })); noise(1.2, { vol:.08, at:.6, from:9000, to:4000 }); },
    place(){ tone(220, .12, { type:"triangle", vol:.2, slide:110 }); noise(.05, { vol:.15, from:1200, to:400 }); },
    unplace(){ tone(330, .1, { type:"triangle", vol:.12, slide:500 }); },
    tick(at){ tone(1800, .03, { type:"square", vol:.05, at }); },
    win(){ notes([523, 659, 784], .12, { type:"square", vol:.08, dur:.2 }); tone(1047, .6, { type:"square", vol:.08, at:.36 }); },
    malus(){ notes([392, 370, 349], .28, { type:"sawtooth", vol:.08, dur:.3 }); tone(330, .9, { type:"sawtooth", vol:.08, at:.84, slide:220 }); },
    fanfare(){ notes([392, 392, 392, 523, 659, 784, 1047], .13, { type:"square", vol:.08, dur:.25 }); tone(1047, 1.2, { type:"triangle", vol:.1, at:.95 }); },
    spin(dur){ let t = 0, gap = .04; while(t < dur - .2){ this.tick(t); t += gap; gap *= 1.07; } }
  };
})();
function cardSound(c){ const r = cardData(c).rarity; r === "Mythique" ? sfx.mythic() : r === "Légendaire" ? sfx.legend() : r === "Rare" ? sfx.rare() : sfx.flip(); }

// Bouton son, toujours visible
const soundBtn = document.createElement("button");
soundBtn.className = "sound-btn";
const paintSound = () => { soundBtn.textContent = sfx.on ? "Son activé" : "Son coupé"; soundBtn.setAttribute("aria-pressed", sfx.on); };
soundBtn.onclick = () => { sfx.toggle(); paintSound(); };
paintSound(); document.body.appendChild(soundBtn);

/* =========================================================
   Génération des cartes (toujours la même carte pour un même nom)
   ========================================================= */
const dancerStyle = name => pickR(mulberry(seedFrom("S:" + name)), STYLES);
function rollRarity(name){ const x = mulberry(seedFrom("R:" + name))(); return x < 0.08 ? "Légendaire" : x < 0.35 ? "Rare" : "Commune"; }
const cache = {};
function buildData(name, style, rarity){
  const key = name + "|" + style + "|" + rarity;
  if(cache[key]) return cache[key];
  const R = RANGES[rarity], r = mulberry(seedFrom(key));
  const stats = STAT_NAMES.map(s => [s, between(r, R.stat[0], R.stat[1])]);
  const d = {
    rarity, stats, statsObj: Object.fromEntries(stats),
    level: between(r, R.lvl[0], R.lvl[1]),
    moves: (MOVES[style] || MOVES["Hip-hop"]).map(m => [m, between(r, R.dmg[0], R.dmg[1]) * 10]),
    talent: rarity === "Commune" ? null : pickR(r, TALENTS),
    weak: pickR(r, WEAKNESSES), res: pickR(r, RESISTANCES),
    flavor: pickR(r, rarity === "Joueur" ? PLAYER_FLAVORS : FLAVORS),
    num: String(between(r, 1, 999)).padStart(3, "0")
  };
  return cache[key] = d;
}
const groomName = () => ((S ? S.groom : setupGroom) || "").trim();
const isGroom = name => !!groomName() && String(name).trim().toLowerCase() === groomName().toLowerCase();
function groomData(name, style){
  const key = "GROOM|" + name;
  if(cache[key]) return cache[key];
  const d = Object.assign({}, buildData(name, style, "Mythique"), {
    moves: GROOM.moves, talent: GROOM.talent, weak: GROOM.weak, res: GROOM.res, flavor: GROOM.flavor, num: "001", level: 99 });
  return cache[key] = d;
}
const cardData = c => c.groom ? groomData(c.name, c.style) : buildData(c.name, c.style, RARITY_OVERRIDES[c.name] || rollRarity(c.name));
const playerCard = name => ({ name, style: dancerStyle("P:" + name) });
const rawScore = (card, cat) => cat.score(cardData(card).statsObj);
// Répartition équilibrée des spécialités : à peu près autant d'experts dans chaque domaine
let specMap = null;
function buildSpecMap(){
  const all = DANCERS.map(n => ({ name:n, style:dancerStyle(n) }));
  const stats = {};
  CATS.forEach(cat => {
    const v = all.map(c => rawScore(c, cat)), mean = v.reduce((x,y) => x + y, 0) / v.length;
    stats[cat.id] = { mean, sd: Math.sqrt(v.reduce((x,y) => x + (y - mean) ** 2, 0) / v.length) || 1 };
  });
  const cap = Math.ceil(all.length / CATS.length), count = Object.fromEntries(CATS.map(c => [c.id, 0])), map = {};
  all.forEach(c => { const o = SPECIALTY_OVERRIDES[c.name]; if(o){ map[c.name] = o; count[o]++; } });
  // Toutes les paires (danseur, domaine), de la plus forte à la plus faible par rapport à la moyenne
  const pairs = [];
  all.filter(c => !map[c.name]).forEach(c => CATS.forEach(cat => pairs.push([c.name, cat.id, (rawScore(c, cat) - stats[cat.id].mean) / stats[cat.id].sd])));
  pairs.sort((x,y) => y[2] - x[2]);
  pairs.forEach(([n, id]) => { if(!map[n] && count[id] < cap){ map[n] = id; count[id]++; } });
  return map;
}
function specialty(card){
  if(card.groom) return "best";
  if(SPECIALTY_OVERRIDES[card.name]) return SPECIALTY_OVERRIDES[card.name];
  if(!specMap) specMap = buildSpecMap();
  return specMap[card.name] || "best";
}
const specCat = card => CATS.find(c => c.id === specialty(card));
const isExpert = (card, cat) => specialty(card) === cat.id;
const catScore = (card, cat) => Math.round(rawScore(card, cat) * (isExpert(card, cat) ? SPECIALTY_BONUS : 1));

function cardHTML(c, o = {}){
  const groomP = o.player && isGroom(c.name);
  const d = groomP ? groomData(c.name, c.style) : o.player ? buildData(c.name, c.style, "Joueur") : cardData(c);
  const tag = o.tag || "div";
  const cls = ["tcg", RCLASS[d.rarity], d.rarity !== "Commune" ? "holo" : "", o.player ? "player" : "", o.cls || ""].join(" ");
  const bg = d.rarity === "Mythique" ? "#8A0F18" : o.player ? "#7A0C15" : STYLE_COLORS[c.style];
  return `<${tag} class="${cls}" style="--t:${bg};${o.style || ""}" ${o.attrs || ""}><span class="t-in">
    <span class="t-top"><span class="t-name">${esc(c.name)}</span><span class="t-lvl">Niv. ${d.level}</span></span>
    <span class="t-art"><span class="t-mono" aria-hidden="true">${esc([...c.name][0] || "?")}</span>
      ${d.rarity === "Mythique" ? `<span class="t-star" aria-hidden="true">♛</span><span class="t-groom">Futur marié</span>` : d.rarity === "Légendaire" ? `<span class="t-star" aria-hidden="true">★★★</span>` : d.rarity === "Rare" ? `<span class="t-star" aria-hidden="true">★★</span>` : ""}
      <span class="t-type">${esc(c.style)}</span>
      ${!o.player && !(o.cls || "").includes("blind") ? `<span class="t-spec" style="--cat:${specCat(c).color}">Expert ${esc(specCat(c).label)}</span>` : ""}</span>
    <span class="t-moves">${d.moves.map(([m, dmg]) => `<span class="t-move"><span class="t-dots">${"<i></i>".repeat(Math.min(4, Math.ceil(dmg / 40)))}</span><span class="t-mname">${esc(m)}</span><span class="t-dmg">${dmg}</span></span>`).join("")}</span>
    <span class="t-stats">${d.stats.map(([s, v]) => `<span>${s}</span><span class="t-bar"><i style="width:${v}%"></i></span><span>${v}%</span>`).join("")}</span>
    ${d.talent ? `<span class="t-talent"><b>Talent : ${esc(d.talent[0])}.</b> ${esc(d.talent[1])}</span>` : ""}
    <span class="t-wr"><span><b>Faiblesse</b>${esc(d.weak)}</span><span><b>Résistance</b>${esc(d.res)}</span></span>
    <span class="t-flavor">${esc(d.flavor)}</span>
    <span class="t-foot"><span>${d.rarity === "Mythique" ? "Mythique, exemplaire unique" : o.player ? "Carte joueur" : d.rarity}</span><span>#${d.num}</span></span>
  </span></${tag}>`;
}
function jokerHTML(type, o = {}){
  const j = JOKERS[type], tag = o.tag || "div";
  return `<${tag} class="tcg r-j holo ${o.cls || ""}" ${o.attrs || ""}><span class="t-in joker-in">
    <span class="j-k">Joker</span><span class="j-name">${j.name}</span><span class="j-text">${j.text}</span>
    <span class="t-foot"><span>Carte bonus</span><span>★</span></span></span></${tag}>`;
}
const backHTML = () => `<div class="tcg back r-p"><span class="t-in"><span class="b-logo">Draft<br>des anciens</span><span class="b-sub">EVG</span></span></div>`;

// L'effet holo suit le doigt ou la souris
document.addEventListener("pointermove", e => {
  const c = e.target.closest && e.target.closest(".holo"); if(!c) return;
  const r = c.getBoundingClientRect();
  c.classList.add("touched");
  c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
  c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
});

// Fenêtre intégrée : les confirm() et alert() du navigateur sont bloqués dans la page en ligne
function askConfirm(text, onYes, yesLabel = "Oui", noLabel = "Annuler"){
  const box = document.createElement("div");
  box.className = "ov";
  box.innerHTML = `<div class="ov-box" role="dialog" aria-modal="true"><p class="ask">${esc(text)}</p>
    <button class="btn main" data-yes>${esc(yesLabel)}</button>${noLabel ? `<button class="btn ghost" data-no>${esc(noLabel)}</button>` : ""}</div>`;
  document.body.appendChild(box);
  box.querySelector("[data-yes]").focus();
  box.querySelector("[data-yes]").onclick = () => { box.remove(); if(onYes) onYes(); };
  const no = box.querySelector("[data-no]"); if(no) no.onclick = () => box.remove();
}
const tell = text => askConfirm(text, null, "OK", null);

/* =========================================================
   État et navigation
   ========================================================= */
let S = load();
let setupNames = DEFAULT_PLAYERS.slice();
let setupGroom = "";
let setupRounds = ROUNDS;
let lastPhase = null, showGallery = false, overlay = null, showRanking = false;

function render(){
  const phase = showGallery ? "gallery" : (S ? S.phase : "setup");
  ({ setup:renderSetup, gallery:renderGallery, handoff:renderHandoff, booster:renderBooster, pick:renderPick,
     startSpin:renderStartSpin, roundShow:renderRoundShow, roundSpin:renderRoundSpin, election:renderElection, revealHandoff:renderRevealHandoff, reveal:renderReveal, final:renderFinal })[phase]();
  if(phase !== lastPhase){ window.scrollTo(0,0); lastPhase = phase; }
}
const cur = () => S.players[S.turn];

/* ---------- Accueil ---------- */
function renderSetup(){
  app.innerHTML = `<section class="screen">
    <h1 class="title">Draft<br>des anciens</h1>
    <p class="lead">${setupRounds} tours. À chaque tour, ouvre ton booster de ${CATS.length} cartes et place un danseur dans chaque catégorie. Chaque danseur a une spécialité qui vaut +30 % s'il y est placé. Chacun gagne un joker à la roulette de départ, puis à chaque victoire de tour. Sabote tes potes, puis débattez de la meilleure équipe.</p>
    <h2 class="h2">Joueurs</h2>
    <ol class="players">${setupNames.map((n,i)=>`<li>
      <input aria-label="Joueur ${i+1}" value="${esc(n)}" data-i="${i}" placeholder="Prénom">
      <button class="x" data-rm="${i}" aria-label="Retirer ce joueur">×</button></li>`).join("")}</ol>
    <button class="btn ghost" id="add">Ajouter un joueur</button>
    <h2 class="h2">Futur marié</h2>
    <input class="solo" id="groom" value="${esc(setupGroom)}" placeholder="Prénom du futur marié" aria-label="Prénom du futur marié">
    <p class="hint">Il aura une carte Mythique unique à drafter, et sa carte joueur passe en Mythique s'il joue.</p>
    <h2 class="h2">Durée de la partie</h2>
    <div class="vote">${[[SHORT_ROUNDS,"Courte"],[ROUNDS,"Normale"]].map(([n,l]) => `<button class="btn ${setupRounds === n ? "main" : "ghost"}" data-rounds="${n}" aria-pressed="${setupRounds === n}">${l}<br><small>${n} tours</small></button>`).join("")}</div>
    <button class="btn main" id="start">Lancer la partie</button>
    ${window.MULTI_URL ? `<a class="btn gold" href="${window.MULTI_URL}">Jouer sur plusieurs téléphones</a>` : ""}
    <button class="btn ghost" id="gallery">Voir toutes les cartes</button>
  </section>`;
  $$("input[data-i]").forEach(inp => inp.oninput = () => setupNames[+inp.dataset.i] = inp.value);
  $$("[data-rm]").forEach(b => b.onclick = () => { if(setupNames.length > 2){ setupNames.splice(+b.dataset.rm,1); render(); } });
  $("#add").onclick = () => { setupNames.push(""); render(); const all = $$("input[data-i]"); all[all.length-1].focus(); };
  $("#gallery").onclick = () => { showGallery = true; render(); };
  $("#groom").oninput = e => setupGroom = e.target.value;
  $$("[data-rounds]").forEach(b => b.onclick = () => { sfx.click(); setupRounds = +b.dataset.rounds; render(); });
  $("#start").onclick = () => {
    const names = setupNames.map(n => n.trim()).filter(Boolean);
    if(names.length < 2){ tell("Il faut au moins 2 joueurs."); return; }
    startGame(names);
  };
}

function buildPool(groom){
  const pool = DANCERS.filter(n => !groom || n.toLowerCase() !== groom.toLowerCase()).map((name,id) => ({ id, name, style: dancerStyle(name) }));
  if(groom) pool.push({ id: 999, name: groom, style: dancerStyle(groom), groom: true });
  return pool;
}
function startGame(names){
  S = { phase:"startSpin", startSpin:{ idx:0, pick:Math.floor(Math.random()*Object.keys(JOKERS).length), spun:false }, round:0, turn:0, hand:[], assign:{}, sel:null, revealIdx:0,
        boosterJoker:null, flipped:[], packOpen:false, cursedNow:false, roundResult:null,
        rounds: setupRounds, groom: setupGroom.trim(),
        pool: buildPool(setupGroom.trim()),
        players: names.map(name => ({ name, jokers:[], cursed:false, team: Object.fromEntries(CATS.map(c => [c.id, []])) })) };
  save(); render();
}

/* ---------- Galerie ---------- */
function renderGallery(){
  const names = S ? S.players.map(p => p.name) : setupNames.map(n => n.trim()).filter(Boolean);
  app.innerHTML = `<section class="screen">
    <button class="btn ghost" id="back">Retour</button>
    <h1 class="title">Les<br>cartes</h1>
    ${groomName() ? `<h2 class="h2">Le futur marié</h2><div class="gallery">${cardHTML({ name:groomName(), style:dancerStyle(groomName()), groom:true })}</div>` : ""}
    <h2 class="h2">Joueurs</h2>
    <div class="gallery">${names.map(n => cardHTML(playerCard(n), { player:true })).join("")}</div>
    <h2 class="h2">Jokers</h2>
    <div class="gallery">${Object.keys(JOKERS).map(t => jokerHTML(t)).join("")}</div>
    <h2 class="h2">Danseurs</h2>
    ${filterHTML(DANCERS.map(n => ({ name:n, style:dancerStyle(n) })), true)}
    <div class="gallery">${applyFilter(DANCERS.map(n => ({ name:n, style:dancerStyle(n) })), true).map(c => cardHTML(c)).join("")}</div>
  </section>`;
  bindFilter();
  $("#back").onclick = () => { showGallery = false; render(); };
}

/* ---------- Passage du téléphone ---------- */
function renderHandoff(){
  const p = cur();
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">Tour ${S.round+1} sur ${R()}</p>
    <p class="pass">Passe le téléphone à</p>
    ${cardHTML(playerCard(p.name), { player:true, tag:"h1" })}
    <button class="btn main" id="go">C'est moi, j'ouvre mon booster</button>
    <button class="link" id="seeAll">Voir toutes les cartes</button>
    <button class="link" id="reset">Recommencer la partie</button>
  </section>`;
  $("#go").onclick = startTurn;
  $("#seeAll").onclick = () => { showGallery = true; render(); };
  $("#reset").onclick = resetGame;
}

const TIER = { "Mythique":-1, "Légendaire":0, "Rare":1, "Commune":2 };
// mode "legend" : les plus fortes d'abord. mode "cursed" : les plus faibles d'abord. Sinon : au hasard.
function drawCards(p, n, exclude = [], mode = null){
  const used = new Set([...Object.values(p.team).flat().map(c => c.id), ...exclude]);
  const avail = shuffle(S.pool.filter(c => !used.has(c.id)));
  if(mode === "legend") avail.sort((x,y) => TIER[cardData(x).rarity] - TIER[cardData(y).rarity]);
  if(mode === "cursed") avail.sort((x,y) => TIER[cardData(y).rarity] - TIER[cardData(x).rarity]);
  return avail.slice(0, n);
}

function startTurn(){
  const p = cur();
  S.cursedNow = p.cursed; S.blindNow = !!p.blind; p.blind = false;
  S.hand = drawCards(p, CATS.length, [], p.cursed ? "cursed" : null);
  S.packKind = p.cursed ? "cursed" : "normal";
  p.cursed = false;
  S.boosterJoker = Math.random() < JOKER_CHANCE ? randomJoker() : null;
  S.flipped = []; S.packOpen = false; S.assign = {}; S.sel = null; filterOn = "all"; domainOn = "all";
  S.phase = "booster"; save(); render();
}

/* ---------- Ouverture du booster ---------- */
// La ligne de déchirure en zigzag : le haut et le corps du paquet partagent les mêmes points
const TEAR_PTS = Array.from({ length:13 }, (_, i) => [i / 12 * 100, i % 2 ? 18 : 14]);
const TEAR_TOP  = ["0% 0%", "100% 0%", ...TEAR_PTS.slice().reverse().map(([x,y]) => `${x}% ${y}%`)].join(",");
const TEAR_BODY = [...TEAR_PTS.map(([x,y]) => `${x}% ${y}%`), "100% 100%", "0% 100%"].join(",");
let dealAnim = false;

// onOpen : ce qui se passe une fois le booster ouvert (par défaut, la partie sur un seul téléphone)
function bindTear(pack, onOpen){
  const top = pack.querySelector(".top-piece"), rip = pack.querySelector(".rip");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let start = null, p = 0, dir = 1, lastSound = 0, finished = false;

  // p = avancement de la déchirure, de 0 à 1
  function setP(v){
    p = Math.max(0, Math.min(1, v));
    top.style.transformOrigin = dir > 0 ? "0% 16%" : "100% 16%";
    top.style.transform = `translateY(${-p * 12}px) rotate(${-dir * p * 9}deg)`;
    rip.style.width = (p * 100) + "%";
    rip.style.left = dir > 0 ? "0" : "auto"; rip.style.right = dir > 0 ? "auto" : "0";
    if(p - lastSound > .12){ lastSound = p; sfx.crinkle(); }
  }
  function finish(){
    if(finished) return; finished = true;
    sfx.tear();
    const open = onOpen || (() => { S.packOpen = true; dealAnim = true; save(); render(); });
    if(reduce){ open(); return; }
    pack.classList.add("torn");
    top.style.transition = "transform .6s cubic-bezier(.3,.7,.4,1), opacity .6s";
    top.style.transform = `translate(${dir * 80}%, -170%) rotate(${-dir * 45}deg)`;
    top.style.opacity = "0";
    setTimeout(open, 650);
  }
  // Déchirement automatique (au clic), en partant de là où on en est
  function autoTear(){
    if(finished) return;
    if(reduce){ finish(); return; }
    const from = p, t0 = performance.now(), dur = 380 * (1 - from) + 60;
    const step = now => { const k = Math.min(1, (now - t0) / dur); setP(from + (1 - from) * k); k < 1 ? requestAnimationFrame(step) : finish(); };
    requestAnimationFrame(step);
  }
  function snapBack(){
    top.style.transition = "transform .25s ease-out";
    setP(0); lastSound = 0;
    setTimeout(() => { top.style.transition = ""; }, 260);
    pack.classList.remove("dragging");
  }

  pack.addEventListener("pointerdown", e => {
    if(finished) return;
    start = { x: e.clientX, moved: false };
    top.style.transition = "";
    if(pack.setPointerCapture) pack.setPointerCapture(e.pointerId);
  });
  pack.addEventListener("pointermove", e => {
    if(!start || finished) return;
    const dx = e.clientX - start.x;
    if(!start.moved && Math.abs(dx) > 8){ start.moved = true; dir = dx > 0 ? 1 : -1; pack.classList.add("dragging"); }
    if(start.moved){ setP(Math.abs(dx) / (pack.offsetWidth * .75)); if(p >= 1){ start = null; finish(); } }
  });
  pack.addEventListener("pointerup", () => {
    if(!start) return;
    const moved = start.moved; start = null;
    if(!moved || p > .55) autoTear(); else snapBack();
  });
  pack.addEventListener("pointercancel", () => { if(start){ start = null; snapBack(); } });
  // Clavier (Entrée / Espace) ou clic sans pointeur
  pack.addEventListener("click", e => { if(e.detail === 0) autoTear(); });
}

function renderBooster(){
  const p = cur();
  if(!S.packOpen){
    app.innerHTML = `<section class="screen handoff">
      <p class="meta">${esc(p.name)}, tour ${S.round+1} sur ${R()}</p>
      ${S.packKind === "cursed" ? `<p class="note bad">Booster maudit : que des cartes faibles.</p>` : ""}
      ${S.packKind === "legend" ? `<p class="note good">Booster Légendaire : que des cartes fortes !</p>` : ""}
      ${S.packKind === "relance" ? `<p class="note good">Joker Relance : voici un tout nouveau booster.</p>` : ""}
      ${S.blindNow ? `<p class="note bad">Malus à l'aveugle : stats et rareté cachées pendant ce tour.</p>` : ""}
      <button class="pack ${S.packKind === "cursed" ? "cursed" : S.packKind === "legend" ? "legend" : ""}" id="pack" aria-label="Ouvrir le booster">
        <span class="skin body-piece" style="clip-path:polygon(${TEAR_BODY})">
          <span class="p-brand">DRAFT DES ANCIENS</span>
          <span class="p-t">${S.packKind === "legend" ? "Légende" : S.packKind === "cursed" ? "Maudit" : "Booster"}</span>
          <span class="p-s">${S.packKind === "legend" ? "Édition dorée" : S.packKind === "cursed" ? "Que des faibles" : CATS.length + " cartes, édition EVG"}</span>
        </span>
        <span class="skin top-piece" style="clip-path:polygon(${TEAR_TOP})"></span>
        <span class="burst"></span><span class="rip"></span><span class="swipe-hint" aria-hidden="true"></span>
      </button>
      <p class="hint">Glisse ton doigt sur le haut du booster pour le déchirer, ou touche-le.</p>
    </section>`;
    bindTear($("#pack"));
    return;
  }
  const items = S.hand.map(c => cardHTML(c, { cls:"front" + (S.blindNow ? " blind" : "") }));
  if(S.boosterJoker) items.push(jokerHTML(S.boosterJoker, { cls:"front" }));
  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${esc(p.name)}</span><span>Tour ${S.round+1}/${R()}</span></header>
    <p class="hint">Touche chaque carte pour la retourner.${S.boosterJoker ? " Il y a une surprise dans ce booster." : ""}</p>
    <div class="hand">${items.map((html,i) => `<button class="flipwrap ${dealAnim ? "deal" : ""}" style="--d:${i}" data-flip="${i}" aria-label="Retourner la carte ${i+1}">
      <span class="flipper ${S.flipped[i] ? "on" : ""}">${html}${backHTML()}</span></button>`).join("")}</div>
    <button class="btn ghost" id="all">Tout retourner</button>
    ${S.boosterJoker && S.flipped[S.hand.length] ? `<p class="note good">Tu as trouvé le joker ${JOKERS[S.boosterJoker].name} ! ${JOKERS[S.boosterJoker].text}</p>
      <button class="btn main" id="useNow">Utiliser ${JOKERS[S.boosterJoker].name} maintenant</button>
      <button class="btn ghost" id="place">Le garder et placer mes cartes</button>`
    : `<button class="btn main" id="place">Placer mes cartes</button>`}
  </section>`;
  dealAnim = false;
  $$("[data-flip]").forEach(b => b.onclick = () => {
    const i = +b.dataset.flip; if(S.flipped[i]) return;
    b.querySelector(".flipper").classList.add("on"); S.flipped[i] = true; save();
    if(i < S.hand.length) cardSound(S.hand[i]); else sfx.legend();
    if(i === S.hand.length && S.boosterJoker) setTimeout(() => { const sc = $(".hand").scrollLeft; render(); const h = $(".hand"); if(h) h.scrollLeft = sc; }, 350);
  });
  $("#all").onclick = () => $$("[data-flip]").forEach((b,k) => setTimeout(() => { if(b.isConnected) b.click(); }, k * 120));
  $("#place").onclick = () => {
    if(S.boosterJoker){ p.jokers.push(S.boosterJoker); S.boosterJoker = null; }
    S.phase = "pick"; save(); render();
  };
  const un = $("#useNow");
  if(un) un.onclick = () => {
    p.jokers.push(S.boosterJoker); S.boosterJoker = null;
    S.phase = "pick"; save(); render();
    useJoker(p.jokers.length - 1);
  };
}

/* ---------- Placement ---------- */
// Petite carte façon deck (portrait compact)
function miniHTML(c, o = {}){
  const d = cardData(c), blind = S && S.blindNow;
  const rar = blind ? "r-c" : RCLASS[d.rarity];
  const holo = !blind && d.rarity !== "Commune" ? "holo" : "";
  const tag = o.tag || "div";
  return `<${tag} class="dc ${rar} ${holo} ${o.cls || ""}" style="--t:${STYLE_COLORS[c.style]}" ${o.attrs || ""}>
    <span class="dc-art"><span class="dc-mono" aria-hidden="true">${esc([...c.name][0] || "?")}</span>
      ${o.badge != null ? `<span class="dc-gem ${o.expert ? "x" : ""}">${o.badge}</span>` : ""}
      ${!blind ? `<span class="dc-spec" style="--cat:${specCat(c).color}">${esc(specCat(c).label)}</span>` : ""}
      ${!blind && d.rarity === "Mythique" ? `<span class="dc-star" aria-hidden="true">♛</span>` : !blind && d.rarity === "Légendaire" ? `<span class="dc-star" aria-hidden="true">★★★</span>` : !blind && d.rarity === "Rare" ? `<span class="dc-star" aria-hidden="true">★★</span>` : ""}
    </span>
    <span class="dc-name">${esc(c.name)}</span>
    <span class="dc-lvl">${blind ? "Niv. ?" : "Niv. " + d.level}</span>
  </${tag}>`;
}

function renderPick(){
  const p = cur();
  const placed = new Set(Object.values(S.assign));
  const free = S.hand.filter(c => !placed.has(c.id));
  const allFilled = CATS.every(c => S.assign[c.id] != null);
  const selCard = S.hand.find(h => h.id === S.sel);
  const filled = CATS.filter(cat => S.assign[cat.id] != null);
  const avg = filled.length ? Math.round(filled.reduce((sum,cat) => sum + catScore(S.hand.find(h => h.id === S.assign[cat.id]), cat), 0) / filled.length) : 0;
  const hint = selCard ? `Choisis l'emplacement de ${esc(selCard.name)} dans ton deck.`
    : !allFilled ? "Touche une carte de ta collection, puis un emplacement du deck."
    : free.length ? "Deck complet. Les cartes restantes seront défaussées." : "Deck complet. Touche un emplacement pour retirer une carte, ou valide.";

  app.innerHTML = `<section class="screen">
    <header class="bar"><span>${esc(p.name)}</span><span>Tour ${S.round+1}/${R()}</span></header>
    ${S.blindNow ? `<p class="note bad">Malus stats cachées : tu places tes cartes sans voir les stats ni la rareté.</p>` : ""}

    <div class="deck-panel">
      <div class="deck-head"><span class="deck-title">Ton deck</span>
        <span class="deck-avg" title="Score moyen du deck">${S.blindNow ? "?" : avg}<small>score moyen</small></span></div>
      <div class="deck ${selCard ? "armed" : ""}">${CATS.map(cat => {
        const c = S.hand.find(h => h.id === S.assign[cat.id]);
        return `<button class="dslot ${c ? "full" : ""} ${!c && selCard && !S.blindNow && isExpert(selCard, cat) ? "spec" : ""} ${c && !S.blindNow && isExpert(c, cat) ? "match" : ""}" data-cat="${cat.id}" style="--cat:${cat.color}" aria-label="${cat.label}${c ? " : " + esc(c.name) : ", vide"}">
          ${c ? miniHTML(c, { badge: S.blindNow ? "?" : catScore(c, cat), expert: !S.blindNow && isExpert(c, cat) }) : `<span class="dslot-empty"><span class="plus">+</span></span>`}
          <span class="dslot-lab">${cat.label}${c && !S.blindNow && isExpert(c, cat) ? " ★" : ""}</span></button>`;
      }).join("")}</div>
    </div>

    <p class="hint">${hint}</p>

    ${selCard ? `<div class="detail">${cardHTML(selCard, { cls: S.blindNow ? "blind" : "" })}
      <div class="detail-side"><p class="detail-t">Meilleurs emplacements</p>
        ${S.blindNow ? `<p class="hint">Stats cachées, place au feeling.</p>` :
          CATS.filter(cat => S.assign[cat.id] == null).map(cat => [cat, catScore(selCard, cat)]).sort((x,y) => y[1] - x[1]).slice(0,3)
          .map(([cat,sc]) => `<button class="fit ${isExpert(selCard, cat) ? "x" : ""}" data-cat="${cat.id}" style="--cat:${cat.color}"><span>${cat.label}${isExpert(selCard, cat) ? `<small>Spécialité, +${Math.round((SPECIALTY_BONUS - 1) * 100)} %</small>` : ""}</span><b>${sc}</b></button>`).join("")}
        <button class="btn ghost" id="unsel">Annuler</button></div></div>` : ""}

    <div class="coll-head"><span class="deck-title">Ta collection</span><span class="meta">${free.length} carte${free.length > 1 ? "s" : ""}</span></div>
    ${p.jokers.length ? `<div class="jokers">${p.jokers.map((t,i) => `<button class="jk" data-jk="${i}">Joker ${JOKERS[t].name}</button>`).join("")}</div>` : ""}
    ${!S.blindNow && free.length ? filterHTML(free) : ""}
    <div class="coll">${applyFilter(free).map(c => miniHTML(c, { badge: domainOn !== "all" ? catScore(c, CATS.find(k => k.id === domainOn)) : null, tag:"button", cls: S.sel === c.id ? "sel" : "", attrs:`data-card="${c.id}" aria-pressed="${S.sel === c.id}"` })).join("")
      || `<p class="hint">${free.length ? "Aucune carte de ce niveau dans ta main." : "Toutes tes cartes sont dans le deck."}</p>`}</div>

    <button class="btn main" id="ok" ${allFilled ? "" : "disabled"}>Valider mon deck</button>
    <details class="note"><summary>Voir mon équipe</summary>${teamHTML(p, false)}</details>
  </section>${overlayHTML()}`;

  $$("[data-card]").forEach(b => b.onclick = () => { const id = +b.dataset.card; S.sel = S.sel === id ? null : id; sfx.click(); save(); render(); });
  $$("[data-cat]").forEach(b => b.onclick = () => {
    const cat = b.dataset.cat;
    if(S.sel != null){ S.assign[cat] = S.sel; S.sel = null; sfx.place(); }
    else if(S.assign[cat] != null){ delete S.assign[cat]; sfx.unplace(); }
    save(); render();
  });
  bindFilter();
  const u = $("#unsel"); if(u) u.onclick = () => { S.sel = null; save(); render(); };
  $$("[data-jk]").forEach(b => b.onclick = () => useJoker(+b.dataset.jk));
  $("#ok").onclick = validateTurn;
  bindOverlay();
}

/* ---------- Filtre fortes / moyennes / faibles ---------- */
const FILTERS = [
  { id:"all",  label:"Toutes" },
  { id:"Légendaire", label:"Fortes" },
  { id:"Rare",       label:"Moyennes" },
  { id:"Commune",    label:"Faibles" }
];
let filterOn = "all", domainOn = "all";
const sortStrong = list => list.slice().sort((x,y) => TIER[cardData(x).rarity] - TIER[cardData(y).rarity] || cardData(y).level - cardData(x).level);
const inTier = (c, id) => { const r = cardData(c).rarity; return r === id || (id === "Légendaire" && r === "Mythique"); };
function applyFilter(list){
  let out = filterOn === "all" ? list : list.filter(c => inTier(c, filterOn));
  if(domainOn !== "all"){
    const cat = CATS.find(c => c.id === domainOn);
    // Les experts du domaine d'abord, puis les autres classés par score dans ce domaine
    return out.slice().sort((x,y) => (isExpert(y,cat) - isExpert(x,cat)) || catScore(y,cat) - catScore(x,cat));
  }
  return sortStrong(out);
}
function filterHTML(list){
  return `<div class="filters" role="group" aria-label="Filtrer les cartes">${FILTERS.map(f => {
    const n = f.id === "all" ? list.length : list.filter(c => inTier(c, f.id)).length;
    return `<button class="chip ${f.id === "all" ? "f-all" : RCLASS[f.id]} ${filterOn === f.id ? "on" : ""}" data-filter="${f.id}" aria-pressed="${filterOn === f.id}">${f.label}<b>${n}</b></button>`;
  }).join("")}</div>
  <div class="filters" role="group" aria-label="Trier par domaine">${[{ id:"all", label:"Tous domaines" }, ...CATS].map(cat => {
    const n = cat.id === "all" ? "" : `<b>${list.filter(c => specialty(c) === cat.id).length}</b>`;
    return `<button class="chip dom ${domainOn === cat.id ? "on" : ""}" style="--cat:${cat.color || "var(--paper)"}" data-domain="${cat.id}" aria-pressed="${domainOn === cat.id}">${esc(cat.label)}${n}</button>`;
  }).join("")}</div>
  ${domainOn !== "all" ? `<p class="hint">Experts ${esc(CATS.find(c => c.id === domainOn).label)} en premier, puis les autres classés par score dans ce domaine.</p>` : ""}`;
}
function bindFilter(){
  $$("[data-filter]").forEach(b => b.onclick = () => { filterOn = b.dataset.filter; sfx.click(); render(); });
  $$("[data-domain]").forEach(b => b.onclick = () => { domainOn = b.dataset.domain; sfx.click(); render(); });
}

/* ---------- Jokers ---------- */
function useJoker(i){
  const p = cur(), type = p.jokers[i];
  if(type === "espion" || type === "sabotage"){ overlay = { kind:"target", joker:i }; render(); return; }
  askConfirm(`Utiliser le joker ${JOKERS[type].name} ? ${JOKERS[type].text}`, () => applyJoker(i), "Utiliser le joker");
}
function applyJoker(i){
  const p = cur(), type = p.jokers[i];
  p.jokers.splice(i, 1);
  if(type === "relance"){
    S.hand = drawCards(p, CATS.length, S.hand.map(c => c.id));
    S.assign = {}; S.sel = null; S.flipped = []; S.packOpen = false; S.boosterJoker = null;
    S.packKind = "relance"; S.cursedNow = false; S.phase = "booster";
  }
  if(type === "xl"){
    S.hand = drawCards(p, CATS.length, [], "legend");
    S.assign = {}; S.sel = null; S.flipped = []; S.packOpen = false; S.boosterJoker = null;
    S.packKind = "legend"; S.cursedNow = false; S.phase = "booster";
  }
  save(); render();
}
function overlayHTML(){
  if(!overlay) return "";
  const p = cur();
  if(overlay.kind === "target"){
    const type = p.jokers[overlay.joker];
    return `<div class="ov"><div class="ov-box"><h2>Joker ${JOKERS[type].name}</h2><p class="hint">${JOKERS[type].text} Choisis ta cible.</p>
      ${S.players.map((o,k) => k === S.turn ? "" : `<button class="btn main" data-target="${k}">${esc(o.name)}</button>`).join("")}
      <button class="btn ghost" data-close>Annuler</button></div></div>`;
  }
  if(overlay.kind === "spy"){
    const o = S.players[overlay.target];
    return `<div class="ov"><div class="ov-box"><h2>Équipe de ${esc(o.name)}</h2>${teamHTML(o, false)}<button class="btn main" data-close>Fermer</button></div></div>`;
  }
  return `<div class="ov"><div class="ov-box"><h2>C'est fait</h2><p>${esc(overlay.text)}</p><button class="btn main" data-close>OK</button></div></div>`;
}
function bindOverlay(){
  $$("[data-close]").forEach(b => b.onclick = () => { overlay = null; render(); });
  $$("[data-target]").forEach(b => b.onclick = () => {
    const p = cur(), k = +b.dataset.target, type = p.jokers[overlay.joker];
    p.jokers.splice(overlay.joker, 1);
    if(type === "espion"){ overlay = { kind:"spy", target:k }; }
    else { S.players[k].cursed = true; overlay = { kind:"msg", text:`${S.players[k].name} aura un booster maudit au prochain tour.` }; }
    save(); render();
  });
}

/* ---------- Fin de tour ---------- */
const MALUS = {
  maudit:  { name:"Booster maudit", text:"Son prochain booster ne contient que des Communes." },
  aveugle: { name:"Stats cachées",  text:"Au prochain tour, il place ses cartes sans voir les stats ni la rareté." },
  vol:     { name:"Vol de joker",   text:"Il perd un joker au hasard. S'il n'en a pas, son prochain booster est maudit." }
};

function validateTurn(){
  const p = cur();
  CATS.forEach(cat => p.team[cat.id].push(S.hand.find(h => h.id === S.assign[cat.id])));
  S.hand = []; S.assign = {}; S.sel = null;
  S.turn++;
  if(S.turn >= S.players.length){
    S.turn = 0; S.round++;
    if(S.round < R()){
      S.show = { round:S.round, revealed:0, winner:null, loser:null, statsHint:false };
      S.phase = "roundShow"; save(); render(); return;
    }
  }
  S.phase = S.round >= R() ? "revealHandoff" : "handoff";
  save(); render();
}

/* ---------- Présentation du tour (tout le monde autour du téléphone) ---------- */
const roundCards = (pl, r) => CATS.map(cat => ({ cat, card: pl.team[cat.id][r] }));
const roundScore = (pl, r) => roundCards(pl, r).reduce((sum, x) => sum + catScore(x.card, x.cat), 0);

function renderRoundShow(){
  const T = S.show, r = T.round - 1, all = T.revealed >= S.players.length;
  const order = S.players.map((pl,k) => [k, roundScore(pl, r)]).sort((a,b) => b[1] - a[1]);
  const best = order[0][0], worst = order[order.length-1][0];
  app.innerHTML = `<section class="screen">
    <h1 class="title">Tour ${T.round},<br>présentation</h1>
    <p class="lead">Tout le monde autour du téléphone. On révèle les choix de chacun, on débat, puis on désigne le vainqueur du tour.</p>
    ${S.players.slice(0, T.revealed).map((pl,k) => `<article class="final-team">
      <h2>${esc(pl.name)}</h2>
      <div class="hand row">${roundCards(pl, r).map((x,i) => `<div class="labeled ${k === T.revealed-1 ? "pop" : ""}" style="--cat:${x.cat.color};--d:${i}">
        <span class="lab">${x.cat.label}${isExpert(x.card, x.cat) ? " ★ Expert" : ""}</span>${cardHTML(x.card)}</div>`).join("")}</div></article>`).join("")}
    ${!all ? `<button class="btn main" id="more">Révéler les choix de ${esc(S.players[T.revealed].name)}</button>` : `
      <h2 class="h2">Meilleure équipe du tour (gagne un bonus)</h2>
      <div class="vote">${S.players.map((pl,k) => `<button class="btn ${T.winner === k ? "main" : "ghost"}" data-win="${k}" aria-pressed="${T.winner === k}">${esc(pl.name)}</button>`).join("")}</div>
      <h2 class="h2">Moins bonne équipe du tour (prend le malus)</h2>
      <div class="vote">${S.players.map((pl,k) => `<button class="btn ${T.loser === k ? "main lose" : "ghost"}" data-lose="${k}" aria-pressed="${T.loser === k}">${esc(pl.name)}</button>`).join("")}</div>
      ${T.statsHint ? `<p class="note">D'après les stats, le meilleur tour est celui de ${esc(S.players[best].name)} et le moins bon celui de ${esc(S.players[worst].name)}.</p>`
        : `<button class="link" id="hint">Et d'après les stats ?</button>`}
      <button class="btn main" id="validate" ${T.winner == null || T.loser == null ? "disabled" : ""}>Valider le vote</button>`}
  </section>`;
  const more = $("#more");
  if(more) more.onclick = () => { T.revealed++; save(); render(); setTimeout(() => { const a = app.querySelectorAll(".final-team"); if(a.length) a[a.length-1].scrollIntoView({ behavior:"smooth", block:"start" }); }, 30); };
  $$("[data-win]").forEach(b => b.onclick = () => { T.winner = +b.dataset.win; if(T.loser === T.winner) T.loser = null; save(); render(); });
  $$("[data-lose]").forEach(b => b.onclick = () => { T.loser = +b.dataset.lose; if(T.winner === T.loser) T.winner = null; save(); render(); $("#validate").scrollIntoView({ block:"center" }); });
  const h = $("#hint"); if(h) h.onclick = () => { T.statsHint = true; save(); render(); };
  const v = $("#validate"); if(v) v.onclick = prepareSpin;
}

/* ---------- Roulette de départ : un joker pour chaque joueur ---------- */
function renderStartSpin(){
  const T = S.startSpin, p = S.players[T.idx], keys = Object.keys(JOKERS), last = T.idx === S.players.length - 1;
  const wh = { labels: keys.map(k => JOKERS[k].name), keys, pick: T.pick };
  app.innerHTML = `<section class="screen center">
    <p class="meta">Joker de départ, joueur ${T.idx+1} sur ${S.players.length}</p>
    <h1 class="reveal-name">${esc(p.name)}</h1>
    ${wheelHTML(wh)}
    <p class="note good" ${T.spun ? "" : "hidden"}>${esc(p.name)} commence avec le joker ${JOKERS[keys[T.pick]].name}. ${JOKERS[keys[T.pick]].text}</p>
    ${T.spun ? `<button class="btn main" id="next">${last ? "Commencer la partie" : "Joueur suivant"}</button>`
      : `<button class="btn main" id="spin">Lancer la roulette</button>`}
  </section>`;
  const seg = 360 / keys.length, target = 360 * 6 - (T.pick + .5) * seg, wheel = $("#wheel");
  if(T.spun) wheel.style.transform = `rotate(${target}deg)`;
  const sb = $("#spin");
  if(sb) sb.onclick = () => {
    sb.disabled = true;
    const done = () => { T.spun = true; p.jokers.push(keys[T.pick]); save(); render(); sfx.win(); };
    if(matchMedia("(prefers-reduced-motion: reduce)").matches){ done(); return; }
    sfx.spin(4);
    requestAnimationFrame(() => { wheel.classList.add("spinning"); wheel.style.transform = `rotate(${target}deg)`; });
    wheel.addEventListener("transitionend", done, { once:true });
  };
  const nx = $("#next");
  if(nx) nx.onclick = () => {
    if(last){ S.startSpin = null; S.phase = "handoff"; }
    else { S.startSpin = { idx: T.idx + 1, pick: Math.floor(Math.random()*keys.length), spun:false }; }
    save(); render();
  };
}

/* ---------- Roulettes ---------- */
function prepareSpin(){
  const T = S.show, w = T.winner, l = T.loser;
  const jokerKeys = Object.keys(JOKERS), malusKeys = Object.keys(MALUS);
  S.roundWins = S.roundWins || S.players.map(() => 0);
  S.roundWins[w]++;
  S.spin = {
    stage:0, winner:w, loser:l,
    wheels:[
      { title:`Bonus de ${S.players[w].name}`, labels: jokerKeys.map(k => JOKERS[k].name), keys: jokerKeys, pick: Math.floor(Math.random()*jokerKeys.length) },
      { title:`Malus de ${S.players[l].name}`, labels: malusKeys.map(k => MALUS[k].name), keys: malusKeys, pick: Math.floor(Math.random()*malusKeys.length) }
    ],
    spun:false
  };
  S.phase = "roundSpin"; save(); render();
}

const WHEEL_COLORS = [["#E1192B","#F5EBDD"],["#F5EBDD","#160304"],["#8A0F18","#F5EBDD"],["#F2C14E","#160304"],["#2A0608","#F5EBDD"],["#FF6B5E","#160304"]];
function wheelHTML(wh){
  const n = wh.labels.length, seg = 360 / n;
  const grad = wh.labels.map((_,i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length][0]} ${i*seg}deg ${(i+1)*seg}deg`).join(",");
  return `<div class="wheel-wrap"><span class="pointer" aria-hidden="true"></span>
    <div class="wheel" id="wheel" style="background:conic-gradient(${grad})">
      ${wh.labels.map((l,i) => `<span class="w-lab" style="transform:rotate(${(i+.5)*seg}deg)"><span style="color:${WHEEL_COLORS[i % WHEEL_COLORS.length][1]}">${esc(l)}</span></span>`).join("")}
    </div></div>`;
}
function spinResultText(){
  const sp = S.spin, wh = sp.wheels[sp.stage], key = wh.keys[wh.pick];
  if(sp.stage === 0) return `${esc(S.players[sp.winner].name)} gagne le joker ${JOKERS[key].name}. ${JOKERS[key].text}`;
  return `${esc(S.players[sp.loser].name)} prend le malus ${MALUS[key].name}. ${MALUS[key].text}`;
}
function applySpins(){
  const sp = S.spin, w = sp.wheels;
  S.players[sp.winner].jokers.push(w[0].keys[w[0].pick]);
  const victim = S.players[sp.loser], malus = w[1].keys[w[1].pick];
  if(malus === "maudit") victim.cursed = true;
  if(malus === "aveugle") victim.blind = true;
  if(malus === "vol"){ if(victim.jokers.length) victim.jokers.splice(Math.floor(Math.random()*victim.jokers.length), 1); else victim.cursed = true; }
}
function renderRoundSpin(){
  const sp = S.spin, wh = sp.wheels[sp.stage], last = sp.stage === sp.wheels.length - 1;
  app.innerHTML = `<section class="screen center">
    <p class="meta">Tour ${S.show.round}, ${sp.stage === 0 ? `meilleure équipe : ${esc(S.players[sp.winner].name)}` : `moins bonne équipe : ${esc(S.players[sp.loser].name)}`}</p>
    <h1 class="reveal-name">${esc(wh.title)}</h1>
    ${wheelHTML(wh)}
    <p class="note ${sp.stage === 0 ? "good" : "bad"}" id="res" ${sp.spun ? "" : "hidden"}>${spinResultText()}</p>
    ${sp.spun ? `<button class="btn main" id="next">${last ? "Tour suivant" : "Roulette suivante"}</button>`
      : `<button class="btn main" id="spin">Lancer la roulette</button>`}
  </section>`;
  const n = wh.labels.length, seg = 360 / n, target = 360 * 6 - (wh.pick + .5) * seg;
  const wheel = $("#wheel");
  if(sp.spun){ wheel.style.transform = `rotate(${target}deg)`; }
  const sb = $("#spin");
  if(sb) sb.onclick = () => {
    sb.disabled = true;
    const done = () => { sp.spun = true; save(); render(); sp.stage === 0 ? sfx.win() : sfx.malus(); };
    if(matchMedia("(prefers-reduced-motion: reduce)").matches){ done(); return; }
    sfx.spin(4);
    requestAnimationFrame(() => { wheel.classList.add("spinning"); wheel.style.transform = `rotate(${target}deg)`; });
    wheel.addEventListener("transitionend", done, { once:true });
  };
  const nx = $("#next");
  if(nx) nx.onclick = () => {
    if(!last){ sp.stage++; sp.spun = false; save(); render(); return; }
    applySpins(); S.spin = null; S.show = null; S.phase = "handoff"; save(); render();
  };
}

/* ---------- Révélation ---------- */
function teamHTML(p, anim){
  return `<div class="teamgrid">${CATS.map((cat,ci) => `<div class="trow" style="--cat:${cat.color}">
    <h3>${cat.label}</h3>
    ${p.team[cat.id].length ? `<div class="hand row">${p.team[cat.id].map((c,i) => cardHTML(c, { cls: anim ? "pop" : "", style:`--d:${ci*R()+i}` })).join("")}</div>`
      : `<p class="none">Personne pour l'instant</p>`}</div>`).join("")}</div>`;
}
function renderRevealHandoff(){
  const p = S.players[S.revealIdx];
  app.innerHTML = `<section class="screen handoff">
    <p class="meta">${S.revealIdx === 0 ? "Toutes les équipes sont prêtes. " : ""}Équipe ${S.revealIdx+1} sur ${S.players.length}</p>
    ${cardHTML(playerCard(p.name), { player:true, tag:"h1" })}
    <button class="btn main" id="go">Révéler l'équipe</button>
  </section>`;
  $("#go").onclick = () => { S.phase = "reveal"; save(); render(); sfx.legend(); };
}
function renderReveal(){
  const p = S.players[S.revealIdx], last = S.revealIdx >= S.players.length - 1;
  app.innerHTML = `<section class="screen">
    <p class="meta">L'équipe de</p>
    <h1 class="reveal-name">${esc(p.name)}</h1>
    ${teamHTML(p, true)}
    <button class="btn main" id="next">${last ? "Passer aux élections" : "Équipe suivante"}</button>
  </section>`;
  $("#next").onclick = () => { if(last){ S.elect = { idx:0, choice:null, winners:{} }; S.phase = "election"; } else { S.revealIdx++; S.phase = "revealHandoff"; } save(); render(); };
}
function renderElection(){
  const E = S.elect, cat = CATS[E.idx], last = E.idx === CATS.length - 1;
  app.innerHTML = `<section class="screen">
    <p class="meta">Élection ${E.idx+1} sur ${CATS.length}</p>
    <h1 class="title" style="text-shadow:5px 5px 0 ${cat.color}">Meilleure<br>équipe ${esc(cat.label)}</h1>
    <p class="lead">Voici les ${R()} danseurs ${esc(cat.label)} de chacun. Débattez, puis votez.</p>
    ${S.players.map(pl => `<article class="final-team"><h2>${esc(pl.name)}</h2>
      <div class="hand row">${pl.team[cat.id].map(c => cardHTML(c)).join("")}</div></article>`).join("")}
    <h2 class="h2">Qui a la meilleure équipe ${esc(cat.label)} ?</h2>
    <div class="vote">${S.players.map((pl,k) => `<button class="btn ${E.choice === k ? "main" : "ghost"}" data-pick="${k}" aria-pressed="${E.choice === k}">${esc(pl.name)}</button>`).join("")}</div>
    <button class="btn main" id="ok" ${E.choice == null ? "disabled" : ""}>${last ? "Voir le podium" : "Élection suivante"}</button>
  </section>`;
  $$("[data-pick]").forEach(b => b.onclick = () => { E.choice = +b.dataset.pick; save(); render(); $("#ok").scrollIntoView({ block:"center" }); });
  $("#ok").onclick = () => {
    E.winners[cat.id] = E.choice; E.choice = null; last ? sfx.fanfare() : sfx.win();
    if(last){ S.phase = "final"; } else { E.idx++; }
    save(); render();
  };
}

function renderFinal(){
  const W = S.elect ? S.elect.winners : {}, rw = S.roundWins || S.players.map(() => 0);
  // Classement : nombre de catégories gagnées, puis nombre de tours gagnés en cas d'égalité
  const podium = S.players.map((p,k) => ({ k, name:p.name, cats: CATS.filter(c => W[c.id] === k).map(c => c.label), rounds: rw[k] }))
    .sort((a,b) => b.cats.length - a.cats.length || b.rounds - a.rounds);
  const totals = S.players.map(p => [p.name, CATS.reduce((sum,cat) => sum + p.team[cat.id].reduce((s,c) => s + catScore(c,cat), 0), 0)]).sort((a,b) => b[1] - a[1]);
  app.innerHTML = `<section class="screen">
    <h1 class="title">Le<br>podium</h1>
    <ol class="ranking">${podium.map((x,i) => `<li><span class="pos">${i+1}</span>
      <span class="nm">${esc(x.name)}<small class="sub">${x.cats.length ? esc(x.cats.join(", ")) : "Aucune catégorie"} · ${x.rounds} tour${x.rounds > 1 ? "s" : ""} gagné${x.rounds > 1 ? "s" : ""}</small></span>
      <span class="sc">${x.cats.length}</span></li>`).join("")}</ol>
    <p class="hint">Le chiffre à droite est le nombre de catégories remportées. En cas d'égalité, les tours gagnés départagent.</p>
    ${showRanking ? `<h2 class="h2">Selon les stats</h2><ol class="ranking">${totals.map(([n,sc],i) => `<li><span class="pos">${i+1}</span><span class="nm">${esc(n)}</span><span class="sc">${sc}</span></li>`).join("")}</ol>`
      : `<button class="btn ghost" id="rank">Comparer avec le classement des stats</button>`}
    <h2 class="h2">Toutes les équipes</h2>
    ${S.players.map(p => `<article class="final-team"><h2>${esc(p.name)}</h2>${teamHTML(p, false)}</article>`).join("")}
    <button class="btn main" id="again">Nouvelle partie</button>
  </section>`;
  const rk = $("#rank"); if(rk) rk.onclick = () => { showRanking = true; render(); };
  $("#again").onclick = resetGame;
}

function resetGame(){
  askConfirm("Recommencer ? La partie en cours sera effacée.", doReset, "Oui, nouvelle partie");
}
function doReset(){
  if(S){ setupNames = S.players.map(p => p.name); setupGroom = S.groom || ""; setupRounds = S.rounds || ROUNDS; }
  S = null; showRanking = false; overlay = null; clearSave(); render();
}

// En multijoueur, ce fichier sert de bibliothèque (cartes, roulettes…) : on ne lance pas la partie sur un seul téléphone
if(!window.DRAFT_LIB) render();
