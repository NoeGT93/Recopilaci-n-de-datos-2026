"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SCALE, SURVEY } from "@/lib/instruments";
import Turnstile from "./Turnstile";
import ItemBanner from "./ItemBanner";
import { Button, Notice, PersonalFields, postJson, randomKey, store, uuid, type PersonalValues } from "./ui";

type Answers = Record<string, string | null>;
// Paso numérico = índice de la afirmación (0–14), una por pantalla.
type Step = "intro" | "consent" | "filters" | "personal" | number | "review" | "done" | "ineligible";
// Lo que se guarda en este dispositivo: id opaco, clave del borrador y respuestas. Nunca datos personales.
type Saved = { id: string; key: string; step: Step; answers: Answers; started: boolean };

const KEY = "encuesta-clientes-v" + SURVEY.version;
const N = SURVEY.items.length;
const PART = 5;
const SECONDS_PER_ITEM = 12;
const YESNO = [
  { v: true, l: "Sí" },
  { v: false, l: "No" },
];

/** Mensaje de avance según el porcentaje: corto, sin presión. */
function mood(pct: number) {
  if (pct === 0) return "Recién servido";
  if (pct < 30) return "Buen ritmo";
  if (pct < 42) return "Un tercio de la taza";
  if (pct < 58) return "¡Media taza!";
  if (pct < 80) return "Más de la mitad";
  if (pct < 100) return "Casi terminamos";
  return "¡Taza llena!";
}

/**
 * Indicador de avance: una taza que se llena. Decorativa (aria-hidden): el texto da la misma información.
 * El nivel sube con translateY (no escala, para no deformar la superficie); la superficie ondula en bucle,
 * cae una gota con cada respuesta y sale vapor al llenarse. Todo se detiene con prefers-reduced-motion.
 */
