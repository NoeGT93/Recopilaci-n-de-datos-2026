// Prueba de extremo a extremo contra un entorno local o de pruebas (NUNCA producción con datos reales).
//   BASE=http://127.0.0.1:8787 PERSIST=<carpeta> node scripts/test-e2e.mjs
// Requiere Turnstile en modo de prueba (.dev.vars.example) y acceso a la D1 local para sembrar una invitación.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const BASE = process.env.BASE ?? "http://127.0.0.1:8787";
const PERSIST = process.env.PERSIST;
const H = { "Content-Type": "application/json", Origin: BASE };
const b64url = (b) => Buffer.from(b).toString("base64url");
const key = () => b64url(randomBytes(32));
const sql = (q) =>
  JSON.parse(
    execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "d1", "execute", "recopilacion-datos-2026", "--local", ...(PERSIST ? ["--persist-to", PERSIST] : []), "--json", "--command", q], { encoding: "utf8" }),
  )[0].results;

async function post(path, body, extra = {}) {
  const r = await fetch(BASE + path, { method: "POST", headers: { ...H, ...extra }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => null), headers: r.headers };
}
const ok = (r, msg) => assert.ok(r.status < 300, `${msg}: ${r.status} ${JSON.stringify(r.data)}`);
const answers = (n) => Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`i${i + 1}`, i < n ? ["excelente", "bueno", "regular", "necesita_mejorar"][i % 4] : null]));
const TS = "XXXX.DUMMY.TOKEN.XXXX"; // la clave secreta de prueba de Turnstile acepta cualquier token

// --- Encuesta pública ---
sql("UPDATE instruments SET state = 'abierto'");
let id = randomUUID(), k = key();
let r = await fetch(BASE + "/api/encuesta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", id, key: k }) });
assert.equal(r.status, 403, "sin Origin → 403");
r = await post("/api/encuesta", { action: "start", id, key: k, consent: true, adult: true, consumed: true, channel: "prueba-e2e", turnstile: TS });
ok(r, "inicio");
assert.equal(r.data.status, "borrador");
r = await post("/api/encuesta", { action: "start", id, key: k, consent: true, adult: true, consumed: true, turnstile: TS });
ok(r, "inicio repetido (idempotente)");
r = await post("/api/encuesta", { action: "save", id, key: key(), answers: answers(3) });
assert.equal(r.status, 404, "clave de borrador incorrecta");
r = await post("/api/encuesta", { action: "save", id, key: k, answers: { i1: "neutral" } });
assert.equal(r.status, 422, "quinto valor rechazado");
ok(await post("/api/encuesta", { action: "save", id, key: k, answers: answers(5) }), "guardar borrador");
r = await post("/api/encuesta", { action: "resume", id, key: k });
assert.equal(r.data.answers.i1, "excelente");
assert.equal(r.data.answers.i6, null);
assert.equal(r.data.personal, undefined, "el borrador no expone datos personales");
// Doble clic: dos envíos simultáneos del mismo registro.
const [s1, s2] = await Promise.all([
  post("/api/encuesta", { action: "submit", id, key: k, answers: answers(14), personal: { name: "Prueba E2E", age: 30 } }),
  post("/api/encuesta", { action: "submit", id, key: k, answers: answers(14), personal: { name: "Prueba E2E", age: 30 } }),
]);
ok(s1, "envío 1"); ok(s2, "envío 2");
r = await post("/api/encuesta", { action: "submit", id, key: k, answers: answers(15) });
assert.equal(r.data.status, "incompleto", "reintento posterior no cambia el envío");
assert.equal(sql(`SELECT COUNT(*) n FROM answers WHERE submission_id = '${id}'`)[0].n, 15, "sin respuestas duplicadas");
assert.equal(sql(`SELECT COUNT(*) n FROM answers WHERE submission_id = '${id}' AND num IS NULL`)[0].n, 1, "omisión como NULL");
assert.equal(sql(`SELECT COUNT(*) n FROM personal_data WHERE submission_id = '${id}'`)[0].n, 1);
assert.equal(sql(`SELECT COUNT(*) n FROM answers WHERE submission_id = '${id}' AND text LIKE '%Prueba%'`)[0].n, 0, "datos personales separados");
// No elegible: no completa la escala.
id = randomUUID(); k = key();
r = await post("/api/encuesta", { action: "start", id, key: k, consent: true, adult: false, consumed: true, turnstile: TS });
assert.equal(r.data.status, "no_elegible");
r = await post("/api/encuesta", { action: "submit", id, key: k, answers: answers(15) });
assert.equal(r.data.status, "no_elegible");
assert.equal(sql(`SELECT COUNT(*) n FROM answers WHERE submission_id = '${id}'`)[0].n, 0, "no elegible sin escala");
// Cerrado.
sql("UPDATE instruments SET state = 'cerrado' WHERE code = 'encuesta'");
r = await post("/api/encuesta", { action: "start", id: randomUUID(), key: key(), consent: true, adult: true, consumed: true, turnstile: TS });
assert.equal(r.status, 403, "encuesta cerrada");
sql("UPDATE instruments SET state = 'abierto' WHERE code = 'encuesta'");
console.log("encuesta pública: ok");

