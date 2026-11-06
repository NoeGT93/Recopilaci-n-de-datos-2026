# Correspondencia instrumentos → campos → validación

Fuente de verdad: documento «Instrumentos» (Documento de Noe Escobar.docx). Los textos exactos viven en
`lib/instruments.ts`; esta tabla documenta cómo se capturan, almacenan y validan. Versión de los tres
instrumentos: **1.0**. Toda respuesta guarda `instrument` + `version` (tabla `submissions`) y la definición
completa queda congelada en `instrument_versions`.

## Datos personales (los tres instrumentos)

Nombre y apellido, edad, sexo, nivel educativo y puesto de trabajo figuran en el documento. Se capturan como
**opcionales**, en la tabla separada `personal_data` (1:1 con `submissions`), nunca en las respuestas
analíticas, nunca en URL y nunca devueltos al recuperar un borrador. Solo el admin los ve, en una vista
explícita que queda registrada en `audit_log`. Las exportaciones analíticas no los incluyen.

| Campo | Tipo | Validación |
|---|---|---|
| name | texto | ≤ 100 caracteres, opcional |
| age | entero | 0–120, opcional |
| sex | opción | Mujer · Hombre · Prefiero no decir; opcional (ajuste de aplicación, pendiente de revisión) |
| education | opción | Primaria · Básicos · Diversificado · Universitario · Posgrado (maestría o doctorado) · Prefiero no decir; opcional |
| job | texto | ≤ 100, opcional |

## 1. Encuesta a clientes (`encuesta`, `/encuesta/clientes`, pública)

**Ajustes de aplicación pendientes de revisión académica** (no están en el documento):

| Campo | Tipo | Regla |
|---|---|---|
| consent | sí/no | «No» → `no_elegible` (`sin_consentimiento`), no ve la escala |
| adult (18 años o más) | sí/no | «No» → `no_elegible` (`menor_de_edad`) |
| prior_consumption (ha consumido en Coffee Bike) | sí/no | «No» → `no_elegible` (`sin_consumo_previo`) |
| channel | slug `[a-z0-9-]{1,30}` | desde `?canal=`; por defecto `directo` |

Ítems 1–15 (`i1`…`i15`), una sola opción, todos directos:

| Opción | value | num |
|---|---|---|
| Excelente | `excelente` | 4 |
| Bueno | `bueno` | 3 |
| Regular | `regular` | 2 |
| Necesita mejorar | `necesita_mejorar` | 1 |
| (sin respuesta) | `NULL` | `NULL` |

Se rechaza cualquier otro valor. No existe quinto valor; una omisión nunca es 0.

| Ítems | Variable / dimensión | Puntaje | Rango |
|---|---|---|---|
| 1–3 | Imagen · Identidad visual | suma si los 3 están respondidos | 3–12 |
| 4–6 | Imagen · Cognitiva | ídem | 3–12 |
| 7–9 | Imagen · Afectiva | ídem | 3–12 |
| 1–9 | Imagen corporativa | suma si los 9 están respondidos | 9–36 |
| 10–15 | Reconocimiento declarado (familiaridad 10–11, diferenciación 12–13, identificación 14–15) | suma si los 6 están respondidos | 6–24 |

Estado al enviar: `completo` si los 15 ítems tienen valor; `incompleto` si falta alguno.

**Limitación metodológica para el investigador:** la escala Excelente/Bueno/Regular/Necesita mejorar es
valorativa; en afirmaciones de familiaridad y reconocimiento (ítems 10–15, p. ej. «lo identifico como una
marca que ya conocía») funciona como grado de acuerdo/capacidad declarada y puede leerse de forma ambigua.
No se cambió la escala (requiere autorización). Revisarlo en el pilotaje (modo «prueba»).

## 2. Entrevista a la dirección (`entrevista`, `/entrevista/direccion`, por invitación)

Ítems `p1`…`p12`. Cada opción seleccionada es una fila en `answers` (`value` = código de opción).
«Otra/Otro/Otros/Otro mecanismo/Otra evidencia» exige texto (≤ 300) en `answers.text`.
Exclusivas: si se marca una, no puede haber otra opción en la misma pregunta (cliente y servidor).

| # | Tipo | Opciones exclusivas |
|---|---|---|
| 1 | múltiple | — |
| 2 | única | — |
| 3 | única | — |
| 4 | múltiple | No se realiza una revisión definida; No sabe |
| 5 | múltiple | No existe una promesa definida; No sabe |
| 6 | múltiple | No existe una preparación definida; No sabe |
| 7 | múltiple | No se realizan acciones definidas; No sabe |
| 8 | múltiple | No se han recibido comentarios; No sabe |
| 9 | múltiple | No se dispone de evidencia; No sabe |
| 10 | única | — |
| 11 | múltiple | No sabe |
| 12 | múltiple | Aún no se ha definido |

Por pregunta, opcional: referencia escrita (≤ 2000), enlace http(s) (≤ 500) y fotografías (R2).
Estado: `completo` si las 12 preguntas tienen al menos una opción; si no, `incompleto`.

## 3. Ficha de observación virtual (`observacion`, `/observacion`, equipo investigador)

Criterios `c1`…`c8`, una opción: `C` Cumple, `P` Parcial, `NC` No cumple, `NV` No verificable. NV es
categoría propia (nunca se convierte en NC ni en número). Sin puntaje numérico.

Por criterio, opcional: evidencia escrita (≤ 2000), enlace (≤ 500), fecha del material (AAAA-MM-DD) y
fotografías (JPEG/PNG/WebP, ≤ 5 MB tras compresión en el navegador).

Por ficha: fecha de revisión (obligatoria al enviar), observador (etiqueta de la invitación) y síntesis en
tres campos (≤ 4000 c/u): fortalezas verificadas, diferencias entre soportes, aspectos no verificables.
Estado: `completo` si los 8 criterios tienen opción; si no, `incompleto`.

## Estados de registro

| Estado | Dónde | Cuenta como válido |
|---|---|---|
| `borrador` | `submissions.status` | No |
| `completo` / `incompleto` | `submissions.status` | Sí, salvo prueba o excluido |
| `no_elegible` | `submissions.status` | No |
| Registro de prueba | `submissions.is_test = 1` (instrumento en modo «prueba» o marcado por admin) | No |
| Excluido del análisis | fila en `exclusions` con motivo (los datos originales se conservan) | No |
