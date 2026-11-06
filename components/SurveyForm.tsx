"use client";
import { useEffect, useRef, useState } from "react";
import { SCALE, SURVEY } from "@/lib/instruments";
import Turnstile from "./Turnstile";
import { Button, Notice, PersonalFields, postJson, randomKey, store, uuid, type PersonalValues } from "./ui";

type Answers = Record<string, string | null>;
type Step = "intro" | "consent" | "filters" | "personal" | 0 | 1 | 2 | "review" | "done" | "ineligible";
// Lo que se guarda en este dispositivo: id opaco, clave del borrador y respuestas. Nunca datos personales.
type Saved = { id: string; key: string; step: Step; answers: Answers; started: boolean };

const KEY = "encuesta-clientes-v" + SURVEY.version;
const PAGES = [SURVEY.items.slice(0, 5), SURVEY.items.slice(5, 10), SURVEY.items.slice(10, 15)];
const YESNO = [
  { v: true, l: "Sí" },
  { v: false, l: "No" },
];

export default function SurveyForm({ siteKey, channel, mode }: { siteKey: string; channel: string; mode: "prueba" | "abierto" }) {
  const [s, setS] = useState<Saved | null>(null);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [adult, setAdult] = useState<boolean | null>(null);
  const [consumed, setConsumed] = useState<boolean | null>(null);
  const [personal, setPersonal] = useState<PersonalValues>({});
  const [token, setToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveWarn, setSaveWarn] = useState(false);
  const [resumable, setResumable] = useState<Saved | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // Recuperar borrador de este dispositivo.
  useEffect(() => {
    const saved = store.get<Saved>(KEY);
    if (saved?.started && saved.step !== "done" && saved.step !== "ineligible") setResumable(saved);
    else setS({ id: uuid(), key: randomKey(), step: "intro", answers: {}, started: false });
  }, []);

  useEffect(() => {
    if (s?.started) {
      if (s.step === "done") store.del(KEY);
      else store.set(KEY, s);
    }
  }, [s]);

  if (!s && !resumable) return null;

  if (resumable && !s) {
    const answered = Object.values(resumable.answers).filter(Boolean).length;
    return (
      <section className="step stack" aria-labelledby="resume-h">
        <h2 id="resume-h">Tiene una encuesta sin terminar</h2>
        <p>En este dispositivo hay {answered} de 15 afirmaciones respondidas.</p>
        <div className="row">
          <Button
            busy={busy}
            onClick={async () => {
              setBusy(true);
              const r = await postJson<{ status?: string; answers?: Answers }>("/api/encuesta", { action: "resume", id: resumable.id, key: resumable.key });
              setBusy(false);
              if (r.ok && r.data.status && r.data.status !== "borrador") {
                store.del(KEY);
                setS({ ...resumable, step: "done" });
              } else if (r.ok) {
                const server = r.data.answers ?? {};
                setS({ ...resumable, answers: answered ? resumable.answers : server });
              } else if (r.status === 404) {
                store.del(KEY);
                setS({ id: uuid(), key: randomKey(), step: "intro", answers: {}, started: false });
              } else setS(resumable); // sin conexión: continúa con lo guardado aquí
              setResumable(null);
            }}
          >
            Continuar
          </Button>
          <button
            className="btn secondary"
            onClick={() => {
              store.del(KEY);
              setResumable(null);
              setS({ id: uuid(), key: randomKey(), step: "intro", answers: {}, started: false });
            }}
          >
            Empezar de nuevo
          </button>
        </div>
      </section>
    );
  }

  const st = s!;
  const go = (step: Step) => {
    setError(null);
    setS({ ...st, step });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      heading.current?.focus();
    });
  };
  const setAnswer = (id: string, v: string | null) => setS({ ...st, answers: { ...st.answers, [id]: v } });

  async function saveDraft(next: Step) {
    go(next);
    const r = await postJson("/api/encuesta", { action: "save", id: st.id, key: st.key, answers: st.answers });
    setSaveWarn(!r.ok);
  }

  async function start() {
    if (!token) return setError("Espere la verificación de seguridad o márquela para continuar.");
    setBusy(true);
    setError(null);
    const r = await postJson<{ status?: string; turnstile?: boolean }>("/api/encuesta", {
      action: "start", id: st.id, key: st.key, consent, adult, consumed, channel, turnstile: token,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.data.error ?? "No se pudo continuar.");
      setTsReset((n) => n + 1);
      return;
    }
    if (r.data.status === "no_elegible") {
      store.del(KEY);
      return go("ineligible");
    }
    setS({ ...st, started: true, step: "personal" });
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const r = await postJson<{ status?: string }>("/api/encuesta", { action: "submit", id: st.id, key: st.key, answers: st.answers, personal });
    setBusy(false);
    if (r.ok) {
      store.del(KEY);
      go("done");
    } else setError(r.data.error ?? "No se pudo enviar. Sus respuestas se conservan; intente de nuevo.");
  }

  const answeredCount = SURVEY.items.filter((i) => st.answers[i.id]).length;
  const stepIndex = typeof st.step === "number" ? st.step : null;

  return (
    <div>
      {mode === "prueba" && (
        <Notice kind="accent">
          <strong>Modo de prueba.</strong> Las respuestas se registran como prueba y no se cuentan en los resultados.
        </Notice>
      )}

      {st.step === "intro" && (
        <section className="step stack">
          <h2 ref={heading} tabIndex={-1}>{SURVEY.title}</h2>
          <p>{SURVEY.objective}</p>
          <p className="small muted">Son 15 afirmaciones; toma alrededor de 5 minutos. Puede dejar sin responder las que prefiera.</p>
          <Button onClick={() => go("consent")}>Comenzar</Button>
        </section>
      )}

      {(st.step === "consent" || st.step === "filters") && (
        <section className="step stack">
          {st.step === "consent" ? (
            <>
              <h2 ref={heading} tabIndex={-1}>Consentimiento informado</h2>
              <p>
                Esta encuesta forma parte de una investigación académica de la Maestría en Marketing Estratégico y Alta Gerencia
                (CUNOC, Universidad de San Carlos de Guatemala) sobre la imagen corporativa y el reconocimiento de Coffee Bike.
              </p>
              <ul>
                <li>Su participación es voluntaria; puede dejar de responder en cualquier momento.</li>
                <li>Las respuestas se analizan de forma agregada y confidencial, solo con fines académicos.</li>
                <li>Los datos de identificación son opcionales y se guardan separados de sus respuestas.</li>
              </ul>
              <fieldset className="item">
                <legend>¿Acepta participar?</legend>
                <div className="options">
                  {[{ v: true, l: "Sí, acepto participar" }, { v: false, l: "No acepto" }].map((o) => (
                    <label className="opt" key={String(o.v)}>
                      <input type="radio" name="consent" checked={consent === o.v} onChange={() => setConsent(o.v)} />
                      {o.l}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <h2 ref={heading} tabIndex={-1}>Antes de empezar</h2>
              {[
                { q: "¿Tiene 18 años o más?", v: adult, set: setAdult, name: "adult" },
                { q: "¿Ha consumido productos de Coffee Bike?", v: consumed, set: setConsumed, name: "consumed" },
              ].map((f) => (
                <fieldset className="item" key={f.name}>
                  <legend>{f.q}</legend>
                  <div className="options inline">
                    {YESNO.map((o) => (
                      <label className="opt" key={String(o.v)}>
                        <input type="radio" name={f.name} checked={f.v === o.v} onChange={() => f.set(o.v)} />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </>
          )}
          <p className="small muted">
            El consentimiento y estas preguntas de elegibilidad son ajustes de la aplicación, pendientes de revisión académica.
          </p>
          <Turnstile siteKey={siteKey} onToken={setToken} resetKey={tsReset} />
          {error && <Notice kind="error">{error}</Notice>}
          <div className="actions">
            <button className="btn secondary" onClick={() => go(st.step === "consent" ? "intro" : "consent")}>Atrás</button>
            {st.step === "consent" ? (
              <Button disabled={consent === null} busy={busy} onClick={() => (consent ? go("filters") : start())}>
                Continuar
              </Button>
            ) : (
              <Button disabled={adult === null || consumed === null} busy={busy} onClick={start}>
                Continuar
              </Button>
            )}
          </div>
        </section>
      )}

      {st.step === "personal" && (
        <section className="step stack">
          <h2 ref={heading} tabIndex={-1}>Datos de identificación</h2>
          <PersonalFields
            value={personal}
            onChange={setPersonal}
            purpose="Finalidad: describir el perfil de quienes participan. Puede dejarlos en blanco. Se envían solo al final, se guardan separados de sus respuestas y únicamente el equipo investigador puede consultarlos."
          />
          <div className="actions">
            <span />
            <Button onClick={() => go(0)}>Ir a las afirmaciones</Button>
          </div>
        </section>
      )}

      {stepIndex !== null && (
        <section className="step">
          <h2 ref={heading} tabIndex={-1}>
            Afirmaciones {stepIndex * 5 + 1} a {stepIndex * 5 + 5}
          </h2>
          <p className="small muted">Marque una sola opción por afirmación. Puede omitir las que prefiera.</p>
          <div className="progressbar" aria-hidden>
            <span style={{ transform: `scaleX(${(stepIndex + 1) / 3})` }} />
          </div>
          {PAGES[stepIndex].map((it) => (
            <fieldset className="item" key={it.id}>
              <legend>
                <span className="num">{it.n}.</span>
                {it.text}
              </legend>
              <div className="options">
                {SCALE.map((o) => (
                  <label className="opt" key={o.value}>
                    <input type="radio" name={it.id} value={o.value} checked={st.answers[it.id] === o.value} onChange={() => setAnswer(it.id, o.value)} />
                    {o.label}
                  </label>
                ))}
              </div>
              {st.answers[it.id] && (
                <button className="linkbtn" onClick={() => setAnswer(it.id, null)}>
                  Quitar selección (dejar sin respuesta)
                </button>
              )}
            </fieldset>
          ))}
          {saveWarn && <Notice>No se pudo guardar en el servidor; sus respuestas siguen guardadas en este dispositivo.</Notice>}
          <div className="actions">
            <button className="btn secondary" onClick={() => saveDraft(stepIndex === 0 ? "personal" : ((stepIndex - 1) as Step))}>
              Atrás
            </button>
            <Button onClick={() => saveDraft(stepIndex === 2 ? "review" : ((stepIndex + 1) as Step))}>
              {stepIndex === 2 ? "Revisar respuestas" : "Siguiente"}
            </Button>
          </div>
        </section>
      )}

      {st.step === "review" && (
        <section className="step">
          <h2 ref={heading} tabIndex={-1}>Revise sus respuestas</h2>
          <p>
            Respondió {answeredCount} de 15 afirmaciones.
            {answeredCount < 15 && " Las que quedaron sin respuesta se registran como «sin respuesta»; puede volver a ellas si lo desea."}
          </p>
          <div className="table-wrap">
            <table>
              <tbody>
                {SURVEY.items.map((it) => (
                  <tr key={it.id}>
                    <td className="num">{it.n}</td>
                    <td>{it.text}</td>
                    <td>
                      {SCALE.find((o) => o.value === st.answers[it.id])?.label ?? <span className="muted">Sin respuesta</span>}{" "}
                      <button className="linkbtn" onClick={() => go(Math.floor((it.n - 1) / 5) as Step)}>
                        Cambiar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <Notice kind="error">{error}</Notice>}
          <div className="actions">
            <button className="btn secondary" onClick={() => go(2)}>Atrás</button>
            <Button busy={busy} onClick={submit}>{error ? "Reintentar envío" : "Enviar respuestas"}</Button>
          </div>
        </section>
      )}

      {st.step === "done" && (
        <section className="step stack">
          <h2 ref={heading} tabIndex={-1}>Respuesta recibida</h2>
          <Notice kind="ok">Sus respuestas quedaron registradas. Gracias por participar.</Notice>
          <p className="small muted">Puede cerrar esta página.</p>
        </section>
      )}

      {st.step === "ineligible" && (
        <section className="step stack">
          <h2 ref={heading} tabIndex={-1}>Gracias por su tiempo</h2>
          <p>
            Esta encuesta está dirigida a personas mayores de edad que han consumido productos de Coffee Bike y que aceptan
            participar. No es necesario que continúe.
          </p>
        </section>
      )}
    </div>
  );
}
