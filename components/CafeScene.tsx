"use client";
// Escena de cafetería en el mismo estilo de línea negra de las ilustraciones de personajes: el personaje
// (WebP desde R2) queda detrás de un mostrador cuyo frente negro lleva la marca, como el carrito real.
// Ítems 1–9 (imagen corporativa): logotipo real. Ítems 10–15 (reconocimiento): solo la montaña, sin nombre,
// para no adelantar la respuesta.

const INK = "#151515";
const SW = 2.6; // grosor de línea, igual al de las ilustraciones a este tamaño
const WOOD = "#d8b98a", WOOD_D = "#b48a55", CREAM = "#fbf6ee";

type Layout = "wall" | "window" | "bar" | "plain";
const LAYOUT: Record<string, Layout> = {
  i1: "wall", i2: "window", i3: "bar", i4: "bar", i5: "wall", i6: "window", i7: "wall", i8: "bar",
  i9: "window", i10: "plain", i11: "bar", i12: "wall", i13: "window", i14: "wall", i15: "bar",
};
// Lado del contexto principal (el personaje se corre al lado contrario).
export const SIDE: Record<string, "left" | "right"> = {
  i1: "left", i2: "right", i3: "left", i4: "right", i5: "left", i6: "right", i7: "left", i8: "right",
  i9: "left", i10: "left", i11: "right", i12: "left", i13: "right", i14: "left", i15: "right",
};

/** Marca en miniatura: logotipo real (1–9) o montaña genérica (10–15). */
function Mark({ cx, cy, r, real, pid }: { cx: number; cy: number; r: number; real: boolean; pid: string }) {
  if (real)
    return (
      <g>
        <clipPath id={`${pid}-c${cx}-${cy}`}><circle cx={cx} cy={cy} r={r} /></clipPath>
        <image href="/coffee-bike-logo.webp" x={cx - r} y={cy - r} width={r * 2} height={r * 2} clipPath={`url(#${pid}-c${cx}-${cy})`} />
      </g>
    );
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={INK} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke="#fff" strokeWidth={Math.max(0.8, r * 0.05)} />
      <path d={`M${cx - r * 0.55} ${cy + r * 0.28} L${cx - r * 0.15} ${cy - r * 0.38} L${cx + r * 0.05} ${cy - r * 0.06} L${cx + r * 0.25} ${cy - r * 0.48} L${cx + r * 0.58} ${cy + r * 0.28} Z`} fill="#fff" />
    </g>
  );
}