// --- Rutas y endpoints protegidos sin sesión ---
for (const [path, code] of [["/api/formulario", 401], ["/api/admin/exportar?instrumento=encuesta", 401], [`/api/evidencia/${randomUUID()}`, 404]]) {
  assert.equal((await fetch(BASE + path)).status, code, `GET ${path}`);
}
assert.equal((await post("/api/formulario", { action: "save", id: randomUUID() })).status, 401);
for (const page of ["/entrevista/direccion", "/observacion", "/admin"]) {
  const html = await (await fetch(BASE + page)).text();
  assert.ok(/Acceso restringido|Contraseña/.test(html) && !/Enviar entrevista|Nueva ficha|Resumen general/.test(html), `página ${page} protegida`);
}
const home = await (await fetch(BASE + "/")).text();
assert.ok(!/entrevista|observacion|admin/i.test(home.replace(/<script[\s\S]*?<\/script>/g, "")), "portada sin directorio interno");
console.log("bloqueo sin sesión: ok");

// --- Invitaciones ---
async function invite(instrument, label, days = 7) {
  const token = b64url(randomBytes(24));
  const hash = createHash("sha256").update(token).digest("base64url");
  const iid = randomUUID();
  sql(`INSERT INTO invitations (id, instrument, label, token_hash, created_at, expires_at) VALUES ('${iid}', '${instrument}', '${label}', '${hash}', datetime('now'), '${new Date(Date.now() + days * 864e5).toISOString()}')`);
  const r = await post("/api/acceso", { token });
  ok(r, "canje de invitación");
  const cookie = r.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); assert.match(cookie, /SameSite=lax/i);
  return { iid, cookie: cookie.split(";")[0] };
}
assert.equal((await post("/api/acceso", { token: b64url(randomBytes(24)) })).status, 403, "invitación inexistente");
const dir = await invite("entrevista", "Dirección E2E");
const C = (s) => ({ Cookie: s.cookie });
const iv = randomUUID();
r = await post("/api/formulario", { action: "save", id: iv, answers: { p4: { values: ["manual", "no_sabe"] } } }, C(dir));
assert.equal(r.status, 422, "exclusividad en servidor");
r = await post("/api/formulario", { action: "save", id: iv, answers: { p1: { values: ["calidad", "otra"], other: "Ambiente" }, p2: { values: ["oficial_vigente"] } } }, C(dir));
ok(r, "guardar entrevista");
// Foto: firma PNG mínima.
const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
let fd = new FormData(); fd.append("submissionId", iv); fd.append("item", "p1"); fd.append("file", new Blob([png], { type: "image/png" }), "x.png");
r = await fetch(BASE + "/api/evidencia", { method: "POST", headers: { Origin: BASE, ...C(dir) }, body: fd });
assert.equal(r.status, 200, "subir foto");
const photo = (await r.json()).id;
fd = new FormData(); fd.append("submissionId", iv); fd.append("item", "p1"); fd.append("file", new Blob(["<svg/>"], { type: "image/png" }), "x.png");
assert.equal((await fetch(BASE + "/api/evidencia", { method: "POST", headers: { Origin: BASE, ...C(dir) }, body: fd })).status, 415, "tipo falso rechazado");
fd = new FormData(); fd.append("submissionId", iv); fd.append("item", "p1"); fd.append("file", new Blob([Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)])], { type: "image/png" }), "x.png");
assert.equal((await fetch(BASE + "/api/evidencia", { method: "POST", headers: { Origin: BASE, ...C(dir) }, body: fd })).status, 413, "más de 5 MB");
assert.equal((await fetch(`${BASE}/api/evidencia/${photo}`, { headers: C(dir) })).status, 200, "dueño ve su foto");
assert.equal((await fetch(`${BASE}/api/evidencia/${photo}`)).status, 404, "foto sin sesión");
assert.equal((await fetch(BASE + "/api/admin/exportar?instrumento=encuesta", { headers: C(dir) })).status, 401, "dirección sin acceso a resultados");
const obsPage = await (await fetch(BASE + "/observacion", { headers: C(dir) })).text();
assert.ok(/Acceso restringido/.test(obsPage), "dirección sin acceso a observación");
const [e1, e2] = await Promise.all([post("/api/formulario", { action: "submit", id: iv, answers: { p1: { values: ["calidad"] } } }, C(dir)), post("/api/formulario", { action: "submit", id: iv, answers: { p1: { values: ["calidad"] } } }, C(dir))]);
ok(e1, "envío entrevista"); ok(e2, "reenvío entrevista");
assert.equal(sql(`SELECT COUNT(*) n FROM answers WHERE submission_id = '${iv}' AND value IS NOT NULL`)[0].n, 1, "entrevista sin duplicados");
assert.equal((await post("/api/formulario", { action: "save", id: randomUUID(), answers: {} }, C(dir))).status, 409, "una entrevista por invitación");

