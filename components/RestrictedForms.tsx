"use client";
// Entrevista a la dirección y ficha de observación: acceso eligiendo el nombre y escribiendo el código.
import { useCallback, useEffect, useRef, useState } from "react";
import { INTERVIEW, OBSERVATION, OBS_OPTIONS, type Question } from "@/lib/instruments";
import { Button, Notice, PersonalFields, getJson, postJson, store, uuid, type PersonalValues } from "./ui";

// ---------- Acceso ----------

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export function AccessGate({ instrument, people }: { instrument: "entrevista" | "observacion"; people: { id: string; label: string }[] }) {
  const remembered = `acceso-${instrument}`;
  const [person, setPerson] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Recordar en este dispositivo quién fue la última persona (solo el id de su acceso, nunca el código).
  useEffect(() => {
    const last = store.get<string>(remembered);
    if (last && people.some((p) => p.id === last)) setPerson(last);
  }, [people, remembered]);

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    if (!person || !code.trim()) return;
    setBusy(true);
    setError(null);
    const r = await postJson<{ instrument?: string }>("/api/acceso", { id: person, code });
    setBusy(false);
    if (r.ok && r.data.instrument === instrument) {
      store.set(remembered, person);
      return location.reload();
    }
    setError(r.data.error ?? "No se pudo ingresar.");
  }

  return (
    <form className="card step" onSubmit={enter}>
      <p className="eyebrow">Acceso del equipo</p>
      <h1 style={{ fontSize: "1.5rem" }}>{instrument === "entrevista" ? "Entrevista a la dirección" : "Ficha de observación virtual"}</h1>
      <p className="muted">
        Elija su nombre y escriba el código que le entregó el equipo investigador. La sesión queda abierta en este dispositivo y sus
        avances se guardan solos.
      </p>
      {people.length === 0 ? (
        <Notice>Aún no hay personas con acceso a este formulario. Pida al equipo investigador que le habilite.</Notice>
      ) : (
        <>
          <fieldset style={{ marginTop: "1.25rem" }}>
            <legend>¿Quién es usted?</legend>
            <div className="people">
              {people.map((p) => (
                <label className="opt person" key={p.id}>
                  <input
                    type="radio"
                    name="person"
                    checked={person === p.id}
                    onChange={() => {
                      setPerson(p.id);
                      setError(null);
                      requestAnimationFrame(() => codeRef.current?.focus());
                    }}
                  />
                  <span className="avatar" aria-hidden>{initials(p.label)}</span>
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field" style={{ marginTop: "1.25rem", maxWidth: "20rem" }}>
            <label htmlFor="code">Código de acceso</label>
            <input
              ref={codeRef}
              id="code"
              className="code-input"
              type="text"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder="XXXX-XXXX"
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error && <Notice kind="error">{error}</Notice>}
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <Button busy={busy} type="submit" disabled={!person || !code.trim()}>Ingresar</Button>
          </div>
        </>
      )}
    </form>
  );
}

export function LogoutButton({ name }: { name: string }) {
  return (
    <div className="row" style={{ gap: "0.5rem" }}>
      <span className="avatar" aria-hidden>{initials(name)}</span>
      <span className="small" style={{ fontWeight: 600 }}>{name}</span>
      <button
        className="btn ghost small"
        onClick={async () => {
          await fetch("/api/acceso", { method: "DELETE" });
          location.reload();
        }}
      >
        Salir
      </button>
    </div>
  );
}

// ---------- Fotografías ----------

type Photo = { id: string; item: string; size: number };
const MAX = 5 * 1024 * 1024;

/** Reduce a ≤ 2000 px y JPEG cuando hace falta (también convierte HEIC de iPhone si el navegador lo decodifica). */
async function compress(file: File): Promise<Blob> {
  const fine = ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 1.5 * 1024 * 1024;
  if (fine) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("compresión"))), "image/jpeg", 0.82));
}

