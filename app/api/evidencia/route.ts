// Subida de fotografías a R2 (privado). Solo el dueño del registro (sesión de su invitación) y mientras
// el registro siga en borrador. Se valida tipo real (firma del archivo) y tamaño.
import { db, env, json, now, sameOrigin, getSession } from "@/lib/server";
import { getSubmission, UUID } from "@/lib/submissions";
import { INTERVIEW, OBSERVATION } from "@/lib/instruments";

const MAX = 5 * 1024 * 1024;
const ITEMS = new Set([...INTERVIEW.questions.map((q) => q.id), ...OBSERVATION.criteria.map((c) => c.id)]);

function sniff(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  const s = await getSession();
  if (!s || s.role === "admin" || !s.invitationId) return json({ error: "Acceso restringido." }, 401);
  if (Number(req.headers.get("content-length") ?? 0) > MAX + 64 * 1024) return json({ error: "La imagen supera 5 MB." }, 413);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const id = String(form?.get("submissionId") ?? "");
  const item = String(form?.get("item") ?? "");
  if (!(file instanceof File) || !UUID.test(id) || !ITEMS.has(item)) return json({ error: "Solicitud inválida." }, 400);
  if (file.size > MAX) return json({ error: "La imagen supera 5 MB." }, 413);
  const sub = await getSubmission(id);
  if (!sub || sub.invitation_id !== s.invitationId || sub.instrument !== s.role || !item.startsWith(s.role === "entrevista" ? "p" : "c"))
    return json({ error: "Guarde el formulario antes de adjuntar fotografías." }, 404);
  if (sub.status !== "borrador") return json({ error: "El registro ya fue enviado." }, 409);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return json({ error: "Formato no admitido. Use JPEG, PNG o WebP." }, 415);
  const evId = crypto.randomUUID();
  const key = `${sub.instrument}/${id}/${evId}`;
  await env().EVIDENCE.put(key, bytes, { httpMetadata: { contentType: type } });
  await db()
    .prepare(
      `INSERT INTO evidence (id, submission_id, item, kind, r2_key, content_type, size, created_at)
       VALUES (?, ?, ?, 'foto', ?, ?, ?, ?)`,
    )
    .bind(evId, id, item, key, type, bytes.length, now())
    .run();
  return json({ ok: true, id: evId, item, size: bytes.length, content_type: type });
}
