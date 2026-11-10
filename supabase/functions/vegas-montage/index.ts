// vegas-montage : une IA transforme une demande en français en « plan de montage » pour l'appli Vegas EVG.
// Deux possibilités, selon le secret rangé dans Supabase (jamais dans l'appli) :
//  - GEMINI_API_KEY : Gemini de Google, gratuit (clé sur aistudio.google.com, sans carte, nombre de demandes par jour limité) ;
//  - ANTHROPIC_API_KEY : Claude, payant à l'usage (environ 1 à 2 centimes par montage).
// Si les deux sont là, Gemini (gratuit) passe en premier.
// Entrée : { demande, passages:[{ n, type, auteur, jour, heure, texte, reactions, commentaires, lieu }], sujet }
// Sortie : { plan:{ titre, sous_titre, fin, infos, son, resume, items:[{ n, duree, debut, fin, vitesse, transition, texte, mouvement }] } }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const CONSIGNES = `Tu es monteur vidéo pour l'appli « Vegas EVG » (enterrement de vie de garçon de Sobek / Chris à Las Vegas, entre potes danseurs).
On te donne une liste de passages (photos et vidéos de stories, numérotés n) et la demande de l'utilisateur, en français oral (parfois dictée, avec des fautes).
Tu renvoies UNIQUEMENT un objet JSON, sans texte autour, de la forme :
{"titre":"…","sous_titre":"…","fin":"…","infos":true,"son":true,"resume":"une phrase qui dit ce que tu as fait","items":[{"n":1,"duree":3,"debut":0,"fin":5,"vitesse":1,"transition":"fondu","texte":"","mouvement":true}]}
Règles :
- items = les passages dans l'ordre du montage. Tu peux en retirer, les réordonner, mais n'utilise que des n existants, chacun au plus une fois. Sans indication, garde-les tous dans l'ordre.
- photo : "duree" en secondes (0.8 à 10 ; 1 à 1.5 = rythmé, 3 = normal, 5 = posé). "mouvement" = léger zoom lent (true par défaut).
- vidéo : "debut" et "fin" en secondes dans la vidéo (fin 0 = jusqu'au bout ; sans précision, 0 à 5). "vitesse" : 0.5 (ralenti), 1, ou 2 (accéléré).
- "transition" = comment le passage arrive : "fondu" (fondu enchaîné, doux), "noir" (fondu au noir, pause), "coupe" (coupe sèche, nerveux), "glisse" (glissé latéral), "zoom" (zoom d'entrée, punchy), "flash" (flash blanc, effet soirée). Varie intelligemment selon l'ambiance demandée.
- "texte" = court texte écrit en gros à l'écran sur ce passage (max 40 caractères), seulement si demandé ou vraiment pertinent.
- "titre" (max 30 car.), "sous_titre", "fin" = cartons d'ouverture et de fin. "infos" = afficher noms et heures en bas (true par défaut ; false si l'utilisateur veut un rendu épuré). "son" = garder le son des vidéos.
- Quand l'utilisateur désigne un passage par une personne, un moment ou un texte (« la vidéo du quad », « la photo d'Isma à la piscine »), retrouve-le grâce à auteur, heure, jour et texte.
- Si la demande parle de rythme (« dynamique », « clip »), raccourcis les durées et utilise coupe/flash/zoom ; si « émouvant » ou « souvenir », durées plus longues et fondus.`;

async function askGemini(key: string, user: string): Promise<string> {
  // Les noms de modèles changent souvent : on essaie les alias « dernier modèle » puis un nom stable.
  const models = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"].filter(Boolean) as string[];
  let last = "";
  for (const m of models) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CONSIGNES }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4000, temperature: 0.6 },
      }),
    });
    const j = await r.json().catch(() => null);
    if (r.ok && j) return ((j.candidates?.[0]?.content?.parts) || []).map((p: { text?: string }) => p.text || "").join("");
    last = `Gemini ${m} : ${r.status}${r.status === 429 ? " (quota gratuit du jour atteint, réessaie plus tard)" : ""}`;
    if (r.status === 429 || r.status === 401 || r.status === 403) break;
  }
  throw new Error(last || "Gemini indisponible");
}
async function askClaude(key: string, user: string): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-5-5", max_tokens: 3000, system: CONSIGNES, messages: [{ role: "user", content: user }] }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error("Claude : " + r.status);
  return (j.content || []).map((c: { text?: string }) => c.text || "").join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: true, info: "vegas-montage" });
  const gem = Deno.env.get("GEMINI_API_KEY"), cla = Deno.env.get("ANTHROPIC_API_KEY");
  if (!gem && !cla) return json({ error: "aucune clé d'IA (secret GEMINI_API_KEY ou ANTHROPIC_API_KEY)" }, 500);
  let body: { demande?: string; passages?: unknown[]; sujet?: string };
  try { body = await req.json(); } catch { return json({ error: "requête illisible" }, 400); }
  const demande = String(body.demande || "").slice(0, 1500).trim();
  const passages = Array.isArray(body.passages) ? body.passages.slice(0, 80) : [];
  if (!demande || !passages.length) return json({ error: "demande ou passages manquants" }, 400);
  const user = `Sujet : ${String(body.sujet || "").slice(0, 80)}\nPassages :\n${JSON.stringify(passages)}\n\nDemande :\n${demande}`;
  let txt = "";
  try { txt = gem ? await askGemini(gem, user) : await askClaude(cla!, user); }
  catch (e) {
    if (gem && cla) { try { txt = await askClaude(cla, user); } catch { return json({ error: String((e as Error).message) }, 502); } }
    else return json({ error: String((e as Error).message) }, 502);
  }
  const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
  try { return json({ plan: JSON.parse(txt.slice(a, b + 1)) }); }
  catch { return json({ error: "réponse de l'IA illisible" }, 502); }
});
