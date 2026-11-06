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
      <header className="masthead">
        <p className="org">CUNOC · USAC · Maestría en Marketing Estratégico y Alta Gerencia</p>
        <h1>Encuesta a clientes</h1>
      </header>
      {!inst || inst.state === "cerrado" ? (
        <p>La encuesta no está recibiendo respuestas en este momento. Gracias por su interés.</p>
      ) : (
        <SurveyForm siteKey={env().TURNSTILE_SITE_KEY} channel={channel} mode={inst.state} />
      )}
    </main>
  );
}
