// Versions multijoueur : sans internet (Supabase coupé), la page doit s'ouvrir sans planter.
// La partie en ligne elle-même se teste à plusieurs téléphones, pas ici.
const { test, expect } = require("@playwright/test");
const { ouvrir } = require("./outils");

for(const url of ["/mafia-pas-mafia/multijoueur.html", "/draft-des-anciens/multijoueur.html", "/qui-a-dit-ca/multijoueur.html"]){
  test(`${url} s'ouvre sans erreur`, async ({ page }) => {
    const erreurs = await ouvrir(page, url);
    await expect(page.locator("#app button").first()).toBeVisible();
    // Supabase est coupé : seule l'absence de la librairie peut être signalée, rien d'autre
    expect(erreurs.filter(e => !/supabase|QRCode/i.test(e))).toEqual([]);
  });
}

// Sans internet, on peut quand même jouer un Battle sur l'écran hôte : on fait entrer deux
// joueurs « à la main » (comme s'ils avaient rejoint la salle) et on joue en call out (sans vote).
async function salleBattle(page, { cat, fmt = "callout", taille = "4" }){
  const erreurs = await ouvrir(page, "/mafia-pas-mafia/multijoueur.html", { reglages: { "battle-musique": { on: false, len: 30, links: {} } } });
  await page.click("#asHost");
  await page.click('[data-mode="bat"]'); await page.click(`[data-bcat="${cat}"]`); await page.click(`[data-bfmt="${fmt}"]`); await page.click(`[data-bsize="${taille}"]`);
  await page.click("#create");
  await page.evaluate(() => { onHostMsg({ t: "hello", id: "joueura", name: "Jo" }); onHostMsg({ t: "hello", id: "joueurb", name: "Lou" }); });
  await page.click("#start");
  return erreurs;
}
// Joue les duels en call out jusqu'à l'écran attendu (fin d'un tournoi ou champion)
async function jouerCallout(page, jusqua){
  for(let i = 0; i < 60; i++){
    if(await page.locator(jusqua).isVisible()) return;
    if(await page.locator("#go").isVisible()){ await page.click("#go"); continue; }
    if(await page.locator('[data-out="b"]').isVisible()){ await page.click('[data-out="b"]'); await page.click(".ov [data-yes]"); continue; }
    await page.waitForTimeout(50);
  }
  throw new Error("Écran introuvable : " + jusqua);
}
const sansSupabase = e => e.filter(x => !/supabase|QRCode/i.test(x));

test("En ligne, All Style Bad : Popping, puis Hip hop, puis grande finale", async ({ page }) => {
  const erreurs = await salleBattle(page, { cat: "bad" });
  await expect(page.locator(".meta")).toContainText("All Style Bad, tournoi Popping");
  // Roulette de style sur l'écran hôte, sans musique
  await page.click("#go");
  await page.click("#roul");
  await expect(page.locator(".roul-txt small")).toHaveText("Style imposé");
  await jouerCallout(page, "#next");
  const champPop = await page.locator(".champ-name").textContent();
  await expect(page.locator(".champ .meta")).toContainText("champion Popping");
  await page.click("#next");
  await expect(page.locator(".meta")).toContainText("tournoi Hip hop");
  // Annuler revient à la fin du tournoi Popping
  await page.click("#undo"); await page.click(".ov [data-yes]");
  await expect(page.locator(".champ-name")).toHaveText(champPop);
  await page.click("#next");
  await jouerCallout(page, "#next");
  const champHip = await page.locator(".champ-name").textContent();
  expect(champHip).not.toBe(champPop);
  await page.click("#next");
  await expect(page.locator("h1")).toContainText("Grande");
  await jouerCallout(page, "#again");
  await expect(page.locator(".champ .meta")).toContainText("All Style Bad");
  const resume = await page.locator(".champ").textContent();
  expect(resume).toContain(champPop); expect(resume).toContain(champHip);
  expect(sansSupabase(erreurs)).toEqual([]);
});

test("En ligne, Les anciens : le tournoi prend les anciens", async ({ page }) => {
  const erreurs = await salleBattle(page, { cat: "anciens", taille: "8" });
  const anciens = await page.evaluate(() => window.MAFIA_DATA.anciens);
  const noms = (await page.locator(".mlist span").allTextContents()).map(n => n.replace(" (prime)", ""));
  expect(noms).toHaveLength(8);
  for(const n of noms) expect(anciens).toContain(n);
  await jouerCallout(page, "#again");
  await expect(page.locator(".champ .meta")).toContainText("Les anciens");
  expect(sansSupabase(erreurs)).toEqual([]);
});
