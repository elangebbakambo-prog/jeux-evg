// Parties en ligne de bout en bout : un écran hôte et deux téléphones, reliés par un faux Supabase.
// On vérifie surtout ce que chaque téléphone affiche (réponses, résultats, classement).
const { test, expect } = require("@playwright/test");
const { telephones, codeSalle, rejoindre, sansCdn } = require("./outils");

test("Qui a dit ça ? en ligne : le plus rapide marque le plus, résultats sur chaque téléphone", async ({ browser }) => {
  const QUESTIONS = { "Phrase de test, numéro un.": "Zed", "Phrase de test, numéro deux.": "Lou" };
  const [hote, lou, max] = await telephones(browser, 3, { reglages: { "qui-a-dit-v1": { players: ["Lou", "Max"], game: null,
    bank: Object.entries(QUESTIONS).map(([text, answer]) => ({ type: "dit", text, answer })) } } });
  const URL = "/qui-a-dit-ca/multijoueur.html";
  await hote.page.goto(URL);
  await hote.page.click("#asHost"); await hote.page.click("#create");
  const code = await codeSalle(hote.page);
  await rejoindre(lou.page, URL, code, "Lou");
  await rejoindre(max.page, URL, code, "Max");
  await expect(hote.page.locator(".roster li:not(.empty)")).toHaveCount(2);
  await hote.page.click("#start");

  for(let n = 0; n < 2; n++){
    const texte = (await hote.page.locator("blockquote.quote").textContent()).trim();
    const reponse = Object.entries(QUESTIONS).find(([t]) => texte.startsWith(t))[1];
    if(reponse === "Lou"){
      // Lou est la réponse : il ne répond pas, Max trouve seul
      await expect(lou.page.locator(".note")).toContainText("C'est ta question");
      await max.page.locator(".answer", { hasText: "Lou" }).click();
    } else {
      await lou.page.locator(".answer", { hasText: "Zed" }).click();
      await expect(hote.page.locator(".roster li:not(.off)")).toHaveCount(1);
      await max.page.locator(".answer", { hasText: "Zed" }).click();
    }
    await expect(hote.page.locator(".lead")).toContainText("Tout le monde a répondu");
    await hote.page.click("#go");
    // Le résultat s'affiche sur les téléphones
    await expect(max.page.locator(".culprit strong")).toHaveText(reponse);
    await expect(max.page.locator(".verdict-line")).toContainText(reponse === "Lou" ? "+3" : "+2");
    if(reponse === "Zed") await expect(lou.page.locator(".verdict-line")).toContainText("Le plus rapide. +3");
    else await expect(lou.page.locator(".verdict-line")).toContainText("Ils t'ont trouvé");
    await expect(lou.page.locator(".results li")).toHaveCount(reponse === "Lou" ? 1 : 2);
    await hote.page.click("#next");
  }
  // Classement final sur chaque téléphone : Max 2 + 3 = 5, Lou 3
  for(const t of [lou, max]){
    await expect(t.page.locator("h1.title")).toContainText("classement");
    await expect(t.page.locator(".ranking li").first()).toContainText("Max");
    await expect(t.page.locator(".ranking li").first().locator(".sc")).toHaveText("5");
  }
  await expect(max.page.locator(".lead")).toContainText("Tu finis premier avec 5 points");
  for(const t of [hote, lou, max]) expect(sansCdn(t.erreurs)).toEqual([]);
});

test("Mafia ou pas mafia en ligne : qui a voté quoi, puis les titres, sur chaque téléphone", async ({ browser }) => {
  const [hote, lou, max] = await telephones(browser, 3);
  const URL = "/mafia-pas-mafia/multijoueur.html";
  await hote.page.goto(URL);
  await hote.page.click("#asHost");
  await hote.page.click('[data-mode="sit"]'); await hote.page.click('[data-size="6"]');
  await hote.page.click("#create");
  const code = await codeSalle(hote.page);
  await rejoindre(lou.page, URL, code, "Lou");
  await rejoindre(max.page, URL, code, "Max");
  await expect(hote.page.locator(".roster li:not(.empty)")).toHaveCount(2);
  await hote.page.click("#start");
  // Lou met tout « mafia », Max tout « pas mafia »
  for(let c = 0; c < 6; c++){ await lou.page.click("#yes"); await max.page.click("#no"); }
  await expect(hote.page.locator("#go")).toBeEnabled();
  await hote.page.click("#go");
  await expect(lou.page.locator(".who .y li")).toHaveText(["Lou"]);
  await expect(lou.page.locator(".who .n li")).toHaveText(["Max"]);
  for(let c = 0; c < 6; c++) await hote.page.click("#next");
  for(const t of [lou, max]){
    await expect(t.page.locator(".award")).toHaveCount(2);
    await expect(t.page.locator(".top-list li")).toHaveCount(6);
  }
  await expect(max.page.locator(".award").first()).toContainText("Max"); // le Parrain : le moins de « mafia »
  for(const t of [hote, lou, max]) expect(sansCdn(t.erreurs)).toEqual([]);
});