function Photos({ item, photos, setPhotos, ensureSaved, submissionId, disabled }: {
  item: string; photos: Photo[]; setPhotos: (f: (p: Photo[]) => Photo[]) => void;
  ensureSaved: () => Promise<boolean>; submissionId: string; disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = photos.filter((p) => p.item === item);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const blob = await compress(file).catch(() => null);
      if (!blob) return setError("No se pudo leer la imagen. Use JPEG, PNG o WebP.");
      if (blob.size > MAX) return setError("La imagen supera 5 MB incluso después de comprimirla.");
      if (!(await ensureSaved())) return setError("Guarde el formulario (revise la conexión) antes de adjuntar.");
      const fd = new FormData();
      fd.append("submissionId", submissionId);
      fd.append("item", item);
      fd.append("file", blob, "foto");
      const r = await fetch("/api/evidencia", { method: "POST", body: fd }).catch(() => null);
      const data: { id?: string; size?: number; error?: string } = r ? ((await r.json().catch(() => ({}))) as { id?: string; size?: number; error?: string }) : { error: "Sin conexión." };
      if (!r?.ok) return setError(data.error ?? "No se pudo subir la imagen.");
      setPhotos((p) => [...p, { id: data.id!, item, size: data.size ?? 0 }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor={`f-${item}`}>
        Fotografías <span className="hint">JPEG, PNG o WebP; se comprimen antes de enviarse (máx. 5 MB).</span>
      </label>
      {mine.length > 0 && (
        <ul className="small">
          {mine.map((p) => (
            <li key={p.id} className="row">
              <a href={`/api/evidencia/${p.id}`} target="_blank" rel="noopener">Ver imagen ({Math.round(p.size / 1024)} KB)</a>
              {!disabled && (
                <button
                  className="linkbtn"
                  onClick={async () => {
                    const r = await fetch(`/api/evidencia/${p.id}`, { method: "DELETE" }).catch(() => null);
                    if (r?.ok) setPhotos((ps) => ps.filter((x) => x.id !== p.id));
                  }}
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <input
          id={`f-${item}`}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) upload(f);
          }}
        />
      )}
      {busy && <p className="small muted" role="status">Subiendo…</p>}
      {error && <Notice kind="error">{error}</Notice>}
    </div>
  );
}

// ---------- Borrador con guardado automático ----------

type Sel = { values?: string[]; value?: string; other?: string; note?: string; url?: string; date?: string };
type Answers = Record<string, Sel>;
type Meta = { reviewDate?: string; synthesis?: Record<string, string> };
type Loaded = { id: string; status: string; answers: Answers; meta: Meta; photos: Photo[] };

function fromServer(d: { id: string; status: string; meta: Meta | null; answers: { item: string; value: string | null; text: string | null }[]; evidence: { id: string; item: string; kind: string; text: string | null; url: string | null; material_date: string | null; size: number }[] }, multi: boolean): Loaded {
  const answers: Answers = {};
  for (const a of d.answers) {
    if (!a.value) continue;
    const s = (answers[a.item] ??= {});
    if (multi) s.values = [...(s.values ?? []), a.value];
    else s.value = a.value;
    if (a.text) s.other = a.text;
  }
  for (const e of d.evidence.filter((e) => e.kind === "nota")) Object.assign((answers[e.item] ??= {}), { note: e.text ?? "", url: e.url ?? "", date: e.material_date ?? "" });
  return { id: d.id, status: d.status, answers, meta: d.meta ?? {}, photos: d.evidence.filter((e) => e.kind === "foto").map((e) => ({ id: e.id, item: e.item, size: e.size })) };
}

function useDraft(initial: Loaded) {
  const [answers, setAnswers] = useState<Answers>(initial.answers);
  const [meta, setMeta] = useState<Meta>(initial.meta);
  const [photos, setPhotos] = useState<Photo[]>(initial.photos);
  const [personal, setPersonal] = useState<PersonalValues>({});
  const [status, setStatus] = useState(initial.status);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(initial.status === "nuevo" ? "idle" : "saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);
  const latest = useRef({ answers, meta });
  latest.current = { answers, meta };

  const save = useCallback(async () => {
    setSaveState("saving");
    const r = await postJson("/api/formulario", { action: "save", id: initial.id, ...latest.current });
    if (r.ok) {
      dirty.current = false;
      setSaveState("saved");
      setSaveError(null);
    } else {
      setSaveState("error");
      setSaveError(r.data.error ?? null);
    }
    return r.ok;
  }, [initial.id]);

  useEffect(() => {
    if (!dirty.current || status !== "borrador") return;
    const t = setTimeout(save, 1500);
    return () => clearTimeout(t);
  }, [answers, meta, save, status]);

  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    dirty.current = true;
    if (status === "nuevo") setStatus("borrador");
    setter(v);
  };

  async function submit() {
    setBusy(true);
    setError(null);
    const r = await postJson<{ status?: string }>("/api/formulario", { action: "submit", id: initial.id, ...latest.current, personal });
    setBusy(false);
    if (r.ok) setStatus(r.data.status ?? "completo");
    else setError(r.data.error ?? "No se pudo enviar.");
  }

  // Las fotos necesitan que el registro exista en D1.
  const ensureSaved = async () => {
    if (status === "borrador" && !dirty.current && saveState === "saved") return true;
    const ok = await save();
    if (ok && status === "nuevo") setStatus("borrador");
    return ok;
  };

  return { answers, setAnswers: edit(setAnswers), meta, setMeta: edit(setMeta), photos, setPhotos, personal, setPersonal, status, saveState, saveError, busy, error, submit, ensureSaved };
}

function SaveState({ state, error }: { state: string; error: string | null }) {
  const text =
    state === "saving" ? "Guardando…" : state === "saved" ? "Guardado automáticamente" : state === "error" ? error ?? "Sin conexión: se reintentará" : "Se guarda solo mientras trabaja";
  return (
    <span className={`save-state ${state}`} role="status" aria-live="polite">
      <span className="dot" aria-hidden />
      {text}
    </span>
  );
}

/** Barra fija inferior: avance, estado del guardado y envío siempre a mano. */
function StickyBar({ done, total, unit, d, label }: { done: number; total: number; unit: string; d: ReturnType<typeof useDraft>; label: string }) {
  return (
    <div className="sticky-bar">
      <div className="info">
        <p>
          <strong>{done} de {total}</strong> {unit}
        </p>
        <SaveState state={d.saveState} error={d.saveError} />
        <div className="progressbar" aria-hidden>
          <span style={{ transform: `scaleX(${done / total})` }} />
        </div>
      </div>
      <Button busy={d.busy} onClick={d.submit}>{d.error ? "Reintentar" : label}</Button>
    </div>
  );
}

function NoteFields({ id, sel, set, withDate, disabled }: { id: string; sel: Sel; set: (s: Sel) => void; withDate?: boolean; disabled: boolean }) {
  return (
    <>
      <div className="field">
        <label htmlFor={`n-${id}`}>{withDate ? "Evidencia escrita" : "Referencia"}</label>
        <textarea id={`n-${id}`} maxLength={2000} disabled={disabled} value={sel.note ?? ""} onChange={(e) => set({ ...sel, note: e.target.value })} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor={`u-${id}`}>Enlace</label>
          <input id={`u-${id}`} type="url" inputMode="url" placeholder="https://" maxLength={500} disabled={disabled} value={sel.url ?? ""} onChange={(e) => set({ ...sel, url: e.target.value })} />
        </div>
        {withDate && (
          <div className="field">
            <label htmlFor={`d-${id}`}>Fecha del material</label>
            <input id={`d-${id}`} type="date" disabled={disabled} value={sel.date ?? ""} onChange={(e) => set({ ...sel, date: e.target.value })} />
          </div>
        )}
      </div>
    </>
  );
}

function Submitted({ status, onBack }: { status: string; onBack?: () => void }) {
  return (
    <section className="card step" style={{ textAlign: "center" }}>
      <div className="hero-icon" style={{ margin: "0 auto 1rem" }} aria-hidden>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h2 style={{ marginTop: 0 }}>Respuesta recibida</h2>
      <p className="muted">El registro quedó guardado como {status === "completo" ? "completo" : "incompleto"}. ¡Gracias!</p>
      {onBack && <button className="btn secondary" onClick={onBack}>Volver a mis fichas</button>}
    </section>
  );
}

/** Encabezado de pregunta dentro de su tarjeta. */
function QHead({ label, children, badge, hint }: { label: string; children: React.ReactNode; badge?: React.ReactNode; hint?: string }) {
  return (
    <legend className="qhead">
      <span className="qhead-row">
        <span>
          <span className="statement-num">{label}</span>
          <span className="qtext">{children}</span>
        </span>
        {badge}
      </span>
      {hint && <span className="hint">{hint}</span>}
    </legend>
  );
}

// ---------- Entrevista ----------

function toggle(q: Question, sel: Sel, value: string): Sel {
  const opt = q.options.find((o) => o.value === value)!;
  if (q.type === "single") return { ...sel, values: [value] };
  const cur = sel.values ?? [];
  if (cur.includes(value)) return { ...sel, values: cur.filter((v) => v !== value) };
  // Exclusión automática: una opción de ausencia/«No sabe» desmarca las demás, y viceversa.
  const kept = opt.exclusive ? [] : cur.filter((v) => !q.options.find((o) => o.value === v)?.exclusive);
  return { ...sel, values: [...kept, value] };
}

export function InterviewForm() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const list = await getJson("/api/formulario");
        const first = list.items?.[0];
        if (!first) return setLoaded({ id: uuid(), status: "nuevo", answers: {}, meta: {}, photos: [] });
        const d = await getJson(`/api/formulario?id=${first.id}`);
        setLoaded(fromServer(d, true));
      } catch {
        setLoadError(true);
      }
    })();
  }, []);
  if (loadError) return <Notice kind="error">No se pudo cargar el formulario. Revise la conexión y recargue la página.</Notice>;
  if (!loaded) return <p className="muted" role="status">Cargando…</p>;
  return <InterviewBody initial={loaded} />;
}

