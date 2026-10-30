// Listes de danseurs : la version un téléphone (script.js) et la version multijoueur
// (donnees.js) doivent rester identiques, et chaque danseur d'une catégorie doit être
// dans la liste complète (sinon il n'apparaît jamais dans le Battle).
const { test, expect } = require("@playwright/test");
const fs = require("fs"), path = require("path");

const dir = path.resolve(__dirname, "../mafia-pas-mafia");
const script = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const donnees = fs.readFileSync(path.join(dir, "donnees.js"), "utf8");
const liste = (src, re) => { const m = src.match(re); expect(m, `liste introuvable : ${re}`).toBeTruthy(); return JSON.parse(m[1]); };

const solo = {
  dancers: liste(script, /const DANCER_NAMES = (\[[^\]]*\])/),
  hiphop:  liste(script, /const HIPHOP_NAMES = (\[[^\]]*\])/),
  popping: liste(script, /const POPPING_NAMES = (\[[^\]]*\])/)
};
const multi = {
  dancers: liste(donnees, /dancers: (\[[^\]]*\])/),
  hiphop:  liste(donnees, /hiphop: (\[[^\]]*\])/),
  popping: liste(donnees, /popping: (\[[^\]]*\])/)
};

for(const k of ["dancers", "hiphop", "popping"]){
  test(`Liste ${k} : identique en solo et en multijoueur`, () => {
    expect(multi[k]).toEqual(solo[k]);
  });
  test(`Liste ${k} : pas de doublon ni de nom vide`, () => {
    const low = solo[k].map(n => n.trim().toLowerCase());
    expect(low.filter(n => !n)).toEqual([]);
    expect(low.filter((n, i) => low.indexOf(n) !== i)).toEqual([]);
  });
}

test("Chaque danseur Hip hop et Popping est dans la liste complète", () => {
  const all = new Set(solo.dancers.map(n => n.toLowerCase()));
  expect([...solo.hiphop, ...solo.popping].filter(n => !all.has(n.toLowerCase()))).toEqual([]);
});
