// Imágenes de referencia de la encuesta: públicas (las ve cualquier participante). Solo sirve claves «medios/».
import { env, json } from "@/lib/server";
import { UUID } from "@/lib/submissions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "No encontrado." }, 404);
  const obj = await env().EVIDENCE.get("medios/" + id);
  if (!obj) return json({ error: "No encontrado." }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
