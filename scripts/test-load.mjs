// Carga sintética en un entorno SEPARADO (local o de pruebas), nunca en producción.
//   BASE=http://127.0.0.1:8787 PERSIST=<carpeta> node scripts/test-load.mjs
// 1) 300 envíos acumulados (en lotes de 20 concurrentes); 2) ráfaga controlada de N flujos simultáneos;
// 3) verifica conteos en D1 y que el límite por IP corta el exceso. No equivale a 300 usuarios simultáneos.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";

const BASE = process.env.BASE ?? "http://127.0.0.1:8787";
const PERSIST = process.env.PERSIST;
const BURST = Number(process.env.BURST ?? 100);
const H = { "Content-Type": "application/json", Origin: BASE };
const sql = (q) =>
  JSON.parse(execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "d1", "execute", "recopilacion-datos-2026", "--local", ...(PERSIST ? ["--persist-to", PERSIST] : []), "--json", "--command", q], { encoding: "utf8" }))[0].results;
const post = async (body) => {
  const t = performance.now();
  const r = await fetch(BASE + "/api/encuesta", { method: "POST", headers: H, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => null), ms: performance.now() - t };
};
const SCALE = ["necesita_mejorar", "regular", "bueno", "excelente"];
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

async function flow(channel) {
  const id = randomUUID(), key = randomBytes(32).toString("base64url");
  const base = Math.floor(rnd() * 4);
  const answers = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`i${i + 1}`, rnd() < 0.04 ? null : SCALE[Math.max(0, Math.min(3, base + Math.round(rnd() * 2 - 1)))]]));
  const a = await post({ action: "start", id, key, consent: true, adult: true, consumed: true, channel, turnstile: "XXXX.DUMMY.TOKEN.XXXX" });
  if (a.status !== 200) return { status: a.status, ms: [a.ms] };
  const b = await post({ action: "save", id, key, answers });
  const c = await post({ action: "submit", id, key, answers });
  return { status: c.status, ms: [a.ms, b.ms, c.ms] };
}
const pct = (xs, p) => xs.sort((x, y) => x - y)[Math.floor((xs.length - 1) * p)].toFixed(0);

sql("UPDATE instruments SET state = 'abierto' WHERE code = 'encuesta'");
sql("DELETE FROM rate_limits");
const before = sql("SELECT COUNT(*) n FROM submissions WHERE channel IN ('carga', 'rafaga')")[0].n;

let lat = [], fails = 0, t0 = performance.now();
for (let done = 0; done < 300; done += 20) {
  if (done % 100 === 0) sql("DELETE FROM rate_limits"); // el entorno de prueba usa una sola IP
  const res = await Promise.all(Array.from({ length: 20 }, () => flow("carga")));
  for (const r of res) { lat.push(...r.ms); if (r.status !== 200) fails++; }
}
console.log(`300 envíos acumulados: ${((performance.now() - t0) / 1000).toFixed(1)} s, fallos ${fails}, latencia p50 ${pct(lat, 0.5)} ms, p95 ${pct(lat, 0.95)} ms`);
assert.equal(fails, 0);

sql("DELETE FROM rate_limits");
lat = []; t0 = performance.now();
const burst = await Promise.all(Array.from({ length: BURST }, () => flow("rafaga")));
const okBurst = burst.filter((r) => r.status === 200).length;
burst.forEach((r) => lat.push(...r.ms));
console.log(`ráfaga de ${BURST} flujos simultáneos (inicio+guardado+envío): ${okBurst} ok en ${((performance.now() - t0) / 1000).toFixed(1)} s, p50 ${pct(lat, 0.5)} ms, p95 ${pct(lat, 0.95)} ms`);
assert.equal(okBurst, BURST);
const extra = await Promise.all(Array.from({ length: 25 }, () => flow("rafaga-exceso")));
console.log(`límite por IP: ${extra.filter((r) => r.status === 429).length} de 25 inicios adicionales rechazados con 429 (límite 120/h)`);
assert.ok(extra.some((r) => r.status === 429));

const after = sql("SELECT COUNT(*) n FROM submissions WHERE channel IN ('carga', 'rafaga') AND status IN ('completo','incompleto')")[0].n;
assert.equal(after - before, 300 + BURST, "cada flujo exactamente un registro");
const dup = sql("SELECT COUNT(*) n FROM (SELECT submission_id, item, COUNT(*) c FROM answers GROUP BY submission_id, item HAVING c > 1)")[0].n;
assert.equal(dup, 0, "sin respuestas duplicadas por ítem");
console.log(`D1: ${after - before} registros nuevos, 0 duplicados por ítem`);
sql("DELETE FROM rate_limits");
