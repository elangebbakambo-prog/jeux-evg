// Outils partagés par les tests
const { expect } = require("@playwright/test");

// Ouvre un jeu sur un appareil « neuf » (localStorage vide), coupe internet sauf le site
// lui-même (pas de SoundCloud ni Supabase pendant les tests) et note toutes les erreurs JS.
async function ouvrir(page, chemin, { reglages } = {}){
  const erreurs = [];
  page.on("pageerror", e => erreurs.push(e.message));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  if(reglages) await page.addInitScript(r => { if(!sessionStorage.getItem("init")){ sessionStorage.setItem("init", "1"); for(const [k, v] of Object.entries(r)) localStorage.setItem(k, JSON.stringify(v)); } }, reglages);
  await page.goto(chemin);
  await expect(page.locator("#app")).not.toBeEmpty();
  return erreurs;
}

// Joue au hasard (mais de façon reproductible) en touchant les boutons de l'écran,
// en priorité le bouton principal. Sert à détecter un plantage n'importe où dans un jeu.
// Ne touche jamais aux boutons qui quittent, effacent ou ramènent à l'accueil.
const INTERDITS = /arr[êe]ter|quitter|supprimer|effacer|tout supprimer|r[ée]initialiser|retour|accueil|fermer la salle/i;
async function explorer(page, { etapes = 150, graine = 1 } = {}){
  let s = graine;
  const hasard = n => { s = (s * 16807) % 2147483647; return s % n; };
  const vus = new Set();
  let attente = 0;
  for(let i = 0; i < etapes; i++){
    // Remplit les champs vides (noms de joueurs, réponses…) pour débloquer les boutons
    await page.evaluate(n => document.querySelectorAll("#app input:not([type=checkbox]):not([type=radio]), #app textarea").forEach(f => {
      if(!f.value && f.offsetParent){ f.value = "Test " + n; f.dispatchEvent(new Event("input", { bubbles: true })); }
    }), i);
    const choix = await page.evaluate(interdits => {
      const re = new RegExp(interdits, "i"), out = [];
      document.querySelectorAll("[data-robot]").forEach(e => e.removeAttribute("data-robot"));
      document.querySelectorAll("#app button, .ov button").forEach(b => {
        const r = b.getBoundingClientRect();
        if(b.disabled || !r.width || !r.height) return;
        const t = (b.textContent + " " + (b.getAttribute("aria-label") || "")).replace(/\s+/g, " ").trim();
        if(re.test(t)) return;
        b.setAttribute("data-robot", out.length);
        out.push({ t, principal: b.matches(".btn.main, .ov [data-yes]") });
      });
      return out;
    }, INTERDITS.source);
    // Écran minuté sans bouton (compte à rebours, animation) : on patiente un peu
    if(!choix.length){ if(++attente > 10) break; await page.waitForTimeout(400); continue; }
    attente = 0;
    const principaux = choix.map((c, k) => [c, k]).filter(([c]) => c.principal);
    // 2 fois sur 3 le bouton principal (pour avancer dans la partie), sinon un bouton au hasard
    const k = principaux.length && hasard(3) ? principaux[hasard(principaux.length)][1] : hasard(choix.length);
    vus.add(choix[k].t.slice(0, 40));
    await page.locator(`[data-robot="${k}"]`).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(30);
    await expect(page.locator("#app")).not.toBeEmpty();
  }
  return vus;
}

// Salle en ligne sans internet : un faux Supabase Realtime relie plusieurs téléphones.
// Chaque téléphone a son propre navigateur (stockage séparé) ; les messages passent par les tests.
const FAUX_SUPABASE = () => {
  const chans = {};
  window.__busIn = m => { const c = chans[m.name]; if(c) c._in(m); };
  window.supabase = { createClient: () => ({
    channel(name, { config }){
      const key = config.presence.key, handlers = {}, pres = {};
      let me = null;
      const fire = (k, arg) => (handlers[k] || []).forEach(f => f(arg));
      const ch = {
        on(type, f, fn){ (handlers[type + ":" + f.event] = handlers[type + ":" + f.event] || []).push(fn); return ch; },
        subscribe(cb){ chans[name] = ch; setTimeout(() => cb("SUBSCRIBED"), 5); return ch; },
        async track(meta){ me = meta; pres[key] = [meta]; window.__bus({ name, k: "p", key, meta, ask: true }); fire("presence:sync"); },
        send({ payload }){ window.__bus({ name, k: "b", payload }); },
        presenceState(){ return Object.assign({}, pres); },
        _in(m){
          if(m.k === "b") fire("broadcast:msg", { payload: JSON.parse(JSON.stringify(m.payload)) });
          if(m.k === "p"){ if(m.meta) pres[m.key] = [m.meta]; else delete pres[m.key]; fire("presence:sync"); if(m.ask && me) window.__bus({ name, k: "p", key, meta: me }); }
        },
        _close(){ window.__bus({ name, k: "p", key, meta: null }); delete chans[name]; }
      };
      return ch;
    },
    removeChannel(ch){ if(ch && ch._close) ch._close(); }
  }) };
};
// Ouvre n téléphones reliés entre eux. Renvoie [{ page, erreurs }]
async function telephones(browser, n, { reglages } = {}){
  const pages = [], out = [];
  for(let i = 0; i < n; i++){
    const ctx = await browser.newContext({ ...require("@playwright/test").devices["Pixel 7"], reducedMotion: "reduce", baseURL: "http://localhost:8123" });
    const page = await ctx.newPage(), erreurs = [];
    page.on("pageerror", e => erreurs.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.exposeBinding("__bus", async ({ page: from }, m) => {
      for(const p of pages) if(p !== from && !p.isClosed()) p.evaluate(x => window.__busIn && window.__busIn(x), m).catch(() => {});
    });
    await page.addInitScript(FAUX_SUPABASE);
    if(reglages && i === 0) await page.addInitScript(r => { if(!sessionStorage.getItem("init")){ sessionStorage.setItem("init", "1"); for(const [k, v] of Object.entries(r)) localStorage.setItem(k, JSON.stringify(v)); } }, reglages);
    pages.push(page); out.push({ page, erreurs });
  }
  return out;
}
// Le code de la salle affiché sur l'écran hôte
const codeSalle = async page => (await page.locator(".room .code").textContent()).trim();
async function rejoindre(page, chemin, code, nom){
  await page.goto(chemin + "?salle=" + code);
  await page.fill("#name", nom);
  await page.click("#go");
}
const sansCdn = e => e.filter(x => !/supabase|QRCode/i.test(x));

module.exports = { ouvrir, explorer, telephones, codeSalle, rejoindre, sansCdn };
