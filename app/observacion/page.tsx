import { activePeople, getInstrument, requireRole } from "@/lib/server";
import { AccessGate, LogoutButton, ObservationApp } from "@/components/RestrictedForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ficha de observación virtual" };

export default async function Page() {
  const session = await requireRole("observacion");
  const inst = session ? await getInstrument("observacion") : null;
  return (
    <main className="page">
      {!session ? (
        <AccessGate instrument="observacion" people={await activePeople("observacion")} />
      ) : (
        <>
          <div className="row spread" style={{ marginBottom: "1rem" }}>
            {inst?.state === "prueba" ? <span className="tag accent"><span className="dot" />Modo de prueba: las fichas se marcan como prueba</span> : <span />}
            <LogoutButton name={session.label ?? "Observador"} />
          </div>
          {inst?.state === "cerrado" ? (
            <div className="card"><p className="muted" style={{ margin: 0 }}>La observación no está recibiendo registros en este momento.</p></div>
          ) : (
            <ObservationApp observer={session.label ?? "Observador"} />
          )}
        </>
      )}
    </main>
  );
}
