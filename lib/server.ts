import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies, headers } from "next/headers";
import { CURRENT_VERSION, DEFINITIONS, type InstrumentCode } from "./instruments";
import type { Rec } from "./analysis";

export type Role = "admin" | "entrevista" | "observacion";
export type Session = { role: Role; invitationId: string | null; label: string | null };

export const env = () => getCloudflareContext().env as CloudflareEnv;
export const db = () => env().DB;
export const now = () => new Date().toISOString();

// ---------- Cripto ----------

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
export const sha256 = async (s: string) => b64url(await crypto.subtle.digest("SHA-256", enc.encode(s)));

/** Comparación en tiempo constante de dos cadenas. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Formato: pbkdf2-sha256$iteraciones$salt$hash (base64url). Ver scripts/hash-password.mjs. */
export async function verifyPassword(password: string, stored: string | undefined) {
  const [scheme, iter, salt, hash] = (stored ?? "").split("$");
  if (scheme !== "pbkdf2-sha256" || !salt || !hash) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const saltBytes = Uint8Array.from(atob(salt.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: Number(iter) }, key, 256);
  return safeEqual(b64url(bits), hash);
}

/** Mismo formato que scripts/hash-password.mjs (100 000 iteraciones: máximo de PBKDF2 en Workers). */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return `pbkdf2-sha256$100000$${b64url(salt)}$${b64url(bits)}`;
}

/** La contraseña cambiada desde el admin (D1) tiene prioridad sobre el secreto inicial. */
export async function adminPasswordHash() {
  const row = await db().prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").first<{ value: string }>();
  return row?.value ?? env().ADMIN_PASSWORD_HASH;
}

// ---------- Peticiones ----------

/** IP solo como hash (para límites de intentos); nunca se guarda en claro. */
export async function clientKey() {
  const h = await headers();
  return sha256(h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? "local");
}

/** Protección CSRF de los endpoints con cookie: el Origin debe ser este mismo sitio. */
export async function sameOrigin(req: Request) {
  // Igual que Next con las Server Actions: el host del Origin debe coincidir con el Host de la petición.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return !!origin && !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Límite de intentos por ventana fija, contado en D1 (consistente entre ubicaciones). */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const t = Math.floor(Date.now() / 1000);
  const start = t - (t % windowSec);
  const row = await db()
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END, window_start = ?2
       RETURNING count`,
    )
    .bind(key, start)
    .first<{ count: number }>();
  return (row?.count ?? 0) <= limit;
}

export async function verifyTurnstile(token: unknown) {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const h = await headers();
  const body = new FormData();
  body.append("secret", env().TURNSTILE_SECRET_KEY ?? "");
  body.append("response", token);
  const ip = h.get("cf-connecting-ip");
  if (ip) body.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

export async function audit(actor: string, action: string, target: string | null, detail?: Record<string, unknown>) {
  await db()
    .prepare("INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)")
    .bind(now(), actor, action, target, detail ? JSON.stringify(detail) : null)
    .run();
}

// ---------- Sesiones ----------

const COOKIE = "__Host-sesion";
const ADMIN_HOURS = 8;
const INVITE_DAYS = 7;

export async function createSession(role: Role, invitationId: string | null, inviteExpires?: string) {
  const token = randomToken();
  const max = new Date(Date.now() + (role === "admin" ? ADMIN_HOURS * 3600_000 : INVITE_DAYS * 86400_000)).toISOString();
  const expires = inviteExpires && inviteExpires < max ? inviteExpires : max;
  await db()
    .prepare("INSERT INTO sessions (token_hash, role, invitation_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256(token), role, invitationId, now(), expires)
    .run();
  // Una sola sesión por navegador: entrar como admin reemplaza una invitación y viceversa.
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  // La sesión de invitación cae si la invitación se revoca o vence.
  const row = await db()
    .prepare(
      `SELECT s.role, s.invitation_id, i.label FROM sessions s
       LEFT JOIN invitations i ON i.id = s.invitation_id
       WHERE s.token_hash = ? AND s.expires_at > ?
         AND (s.invitation_id IS NULL OR (i.revoked_at IS NULL AND i.expires_at > ?))`,
    )
    .bind(await sha256(token), now(), now())
    .first<{ role: Role; invitation_id: string | null; label: string | null }>();
  return row ? { role: row.role, invitationId: row.invitation_id, label: row.label } : null;
}

/** Cierra todas las sesiones de admin excepto la actual. */
export async function closeOtherAdminSessions() {
  const token = (await cookies()).get(COOKIE)?.value ?? "";
  await db().prepare("DELETE FROM sessions WHERE role = 'admin' AND token_hash != ?").bind(await sha256(token)).run();
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  jar.delete(COOKIE);
}

export async function requireRole(role: Role) {
  const s = await getSession();
  return s && s.role === role ? s : null;
}

// ---------- Datos ----------

export async function getInstrument(code: InstrumentCode) {
  return db()
    .prepare("SELECT code, state, goal, updated_at FROM instruments WHERE code = ?")
    .bind(code)
    .first<{ code: InstrumentCode; state: "cerrado" | "prueba" | "abierto"; goal: number | null; updated_at: string }>();
}

/** Congela la definición de la versión vigente la primera vez que se usa. */
export function ensureVersionStmt(code: InstrumentCode) {
  return db()
    .prepare("INSERT OR IGNORE INTO instrument_versions (code, version, definition, created_at) VALUES (?, ?, ?, ?)")
    .bind(code, CURRENT_VERSION[code], JSON.stringify(DEFINITIONS[code]), now());
}

/** Todos los registros de un instrumento con sus respuestas (el filtrado se hace en lib/analysis). */
// ponytail: carga completa en memoria; suficiente para miles de registros. Paginar en SQL si crece mucho más.
export async function loadRecords(code: InstrumentCode): Promise<Rec[]> {
  const [subs, answers] = await db().batch([
    db()
      .prepare(
        `SELECT s.id, s.status, s.is_test, s.channel, s.version, s.created_at, s.updated_at, s.submitted_at, e.reason AS excluded
         FROM submissions s LEFT JOIN exclusions e ON e.submission_id = s.id WHERE s.instrument = ?`,
      )
      .bind(code),
    db()
      .prepare(
        `SELECT a.submission_id, a.item, a.value, a.num, a.text FROM answers a
         JOIN submissions s ON s.id = a.submission_id WHERE s.instrument = ? ORDER BY a.id`,
      )
      .bind(code),
  ]);
  const byId = new Map<string, Rec>();
  for (const s of subs.results as Omit<Rec, "answers">[]) byId.set(s.id, { ...s, answers: [] });
  for (const a of answers.results as (Rec["answers"][number] & { submission_id: string })[])
    byId.get(a.submission_id)?.answers.push({ item: a.item, value: a.value, num: a.num, text: a.text });
  return [...byId.values()];
}
