# Recopilación de datos 2026

Aplicación de recolección y análisis para la investigación de la Maestría en Marketing Estratégico y Alta
Gerencia (CUNOC, USAC) sobre la relación entre **imagen corporativa** y **reconocimiento declarado** de
Coffee Bike en Quetzaltenango. Digitaliza tres instrumentos del documento «Instrumentos»:

| Instrumento | Ruta | Acceso |
|---|---|---|
| Encuesta a clientes (15 ítems) | `/encuesta/clientes` | Pública (Turnstile) |
| Entrevista a la dirección (12 preguntas) | `/entrevista/direccion` | Invitación revocable con vencimiento |
| Ficha de observación virtual (8 criterios) | `/observacion` | Invitación del equipo investigador |
| Administración y resultados | `/admin` | Contraseña |

La correspondencia pregunta → campo → tipo → validación está en [docs/MAPEO.md](docs/MAPEO.md).

## Arquitectura

- Next.js **15.5.29** (App Router, TypeScript) — último parche de la rama 15.x.
- `@opennextjs/cloudflare` **1.20.16** (exige Next ≥ 15.5.29) sobre Cloudflare Workers, runtime Node
  (`nodejs_compat`); no se usa el Edge Runtime de Next.
- Cloudflare **D1** (`recopilacion-datos-2026`): respuestas, configuración, sesiones, auditoría, análisis.
- Cloudflare **R2** privado (`recopilacion-datos-2026-evidencias`): fotografías de evidencia.
- Turnstile con validación en servidor. Versiones fijadas en `package.json` y `package-lock.json`.
- Recursos propios e independientes de ABACSA (Worker, D1, R2 y secretos distintos).

`npm audit` reporta avisos en herramientas de compilación (glob/minimatch dentro de OpenNext y postcss
de Next); no se ejecutan en el Worker. postcss se fuerza a 8.5.32 con `overrides`.

### Decisiones importantes

- **Fuente de verdad**: textos y opciones en `lib/instruments.ts`, copiados del documento. Cada envío guarda
  instrumento + versión, y la definición queda congelada en `instrument_versions`. Si cambia una pregunta
  o escala, sube `version`: el panel nunca mezcla versiones.
- **Omisiones**: `NULL`, nunca 0. Un puntaje solo existe si todos sus ítems están respondidos.
- **Datos personales** opcionales, en tabla aparte (`personal_data`), enviados solo al final, nunca en URL
  ni en el navegador, nunca devueltos al recuperar un borrador. El admin los ve a pedido, con auditoría.
- **Ajustes de aplicación pendientes de revisión académica**: consentimiento informado y filtros de mayoría
  de edad y consumo previo. Los no elegibles se registran como `no_elegible` sin escala.
- **Idempotencia**: el navegador genera el id (UUID) del registro. Toda escritura es un batch D1 con la
  guarda «sigue en borrador»; un doble clic o reintento no duplica. «Respuesta recibida» solo se muestra
  después de que D1 confirma. No se impide que una persona anónima responda varias veces (no hay
  identificación); el canal de captación y el límite por IP ayudan a detectar patrones.
- **Invitaciones**: el código viaja en el fragmento `#acceso=…`, que el navegador no envía al servidor
  (no queda en registros ni en Referer). Se canjea por una cookie de sesión limitada a ese instrumento.

## Análisis

- Imagen corporativa = ítems 1–9 (9–36); identidad visual 1–3, cognitiva 4–6, afectiva 7–9 (3–12);
  reconocimiento declarado = 10–15 (6–24). Nunca se suman ambas variables.
- **Spearman** = Pearson sobre **rangos promedio** (corrige empates). Valor p **bilateral por aproximación
  t** con n−2 gl (mismo método que `scipy.stats.spearmanr` y SPSS); se informa además un valor p por
  **permutaciones** (exacto si n ≤ 8; Monte Carlo de 10 000 con semilla fija si n > 8). α = 0,05.
  Verificado contra la referencia de SciPy `spearmanr([1,2,3,4,5],[5,6,7,8,7])` → rho 0,820783,
  p 0,088587 (`scripts/test-logic.mjs`).
- «No estimable» con menos de 3 pares o si una variable es constante; nunca se reemplaza por 0.
- Interpretaciones por reglas (sin IA), marcadas como borrador, con datos, n, filtros, versión, tipo
  (descriptivo/preliminar/final) y limitaciones. Clientes, dirección y observación van por separado.
