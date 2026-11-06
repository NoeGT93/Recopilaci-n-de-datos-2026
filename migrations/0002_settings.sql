-- Configuración editable desde el admin (p. ej. hash de la contraseña, que reemplaza al secreto inicial).
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