const obs = await invite("observacion", "Observador E2E");
const ob = randomUUID();
r = await post("/api/formulario", { action: "submit", id: ob, answers: { c1: { value: "NV", note: "Sin archivo", date: "2026-11-01" } }, meta: {} }, C(obs));
assert.equal(r.status, 422, "fecha de revisión obligatoria");
r = await post("/api/formulario", { action: "submit", id: ob, answers: { c1: { value: "NV" }, c2: { value: "NC" } }, meta: { reviewDate: "2026-11-05", synthesis: { fortalezas: "x" } } }, C(obs));
ok(r, "envío ficha");
assert.equal(sql(`SELECT value FROM answers WHERE submission_id = '${ob}' AND item = 'c1'`)[0].value, "NV", "NV conservado");
assert.equal((await fetch(`${BASE}/api/formulario?id=${iv}`, { headers: C(obs) })).status, 404, "observador no ve la entrevista");
assert.equal((await fetch(`${BASE}/api/evidencia/${photo}`, { headers: C(obs) })).status, 404, "observador no ve fotos ajenas");
// Revocación: la sesión cae de inmediato.
sql(`UPDATE invitations SET revoked_at = datetime('now') WHERE id = '${obs.iid}'`);
assert.equal((await fetch(BASE + "/api/formulario", { headers: C(obs) })).status, 401, "invitación revocada");
// Vencida.
sql(`UPDATE invitations SET expires_at = '2000-01-01T00:00:00Z' WHERE id = '${dir.iid}'`);
assert.equal((await fetch(BASE + "/api/formulario", { headers: C(dir) })).status, 401, "invitación vencida");
console.log("invitaciones y permisos: ok");