function Lamp({ x, len = 46 }: { x: number; len?: number }) {
  return (
    <g stroke={INK} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x} 0 V${len}`} fill="none" />
      <path d={`M${x - 16} ${len + 16} Q${x - 15} ${len} ${x} ${len} Q${x + 15} ${len} ${x + 16} ${len + 16} Z`} fill={INK} />
      <path d={`M${x - 5} ${len + 17} q5 6 10 0`} fill="#fff4cf" />
      <path d={`M${x - 26} ${len + 30} l-6 6 M${x} ${len + 32} v8 M${x + 26} ${len + 30} l6 6`} fill="none" opacity="0.5" />
    </g>
  );
}

function CoffeeBag({ x, y, real, pid, s = 1 }: { x: number; y: number; real: boolean; pid: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={SW / s} strokeLinejoin="round">
      <path d="M-15 -40 h30 l3 40 h-36 Z" fill="#fff" />
      <path d="M-15 -40 l3 -6 h24 l3 6" fill="#fff" />
      <path d="M-9 -43 h18" fill="none" strokeDasharray="2 2" />
      <rect x="-11" y="-30" width="22" height="20" fill={INK} stroke="none" />
      <g transform={`translate(0 -20)`}><Mark cx={0} cy={0} r={7.5} real={real} pid={`${pid}b${x}`} /></g>
    </g>
  );
}

function Shelf({ x, real, pid }: { x: number; real: boolean; pid: string }) {
  return (
    <g>
      {[0, 1, 2].map((i) => <CoffeeBag key={i} x={x + 22 + i * 40} y={98} real={real} pid={pid} s={0.92} />)}
      <rect x={x} y={98} width="132" height="7" rx="2" fill={WOOD} stroke={INK} strokeWidth={SW} />
      <path d={`M${x + 12} 105 l8 12 M${x + 120} 105 l-8 12`} stroke={INK} strokeWidth={SW} strokeLinecap="round" />
      {[0, 1].map((i) => (
        <g key={i} stroke={INK} strokeWidth={SW}>
          <rect x={x + 18 + i * 56} y={140} width="28" height="30" rx="5" fill="#fff" />
          <rect x={x + 18 + i * 56} y={152} width="28" height="18" rx="4" fill={i ? "#7a5232" : "#3b2416"} />
          <rect x={x + 15 + i * 56} y={134} width="34" height="8" rx="2" fill={INK} />
        </g>
      ))}
      <rect x={x} y={170} width="132" height="7" rx="2" fill={WOOD} stroke={INK} strokeWidth={SW} />
    </g>
  );
}

function Menu({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="118" height="84" rx="4" fill={INK} stroke={WOOD_D} strokeWidth="5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={x + 12} y={y + 14 + i * 13} width={52 - (i % 2) * 12} height="4" rx="2" fill="#fff" />
          <rect x={x + 88} y={y + 14 + i * 13} width="18" height="4" rx="2" fill={WOOD} />
        </g>
      ))}
      <path d={`M${x + 20} ${y} l-10 -26 M${x + 98} ${y} l10 -26`} stroke={INK} strokeWidth={SW} />
    </g>
  );
}

/** Ventana con la cordillera de la marca afuera. */
function Window({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
      <rect x={x} y={y} width="160" height="120" rx="6" fill="#fff" />
      <path d={`M${x + 4} ${y + 112} L${x + 40} ${y + 62} L${x + 58} ${y + 84} L${x + 92} ${y + 36} L${x + 128} ${y + 88} L${x + 144} ${y + 74} L${x + 156} ${y + 92} V${y + 116} H${x + 4} Z`} fill="#efe4d4" />
      <path d={`M${x + 82} ${y + 50} L${x + 92} ${y + 36} L${x + 102} ${y + 50} L${x + 96} ${y + 47} L${x + 92} ${y + 52} L${x + 88} ${y + 47} Z`} fill="#fff" />
      <path d={`M${x + 80} ${y} V${y + 120} M${x} ${y + 60} H${x + 160}`} fill="none" />
      <rect x={x - 8} y={y + 118} width="176" height="9" rx="2" fill={WOOD} />
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const leaf = (cx: number, cy: number, rot: number, len = 18) => (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <path d={`M0 0 C${len * 0.4} -8 ${len} -5 ${len * 1.2} 0 C${len} 5 ${len * 0.4} 8 0 0 Z`} fill="#fff" stroke={INK} strokeWidth={SW / s} />
      <path d={`M2 0 H${len}`} stroke={INK} strokeWidth={1.2 / s} />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 q-2 -26 2 -50 M0 0 q12 -18 20 -32 M0 0 q-12 -16 -20 -28" stroke={INK} strokeWidth={SW / s} fill="none" strokeLinecap="round" />
      {leaf(2, -50, -95, 16)}{leaf(1, -36, -150)}{leaf(1, -32, -30)}{leaf(20, -32, -55, 15)}{leaf(-20, -28, -125, 15)}{leaf(0, -16, -165, 14)}{leaf(0, -14, -15, 14)}
      <path d="M-16 0 h32 l-4 26 h-24 Z" fill={INK} stroke={INK} strokeWidth={SW / s} strokeLinejoin="round" />
      <rect x="-18" y="-3" width="36" height="7" rx="2" fill="#fff" stroke={INK} strokeWidth={SW / s} />
    </g>
  );
}

function Hanging({ x }: { x: number }) {
  return (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
      <path d={`M${x} 0 V24`} />
      <path d={`M${x - 14} 24 h28 l-4 16 h-20 Z`} fill={INK} />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={x + (i % 2 ? 10 : -10)} cy={48 + i * 11} rx="5.5" ry="8.5" fill="#fff" transform={`rotate(${i % 2 ? 22 : -22} ${x + (i % 2 ? 10 : -10)} ${48 + i * 11})`} />
      ))}
    </g>
  );
}

function Machine({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
      <rect x={x} y={y} width="96" height="70" rx="6" fill={INK} />
      <rect x={x + 6} y={y - 12} width="84" height="14" rx="3" fill="#fff" />
      {[0, 1, 2].map((i) => <rect key={i} x={x + 14 + i * 24} y={y - 26} width="16" height="14" rx="2" fill="#fff" />)}
      <rect x={x + 12} y={y + 10} width="72" height="12" rx="3" fill="#fff" />
      <circle cx={x + 24} cy={y + 16} r="2.4" fill={INK} stroke="none" />
      <circle cx={x + 72} cy={y + 16} r="2.4" fill={INK} stroke="none" />
      <path d={`M${x + 22} ${y + 30} h20 v8 h-20 Z M${x + 54} ${y + 30} h20 v8 h-20 Z`} fill="#fff" />
      <path d={`M${x + 26} ${y + 50} h12 l-2 12 h-8 Z M${x + 58} ${y + 50} h12 l-2 12 h-8 Z`} fill="#fff" />
    </g>
  );
}

/** Vaso para llevar con manga de cartón y la marca. */
function Cup({ x, y, real, pid, steam }: { x: number; y: number; real: boolean; pid: string; steam?: boolean }) {
  return (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
      {steam && <path d={`M${x - 6} ${y - 40} c-6 -7 6 -11 0 -19 M${x + 6} ${y - 40} c-6 -7 6 -11 0 -19`} fill="none" strokeLinecap="round" opacity="0.7" />}
      <path d={`M${x - 15} ${y - 34} h30 l-4 34 h-22 Z`} fill="#fff" />
      <path d={`M${x - 14} ${y - 24} h28 l-1.6 16 h-24.8 Z`} fill={WOOD} />
      <path d={`M${x - 17} ${y - 34} h34 l-1.5 -6 h-31 Z`} fill={INK} />
      <g stroke="none"><Mark cx={x} cy={y - 16} r={6} real={real} pid={`${pid}u${x}`} /></g>
    </g>
  );
}

/** Mostrador: cubierta de madera y frente negro con la marca (como el carrito). */
function Counter({ real, pid, logoX }: { real: boolean; pid: string; logoX: number }) {
  return (
    <g>
      <rect x="-10" y="262" width="660" height="90" fill={INK} />
      <path d="M20 274 V340 M620 274 V340" stroke="#333" strokeWidth="2" />
      <rect x="-10" y="250" width="660" height="14" fill={WOOD} stroke={INK} strokeWidth={SW} />
      <rect x="-10" y="250" width="660" height="3" fill="#fff" opacity="0.5" />
      <Mark cx={logoX} cy={300} r={30} real={real} pid={pid} />
    </g>
  );
}

export default function CafeScene({ id }: { id: string }) {
  const real = Number(id.slice(1)) <= 9;
  const layout = LAYOUT[id] ?? "wall";
  const side = SIDE[id] ?? "left";
  const pid = `cs-${id}`;
  // El contexto ocupa un lado; el personaje se ubica del lado contrario, apoyado detrás del mostrador.
  const ctxX = side === "left" ? 24 : 470;
  const charX = side === "left" ? 360 : 280; // centro del personaje
  const cupX = side === "left" ? 560 : 80;
  return (
    <svg viewBox="0 0 640 340" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`${pid}-wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf5ec" /><stop offset="1" stopColor="#efe2cd" /></linearGradient>
        <radialGradient id={`${pid}-sun`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ead3ae" /><stop offset="0.6" stopColor="#e4c899" stopOpacity="0.8" /><stop offset="1" stopColor="#e4c899" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="640" height="340" fill={`url(#${pid}-wall)`} />
      <path d="M0 230 H640" stroke={WOOD_D} strokeWidth="1.5" opacity="0.35" />

      {layout === "wall" && (<><Lamp x={side === "left" ? 90 : 550} /><Shelf x={ctxX} real={real} pid={pid} /></>)}
      {layout === "window" && (<><Window x={side === "left" ? 30 : 450} y={44} /><Hanging x={side === "left" ? 214 : 426} /></>)}
      {layout === "bar" && (<><Menu x={side === "left" ? 40 : 482} y={46} /><Lamp x={side === "left" ? 186 : 454} len={30} /></>)}
      {layout === "plain" && (<><Hanging x={60} /><Hanging x={590} /></>)}

      <circle cx={charX} cy={150} r={120} fill={`url(#${pid}-sun)`} />
      {/* Personaje (blanco del dibujo se funde con la pared) */}
      <image href={`/api/ilustraciones/${id}`} x={charX - 150} y={30} width="300" height="250" preserveAspectRatio="xMidYMax meet" style={{ mixBlendMode: "multiply" }} />

      {/* Objetos sobre el mostrador */}
      {layout === "bar" && <Machine x={side === "left" ? 40 : 506} y={180} />}
      {layout !== "bar" && <Plant x={side === "left" ? 120 : 520} y={250} s={1} />}
      <Cup x={cupX} y={250} real={real} pid={pid} steam />
      <Counter real={real} pid={pid} logoX={side === "left" ? 150 : 490} />
    </svg>
  );
}
