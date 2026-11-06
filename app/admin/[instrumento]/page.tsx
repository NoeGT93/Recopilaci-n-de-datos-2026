import { notFound } from "next/navigation";
import { CURRENT_VERSION, INSTRUMENT_NAMES, HYPOTHESES, SCALE_LIMITATION, OBSERVATION, type InstrumentCode } from "@/lib/instruments";
import {
  analyze, analysisSet, applyFilters, describeFilters, parseFilters, progress, gtDate, STATUS_FILTERS, fmtP,
  surveyInterpretations, interviewInterpretations, observationInterpretations, type Interpretation, type Rec,
} from "@/lib/analysis";
import { ALPHA, METHOD_VERSION } from "@/lib/stats";
import { db, getInstrument, loadRecords, requireRole } from "@/lib/server";
import { Bars, Kpis } from "@/components/Charts";
import { finalSnapshot } from "../actions";

const CODES = ["encuesta", "entrevista", "observacion"];
const n2 = (x: number | null, d = 1) => (x === null ? "—" : x.toLocaleString("es-GT", { maximumFractionDigits: d }));

export default async function Dashboard({ params, searchParams }: { params: Promise<{ instrumento: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  if (!(await requireRole("admin"))) return null;
  const code = (await params).instrumento as InstrumentCode;
  if (!CODES.includes(code)) notFound();
  const sp = await searchParams;
  const f = parseFilters((k) => sp[k], CURRENT_VERSION[code]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const inst = (await getInstrument(code))!;
  const all = await loadRecords(code);
  const recs = applyFilters(all, f);
  const p = progress(recs, inst.goal);
  const final = inst.state === "cerrado";
  const channels = [...new Set(all.map((r) => r.channel))].sort();
  const versions = [...new Set([CURRENT_VERSION[code], ...all.map((r) => r.version)])].sort();
  const a = analyze(code, recs, f);
  const snapshots = await db()
    .prepare("SELECT id, version, kind, method_version, filters, created_at FROM analysis_results WHERE instrument = ? ORDER BY created_at DESC")
    .bind(code)
    .all<{ id: string; version: string; kind: string; method_version: string; filters: string; created_at: string }>();
  const set = analysisSet(recs, f);
  const evidence = code === "encuesta" ? [] : await loadEvidence(set);

  let interps: Interpretation[] = [];
  if (a.instrument === "encuesta") interps = surveyInterpretations(a.data, f, final);
  if (a.instrument === "entrevista") interps = interviewInterpretations(a.data, f);
  if (a.instrument === "observacion") interps = observationInterpretations(a.data, f);

  return (
    <div>
      <div className="row spread">
        <h2 style={{ margin: 0 }}>{INSTRUMENT_NAMES[code]}</h2>
        <span className={`tag ${final ? "" : "accent"}`}>{final ? "Recolección cerrada" : inst.state === "prueba" ? "En prueba" : "Recolección abierta · resultados preliminares"}</span>
      </div>

      <form className="filters no-print" method="get" style={{ marginTop: "1rem" }}>
        <div className="field"><label htmlFor="desde">Desde</label><input id="desde" name="desde" type="date" defaultValue={f.from ?? ""} /></div>
        <div className="field"><label htmlFor="hasta">Hasta</label><input id="hasta" name="hasta" type="date" defaultValue={f.to ?? ""} /></div>
        <div className="field">
          <label htmlFor="canal">Canal</label>
          <select id="canal" name="canal" defaultValue={f.channel ?? ""}>
            <option value="">Todos</option>
            {channels.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="version">Versión</label>
          <select id="version" name="version" defaultValue={f.version}>
            {versions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={f.status}>
            {STATUS_FILTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <button className="btn" type="submit">Aplicar</button>
      </form>
      <p className="small muted">Filtro aplicado a todo lo que sigue: {describeFilters(f)}. Las versiones nunca se mezclan.</p>

      <h3>Avance de recolección</h3>
      <Kpis
        items={[
          ["Meta", p.goal ?? "Sin definir"],
          ["Envíos recibidos", p.received],
          ["Completos", p.complete],
          ["Incompletos", p.incomplete],
          ...(code === "encuesta" ? ([["No elegibles", p.ineligible]] as [string, number][]) : []),
          ["Borradores", p.drafts],
          ["Válidos para análisis", p.valid],
          ["De prueba", p.test],
          ["Excluidos", p.excluded],
          ["Avance", p.percent === null ? "—" : `${p.percent.toFixed(1)} %`],
          ["Pendientes", p.pending ?? "—"],
        ]}
      />
      <p className="small muted">
        Última actualización: {p.lastUpdate ? `${gtDate(p.lastUpdate)} ${new Date(Date.parse(p.lastUpdate) - 6 * 3600_000).toISOString().slice(11, 16)} (Guatemala)` : "—"}.
        {code === "encuesta" && " La meta es operativa (300 por defecto) y no un tamaño muestral calculado."} Pendientes = máx(meta − válidos, 0).
      </p>

      <h3>Respuestas por fecha</h3>
      {p.timeline.length === 0 ? (
        <p className="muted">Sin envíos en este filtro.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha (Guatemala)</th><th className="num">Recibidos</th><th className="num">Válidos</th><th style={{ width: "50%" }}></th></tr></thead>
            <tbody>
              {p.timeline.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td className="num">{d.received}</td>
                  <td className="num">{d.valid}</td>
                  <td><Bars rows={[{ label: "", value: d.received }]} total={Math.max(...p.timeline.map((x) => x.received))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {a.instrument === "encuesta" && (
        <>
          <h3>Contraste de hipótesis</h3>
          <p className="small"><strong>Hi:</strong> {HYPOTHESES.hi}<br /><strong>H0:</strong> {HYPOTHESES.h0}</p>
          <Kpis
            items={[
              ["Registros en el análisis", a.data.nValid],
              ["Pares completos", a.data.pairs],
              ["Sin par completo", a.data.excludedFromPairs],
              ["rho de Spearman", a.data.correlation.estimable ? n2(a.data.correlation.rho, 3) : "No estimable"],
              ["Valor p (t, bilateral)", a.data.correlation.estimable ? fmtP(a.data.correlation.p) : "No estimable"],
              ["Valor p (permutaciones)", a.data.correlation.estimable ? fmtP(a.data.correlation.pPerm) : "No estimable"],
            ]}
          />
          <p className="small muted">
            Avance de recolección ({p.valid} válidos) y pares disponibles para la correlación ({a.data.pairs}) son cifras distintas: un
            registro válido sin todos los ítems de una variable no forma par. α = {ALPHA}. Método: {METHOD_VERSION}
            {a.data.correlation.estimable && ` — comprobación por permutaciones: ${a.data.correlation.permMethod}`}.
          </p>

          <h3>Puntajes</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Puntaje</th><th>Ítems</th><th>Rango</th><th className="num">n con puntaje</th><th className="num">Sin puntaje (omisiones)</th><th className="num">Mediana</th></tr></thead>
              <tbody>
                {a.data.scores.map((s) => (
                  <tr key={s.key}>
                    <td>{s.label}</td><td>{s.items[0]}–{s.items[s.items.length - 1]}</td><td>{s.min}–{s.max}</td>
                    <td className="num">{s.n}</td><td className="num">{s.missing}</td><td className="num">{n2(s.median)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {a.data.scores.map((s) => (
            <details key={s.key}>
              <summary>Distribución de {s.label.toLowerCase()} (n = {s.n})</summary>
              <Bars rows={s.distribution.map((d) => ({ label: `${d.value} puntos`, value: d.count }))} total={s.n} />
            </details>
          ))}

          <h3>Distribución por ítem</h3>
          <div className="notice" style={{ marginBottom: "1rem" }}><strong>Limitación metodológica:</strong> {SCALE_LIMITATION}</div>
          {a.data.items.map((it) => (
            <div className="item" key={it.id}>
              <p style={{ marginBottom: "0.5rem" }}><span className="muted">{it.n}.</span> {it.text}</p>
              <Bars rows={[...it.counts.map((c) => ({ label: `${c.label} (${c.num})`, value: c.count })), { label: "Sin respuesta", value: it.omitted }]} total={it.answered + it.omitted} />
              <p className="small muted" style={{ marginTop: "0.4rem" }}>
                Respuestas válidas: {it.answered} · Omisiones: {it.omitted} · Mediana: {n2(it.median)}
              </p>
            </div>
          ))}
        </>
      )}

      {a.instrument === "entrevista" && (
        <>
          <h3>Respuestas de la dirección</h3>
          {a.data.nValid === 0 && <p className="muted">Sin entrevistas en este filtro.</p>}
          {a.data.nValid === 1 && <p className="small muted">Hay una sola entrevista: se presentan sus respuestas directamente, sin gráficos.</p>}
          {a.data.nValid > 1 && <p className="small muted">En preguntas de selección múltiple los porcentajes pueden sumar más de 100 %.</p>}
          {a.data.nValid > 0 && a.data.questions.map((q) => (
            <div className="item" key={q.id}>
              <p style={{ marginBottom: "0.5rem" }}><strong>{q.n}.</strong> {q.text} <span className="muted small">({q.type === "single" ? "única" : "múltiple"})</span></p>
              {q.answered === 0 ? (
                <p className="muted">Sin respuesta.</p>
              ) : a.data.nValid === 1 ? (
                <ul>{q.counts.filter((c) => c.count).map((c) => <li key={c.value}>{c.label}</li>)}</ul>
              ) : (
                <Bars rows={q.counts.map((c) => ({ label: c.label, value: c.count }))} total={q.answered} />
              )}
              {q.otherTexts.length > 0 && <p className="small">Especificado en «Otra/Otro»: {q.otherTexts.join("; ")}</p>}
              <EvidenceList items={evidence.filter((e) => e.item === q.id)} />
            </div>
          ))}
        </>
      )}

      {a.instrument === "observacion" && (
        <>
          <h3>Resultados por criterio</h3>
          <p className="small muted">NV (no verificable) es una categoría propia: no se suma a NC ni se convierte en puntaje.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Criterio</th><th className="num">C</th><th className="num">P</th><th className="num">NC</th><th className="num">NV</th><th className="num">Sin registrar</th></tr></thead>
              <tbody>
                {a.data.criteria.map((c) => (
                  <tr key={c.id}>
                    <td>{c.n}. {c.title}</td>
                    {c.counts.map((o) => <td className="num" key={o.value}>{o.count}</td>)}
                    <td className="num">{c.omitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {OBSERVATION.criteria.map((c) => {
            const ev = evidence.filter((e) => e.item === c.id);
            return ev.length ? (
              <details key={c.id}>
                <summary>Evidencias del criterio {c.n}: {c.title} ({ev.length})</summary>
                <EvidenceList items={ev} />
              </details>
            ) : null;
          })}
        </>
      )}

      <h3>Interpretaciones (borrador revisable)</h3>
      <p className="small muted">
        Generadas por reglas verificables, sin IA. Son borradores para revisión del investigador: no establecen causas, representatividad
        ni validez del instrumento. Lo declarado por clientes, lo declarado por la dirección y lo observado se presentan por separado.
      </p>
      {interps.length === 0 && <p className="muted">Sin datos suficientes en este filtro.</p>}
      {interps.map((i) => (
        <div className="interp" key={i.title}>
          <p style={{ marginBottom: "0.3rem" }}><strong>{i.title}</strong> <span className="tag">{i.source}</span> <span className="tag">{i.kind}</span></p>
          <p style={{ marginBottom: "0.3rem" }}>{i.text}</p>
          <p className="meta">Respaldo: {i.basis} · Registros: {i.n} · Filtros: {i.filters}</p>
          <p className="meta">Limitaciones: {i.limitations.join(" ")}</p>
        </div>
      ))}

      <h3>Registros</h3>
      <RecordsTable recs={recs} />

      <h3 className="no-print">Exportación</h3>
      <div className="row no-print">
        <a className="btn secondary" href={`/api/admin/exportar?instrumento=${code}&${qs}`}>CSV analítico (sin datos personales)</a>
        <a className="btn secondary" href={`/api/admin/exportar?instrumento=${code}&datos=personales&${qs}`}>CSV de datos personales (auditado)</a>
      </div>
      <p className="small muted">CSV UTF-8 que abre directamente en Excel. Celdas que empiezan con =, +, -, @ se neutralizan contra fórmulas.</p>

      <h3>Instantáneas del análisis</h3>
      {snapshots.results.length > 0 && (
        <ul>
          {snapshots.results.map((s) => (
            <li key={s.id}>
              {s.created_at.slice(0, 16).replace("T", " ")} UTC · {s.kind} · v{s.version} · {JSON.parse(s.filters).descripcion} ·{" "}
              <a href={`/api/admin/exportar?instrumento=${code}&instantanea=${s.id}`}>JSON</a>
            </li>
          ))}
        </ul>
      )}
      {!final ? (
        <form action={finalSnapshot} className="stack no-print">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="filters" value={qs} />
          <label className="opt" style={{ maxWidth: "36rem" }}>
            <input type="checkbox" required /> Confirmo cerrar la recolección de este instrumento y guardar el análisis final con los filtros actuales.
          </label>
          <button className="btn danger" type="submit">Cerrar recolección y generar instantánea final</button>
        </form>
      ) : (
        <p className="small muted">La recolección está cerrada. Puede reabrirla en «Enlaces, metas e invitaciones».</p>
      )}
    </div>
  );
}

type Ev = { id: string; submission_id: string; item: string; kind: string; text: string | null; url: string | null; material_date: string | null };

async function loadEvidence(recs: Rec[]): Promise<Ev[]> {
  if (!recs.length) return [];
  const ids = new Set(recs.map((r) => r.id));
  const all = await db().prepare("SELECT id, submission_id, item, kind, text, url, material_date FROM evidence ORDER BY created_at").all<Ev>();
  return all.results.filter((e) => ids.has(e.submission_id));
}

function EvidenceList({ items }: { items: Ev[] }) {
  if (!items.length) return null;
  return (
    <ul className="small">
      {items.map((e) => (
        <li key={e.id}>
          {e.kind === "foto" ? (
            <a href={`/api/evidencia/${e.id}`} target="_blank" rel="noopener">Fotografía</a>
          ) : (
            <>
              {e.text && <span>{e.text} </span>}
              {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a>}
              {e.material_date && <span className="muted"> · material del {e.material_date}</span>}
            </>
          )}{" "}
          <a className="muted" href={`/admin/registro/${e.submission_id}`}>(registro)</a>
        </li>
      ))}
    </ul>
  );
}

function RecordsTable({ recs }: { recs: Rec[] }) {
  const sorted = [...recs].sort((x, y) => (y.submitted_at ?? y.created_at).localeCompare(x.submitted_at ?? x.created_at)).slice(0, 300);
  if (!sorted.length) return <p className="muted">Sin registros en este filtro.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Registro</th><th>Fecha (Guatemala)</th><th>Estado</th><th>Canal</th><th>Marcas</th></tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td><a href={`/admin/registro/${r.id}`}>{r.id.slice(0, 8)}</a></td>
              <td>{gtDate(r.submitted_at ?? r.created_at)}</td>
              <td>{r.status}</td>
              <td>{r.channel}</td>
              <td>{r.is_test ? <span className="tag">prueba</span> : null} {r.excluded ? <span className="tag">excluido</span> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {recs.length > 300 && <p className="small muted">Se muestran los 300 más recientes; use filtros o la exportación para ver todos.</p>}
    </div>
  );
}
