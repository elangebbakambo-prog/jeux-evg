// Mafia ou pas mafia (un seul téléphone) : on joue de vraies parties de bout en bout.
const { test, expect } = require("@playwright/test");
const { ouvrir } = require("./outils");

const URL = "/mafia-pas-mafia/index.html";
const SANS_MUSIQUE = { "battle-musique": { on: false, len: 30, links: {} } };

// Mode Battle : joue tous les duels (format 1 passage, 3 passages ou call out) jusqu'au champion
async function jouerTournoi(page, { roulette = false } = {}){
  const ecrans = [];
  for(let i = 0; i < 200; i++){
    if(await page.locator(".champ-name").isVisible() && await page.locator("#again").isVisible()) return ecrans;
    if(await page.locator("#next").isVisible()){ ecrans.push("fin:" + await page.locator(".champ-name").textContent()); await page.click("#next"); continue; }
    if(await page.locator("#go").isVisible()){ ecrans.push("intro:" + await page.locator("h1").textContent()); await page.click("#go"); continue; }
    const a = page.locator('[data-side="a"]');
    if(await a.isVisible()){
      if(roulette){
        await page.click("#roul");
        await expect(page.locator(".roul-txt small")).toHaveText("Style imposé", { timeout: 5000 });
        roulette = false;
      }
      await a.click(); await page.waitForTimeout(60);
      continue;
    }
    await page.waitForTimeout(100);
  }
  throw new Error("Le tournoi ne se termine pas. Écrans : " + ecrans.join(" > "));
}

test("Situations : une partie complète à 2 joueurs, jusqu'aux titres", async ({ page }) => {
  const erreurs = await ouvrir(page, URL);
  await page.click('[data-mode="sit"]');
  await page.click('[data-size="6"]');
  await page.click("#start");
  for(let j = 0; j < 5; j++){
    await page.click("#go");
    for(let c = 0; c < 6; c++) await page.click(c % 2 ? "#yes" : "#no");
  }
  await page.click("#go"); // verdict
  for(let c = 0; c < 6; c++) await page.click("#next");
  await expect(page.locator(".award")).toHaveCount(4);
  expect(erreurs).toEqual([]);
});

test("Situations : revenir à la carte précédente", async ({ page }) => {
  const erreurs = await ouvrir(page, URL);
  await page.click('[data-mode="sit"]');
  await page.click("#start"); await page.click("#go");
  await page.click("#yes");
  await expect(page.locator("header.bar")).toContainText("2 sur");
  await page.click("#undo");
  await expect(page.locator("header.bar")).toContainText("1 sur");
  expect(erreurs).toEqual([]);
});

test("Danseurs : une partie se lance et se joue", async ({ page }) => {
  const erreurs = await ouvrir(page, URL);
  await page.click('[data-mode="dan"]');
  await page.click('[data-size="6"]');
  await page.click("#start"); await page.click("#go");
  await expect(page.locator(".card.top .c-name")).toBeVisible();
  for(let c = 0; c < 6; c++) await page.click("#yes");
  await expect(page.locator("h1.big")).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("La partie en cours survit à un rechargement de la page", async ({ page }) => {
  const erreurs = await ouvrir(page, URL);
  await page.click('[data-mode="sit"]');
  await page.click("#start"); await page.click("#go"); await page.click("#no");
  await page.reload();
  await expect(page.locator("header.bar")).toContainText("2 sur");
  expect(erreurs).toEqual([]);
});

test("Préparer : ajouter puis supprimer des danseurs", async ({ page }) => {
  const erreurs = await ouvrir(page, URL);
  await page.click('[data-mode="dan"]');
  await page.click("#bank");
  await page.fill("#qtext", "Testeur Un, Testeur Deux");
  await page.click("#addq");
  await expect(page.locator(".note")).toContainText("2 danseurs ajoutés");
  await page.locator('[aria-label="Supprimer Testeur Un"]').click();
  await page.click(".ov [data-yes]");
  await expect(page.locator('[aria-label="Supprimer Testeur Un"]')).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

// Chaque catégorie x chaque format, tournoi de 4 : rien ne doit planter
for(const cat of ["all", "hiphop", "popping"]){
  for(const fmt of ["one", "three", "callout"]){
    test(`Battle ${cat}, format ${fmt} : tournoi complet`, async ({ page }) => {
      const erreurs = await ouvrir(page, URL);
      await page.click('[data-mode="bat"]');
      await page.click(`[data-bcat="${cat}"]`);
      await page.click(`[data-bfmt="${fmt}"]`);
      await page.click('[data-bsize="4"]');
      await page.click("#start");
      await jouerTournoi(page);
      await expect(page.locator(".champ .meta")).toContainText("Champion");
      expect(erreurs).toEqual([]);
    });
  }
}

test("Battle : annuler le dernier choix", async ({ page }) => {
  const erreurs = await ouvrir(page, URL);
  await page.click('[data-mode="bat"]'); await page.click('[data-bcat="all"]'); await page.click('[data-bfmt="one"]'); await page.click('[data-bsize="4"]');
  await page.click("#start"); await page.click("#go");
  await page.click('[data-side="a"]');
  await expect(page.locator("header.bar")).toContainText("Duel 2");
  await page.click("#undo");
  await expect(page.locator("header.bar")).toContainText("Duel 1");
  expect(erreurs).toEqual([]);
});

test("All Style Bad : Popping, puis Hip hop, puis grande finale entre les deux champions", async ({ page }) => {
  const erreurs = await ouvrir(page, URL, { reglages: SANS_MUSIQUE });
  await page.click('[data-mode="bat"]');
  await page.click('[data-bcat="bad"]'); await page.click('[data-bfmt="one"]'); await page.click('[data-bsize="4"]');
  await page.click("#start");
  const ecrans = await jouerTournoi(page, { roulette: true });
  const fins = ecrans.filter(e => e.startsWith("fin:")).map(e => e.slice(4));
  expect(fins).toHaveLength(2);
  expect(fins[0]).not.toBe(fins[1]); // le champion Popping ne rejoue pas en Hip hop
  expect(ecrans.some(e => /Grande\s*finale/.test(e))).toBe(true);
  await expect(page.locator(".champ .meta")).toContainText("All Style Bad");
  // Le champion (en titre) et son adversaire (dans la phrase) sont les deux champions de phase
  const resume = await page.locator(".champ").textContent();
  for(const f of fins) expect(resume).toContain(f);
  expect(erreurs).toEqual([]);
});

test("Roulette de style : seulement sans musique", async ({ page }) => {
  const erreurs = await ouvrir(page, URL);
  await page.click('[data-mode="bat"]'); await page.click('[data-bcat="popping"]'); await page.click('[data-bfmt="one"]'); await page.click('[data-bsize="4"]');
  await page.click('[data-mus-on="1"]');
  await expect(page.locator("[data-roul]")).toHaveCount(0);
  await page.click("#start"); await page.click("#go");
  await expect(page.locator("#roul")).toHaveCount(0);
  await page.click('[data-side="a"]'); // sans plantage avec la musique (SoundCloud coupé pendant les tests)
  expect(erreurs).toEqual([]);
});
