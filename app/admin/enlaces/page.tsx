import { headers } from "next/headers";
import { INSTRUMENT_NAMES, type InstrumentCode } from "@/lib/instruments";
import { db, getInstrument, now, requireRole } from "@/lib/server";
import { ChannelLink, CopyLink, InvitationForm } from "@/components/AdminClient";
import { revokeInvitation, updateInstrument } from "../actions";

const CODES: InstrumentCode[] = ["encuesta", "entrevista", "observacion"];

export default async function Enlaces() {
  if (!(await requireRole("admin"))) return null;
  const h = await headers();
  const host = h.get("host") ?? "";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const insts = await Promise.all(CODES.map((c) => getInstrument(c)));
  const invs = await db()
    .prepare("SELECT id, instrument, label, created_at, expires_at, revoked_at, last_used_at FROM invitations ORDER BY created_at DESC")
    .all<{ id: string; instrument: InstrumentCode; label: string; created_at: string; expires_at: string; revoked_at: string | null; last_used_at: string | null }>();
  const t = now();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Estado y metas</h2>
      <p className="small muted">
        «En prueba» permite probar el instrumento: los registros se marcan como prueba y no cuentan. «Abierto» inicia la recolección
        definitiva. «Cerrado» deja de recibir respuestas. La meta de cada instrumento es independiente (vacío = sin definir).
      </p>
      {insts.map(
        (i) =>
          i && (
            <form key={i.code} action={updateInstrument} className="filters">
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

      <h2>Encuesta pública</h2>
      <CopyLink url={`${origin}/encuesta/clientes`} label="Encuesta a clientes" />
      <h3>Enlace por canal de captación</h3>
      <p className="small muted">El canal se registra con cada respuesta para distinguir la procedencia (QR en mesa, WhatsApp, redes…).</p>
      <ChannelLink base={`${origin}/encuesta/clientes`} />

      <h2>Invitaciones</h2>
      <p className="small muted">
        Cada invitación sirve solo para su instrumento, vence en la fecha indicada y puede revocarse (cierra también las sesiones abiertas).
        La dirección solo puede responder su entrevista; el equipo observador solo registra y consulta sus propias fichas.
      </p>
      <InvitationForm />
      <div className="table-wrap" style={{ marginTop: "1rem" }}>
        <table>
          <thead>
            <tr><th>Etiqueta</th><th>Instrumento</th><th>Vence (UTC)</th><th>Último uso</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {invs.results.map((v) => {
              const state = v.revoked_at ? "Revocada" : v.expires_at <= t ? "Vencida" : "Vigente";
              return (
                <tr key={v.id}>
                  <td>{v.label}</td>
                  <td>{INSTRUMENT_NAMES[v.instrument]}</td>
                  <td>{v.expires_at.slice(0, 16).replace("T", " ")}</td>
                  <td>{v.last_used_at?.slice(0, 16).replace("T", " ") ?? "—"}</td>
                  <td>{state}</td>
                  <td>
                    {state === "Vigente" && (
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={v.id} />
                        <button className="btn danger small" type="submit">Revocar</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
