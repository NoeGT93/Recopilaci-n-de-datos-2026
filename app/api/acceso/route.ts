// Acceso del equipo y la dirección: enlace fijo por instrumento; la persona elige su nombre y escribe su
// código. El código se guarda como hash PBKDF2 (los accesos antiguos por enlace usan SHA-256 del token).
import {
  db, json, now, sha256, sameOrigin, rateLimit, clientKey, createSession, destroySession, audit, verifyPassword, normalizeCode,
} from "@/lib/server";
import { UUID } from "@/lib/submissions";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  const { id, code } = (await req.json().catch(() => ({}))) as { id?: unknown; code?: unknown };
  if (typeof id !== "string" || !UUID.test(id) || typeof code !== "string" || code.length > 100)
    return json({ error: "Elija su nombre y escriba su código." }, 400);
  // Límites por conexión y por persona: frenan intentos repetidos sobre un mismo nombre.
  if (!(await rateLimit(`acceso:${await clientKey()}`, 20, 900)) || !(await rateLimit(`acceso-persona:${id}`, 10, 900)))
    return json({ error: "Demasiados intentos. Espere 15 minutos." }, 429);
  const inv = await db()
    .prepare("SELECT id, instrument, token_hash, expires_at FROM invitations WHERE id = ? AND revoked_at IS NULL AND expires_at > ?")
    .bind(id, now())
    .first<{ id: string; instrument: "entrevista" | "observacion"; token_hash: string; expires_at: string }>();
  const ok =
    !!inv &&
    (inv.token_hash.startsWith("pbkdf2-sha256$")
      ? await verifyPassword(normalizeCode(code), inv.token_hash)
      : inv.token_hash === (await sha256(code.trim())));
  if (!inv || !ok) {
    await audit("anonimo", "acceso_fallido", id);
    return json({ error: "El código no es correcto o su acceso ya no está vigente." }, 403);
  }
  await createSession(inv.instrument, inv.id, inv.expires_at);
  await db().prepare("UPDATE invitations SET last_used_at = ? WHERE id = ?").bind(now(), inv.id).run();
  await audit(`invitacion:${inv.id}`, "acceso", inv.instrument);
  return json({ ok: true, instrument: inv.instrument });
}

export async function DELETE(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  await destroySession();
  return json({ ok: true });
}
