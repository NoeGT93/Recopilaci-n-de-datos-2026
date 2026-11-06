// Textos, opciones y codificación tomados literalmente del documento «Instrumentos».
// Si cambia una pregunta, opción o escala después de recibir respuestas, sube la versión:
// los resultados de versiones distintas no se mezclan.
// Sin imports: scripts/test-logic.mjs lo carga directamente con Node.

export type InstrumentCode = "encuesta" | "entrevista" | "observacion";

export const INSTRUMENT_NAMES: Record<InstrumentCode, string> = {
  encuesta: "Encuesta a clientes",
  entrevista: "Entrevista a la dirección",
  observacion: "Ficha de observación virtual",
};

export const HYPOTHESES = {
  hi: "Existe una relación positiva y estadísticamente significativa entre la imagen corporativa y el reconocimiento declarado de Coffee Bike entre los clientes y consumidores participantes del municipio de Quetzaltenango.",
  h0: "No existe una relación estadísticamente significativa entre la imagen corporativa y el reconocimiento declarado de Coffee Bike entre los participantes del estudio.",
};

export const PERSONAL_FIELDS = [
  { key: "name", label: "Nombre y apellido" },
  { key: "age", label: "Edad" },
  { key: "sex", label: "Sexo" },
  { key: "education", label: "Nivel educativo" },
  { key: "job", label: "Puesto de trabajo" },
] as const;

// Opciones cerradas para Sexo y Nivel educativo (el documento deja la línea en blanco): ajuste de la
// aplicación, pendiente de revisión académica. Se guardan como texto en personal_data.
export const SEX_OPTIONS = ["Mujer", "Hombre", "Prefiero no decir"] as const;
export const EDUCATION_OPTIONS = [
  "Primaria",
  "Básicos",
  "Diversificado",
  "Universitario",
  "Posgrado (maestría o doctorado)",
  "Prefiero no decir",
] as const;

// ---------- Encuesta ----------

export const SCALE = [
  { value: "excelente", label: "Excelente", num: 4 },
  { value: "bueno", label: "Bueno", num: 3 },
  { value: "regular", label: "Regular", num: 2 },
  { value: "necesita_mejorar", label: "Necesita mejorar", num: 1 },
] as const;

export const SURVEY = {
  code: "encuesta" as const,
  version: "1.0",
  title: "Encuesta a clientes de Coffee Bike",
  objective:
    "Objetivo: conocer su percepción sobre la imagen corporativa y el reconocimiento de Coffee Bike. Participación voluntaria y confidencial. Lea cada afirmación y marque con una X una sola opción: Excelente, Bueno, Regular o Necesita mejorar.",
  items: [
    "El diseño del logotipo de Coffee Bike me resulta claro.",
    "Coffee Bike utiliza los mismos colores en los materiales de la marca que he visto.",
    "Los materiales de comunicación de Coffee Bike mantienen un estilo visual coherente.",
    "Los productos que he consumido en Coffee Bike son de buena calidad.",
    "Coffee Bike cumple lo que me ofrece como cliente.",
    "El personal de Coffee Bike demuestra conocimiento sobre los productos que ofrece.",
    "Coffee Bike me resulta una marca agradable.",
    "Siento confianza al comprar en Coffee Bike.",
    "Coffee Bike me transmite cercanía.",
    "Cuando veo el nombre Coffee Bike, lo identifico como una marca que ya conocía.",
    "Cuando veo el logotipo de Coffee Bike, lo identifico como uno que ya había visto.",
    "Distingo el nombre Coffee Bike entre los nombres de otras cafeterías.",
    "Distingo el logotipo de Coffee Bike entre los logotipos de otras cafeterías.",
    "Al ver una publicación de Coffee Bike en redes sociales, identifico a qué marca pertenece.",
    "Identifico la marca Coffee Bike en los materiales del negocio que he visto.",
  ].map((text, i) => ({ id: `i${i + 1}`, n: i + 1, text })),
};

// Puntajes: se calculan solo si todos sus ítems están respondidos.
export const SCORES = [
  { key: "imagen", label: "Imagen corporativa", items: [1, 2, 3, 4, 5, 6, 7, 8, 9], min: 9, max: 36 },
  { key: "visual", label: "Identidad visual", items: [1, 2, 3], min: 3, max: 12 },
  { key: "cognitiva", label: "Dimensión cognitiva", items: [4, 5, 6], min: 3, max: 12 },
  { key: "afectiva", label: "Dimensión afectiva", items: [7, 8, 9], min: 3, max: 12 },
  { key: "reconocimiento", label: "Reconocimiento declarado", items: [10, 11, 12, 13, 14, 15], min: 6, max: 24 },
] as const;

export const ITEM_GROUPS = [
  { label: "Imagen corporativa · Identidad visual", items: [1, 2, 3] },
  { label: "Imagen corporativa · Cognitiva", items: [4, 5, 6] },
  { label: "Imagen corporativa · Afectiva", items: [7, 8, 9] },
  { label: "Reconocimiento declarado · Familiaridad", items: [10, 11] },
  { label: "Reconocimiento declarado · Diferenciación", items: [12, 13] },
  { label: "Reconocimiento declarado · Identificación", items: [14, 15] },
];

