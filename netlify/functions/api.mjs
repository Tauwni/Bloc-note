/* Bloc Note : comptes (prénom + code à 6 chiffres) et sauvegarde des données.
   Stockage : Netlify Blobs (store « bloc-note »). */
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const STORE = "bloc-note";
const SESSION_DAYS = 90;
const store = () => getStore({ name: STORE, consistency: "strong" });

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

// « Tony F. » → « tony-f »
const norm = n => String(n || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-").slice(0, 40);
const hashCode = (code, salt) => crypto.pbkdf2Sync(String(code), salt, 150000, 32, "sha256").toString("hex");
const cookie = (token, maxAge) => `bn_s=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function readBody(req) {
  const text = await req.text();
  if (text.length > 5_000_000) throw Object.assign(new Error("Données trop volumineuses"), { status: 413 });
  try { return JSON.parse(text || "{}"); } catch { throw Object.assign(new Error("Requête invalide"), { status: 400 }); }
}

async function openSession(st, userId, name) {
  const token = crypto.randomBytes(32).toString("hex");
  await st.setJSON(`sessions/${token}`, { user: userId, name, exp: Date.now() + SESSION_DAYS * 864e5 });
  return json({ name }, 200, { "set-cookie": cookie(token, SESSION_DAYS * 86400) });
}

async function currentSession(req, st) {
  const m = /(?:^|;\s*)bn_s=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
  if (!m) return null;
  const s = await st.get(`sessions/${m[1]}`, { type: "json" });
  if (!s || s.exp < Date.now()) return null;
  return { ...s, token: m[1] };
}

export default async (req) => {
  const st = store();
  const path = new URL(req.url).pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  try {
    // ----- Créer un compte -----
    if (path === "signup" && req.method === "POST") {
      const { name, code } = await readBody(req);
      const id = norm(name);
      if (id.length < 2) return json({ error: "Indique ton prénom (2 lettres minimum)." }, 400);
      if (!/^\d{6}$/.test(String(code || ""))) return json({ error: "Le code doit faire exactement 6 chiffres." }, 400);
      const salt = crypto.randomBytes(16).toString("hex");
      const display = String(name).trim().slice(0, 40);
      const { modified } = await st.setJSON(`users/${id}`, { name: display, salt, hash: hashCode(code, salt), created: Date.now(), fails: 0, lockUntil: 0 }, { onlyIfNew: true });
      if (!modified) return json({ error: "Ce prénom est déjà utilisé. Ajoute une initiale (ex : « Tony F »)." }, 409);
      return openSession(st, id, display);
    }

    // ----- Se connecter -----
    if (path === "login" && req.method === "POST") {
      const { name, code } = await readBody(req);
      const id = norm(name);
      const u = id ? await st.get(`users/${id}`, { type: "json" }) : null;
      if (!u) return json({ error: "Aucun compte avec ce prénom. Crée-en un !" }, 404);
      if (u.lockUntil > Date.now()) return json({ error: `Trop d’essais. Réessaie dans ${Math.ceil((u.lockUntil - Date.now()) / 60000)} min.` }, 429);
      const ok = crypto.timingSafeEqual(Buffer.from(hashCode(code || "", u.salt), "hex"), Buffer.from(u.hash, "hex"));
      if (!ok) {
        u.fails = (u.fails || 0) + 1;
        let msg = "Code incorrect.";
        if (u.fails >= 5) { u.lockUntil = Date.now() + 15 * 60000; u.fails = 0; msg = "Code incorrect. Compte bloqué 15 min."; }
        await st.setJSON(`users/${id}`, u);
        return json({ error: msg }, 401);
      }
      if (u.fails) { u.fails = 0; await st.setJSON(`users/${id}`, u); }
      return openSession(st, id, u.name);
    }

    const s = await currentSession(req, st);
    if (path === "me") return s ? json({ name: s.name }) : json({ error: "Non connecté" }, 401);
    if (!s) return json({ error: "Non connecté" }, 401);

    // ----- Se déconnecter -----
    if (path === "logout" && req.method === "POST") {
      await st.delete(`sessions/${s.token}`);
      return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
    }

    // ----- Données -----
    if (path === "data" && req.method === "GET") {
      const d = await st.get(`data/${s.user}`, { type: "json" });
      return json(d || { data: null, updated: 0 });
    }
    if (path === "data" && req.method === "PUT") {
      const { data, base } = await readBody(req);
      if (!data || data.v !== 2) return json({ error: "Données invalides" }, 400);
      const cur = await st.get(`data/${s.user}`, { type: "json" });
      if (cur && cur.updated > (Number(base) || 0)) return json({ error: "conflict", data: cur.data, updated: cur.updated }, 409);
      const updated = Date.now();
      await st.setJSON(`data/${s.user}`, { data, updated });
      return json({ updated });
    }

    return json({ error: "Introuvable" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: e.status ? e.message : "Erreur du serveur" }, e.status || 500);
  }
};

export const config = { path: "/api/*" };