test("Mafia ou pas mafia en ligne, Battle : les votes de chacun puis le tableau sur les téléphones", async ({ browser }) => {
  const [hote, lou, max] = await telephones(browser, 3);
  const URL = "/mafia-pas-mafia/multijoueur.html";
  await hote.page.goto(URL);
  await hote.page.click("#asHost");
  await hote.page.click('[data-mode="bat"]'); await hote.page.click('[data-bcat="popping"]'); await hote.page.click('[data-bfmt="one"]'); await hote.page.click('[data-bsize="4"]');
  await hote.page.click("#create");
  const code = await codeSalle(hote.page);
  await rejoindre(lou.page, URL, code, "Lou");
  await rejoindre(max.page, URL, code, "Max");
  await expect(hote.page.locator(".roster li:not(.empty)")).toHaveCount(2);
  await hote.page.click("#start");
  for(let d = 0; d < 20; d++){
    if(await hote.page.locator("#again").isVisible()) break;
    if(await hote.page.locator("#go").isVisible() && await hote.page.locator("#go").isEnabled() && !(await hote.page.locator('[data-side]').count())){ await hote.page.click("#go"); continue; }
    if(await lou.page.locator('button.fighter[data-side="a"]').isVisible()){
      await lou.page.click('button.fighter[data-side="a"]'); await max.page.click('button.fighter[data-side="a"]');
      await expect(hote.page.locator("#go")).toBeEnabled(); await hote.page.click("#go");
      await hote.page.click("#all");
      // Les deux votes, avec les prénoms, sur le téléphone
      // (révélés dans un ordre tiré au hasard)
      await expect(lou.page.locator(".who.three .y li")).toHaveCount(2);
      expect((await lou.page.locator(".who.three .y li").allTextContents()).sort()).toEqual(["Lou", "Max"]);
      await hote.page.click("#win");
      continue;
    }
    await hote.page.waitForTimeout(100);
  }
  await expect(lou.page.locator(".champ-name")).toBeVisible();
  await expect(lou.page.locator(".bracket section")).toHaveCount(2);
  for(const t of [hote, lou, max]) expect(sansCdn(t.erreurs)).toEqual([]);
});

test("Draft des anciens en ligne : choix du tour, roulettes, équipes et podium sur les téléphones", async ({ browser }) => {
  test.setTimeout(120000);
  const [hote, lou, max] = await telephones(browser, 3);
  const URL = "/draft-des-anciens/multijoueur.html";
  await hote.page.goto(URL);
  await hote.page.click("#asHost"); await hote.page.click("#create");
  const code = await codeSalle(hote.page);
  await rejoindre(lou.page, URL, code, "Lou");
  await rejoindre(max.page, URL, code, "Max");
  await expect(hote.page.locator(".roster li:not(.empty)")).toHaveCount(2);
  await hote.page.click("#start");
  const vus = new Set(), h = hote.page;
  const voir = async (sel, nom) => { if(await lou.page.locator(sel).first().isVisible()) vus.add(nom); };
  for(let i = 0; i < 400 && !vus.has("podium"); i++){
    await voir("#app .final-team .tcg", "choix du tour");
    await voir("#app .note.good", "roulette");
    await voir("#app .teamgrid", "équipe");
    await voir("#app .won li", "élections");
    await voir("#app .ranking li", "podium");
    // L'hôte avance : il valide les decks à la place des joueurs, puis enchaîne les écrans
    const auto = h.locator("[data-auto]");
    if(await auto.count()){ await auto.first().click(); await h.click(".ov [data-yes]"); continue; }
    for(const sel of ["#spin", "#more", "#validate", '[data-win]', "#next", "#go", "#ok"]){
      const b = h.locator(sel).first();
      if(await b.isVisible() && await b.isEnabled()){
        if(sel.startsWith("[data-win")){ await h.locator("[data-win]").first().click(); await h.locator("[data-lose]").last().click(); }
        else await b.click();
        break;
      }
    }
    if(await h.locator("[data-pick]").count() && !(await h.locator('[data-pick][aria-pressed="true"]').count())) await h.locator("[data-pick]").first().click();
    await h.waitForTimeout(40);
  }
  expect([...vus].sort()).toEqual(["choix du tour", "roulette", "élections", "équipe", "podium"].sort());
  await expect(max.page.locator("#app .screen > .ranking li")).toHaveCount(2);
  for(const t of [hote, lou, max]) expect(sansCdn(t.erreurs)).toEqual([]);
});

