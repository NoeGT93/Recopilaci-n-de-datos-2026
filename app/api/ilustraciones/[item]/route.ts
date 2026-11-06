// Ilustraciones de las afirmaciones: viven en R2 (no en el repositorio, por licencia del banco de imágenes).
import { env, json } from "@/lib/server";

export async function GET(_req: Request, { params }: { params: Promise<{ item: string }> }) {
  const { item } = await params;
  if (!/^i([1-9]|1[0-5])$/.test(item)) return json({ error: "No encontrado." }, 404);
  const obj = await env().EVIDENCE.get("ilustraciones/" + item + ".webp");
  if (!obj) return json({ error: "No encontrado." }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
