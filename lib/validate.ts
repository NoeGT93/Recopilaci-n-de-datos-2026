// Validación en servidor de todo lo que envía un formulario. Devuelve filas listas para D1 o lanza
// ValidationError con un mensaje seguro (sin eco de datos personales).
import { SCALE, SURVEY, INTERVIEW, OBSERVATION, OBS_OPTIONS } from "./instruments.ts";

export class ValidationError extends Error {}

export type AnswerRow = { item: string; value: string | null; num: number | null; text: string | null };
export type NoteRow = { item: string; text: string | null; url: string | null; material_date: string | null };
export type Personal = { name: string | null; age: number | null; sex: string | null; education: string | null; job: string | null };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function str(v: unknown, max: number, field: string): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw new ValidationError(`Formato inválido en ${field}.`);
  const s = v.trim();
  if (!s) return null;
  if (s.length > max) throw new ValidationError(`${field}: máximo ${max} caracteres.`);
  return s;
}

function url(v: unknown, field: string): string | null {
  const s = str(v, 500, field);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
  } catch {}
  throw new ValidationError(`${field}: el enlace debe comenzar con http:// o https://.`);
}

export function isoDate(v: unknown, field: string): string | null {
  const s = str(v, 10, field);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new ValidationError(`${field}: fecha inválida.`);
  return s;
}

export function parsePersonal(v: unknown): Personal | null {
  if (!isObj(v)) return null;
  let age: number | null = null;
  if (v.age !== undefined && v.age !== null && v.age !== "") {
    age = Number(v.age);
    if (!Number.isInteger(age) || age < 0 || age > 120) throw new ValidationError("Edad: escriba un número entre 0 y 120.");
  }
  const p = {
    name: str(v.name, 100, "Nombre"),
    age,
    sex: str(v.sex, 100, "Sexo"),
    education: str(v.education, 100, "Nivel educativo"),
    job: str(v.job, 100, "Puesto de trabajo"),
  };
  return Object.values(p).some((x) => x !== null) ? p : null;
}

export function parseChannel(v: unknown): string {
  return typeof v === "string" && /^[a-z0-9-]{1,30}$/.test(v) ? v : "directo";
}

// ---------- Encuesta ----------

/** Una fila por ítem; los no respondidos quedan con value/num NULL (nunca 0). */
export function parseSurvey(v: unknown): { rows: AnswerRow[]; answered: number } {
  const a = isObj(v) ? v : {};
  let answered = 0;
  const rows = SURVEY.items.map(({ id }) => {
    const raw = a[id];
    if (raw === undefined || raw === null || raw === "") return { item: id, value: null, num: null, text: null };
    const opt = SCALE.find((s) => s.value === raw);
    if (!opt) throw new ValidationError(`Ítem ${id.slice(1)}: opción inválida.`);
    answered++;
    return { item: id, value: opt.value, num: opt.num, text: null };
  });
  return { rows, answered };
}

// ---------- Entrevista ----------

type Sel = { values?: unknown; other?: unknown; note?: unknown; url?: unknown };

export function parseInterview(v: unknown): { rows: AnswerRow[]; notes: NoteRow[]; answered: number } {
  const a = isObj(v) ? v : {};
  const rows: AnswerRow[] = [];
  const notes: NoteRow[] = [];
  let answered = 0;
  for (const q of INTERVIEW.questions) {
    const sel = (isObj(a[q.id]) ? a[q.id] : {}) as Sel;
    const values = Array.isArray(sel.values) ? [...new Set(sel.values)] : [];
    const opts = values.map((val) => {
      const opt = q.options.find((o) => o.value === val);
      if (!opt) throw new ValidationError(`Pregunta ${q.n}: opción inválida.`);
      return opt;
    });
    if (q.type === "single" && opts.length > 1) throw new ValidationError(`Pregunta ${q.n}: seleccione una sola opción.`);
    if (opts.some((o) => o.exclusive) && opts.length > 1)
      throw new ValidationError(`Pregunta ${q.n}: «${opts.find((o) => o.exclusive)!.label}» no puede combinarse con otras opciones.`);
    const other = str(sel.other, 300, `Pregunta ${q.n} (texto de «Otra»)`);
    for (const opt of opts) {
      if (opt.other && !other) throw new ValidationError(`Pregunta ${q.n}: especifique «${opt.label}».`);
      rows.push({ item: q.id, value: opt.value, num: null, text: opt.other ? other : null });
    }
    if (opts.length) answered++;
    else rows.push({ item: q.id, value: null, num: null, text: null });
    const note = str(sel.note, 2000, `Pregunta ${q.n} (referencia)`);
    const link = url(sel.url, `Pregunta ${q.n} (enlace)`);
    if (note || link) notes.push({ item: q.id, text: note, url: link, material_date: null });
  }
  return { rows, notes, answered };
}

// ---------- Observación ----------

export function parseObservation(v: unknown): { rows: AnswerRow[]; notes: NoteRow[]; answered: number } {
  const a = isObj(v) ? v : {};
  const rows: AnswerRow[] = [];
  const notes: NoteRow[] = [];
  let answered = 0;
  for (const c of OBSERVATION.criteria) {
    const sel = (isObj(a[c.id]) ? a[c.id] : {}) as Sel & { value?: unknown; date?: unknown };
    let value: string | null = null;
    if (sel.value !== undefined && sel.value !== null && sel.value !== "") {
      if (!OBS_OPTIONS.some((o) => o.value === sel.value)) throw new ValidationError(`Criterio ${c.n}: opción inválida.`);
      value = sel.value as string;
      answered++;
    }
    rows.push({ item: c.id, value, num: null, text: null });
    const note = str(sel.note, 2000, `Criterio ${c.n} (evidencia)`);
    const link = url(sel.url, `Criterio ${c.n} (enlace)`);
    const date = isoDate(sel.date, `Criterio ${c.n} (fecha del material)`);
    if (note || link || date) notes.push({ item: c.id, text: note, url: link, material_date: date });
  }
  return { rows, notes, answered };
}

export function parseObservationMeta(v: unknown): { reviewDate: string | null; synthesis: Record<string, string | null> } {
  const m = isObj(v) ? v : {};
  const s = isObj(m.synthesis) ? m.synthesis : {};
  return {
    reviewDate: isoDate(m.reviewDate, "Fecha de revisión"),
    synthesis: Object.fromEntries(OBSERVATION.synthesis.map(({ key, label }) => [key, str(s[key], 4000, label)])),
  };
}
