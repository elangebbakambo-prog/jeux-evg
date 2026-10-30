// Draft des anciens et Qui a dit ça ? : un « joueur robot » touche les boutons pendant
// des centaines d'étapes. Le test échoue si une erreur JavaScript apparaît ou si l'écran se vide.
const { test, expect } = require("@playwright/test");
const { ouvrir, explorer } = require("./outils");

for(const [jeu, url] of [["Draft des anciens", "/draft-des-anciens/index.html"], ["Qui a dit ça ?", "/qui-a-dit-ca/index.html"], ["Mafia ou pas mafia", "/mafia-pas-mafia/index.html"]]){
  for(const graine of [1, 7, 42]){
    test(`${jeu} : partie au hasard n°${graine} sans plantage`, async ({ page }) => {
      const erreurs = await ouvrir(page, url);
      const vus = await explorer(page, { etapes: 160, graine });
      expect(vus.size, "le robot doit pouvoir avancer dans le jeu").toBeGreaterThan(3);
      expect(erreurs).toEqual([]);
    });
  }
}

test("Draft des anciens : la partie survit à un rechargement", async ({ page }) => {
  const erreurs = await ouvrir(page, "/draft-des-anciens/index.html");
  await explorer(page, { etapes: 40, graine: 3 });
  await page.reload();
  await expect(page.locator("#app")).not.toBeEmpty();
  expect(erreurs).toEqual([]);
});
