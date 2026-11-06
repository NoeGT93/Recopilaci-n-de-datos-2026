// Cálculos del panel: conteos, metas, distribuciones, puntajes, correlación e interpretaciones por reglas.
// Puro (sin D1): todo se calcula sobre el mismo conjunto filtrado, así gráficos, denominadores e
// interpretaciones responden siempre al mismo filtro.
import { SCALE, SCORES, SURVEY, INTERVIEW, OBSERVATION, OBS_OPTIONS, type InstrumentCode } from "./instruments.ts";
import { median, spearman, ALPHA, METHOD_VERSION, type SpearmanResult } from "./stats.ts";

export type Answer = { item: string; value: string | null; num: number | null; text: string | null };
export type Rec = {
  id: string;
  status: "borrador" | "completo" | "incompleto" | "no_elegible";
  is_test: number;
  excluded: string | null; // motivo, si está excluido del análisis
  channel: string;
  version: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  answers: Answer[];
};

export type Filters = { from: string | null; to: string | null; channel: string | null; version: string; status: string; includeTest?: boolean };

export const STATUS_FILTERS = [
  ["todos", "Todos los estados"],
  ["validos", "Válidos para análisis"],
  ["completo", "Enviado completo"],
  ["incompleto", "Enviado incompleto"],
  ["no_elegible", "No elegible"],
  ["borrador", "Borrador"],
  ["prueba", "Registro de prueba"],
  ["excluido", "Excluido del análisis"],
] as const;

/** Fecha local de Guatemala (UTC−6, sin horario de verano). */
export const gtDate = (iso: string) => new Date(Date.parse(iso) - 6 * 3600_000).toISOString().slice(0, 10);

export const isSubmitted = (r: Rec) => r.status === "completo" || r.status === "incompleto";
export const isValid = (r: Rec) => isSubmitted(r) && !r.is_test && !r.excluded;

export function applyFilters(recs: Rec[], f: Filters): Rec[] {
  return recs.filter((r) => {
    if (r.version !== f.version) return false;
    const d = gtDate(r.submitted_at ?? r.created_at);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    if (f.channel && r.channel !== f.channel) return false;
    switch (f.status) {
      case "validos": return isValid(r);
      case "prueba": return !!r.is_test;
      case "excluido": return !!r.excluded;
      case "todos": return true;
      default: return r.status === f.status;
    }
  });
}

export function describeFilters(f: Filters): string {
  const parts = [`versión ${f.version}`];
  if (f.from || f.to) parts.push(`fechas ${f.from ?? "inicio"} a ${f.to ?? "hoy"}`);
  if (f.channel) parts.push(`canal «${f.channel}»`);
  parts.push(STATUS_FILTERS.find(([k]) => k === f.status)?.[1].toLowerCase() ?? f.status);
  if (f.includeTest) parts.push("incluye registros de prueba");
  return parts.join(" · ");
}

// ---------- Avance de recolección ----------

