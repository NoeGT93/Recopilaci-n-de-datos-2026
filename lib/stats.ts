// Estadística sin dependencias (verificada en scripts/test-logic.mjs contra resultados de referencia).
//
// Rho de Spearman = correlación de Pearson entre rangos promedio (los empates reciben el promedio de sus
// posiciones), no la fórmula 1 − 6Σd²/(n(n²−1)), que solo es válida sin empates.
// Valor p principal: aproximación t con n−2 gl, bilateral (método de scipy.stats.spearmanr y SPSS).
// Comprobación: valor p por permutaciones (exacto para n ≤ 8; Monte Carlo con semilla fija para n > 8).

export const METHOD_VERSION = "spearman-rangos-promedio/t-bilateral+permutaciones/v1";
export const ALPHA = 0.05;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function averageRanks(values: number[]): number[] {
  const idx = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(values.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = r;
    i = j + 1;
  }
  return ranks;
}

export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

function lgamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61503916999185, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-16) break;
  }
  return h;
}

/** Función beta incompleta regularizada I_x(a, b). */
export function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Valor p bilateral de un estadístico t con df grados de libertad. */
export function tTwoSidedP(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  return ibeta(df / (df + t * t), df / 2, 0.5);
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** p bilateral por permutaciones: proporción de |rho*| ≥ |rho| al permutar y. */
function permutationP(rx: number[], ry: number[], rho: number, mcIterations: number): { p: number; method: string } {
  const n = rx.length;
  const target = Math.abs(rho) - 1e-12;
  const y = [...ry];
  if (n <= 8) {
    // Enumeración completa (algoritmo de Heap).
    let hits = 0, total = 0;
    const c = new Array(n).fill(0);
    const visit = () => { total++; if (Math.abs(pearson(rx, y)) >= target) hits++; };
    visit();
    for (let i = 0; i < n; ) {
      if (c[i] < i) {
        const j = i % 2 ? c[i] : 0;
        [y[j], y[i]] = [y[i], y[j]];
        visit(); c[i]++; i = 0;
      } else { c[i] = 0; i++; }
    }
    return { p: hits / total, method: `exacto (${total} permutaciones)` };
  }
  const rand = mulberry32(20261105);
  let hits = 0;
  for (let k = 0; k < mcIterations; k++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [y[i], y[j]] = [y[j], y[i]];
    }
    if (Math.abs(pearson(rx, y)) >= target) hits++;
  }
  return { p: (hits + 1) / (mcIterations + 1), method: `Monte Carlo (${mcIterations} permutaciones, semilla fija)` };
}

export type SpearmanResult =
  | { estimable: false; n: number; reason: string }
  | { estimable: true; n: number; rho: number; t: number; df: number; p: number; pPerm: number; permMethod: string; ties: boolean };

export function spearman(x: number[], y: number[], mcIterations = 10000): SpearmanResult {
  const n = x.length;
  if (n < 3) return { estimable: false, n, reason: `Se requieren al menos 3 pares completos para estimar el valor p; hay ${n}.` };
  const constX = x.every((v) => v === x[0]);
  const constY = y.every((v) => v === y[0]);
  if (constX || constY) {
    const which = constX && constY ? "Ambas variables son constantes" : constX ? "La imagen corporativa es constante" : "El reconocimiento declarado es constante";
    return { estimable: false, n, reason: `${which} en los pares disponibles: sin variación, rho no está definido.` };
  }
  const rx = averageRanks(x), ry = averageRanks(y);
  const rho = Math.max(-1, Math.min(1, pearson(rx, ry)));
  const df = n - 2;
  const t = Math.abs(rho) === 1 ? Infinity * Math.sign(rho) : rho * Math.sqrt(df / (1 - rho * rho));
  const ties = new Set(x).size < n || new Set(y).size < n;
  const perm = permutationP(rx, ry, rho, mcIterations);
  return { estimable: true, n, rho, t, df, p: tTwoSidedP(t, df), pPerm: perm.p, permMethod: perm.method, ties };
}
