import { headers } from "next/headers";
import { INSTRUMENT_NAMES, type InstrumentCode } from "@/lib/instruments";
import { db, getInstrument, now, requireRole } from "@/lib/server";
import { ChannelLink, CopyLink, InvitationForm, NewCodeButton } from "@/components/AdminClient";
import { extendInvitation, revokeInvitation, updateInstrument } from "../actions";

const CODES: InstrumentCode[] = ["encuesta", "entrevista", "observacion"];
const fmt = (iso: string | null) => (iso ? new Date(Date.parse(iso) - 6 * 3600_000).toISOString().slice(0, 16).replace("T", " ") : "—");

export default async function Enlaces() {
  if (!(await requireRole("admin"))) return null;
  const h = await headers();
  const host = h.get("host") ?? "";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`;
  const links = { entrevista: `${origin}/entrevista/direccion`, observacion: `${origin}/observacion` };
  const insts = await Promise.all(CODES.map((c) => getInstrument(c)));
  const invs = await db()
    .prepare("SELECT id, instrument, label, created_at, expires_at, revoked_at, last_used_at FROM invitations ORDER BY revoked_at IS NOT NULL, instrument, label")
    .all<{ id: string; instrument: "entrevista" | "observacion"; label: string; created_at: string; expires_at: string; revoked_at: string | null; last_used_at: string | null }>();
  const t = now();
  return (
    <div className="stack">
      <section className="card">
        <div className="card-title"><h2>Enlaces para compartir</h2></div>
        <p className="small muted">
          Son tres enlaces fijos. La encuesta es pública. En la entrevista y la observación cada persona elige su nombre y escribe su
          código; quien no tenga código no puede entrar.
        </p>
        <h3>Encuesta a clientes (pública)</h3>
        <CopyLink url={`${origin}/encuesta/clientes`} label="Encuesta a clientes" />
        <details>
          <summary>Crear un enlace por canal de captación (QR en mesa, WhatsApp, redes…)</summary>
          <ChannelLink base={`${origin}/encuesta/clientes`} />
        </details>
        <h3>Ficha de observación (equipo investigador)</h3>
        <CopyLink url={links.observacion} label="Ficha de observación" />
        <h3>Entrevista a la dirección</h3>
        <CopyLink url={links.entrevista} label="Entrevista a la dirección" />
      </section>

      <section className="card">
        <div className="card-title"><h2>Personas con acceso</h2></div>
        <p className="small muted">
          Agregue a cada investigador (o a la dirección) con el nombre que verá en la lista. Se genera un código personal de 8
          caracteres que solo se muestra una vez. La sesión queda abierta en su dispositivo durante toda la vigencia y lo que escriben
          se guarda solo. Si alguien pierde su código, use «Nuevo código».
        </p>
        <InvitationForm links={links} />
        <div className="table-wrap" style={{ marginTop: "1.25rem" }}>
          <table>
            <thead>
              <tr><th>Nombre</th><th>Formulario</th><th>Vigente hasta</th><th>Último ingreso</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {invs.results.map((v) => {
                const state = v.revoked_at ? "Revocado" : v.expires_at <= t ? "Vencido" : "Vigente";
                return (
                  <tr key={v.id}>
                    <td><strong>{v.label}</strong></td>
                    <td>{INSTRUMENT_NAMES[v.instrument]}</td>
                    <td>{fmt(v.expires_at)}</td>
                    <td>{fmt(v.last_used_at)}</td>
                    <td><span className={`tag ${state === "Vigente" ? "ok" : state === "Revocado" ? "danger" : ""}`}>{state}</span></td>
                    <td>
                      {!v.revoked_at && (
                        <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
                          <NewCodeButton id={v.id} link={links[v.instrument]} />
                          <form action={extendInvitation}>
                            <input type="hidden" name="id" value={v.id} />
                            <button className="btn secondary small" type="submit">+90 días</button>
                          </form>
                          <form action={revokeInvitation}>
                            <input type="hidden" name="id" value={v.id} />
                            <button className="btn danger small" type="submit">Revocar</button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: "0.75rem" }}>Horas en tiempo de Guatemala. «Revocar» cierra el acceso de inmediato; las respuestas ya guardadas se conservan.</p>
      </section>

      <section className="card">
        <div className="card-title"><h2>Estado y metas</h2></div>
        <p className="small muted">
          «En prueba» marca los registros como prueba (no cuentan). «Abierto» inicia la recolección definitiva. «Cerrado» deja de
          recibir respuestas. Cada meta es independiente (vacío = sin definir).
        </p>
        {insts.map(
          (i) =>
            i && (
              <form key={i.code} action={updateInstrument} className="filters" style={{ padding: "0.75rem 0", borderTop: "1px solid var(--border)" }}>
                <input type="hidden" name="code" value={i.code} />
                <p style={{ margin: 0, fontWeight: 600 }}>{INSTRUMENT_NAMES[i.code]}</p>
                <div className="field">
                  <label htmlFor={`st-${i.code}`}>Estado</label>
                  <select id={`st-${i.code}`} name="state" defaultValue={i.state}>
                    <option value="prueba">En prueba</option>
                    <option value="abierto">Abierto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`g-${i.code}`}>Meta de válidos</label>
                  <input id={`g-${i.code}`} name="goal" type="number" min={0} defaultValue={i.goal ?? ""} />
                </div>
                <button className="btn secondary" type="submit">Guardar</button>
              </form>
            ),
        )}
      </section>
    </div>
  );
}
