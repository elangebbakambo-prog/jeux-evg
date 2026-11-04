// Listes de danseurs : elles sont écrites une seule fois, dans mafia-pas-mafia/donnees.js,
// et lues par la version un téléphone comme par la version multijoueur.
// Chaque danseur d'une catégorie doit être dans la liste complète (sinon il n'apparaît jamais).
const { test, expect } = require("@playwright/test");
const fs = require("fs"), path = require("path");

const dir = path.resolve(__dirname, "../mafia-pas-mafia");
const script = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const donnees = fs.readFileSync(path.join(dir, "donnees.js"), "utf8");
const liste = re => { const m = donnees.match(re); expect(m, `liste introuvable : ${re}`).toBeTruthy(); return JSON.parse(m[1]); };
const L = () => ({
  dancers: liste(/dancers: (\[[^\]]*\])/),
  hiphop:  liste(/hiphop: (\[[^\]]*\])/),
  popping: liste(/popping: (\[[^\]]*\])/),
  anciens: liste(/anciens: (\[[^\]]*\])/)
});

test("Les listes ne sont plus recopiées dans script.js", () => {
  expect(script).not.toMatch(/const (DANCER|HIPHOP|POPPING|ANCIENS)_NAMES = \[/);
  for(const page of ["index.html", "multijoueur.html"])
    expect(fs.readFileSync(path.join(dir, page), "utf8"), `${page} doit charger donnees.js`).toMatch(/<script src="donnees\.js/);
});

for(const k of ["dancers", "hiphop", "popping", "anciens"]){
  test(`Liste ${k} : pas de doublon ni de nom vide`, () => {
    const low = L()[k].map(n => n.trim().toLowerCase());
    expect(low.filter(n => !n)).toEqual([]);
    expect(low.filter((n, i) => low.indexOf(n) !== i)).toEqual([]);
  });
}

test("Chaque danseur Hip hop, Popping et des anciens est dans la liste complète", () => {
  const l = L(), all = new Set(l.dancers.map(n => n.toLowerCase()));
  expect([...l.hiphop, ...l.popping, ...l.anciens].filter(n => !all.has(n.toLowerCase()))).toEqual([]);
});

// Le mode Danseurs garde la liste complète ; le Battle All style prend Hip hop + Popping, ni plus ni moins
test("Battle All style = Hip hop + Popping ; mode Danseurs = liste complète", async ({ page }) => {
  const l = L(), union = new Set([...l.hiphop, ...l.popping].map(n => n.toLowerCase())).size;
  await page.goto("/mafia-pas-mafia/index.html");
  await page.click('[data-mode="bat"]');
  await expect(page.locator('[data-bcat="all"] small')).toHaveText(`${union} danseurs`);
  await expect(page.locator('[data-bcat="anciens"] small')).toHaveText(`${l.anciens.length} danseurs`);
  await expect(page.locator('[data-mode="dan"] small')).toHaveText(`${l.dancers.length} danseurs`);
});
