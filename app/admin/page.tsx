import { CURRENT_VERSION, INSTRUMENT_NAMES, type InstrumentCode } from "@/lib/instruments";
import { progress, gtDate } from "@/lib/analysis";
import { getInstrument, loadRecords, requireRole } from "@/lib/server";

const CODES: InstrumentCode[] = ["encuesta", "entrevista", "observacion"];
const STATE = { cerrado: "Cerrado", prueba: "En prueba", abierto: "Abierto" };

export default async function AdminHome() {
  if (!(await requireRole("admin"))) return null;
  const rows = await Promise.all(
    CODES.map(async (c) => {
      const inst = (await getInstrument(c))!;
      const recs = (await loadRecords(c)).filter((r) => r.version === CURRENT_VERSION[c]);
      return { c, inst, p: progress(recs, inst.goal) };
    }),
  );
  return (
    <section>
      <h2 style={{ marginTop: 0 }}>Resumen general</h2>
      <p className="small muted">Versión vigente de cada instrumento, sin otros filtros. Válidos = enviados (completos o incompletos), sin registros de prueba ni excluidos.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Instrumento</th><th>Estado</th><th className="num">Meta</th><th className="num">Recibidos</th><th className="num">Completos</th>
              <th className="num">Incompletos</th><th className="num">Válidos</th><th className="num">Prueba</th><th className="num">Excluidos</th>
              <th className="num">Avance</th><th className="num">Pendientes</th><th>Última actualización</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, inst, p }) => (
              <tr key={c}>
                <td><a href={`/admin/${c}`}>{INSTRUMENT_NAMES[c]}</a> <span className="muted small">v{CURRENT_VERSION[c]}</span></td>
                <td>{STATE[inst.state]}</td>
                <td className="num">{p.goal ?? "Sin definir"}</td>
                <td className="num">{p.received}</td>
                <td className="num">{p.complete}</td>
                <td className="num">{p.incomplete}</td>
                <td className="num"><strong>{p.valid}</strong></td>
                <td className="num">{p.test}</td>
                <td className="num">{p.excluded}</td>
                <td className="num">{p.percent === null ? "—" : `${p.percent.toFixed(1)} %`}</td>
                <td className="num">{p.pending ?? "—"}</td>
                <td>{p.lastUpdate ? `${gtDate(p.lastUpdate)} ${new Date(Date.parse(p.lastUpdate) - 6 * 3600_000).toISOString().slice(11, 16)}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        La meta de 300 encuestas válidas es operativa y editable; no es un tamaño muestral calculado estadísticamente. Las metas de
        entrevista y observación se configuran por separado en «Enlaces, metas e invitaciones». Pendientes = máx(meta − válidos, 0).
        Horas en tiempo de Guatemala (UTC−6).
      </p>
    </section>
  );
}
