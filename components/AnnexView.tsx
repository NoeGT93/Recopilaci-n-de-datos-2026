"use client";
// Vista web para anexos: las pantallas REALES de cada formulario (mismos componentes que ve el participante),
// en secuencia, sin red ni almacenamiento, para guardarlas como PDF con colores e imágenes.
import { useEffect } from "react";
import { SURVEY } from "@/lib/instruments";
import SurveyForm, { type Media, type Step } from "./SurveyForm";
import { AccessGate, InterviewBody, ObservationBody, type Loaded } from "./RestrictedForms";

const EMPTY: Loaded = { id: "anexo", status: "nuevo", answers: {}, meta: {}, photos: [] };

function Screen({ n, total, title, children }: { n: number; total: number; title: string; children: React.ReactNode }) {
  return (
    <section className="annex-screen">
      <p className="annex-label">Pantalla {n} de {total} · {title}</p>
      <div className="annex-frame">{children}</div>
    </section>
  );
}

export default function AnnexView({ code, media }: { code: "encuesta" | "entrevista" | "observacion"; media: Media[] }) {
  // En el anexo, los apartados desplegables se muestran abiertos para que su contenido quede en el PDF.
  useEffect(() => {
    document.querySelectorAll<HTMLDetailsElement>(".annex-frame details").forEach((d) => (d.open = true));
  }, []);
  if (code === "encuesta") {
    const steps: [Step, string][] = [
      ["intro", "Introducción"],
      ["consent", "Consentimiento informado"],
      ["filters", "Filtros de elegibilidad"],
      ["personal", "Datos de identificación (opcionales)"],
      ...SURVEY.items.map((it, i) => [i, `Pregunta ${it.n}`] as [Step, string]),
      ["review", "Revisión antes de enviar"],
      ["done", "Confirmación"],
      ["ineligible", "Mensaje para casos no elegibles"],
    ];
    return (
      <>
        {steps.map(([step, title], i) => (
          <Screen key={String(step)} n={i + 1} total={steps.length} title={title}>
            <SurveyForm siteKey="" channel="anexo" mode="abierto" media={media} previewStep={step} />
          </Screen>
        ))}
      </>
    );
  }
  const sample = code === "entrevista" ? [{ id: "a", label: "Dirección de Coffee Bike" }] : [{ id: "a", label: "Investigador 1" }, { id: "b", label: "Investigador 2" }];
  return (
    <>
      <Screen n={1} total={2} title="Acceso (elegir nombre)">
        <AccessGate instrument={code} people={sample} />
      </Screen>
      <Screen n={2} total={2} title={code === "entrevista" ? "Formulario completo" : "Ficha completa"}>
        {code === "entrevista" ? <InterviewBody initial={EMPTY} /> : <ObservationBody initial={EMPTY} observer="Investigador 1" onBack={() => {}} />}
      </Screen>
    </>
  );
}