function Cup({ pct, size }: { pct: number; size?: "lg" }) {
  const body = "M11 17h34l-3.8 31.6a5.5 5.5 0 0 1-5.5 4.9H20.3a5.5 5.5 0 0 1-5.5-4.9z";
  const level = (1 - pct / 100) * 37 + 2; // 2 = margen bajo el borde cuando está llena
  const wave = (y: number) => `M-40 ${y} q10 -2.6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V70 H-40 Z`;
  return (
    <div className={`cup ${size ?? ""}`} aria-hidden>
      <svg viewBox="0 0 64 64">
        <defs>
          <clipPath id="cup-clip">
            <path d={body} />
          </clipPath>
        </defs>
        <g className="steam" style={{ opacity: pct === 100 ? 1 : 0 }}>
          <path d="M23 13c-2.2-2.6 2.2-4.3 0-7.5" />
          <path d="M32 13c-2.2-2.6 2.2-4.3 0-7.5" />
          <path d="M41 13c-2.2-2.6 2.2-4.3 0-7.5" />
        </g>
        <path d={body} fill="#fff" />
        <g clipPath="url(#cup-clip)">
          <g className="level" style={{ transform: `translateY(${level}px)` }}>
            <path className="wave back" d={wave(17)} fill="var(--crema)" />
            <path className="wave" d={wave(19.5)} fill="var(--coffee)" />
          </g>
        </g>
        {pct > 0 && pct < 100 && <circle key={pct} className="drop" cx="28" cy="6" r="1.8" fill="var(--coffee)" />}
        <path d={body} fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M44.6 23.5h3a6.8 6.8 0 0 1 0 13.6h-5" fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M6 58.5h44" stroke="var(--wood)" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Progress({ index }: { index: number }) {
  const pct = Math.round((index / N) * 100);
  const minutes = Math.max(1, Math.ceil(((N - index) * SECONDS_PER_ITEM) / 60));
  return (
    <div className="survey-top">
      <Cup pct={pct} />
      <div className="meta">
        <div className="count">
          {index < N ? `${index + 1} de ${N}` : `${N} de ${N}`} · {pct} %
        </div>
        <p className="mood" aria-live="polite">
          {mood(pct)}
          {index < N && <span className="muted" style={{ fontWeight: 500 }}> · ≈ {minutes} min</span>}
        </p>
        <div className="parts" aria-hidden>
          {[0, 1, 2].map((p) => (
            <span key={p}>
              <i style={{ transform: `scaleX(${Math.min(1, Math.max(0, (index - p * PART) / PART))})` }} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export type Media = { id: string; item: string; caption: string | null };

/** Imágenes de referencia cargadas por el equipo (portada o afirmación). */
function MediaStrip({ items }: { items: Media[] }) {
  if (!items.length) return null;
  return (
    <div className="media-strip">
      {items.map((m) => (
        <figure key={m.id}>
          <img src={"/api/medios/" + m.id} alt={m.caption ?? "Imagen de referencia"} loading="lazy" decoding="async" />
          {m.caption && <figcaption>{m.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export default function SurveyForm({ siteKey, channel, mode, media = [] }: { siteKey: string; channel: string; mode: "prueba" | "abierto"; media?: Media[] }) {
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
  const heading = useRef<HTMLElement>(null);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Saved | null>(null);
  latest.current = s;

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

  const go = useCallback((step: Step) => {
    if (advance.current) clearTimeout(advance.current);
    setError(null);
    setS((cur) => (cur ? { ...cur, step } : cur));
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      heading.current?.focus({ preventScroll: true });
    });
  }, []);

  const saveDraft = useCallback(async () => {
    const cur = latest.current;
    if (!cur?.started) return;
    const r = await postJson("/api/encuesta", { action: "save", id: cur.id, key: cur.key, answers: cur.answers });
    setSaveWarn(!r.ok);
  }, []);

  /** Elegir una opción avanza sola a la siguiente afirmación; se guarda en el servidor al cerrar cada bloque de 5. */
  const choose = useCallback(
    (index: number, value: string) => {
      setS((cur) => (cur ? { ...cur, answers: { ...cur.answers, [SURVEY.items[index].id]: value } } : cur));
      if (advance.current) clearTimeout(advance.current);
      advance.current = setTimeout(() => {
        if ((index + 1) % PART === 0) saveDraft();
        go(index + 1 < N ? index + 1 : "review");
      }, 260);
    },
    [go, saveDraft],
  );

  // Teclado en computadora: 1–4 eligen, ← vuelve, → pasa a la siguiente.
  const stepNow = s?.step;
  useEffect(() => {
    if (typeof stepNow !== "number") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= SCALE.length) choose(stepNow, SCALE[n - 1].value);
      else if (e.key === "ArrowLeft" && stepNow > 0) go(stepNow - 1);
      else if (e.key === "ArrowRight") go(stepNow + 1 < N ? stepNow + 1 : "review");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepNow, choose, go]);

  if (!s && !resumable) return null;

  if (resumable && !s) {
    const answered = Object.values(resumable.answers).filter(Boolean).length;
    return (
      <section className="card step stack" aria-labelledby="resume-h">
        <h2 id="resume-h" style={{ marginTop: 0 }}>Tiene una encuesta sin terminar</h2>
        <p className="muted">En este dispositivo hay {answered} de {N} afirmaciones respondidas. Puede seguir donde quedó.</p>
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

  async function start() {
    if (!token) return setError("Espere un momento a la verificación de seguridad y vuelva a intentarlo.");
    setBusy(true);
    setError(null);
    const r = await postJson<{ status?: string }>("/api/encuesta", {
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
  const idx = typeof st.step === "number" ? st.step : null;
  const hRef = heading as React.RefObject<HTMLHeadingElement>;

  return (
    <div>
      {mode === "prueba" && (
        <div style={{ marginBottom: "1rem" }}>
          <Notice kind="accent">
            <strong>Modo de prueba.</strong> Las respuestas se registran como prueba y no se cuentan en los resultados.
          </Notice>
        </div>
      )}

      {st.step === "intro" && (
        <section className="card step">
          {/* Franja negra con el logotipo, como el frente del carrito; la línea de madera evoca su cubierta. */}
          <div className="hero-band">
            <img className="hero-logo" src="/coffee-bike-logo.webp" width={104} height={104} alt="Coffee Bike" />
            <p className="eyebrow" style={{ color: "var(--wood)" }}>Encuesta · 2026</p>
            <h1 ref={hRef} tabIndex={-1}>¿Qué opina de Coffee&nbsp;Bike?</h1>
          </div>
          <MediaStrip items={media.filter((m) => m.item === "portada")} />
          <p className="hero-note">Estudio académico independiente de la Maestría en Marketing Estratégico y Alta Gerencia (CUNOC–USAC). Sus respuestas son confidenciales y no se comparten de forma individual con el negocio.</p>
          <p className="muted">{SURVEY.objective}</p>
          <div className="facts">
            <span className="tag accent">15 afirmaciones</span>
            <span className="tag">≈ 3 minutos</span>
            <span className="tag">Voluntaria y confidencial</span>
            <span className="tag">Puede omitir cualquiera</span>
          </div>
          <Button className="btn block" onClick={() => go("consent")}>Comenzar</Button>
        </section>
      )}

      {(st.step === "consent" || st.step === "filters") && (
        <section className="card step">
          {st.step === "consent" ? (
            <>
              <p className="eyebrow">Paso 1 de 2 · Antes de empezar</p>
              <h2 ref={hRef} tabIndex={-1} style={{ marginTop: 0 }}>Consentimiento informado</h2>
              <p className="muted">
                Esta encuesta forma parte de una investigación académica de la Maestría en Marketing Estratégico y Alta Gerencia
                (CUNOC, Universidad de San Carlos de Guatemala) sobre la imagen corporativa y el reconocimiento de Coffee Bike.
              </p>
              <ul className="muted" style={{ paddingLeft: "1.2rem" }}>
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
              <p className="eyebrow">Paso 2 de 2 · Antes de empezar</p>
              <h2 ref={hRef} tabIndex={-1} style={{ marginTop: 0 }}>Dos preguntas rápidas</h2>
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
          <p className="small muted">El consentimiento y estas preguntas de elegibilidad son ajustes de la aplicación, pendientes de revisión académica.</p>
          <Turnstile siteKey={siteKey} onToken={setToken} resetKey={tsReset} />
          {error && <Notice kind="error">{error}</Notice>}
          <div className="actions">
            <button className="btn ghost" onClick={() => go(st.step === "consent" ? "intro" : "consent")}>Atrás</button>
            {st.step === "consent" ? (
              <Button disabled={consent === null} busy={busy} onClick={() => (consent ? go("filters") : start())}>Continuar</Button>
            ) : (
              <Button disabled={adult === null || consumed === null} busy={busy} onClick={start}>Continuar</Button>
            )}
          </div>
        </section>
      )}

      {st.step === "personal" && (
        <section className="card step">
          <p className="eyebrow">Opcional</p>
          <h2 ref={hRef} tabIndex={-1} style={{ marginTop: 0 }}>Datos de identificación</h2>
          <PersonalFields
            value={personal}
            onChange={setPersonal}
            purpose="Finalidad: describir el perfil de quienes participan. Puede dejarlos en blanco. Se envían solo al final, se guardan separados de sus respuestas y únicamente el equipo investigador puede consultarlos."
          />
          <div className="actions">
            <button className="btn ghost" onClick={() => go(0)}>Omitir</button>
            <Button onClick={() => go(0)}>Ir a las afirmaciones</Button>
          </div>
        </section>
      )}

      {idx !== null && (
        <section className="card">
          <Progress index={idx} />
          <ItemBanner key={"b" + idx} id={SURVEY.items[idx].id} />
          <fieldset className="question" key={idx}>
            <legend className="statement" ref={heading as React.RefObject<HTMLLegendElement>} tabIndex={-1}>
              {SURVEY.items[idx].text}
            </legend>
            <p className="small muted" style={{ margin: "-0.6rem 0 0.9rem" }}>Seleccione una opción.</p>
            <MediaStrip items={media.filter((m) => m.item === SURVEY.items[idx].id)} />
            <div className="scale">
              {SCALE.map((o, k) => (
                <label className="opt" key={o.value}>
                  <input
                    type="radio"
                    name={SURVEY.items[idx].id}
                    value={o.value}
                    checked={st.answers[SURVEY.items[idx].id] === o.value}
                    onChange={() => choose(idx, o.value)}
                  />
                  {o.label}
                  <span className="key" aria-hidden>{k + 1}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {saveWarn && <p className="small muted" style={{ marginTop: "0.75rem" }}>Sin conexión con el servidor: sus respuestas siguen guardadas en este dispositivo.</p>}
          <div className="qnav">
            <button className="btn ghost" onClick={() => go(idx === 0 ? "personal" : idx - 1)}>← Atrás</button>
            <button className="btn secondary" onClick={() => go(idx + 1 < N ? idx + 1 : "review")}>
              {st.answers[SURVEY.items[idx].id] ? "Siguiente →" : "Prefiero no responder →"}
            </button>
          </div>
        </section>
      )}

      {st.step === "review" && (
        <section className="card step">
          <Progress index={N} />
          <h2 ref={hRef} tabIndex={-1} style={{ marginTop: 0 }}>Revise y envíe</h2>
          <p className="muted">
            Respondió {answeredCount} de {N} afirmaciones.
            {answeredCount < N && " Las que quedaron sin respuesta se registran así; puede tocar «Cambiar» en cualquiera."}
          </p>
          <ul className="review-list">
            {SURVEY.items.map((it, i) => {
              const label = SCALE.find((o) => o.value === st.answers[it.id])?.label;
              return (
                <li key={it.id}>
                  <span className="n">{it.n}</span>
                  <span className="t">{it.text}</span>
                  <span className="a">
                    {label ? <strong>{label}</strong> : <span className="muted">Sin respuesta</span>}
                    <button className="linkbtn" onClick={() => go(i)}>Cambiar</button>
                  </span>
                </li>
              );
            })}
          </ul>
          {error && <div style={{ marginTop: "1rem" }}><Notice kind="error">{error}</Notice></div>}
          <div className="actions">
            <button className="btn ghost" onClick={() => go(N - 1)}>← Atrás</button>
            <Button busy={busy} onClick={submit}>{error ? "Reintentar envío" : "Enviar respuestas"}</Button>
          </div>
        </section>
      )}

      {st.step === "done" && (
        <section className="card step" style={{ textAlign: "center" }}>
          <div style={{ display: "grid", placeItems: "center", marginBottom: "0.5rem" }}><Cup pct={100} size="lg" /></div>
          <h2 ref={hRef} tabIndex={-1} style={{ marginTop: 0 }}>Respuesta recibida</h2>
          <p className="muted" style={{ margin: 0 }}>Sus respuestas quedaron registradas. ¡Gracias por su tiempo! Ya puede cerrar esta página.</p>
        </section>
      )}

      {st.step === "ineligible" && (
        <section className="card step">
          <h2 ref={hRef} tabIndex={-1} style={{ marginTop: 0 }}>Gracias por su tiempo</h2>
          <p className="muted" style={{ margin: 0 }}>
            Esta encuesta está dirigida a personas mayores de edad que han consumido productos de Coffee Bike y que aceptan
            participar. No es necesario que continúe.
          </p>
        </section>
      )}
    </div>
  );
}
