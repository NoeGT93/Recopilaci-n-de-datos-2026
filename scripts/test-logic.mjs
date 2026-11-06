// Pruebas de la lógica pura (estadística, puntajes, validación, metas). Ejecutar: npm test
import assert from "node:assert/strict";
import * as S from "../lib/stats.ts";

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b}`);

// --- Spearman ---
assert.deepEqual(S.averageRanks([10, 20, 20, 30]), [1, 2.5, 2.5, 4]);
// Referencia scipy.stats.spearmanr([1,2,3,4,5],[5,6,7,8,7]) (documentación de SciPy): con empate en y.
let r = S.spearman([1, 2, 3, 4, 5], [5, 6, 7, 8, 7]);
close(r.rho, 0.8207826816681233, 1e-12, "rho con empates");
close(r.p, 0.08858700531354381, 1e-9, "p con empates");
assert.equal(r.ties, true);
// Sin empates: coincide con 1 − 6Σd²/(n(n²−1)).
r = S.spearman([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 1, 4, 3, 6, 5, 8, 7, 10, 9]);
close(r.rho, 1 - (6 * 10) / (10 * 99), 1e-12, "rho sin empates");
// Distribución t: valores críticos tabulados.
close(S.tTwoSidedP(2.228138852, 10), 0.05, 1e-8, "t crítico gl=10");
close(S.tTwoSidedP(1.959963985, 1e7), 0.05, 1e-6, "t crítico gl→∞");
close(S.tTwoSidedP(0, 5), 1, 1e-12, "t=0");
// Permutaciones exactas: n=4 orden perfecto → 2/24.
r = S.spearman([1, 2, 3, 4], [1, 2, 3, 4]);
close(r.rho, 1, 1e-12, "rho=1"); close(r.pPerm, 2 / 24, 1e-12, "p exacto"); assert.equal(r.p, 0);
r = S.spearman([1, 2, 3, 4], [4, 3, 2, 1]); close(r.rho, -1, 1e-12, "rho=-1");
// No estimables: nunca 0.
assert.equal(S.spearman([1, 2], [3, 4]).estimable, false);
assert.equal(S.spearman([5, 5, 5, 5], [1, 2, 3, 4]).estimable, false);
assert.match(S.spearman([1, 2, 3, 4], [7, 7, 7, 7]).reason, /reconocimiento declarado es constante/);
// Monte Carlo concuerda con la aproximación t en una muestra grande con muchos empates.
const xs = [], ys = [];
for (let i = 0; i < 200; i++) { const a = 9 + (i * 7) % 28; xs.push(a); ys.push(6 + (Math.round((a - 9) * 0.3 + ((i * 13) % 9)) % 19)); }
r = S.spearman(xs, ys);
assert.ok(r.estimable && Math.abs(r.p - r.pPerm) < 0.02 + 0.2 * r.p, `MC vs t: ${r.p} ${r.pPerm}`);
assert.equal(S.median([3, 1, 2]), 2); assert.equal(S.median([1, 2, 3, 4]), 2.5); assert.equal(S.median([]), null);
console.log("estadística: ok");

// --- Validación ---
import * as V from "../lib/validate.ts";
import * as A from "../lib/analysis.ts";

let sv = V.parseSurvey({ i1: "excelente", i2: "necesita_mejorar", i3: null });
assert.equal(sv.answered, 2);
assert.deepEqual(sv.rows[0], { item: "i1", value: "excelente", num: 4, text: null });
assert.deepEqual(sv.rows[1].num, 1);
assert.deepEqual(sv.rows[2], { item: "i3", value: null, num: null, text: null }); // omisión ≠ 0
assert.equal(sv.rows.length, 15);
assert.throws(() => V.parseSurvey({ i1: "neutral" }), V.ValidationError); // sin quinto valor
assert.throws(() => V.parseSurvey({ i1: 0 }), V.ValidationError);

// Exclusividad y «Otra».
assert.throws(() => V.parseInterview({ p4: { values: ["manual", "no_sabe"] } }), /no puede combinarse/);
assert.throws(() => V.parseInterview({ p12: { values: ["logotipo", "no_definido"] } }), /no puede combinarse/);
assert.throws(() => V.parseInterview({ p2: { values: ["oficial_vigente", "no_sabe"] } }), /una sola opción/);
assert.throws(() => V.parseInterview({ p1: { values: ["otra"] } }), /especifique/);
let iv = V.parseInterview({ p1: { values: ["calidad", "otra"], other: "Sostenibilidad", url: "https://example.org/x" }, p8: { values: ["favorables", "desfavorables"] } });
assert.equal(iv.answered, 2);
assert.equal(iv.rows.find((r) => r.value === "otra").text, "Sostenibilidad");
assert.equal(iv.notes[0].url, "https://example.org/x");
assert.throws(() => V.parseInterview({ p1: { values: ["calidad"], url: "javascript:alert(1)" } }), /http/);

let ob = V.parseObservation({ c1: { value: "NV", date: "2026-10-30" }, c2: { value: "NC" } });
assert.equal(ob.rows[0].value, "NV"); // NV se conserva como categoría propia
assert.equal(ob.answered, 2);
assert.throws(() => V.parseObservation({ c1: { value: "X" } }), V.ValidationError);
assert.throws(() => V.parsePersonal({ age: 150 }), /Edad/);
assert.equal(V.parsePersonal({ name: "  " }), null);
assert.equal(V.parseChannel("qr-mesa"), "qr-mesa");
assert.equal(V.parseChannel("<script>"), "directo");
console.log("validación: ok");

// --- Puntajes, omisiones, pares, metas ---
const rec = (id, nums, extra = {}) => ({
  id, status: nums.every((n) => n !== null) ? "completo" : "incompleto", is_test: 0, excluded: null, channel: "directo",
  version: "1.0", created_at: "2026-11-05T18:00:00Z", updated_at: "2026-11-05T18:00:00Z", submitted_at: "2026-11-05T18:00:00Z",
  answers: nums.map((num, i) => ({ item: `i${i + 1}`, value: num ? "x" : null, num, text: null })), ...extra,
});
const full = (img, rec_) => [...Array(9).fill(img), ...Array(6).fill(rec_)];
const recs = [
  rec("a", full(4, 4)), rec("b", full(3, 3)), rec("c", full(2, 3)), rec("d", full(1, 1)),
  rec("e", [null, ...full(4, 4).slice(1)]),                 // imagen no calculable
  rec("f", full(4, 4), { is_test: 1 }),                      // prueba
  rec("g", full(4, 4), { excluded: "Duplicado" }),           // excluido
  rec("h", full(4, 4), { status: "no_elegible" }),           // no elegible
  rec("i", full(4, 4), { status: "borrador" }),              // borrador
];
assert.equal(A.score(recs[0], [1, 2, 3, 4, 5, 6, 7, 8, 9]), 36);
assert.equal(A.score(recs[4], [1, 2, 3]), null);
assert.equal(A.score(recs[4], [4, 5, 6]), 12);
const F = { from: null, to: null, channel: null, version: "1.0", status: "todos" };
const an = A.analyze("encuesta", recs, F).data;
assert.equal(an.nValid, 5);
assert.equal(an.pairs, 4);
assert.equal(an.excludedFromPairs, 1);
assert.equal(an.items[0].omitted, 1);
assert.equal(an.items[0].answered, 4);
assert.equal(an.scores[0].n, 4);
assert.equal(an.scores[4].n, 5);
assert.ok(an.correlation.estimable);
const pg = A.progress(recs, 300);
assert.deepEqual([pg.received, pg.complete, pg.incomplete, pg.ineligible, pg.drafts, pg.test, pg.excluded, pg.valid, pg.pending],
  [8, 6, 1, 1, 1, 1, 1, 5, 295]);
assert.equal(A.progress(recs, 3).pending, 0); // max(meta − válidos, 0)
assert.equal(A.progress(recs, null).pending, null);
// Filtro «prueba»: analiza los enviados de prueba (pilotaje).
assert.equal(A.analyze("encuesta", A.applyFilters(recs, { ...F, status: "prueba" }), { ...F, status: "prueba" }).data.nValid, 1);
// Versión distinta nunca se mezcla.
assert.equal(A.applyFilters([rec("v2", full(4, 4), { version: "2.0" })], F).length, 0);
// Interpretaciones.
assert.match(A.correlationText({ estimable: true, n: 30, rho: 0.5, p: 0.01 }), /favorable a Hi/);
assert.match(A.correlationText({ estimable: true, n: 30, rho: -0.5, p: 0.01 }), /contraria/);
assert.match(A.correlationText({ estimable: true, n: 30, rho: 0.2, p: 0.3 }), /no se rechaza H0.*no demuestra ausencia/);
assert.match(A.correlationText({ estimable: false, n: 1, reason: "x" }), /No estimable/);
console.log("puntajes, metas e interpretaciones: ok");

// --- Exportación segura ---
assert.equal(A.csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
assert.equal(A.csvCell("@SUM(A1)"), `"'@SUM(A1)"`);
assert.equal(A.csvCell(null), '""');
assert.equal(A.csvCell(3), '"3"');
assert.ok(A.toCsv([["a"]]).startsWith("﻿"));
const pf = A.parseFilters((k) => ({ desde: "2026-11-01", canal: "<x>", estado: "nada" })[k], "1.0");
assert.deepEqual(pf, { from: "2026-11-01", to: null, channel: null, version: "1.0", status: "todos" });
console.log("exportación: ok");
