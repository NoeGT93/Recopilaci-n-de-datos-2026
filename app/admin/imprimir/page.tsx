import { headers } from "next/headers";
import { requireRole } from "@/lib/server";
import { INSTRUMENT_NAMES, type InstrumentCode } from "@/lib/instruments";
import { CopyLink } from "@/components/AdminClient";

const CODES: InstrumentCode[] = ["encuesta", "entrevista", "observacion"];

export default async function Imprimir() {
  if (!(await requireRole("admin"))) return null;
  const h = await headers();
  const host = h.get("host") ?? "";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`;
  return (
    <div className="stack">
      <section className="card">
        <div className="card-title"><h2>Formularios para imprimir</h2></div>
        <p className="small muted">
          Versión en papel (A4) de cada instrumento, con los mismos textos, opciones y numeración que el formulario web. Ábrala y use
          «Imprimir / Guardar como PDF»: sirve para aplicar en físico y para los anexos del informe.
        </p>
        <div className="print-list">
          {CODES.map((c) => (
            <div key={c} className="print-item">
              <strong>{INSTRUMENT_NAMES[c]}</strong>
              <div className="row" style={{ gap: "0.5rem" }}>
                <a className="btn small" href={`/imprimir/${c}`} target="_blank" rel="noopener">Abrir para imprimir</a>
                {c === "encuesta" && <a className="btn secondary small" href={`/imprimir/${c}?ajustes=0`} target="_blank" rel="noopener">Solo el instrumento original</a>}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="card-title"><h2>Ingresar respuestas tomadas en papel</h2></div>
        <p className="small muted">
          Transcriba cada encuesta en papel con este enlace: queda registrada con el canal «papel», así puede filtrarla o compararla en
          los dashboards. Anote el folio impreso en el formulario para poder rastrearlo. La entrevista y las fichas en papel se
          transcriben desde sus propios enlaces, con el usuario de quien las aplicó.
        </p>
        <CopyLink url={`${origin}/encuesta/clientes?canal=papel`} label="Encuesta en papel" />
      </section>
    </div>
  );
}
