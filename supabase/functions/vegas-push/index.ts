// vegas-push : relais des notifications de l'appli « Vegas EVG ».
// La base l'appelle à chaque nouveau post / Moment / commentaire, avec la liste des téléphones abonnés.
// Aucune clé n'est stockée ici : elles viennent de la base. Sans la clé privée, personne ne peut notifier nos abonnés.
// Standard Web Push (RFC 8030, 8291 chiffrement aes128gcm, 8292 VAPID), uniquement avec Web Crypto.

const enc = new TextEncoder();

function b64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(s: string): Uint8Array {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

// --- VAPID : un jeton signé ES256 qui prouve que la notification vient bien de notre appli ---
async function vapidKey(pub: string, priv: string): Promise<CryptoKey> {
  const p = unb64u(pub);
  return crypto.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256", d: priv, x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), ext: true,
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}
async function vapidHeader(endpoint: string, key: CryptoKey, pub: string, subject: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${pub}`;
}

// --- Chiffrement du message pour un téléphone (RFC 8291, aes128gcm) ---
async function encrypt(payload: Uint8Array, p256dh: string, auth: string): Promise<Uint8Array> {
  const uaPublic = unb64u(p256dh), authSecret = unb64u(auth);
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, pair.privateKey, 256));
  const prkKey = await hmac(authSecret, shared);
  const ikm = (await hmac(prkKey, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])))).slice(0, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // taille d'enregistrement : 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function sendAll(vapid: { pub: string; priv: string; subject: string }, subs: Sub[], payload: unknown, urgency = "normal") {
  const key = await vapidKey(vapid.pub, vapid.priv);
  const data = enc.encode(JSON.stringify(payload));
  return Promise.all(subs.map(async (s) => {
    try {
      if (!s?.endpoint?.startsWith("https://") || !s.keys?.p256dh || !s.keys?.auth) return { endpoint: s?.endpoint, status: 0 };
      const body = await encrypt(data, s.keys.p256dh, s.keys.auth);
      const r = await fetch(s.endpoint, {
        method: "POST",
        headers: {
          Authorization: await vapidHeader(s.endpoint, key, vapid.pub, vapid.subject),
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          TTL: "86400",
          Urgency: urgency === "high" ? "high" : "normal",
        },
        body,
      });
      return { endpoint: s.endpoint, status: r.status };
    } catch (e) {
      return { endpoint: s?.endpoint, status: 0, error: String(e) };
    }
  }));
}

if (typeof Deno !== "undefined") {
  Deno.serve(async (req) => {
    if (req.method !== "POST") return new Response("vegas-push ok");
    let j;
    try { j = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
    if (!j?.vapid?.pub || !j?.vapid?.priv || !Array.isArray(j?.subs)) return new Response("bad request", { status: 400 });
    const results = await sendAll(j.vapid, j.subs.slice(0, 200), j.payload ?? {}, j.urgency);
    return new Response(JSON.stringify({ results }), { headers: { "Content-Type": "application/json" } });
  });
}
