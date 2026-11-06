// Entrevista y observación: solo con sesión de invitación del instrumento correspondiente, y solo sobre
// registros creados con esa misma invitación. No da acceso a resultados ni a otros instrumentos.
import { CURRENT_VERSION, INTERVIEW, OBSERVATION } from "@/lib/instruments";
import { db, json, sameOrigin, getSession, getInstrument, type Session } from "@/lib/server";
import { createStmts, replaceAnswers, personalStmt, finalizeStmt, touchStmt, getSubmission, UUID } from "@/lib/submissions";
import { parseInterview, parseObservation, parseObservationMeta, parsePersonal, ValidationError } from "@/lib/validate";

async function auth(): Promise<(Session & { role: "entrevista" | "observacion"; invitationId: string }) | null> {
  const s = await getSession();
  return s && (s.role === "entrevista" || s.role === "observacion") && s.invitationId ? (s as never) : null;
}

export async function GET(req: Request) {
  const s = await auth();
  if (!s) return json({ error: "Acceso restringido." }, 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    const list = await db()
      .prepare("SELECT id, status, created_at, updated_at, submitted_at, meta FROM submissions WHERE invitation_id = ? AND instrument = ? ORDER BY created_at DESC")
      .bind(s.invitationId, s.role)
      .all();
    return json({ items: list.results.map((r) => ({ ...r, meta: r.meta ? JSON.parse(r.meta as string) : null })) });
  }
  const sub = await getSubmission(id);
  if (!sub || sub.invitation_id !== s.invitationId || sub.instrument !== s.role) return json({ error: "No encontrado." }, 404);
  const [answers, evidence] = await db().batch([
    db().prepare("SELECT item, value, text FROM answers WHERE submission_id = ? ORDER BY id").bind(id),
    db().prepare("SELECT id, item, kind, text, url, material_date, content_type, size FROM evidence WHERE submission_id = ?").bind(id),
  ]);
  // Sin datos personales: solo se envían al finalizar y no se devuelven.
  return json({ id, status: sub.status, meta: sub.meta ? JSON.parse(sub.meta) : null, answers: answers.results, evidence: evidence.results });
}

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  const s = await auth();
  if (!s) return json({ error: "Su acceso venció o fue revocado." }, 401);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" && UUID.test(body.id) ? body.id : null;
  if (!body || !id) return json({ error: "Solicitud inválida." }, 400);
  try {
    const inst = await getInstrument(s.role);
    let sub = await getSubmission(id);
    if (sub && (sub.invitation_id !== s.invitationId || sub.instrument !== s.role)) return json({ error: "No encontrado." }, 404);
    if (sub && sub.status !== "borrador") return json({ ok: true, status: sub.status }); // idempotente
    if (!inst || inst.state === "cerrado") return json({ error: "El formulario no está recibiendo respuestas en este momento." }, 403);

    const parsed = s.role === "entrevista" ? parseInterview(body.answers) : parseObservation(body.answers);
    const meta = s.role === "observacion" ? parseObservationMeta(body.meta) : null;
    const stmts = [];
    if (!sub) {
      if (s.role === "entrevista") {
        const prev = await db().prepare("SELECT 1 FROM submissions WHERE invitation_id = ?").bind(s.invitationId).first();
        if (prev) return json({ error: "Esta invitación ya tiene una entrevista registrada." }, 409);
      }
      stmts.push(...createStmts(s.role, CURRENT_VERSION[s.role], { id, status: "borrador", is_test: inst.state === "prueba", invitation_id: s.invitationId }));
    }
    stmts.push(...replaceAnswers(id, parsed.rows, parsed.notes));
    const metaJson = meta ? JSON.stringify({ ...meta, observer: s.label }) : undefined;

    if (body.action === "save") {
      stmts.push(touchStmt(id, metaJson));
      await db().batch(stmts);
      return json({ ok: true, status: "borrador" });
    }
    if (body.action === "submit") {
      if (meta && !meta.reviewDate) return json({ error: "Indique la fecha de revisión." }, 422);
      const total = s.role === "entrevista" ? INTERVIEW.questions.length : OBSERVATION.criteria.length;
      const personal = parsePersonal(body.personal);
      stmts.push(touchStmt(id, metaJson));
      if (personal) stmts.push(personalStmt(id, personal));
      stmts.push(finalizeStmt(id, parsed.answered === total ? "completo" : "incompleto"));
      await db().batch(stmts);
      sub = await getSubmission(id);
      return json({ ok: true, status: sub?.status });
    }
    return json({ error: "Acción desconocida." }, 400);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, 422);
    console.error("formulario: error interno", (e as Error).name);
    return json({ error: "No se pudo guardar. Lo ingresado sigue en pantalla; intente de nuevo." }, 500);
  }
}
