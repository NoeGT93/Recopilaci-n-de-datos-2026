import { OBSERVATION } from "@/lib/instruments";
import { getInstrument, requireRole } from "@/lib/server";
import { AccessGate, LogoutButton, ObservationApp } from "@/components/RestrictedForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ficha de observación virtual" };

export default async function Page() {
  const session = await requireRole("observacion");
  const inst = session ? await getInstrument("observacion") : null;
  return (
    <main className="page">
      <header className="masthead">
        <p className="org">CUNOC · USAC · Equipo investigador</p>
        <div className="row spread">
          <h1 style={{ margin: 0 }}>{OBSERVATION.title}</h1>
          {session && <LogoutButton />}
        </div>
      </header>
      {!session ? (
        <AccessGate instrument="observacion" />
      ) : inst?.state === "cerrado" ? (
        <p>La observación no está recibiendo registros en este momento.</p>
      ) : (
        <>
          {inst?.state === "prueba" && <div className="notice accent" style={{ marginBottom: "1rem" }}><strong>Modo de prueba.</strong> Las fichas se marcarán como prueba.</div>}
          <ObservationApp observer={session.label ?? "Observador"} />
        </>
      )}
    </main>
  );
}
