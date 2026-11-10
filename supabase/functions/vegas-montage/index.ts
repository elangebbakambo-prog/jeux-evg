// vegas-montage : l'IA (Claude) transforme une demande en français en « plan de montage » pour l'appli Vegas EVG.
// La clé API est dans les secrets Supabase (ANTHROPIC_API_KEY), jamais dans l'appli.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: true, info: "vegas-montage" });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "clé API manquante (secret ANTHROPIC_API_KEY)" }, 500);
  let body: { demande?: string; passages?: unknown[]; sujet?: string };
  try { body = await req.json(); } catch { return json({ error: "requête illisible" }, 400); }
  const demande = String(body.demande || "").slice(0, 1500).trim();
  const passages = Array.isArray(body.passages) ? body.passages.slice(0, 80) : [];
  if (!demande || !passages.length) return json({ error: "demande ou passages manquants" }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 3000,
      system: CONSIGNES,
      messages: [{ role: "user", content: `Sujet : ${String(body.sujet || "").slice(0, 80)}\nPassages :\n${JSON.stringify(passages)}\n\nDemande :\n${demande}` }],
    }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) return json({ error: "IA indisponible (" + r.status + ")" }, 502);
  const txt = (j.content || []).map((c: { text?: string }) => c.text || "").join("");
  const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
  try { return json({ plan: JSON.parse(txt.slice(a, b + 1)) }); }
  catch { return json({ error: "réponse de l'IA illisible" }, 502); }
});
