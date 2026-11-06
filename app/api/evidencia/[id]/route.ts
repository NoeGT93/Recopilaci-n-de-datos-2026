// Descarga/eliminación de una fotografía. Autorización en cada solicitud: admin, o el dueño del registro.
import { db, env, json, sameOrigin, getSession, audit } from "@/lib/server";

async function load(id: string) {
  const s = await getSession();
  if (!s) return null;
  const ev = await db()
    .prepare(
      `SELECT e.id, e.r2_key, e.content_type, s.invitation_id, s.status, s.id AS submission_id FROM evidence e
       JOIN submissions s ON s.id = e.submission_id WHERE e.id = ? AND e.kind = 'foto'`,
    )
    .bind(id)
    .first<{ id: string; r2_key: string; content_type: string; invitation_id: string | null; status: string; submission_id: string }>();
  if (!ev) return null;
  const owner = s.role !== "admin" && !!s.invitationId && s.invitationId === ev.invitation_id;
  return s.role === "admin" || owner ? { ev, s, owner } : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await load((await params).id);
  if (!found) return json({ error: "No encontrado." }, 404);
  const obj = await env().EVIDENCE.get(found.ev.r2_key);
  if (!obj) return json({ error: "No encontrado." }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": found.ev.content_type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Content-Disposition": `inline; filename="evidencia-${found.ev.id}"`,
    },
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  const found = await load((await params).id);
  if (!found || !found.owner || found.ev.status !== "borrador") return json({ error: "No encontrado." }, 404);
  await env().EVIDENCE.delete(found.ev.r2_key);
  await db().prepare("DELETE FROM evidence WHERE id = ?").bind(found.ev.id).run();
  await audit(`invitacion:${found.s.invitationId}`, "eliminar_foto_borrador", found.ev.submission_id);
  return json({ ok: true });
}
