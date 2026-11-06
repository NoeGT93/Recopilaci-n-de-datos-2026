import { INTERVIEW } from "@/lib/instruments";
import { getInstrument, requireRole } from "@/lib/server";
import { AccessGate, InterviewForm, LogoutButton } from "@/components/RestrictedForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrevista a la dirección" };

export default async function Page() {
  const session = await requireRole("entrevista");
  const inst = session ? await getInstrument("entrevista") : null;
  return (
    <main className="page">
      <header className="masthead">
        <p className="org">CUNOC · USAC · Maestría en Marketing Estratégico y Alta Gerencia</p>
        <div className="row spread">
          <h1 style={{ margin: 0 }}>{INTERVIEW.title}</h1>
          {session && <LogoutButton />}
        </div>
      </header>
      {!session ? (
        <AccessGate instrument="entrevista" />
      ) : inst?.state === "cerrado" ? (
        <p>El formulario no está recibiendo respuestas en este momento.</p>
      ) : (
        <>
          {inst?.state === "prueba" && <div className="notice accent" style={{ marginBottom: "1rem" }}><strong>Modo de prueba.</strong> Este registro se marcará como prueba.</div>}
          <InterviewForm />
        </>
      )}
    </main>
  );
}
