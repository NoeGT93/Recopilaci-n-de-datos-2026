import SurveyForm from "@/components/SurveyForm";
import { env, getInstrument } from "@/lib/server";
import { parseChannel } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Encuesta a clientes de Coffee Bike" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const inst = await getInstrument("encuesta");
  const channel = parseChannel((await searchParams).canal);
  return (
    <main className="page">
      {!inst || inst.state === "cerrado" ? (
        <div className="card">
          <h1 style={{ fontSize: "1.4rem" }}>Encuesta cerrada</h1>
          <p className="muted" style={{ margin: 0 }}>La encuesta no está recibiendo respuestas en este momento. Gracias por su interés.</p>
        </div>
      ) : (
        <SurveyForm siteKey={env().TURNSTILE_SITE_KEY} channel={channel} mode={inst.state} />
      )}
    </main>
  );
}
