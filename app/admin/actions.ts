"use server";
// Acciones del admin. Next valida el Origin de cada Server Action (CSRF); aquí se exige además la
// sesión de admin en cada una.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CURRENT_VERSION, type InstrumentCode } from "@/lib/instruments";
import { analyze, applyFilters, describeFilters, parseFilters } from "@/lib/analysis";
import { METHOD_VERSION } from "@/lib/stats";
import {
  db, env, now, sha256, randomToken, rateLimit, clientKey, verifyPassword, createSession, destroySession,
  hashPassword, adminPasswordHash, closeOtherAdminSessions,
  requireRole, audit, loadRecords,
} from "@/lib/server";
import { str } from "@/lib/validate";

const CODES = ["encuesta", "entrevista", "observacion"];
const code = (v: FormDataEntryValue | null) => {
  if (typeof v !== "string" || !CODES.includes(v)) throw new Error("Instrumento inválido");
  return v as InstrumentCode;
};

async function admin() {
  if (!(await requireRole("admin"))) redirect("/admin");
}

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  if (!(await rateLimit(`login:${await clientKey()}`, 5, 900))) return { error: "Demasiados intentos. Espere 15 minutos." };
  const ok = await verifyPassword(String(form.get("password") ?? "").slice(0, 200), await adminPasswordHash());
  if (!ok) {
    await audit("anonimo", "login_fallido", null);
    return { error: "Contraseña incorrecta." };
  }
  await createSession("admin", null);
  await audit("admin", "login", null);
  redirect("/admin");
}

export async function changePassword(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  await admin();
  if (!(await rateLimit(`cambio:${await clientKey()}`, 5, 900))) return { error: "Demasiados intentos. Espere 15 minutos." };
  const current = String(form.get("current") ?? "").slice(0, 200);
  const next = String(form.get("next") ?? "");
  if (!(await verifyPassword(current, await adminPasswordHash()))) return { error: "La contraseña actual no es correcta." };
  if (next.length < 12 || next.length > 200) return { error: "La nueva contraseña debe tener entre 12 y 200 caracteres." };
  if (next !== String(form.get("confirm") ?? "")) return { error: "La confirmación no coincide." };
  await db()
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES ('admin_password_hash', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?2")
    .bind(await hashPassword(next), now())
    .run();
  await closeOtherAdminSessions();
  await audit("admin", "cambiar_contrasena", null);
  return { ok: true };
}

export async function logout() {
  await destroySession();
  redirect("/admin");
}

export async function updateInstrument(form: FormData) {
  await admin();
  const c = code(form.get("code"));
  const state = String(form.get("state"));
  if (!["cerrado", "prueba", "abierto"].includes(state)) throw new Error("Estado inválido");
  const raw = String(form.get("goal") ?? "").trim();
  const goal = raw === "" ? null : Number(raw);
  if (goal !== null && (!Number.isInteger(goal) || goal < 0 || goal > 100000)) throw new Error("Meta inválida");
  await db().prepare("UPDATE instruments SET state = ?, goal = ?, updated_at = ? WHERE code = ?").bind(state, goal, now(), c).run();
  await audit("admin", "configurar_instrumento", c, { state, goal });
  revalidatePath("/admin", "layout");
}

export async function createInvitation(_: unknown, form: FormData): Promise<{ link?: string; error?: string }> {
  await admin();
  const instrument = String(form.get("instrument"));
  if (instrument !== "entrevista" && instrument !== "observacion") return { error: "Instrumento inválido." };
  const label = str(form.get("label"), 60, "Etiqueta");
  if (!label) return { error: "Escriba una etiqueta (por ejemplo, «Dirección» u «Observador 1»)." };
  const days = Number(form.get("days"));
  if (!Number.isInteger(days) || days < 1 || days > 90) return { error: "La vigencia debe ser de 1 a 90 días." };
  const token = randomToken(24);
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO invitations (id, instrument, label, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, instrument, label, await sha256(token), now(), new Date(Date.now() + days * 86400_000).toISOString())
    .run();
  await audit("admin", "crear_invitacion", id, { instrument, days });
  revalidatePath("/admin/enlaces");
  const path = instrument === "entrevista" ? "/entrevista/direccion" : "/observacion";
  // El código va en el fragmento (#): no se envía al servidor ni queda en registros. Solo se muestra una vez.
  return { link: `${(await headers()).get("origin")}${path}#acceso=${token}` };
}

export async function revokeInvitation(form: FormData) {
  await admin();
  const id = String(form.get("id"));
  await db().batch([
    db().prepare("UPDATE invitations SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").bind(now(), id),
    db().prepare("DELETE FROM sessions WHERE invitation_id = ?").bind(id),
  ]);
  await audit("admin", "revocar_invitacion", id);
  revalidatePath("/admin/enlaces");
}

export async function setExclusion(form: FormData) {
  await admin();
  const id = String(form.get("id"));
  if (form.get("op") === "incluir") {
    await db().prepare("DELETE FROM exclusions WHERE submission_id = ?").bind(id).run();
    await audit("admin", "reincluir", id);
  } else {
    const reason = str(form.get("reason"), 300, "Motivo");
    if (!reason) throw new Error("El motivo es obligatorio");
    await db().prepare("INSERT OR REPLACE INTO exclusions (submission_id, reason, excluded_at) VALUES (?, ?, ?)").bind(id, reason, now()).run();
    await audit("admin", "excluir", id, { reason });
  }
  revalidatePath(`/admin/registro/${id}`);
}

export async function setTest(form: FormData) {
  await admin();
  const id = String(form.get("id"));
  const v = form.get("value") === "1" ? 1 : 0;
  await db().prepare("UPDATE submissions SET is_test = ? WHERE id = ?").bind(v, id).run();
  await audit("admin", "marcar_prueba", id, { is_test: v });
  revalidatePath(`/admin/registro/${id}`);
}

/** Datos personales: solo a pedido explícito y con registro de auditoría. */
export async function revealPersonal(id: string) {
  await admin();
  const row = await db().prepare("SELECT name, age, sex, education, job FROM personal_data WHERE submission_id = ?").bind(id).first();
  await audit("admin", "ver_datos_personales", id);
  return row ?? null;
}

/** Cierra la recolección y guarda una instantánea final con los filtros actuales. */
export async function finalSnapshot(form: FormData) {
  await admin();
  const c = code(form.get("code"));
  const params = new URLSearchParams(String(form.get("filters") ?? ""));
  const f = parseFilters((k) => params.get(k), CURRENT_VERSION[c]);
  await db().prepare("UPDATE instruments SET state = 'cerrado', updated_at = ? WHERE code = ?").bind(now(), c).run();
  const result = analyze(c, applyFilters(await loadRecords(c), f), f);
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO analysis_results (id, instrument, version, kind, method_version, filters, result, created_at) VALUES (?, ?, ?, 'final', ?, ?, ?, ?)")
    .bind(id, c, f.version, METHOD_VERSION, JSON.stringify({ ...f, descripcion: describeFilters(f) }), JSON.stringify(result.data), now())
    .run();
  await audit("admin", "instantanea_final", c, { id, filtros: f });
  revalidatePath("/admin", "layout");
}