function InterviewBody({ initial }: { initial: Loaded }) {
  const d = useDraft(initial);
  if (d.status === "completo" || d.status === "incompleto") return <Submitted status={d.status} />;
  const total = INTERVIEW.questions.length;
  const answered = INTERVIEW.questions.filter((q) => d.answers[q.id]?.values?.length).length;
  return (
    <div className="step">
      <div className="card">
        <p className="eyebrow">Entrevista estructurada · {total} preguntas</p>
        <h1 style={{ fontSize: "1.5rem" }}>{INTERVIEW.title}</h1>
        <p className="muted">{INTERVIEW.objective}</p>
        <details>
          <summary>Indicaciones de registro y materiales solicitados</summary>
          <p className="small">{INTERVIEW.note}</p>
          <p className="small" style={{ margin: 0 }}>{INTERVIEW.materials}</p>
        </details>
      </div>
      <div className="card">
        <PersonalFields
          value={d.personal}
          onChange={d.setPersonal}
          purpose="Finalidad: identificar a la persona entrevistada en el registro académico. Son opcionales, se envían solo al final, se guardan separados de las respuestas y solo el equipo investigador puede consultarlos."
        />
      </div>
      {INTERVIEW.questions.map((q) => {
        const sel = d.answers[q.id] ?? {};
        const set = (s: Sel) => d.setAnswers({ ...d.answers, [q.id]: s });
        const otherSelected = q.options.some((o) => o.other && sel.values?.includes(o.value));
        return (
          <fieldset className="card" key={q.id}>
            <QHead
              label={`Pregunta ${q.n} de ${total}`}
              badge={sel.values?.length ? <span className="tag ok">Respondida</span> : null}
              hint={q.type === "single" ? "Elija una opción" : "Marque todas las que correspondan"}
            >
              {q.text}
            </QHead>
            <div className="options">
              {q.options.map((o) => (
                <label className="opt" key={o.value}>
                  <input type={q.type === "single" ? "radio" : "checkbox"} name={q.id} checked={!!sel.values?.includes(o.value)} onChange={() => set(toggle(q, sel, o.value))} />
                  {o.label}
                </label>
              ))}
            </div>
            {otherSelected && (
              <div className="field" style={{ marginTop: "0.75rem" }}>
                <label htmlFor={`o-${q.id}`}>Especifique «{q.options.find((o) => o.other)!.label}»</label>
                <input id={`o-${q.id}`} type="text" maxLength={300} value={sel.other ?? ""} onChange={(e) => set({ ...sel, other: e.target.value })} />
              </div>
            )}
            {sel.values?.length ? <button className="linkbtn" onClick={() => set({ ...sel, values: [] })}>Quitar selección</button> : null}
            <details>
              <summary>Referencias y evidencias (opcional)</summary>
              <NoteFields id={q.id} sel={sel} set={set} disabled={false} />
              <Photos item={q.id} photos={d.photos} setPhotos={d.setPhotos} ensureSaved={d.ensureSaved} submissionId={initial.id} disabled={false} />
            </details>
          </fieldset>
        );
      })}
      {answered < total && <p className="small muted" style={{ marginTop: "1rem" }}>Puede enviar con preguntas sin responder; el registro quedará como incompleto.</p>}
      {d.error && <div style={{ marginTop: "1rem" }}><Notice kind="error">{d.error}</Notice></div>}
      <StickyBar done={answered} total={total} unit="respondidas" d={d} label="Enviar entrevista" />
    </div>
  );
}

