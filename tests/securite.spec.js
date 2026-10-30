// Vérifications de sécurité, sans navigateur : on lit les fichiers du site.
const { test, expect } = require("@playwright/test");
const fs = require("fs"), path = require("path"), crypto = require("crypto"), { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const fichiers = ext => {
  const out = [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(f => {
    if([".git", "node_modules", "tests", "test-results", "playwright-report"].includes(f.name)) return;
    const p = path.join(d, f.name);
    if(f.isDirectory()) walk(p); else if(p.endsWith(ext)) out.push(p);
  });
  walk(ROOT); return out;
};
const rel = p => path.relative(ROOT, p);
const htmls = fichiers(".html"), jss = fichiers(".js");

test("Aucun fichier JavaScript n'a d'erreur de syntaxe", () => {
  for(const f of jss) execFileSync(process.execPath, ["--check", f]);
});

test("Pas de clé secrète Supabase ni de mot de passe dans le code", () => {
  for(const f of [...jss, ...htmls]){
    const t = fs.readFileSync(f, "utf8");
    expect(t, `${rel(f)} contient une clé secrète`).not.toMatch(/sb_secret_[A-Za-z0-9_-]+/);
    // Anciennes clés Supabase (JWT) : on lit leur rôle, « service_role » est la clé secrète
    for(const [, payload] of t.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){
      let role = ""; try{ role = JSON.parse(Buffer.from(payload, "base64url").toString()).role; }catch(e){}
      expect(role, `${rel(f)} contient une clé service_role`).not.toBe("service_role");
    }
  }
  const cfg = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
  const cle = (cfg.match(/supabaseKey:\s*"([^"]*)"/) || [])[1] || "";
  expect(cle === "" || cle.startsWith("sb_publishable_"), "config.js doit contenir la clé publishable, jamais la secrète").toBe(true);
});

// Un script chargé depuis un autre site (CDN) doit avoir une empreinte « integrity » :
// si le CDN est piraté et sert un autre fichier, le navigateur refuse de l'exécuter.
const externes = () => htmls.flatMap(f => [...fs.readFileSync(f, "utf8").matchAll(/<script\b[^>]*\bsrc="(https?:[^"]+)"[^>]*>/g)].map(m => ({ f: rel(f), tag: m[0], src: m[1] })));

test("Chaque script venant d'un CDN est verrouillé par une empreinte (integrity)", () => {
  for(const s of externes()){
    expect(s.tag, `${s.f} : ${s.src} n'a pas d'integrity`).toMatch(/\bintegrity="sha(256|384|512)-/);
    expect(s.tag, `${s.f} : ${s.src} a besoin de crossorigin="anonymous"`).toMatch(/crossorigin="anonymous"/);
    expect(s.src, `${s.f} : ${s.src} doit indiquer une version précise`).toMatch(/@\d+\.\d+\.\d+|\/\d+\.\d+\.\d+\//);
  }
});

// Demande internet : lancé sur GitHub (CHECK_CDN=1), pas en local par défaut
test("Les empreintes correspondent aux fichiers servis par les CDN", async () => {
  test.skip(!process.env.CHECK_CDN, "CHECK_CDN=1 pour vérifier en ligne");
  for(const s of externes()){
    const m = s.tag.match(/integrity="(sha\d+)-([^"]+)"/); if(!m) continue;
    const r = await fetch(s.src); expect(r.ok, s.src).toBe(true);
    const h = crypto.createHash(m[1]).update(Buffer.from(await r.arrayBuffer())).digest("base64");
    expect(h, `${s.f} : l'empreinte de ${s.src} ne correspond plus`).toBe(m[2]);
  }
});

test("Les versions anti-cache sont les mêmes pour tous les fichiers d'une page", () => {
  for(const f of htmls){
    const v = [...new Set([...fs.readFileSync(f, "utf8").matchAll(/(?:src|href)="(?!https?:)[^"]+\?v=([^"&]+)"/g)].map(m => m[1]))];
    expect(v.length, `${rel(f)} mélange plusieurs versions : ${v.join(", ")}`).toBeLessThanOrEqual(1);
  }
});
