// Cartes du Draft (draft-des-anciens/cartes.js) : la liste, les raretés et les règles de notes.
const { test, expect } = require("@playwright/test");
const { ouvrir } = require("./outils");

test("Draft : 86 danseurs + la carte Mythique du marié, raretés d'après la note", async ({ page }) => {
  const erreurs = await ouvrir(page, "/draft-des-anciens/index.html");
  const r = await page.evaluate(() => {
    const pool = buildPool("Sobek");
    const rar = n => cardData(pool.find(c => c.name === n && !c.groom)).rarity;
    const pts = (n, cat) => rawScore(pool.find(c => c.name === n && !c.groom), CATS.find(c => c.id === cat));
    return {
      n: pool.length, sobek: pool.filter(c => c.name === "Sobek").map(c => cardData(c).rarity).sort(),
      icee: rar("Icee"), elange: rar("Elange"), paul: rar("Paul (Meute Céleste)"),
      // Ughost bat Elange en Battle, Elange (complet) reste devant en Best dancer
      battle: pts("Ughost", "battle") > pts("Elange", "battle"), best: pts("Elange", "best") > pts("Ughost", "best"),
      leah: domainNotes("Leah").battle, ugh: domainNotes("Ughost").battle,
      fortes: CATS.filter(c => !["best", "bad"].includes(c.id)).every(c => pts("Icee", c.id) >= pts("Ronyl", c.id))
    };
  });
  expect(r.n).toBe(87);
  expect(r.sobek).toEqual(["Mythique", "Rare"]);
  expect([r.icee, r.elange, r.paul]).toEqual(["Légendaire", "Rare", "Commune"]);
  expect(r.battle).toBe(true); expect(r.best).toBe(true);
  expect(r.leah).toBeGreaterThanOrEqual(90);  // spécialiste
  expect(r.ugh).toBeLessThan(90);             // fort en battle, pas spécialiste
  expect(r.fortes).toBe(true);
  expect(erreurs).toEqual([]);
});

test("Draft : chaque carte a 2 attaques, et le Draft ne garde que les Popping choisis", async ({ page }) => {
  await ouvrir(page, "/draft-des-anciens/index.html");
  const r = await page.evaluate(() => ({
    sans: DANCERS.filter(n => cardData({ name: n, style: dancerStyle(n) }).moves.length !== 2),
    retire: ["Kei", "Marta", "Lady C"].filter(n => DANCERS.includes(n)),
    nouveaux: ["Kate", "Julian Hyun"].filter(n => DANCERS.includes(n))
  }));
  expect(r.sans).toEqual([]);
  expect(r.retire).toEqual([]);
  expect(r.nouveaux).toEqual(["Kate", "Julian Hyun"]);
});

test("Galerie : les cartes du plus fort au plus faible, filtre par rareté", async ({ page }) => {
  const erreurs = await ouvrir(page, "/draft-des-anciens/index.html");
  await page.getByRole("button", { name: /cartes|galerie/i }).first().click();
  const noms = page.locator(".gallery").last().locator(".t-name");
  await expect(noms.first()).toHaveText("Icee");
  await page.click('[data-filter="Commune"]');
  await expect(page.locator(".gallery").last().locator(".tcg")).toHaveCount(9);
  expect(erreurs).toEqual([]);
});
