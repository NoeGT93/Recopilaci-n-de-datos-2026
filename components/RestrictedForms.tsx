"use client";
// Entrevista a la dirección y ficha de observación (acceso por invitación).
import { useCallback, useEffect, useRef, useState } from "react";
import { INTERVIEW, OBSERVATION, OBS_OPTIONS, type Question } from "@/lib/instruments";
import { Button, Notice, PersonalFields, getJson, postJson, uuid, type PersonalValues } from "./ui";

// ---------- Acceso por invitación ----------

/** El enlace de invitación trae el código en el fragmento (#acceso=…): no viaja al servidor ni a registros. */
export function AccessGate({ instrument }: { instrument: "entrevista" | "observacion" }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enter = useCallback(
    async (token: string) => {
      setBusy(true);
      setError(null);
      const r = await postJson<{ instrument?: string }>("/api/acceso", { token });
      setBusy(false);
      // Recarga completa sin el fragmento: el código no queda en la barra ni en el historial.
      if (r.ok && r.data.instrument === instrument) return location.replace(location.pathname);
      history.replaceState(history.state, "", location.pathname);
      setError(r.ok ? "Esta invitación corresponde a otro instrumento." : r.data.error ?? "No se pudo validar la invitación.");
    },
    [instrument],
  );

  useEffect(() => {
    const t = new URLSearchParams(location.hash.slice(1)).get("acceso");
    if (t) enter(t);
  }, [enter]);

  return (
    <section className="stack">
      <h2>Acceso restringido</h2>
      <p>Este formulario requiere una invitación vigente. Abra el enlace que recibió o escriba el código de acceso.</p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) enter(code.trim());
        }}
      >
        <div className="field">
          <label htmlFor="code">Código de acceso</label>
          <input id="code" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        <Button busy={busy} type="submit">Ingresar</Button>
      </form>
    </section>
  );
}

