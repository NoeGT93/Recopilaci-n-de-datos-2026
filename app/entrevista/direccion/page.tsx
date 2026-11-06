import { activePeople, getInstrument, requireRole } from "@/lib/server";
import { AccessGate, InterviewForm, LogoutButton } from "@/components/RestrictedForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrevista a la dirección" };

export default async function Page() {
  const session = await requireRole("entrevista");
  const inst = session ? await getInstrument("entrevista") : null;
  return (
    <main className="page">
      {!session ? (
        <AccessGate instrument="entrevista" people={await activePeople("entrevista")} />
      ) : (
        <>
          <div className="row spread" style={{ marginBottom: "1rem" }}>
            {inst?.state === "prueba" ? <span className="tag accent"><span className="dot" />Modo de prueba</span> : <span />}
            <LogoutButton name={session.label ?? "Dirección"} />
          </div>
          {inst?.state === "cerrado" ? (
            <div className="card"><p className="muted" style={{ margin: 0 }}>El formulario no está recibiendo respuestas en este momento.</p></div>
          ) : (
            <InterviewForm />
          )}
        </>
      )}
    </main>
  );
}
