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
        <div className="card-title"><h2>Anexos y formularios en papel</h2></div>
        <p className="small muted">
          <strong>Vista web para anexos:</strong> todas las pantallas del formulario tal como se ven en la web (diseño, ilustraciones,
          opciones), listas para «Guardar como PDF». <strong>Formato en papel:</strong> versión A4 en blanco y negro para aplicar en físico.
        </p>
        <div className="print-list">
          {CODES.map((c) => (
            <div key={c} className="print-item">
              <strong>{INSTRUMENT_NAMES[c]}</strong>
              <div className="row" style={{ gap: "0.5rem" }}>
                <a className="btn small" href={`/anexos/${c}`} target="_blank" rel="noopener">Vista web para anexos</a>
                <a className="btn secondary small" href={`/imprimir/${c}`} target="_blank" rel="noopener">Formato en papel</a>
                {c === "encuesta" && <a className="btn secondary small" href={`/imprimir/${c}?ajustes=0`} target="_blank" rel="noopener">Papel: solo el instrumento original</a>}
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