test("En ligne : le lien « Menu des jeux » ferme ou quitte proprement la salle", async ({ browser }) => {
  for(const jeu of ["mafia-pas-mafia", "draft-des-anciens", "qui-a-dit-ca"]){
    const [hote, lou, max] = await telephones(browser, 3, { reglages: { "qui-a-dit-v1": { players: ["Lou", "Max"], game: null, bank: [{ type: "dit", text: "Test.", answer: "Zed" }] } } });
    const URL = `/${jeu}/multijoueur.html`;
    // Écran de départ : retour direct au menu
    await hote.page.goto(URL);
    await hote.page.click("#menuBack");
    await expect(hote.page.locator("h1")).toContainText("Les jeux");
    await hote.page.goto(URL);
    await hote.page.click("#asHost"); await hote.page.click("#create");
    const code = await codeSalle(hote.page);
    await rejoindre(lou.page, URL, code, "Lou");
    await rejoindre(max.page, URL, code, "Max");
    await expect(hote.page.locator(".roster li:not(.empty)")).toHaveCount(2);
    // Un joueur quitte la salle pour revenir au menu
    await lou.page.click("#menuBack"); await lou.page.click(".ov [data-yes]");
    await expect(lou.page.locator("h1")).toContainText("Les jeux");
    await expect(hote.page.locator(".roster li:not(.empty)")).toHaveCount(1);
    // L'hôte ferme la salle : l'autre téléphone est prévenu
    await hote.page.click("#menuBack"); await hote.page.click(".ov [data-yes]");
    await expect(hote.page.locator("h1")).toContainText("Les jeux");
    await expect(max.page.locator(".error-box")).toContainText("fermée");
    // En revenant sur le jeu, l'hôte repart de zéro (pas de salle fantôme)
    await hote.page.goto(URL);
    await expect(hote.page.locator("#asHost")).toBeVisible();
    for(const t of [hote, lou, max]){ expect(sansCdn(t.erreurs)).toEqual([]); await t.page.context().close(); }
  }
});

test("En ligne : changer de jeu en gardant la même salle et les mêmes joueurs", async ({ browser }) => {
  const [hote, lou, max] = await telephones(browser, 3, { reglages: { "qui-a-dit-v1": { players: ["Lou", "Max"], game: null, bank: [{ type: "dit", text: "Test.", answer: "Zed" }] } } });
  await hote.page.goto("/mafia-pas-mafia/multijoueur.html");
  await hote.page.click("#asHost"); await hote.page.click("#create");
  const code = await codeSalle(hote.page);
  // L'hôte joue aussi
  await hote.page.fill("#hjName", "Hôte"); await hote.page.click("#hj button");
  await rejoindre(lou.page, "/mafia-pas-mafia/multijoueur.html", code, "Lou");
  await rejoindre(max.page, "/mafia-pas-mafia/multijoueur.html", code, "Max");
  await expect(hote.page.locator(".roster li:not(.empty)")).toHaveCount(3);
  for(const [jeu, chemin] of [["Qui a dit ça ?", "/qui-a-dit-ca/"], ["Draft des anciens", "/draft-des-anciens/"], ["Mafia ou pas mafia", "/mafia-pas-mafia/"]]){
    await hote.page.locator("[data-jeu]", { hasText: jeu }).click();
    await hote.page.click(".ov [data-yes]");
    await expect(hote.page).toHaveURL(new RegExp(chemin.replace(/\//g, "\\/") + "multijoueur\\.html"));
    for(const t of [lou, max]) await expect(t.page).toHaveURL(new RegExp(chemin.replace(/\//g, "\\/") + "multijoueur\\.html\\?salle=" + code));
    // Même code, et tout le monde est revenu dans la salle tout seul
    await expect(hote.page.locator(".room .code")).toHaveText(code);
    await expect(hote.page.locator(".roster li:not(.empty)")).toHaveCount(3);
    await expect(lou.page.locator(".roster li")).toHaveCount(3);
  }
  for(const t of [hote, lou, max]) expect(sansCdn(t.erreurs)).toEqual([]);
});
