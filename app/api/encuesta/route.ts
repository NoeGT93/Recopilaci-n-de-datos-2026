// Encuesta pública. El navegador genera el id (UUID) y una clave de borrador; aquí solo se guarda el hash
// de la clave. Turnstile se valida una vez, al iniciar; después la clave autoriza guardar, recuperar y enviar.
import { SURVEY } from "@/lib/instruments";
import { db, json, sha256, sameOrigin, rateLimit, clientKey, verifyTurnstile, getInstrument, loadMedia } from "@/lib/server";
import { createStmts, replaceAnswers, personalStmt, finalizeStmt, touchStmt, getSubmission, UUID } from "@/lib/submissions";
import { parseSurvey, parsePersonal, parseChannel, ValidationError } from "@/lib/validate";

type Body = Record<string, unknown>;

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Origen no permitido." }, 403);
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
  const key = typeof body.key === "string" && /^[\w-]{40,64}$/.test(body.key) ? body.key : null;
  if (!id || !key) return json({ error: "Solicitud inválida." }, 400);

  try {
    const sub = await getSubmission(id);
    if (sub && (sub.instrument !== "encuesta")) return json({ error: "Solicitud inválida." }, 400);
    const keyOk = !!sub?.resume_hash && sub.resume_hash === (await sha256(key));
    // Ya enviada: responde igual que la primera vez (idempotente) sin exponer contenido.
    if (sub && sub.status !== "borrador") return json({ ok: true, status: sub.status });

    if (body.action === "start") {
      if (sub) return keyOk ? json({ ok: true, status: sub.status }) : json({ error: "Solicitud inválida." }, 409);
      const inst = await getInstrument("encuesta");
      if (!inst || inst.state === "cerrado") return json({ error: "La encuesta no está recibiendo respuestas en este momento." }, 403);
      // 120/hora por IP: varias personas pueden compartir el WiFi del local; Turnstile es el filtro principal.
      if (!(await rateLimit(`encuesta:${await clientKey()}`, 120, 3600)))
        return json({ error: "Demasiados intentos desde esta conexión. Intente más tarde." }, 429);
      if (!(await verifyTurnstile(body.turnstile)))
        return json({ error: "No se pudo verificar que la solicitud proviene de una persona. Intente de nuevo.", turnstile: true }, 400);
      const consent = body.consent === true, adult = body.adult === true, prior = body.consumed === true;
      const reason = !consent ? "sin_consentimiento" : !adult ? "menor_de_edad" : !prior ? "sin_consumo_previo" : null;
      await db().batch(
        createStmts("encuesta", SURVEY.version, {
          id, status: reason ? "no_elegible" : "borrador", is_test: inst.state === "prueba",
          channel: parseChannel(body.channel), consent, adult, prior, reason,
          resume_hash: reason ? null : await sha256(key),
        }),
      );
      return json({ ok: true, status: reason ? "no_elegible" : "borrador" });
    }

    if (!sub || !keyOk) return json({ error: "No se encontró el borrador." }, 404);

    if (body.action === "resume") {
      const rows = await db().prepare("SELECT item, value FROM answers WHERE submission_id = ?").bind(id).all<{ item: string; value: string | null }>();
      return json({ ok: true, status: sub.status, answers: Object.fromEntries(rows.results.map((r) => [r.item, r.value])) });
    }

    const { rows, answered } = parseSurvey(body.answers);

    if (body.action === "save") {
      await db().batch([...replaceAnswers(id, rows, null), touchStmt(id)]);
      return json({ ok: true, status: "borrador" });
    }

    if (body.action === "submit") {
      const inst = await getInstrument("encuesta");
      if (!inst || inst.state === "cerrado") return json({ error: "La encuesta se cerró y ya no recibe respuestas." }, 403);
      const personal = parsePersonal(body.personal);
      const status = answered === SURVEY.items.length ? "completo" : "incompleto";
      // Registra qué imágenes de referencia estaban activas, para poder comparar si cambian durante la recolección.
      const media = (await loadMedia()).map((m) => m.id);
      await db().batch([
        ...replaceAnswers(id, rows, null),
        ...(personal ? [personalStmt(id, personal)] : []),
        touchStmt(id, JSON.stringify({ media })),
        finalizeStmt(id, status),
      ]);
      // Solo se confirma después de que D1 completó la transacción.
      return json({ ok: true, status });
    }
    return json({ error: "Acción desconocida." }, 400);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, 422);
    console.error("encuesta: error interno", (e as Error).name); // sin datos de la solicitud
    return json({ error: "No se pudo guardar. Sus respuestas siguen en este dispositivo; intente de nuevo." }, 500);
  }
}
