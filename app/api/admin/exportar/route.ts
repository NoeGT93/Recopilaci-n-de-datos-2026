// Exportación CSV (UTF-8 con BOM: abre directamente en Excel). Por defecto analítica, sin identificadores
// personales; los datos personales se exportan aparte, a pedido explícito y con registro de auditoría.
import { CURRENT_VERSION, SCORES, SURVEY, INTERVIEW, OBSERVATION, type InstrumentCode } from "@/lib/instruments";
import { applyFilters, parseFilters, score, toCsv, gtDate } from "@/lib/analysis";
import { db, json, requireRole, loadRecords, audit } from "@/lib/server";

const INSTRUMENTS = ["encuesta", "entrevista", "observacion"] as const;

export async function GET(req: Request) {
  if (!(await requireRole("admin"))) return json({ error: "Acceso restringido." }, 401);
  const sp = new URL(req.url).searchParams;
  const code = sp.get("instrumento") as InstrumentCode;
  if (!INSTRUMENTS.includes(code)) return json({ error: "Instrumento inválido." }, 400);
  const snap = sp.get("instantanea");
  if (snap) {
    const s = await db().prepare("SELECT * FROM analysis_results WHERE id = ? AND instrument = ?").bind(snap, code).first<Record<string, string>>();
    if (!s) return json({ error: "No encontrado." }, 404);
    const body = JSON.stringify({ ...s, filters: JSON.parse(s.filters), result: JSON.parse(s.result) }, null, 2);
    return new Response(body, {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="instantanea-${code}-${s.created_at.slice(0, 10)}.json"`, "Cache-Control": "no-store" },
    });
  }
  const f = parseFilters((k) => sp.get(k), CURRENT_VERSION[code]);
  const recs = applyFilters(await loadRecords(code), f);
  const ids = new Set(recs.map((r) => r.id));
  const personal = sp.get("datos") === "personales";
  const stamp = new Date().toISOString().slice(0, 10);

  let rows: unknown[][];
  if (personal) {
    const pd = await db()
      .prepare(`SELECT p.* FROM personal_data p JOIN submissions s ON s.id = p.submission_id WHERE s.instrument = ?`)
      .bind(code)
      .all<Record<string, unknown>>();
    rows = [
      ["id_registro", "nombre", "edad", "sexo", "nivel_educativo", "puesto"],
      ...pd.results.filter((p) => ids.has(p.submission_id as string)).map((p) => [p.submission_id, p.name, p.age, p.sex, p.education, p.job]),
    ];
    await audit("admin", "exportar_datos_personales", code, { filas: rows.length - 1, filtros: f });
  } else {
    const extra = await db()
      .prepare(`SELECT id, consent, adult, prior_consumption, ineligible_reason, meta FROM submissions WHERE instrument = ?`)
      .bind(code)
      .all<Record<string, unknown>>();
    const ex = new Map(extra.results.map((r) => [r.id as string, r]));
    const notes = await db()
      .prepare(`SELECT e.submission_id, e.item, e.kind, e.text, e.url, e.material_date FROM evidence e JOIN submissions s ON s.id = e.submission_id WHERE s.instrument = ?`)
      .bind(code)
      .all<Record<string, string | null>>();
    const noteOf = (id: string, item: string) => notes.results.find((n) => n.submission_id === id && n.item === item && n.kind === "nota");
    const photos = (id: string, item: string) => notes.results.filter((n) => n.submission_id === id && n.item === item && n.kind === "foto").length;
    const base = ["id_registro", "instrumento", "version", "estado", "prueba", "excluido", "motivo_exclusion", "canal", "fecha_creacion", "fecha_envio", "fecha_local"];
    const baseRow = (r: (typeof recs)[number]) => [
      r.id, code, r.version, r.status, r.is_test ? 1 : 0, r.excluded ? 1 : 0, r.excluded ?? "", r.channel,
      r.created_at, r.submitted_at ?? "", gtDate(r.submitted_at ?? r.created_at),
    ];
    const ans = (r: (typeof recs)[number], item: string) => r.answers.filter((a) => a.item === item && a.value);

    if (code === "encuesta") {
      rows = [
        [...base, "consentimiento", "mayor_de_edad", "consumo_previo", "motivo_no_elegible", ...SURVEY.items.map((i) => `item_${i.n}`), ...SCORES.map((s) => `puntaje_${s.key}`)],
        ...recs.map((r) => {
          const e = ex.get(r.id)!;
          return [
            ...baseRow(r), e.consent, e.adult, e.prior_consumption, e.ineligible_reason ?? "",
            ...SURVEY.items.map((i) => ans(r, i.id)[0]?.num ?? ""), // vacío = sin respuesta (no 0)
            ...SCORES.map((s) => score(r, s.items) ?? ""),
          ];
        }),
      ];
    } else if (code === "entrevista") {
      rows = [
        [...base, ...INTERVIEW.questions.flatMap((q) => [`p${q.n}`, `p${q.n}_otra`, `p${q.n}_referencia`, `p${q.n}_enlace`, `p${q.n}_fotos`])],
        ...recs.map((r) => [
          ...baseRow(r),
          ...INTERVIEW.questions.flatMap((q) => {
            const n = noteOf(r.id, q.id);
            return [ans(r, q.id).map((a) => a.value).join("|"), ans(r, q.id).find((a) => a.text)?.text ?? "", n?.text ?? "", n?.url ?? "", photos(r.id, q.id)];
          }),
        ]),
      ];
    } else {
      rows = [
        [...base, "fecha_revision", "observador", ...OBSERVATION.criteria.flatMap((c) => [`c${c.n}`, `c${c.n}_evidencia`, `c${c.n}_enlace`, `c${c.n}_fecha_material`, `c${c.n}_fotos`]), ...OBSERVATION.synthesis.map((s) => `sintesis_${s.key}`)],
        ...recs.map((r) => {
          const meta = JSON.parse((ex.get(r.id)?.meta as string) ?? "null") ?? {};
          return [
            ...baseRow(r), meta.reviewDate ?? "", meta.observer ?? "",
            ...OBSERVATION.criteria.flatMap((c) => {
              const n = noteOf(r.id, c.id);
              return [ans(r, c.id)[0]?.value ?? "", n?.text ?? "", n?.url ?? "", n?.material_date ?? "", photos(r.id, c.id)];
            }),
            ...OBSERVATION.synthesis.map((s) => meta.synthesis?.[s.key] ?? ""),
          ];
        }),
      ];
    }
    await audit("admin", "exportar_analitica", code, { filas: rows.length - 1, filtros: f });
  }
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${code}-${personal ? "datos-personales" : "analitica"}-v${f.version}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
