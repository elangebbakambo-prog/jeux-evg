// Versions multijoueur : sans internet (Supabase coupé), la page doit s'ouvrir sans planter.
// La partie en ligne elle-même se teste à plusieurs téléphones, pas ici.
const { test, expect } = require("@playwright/test");
const { ouvrir } = require("./outils");

for(const url of ["/mafia-pas-mafia/multijoueur.html", "/draft-des-anciens/multijoueur.html"]){
  test(`${url} s'ouvre sans erreur`, async ({ page }) => {
    const erreurs = await ouvrir(page, url);
    await expect(page.locator("#app button").first()).toBeVisible();
    // Supabase est coupé : seule l'absence de la librairie peut être signalée, rien d'autre
    expect(erreurs.filter(e => !/supabase|QRCode/i.test(e))).toEqual([]);
  });
}
