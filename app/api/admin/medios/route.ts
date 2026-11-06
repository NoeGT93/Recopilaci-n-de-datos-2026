// Imágenes de referencia de la encuesta: solo el admin las sube o elimina.
import { SURVEY } from "@/lib/instruments";
import { db, env, json, now, sameOrigin, requireRole, audit } from "@/lib/server";
import { str } from "@/lib/validate";

const MAX = 5 * 1024 * 1024;
const ITEMS = new Set(["portada", ...SURVEY.items.map((i) => i.id)]);

function sniff(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  if (!(await requireRole("admin"))) return json({ error: "Acceso restringido." }, 401);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const item = String(form?.get("item") ?? "");
  if (!(file instanceof File) || !ITEMS.has(item)) return json({ error: "Solicitud inválida." }, 400);
  if (file.size > MAX) return json({ error: "La imagen supera 5 MB." }, 413);
  let caption: string | null;
  try {
    caption = str(form?.get("caption"), 160, "Descripción");
  } catch (e) {
    return json({ error: (e as Error).message }, 422);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return json({ error: "Formato no admitido. Use JPEG, PNG o WebP." }, 415);
  const id = crypto.randomUUID();
  const key = `medios/${id}`;
  await env().EVIDENCE.put(key, bytes, { httpMetadata: { contentType: type } });
  await db()
    .prepare("INSERT INTO survey_media (id, item, caption, r2_key, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, item, caption, key, type, bytes.length, now())
    .run();
  await audit("admin", "subir_imagen_encuesta", id, { item });
  return json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  if (!(await requireRole("admin"))) return json({ error: "Acceso restringido." }, 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const m = await db().prepare("SELECT r2_key FROM survey_media WHERE id = ?").bind(id).first<{ r2_key: string }>();
  if (!m) return json({ error: "No encontrada." }, 404);
  // Se quita de la encuesta; el objeto se conserva en R2 porque envíos anteriores lo registran como mostrado.
  await db().prepare("DELETE FROM survey_media WHERE id = ?").bind(id).run();
  await audit("admin", "quitar_imagen_encuesta", id);
  return json({ ok: true });
}
