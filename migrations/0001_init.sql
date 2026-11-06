-- Recopilación de datos 2026 — esquema inicial.
-- Los datos originales nunca se borran por decisiones analíticas: las exclusiones van en su propia tabla.

CREATE TABLE instruments (
  code       TEXT PRIMARY KEY CHECK (code IN ('encuesta', 'entrevista', 'observacion')),
  state      TEXT NOT NULL DEFAULT 'prueba' CHECK (state IN ('cerrado', 'prueba', 'abierto')),
  goal       INTEGER CHECK (goal IS NULL OR goal >= 0), -- NULL = meta sin definir
  updated_at TEXT NOT NULL
);
-- 300: meta operativa editable de encuestas válidas (no es un tamaño muestral calculado).
-- Entrevista y observación: sin meta hasta que el equipo la configure.
INSERT INTO instruments (code, state, goal, updated_at) VALUES
  ('encuesta', 'prueba', 300, datetime('now')),
  ('entrevista', 'prueba', NULL, datetime('now')),
  ('observacion', 'prueba', NULL, datetime('now'));

-- Definición congelada de cada versión publicada (textos, opciones, codificación).
CREATE TABLE instrument_versions (
  code       TEXT NOT NULL,
  version    TEXT NOT NULL,
  definition TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (code, version)
);

CREATE TABLE invitations (
  id           TEXT PRIMARY KEY,
  instrument   TEXT NOT NULL CHECK (instrument IN ('entrevista', 'observacion')),
  label        TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT,
  last_used_at TEXT
);

CREATE TABLE sessions (
  token_hash    TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'entrevista', 'observacion')),
  invitation_id TEXT REFERENCES invitations(id),
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL
);
CREATE INDEX sessions_expires ON sessions(expires_at);

CREATE TABLE submissions (
  id                TEXT PRIMARY KEY, -- UUID generado por el cliente (clave de idempotencia)
  instrument        TEXT NOT NULL,
  version           TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('borrador', 'completo', 'incompleto', 'no_elegible')),
  is_test           INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1)),
  channel           TEXT NOT NULL DEFAULT 'directo',
  consent           INTEGER,
  adult             INTEGER,
  prior_consumption INTEGER,
  ineligible_reason TEXT,
  resume_hash       TEXT,     -- hash de la clave de borrador (encuesta pública)
  invitation_id     TEXT REFERENCES invitations(id),
  meta              TEXT,     -- JSON analítico sin datos personales (fecha de revisión, síntesis…)
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  submitted_at      TEXT,
  FOREIGN KEY (instrument, version) REFERENCES instrument_versions(code, version)
);
CREATE INDEX submissions_filter ON submissions(instrument, version, status, created_at);
CREATE INDEX submissions_invitation ON submissions(invitation_id);

-- Una fila por ítem (encuesta/observación) o por opción seleccionada (entrevista).
-- value/num NULL = sin respuesta (nunca cero).
CREATE TABLE answers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  item          TEXT NOT NULL,
  value         TEXT,
  num           INTEGER CHECK (num IS NULL OR num BETWEEN 1 AND 4),
  text          TEXT
);
CREATE INDEX answers_submission ON answers(submission_id);

-- Datos identificativos separados de las respuestas analíticas. Acceso solo admin, con auditoría.
CREATE TABLE personal_data (
  submission_id TEXT PRIMARY KEY REFERENCES submissions(id),
  name          TEXT,
  age           INTEGER CHECK (age IS NULL OR age BETWEEN 0 AND 120),
  sex           TEXT,
  education     TEXT,
  job           TEXT,
  created_at    TEXT NOT NULL
);

-- kind 'nota': referencia escrita + enlace + fecha del material; kind 'foto': objeto en R2.
CREATE TABLE evidence (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  item          TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('nota', 'foto')),
  text          TEXT,
  url           TEXT,
  material_date TEXT,
  r2_key        TEXT,
  content_type  TEXT,
  size          INTEGER,
  created_at    TEXT NOT NULL
);
CREATE INDEX evidence_submission ON evidence(submission_id, item);

CREATE TABLE exclusions (
  submission_id TEXT PRIMARY KEY REFERENCES submissions(id),
  reason        TEXT NOT NULL,
  excluded_at   TEXT NOT NULL
);

CREATE TABLE audit_log (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     TEXT NOT NULL,
  actor  TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT -- JSON sin datos personales
);
CREATE INDEX audit_at ON audit_log(at);

CREATE TABLE analysis_results (
  id             TEXT PRIMARY KEY,
  instrument     TEXT NOT NULL,
  version        TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('preliminar', 'final')),
  method_version TEXT NOT NULL,
  filters        TEXT NOT NULL,
  result         TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