// ---------- Observación ----------

type Listed = { id: string; status: string; created_at: string; submitted_at: string | null; meta: Meta | null };
const LIST_LABEL: Record<string, string> = { borrador: "En progreso", completo: "Enviada", incompleto: "Enviada incompleta" };

export function ObservationApp({ observer }: { observer: string }) {
  const [list, setList] = useState<Listed[] | null>(null);
  const [open, setOpen] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => {
    getJson("/api/formulario").then((d) => setList(d.items ?? [])).catch(() => setError(true));
  }, []);
  useEffect(refresh, [refresh]);
  const back = () => {
    setOpen(null);
    refresh();
    window.scrollTo({ top: 0 });
  };

  if (open)
    return (
      <div>
        <button className="btn ghost small" style={{ marginBottom: "0.75rem" }} onClick={back}>← Mis fichas</button>
        <ObservationBody key={open.id} initial={open} observer={observer} onBack={back} />
      </div>
    );
  if (error) return <Notice kind="error">No se pudo cargar. Revise la conexión y recargue la página.</Notice>;
  if (!list) return <p className="muted" role="status">Cargando…</p>;
  return (
    <section className="card step">
      <div className="card-title">
        <div>
          <p className="eyebrow">Ficha de observación virtual</p>
          <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Mis fichas</h1>
        </div>
        <Button onClick={() => setOpen({ id: uuid(), status: "nuevo", answers: {}, meta: {}, photos: [] })}>+ Nueva ficha</Button>
      </div>
      {list.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>Aún no tiene fichas. Cree la primera: se guarda sola mientras trabaja y puede continuarla otro día.</p>
      ) : (
        <ul className="review-list">
          {list.map((it) => (
            <li key={it.id} style={{ alignItems: "center" }}>
              <span className="t">
                <strong>Revisión {it.meta?.reviewDate ?? "sin fecha"}</strong>
                <br />
                <span className="small muted">Creada el {it.created_at.slice(0, 10)}</span>
              </span>
              <span className={`tag ${it.status === "borrador" ? "accent" : "ok"}`}>{LIST_LABEL[it.status] ?? it.status}</span>
              <button
                className="btn secondary small"
                onClick={async () => {
                  const d = await getJson(`/api/formulario?id=${it.id}`).catch(() => null);
                  if (d?.id) setOpen(fromServer(d, false));
                }}
              >
                {it.status === "borrador" ? "Continuar" : "Ver"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ObservationBody({ initial, observer, onBack }: { initial: Loaded; observer: string; onBack: () => void }) {
  const d = useDraft(initial);
  const sent = d.status === "completo" || d.status === "incompleto";
  const total = OBSERVATION.criteria.length;
  const answered = OBSERVATION.criteria.filter((c) => d.answers[c.id]?.value).length;
  if (sent && initial.status !== "completo" && initial.status !== "incompleto") return <Submitted status={d.status} onBack={onBack} />;
  return (
    <div className="step">
      {sent && <div style={{ marginBottom: "1rem" }}><Notice kind="ok">Ficha enviada. Se muestra en solo lectura.</Notice></div>}
      <div className="card">
        <p className="eyebrow">Ficha de observación · {total} criterios</p>
        <h1 style={{ fontSize: "1.5rem" }}>{OBSERVATION.title}</h1>
        <p className="muted">{OBSERVATION.objective}</p>
        <details>
          <summary>Cómo registrar C, P, NC y NV</summary>
          <p className="small" style={{ margin: 0 }}>{OBSERVATION.rule}</p>
        </details>
        <div className="grid2" style={{ marginTop: "1.25rem" }}>
          <div className="field">
            <label htmlFor="rev">Fecha de revisión</label>
            <input id="rev" type="date" disabled={sent} value={d.meta.reviewDate ?? ""} onChange={(e) => d.setMeta({ ...d.meta, reviewDate: e.target.value })} />
          </div>
          <div className="field">
            <label>Observador</label>
            <div className="row" style={{ minHeight: 46 }}>
              <span className="avatar" aria-hidden>{initials(observer)}</span>
              {observer}
            </div>
          </div>
        </div>
      </div>
      {!sent && (
        <div className="card">
          <PersonalFields
            value={d.personal}
            onChange={d.setPersonal}
            purpose="Finalidad: identificar a quien registra la ficha, como figura en el instrumento. Son opcionales, se envían solo al final y se guardan separados de los registros."
          />
        </div>
      )}
      {OBSERVATION.criteria.map((c) => {
        const sel = d.answers[c.id] ?? {};
        const set = (s: Sel) => d.setAnswers({ ...d.answers, [c.id]: s });
        return (
          <fieldset className="card" key={c.id}>
            <QHead label={`Criterio ${c.n} de ${total}`} badge={sel.value ? <span className="tag ok">{sel.value}</span> : null}>
              {c.title}: <span style={{ fontWeight: 500 }}>{c.text}</span>
            </QHead>
            <div className="options inline">
              {OBS_OPTIONS.map((o) => (
                <label className="opt" key={o.value}>
                  <input type="radio" name={c.id} disabled={sent} checked={sel.value === o.value} onChange={() => set({ ...sel, value: o.value })} />
                  <span><strong>{o.value}</strong> · {o.label}</span>
                </label>
              ))}
            </div>
            <details open={!!(sel.note || sel.url || sel.date)}>
              <summary>Evidencia, enlace y fotografía</summary>
              <NoteFields id={c.id} sel={sel} set={set} withDate disabled={sent} />
              <Photos item={c.id} photos={d.photos} setPhotos={d.setPhotos} ensureSaved={d.ensureSaved} submissionId={initial.id} disabled={sent} />
            </details>
          </fieldset>
        );
      })}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Síntesis</h2>
        <p className="small muted">{OBSERVATION.synthesisNote}</p>
        {OBSERVATION.synthesis.map((s) => (
          <div className="field" key={s.key}>
            <label htmlFor={`s-${s.key}`}>{s.label}</label>
            <textarea id={`s-${s.key}`} maxLength={4000} disabled={sent} value={d.meta.synthesis?.[s.key] ?? ""} onChange={(e) => d.setMeta({ ...d.meta, synthesis: { ...d.meta.synthesis, [s.key]: e.target.value } })} />
          </div>
        ))}
      </div>
      {!sent && (
        <>
          {d.error && <div style={{ marginTop: "1rem" }}><Notice kind="error">{d.error}</Notice></div>}
          <StickyBar done={answered} total={total} unit="criterios" d={d} label="Enviar ficha" />
        </>
      )}
    </div>
  );
}