export const SCALE_LIMITATION =
  "La escala Excelente/Bueno/Regular/Necesita mejorar es valorativa y no encaja de forma natural con las afirmaciones de familiaridad y reconocimiento (ítems 10–15), que describen si la persona identifica o distingue la marca. Puede interpretarse de forma ambigua. La escala no se modificó porque requiere autorización; conviene revisarlo en el pilotaje.";

// ---------- Entrevista ----------

type Option = { value: string; label: string; other?: boolean; exclusive?: boolean };
export type Question = { id: string; n: number; text: string; type: "single" | "multi"; options: Option[] };

const o = (value: string, label: string, extra: Partial<Option> = {}): Option => ({ value, label, ...extra });
const NO_SABE = o("no_sabe", "No sabe", { exclusive: true });

export const INTERVIEW = {
  code: "entrevista" as const,
  version: "1.0",
  title: "Entrevista estructurada virtual a la dirección",
  objective:
    "Objetivo: conocer la identidad que el negocio busca comunicar y reunir evidencias para interpretar la encuesta. Aplicación por videollamada o formulario de opción múltiple. Marque una opción cuando se indique selección única y todas las que correspondan cuando se indique selección múltiple. Las respuestas son complementarias y no se suman a los puntajes de la encuesta. Duración por confirmar en el pilotaje.",
  note: "Registro: en las preguntas de selección múltiple, marque «No sabe» o las opciones que indican ausencia de acciones, comentarios, evidencias o decisiones únicamente cuando no corresponda ninguna otra opción. Registre las selecciones y las referencias disponibles. Distinga lo declarado por la dirección de lo verificado. No recoja datos personales de clientes.",
  materials:
    "Materiales solicitados: logotipo vigente, especificaciones visuales disponibles, menú, enlaces oficiales y fotografías recientes de los soportes utilizados. Registrar respuestas y enlaces en una hoja de notas identificada por número de pregunta.",
  questions: [
    {
      text: "¿Qué características desea que los clientes asocien con Coffee Bike?",
      type: "multi",
      options: [
        o("calidad", "Calidad de los productos"),
        o("servicio", "Buen servicio"),
        o("confianza", "Confianza"),
        o("cercania", "Cercanía"),
        o("identidad_visual", "Identidad visual distintiva"),
        o("otra", "Otra", { other: true }),
      ],
    },
    {
      text: "¿Cuál es la situación del logotipo que utiliza Coffee Bike?",
      type: "single",
      options: [
        o("oficial_vigente", "Existe una versión oficial vigente"),
        o("varias_versiones", "Se utilizan varias versiones sin una versión oficial definida"),
        o("en_actualizacion", "Está en proceso de actualización"),
        o("no_definido", "No se ha definido un logotipo oficial"),
        o("no_sabe", "No sabe"),
      ],
    },
    {
      text: "¿Qué elementos visuales están definidos para la marca?",
      type: "single",
      options: [
        o("colores_tipos", "Colores y tipos de letra"),
        o("solo_colores", "Solo colores"),
        o("solo_tipos", "Solo tipos de letra"),
        o("ninguno", "Ninguno de los dos"),
        o("no_sabe", "No sabe"),
      ],
    },
    {
      text: "¿Cómo revisan la consistencia visual de los materiales de la marca?",
      type: "multi",
      options: [
        o("manual", "Manual o guía de marca"),
        o("direccion", "Revisión de la dirección"),
        o("responsable", "Revisión del responsable de diseño o comunicación"),
        o("sin_revision", "No se realiza una revisión definida", { exclusive: true }),
        o("otro", "Otro mecanismo", { other: true }),
        NO_SABE,
      ],
    },
    {
      text: "¿Qué promesas comunica Coffee Bike a sus clientes?",
      type: "multi",
      options: [
        o("calidad", "Calidad del producto"),
        o("cumplimiento", "Cumplimiento de lo ofrecido"),
        o("atencion", "Atención y servicio"),
        o("confianza_cercania", "Confianza y cercanía"),
        o("sin_promesa", "No existe una promesa definida", { exclusive: true }),
        o("otra", "Otra", { other: true }),
        NO_SABE,
      ],
    },
    {
      text: "¿Cómo preparan al personal para explicar los productos?",
      type: "multi",
      options: [
        o("induccion", "Inducción al ingresar"),
        o("capacitaciones", "Capacitaciones periódicas"),
        o("fichas", "Fichas o materiales de consulta"),
        o("acompanamiento", "Acompañamiento en el puesto"),
        o("sin_preparacion", "No existe una preparación definida", { exclusive: true }),
        o("otro", "Otro", { other: true }),
        NO_SABE,
      ],
    },
    {
      text: "¿Qué acciones realizan para generar confianza y cercanía?",
      type: "multi",
      options: [
        o("personalizada", "Atención personalizada"),
        o("cumplimiento", "Cumplimiento de lo ofrecido"),
        o("seguimiento", "Seguimiento a comentarios o reclamos"),
        o("comunicacion", "Comunicación con los clientes"),
        o("sin_acciones", "No se realizan acciones definidas", { exclusive: true }),
        o("otra", "Otra", { other: true }),
        NO_SABE,
      ],
    },
    {
      text: "¿Qué comentarios han recibido sobre la apariencia visual de la marca?",
      type: "multi",
      options: [
        o("favorables", "Favorables"),
        o("desfavorables", "Desfavorables"),
        o("sugerencias", "Sugerencias de mejora"),
        o("sin_comentarios", "No se han recibido comentarios", { exclusive: true }),
        NO_SABE,
      ],
    },
    {
      text: "¿Qué evidencias tienen del reconocimiento del nombre o logotipo por los clientes?",
      type: "multi",
      options: [
        o("encuestas", "Encuestas o evaluaciones"),
        o("comentarios", "Comentarios directos"),
        o("redes", "Menciones o etiquetas en redes sociales"),
        o("otra", "Otra evidencia", { other: true }),
        o("sin_evidencia", "No se dispone de evidencia", { exclusive: true }),
        NO_SABE,
      ],
    },
    {
      text: "¿Han recibido comentarios sobre confusión con otras marcas?",
      type: "single",
      options: [o("si", "Sí"), o("no", "No"), o("no_sabe", "No sabe")],
    },
    {
      text: "¿En qué canales o materiales se presenta la marca?",
      type: "multi",
      options: [
        o("redes", "Redes sociales"),
        o("menu", "Menú"),
        o("fachada", "Fachada o rótulos"),
        o("empaques", "Empaques"),
        o("uniformes", "Uniformes"),
        o("otros", "Otros", { other: true }),
        NO_SABE,
      ],
    },
    {
      text: "¿Qué decisiones esperan orientar con esta investigación?",
      type: "multi",
      options: [
        o("logotipo", "Logotipo e identidad visual"),
        o("consistencia", "Consistencia de los materiales"),
        o("calidad_promesa", "Calidad y cumplimiento de la promesa"),
        o("atencion", "Atención y relación con clientes"),
        o("reconocimiento", "Reconocimiento y diferenciación de la marca"),
        o("otra", "Otra", { other: true }),
        o("no_definido", "Aún no se ha definido", { exclusive: true }),
      ],
    },
  ].map((q, i) => ({ ...q, id: `p${i + 1}`, n: i + 1 })) as Question[],
};

