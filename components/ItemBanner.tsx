// Ilustración de referencia por afirmación (SVG plano, paleta de la marca). Muestra el TEMA de la pregunta
// con elementos genéricos (una insignia de montañas, letreros sin texto) y no el logotipo ni el nombre real,
// para no adelantar las respuestas de reconocimiento (ítems 10–15).

const C = {
  bg: "#f4e9da", wall: "#efe0cc", wood: "#d8b98a", woodDark: "#b48a55", coffee: "#4a2c1a", crema: "#c99a63",
  ink: "#151515", white: "#fffaf3", skin1: "#e9bd94", skin2: "#c68b5f", hair: "#2b1d14", hair2: "#5a3a24",
  green: "#7f9b78", leaf: "#6c8b62", blue: "#8aa4b8", cup: "#f7f1e8", accent: "#9a5523",
};

type P = { x: number; skin?: string; hair?: string; shirt?: string; apron?: boolean; bun?: boolean; flip?: boolean; hand?: [number, number]; smile?: boolean };

/** Persona de medio cuerpo (la barra o el borde inferior tapan las piernas). */
function Person({ x, skin = C.skin1, hair = C.hair, shirt = C.white, apron, bun, flip, hand, smile = true }: P) {
  const s = flip ? -1 : 1;
  const hx = hand ? hand[0] : x + 26 * s;
  const hy = hand ? hand[1] : 150;
  return (
    <g>
      <path d={`M${x - 30} 220 V128 a30 30 0 0 1 60 0 V220Z`} fill={shirt} />
      {apron && <path d={`M${x - 20} 132 h40 V220 h-40Z`} fill={C.coffee} />}
      {apron && <path d={`M${x - 14} 132 l-6 -16 M${x + 14} 132 l6 -16`} stroke={C.coffee} strokeWidth="3" />}
      <rect x={x - 7} y={88} width="14" height="14" rx="4" fill={skin} />
      <circle cx={x} cy={74} r={20} fill={skin} />
      <path d={`M${x - 21} 74 a21 21 0 0 1 42 -4 c-8 -10 -26 -12 -42 4Z`} fill={hair} />
      {bun && <circle cx={x - 18 * s} cy={60} r={8} fill={hair} />}
      <circle cx={x + 6 * s} cy={73} r={1.8} fill={C.ink} />
      <circle cx={x - 4 * s} cy={73} r={1.8} fill={C.ink} />
      {smile && <path d={`M${x - 4} 82 q${4} 4 ${8} 0`} stroke={C.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      <path d={`M${x + 24 * s} 120 Q${x + 34 * s} ${(120 + hy) / 2} ${hx} ${hy}`} stroke={shirt === C.white ? "#e6dccf" : shirt} strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx={hx} cy={hy} r={6.5} fill={skin} />
    </g>
  );
}

const Cup = ({ x, y, s = 1, badge = true }: { x: number; y: number; s?: number; badge?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-12 -18 h24 l-3 30 h-18Z" fill={C.cup} stroke={C.ink} strokeWidth="1.5" />
    <rect x="-13" y="-22" width="26" height="5" rx="2" fill={C.ink} />
    <rect x="-11.5" y="-6" width="23" height="9" fill={C.wood} />
    {badge && <Badge x={0} y={-1.5} r={3.6} />}
  </g>
);

/** Insignia genérica de montañas (no es el logotipo de la marca). */
function Badge({ x, y, r, color = C.ink, mark = C.white }: { x: number; y: number; r: number; color?: string; mark?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} />
      <path d={`M${x - r * 0.62} ${y + r * 0.35} L${x - r * 0.15} ${y - r * 0.35} L${x + r * 0.08} ${y} L${x + r * 0.3} ${y - r * 0.5} L${x + r * 0.65} ${y + r * 0.35}Z`} fill={mark} />
    </g>
  );
}

const Plant = ({ x, y }: { x: number; y: number }) => (
  <g>
    <path d={`M${x - 12} ${y} h24 l-3 18 h-18Z`} fill={C.white} stroke="#d9cbb7" />
    <path d={`M${x} ${y} q-14 -18 -4 -34 M${x} ${y} q12 -16 6 -30 M${x} ${y} q-2 -22 2 -40`} stroke={C.leaf} strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx={x - 6} cy={y - 28} rx="5" ry="9" fill={C.green} transform={`rotate(-30 ${x - 6} ${y - 28})`} />
    <ellipse cx={x + 7} cy={y - 26} rx="5" ry="9" fill={C.green} transform={`rotate(25 ${x + 7} ${y - 26})`} />
    <ellipse cx={x + 1} cy={y - 40} rx="4.5" ry="8" fill={C.leaf} />
  </g>
);

const Board = ({ x, y, w = 110, h = 70 }: { x: number; y: number; w?: number; h?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="5" fill={C.ink} stroke={C.woodDark} strokeWidth="4" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={x + 14} y={y + 14 + i * 13} width={w - 28 - (i % 2) * 22} height="4" rx="2" fill="#e9dfd0" />)}
  </g>
);

/** Carrito: cuerpo negro con cubierta de madera y la insignia genérica. */
const Cart = ({ x, w = 150, badge = true }: { x: number; w?: number; badge?: boolean }) => (
  <g>
    <rect x={x} y={150} width={w} height="62" rx="4" fill={C.ink} />
    <rect x={x - 8} y={142} width={w + 16} height="10" rx="3" fill={C.wood} />
    <circle cx={x + 18} cy={214} r="7" fill="#333" />
    <circle cx={x + w - 18} cy={214} r="7" fill="#333" />
    {badge && <Badge x={x + w / 2} y={181} r={20} />}
  </g>
);

const Counter = () => (
  <g>
    <rect x="0" y="168" width="640" height="52" fill={C.woodDark} />
    <rect x="0" y="160" width="640" height="10" fill={C.wood} />
  </g>
);

const Bubble = ({ x, y, w = 60, h = 34, children }: { x: number; y: number; w?: number; h?: number; children?: React.ReactNode }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="10" fill={C.white} stroke="#d9cbb7" />
    <path d={`M${x + 14} ${y + h} l-6 10 l14 -10`} fill={C.white} stroke="#d9cbb7" />
    <rect x={x + 10} y={y + h - 2} width="12" height="3" fill={C.white} />
    {children}
  </g>
);

const Check = ({ x, y, r = 14 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={C.accent} />
    <path d={`M${x - r * 0.42} ${y} l${r * 0.3} ${r * 0.3} l${r * 0.55} -${r * 0.6}`} stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const Heart = ({ x, y, s = 1, fill = C.accent }: { x: number; y: number; s?: number; fill?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 6 C-10 -2 -8 -10 -3 -10 C0 -10 0 -7 0 -7 C0 -7 0 -10 3 -10 C8 -10 10 -2 0 6Z" fill={fill} />
);

const Window = () => (
  <g>
    <rect x="452" y="26" width="150" height="96" rx="6" fill="#f8efe2" stroke={C.wood} strokeWidth="4" />
    <path d="M527 26 v96 M452 74 h150" stroke={C.wood} strokeWidth="3" />
    <path d="M462 112 l26 -30 l18 18 l22 -28 l30 40Z" fill="#e2d2bb" />
  </g>
);

const Hanging = ({ x }: { x: number }) => (
  <g>
    <path d={`M${x} 0 v28`} stroke={C.leaf} strokeWidth="2" />
    {[0, 1, 2, 3].map((i) => <ellipse key={i} cx={x + (i % 2 ? 7 : -7)} cy={14 + i * 12} rx="5" ry="8" fill={i % 2 ? C.green : C.leaf} />)}
  </g>
);

const Phone = ({ x, y, children }: { x: number; y: number; children?: React.ReactNode }) => (
  <g>
    <rect x={x} y={y} width="74" height="136" rx="12" fill={C.ink} />
    <rect x={x + 6} y={y + 10} width="62" height="116" rx="6" fill={C.white} />
    {children}
  </g>
);

const Bag = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-20 -30 h40 l4 54 h-48Z" fill={C.white} stroke="#d9cbb7" />
    <path d="M-20 -30 l6 -8 h28 l6 8" fill="#efe4d4" stroke="#d9cbb7" />
    <rect x="-14" y="-6" width="28" height="18" fill={C.wood} />
    <Badge x={0} y={3} r={6} />
  </g>
);

const Swatch = ({ x, y, c }: { x: number; y: number; c: string }) => <rect x={x} y={y} width="26" height="26" rx="6" fill={c} stroke="#d9cbb7" />;

function Scene({ id }: { id: string }) {
  switch (id) {
    case "i1": // El diseño del logotipo me resulta claro
      return (<><Hanging x={40} /><Window /><Cart x={160} w={170} /><Plant x={384} y={150} />
        <circle cx={245} cy={181} r={34} fill="none" stroke={C.accent} strokeWidth="3" strokeDasharray="5 5" />
        <Person x={440} shirt={C.blue} hand={[372, 150]} flip />
        <Bubble x={448} y={14} w={56} h={36}><path d="M462 32 l6 6 12 -12" stroke={C.accent} strokeWidth="3" fill="none" strokeLinecap="round" /></Bubble></>);
    case "i2": // Mismos colores en los materiales
      return (<><Hanging x={600} /><Counter /><Cup x={150} y={140} s={1.6} /><Bag x={250} y={136} s={1.3} />
        <rect x={320} y={92} width="60" height="70" rx="4" fill={C.ink} /><rect x={330} y={104} width="40" height="5" rx="2" fill={C.wood} /><Badge x={350} y={135} r={12} color={C.wood} mark={C.ink} />
        <Swatch x={440} y={70} c={C.ink} /><Swatch x={472} y={70} c={C.wood} /><Swatch x={504} y={70} c={C.white} /><Swatch x={536} y={70} c={C.crema} />
        <path d="M430 110 h140" stroke={C.woodDark} strokeWidth="2" strokeDasharray="4 6" /><Check x={500} y={130} /></>);
    case "i3": // Estilo visual coherente
      return (<><Counter /><Board x={70} y={40} /><Cup x={240} y={140} s={1.5} />
        <rect x={290} y={60} width="80" height="100" rx="4" fill={C.white} stroke="#d9cbb7" /><rect x={300} y={72} width="60" height="34" fill={C.ink} /><Badge x={330} y={89} r={11} /><rect x={300} y={114} width="50" height="4" rx="2" fill="#cbb89c" /><rect x={300} y={124} width="40" height="4" rx="2" fill="#cbb89c" />
        <Bag x={430} y={136} s={1.3} /><path d="M70 30 h440" stroke={C.accent} strokeWidth="2" strokeDasharray="6 6" /><Check x={540} y={70} /></>);
    case "i4": // Productos de buena calidad
      return (<><Hanging x={40} /><Window /><Counter />
        <ellipse cx={250} cy={156} rx="54" ry="8" fill="#e6d6bf" /><path d="M210 112 h80 l-8 42 h-64Z" fill={C.cup} stroke={C.ink} strokeWidth="2" />
        <ellipse cx={250} cy={113} rx="40" ry="8" fill={C.crema} /><Heart x={250} y={115} s={0.8} fill={C.white} />
        <path d="M290 122 q22 0 16 18 q-4 10 -18 8" stroke={C.ink} strokeWidth="3" fill="none" />
        <path d="M236 98 q-8 -12 2 -22 M252 96 q-8 -12 2 -22 M268 98 q-8 -12 2 -22" stroke={C.woodDark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M340 150 q20 -26 50 0Z" fill={C.crema} /><path d="M346 146 q14 -14 38 0" stroke={C.coffee} strokeWidth="2" fill="none" />
        <g transform="translate(150 50)"><path d="M0 0 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2Z" fill={C.wood} /></g></>);
    case "i5": // Cumple lo que me ofrece
      return (<><Hanging x={30} /><Hanging x={70} /><Board x={480} y={34} />
        <Person x={200} skin={C.skin1} shirt={C.white} apron bun hand={[268, 132]} />
        <Person x={360} skin={C.skin2} shirt="#a07a5c" flip hand={[292, 132]} />
        <Cup x={280} y={126} s={1.1} /><Counter /><Plant x={570} y={160} />
        <rect x={40} y={120} width="40" height="40" rx="6" fill={C.ink} /><rect x={48} y={108} width="24" height="14" fill="#333" /></>);
    case "i6": // El personal conoce los productos
      return (<><Window /><Counter /><Person x={230} apron shirt={C.white} hand={[300, 120]} />
        <Bag x={318} y={128} s={1.2} /><Bubble x={260} y={20} w={96} h={40}><ellipse cx={288} cy={40} rx="7" ry="10" fill={C.coffee} /><path d="M288 31 q-3 9 0 18" stroke={C.crema} strokeWidth="1.5" fill="none" /><ellipse cx={312} cy={40} rx="7" ry="10" fill={C.coffee} /><path d="M312 31 q-3 9 0 18" stroke={C.crema} strokeWidth="1.5" fill="none" /><text x={330} y={46} fontSize="16" fill={C.accent} fontWeight="700">?!</text></Bubble>
        <Person x={430} skin={C.skin2} shirt={C.green} flip hand={[392, 150]} /></>);
    case "i7": // Marca agradable
      return (<><Hanging x={50} /><Hanging x={600} /><Plant x={120} y={160} /><Counter />
        <Person x={320} skin={C.skin1} hair={C.hair2} shirt={C.blue} hand={[350, 132]} /><Cup x={356} y={128} s={1.1} />
        <Heart x={262} y={44} s={1.6} /><Heart x={392} y={36} s={1.2} fill={C.crema} /><Heart x={420} y={70} s={0.9} /></>);
    case "i8": // Confianza al comprar
      return (<><Window /><Cart x={150} w={160} />
        <rect x={210} y={112} width="40" height="30" rx="4" fill="#333" /><rect x={216} y={118} width="28" height="10" rx="2" fill="#9fb3a0" />
        <Person x={400} skin={C.skin2} shirt="#a07a5c" flip hand={[300, 120]} /><rect x={282} y={110} width="26" height="17" rx="3" fill={C.wood} stroke={C.ink} transform="rotate(-12 295 118)" />
        <path d="M100 40 l22 -9 22 9 v18 c0 15 -10 24 -22 28 -12 -4 -22 -13 -22 -28Z" fill={C.accent} /><path d="M112 58 l7 7 13 -14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" /></>);
    case "i9": // Me transmite cercanía
      return (<><Hanging x={40} /><Board x={490} y={34} /><Counter />
        <Person x={230} apron bun shirt={C.white} hand={[262, 160]} /><Person x={390} skin={C.skin2} hair={C.hair2} shirt={C.green} flip hand={[360, 160]} />
        <Bubble x={190} y={18} w={70} h={32}><path d="M206 34 h38" stroke="#cbb89c" strokeWidth="3" strokeLinecap="round" /></Bubble>
        <Bubble x={350} y={24} w={70} h={32}><Heart x={385} y={42} s={0.9} /></Bubble></>);
    case "i10": // Identifico el nombre como una marca que ya conocía
      return (<><rect x="150" y="30" width="230" height="56" rx="8" fill={C.ink} /><rect x="172" y="50" width="130" height="16" rx="4" fill={C.white} /><rect x="312" y="50" width="48" height="16" rx="4" fill={C.wood} />
        <path d="M180 86 v20 M350 86 v20" stroke={C.woodDark} strokeWidth="4" /><Cart x={190} w={150} badge={false} />
        <Person x={500} shirt={C.blue} flip hand={[470, 160]} /><Bubble x={420} y={10} w={56} h={36}><text x={448} y={36} textAnchor="middle" fontSize="22" fontWeight="700" fill={C.accent}>!</text></Bubble></>);
    case "i11": // Identifico el logotipo como uno que ya había visto
      return (<><Window /><Cart x={130} w={170} />
        <Person x={420} skin={C.skin2} shirt={C.green} flip hand={[392, 150]} />
        <Bubble x={330} y={14} w={86} h={52}><Badge x={360} y={40} r={16} /><path d="M386 38 l6 6 12 -12" stroke={C.accent} strokeWidth="3" fill="none" strokeLinecap="round" /></Bubble></>);
    case "i12": // Distingo el nombre entre otras cafeterías
      return (<>{[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={60 + i * 180} y={70} width={150} height={150} fill={i === 1 ? C.ink : "#d9cbb7"} />
          <rect x={72 + i * 180} y={40} width={126} height={30} rx="6" fill={i === 1 ? C.wood : "#bfae96"} />
          <rect x={90 + i * 180} y={51} width={i === 1 ? 70 : 90} height="8" rx="4" fill={i === 1 ? C.ink : "#efe4d4"} />
          <rect x={90 + i * 180} y={110} width={90} height="80" rx="4" fill={i === 1 ? "#2a2a2a" : "#efe4d4"} />
        </g>))}
        <Check x={318} y={32} r={16} /></>);
    case "i13": // Distingo el logotipo entre otros logotipos
      return (<><Badge x={120} y={110} r={42} color="#bfae96" mark="#efe4d4" />
        <g><rect x={198} y={70} width="84" height="84" rx="18" fill="#cfc0a9" /><circle cx={240} cy={112} r={20} fill="#efe4d4" /></g>
        <Badge x={360} y={110} r={46} /><circle cx={360} cy={110} r={56} fill="none" stroke={C.accent} strokeWidth="3" strokeDasharray="6 6" />
        <g><path d="M450 70 h80 l-12 84 h-56Z" fill="#cfc0a9" /><path d="M470 100 h40" stroke="#efe4d4" strokeWidth="8" strokeLinecap="round" /></g>
        <Check x={402} y={60} r={15} /></>);
    case "i14": // Publicación en redes sociales
      return (<><Hanging x={600} /><Person x={170} skin={C.skin1} hair={C.hair2} shirt={C.blue} hand={[260, 150]} />
        <Phone x={262} y={40}><rect x={268} y={58} width="62" height="56" fill={C.bg} /><Cup x={299} y={96} s={1.1} /><Heart x={276} y={126} s={0.8} /><rect x={290} y={122} width="34" height="4" rx="2" fill="#cbb89c" /><circle cx={275} cy={56} r={0} /></Phone>
        <Bubble x={370} y={46} w={70} h={34}><Badge x={392} y={63} r={10} /><text x={420} y={69} textAnchor="middle" fontSize="16" fontWeight="700" fill={C.accent}>?</text></Bubble>
        <Heart x={470} y={120} s={1.4} /><Heart x={500} y={90} s={0.9} fill={C.crema} /></>);
    case "i15": // Identifico la marca en los materiales del negocio
    default:
      return (<><Window /><Counter /><Bag x={120} y={130} s={1.4} /><Cup x={210} y={140} s={1.5} />
        <rect x={260} y={96} width="70" height="64" rx="3" fill={C.white} stroke="#d9cbb7" /><Badge x={295} y={118} r={12} /><rect x={272} y={140} width="46" height="4" rx="2" fill="#cbb89c" />
        <rect x={350} y={120} width="60" height="40" rx="3" fill={C.wood} /><Badge x={380} y={140} r={10} />
        <path d="M100 60 q140 -40 320 0" stroke={C.accent} strokeWidth="2" strokeDasharray="6 6" fill="none" /><Check x={430} y={60} /></>);
  }
}

export default function ItemBanner({ id }: { id: string }) {
  return (
    <div className="item-banner" aria-hidden>
      <svg viewBox="0 0 640 220" preserveAspectRatio="xMidYMid slice">
        <rect width="640" height="220" fill={C.bg} />
        <Scene id={id} />
      </svg>
    </div>
  );
}
