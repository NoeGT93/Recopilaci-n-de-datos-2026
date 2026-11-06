// Acceso del equipo y la dirección: enlace fijo por instrumento; la persona elige su nombre entre los
// usuarios cargados por el admin (vigentes y no revocados). Sin código, por decisión del equipo: el
// control está en quién figura en la lista, la vigencia y la revocación.
import { db, json, now, sameOrigin, rateLimit, clientKey, createSession, destroySession, audit } from "@/lib/server";
import { UUID } from "@/lib/submissions";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== "string" || !UUID.test(id)) return json({ error: "Elija su nombre." }, 400);
  if (!(await rateLimit(`acceso:${await clientKey()}`, 30, 900))) return json({ error: "Demasiados intentos. Espere 15 minutos." }, 429);
  const inv = await db()
    .prepare("SELECT id, instrument, expires_at FROM invitations WHERE id = ? AND revoked_at IS NULL AND expires_at > ?")
    .bind(id, now())
    .first<{ id: string; instrument: "entrevista" | "observacion"; expires_at: string }>();
  if (!inv) return json({ error: "Su acceso ya no está vigente. Pida al equipo investigador que lo renueve." }, 403);
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