// ---------- Observación ----------

export const OBS_OPTIONS = [
  { value: "C", label: "Cumple" },
  { value: "P", label: "Parcial" },
  { value: "NC", label: "No cumple" },
  { value: "NV", label: "No verificable" },
] as const;

export const OBSERVATION = {
  code: "observacion" as const,
  version: "1.0",
  title: "Ficha de observación virtual",
  objective:
    "Objetivo: documentar la aplicación visible de la identidad de Coffee Bike. Revisar enlaces públicos y archivos o fotografías recientes proporcionados por la dirección. Los resultados son complementarios.",
  rule: "Registro: C = Cumple; P = Parcial; NC = No cumple; NV = No verificable. C requiere evidencia completa del criterio; P indica cumplimiento incompleto; NC exige evidencia de incumplimiento. Use NV cuando falte el material o la referencia necesaria. Un soporte no utilizado no es automáticamente un incumplimiento.",
  synthesisNote:
    "Síntesis: fortalezas verificadas, diferencias entre soportes y aspectos no verificables. Las fotografías permiten valorar lo visible en la fecha del registro; no prueban las condiciones actuales de todo el establecimiento.",
  criteria: [
    ["Logotipo vigente", "coincide con el archivo confirmado por la dirección."],
    ["Colores", "corresponden a las especificaciones aprobadas, si existen."],
    ["Tipografía", "corresponde a los tipos de letra definidos, si existen."],
    ["Menú", "el nombre de la marca es legible en el material revisado."],
    ["Redes sociales", "el perfil oficial muestra el nombre y el logotipo vigentes."],
    ["Coherencia visual", "el logotipo se aplica sin alteraciones entre al menos dos soportes disponibles."],
    ["Fachada", "el nombre de la marca es legible en una fotografía reciente."],
    ["Empaques o uniformes", "cuando se utilicen con marca, el logotipo coincide con la versión oficial."],
  ].map(([title, text], i) => ({ id: `c${i + 1}`, n: i + 1, title, text })),
  synthesis: [
    { key: "fortalezas", label: "Fortalezas verificadas" },
    { key: "diferencias", label: "Diferencias entre soportes" },
    { key: "no_verificables", label: "Aspectos no verificables" },
  ],
};

export const CURRENT_VERSION: Record<InstrumentCode, string> = {
  encuesta: SURVEY.version,
  entrevista: INTERVIEW.version,
  observacion: OBSERVATION.version,
};

export const DEFINITIONS: Record<InstrumentCode, unknown> = {
  encuesta: { ...SURVEY, scale: SCALE, scores: SCORES },
  entrevista: INTERVIEW,
  observacion: { ...OBSERVATION, options: OBS_OPTIONS },
};
