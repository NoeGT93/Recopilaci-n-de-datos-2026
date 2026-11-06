// Canje de una invitación por una sesión limitada a su instrumento. El token llega en el cuerpo (el enlace
// lo lleva en el fragmento #, que nunca se envía al servidor ni queda en registros).
import { db, json, now, sha256, sameOrigin, rateLimit, clientKey, createSession, destroySession, audit } from "@/lib/server";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  if (!(await rateLimit(`acceso:${await clientKey()}`, 20, 900)))
    return json({ error: "Demasiados intentos. Espere unos minutos." }, 429);
  const { token } = (await req.json().catch(() => ({}))) as { token?: unknown };
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return json({ error: "Invitación no válida." }, 400);
  const inv = await db()
    .prepare("SELECT id, instrument, expires_at FROM invitations WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?")
    .bind(await sha256(token), now())
    .first<{ id: string; instrument: "entrevista" | "observacion"; expires_at: string }>();
  if (!inv) return json({ error: "La invitación no es válida, venció o fue revocada." }, 403);
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
