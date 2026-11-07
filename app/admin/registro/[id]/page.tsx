import { notFound } from "next/navigation";
import { INSTRUMENT_NAMES, SURVEY, SCALE, INTERVIEW, OBSERVATION, OBS_OPTIONS } from "@/lib/instruments";
import { db, requireRole } from "@/lib/server";
import { PrintButton, RevealPersonal } from "@/components/AdminClient";
import { setExclusion, setTest } from "../../actions";

type Sub = {
  id: string; instrument: "encuesta" | "entrevista" | "observacion"; version: string; status: string; is_test: number; channel: string;
  consent: number | null; adult: number | null; prior_consumption: number | null; ineligible_reason: string | null; meta: string | null;
  created_at: string; submitted_at: string | null; label: string | null; reason: string | null;
};

export default async function Registro({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireRole("admin"))) return null;
  const { id } = await params;
  const [s, ans, ev] = await db().batch([
    db().prepare(`SELECT s.*, i.label, e.reason FROM submissions s LEFT JOIN invitations i ON i.id = s.invitation_id LEFT JOIN exclusions e ON e.submission_id = s.id WHERE s.id = ?`).bind(id),
    db().prepare("SELECT item, value, num, text FROM answers WHERE submission_id = ? ORDER BY id").bind(id),
    db().prepare("SELECT id, item, kind, text, url, material_date FROM evidence WHERE submission_id = ? ORDER BY created_at").bind(id),
  ]);
  const sub = s.results[0] as Sub | undefined;
  if (!sub) notFound();
  const answers = ans.results as { item: string; value: string | null; num: number | null; text: string | null }[];
  const evidence = ev.results as { id: string; item: string; kind: string; text: string | null; url: string | null; material_date: string | null }[];
  const meta = sub.meta ? JSON.parse(sub.meta) : null;
  const yn = (v: number | null) => (v === null ? "—" : v ? "Sí" : "No");

  const items =
    sub.instrument === "encuesta"
      ? SURVEY.items.map((i) => ({ id: i.id, label: `${i.n}. ${i.text}`, value: SCALE.find((o) => o.value === answers.find((a) => a.item === i.id)?.value)?.label ?? null }))
      : sub.instrument === "entrevista"
        ? INTERVIEW.questions.map((q) => ({
            id: q.id,
            label: `${q.n}. ${q.text}`,
            value:
              answers
                .filter((a) => a.item === q.id && a.value)
                .map((a) => (q.options.find((o) => o.value === a.value)?.label ?? a.value) + (a.text ? `: ${a.text}` : ""))
                .join("; ") || null,
          }))
        : OBSERVATION.criteria.map((c) => {
            const v = answers.find((a) => a.item === c.id)?.value;
            return { id: c.id, label: `${c.n}. ${c.title}: ${c.text}`, value: v ? `${v} · ${OBS_OPTIONS.find((o) => o.value === v)?.label}` : null };
          });

  return (
    <div className="stack">
      <div className="row spread no-print"><a href={`/admin/${sub.instrument}`}>← {INSTRUMENT_NAMES[sub.instrument]}</a><PrintButton label="Imprimir registro / PDF" /></div>
      <h2 style={{ marginTop: 0 }}>Registro {sub.id.slice(0, 8)}</h2>
      <table>
        <tbody>
          <tr><th>Instrumento</th><td>{INSTRUMENT_NAMES[sub.instrument]} · versión {sub.version}</td></tr>
          <tr><th>Estado</th><td>{sub.status}{sub.ineligible_reason ? ` (${sub.ineligible_reason})` : ""}</td></tr>
          <tr><th>Canal</th><td>{sub.channel}</td></tr>
          <tr><th>Creado / enviado (UTC)</th><td>{sub.created_at} / {sub.submitted_at ?? "—"}</td></tr>
          {sub.instrument === "encuesta" && <tr><th>Consentimiento · 18+ · consumo previo</th><td>{yn(sub.consent)} · {yn(sub.adult)} · {yn(sub.prior_consumption)}</td></tr>}
          {sub.label && <tr><th>Invitación</th><td>{sub.label}</td></tr>}
          {meta?.reviewDate && <tr><th>Fecha de revisión</th><td>{meta.reviewDate}</td></tr>}
          <tr><th>Prueba</th><td>{sub.is_test ? "Sí" : "No"}</td></tr>
          <tr><th>Exclusión</th><td>{sub.reason ? `Excluido: ${sub.reason}` : "Incluido"}</td></tr>
        </tbody>
      </table>

      <h3>Respuestas</h3>
      <div className="table-wrap">
        <table>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.label}</td>
                <td>{i.value ?? <span className="muted">Sin respuesta</span>}</td>
                <td className="small">
                  {evidence.filter((e) => e.item === i.id).map((e) => (
                    <div key={e.id}>
                      {e.kind === "foto" ? (
                        <a href={`/api/evidencia/${e.id}`} target="_blank" rel="noopener">Fotografía</a>
                      ) : (
                        <>
                          {e.text}{" "}
                          {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a>}
                          {e.material_date && <span className="muted"> · {e.material_date}</span>}
                        </>
                      )}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta?.synthesis && (
        <>
          <h3>Síntesis</h3>
          {OBSERVATION.synthesis.map((x) => (
            <p key={x.key}><strong>{x.label}:</strong> {meta.synthesis[x.key] ?? "—"}</p>
          ))}
        </>
      )}

      <h3>Datos personales</h3>
      <p className="small muted">Separados de las respuestas. Cada consulta queda en el registro de auditoría.</p>
      <RevealPersonal id={sub.id} />

      <h3 className="no-print">Decisiones analíticas</h3>
      <p className="small muted no-print">Excluir no borra datos: el registro se conserva y puede reincluirse.</p>
      {sub.reason ? (
        <form action={setExclusion} className="no-print">
          <input type="hidden" name="id" value={sub.id} />
          <input type="hidden" name="op" value="incluir" />
          <button className="btn secondary" type="submit">Reincluir en el análisis</button>
        </form>
      ) : (
        <form action={setExclusion} className="row no-print">
          <input type="hidden" name="id" value={sub.id} />
          <div className="field" style={{ flex: 1, minWidth: "14rem", margin: 0 }}>
            <label htmlFor="reason">Motivo de exclusión</label>
            <input id="reason" name="reason" type="text" maxLength={300} required />
          </div>
          <button className="btn danger" type="submit" style={{ alignSelf: "end" }}>Excluir del análisis</button>
        </form>
      )}
      <form action={setTest} className="no-print">
        <input type="hidden" name="id" value={sub.id} />
        <input type="hidden" name="value" value={sub.is_test ? "0" : "1"} />
        <button className="btn secondary" type="submit">{sub.is_test ? "Quitar marca de prueba" : "Marcar como registro de prueba"}</button>
      </form>
    </div>
  );
}
