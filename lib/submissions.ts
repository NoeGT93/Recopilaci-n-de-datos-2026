// Escrituras atómicas de respuestas. Cada sentencia lleva la guarda «el registro sigue en borrador», y el
// cambio de estado va al final del mismo batch (transacción D1): un doble clic o un reintento después de
// un envío exitoso no duplica ni reescribe nada.
import { db, now, ensureVersionStmt } from "./server";
import type { AnswerRow, NoteRow, Personal } from "./validate";
import type { InstrumentCode } from "./instruments";

const DRAFT = "EXISTS (SELECT 1 FROM submissions WHERE id = ?1 AND status = 'borrador')";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function replaceAnswers(id: string, rows: AnswerRow[], notes: NoteRow[] | null) {
  const d = db();
  const stmts = [
    d.prepare(`DELETE FROM answers WHERE submission_id = ?1 AND ${DRAFT}`).bind(id),
    ...rows.map((r) =>
      d
        .prepare(`INSERT INTO answers (submission_id, item, value, num, text) SELECT ?1, ?2, ?3, ?4, ?5 WHERE ${DRAFT}`)
        .bind(id, r.item, r.value, r.num, r.text),
    ),
  ];
  if (notes) {
    stmts.push(d.prepare(`DELETE FROM evidence WHERE submission_id = ?1 AND kind = 'nota' AND ${DRAFT}`).bind(id));
    for (const n of notes)
      stmts.push(
        d
          .prepare(
            `INSERT INTO evidence (id, submission_id, item, kind, text, url, material_date, created_at)
             SELECT ?2, ?1, ?3, 'nota', ?4, ?5, ?6, ?7 WHERE ${DRAFT}`,
          )
          .bind(id, crypto.randomUUID(), n.item, n.text, n.url, n.material_date, now()),
      );
  }
  return stmts;
}

export function touchStmt(id: string, meta?: string | null) {
  return meta === undefined
    ? db().prepare(`UPDATE submissions SET updated_at = ?2 WHERE id = ?1 AND status = 'borrador'`).bind(id, now())
    : db().prepare(`UPDATE submissions SET updated_at = ?2, meta = ?3 WHERE id = ?1 AND status = 'borrador'`).bind(id, now(), meta);
}

export function personalStmt(id: string, p: Personal) {
  return db()
    .prepare(
      `INSERT OR IGNORE INTO personal_data (submission_id, name, age, sex, education, job, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE ${DRAFT}`,
    )
    .bind(id, p.name, p.age, p.sex, p.education, p.job, now());
}

export function finalizeStmt(id: string, status: "completo" | "incompleto") {
  const t = now();
  return db()
    .prepare(`UPDATE submissions SET status = ?2, submitted_at = ?3, updated_at = ?3, resume_hash = NULL WHERE id = ?1 AND status = 'borrador'`)
    .bind(id, status, t);
}

export function createStmts(
  code: InstrumentCode,
  version: string,
  fields: { id: string; status: "borrador" | "no_elegible"; is_test: boolean; channel?: string; invitation_id?: string | null; resume_hash?: string | null; consent?: boolean; adult?: boolean; prior?: boolean; reason?: string | null },
) {
  const t = now();
  const bool = (b: boolean | undefined) => (b === undefined ? null : b ? 1 : 0);
  return [
    ensureVersionStmt(code),
    db()
      .prepare(
        `INSERT INTO submissions (id, instrument, version, status, is_test, channel, consent, adult, prior_consumption,
           ineligible_reason, resume_hash, invitation_id, created_at, updated_at, submitted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14)`,
      )
      .bind(
        fields.id, code, version, fields.status, fields.is_test ? 1 : 0, fields.channel ?? "directo",
        bool(fields.consent), bool(fields.adult), bool(fields.prior), fields.reason ?? null,
        fields.resume_hash ?? null, fields.invitation_id ?? null, t, fields.status === "no_elegible" ? t : null,
      ),
  ];
}

export async function getSubmission(id: string) {
  return db()
    .prepare("SELECT id, instrument, version, status, resume_hash, invitation_id, meta FROM submissions WHERE id = ?")
    .bind(id)
    .first<{ id: string; instrument: InstrumentCode; version: string; status: string; resume_hash: string | null; invitation_id: string | null; meta: string | null }>();
}