export function LogoutButton() {
  return (
    <button
      className="linkbtn"
      onClick={async () => {
        await fetch("/api/acceso", { method: "DELETE" });
        location.reload();
      }}
    >
      Cerrar sesión
    </button>
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

function SaveIndicator({ state, error }: { state: string; error: string | null }) {
  const text = state === "saving" ? "Guardando…" : state === "saved" ? "Borrador guardado" : state === "error" ? error ?? "No se pudo guardar; los cambios siguen en pantalla y se reintentará." : "";
  return <p className={`small ${state === "error" ? "" : "muted"}`} role="status" aria-live="polite">{text}</p>;
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

function Submitted({ status }: { status: string }) {
  return (
    <section className="step stack">
      <h2>Respuesta recibida</h2>
      <Notice kind="ok">El registro quedó guardado como {status === "completo" ? "completo" : "incompleto"}. Gracias.</Notice>
    </section>
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
  const done = d.status !== "nuevo" && d.status !== "borrador";
  const answered = INTERVIEW.questions.filter((q) => d.answers[q.id]?.values?.length).length;
  return (
    <div className="step">
      <p>{INTERVIEW.objective}</p>
      <Notice>{INTERVIEW.note}</Notice>
      <p className="small muted" style={{ marginTop: "1rem" }}>{INTERVIEW.materials}</p>
      <div className="section">
        <PersonalFields value={d.personal} onChange={d.setPersonal} purpose="Finalidad: identificar a la persona entrevistada en el registro académico. Son opcionales, se envían solo al final, se guardan separados de las respuestas y solo el equipo investigador puede consultarlos." />
      </div>
      {INTERVIEW.questions.map((q) => {
        const sel = d.answers[q.id] ?? {};
        const set = (s: Sel) => d.setAnswers({ ...d.answers, [q.id]: s });
        const otherSelected = q.options.some((o) => o.other && sel.values?.includes(o.value));
        return (
          <fieldset className="item" key={q.id}>
            <legend>
              <span className="num">{q.n}.</span>
              {q.text} <span className="hint">({q.type === "single" ? "Selección única" : "Selección múltiple"})</span>
            </legend>
            <div className="options">
              {q.options.map((o) => (
                <label className="opt" key={o.value}>
                  <input
                    type={q.type === "single" ? "radio" : "checkbox"}
                    name={q.id}
                    checked={!!sel.values?.includes(o.value)}
                    onChange={() => set(toggle(q, sel, o.value))}
                    disabled={done}
                  />
                  {o.label}
                </label>
              ))}
            </div>
            {otherSelected && (
              <div className="field" style={{ marginTop: "0.6rem" }}>
                <label htmlFor={`o-${q.id}`}>Especifique «{q.options.find((o) => o.other)!.label}»</label>
                <input id={`o-${q.id}`} type="text" maxLength={300} value={sel.other ?? ""} onChange={(e) => set({ ...sel, other: e.target.value })} />
              </div>
            )}
            {sel.values?.length ? (
              <button className="linkbtn" onClick={() => set({ ...sel, values: [] })}>Quitar selección</button>
            ) : null}
            <details>
              <summary>Referencias y evidencias (opcional)</summary>
              <NoteFields id={q.id} sel={sel} set={set} disabled={done} />
              <Photos item={q.id} photos={d.photos} setPhotos={d.setPhotos} ensureSaved={d.ensureSaved} submissionId={initial.id} disabled={done} />
            </details>
          </fieldset>
        );
      })}
      <div className="section stack">
        <SaveIndicator state={d.saveState} error={d.saveError} />
        <p>
          Respondió {answered} de {INTERVIEW.questions.length} preguntas.
          {answered < INTERVIEW.questions.length && " Puede enviar con preguntas sin responder; el registro quedará como incompleto."}
        </p>
        {d.error && <Notice kind="error">{d.error}</Notice>}
        <Button busy={d.busy} onClick={d.submit}>{d.error ? "Reintentar envío" : "Enviar entrevista"}</Button>
      </div>
    </div>
  );
}

// ---------- Observación ----------

type Listed = { id: string; status: string; created_at: string; submitted_at: string | null; meta: Meta | null };

export function ObservationApp({ observer }: { observer: string }) {
  const [list, setList] = useState<Listed[] | null>(null);
  const [open, setOpen] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => {
    getJson("/api/formulario").then((d) => setList(d.items ?? [])).catch(() => setError(true));
  }, []);
  useEffect(refresh, [refresh]);

  if (open)
    return (
      <div>
        <button className="linkbtn" onClick={() => { setOpen(null); refresh(); }}>← Volver a mis fichas</button>
        <ObservationBody key={open.id} initial={open} observer={observer} />
      </div>
    );
  if (error) return <Notice kind="error">No se pudo cargar. Revise la conexión y recargue la página.</Notice>;
  if (!list) return <p className="muted" role="status">Cargando…</p>;
  return (
    <section className="stack">
      <div className="row spread">
        <h2 style={{ margin: 0 }}>Mis fichas</h2>
        <Button onClick={() => setOpen({ id: uuid(), status: "nuevo", answers: {}, meta: {}, photos: [] })}>Nueva ficha</Button>
      </div>
      {list.length === 0 ? (
        <p className="muted">Aún no hay fichas registradas con esta invitación.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha de revisión</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {list.map((it) => (
                <tr key={it.id}>
                  <td>{it.meta?.reviewDate ?? "—"}</td>
                  <td>{it.status}</td>
                  <td>
                    <button
                      className="linkbtn"
                      onClick={async () => {
                        const d = await getJson(`/api/formulario?id=${it.id}`).catch(() => null);
                        if (d?.id) setOpen(fromServer(d, false));
                      }}
                    >
                      {it.status === "borrador" ? "Continuar" : "Ver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ObservationBody({ initial, observer }: { initial: Loaded; observer: string }) {
  const d = useDraft(initial);
  const sent = d.status === "completo" || d.status === "incompleto";
  const answered = OBSERVATION.criteria.filter((c) => d.answers[c.id]?.value).length;
  if (sent && initial.status === "nuevo") return <Submitted status={d.status} />;
  return (
    <div className="step">
      {sent && <Notice kind="ok">Ficha enviada ({d.status}). Solo lectura.</Notice>}
      <p style={{ marginTop: "1rem" }}>{OBSERVATION.objective}</p>
      <Notice>{OBSERVATION.rule}</Notice>
      <div className="section grid2">
        <div className="field">
          <label htmlFor="rev">Fecha de revisión</label>
          <input id="rev" type="date" disabled={sent} value={d.meta.reviewDate ?? ""} onChange={(e) => d.setMeta({ ...d.meta, reviewDate: e.target.value })} />
        </div>
        <div className="field">
          <label>Observador</label>
          <p style={{ margin: "0.6rem 0" }}>{observer}</p>
        </div>
      </div>
      {!sent && (
        <PersonalFields value={d.personal} onChange={d.setPersonal} purpose="Finalidad: identificar a quien registra la ficha, como figura en el instrumento. Son opcionales, se envían solo al final y se guardan separados de los registros." />
      )}
      {OBSERVATION.criteria.map((c) => {
        const sel = d.answers[c.id] ?? {};
        const set = (s: Sel) => d.setAnswers({ ...d.answers, [c.id]: s });
        return (
          <fieldset className="item" key={c.id}>
            <legend>
              <span className="num">{c.n}.</span>
              <strong>{c.title}:</strong> {c.text}
            </legend>
            <div className="options inline">
              {OBS_OPTIONS.map((o) => (
                <label className="opt" key={o.value}>
                  <input type="radio" name={c.id} disabled={sent} checked={sel.value === o.value} onChange={() => set({ ...sel, value: o.value })} />
                  {o.value} · {o.label}
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
      <div className="section">
        <h3>Síntesis</h3>
        <p className="small muted">{OBSERVATION.synthesisNote}</p>
        {OBSERVATION.synthesis.map((s) => (
          <div className="field" key={s.key}>
            <label htmlFor={`s-${s.key}`}>{s.label}</label>
            <textarea id={`s-${s.key}`} maxLength={4000} disabled={sent} value={d.meta.synthesis?.[s.key] ?? ""} onChange={(e) => d.setMeta({ ...d.meta, synthesis: { ...d.meta.synthesis, [s.key]: e.target.value } })} />
          </div>
        ))}
      </div>
      {!sent && (
        <div className="section stack">
          <SaveIndicator state={d.saveState} error={d.saveError} />
          <p>Registró {answered} de {OBSERVATION.criteria.length} criterios.</p>
          {d.error && <Notice kind="error">{d.error}</Notice>}
          <Button busy={d.busy} onClick={d.submit}>{d.error ? "Reintentar envío" : "Enviar ficha"}</Button>
        </div>
      )}
    </div>
  );
}
