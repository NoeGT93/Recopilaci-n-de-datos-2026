-- Imágenes de referencia que el equipo muestra en la encuesta (portada o una afirmación concreta).
-- Se guardan en R2 bajo "medios/"; cada envío registra en submissions.meta cuáles estaban activas.
CREATE TABLE survey_media (
  id           TEXT PRIMARY KEY,
  item         TEXT NOT NULL, -- 'portada' o 'i1'…'i15'
  caption      TEXT,
  r2_key       TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX survey_media_item ON survey_media(item);