export function progress(recs: Rec[], goal: number | null) {
  const received = recs.filter((r) => r.status !== "borrador");
  const valid = recs.filter(isValid).length;
  const byDate = new Map<string, { received: number; valid: number }>();
  for (const r of received) {
    const d = gtDate(r.submitted_at ?? r.created_at);
    const e = byDate.get(d) ?? { received: 0, valid: 0 };
    e.received++;
    if (isValid(r)) e.valid++;
    byDate.set(d, e);
  }
  return {
    received: received.length,
    complete: recs.filter((r) => r.status === "completo").length,
    incomplete: recs.filter((r) => r.status === "incompleto").length,
    ineligible: recs.filter((r) => r.status === "no_elegible").length,
    drafts: recs.filter((r) => r.status === "borrador").length,
    test: recs.filter((r) => r.is_test).length,
    excluded: recs.filter((r) => r.excluded).length,
    valid,
    goal,
    percent: goal ? Math.min(100, (valid / goal) * 100) : null,
    pending: goal === null ? null : Math.max(goal - valid, 0),
    lastUpdate: recs.reduce<string | null>((m, r) => (!m || r.updated_at > m ? r.updated_at : m), null),
    timeline: [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
  };
}

// ---------- Encuesta ----------

const itemNum = (r: Rec, n: number) => r.answers.find((a) => a.item === `i${n}`)?.num ?? null;

/** Puntaje solo si todos sus ítems están respondidos; si falta alguno, null (sin imputación). */
export function score(r: Rec, items: readonly number[]): number | null {
  let sum = 0;
  for (const n of items) {
    const v = itemNum(r, n);
    if (v === null) return null;
    sum += v;
  }
  return sum;
}

export function surveyAnalysis(recs: Rec[]) {
  const valid = recs; // ya seleccionados por analysisSet()
  const items = SURVEY.items.map((it) => {
    const nums = valid.map((r) => itemNum(r, it.n));
    const answered = nums.filter((v): v is number => v !== null);
    return {
      ...it,
      counts: SCALE.map((s) => ({ ...s, count: answered.filter((v) => v === s.num).length })),
      answered: answered.length,
      omitted: nums.length - answered.length,
      median: median(answered),
    };
  });
  const scores = SCORES.map((s) => {
    const values = valid.map((r) => score(r, s.items)).filter((v): v is number => v !== null);
    const dist = new Map<number, number>();
    for (const v of values) dist.set(v, (dist.get(v) ?? 0) + 1);
    return {
      ...s,
      n: values.length,
      missing: valid.length - values.length,
      median: median(values),
      distribution: Array.from({ length: s.max - s.min + 1 }, (_, i) => ({ value: s.min + i, count: dist.get(s.min + i) ?? 0 })),
    };
  });
  const pairs = valid
    .map((r) => [score(r, SCORES[0].items), score(r, SCORES[4].items)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null);
  const correlation = spearman(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
  return { nValid: valid.length, items, scores, pairs: pairs.length, pairPoints: pairs.map((p) => [p[0], p[1]] as [number, number]), excludedFromPairs: valid.length - pairs.length, correlation };
}

// ---------- Entrevista ----------

export function interviewAnalysis(recs: Rec[]) {
  const valid = recs; // ya seleccionados por analysisSet()
  return {
    nValid: valid.length,
    questions: INTERVIEW.questions.map((q) => {
      const respondents = valid.filter((r) => r.answers.some((a) => a.item === q.id && a.value));
      return {
        ...q,
        answered: respondents.length,
        omitted: valid.length - respondents.length,
        counts: q.options.map((o) => ({
          ...o,
          count: respondents.filter((r) => r.answers.some((a) => a.item === q.id && a.value === o.value)).length,
        })),
        otherTexts: valid.flatMap((r) => r.answers.filter((a) => a.item === q.id && a.text).map((a) => a.text!)),
      };
    }),
  };
}

// ---------- Observación ----------

export function observationAnalysis(recs: Rec[]) {
  const valid = recs; // ya seleccionados por analysisSet()
  return {
    nValid: valid.length,
    criteria: OBSERVATION.criteria.map((c) => {
      const values = valid.map((r) => r.answers.find((a) => a.item === c.id)?.value ?? null);
      return {
        ...c,
        counts: OBS_OPTIONS.map((o) => ({ ...o, count: values.filter((v) => v === o.value).length })),
        omitted: values.filter((v) => v === null).length,
      };
    }),
  };
}

// ---------- Interpretaciones por reglas ----------

export type Interpretation = {
  title: string;
  source: "Declarado por clientes" | "Declarado por la dirección" | "Observado";
  text: string;
  basis: string;
  n: number;
  filters: string;
  kind: "descriptivo" | "preliminar" | "final";
  limitations: string[];
};

const fmt = (x: number, d = 2) => x.toLocaleString("es-GT", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtP = (p: number) => (p < 0.001 ? "< 0.001" : fmt(p, 3));

export function correlationText(c: SpearmanResult): string {
  if (!c.estimable) return `No estimable. ${c.reason}`;
  const base = `rho de Spearman = ${fmt(c.rho, 3)}, p = ${fmtP(c.p)} (bilateral), con ${c.n} pares completos.`;
  if (c.p >= ALPHA)
    return `${base} Como p ≥ ${ALPHA}, no se rechaza H0. Esto no demuestra ausencia de relación; los datos disponibles no permiten afirmarla con α = ${ALPHA}.`;
  if (c.rho > 0)
    return `${base} Rho positivo y p < ${ALPHA}: evidencia favorable a Hi (asociación positiva entre imagen corporativa y reconocimiento declarado).`;
  return `${base} Rho negativo y p < ${ALPHA}: asociación contraria a lo planteado en Hi.`;
}

export function surveyInterpretations(a: ReturnType<typeof surveyAnalysis>, f: Filters, final: boolean): Interpretation[] {
  const filters = describeFilters(f);
  const common = [
    ...(f.includeTest || f.status === "prueba" ? ["Incluye registros de prueba (pilotaje): no usar como resultado de la investigación."] : []),
    "Mide percepciones declaradas, no reconocimiento objetivo ni aciertos de una prueba visual.",
    "La muestra no es probabilística: los resultados no representan a toda la población de Quetzaltenango.",
    "La difusión voluntaria puede concentrar respuestas favorables.",
  ];
  const out: Interpretation[] = a.scores.map((s) => ({
    title: s.label,
    source: "Declarado por clientes",
    text:
      s.n === 0
        ? `No hay registros válidos con los ${s.items.length} ítems de ${s.label.toLowerCase()} respondidos.`
        : `Mediana ${fmt(s.median!, 1)} en un rango posible de ${s.min} a ${s.max} puntos (${s.n} registros con todos sus ítems respondidos; ${s.missing} sin puntaje por omisiones). Un puntaje mayor expresa ${s.key === "reconocimiento" ? "una mayor capacidad declarada de reconocimiento" : "una valoración más favorable de la imagen"}.`,
    basis: `Suma de los ítems ${s.items[0]}–${s.items[s.items.length - 1]} (Excelente = 4 … Necesita mejorar = 1), sin imputación.`,
    n: s.n,
    filters,
    kind: final ? "final" : "descriptivo",
    limitations: [
      ...common,
      "No se usan categorías bajo/medio/alto: no hay puntos de corte justificados.",
      ...(final ? [] : ["Descripción preliminar: cambia mientras la recolección siga abierta."]),
    ],
  }));
  out.push({
    title: "Contraste de hipótesis (Spearman)",
    source: "Declarado por clientes",
    text: correlationText(a.correlation),
    basis: `Puntaje de imagen corporativa (ítems 1–9) frente a reconocimiento declarado (ítems 10–15). Rangos promedio para empates; valor p por aproximación t con n−2 gl; α = ${ALPHA}. Se excluyen ${a.excludedFromPairs} registros válidos sin ambos puntajes completos. Método ${METHOD_VERSION}.`,
    n: a.pairs,
    filters,
    kind: final ? "final" : "preliminar",
    limitations: [
      ...common,
      "Una correlación no demuestra causalidad.",
      ...(final ? [] : ["Resultado preliminar: puede cambiar mientras la recolección siga abierta. No equivale a comprobar la hipótesis."]),
    ],
  });
  return out;
}

export function interviewInterpretations(a: ReturnType<typeof interviewAnalysis>, f: Filters): Interpretation[] {
  return a.questions
    .filter((q) => q.answered > 0)
    .map((q) => {
      const chosen = q.counts.filter((c) => c.count > 0);
      const list = chosen.map((c) => (a.nValid === 1 ? c.label : `${c.label} (${c.count} de ${q.answered})`)).join("; ");
      return {
        title: `Pregunta ${q.n}`,
        source: "Declarado por la dirección" as const,
        text: `${q.text} La dirección declaró: ${list}.`,
        basis: `Selecciones registradas en la entrevista${q.type === "multi" ? " (selección múltiple: los porcentajes pueden sumar más de 100 %)" : ""}.`,
        n: q.answered,
        filters: describeFilters(f),
        kind: "descriptivo" as const,
        limitations: ["Es lo declarado por la dirección; no está verificado salvo que se contraste con la ficha de observación o con evidencias."],
      };
    });
}

export function observationInterpretations(a: ReturnType<typeof observationAnalysis>, f: Filters): Interpretation[] {
  return a.criteria.map((c) => {
    const parts = c.counts.map((o) => `${o.label} ${o.count}`).join(", ");
    return {
      title: `Criterio ${c.n}: ${c.title}`,
      source: "Observado" as const,
      text: `En ${a.nValid} ficha(s) válida(s): ${parts}${c.omitted ? `, sin registrar ${c.omitted}` : ""}.`,
      basis: "Registro C/P/NC/NV de la ficha de observación con sus evidencias.",
      n: a.nValid - c.omitted,
      filters: describeFilters(f),
      kind: "descriptivo" as const,
      limitations: [
        "NV (no verificable) indica falta de material o referencia; no equivale a incumplimiento.",
        "Las fotografías muestran lo visible en la fecha del material; no prueban las condiciones actuales de todo el establecimiento.",
      ],
    };
  });
}

export type Analysis =
  | { instrument: "encuesta"; data: ReturnType<typeof surveyAnalysis> }
  | { instrument: "entrevista"; data: ReturnType<typeof interviewAnalysis> }
  | { instrument: "observacion"; data: ReturnType<typeof observationAnalysis> };

/** Registros que entran al análisis: válidos; con el filtro «prueba», los enviados de prueba (pilotaje). */
export const analysisSet = (recs: Rec[], f: Filters) =>
  recs.filter((r) => (f.status === "prueba" || f.includeTest ? isSubmitted(r) && !r.excluded : isValid(r)));

export function analyze(instrument: InstrumentCode, filtered: Rec[], f: Filters): Analysis {
  const recs = analysisSet(filtered, f);
  if (instrument === "encuesta") return { instrument, data: surveyAnalysis(recs) };
  if (instrument === "entrevista") return { instrument, data: interviewAnalysis(recs) };
  return { instrument, data: observationAnalysis(recs) };
}

/** Lee los filtros de la URL (mismos parámetros en panel y exportación). */
export function parseFilters(get: (k: string) => string | null | undefined, currentVersion: string): Filters {
  const date = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const status = get("estado");
  return {
    from: date(get("desde")),
    to: date(get("hasta")),
    channel: get("canal") && /^[a-z0-9-]{1,30}$/.test(get("canal")!) ? get("canal")! : null,
    version: get("version") && /^[\w.-]{1,20}$/.test(get("version")!) ? get("version")! : currentVersion,
    status: STATUS_FILTERS.some(([k]) => k === status) ? status! : "todos",
    includeTest: get("prueba") === "1",
  };
}

/** Celda CSV segura: comillas escapadas y neutraliza fórmulas (=, +, -, @, tab, CR) para Excel. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
export const toCsv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
