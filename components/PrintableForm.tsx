// Versión imprimible (A4) de cada instrumento, fiel al documento «Instrumentos»: para aplicar en papel y
// para los anexos del informe. Los textos salen de lib/instruments.ts, la misma fuente que los formularios web.
import {
  SURVEY, SCALE, INTERVIEW, OBSERVATION, OBS_OPTIONS, SEX_OPTIONS, EDUCATION_OPTIONS, type InstrumentCode,
} from "@/lib/instruments";

const Box = () => <span className="pf-box" aria-hidden />;
const Line = ({ w }: { w?: string }) => <span className="pf-line" style={w ? { width: w } : undefined} />;

function Header({ title }: { title: string }) {
  return (
    <header className="pf-head">
      <div>
        <p>DEPARTAMENTO DE ESTUDIOS DE POSTGRADO</p>
        <p>CENTRO UNIVERSITARIO DE OCCIDENTE</p>
        <p>UNIVERSIDAD DE SAN CARLOS DE GUATEMALA</p>
        <p>MAESTRÍA EN MARKETING ESTRATÉGICO Y ALTA GERENCIA</p>
        <h1>{title}</h1>
      </div>
      <div className="pf-folio">Folio N.º <Line w="18mm" /></div>
    </header>
  );
}

function PersonalBlock({ note }: { note: string }) {
  return (
    <section className="pf-personal">
      <p className="pf-note">{note}</p>
      <p>Nombre y apellido <Line w="120mm" /></p>
      <p>Edad <Line w="20mm" /> &nbsp; Sexo {SEX_OPTIONS.map((o) => <span key={o} className="pf-opt"><Box /> {o}</span>)}</p>
      <p>Nivel educativo {EDUCATION_OPTIONS.map((o) => <span key={o} className="pf-opt"><Box /> {o}</span>)}</p>
      <p>Puesto de trabajo <Line w="110mm" /></p>
    </section>
  );
}

function Survey({ adjustments }: { adjustments: boolean }) {
  return (
    <>
      <Header title={SURVEY.title} />
      {adjustments && (
        <section className="pf-adjust">
          <p className="pf-note">Ajustes de aplicación, pendientes de revisión académica.</p>
          <p>
            <strong>Consentimiento informado.</strong> Esta encuesta forma parte de una investigación académica de la Maestría en
            Marketing Estratégico y Alta Gerencia (CUNOC, USAC) sobre la imagen corporativa y el reconocimiento de Coffee Bike. Su
            participación es voluntaria; las respuestas se analizan de forma agregada y confidencial, solo con fines académicos.
          </p>
          <p>¿Acepta participar? <span className="pf-opt"><Box /> Sí</span> <span className="pf-opt"><Box /> No</span> &nbsp;·&nbsp; ¿Tiene 18 años o más? <span className="pf-opt"><Box /> Sí</span> <span className="pf-opt"><Box /> No</span> &nbsp;·&nbsp; ¿Ha consumido productos de Coffee Bike? <span className="pf-opt"><Box /> Sí</span> <span className="pf-opt"><Box /> No</span></p>
        </section>
      )}
      <PersonalBlock note="Datos de identificación (opcionales): describen el perfil de quienes participan y se registran por separado de las respuestas." />
      <p className="pf-objective">{SURVEY.objective}</p>
      <table className="pf-table">
        <thead>
          <tr>
            <th className="pf-n">No.</th><th>Ítems</th>
            {SCALE.map((s) => <th key={s.value} className="pf-c">{s.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {SURVEY.items.map((it) => (
            <tr key={it.id}>
              <td className="pf-n">{it.n}</td>
              <td>{it.text}</td>
              {SCALE.map((s) => <td key={s.value} className="pf-c"><Box /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pf-foot">Gracias por su participación.</p>
    </>
  );
}

function Interview() {
  return (
    <>
      <Header title={INTERVIEW.title} />
      <PersonalBlock note="Datos de identificación (opcionales) de la persona entrevistada." />
      <p className="pf-objective">{INTERVIEW.objective}</p>
      {INTERVIEW.questions.map((q) => (
        <section key={q.id} className="pf-q">
          <p className="pf-qt"><strong>{q.n}.</strong> {q.text} <em>({q.type === "single" ? "Selección única" : "Selección múltiple"})</em></p>
          <div className="pf-opts">
            {q.options.map((o) => (
              <span key={o.value} className="pf-opt"><Box /> {o.label}{o.other ? <>: <Line w="45mm" /></> : null}</span>
            ))}
          </div>
          <p className="pf-ref">Referencias y evidencias: <Line w="140mm" /></p>
        </section>
      ))}
      <p className="pf-note pf-block">{INTERVIEW.note}</p>
      <p className="pf-note">{INTERVIEW.materials}</p>
    </>
  );
}

function Observation() {
  return (
    <>
      <Header title={OBSERVATION.title} />
      <PersonalBlock note="Datos de identificación (opcionales) de quien registra la ficha." />
      <p>Fecha de revisión <Line w="40mm" /> &nbsp; Observador <Line w="70mm" /></p>
      <p className="pf-objective">{OBSERVATION.objective} {OBSERVATION.rule}</p>
      {OBSERVATION.criteria.map((c) => (
        <section key={c.id} className="pf-q">
          <p className="pf-qt"><strong>{c.n}. {c.title}:</strong> {c.text}</p>
          <div className="pf-opts">
            {OBS_OPTIONS.map((o) => <span key={o.value} className="pf-opt"><Box /> {o.value} ({o.label})</span>)}
          </div>
          <p className="pf-ref">Evidencia o enlace: <Line w="105mm" /> Fecha del material: <Line w="25mm" /></p>
        </section>
      ))}
      <section className="pf-q">
        <p className="pf-qt"><strong>Síntesis</strong></p>
        {OBSERVATION.synthesis.map((s) => (
          <p key={s.key} className="pf-ref">{s.label}: <Line w="130mm" /><br /><Line w="170mm" /></p>
        ))}
        <p className="pf-note">{OBSERVATION.synthesisNote}</p>
      </section>
    </>
  );
}

export default function PrintableForm({ code, adjustments }: { code: InstrumentCode; adjustments: boolean }) {
  return (
    <article className="pf">
      {code === "encuesta" ? <Survey adjustments={adjustments} /> : code === "entrevista" ? <Interview /> : <Observation />}
    </article>
  );
}