- «Cerrar recolección y generar instantánea final» guarda el resultado en `analysis_results`.

## Desarrollo local

Requisitos: Node 22+ (probado con 24), cuenta de Cloudflare con `wrangler login`.

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run --silent hash-password     # pegar el resultado en ADMIN_PASSWORD_HASH de .dev.vars
```

En **Windows**, la SQLite local falla con rutas largas (`SQLITE_CANTOPEN`). Use una carpeta corta:

```bash
export WRANGLER_PERSIST="C:/wp/rd26"
npx wrangler d1 migrations apply recopilacion-datos-2026 --local --persist-to "$WRANGLER_PERSIST"
npm run dev                                                   # next dev con bindings locales
npx opennextjs-cloudflare build                               # build real para Workers
npx wrangler dev --persist-to "$WRANGLER_PERSIST" --port 8787 # ejecuta el bundle de OpenNext en workerd
```

(En macOS/Linux basta `npm run preview`.)

## Pruebas

```bash
npm test                                                     # estadística, validación, puntajes, metas, CSV
BASE=http://127.0.0.1:8787 PERSIST="$WRANGLER_PERSIST" node scripts/test-e2e.mjs   # permisos y flujos
BASE=http://127.0.0.1:8787 PERSIST="$WRANGLER_PERSIST" node scripts/test-load.mjs  # carga sintética
```

Las pruebas e2e y de carga siembran datos en la D1 **local**; no las ejecute contra producción.

## Despliegue

```bash
npx wrangler d1 migrations apply recopilacion-datos-2026 --remote
npm run deploy
npm run --silent hash-password | npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put TURNSTILE_SECRET_KEY
```

## Contraseña del admin

```bash
npm run --silent hash-password | npx wrangler secret put ADMIN_PASSWORD_HASH
```

Pide la contraseña sin mostrarla (mínimo 12 caracteres), genera PBKDF2-SHA256 (100 000 iteraciones,
el máximo de Workers) y la guarda como secreto. Cambiarla no cierra sesiones abiertas; para cerrarlas
todas: `npx wrangler d1 execute recopilacion-datos-2026 --remote --command "DELETE FROM sessions"`.

## Operación

1. **Enlaces, metas e invitaciones** (`/admin/enlaces`): estado de cada instrumento (En prueba → Abierto →
   Cerrado), metas (encuesta 300 por defecto; entrevista y observación sin definir), enlace de la encuesta
   con canal (`?canal=qr-mesa`) y QR, y creación/revocación de invitaciones (el enlace se muestra una sola vez).
2. **En prueba** marca los registros como prueba: no cuentan como válidos. Úselo para el pilotaje
   (filtro «Registro de prueba» para analizarlos).
3. **Exclusiones** desde el detalle de cada registro, con motivo; los datos originales se conservan.

## Exportación

En cada dashboard: «CSV analítico» (sin identificadores personales; respeta los filtros) y «CSV de datos
personales» (aparte, auditado, se une por `id_registro`). CSV UTF-8 con BOM, abre directamente en Excel;
las celdas que empiezan con `= + - @` se neutralizan. No suba exportaciones al repositorio (`.gitignore`).

## Respaldo y recuperación

- D1 Time Travel (30 días en Workers Paid):
  `npx wrangler d1 time-travel info recopilacion-datos-2026` y
  `npx wrangler d1 time-travel restore recopilacion-datos-2026 --timestamp <ISO>`.
- Copia completa: `npx wrangler d1 export recopilacion-datos-2026 --remote --output respaldo.sql`
  (guárdela fuera del repositorio).
- Fotografías: R2 `recopilacion-datos-2026-evidencias`, clave `instrumento/registro/evidencia`.

## Seguridad

Cookie `__Host-sesion` (`HttpOnly`, `Secure`, `SameSite=Lax`), sesiones en D1 con vencimiento (admin 8 h;
invitación ≤ 7 días y nunca más allá de su vencimiento), cierre de sesión, revocación inmediata.
Autorización en servidor en cada página, lectura, descarga y escritura. Verificación de Origin en
endpoints con cookie (las Server Actions la hacen en Next). Límite de intentos en D1: login 5/15 min,
invitaciones 20/15 min, inicio de encuesta 120/h por IP (hash). CSP, `Referrer-Policy: no-referrer`,
`noindex`. Fotos validadas por firma (JPEG/PNG/WebP) y ≤ 5 MB, servidas con `no-store`. Los errores y
registros no incluyen cuerpos de solicitudes ni datos personales.
