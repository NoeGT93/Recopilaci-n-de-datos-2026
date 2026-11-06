"use client";
// Ilustración de referencia por afirmación (SVG, paleta de la marca). Muestra el TEMA de la pregunta con
// elementos genéricos (insignia de montañas, letreros sin texto) y no el logotipo ni el nombre real, para no
// adelantar las respuestas de reconocimiento (ítems 10–15). Luz desde arriba a la izquierda en todas las escenas.
import { createContext, useContext, useState } from "react";
import ItemIcon from "./ItemIcon";

const C = {
  ink: "#151515", white: "#fffaf3", paper: "#fbf6ee",
  wood: "#d8b98a", woodLight: "#e7cfa6", woodDark: "#a77b49", woodDeep: "#7d5631",
  coffee: "#4a2c1a", coffeeLight: "#6b4128", crema: "#c99a63", foam: "#f1dfc4",
  leaf: "#5f7f57", leafLight: "#86a37a", leafDark: "#46613f",
  accent: "#9a5523", line: "#d9cbb7", muted: "#cbb89c",
};

/** Oscurece (amt < 0) o aclara (amt > 0) un color hex. */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Prefijo único por banner para los gradientes (el admin muestra los 15 a la vez).
const Pid = createContext("b");
const useG = () => {
  const p = useContext(Pid);
  return (name: string) => `url(#${p}-${name})`;
};

function Defs({ p }: { p: string }) {
  return (
    <defs>
      <linearGradient id={`${p}-wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8efe3" /><stop offset="1" stopColor="#ead9c2" /></linearGradient>
      <radialGradient id={`${p}-glow`} cx="0.8" cy="0.15" r="0.75"><stop offset="0" stopColor="#fff" stopOpacity="0.75" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${p}-top`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.woodLight} /><stop offset="1" stopColor={C.wood} /></linearGradient>
      <linearGradient id={`${p}-front`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.woodDark} /><stop offset="1" stopColor={C.woodDeep} /></linearGradient>
      <linearGradient id={`${p}-black`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2c2c2c" /><stop offset="0.6" stopColor="#1a1a1a" /><stop offset="1" stopColor="#0c0c0c" /></linearGradient>
      <linearGradient id={`${p}-cup`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffffff" /><stop offset="0.55" stopColor="#f6efe4" /><stop offset="1" stopColor="#dfd3c1" /></linearGradient>
      <linearGradient id={`${p}-glass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fdf8f0" /><stop offset="1" stopColor="#efe2cd" /></linearGradient>
      <radialGradient id={`${p}-latte`} cx="0.45" cy="0.4" r="0.7"><stop offset="0" stopColor={C.foam} /><stop offset="0.7" stopColor={C.crema} /><stop offset="1" stopColor={C.coffeeLight} /></radialGradient>
      <linearGradient id={`${p}-leaf`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.leafLight} /><stop offset="1" stopColor={C.leafDark} /></linearGradient>
      <linearGradient id={`${p}-pot`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fffdf8" /><stop offset="1" stopColor="#e2d6c4" /></linearGradient>
      <linearGradient id={`${p}-sheen`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0.28" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.14" /></linearGradient>
    </defs>
  );
}

// ---------------------------------------------------------------- Personajes

type Hair = "bun" | "short" | "curly" | "pony" | "long" | "fade";
type PersonProps = {
  x: number; y?: number; flip?: boolean;
  skin?: string; hair?: string; style?: Hair;
  shirt?: string; sleeve?: "short" | "long"; apron?: boolean; cap?: boolean;
  hand?: [number, number]; rest?: "down" | "hip";
  glasses?: boolean; beard?: boolean; mouth?: "smile" | "open" | "soft";
  lookAt?: number; // desplazamiento horizontal de la mirada
};

const SKINS = { light: "#f0c7a0", tan: "#d9a273", brown: "#b07a4f", deep: "#7c5236" };

function HairBack({ x, y, style, color }: { x: number; y: number; style: Hair; color: string }) {
  if (style === "long") return <path d={`M${x - 21} ${y - 4} C${x - 26} ${y + 22} ${x - 22} ${y + 44} ${x - 14} ${y + 52} L${x + 14} ${y + 52} C${x + 22} ${y + 44} ${x + 26} ${y + 22} ${x + 21} ${y - 4} Z`} fill={shade(color, -0.12)} />;
  if (style === "pony") return <path d={`M${x + 14} ${y - 12} C${x + 34} ${y - 8} ${x + 36} ${y + 22} ${x + 24} ${y + 40} C${x + 30} ${y + 18} ${x + 24} ${y + 2} ${x + 12} ${y - 2} Z`} fill={shade(color, -0.1)} />;
  if (style === "bun") return <g><circle cx={x - 2} cy={y - 25} r={10} fill={color} /><path d={`M${x - 9} ${y - 25} q7 -6 14 0`} stroke={shade(color, 0.25)} strokeWidth="1.5" fill="none" opacity="0.7" /><rect x={x - 8} y={y - 18} width="12" height="3.5" rx="1.5" fill={C.accent} /></g>;
  return null;
}

function HairFront({ x, y, style, color }: { x: number; y: number; style: Hair; color: string }) {
  const hl = shade(color, 0.28);
  switch (style) {
    case "curly":
      return (
        <g fill={color}>
          {[[-16, -6], [-12, -15], [-3, -20], [7, -19], [15, -12], [18, -2], [-19, 3], [19, 6]].map(([dx, dy], i) => <circle key={i} cx={x + dx} cy={y + dy} r={8.5} />)}
          <path d={`M${x - 8} ${y - 19} q4 -3 8 0`} stroke={hl} strokeWidth="1.6" fill="none" opacity="0.7" />
        </g>
      );
    case "fade":
      return (
        <g>
          <path d={`M${x - 19} ${y - 2} C${x - 21} ${y - 26} ${x + 21} ${y - 26} ${x + 19} ${y - 2} C${x + 15} ${y - 10} ${x + 8} ${y - 13} ${x} ${y - 13} C${x - 8} ${y - 13} ${x - 15} ${y - 10} ${x - 19} ${y - 2} Z`} fill={color} />
          <path d={`M${x - 6} ${y - 18} q7 -3 13 0`} stroke={hl} strokeWidth="1.4" fill="none" opacity="0.45" strokeLinecap="round" />
        </g>
      );
    case "short":
      return (
        <g>
          <path d={`M${x - 20} ${y + 2} C${x - 23} ${y - 22} ${x + 4} ${y - 30} ${x + 20} ${y - 12} C${x + 22} ${y - 6} ${x + 21} ${y} ${x + 20} ${y + 3} C${x + 14} ${y - 8} ${x + 2} ${y - 9} ${x - 6} ${y - 14} C${x - 9} ${y - 6} ${x - 14} ${y - 2} ${x - 20} ${y + 2} Z`} fill={color} />
          <path d={`M${x - 2} ${y - 17} q8 -1 13 5`} stroke={hl} strokeWidth="1.6" fill="none" opacity="0.5" strokeLinecap="round" />
        </g>
      );
    default: // bun, pony, long: raya al costado con mechones sobre la frente
      return (
        <g>
          <path d={`M${x - 20} ${y + 4} C${x - 24} ${y - 22} ${x + 22} ${y - 28} ${x + 21} ${y + 2} C${x + 16} ${y - 10} ${x + 6} ${y - 12} ${x - 2} ${y - 16} C${x - 6} ${y - 8} ${x - 14} ${y - 2} ${x - 20} ${y + 4} Z`} fill={color} />
          <path d={`M${x - 5} ${y - 15} q8 -4 15 1`} stroke={hl} strokeWidth="1.6" fill="none" opacity="0.5" strokeLinecap="round" />
          <path d={`M${x - 2} ${y - 15} q-4 8 -12 12`} stroke={shade(color, -0.25)} strokeWidth="1.2" fill="none" />
        </g>
      );
  }
}

/** Mano con palma, pulgar y nudillos sugeridos; `a` = ángulo hacia donde apunta. */
function Hand({ x, y, a, skin }: { x: number; y: number; a: number; skin: string }) {
  const dark = shade(skin, -0.18);
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <ellipse cx="0" cy="0" rx="8" ry="6.6" fill={skin} stroke={dark} strokeWidth="0.9" />
      <ellipse cx="7.5" cy="-0.5" rx="4.2" ry="5.6" fill={skin} stroke={dark} strokeWidth="0.9" />
      <ellipse cx="2" cy="0" rx="7" ry="5.6" fill={skin} />
      <path d="M6 -4.2 v8.4 M9.4 -3.6 v7.2" stroke={dark} strokeWidth="0.8" opacity="0.7" />
      <ellipse cx="-1" cy="-6" rx="4" ry="2.4" transform="rotate(-25)" fill={skin} stroke={dark} strokeWidth="0.7" />
      <path d="M-6 2 q4 3 9 2" stroke={dark} strokeWidth="0.8" fill="none" opacity="0.6" />
    </g>
  );
}

/** Persona de medio cuerpo, detrás del mostrador. */
function Person(props: PersonProps) {
  const {
    x, y = 66, flip, skin = SKINS.light, hair = "#2b1d14", style = "short", shirt = C.white, sleeve = "long",
    apron, cap, hand, rest = "down", glasses, beard, mouth = "smile", lookAt = 0,
  } = props;
  const s = flip ? -1 : 1;
  const skinD = shade(skin, -0.16);
  const shirtD = shade(shirt, -0.14);
  const t = y - 10; // hombros más cerca de la cabeza (cuello corto)
  // Brazo que alcanza algo
  const sx = x + 24 * s, sy = t + 52;
  const [hx, hy] = hand ?? [x + 30 * s, t + 118];
  const ex = (sx + hx) / 2 + 2 * s, ey = Math.max(sy, hy) + 16;
  const ang = (Math.atan2(hy - ey, hx - ex) * 180) / Math.PI;
  const midX = (ex + hx) / 2, midY = (ey + hy) / 2; // fin de la manga corta / inicio del antebrazo
  return (
    <g>
      <HairBack x={x} y={y} style={style} color={hair} />
      {/* Brazo de apoyo (atrás) */}
      <path d={`M${x - 24 * s} ${t + 52} Q${x - 34 * s} ${t + 86} ${x - 30 * s} ${rest === "hip" ? y + 104 : y + 130}`} stroke={shirtD} strokeWidth="15" strokeLinecap="round" fill="none" />
      {/* Torso con hombros */}
      <path d={`M${x - 36} 222 C${x - 38} ${t + 82} ${x - 34} ${t + 50} ${x - 15} ${t + 42} L${x + 15} ${t + 42} C${x + 34} ${t + 50} ${x + 38} ${t + 82} ${x + 36} 222 Z`} fill={shirt} />
      <path d={`M${x + 10 * s} ${t + 44} C${x + 32 * s} ${t + 54} ${x + 37 * s} ${t + 90} ${x + 36 * s} 222 L${x + 22 * s} 222 C${x + 26 * s} ${t + 120} ${x + 22 * s} ${t + 70} ${x + 10 * s} ${t + 44} Z`} fill="#000" opacity="0.08" />
      <path d={`M${x - 4} ${t + 96} q2 30 -2 60 M${x + 12} ${t + 104} q-2 22 2 44`} stroke={shirtD} strokeWidth="1.2" fill="none" opacity="0.5" />
      {/* Cuello y cuello de la camisa */}
      <path d={`M${x - 7} ${y + 14} h14 v20 h-14 Z`} fill={skin} />
      <path d={`M${x - 7} ${y + 17} q7 6 14 0 v6 q-7 5 -14 0 Z`} fill={skinD} opacity="0.7" />
      <path d={`M${x - 15} ${t + 42} L${x} ${t + 58} L${x + 15} ${t + 42} L${x + 9} ${t + 40} L${x} ${t + 50} L${x - 9} ${t + 40} Z`} fill={shirtD} />
      {apron && (
        <g>
          <path d={`M${x - 9} ${t + 40} L${x - 18} ${t + 70} M${x + 9} ${t + 40} L${x + 18} ${t + 70}`} stroke={C.coffee} strokeWidth="3.4" strokeLinecap="round" />
          <path d={`M${x - 19} ${t + 66} h38 l3 156 h-44 Z`} fill={C.coffee} />
          <path d={`M${x - 19} ${t + 66} h38 l1 10 h-40 Z`} fill={C.coffeeLight} />
          <rect x={x - 13} y={y + 104} width="26" height="18" rx="2.5" fill={C.coffeeLight} />
          <path d={`M${x} ${t + 104} v18`} stroke={C.coffee} strokeWidth="1" />
          <circle cx={x - 15} cy={y + 70} r="1.6" fill={C.wood} />
          <circle cx={x + 15} cy={y + 70} r="1.6" fill={C.wood} />
        </g>
      )}
      {/* Brazo que alcanza: manga y antebrazo */}
      {sleeve === "short" ? (
        <>
          <path d={`M${sx} ${sy} Q${ex} ${ey} ${hx} ${hy}`} stroke={skin} strokeWidth="11.5" strokeLinecap="round" fill="none" />
          <path d={`M${sx} ${sy} Q${(sx + ex) / 2 + 4 * s} ${ey - 8} ${(sx + ex) / 2 + 2 * s} ${(sy + ey) / 2 + 6}`} stroke={shirt} strokeWidth="17" strokeLinecap="round" fill="none" />
          <path d={`M${(sx + ex) / 2 - 6 * s} ${(sy + ey) / 2 + 12} l12 ${-4}`} stroke={shirtD} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={`M${sx} ${sy} Q${ex} ${ey} ${midX} ${midY}`} stroke={shirt} strokeWidth="16" strokeLinecap="round" fill="none" />
          <path d={`M${sx} ${sy} Q${ex} ${ey} ${midX} ${midY}`} stroke="#000" strokeWidth="16" strokeLinecap="round" fill="none" opacity="0.06" />
          <path d={`M${midX} ${midY} L${hx - 7 * Math.cos((ang * Math.PI) / 180)} ${hy - 7 * Math.sin((ang * Math.PI) / 180)}`} stroke={shirt} strokeWidth="14" strokeLinecap="round" />
          <path d={`M${hx - 9 * Math.cos((ang * Math.PI) / 180)} ${hy - 9 * Math.sin((ang * Math.PI) / 180)} l${-4 * Math.sin((ang * Math.PI) / 180)} ${4 * Math.cos((ang * Math.PI) / 180)}`} stroke={shirtD} strokeWidth="9" strokeLinecap="round" />
        </>
      )}
      <Hand x={hx} y={hy} a={ang} skin={skin} />
      {/* Cabeza */}
      <ellipse cx={x - 18} cy={y + 3} rx="4" ry="5.5" fill={skinD} />
      <ellipse cx={x + 18} cy={y + 3} rx="4" ry="5.5" fill={skinD} />
      <ellipse cx={x} cy={y} rx="18.5" ry="20.5" fill={skin} />
      <path d={`M${x + 6 * s} ${y - 19} C${x + 22 * s} ${y - 10} ${x + 20 * s} ${y + 14} ${x + 4 * s} ${y + 20} C${x + 14 * s} ${y + 8} ${x + 14 * s} ${y - 8} ${x + 6 * s} ${y - 19} Z`} fill="#000" opacity="0.07" />
      <ellipse cx={x - 7 * s} cy={y - 6} rx="6" ry="4" fill="#fff" opacity="0.18" />
      {/* Rostro */}
      <g transform={`translate(${lookAt * s} 0)`}>
        <path d={`M${x - 11} ${y - 7} q4 -3 8 -0.5 M${x + 3} ${y - 7.5} q4 -2.5 8 0.5`} stroke={shade(hair, -0.1)} strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx={x - 6.5} cy={y - 1} rx="2.4" ry="2.9" fill={C.ink} />
        <ellipse cx={x + 6.5} cy={y - 1} rx="2.4" ry="2.9" fill={C.ink} />
        <circle cx={x - 5.7} cy={y - 2} r="0.9" fill="#fff" />
        <circle cx={x + 7.3} cy={y - 2} r="0.9" fill="#fff" />
        <path d={`M${x + 1 * s} ${y + 1} q${2.5 * s} 4.5 ${-0.5 * s} 6.5`} stroke={skinD} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <ellipse cx={x - 11} cy={y + 6} rx="3.6" ry="2.2" fill="#e07a5f" opacity="0.22" />
        <ellipse cx={x + 11} cy={y + 6} rx="3.6" ry="2.2" fill="#e07a5f" opacity="0.22" />
        {mouth === "open" ? (
          <path d={`M${x - 5} ${y + 10} q5 7 10 0 Z`} fill="#7a2e22" />
        ) : mouth === "soft" ? (
          <path d={`M${x - 3.5} ${y + 11} q3.5 2 7 0`} stroke="#8a3b2c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        ) : (
          <path d={`M${x - 5.5} ${y + 9.5} q5.5 5 11 0`} stroke="#8a3b2c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}
        {glasses && (
          <g stroke={C.ink} strokeWidth="1.4" fill="#fff" fillOpacity="0.15">
            <rect x={x - 12} y={y - 5.5} width="10" height="8" rx="3" />
            <rect x={x + 2} y={y - 5.5} width="10" height="8" rx="3" />
            <path d={`M${x - 2} ${y - 2} h4`} />
          </g>
        )}
      </g>
      {beard && <path d={`M${x - 16} ${y + 4} C${x - 14} ${y + 24} ${x + 14} ${y + 24} ${x + 16} ${y + 4} C${x + 10} ${y + 16} ${x - 10} ${y + 16} ${x - 16} ${y + 4} Z`} fill={hair} opacity="0.85" />}
      <HairFront x={x} y={y} style={style} color={hair} />
      {cap && (
        <g>
          <path d={`M${x - 20} ${y - 6} C${x - 20} ${y - 30} ${x + 20} ${y - 30} ${x + 20} ${y - 6} Z`} fill={C.ink} />
          <path d={`M${x + 4 * s} ${y - 7} q${22 * s} -2 ${28 * s} 4 l${-26 * s} 1 Z`} fill="#000" />
          <circle cx={x - 2} cy={y - 20} r="4.5" fill={C.wood} />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------- Objetos

/** Insignia genérica de montañas (no es el logotipo de la marca). */
function Badge({ x, y, r, color = C.ink, mark = C.white }: { x: number; y: number; r: number; color?: string; mark?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} />
      <circle cx={x} cy={y} r={r * 0.86} fill="none" stroke={mark} strokeWidth={Math.max(0.6, r * 0.06)} opacity="0.9" />
      <path d={`M${x - r * 0.55} ${y + r * 0.28} L${x - r * 0.15} ${y - r * 0.38} L${x + r * 0.05} ${y - r * 0.06} L${x + r * 0.25} ${y - r * 0.48} L${x + r * 0.58} ${y + r * 0.28} Z`} fill={mark} />
      <path d={`M${x - r * 0.5} ${y + r * 0.42} h${r}`} stroke={mark} strokeWidth={Math.max(0.6, r * 0.06)} />
    </g>
  );
}

const Shadow = ({ x, y, rx, ry = 4, o = 0.16 }: { x: number; y: number; rx: number; ry?: number; o?: number }) => <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#3a2414" opacity={o} />;

/** Vaso para llevar con tapa, manga de cartón y la insignia. */
function Cup({ x, y, s = 1, badge = true }: { x: number; y: number; s?: number; badge?: boolean }) {
  const g = useG();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={0} y={13} rx={13} ry={2.6} />
      <path d="M-11.5 -17 h23 l-3.2 30 h-16.6 Z" fill={g("cup")} />
      <path d="M-10.6 -8 h21.2 l-1.4 14 h-18.4 Z" fill={C.wood} />
      <path d="M-10.6 -8 h21.2 l-0.3 2.4 h-20.6 Z" fill={C.woodDark} opacity="0.5" />
      {badge && <Badge x={0} y={-1} r={4.2} />}
      <path d="M-13 -18 h26 l-1 -4.5 h-24 Z" fill={C.ink} />
      <rect x="-13.6" y="-18.6" width="27.2" height="3" rx="1.4" fill="#2b2b2b" />
      <path d="M-8 -22.5 h4" stroke="#444" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M-9 -15 l2.2 26" stroke="#fff" strokeWidth="1.6" opacity="0.6" />
    </g>
  );
}

/** Taza de cerámica con latte art. */
function Mug({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const g = useG();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="22" rx="42" ry="7" fill="#e6d6bf" />
      <ellipse cx="0" cy="21" rx="36" ry="5" fill="#f5ebdc" />
      <Shadow x={2} y={20} rx={28} ry={3.5} o={0.2} />
      <path d="M30 -8 c18 -2 20 22 2 24" stroke="#e6dccc" strokeWidth="7" fill="none" />
      <path d="M30 -8 c18 -2 20 22 2 24" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M-30 -18 h60 l-6 34 a8 8 0 0 1 -8 6 h-32 a8 8 0 0 1 -8 -6 Z" fill={g("cup")} />
      <ellipse cx="0" cy="-18" rx="30" ry="6.5" fill="#efe6d8" />
      <ellipse cx="0" cy="-17.5" rx="26" ry="5.2" fill={g("latte")} />
      <path d="M0 -14.5 c-6 -3 -6 -7 -2 -7.5 c1.5 0 2 1 2 1 c0 0 0.5 -1 2 -1 c4 0.5 4 4.5 -2 7.5 Z" fill="#fff8ee" />
      <path d="M-24 -12 l4 24" stroke="#fff" strokeWidth="2.4" opacity="0.7" strokeLinecap="round" />
    </g>
  );
}

const Steam = ({ x, y, n = 3 }: { x: number; y: number; n?: number }) => (
  <g stroke="#b99a74" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7">
    {Array.from({ length: n }, (_, i) => <path key={i} d={`M${x + i * 12} ${y} c-7 -8 7 -12 0 -22`} />)}
  </g>
);

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const g = useG();
  const leaf = (cx: number, cy: number, rot: number, len = 13) => (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <path d={`M0 0 C${len * 0.45} -6 ${len} -3 ${len * 1.25} 0 C${len} 3 ${len * 0.45} 6 0 0 Z`} fill={g("leaf")} />
      <path d={`M1 0 L${len * 1.1} 0`} stroke={C.leafDark} strokeWidth="0.8" opacity="0.6" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={0} y={20} rx={15} ry={3} />
      <path d="M0 0 q-3 -18 1 -36 M0 0 q8 -14 14 -24 M0 0 q-10 -12 -15 -20" stroke={C.leafDark} strokeWidth="1.8" fill="none" />
      {leaf(1, -36, -100, 12)}{leaf(1, -28, -150)}{leaf(1, -24, -30)}{leaf(14, -24, -60, 11)}{leaf(-15, -20, -130, 11)}{leaf(0, -12, -170, 10)}{leaf(0, -10, -10, 10)}
      <path d="M-13 0 h26 l-3 19 a3 3 0 0 1 -3 2.5 h-14 a3 3 0 0 1 -3 -2.5 Z" fill={g("pot")} />
      <rect x="-14.5" y="-2" width="29" height="5" rx="2" fill="#f4ece0" stroke={C.line} strokeWidth="0.8" />
    </g>
  );
}

function Hanging({ x, len = 34 }: { x: number; len?: number }) {
  const g = useG();
  return (
    <g>
      <path d={`M${x} 0 v${len - 14}`} stroke={C.woodDark} strokeWidth="1.2" />
      <path d={`M${x - 12} ${len - 14} h24 l-3 12 h-18 Z`} fill={g("pot")} stroke={C.line} strokeWidth="0.8" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={x + (i % 2 ? 9 : -9) + (i % 3) - 1} cy={len + i * 9} rx="4.6" ry="7" fill={g("leaf")} transform={`rotate(${i % 2 ? 20 : -20} ${x + (i % 2 ? 9 : -9)} ${len + i * 9})`} />
      ))}
      <path d={`M${x - 9} ${len - 2} q-2 30 4 50 M${x + 9} ${len - 2} q3 26 -2 44`} stroke={C.leafDark} strokeWidth="1" fill="none" />
    </g>
  );
}

function Board({ x, y, w = 112, h = 74 }: { x: number; y: number; w?: number; h?: number }) {
  const g = useG();
  return (
    <g>
      <Shadow x={x + w / 2 + 4} y={y + h + 3} rx={w / 2} ry={3} o={0.1} />
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx="6" fill={g("front")} />
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#1d1d1d" />
      <rect x={x} y={y} width={w} height={h} rx="3" fill={g("sheen")} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={x + 12} y={y + 13 + i * 14} width={w - 52 - (i % 2) * 14} height="3.6" rx="1.8" fill="#efe6d8" opacity="0.92" />
          <rect x={x + w - 28} y={y + 13 + i * 14} width="16" height="3.6" rx="1.8" fill={C.wood} opacity="0.9" />
        </g>
      ))}
    </g>
  );
}

function Window({ x = 452, y = 22 }: { x?: number; y?: number }) {
  return (
    <g>
      <rect x={x} y={y} width="152" height="100" rx="6" fill="#fbf4ea" />
      <path d={`M${x + 8} ${y + 92} l30 -36 l18 18 l26 -34 l36 52 Z`} fill="#e8d9c3" />
      <path d={`M${x + 70} ${y + 92} l26 -26 l22 22 Z`} fill="#dccab0" />
      <path d={`M${x + 18} ${y + 8} l36 0 l-40 84 l-20 0 Z`} fill="#fff" opacity="0.55" />
      <rect x={x} y={y} width="152" height="100" rx="6" fill="none" stroke={C.wood} strokeWidth="5" />
      <path d={`M${x + 76} ${y} v100 M${x} ${y + 50} h152`} stroke={C.wood} strokeWidth="3.5" />
      <rect x={x - 6} y={y + 100} width="164" height="6" rx="2" fill={C.woodDark} />
    </g>
  );
}

function Shelf({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="120" height="6" rx="2" fill={C.woodDark} />
      <path d={`M${x + 10} ${y + 6} l6 10 M${x + 110} ${y + 6} l-6 10`} stroke={C.woodDeep} strokeWidth="3" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={x + 10 + i * 36} y={y - 26} width="24" height="26" rx="5" fill="#f3ebdf" stroke={C.line} />
          <rect x={x + 10 + i * 36} y={y - 14} width="24" height="14" rx="4" fill={[C.coffee, C.crema, C.coffeeLight][i]} opacity="0.9" />
          <rect x={x + 8 + i * 36} y={y - 30} width="28" height="6" rx="2" fill={C.woodDark} />
        </g>
      ))}
    </g>
  );
}

/** Mostrador de madera con cubierta, frente con vetas y zócalo. */
function Counter({ y = 160 }: { y?: number }) {
  const g = useG();
  return (
    <g>
      <rect x="0" y={y + 9} width="640" height={220 - y} fill={g("front")} />
      {[60, 180, 300, 420, 540].map((vx) => <path key={vx} d={`M${vx} ${y + 18} q10 20 0 40`} stroke={C.woodDeep} strokeWidth="1" fill="none" opacity="0.35" />)}
      <rect x="0" y={y + 9} width="640" height="5" fill="#000" opacity="0.14" />
      <rect x="0" y={y} width="640" height="10" fill={g("top")} />
      <rect x="0" y={y} width="640" height="2" fill="#fff" opacity="0.45" />
    </g>
  );
}

/** Carrito de café: cuerpo negro, cubierta de madera, repisas, ruedas y la insignia genérica. */
function Cart({ x, w = 160, badge = true }: { x: number; w?: number; badge?: boolean }) {
  const g = useG();
  return (
    <g>
      <Shadow x={x + w / 2} y={214} rx={w / 2 + 14} ry={6} o={0.18} />
      <rect x={x - 22} y={156} width="18" height="4" rx="1" fill="#222" />
      <rect x={x + w + 4} y={156} width="18" height="4" rx="1" fill="#222" />
      <rect x={x} y={150} width={w} height="58" rx="3" fill={g("black")} />
      <rect x={x + 6} y={156} width={w - 12} height="46" rx="2" fill="none" stroke="#2f2f2f" />
      <rect x={x - 10} y={141} width={w + 20} height="11" rx="2.5" fill={g("top")} />
      <rect x={x - 10} y={141} width={w + 20} height="2" rx="1" fill="#fff" opacity="0.5" />
      <rect x={x - 10} y={150} width={w + 20} height="2.5" fill={C.woodDeep} opacity="0.6" />
      {badge && <Badge x={x + w / 2} y={180} r={19} />}
      {[x + 18, x + w - 18].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={210} r="9" fill="#262626" />
          <circle cx={cx} cy={210} r="3.6" fill="#6d6d6d" />
          <circle cx={cx - 2} cy={207} r="1.4" fill="#fff" opacity="0.5" />
        </g>
      ))}
    </g>
  );
}

function Machine({ x, y }: { x: number; y: number }) {
  const g = useG();
  return (
    <g>
      <Shadow x={x + 26} y={y + 46} rx={34} ry={4} />
      <rect x={x} y={y} width="54" height="44" rx="5" fill={g("black")} />
      <rect x={x + 4} y={y - 6} width="46" height="8" rx="2" fill="#2a2a2a" />
      <rect x={x + 8} y={y + 8} width="38" height="6" rx="2" fill="#333" />
      <circle cx={x + 16} cy={y + 11} r="1.6" fill={C.accent} />
      <rect x={x + 20} y={y + 18} width="14" height="7" rx="2" fill="#555" />
      <rect x={x + 18} y={y + 34} width="18" height="6" rx="1" fill="#444" />
      <path d={`M${x + 34} ${y + 22} l14 -3`} stroke="#777" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function Bubble({ x, y, w = 60, h = 34, tail = "left", children }: { x: number; y: number; w?: number; h?: number; tail?: "left" | "right"; children?: React.ReactNode }) {
  const tx = tail === "left" ? x + 16 : x + w - 22;
  return (
    <g>
      <rect x={x + 2} y={y + 3} width={w} height={h} rx="11" fill="#000" opacity="0.06" />
      <rect x={x} y={y} width={w} height={h} rx="11" fill="#fff" stroke={C.line} />
      <path d={`M${tx} ${y + h - 1} l${tail === "left" ? -7 : 7} 11 l${tail === "left" ? 15 : -15} -11 Z`} fill="#fff" stroke={C.line} />
      <rect x={tx - 2} y={y + h - 3} width="20" height="4" fill="#fff" />
      {children}
    </g>
  );
}

const Check = ({ x, y, r = 14 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x + 1} cy={y + 2} r={r} fill="#000" opacity="0.1" />
    <circle cx={x} cy={y} r={r} fill={C.accent} />
    <path d={`M${x - r * 0.42} ${y} l${r * 0.3} ${r * 0.3} l${r * 0.55} -${r * 0.6}`} stroke="#fff" strokeWidth={r * 0.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const Heart = ({ x, y, s = 1, fill = C.accent }: { x: number; y: number; s?: number; fill?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 6 C-10 -2 -8 -10 -3 -10 C0 -10 0 -7 0 -7 C0 -7 0 -10 3 -10 C8 -10 10 -2 0 6Z" fill={fill} />
    <ellipse cx="-4" cy="-6" rx="1.8" ry="1.2" fill="#fff" opacity="0.5" />
  </g>
);

function Phone({ x, y, children }: { x: number; y: number; children?: React.ReactNode }) {
  return (
    <g>
      <rect x={x + 3} y={y + 4} width="76" height="138" rx="13" fill="#000" opacity="0.12" />
      <rect x={x} y={y} width="76" height="138" rx="13" fill="#1b1b1b" />
      <rect x={x + 5} y={y + 8} width="66" height="122" rx="8" fill="#fffaf3" />
      <rect x={x + 28} y={y + 3} width="20" height="3" rx="1.5" fill="#333" />
      {children}
    </g>
  );
}

function Bag({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const g = useG();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={2} y={25} rx={24} ry={3} />
      <path d="M-20 -30 h40 l4 54 h-48 Z" fill={g("glass")} />
      <path d="M8 -30 h12 l4 54 h-12 Z" fill="#000" opacity="0.06" />
      <path d="M-20 -30 l5 -9 h30 l5 9 Z" fill="#e8dcc9" />
      <path d="M-12 -34 h24" stroke={C.woodDark} strokeWidth="1.6" strokeDasharray="2 2" />
      <rect x="-14" y="-6" width="28" height="20" rx="2" fill={C.wood} />
      <Badge x={0} y={4} r={7} />
      <path d="M-16 18 h32" stroke={C.muted} strokeWidth="2" />
    </g>
  );
}

function Swatch({ x, y, c, label }: { x: number; y: number; c: string; label?: boolean }) {
  return (
    <g>
      <rect x={x + 1.5} y={y + 2.5} width="30" height="40" rx="5" fill="#000" opacity="0.08" />
      <rect x={x} y={y} width="30" height="40" rx="5" fill="#fff" stroke={C.line} />
      <rect x={x + 3} y={y + 3} width="24" height="24" rx="3" fill={c} />
      {label && <rect x={x + 6} y={y + 31} width="18" height="3" rx="1.5" fill={C.muted} />}
    </g>
  );
}

/** Pared con luz de ventana y zócalo. */
function Room() {
  const g = useG();
  return (
    <g>
      <rect width="640" height="220" fill={g("wall")} />
      <rect width="640" height="220" fill={g("glow")} />
      <path d="M0 196 h640" stroke={C.woodDark} strokeWidth="2" opacity="0.25" />
    </g>
  );
}

// ---------------------------------------------------------------- Escenas

function Scene({ id }: { id: string }) {
  switch (id) {
    case "i1": // El diseño del logotipo me resulta claro
      return (<><Hanging x={42} /><Window /><Plant x={104} y={186} s={1.1} />
        <Cart x={150} w={180} />
        <circle cx={240} cy={180} r={30} fill="none" stroke={C.accent} strokeWidth="2.5" strokeDasharray="5 5" />
        <Person x={482} flip skin={SKINS.tan} hair="#3b2416" style="short" shirt="#8aa4b8" hand={[380, 150]} mouth="open" lookAt={-2} />
        <Bubble x={500} y={10} w={58} h={36} tail="left"><path d="M516 28 l7 7 14 -14" stroke={C.accent} strokeWidth="3.4" fill="none" strokeLinecap="round" /></Bubble></>);
    case "i2": // Mismos colores en los materiales
      return (<><Hanging x={610} /><Shelf x={40} y={70} /><Counter />
        <Cup x={170} y={146} s={1.6} /><Bag x={262} y={136} s={1.3} />
        <g><rect x={318} y={88} width="64" height="74" rx="4" fill="#1d1d1d" /><rect x={318} y={88} width="64" height="74" rx="4" fill={`url(#i2-sheen)`} /><rect x={328} y={100} width="44" height="5" rx="2" fill={C.wood} /><Badge x={350} y={132} r={13} color={C.wood} mark={C.ink} /></g>
        <Swatch x={428} y={46} c={C.ink} label /><Swatch x={464} y={46} c={C.wood} label /><Swatch x={500} y={46} c={C.white} label /><Swatch x={536} y={46} c={C.crema} label />
        <path d="M420 104 h154" stroke={C.woodDark} strokeWidth="2" strokeDasharray="4 6" /><Check x={497} y={124} /></>);
    case "i3": // Estilo visual coherente
      return (<><Counter /><Board x={58} y={40} />
        <Cup x={232} y={146} s={1.5} />
        <g><Shadow x={334} y={160} rx={44} ry={3} /><rect x={292} y={58} width="84" height="102" rx="4" fill="#fffaf3" stroke={C.line} /><rect x={302} y={70} width="64" height="38" rx="2" fill="#1d1d1d" /><Badge x={334} y={89} r={12} /><rect x={302} y={116} width="52" height="4" rx="2" fill={C.muted} /><rect x={302} y={126} width="40" height="4" rx="2" fill={C.muted} /><rect x={302} y={136} width="46" height="4" rx="2" fill={C.muted} /></g>
        <Bag x={432} y={136} s={1.3} />
        <path d="M58 26 h460" stroke={C.accent} strokeWidth="2" strokeDasharray="6 6" /><Check x={548} y={60} /><Plant x={590} y={140} /></>);
    case "i4": // Productos de buena calidad
      return (<><Hanging x={40} /><Window /><Counter />
        <Mug x={262} y={130} s={1.25} /><Steam x={248} y={92} />
        <g><Shadow x={378} y={160} rx={30} ry={3} /><path d="M350 158 q28 -34 58 0 Z" fill={C.crema} /><path d="M356 152 q22 -22 46 0" stroke={C.coffeeLight} strokeWidth="2" fill="none" /><path d="M364 146 q14 -12 30 0" stroke="#e8c896" strokeWidth="2" fill="none" /></g>
        <g transform="translate(140 52)"><path d="M0 -12 l4 9 10 1.5 -7.5 7 2 10 -8.5 -5 -8.5 5 2 -10 -7.5 -7 10 -1.5Z" fill={C.wood} /><path d="M0 -12 l4 9 10 1.5 -7.5 7 -6.5 -3Z" fill="#fff" opacity="0.3" /></g>
        <g transform="translate(176 36) scale(0.6)"><path d="M0 -12 l4 9 10 1.5 -7.5 7 2 10 -8.5 -5 -8.5 5 2 -10 -7.5 -7 10 -1.5Z" fill={C.crema} /></g></>);
    case "i5": // Cumple lo que me ofrece
      return (<><Hanging x={34} /><Hanging x={78} len={26} /><Board x={486} y={30} />
        <Machine x={60} y={116} />
        <Person x={200} style="bun" skin={SKINS.light} hair="#3a2417" shirt="#fffaf3" sleeve="short" apron hand={[262, 128]} lookAt={1.5} />
        <Person x={372} flip style="fade" skin={SKINS.brown} hair="#1e140d" shirt="#a07a5c" hand={[300, 130]} lookAt={1.5} />
        <Cup x={282} y={126} s={1.15} />
        <Counter /><Plant x={590} y={150} /></>);
    case "i6": // El personal conoce los productos
      return (<><Window /><Shelf x={40} y={66} /><Counter />
        <Person x={226} style="long" skin={SKINS.tan} hair="#4a2c1a" shirt="#fffaf3" sleeve="short" apron hand={[296, 116]} lookAt={2} />
        <Bag x={318} y={130} s={1.25} />
        <Bubble x={254} y={14} w={104} h={42}><ellipse cx={278} cy={35} rx="7" ry="10" fill={C.coffee} transform="rotate(-20 278 35)" /><path d="M278 26 q-3 9 0 18" stroke={C.crema} strokeWidth="1.5" fill="none" transform="rotate(-20 278 35)" /><ellipse cx={300} cy={35} rx="7" ry="10" fill={C.coffeeLight} transform="rotate(15 300 35)" /><path d="M300 26 q-3 9 0 18" stroke={C.crema} strokeWidth="1.5" fill="none" transform="rotate(15 300 35)" /><text x={330} y={42} fontSize="17" fill={C.accent} fontWeight="700" fontFamily="sans-serif">?!</text></Bubble>
        <Person x={440} flip style="curly" skin={SKINS.deep} hair="#1a120c" shirt="#86a37a" glasses hand={[400, 150]} mouth="soft" lookAt={2} /></>);
    case "i7": // Marca agradable
      return (<><Hanging x={50} /><Hanging x={598} len={26} /><Plant x={130} y={146} s={1.1} /><Counter />
        <Person x={320} style="long" skin={SKINS.light} hair="#6b4128" shirt="#8aa4b8" hand={[346, 134]} lookAt={0} mouth="open" />
        <Cup x={354} y={134} s={1.15} />
        <Heart x={258} y={44} s={1.7} /><Heart x={396} y={34} s={1.2} fill={C.crema} /><Heart x={424} y={70} s={0.9} /><Heart x={232} y={86} s={0.8} fill={C.crema} /></>);
    case "i8": // Confianza al comprar
      return (<><Window /><Cart x={140} w={170} />
        <g><Shadow x={232} y={142} rx={22} ry={2.5} /><rect x={212} y={108} width="40" height="32" rx="5" fill="#2a2a2a" /><rect x={217} y={113} width="30" height="11" rx="2" fill="#9fb3a0" /><rect x={217} y={128} width="30" height="8" rx="1.5" fill="#444" /></g>
        <Person x={404} flip style="short" skin={SKINS.brown} hair="#24180f" beard shirt="#a07a5c" hand={[304, 116]} lookAt={1} />
        <g transform="rotate(-14 292 112)"><rect x={278} y={103} width="30" height="19" rx="3" fill={C.wood} stroke={C.woodDark} /><rect x={278} y={107} width="30" height="4" fill={C.woodDeep} /><rect x={282} y={115} width="8" height="4" rx="1" fill="#e9d6a8" /></g>
        <g><path d="M96 34 l24 -10 24 10 v20 c0 16 -11 26 -24 30 -13 -4 -24 -14 -24 -30 Z" fill={C.accent} /><path d="M96 34 l24 -10 v60 c-13 -4 -24 -14 -24 -30 Z" fill="#fff" opacity="0.12" /><path d="M109 54 l8 8 14 -15" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" /></g></>);
    case "i9": // Me transmite cercanía
      return (<><Hanging x={40} /><Board x={494} y={30} /><Counter />
        <Person x={226} style="bun" skin={SKINS.tan} hair="#2b1d14" shirt="#fffaf3" sleeve="short" apron hand={[258, 156]} lookAt={2} mouth="open" />
        <Person x={386} flip style="long" skin={SKINS.light} hair="#8a5a34" shirt="#86a37a" hand={[356, 156]} lookAt={2} />
        <Cup x={330} y={150} s={1} />
        <Bubble x={186} y={14} w={74} h={34}><path d="M200 26 h44 M200 35 h30" stroke={C.muted} strokeWidth="3" strokeLinecap="round" /></Bubble>
        <Bubble x={354} y={18} w={70} h={34} tail="right"><Heart x={389} y={37} s={0.95} /></Bubble></>);
    case "i10": // Identifico el nombre como una marca que ya conocía
      return (<><Hanging x={610} />
        <g><Shadow x={268} y={92} rx={110} ry={3} o={0.1} /><rect x="150" y="28" width="236" height="58" rx="9" fill="url(#i10-black)" /><rect x="150" y="28" width="236" height="58" rx="9" fill="url(#i10-sheen)" /><rect x="172" y="48" width="132" height="17" rx="4" fill="#fffaf3" /><rect x="314" y="48" width="50" height="17" rx="4" fill={C.wood} /><path d="M184 86 v18 M352 86 v18" stroke={C.woodDark} strokeWidth="4" /></g>
        <Cart x={190} w={156} badge={false} />
        <Person x={504} flip style="short" skin={SKINS.light} hair="#4a2c1a" shirt="#8aa4b8" hand={[470, 160]} lookAt={-2} mouth="open" />
        <Bubble x={420} y={8} w={56} h={38} tail="right"><text x={448} y={36} textAnchor="middle" fontSize="24" fontWeight="800" fill={C.accent} fontFamily="sans-serif">!</text></Bubble></>);
    case "i11": // Identifico el logotipo como uno que ya había visto
      return (<><Window /><Cart x={120} w={180} />
        <Person x={420} flip style="curly" skin={SKINS.deep} hair="#1a120c" shirt="#86a37a" hand={[318, 146]} lookAt={-2} />
        <Bubble x={322} y={10} w={92} h={56} tail="right"><Badge x={352} y={38} r={17} /><path d="M382 36 l7 7 14 -15" stroke={C.accent} strokeWidth="3.4" fill="none" strokeLinecap="round" /></Bubble></>);
    case "i12": // Distingo el nombre entre otras cafeterías
      return (<>{[0, 1, 2].map((i) => {
        const on = i === 1, X = 52 + i * 184;
        return (
          <g key={i}>
            <Shadow x={X + 78} y={216} rx={84} ry={4} o={0.14} />
            <rect x={X} y={74} width={156} height={146} fill={on ? "url(#i12-black)" : "#d9cbb7"} />
            <path d={`M${X - 8} 74 h172 l-10 20 h-152 Z`} fill={on ? C.wood : "#c6b59c"} />
            {[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M${X + 4 + k * 32} 94 l6 -20 h20 l6 20`} fill={on ? (k % 2 ? C.woodDark : C.wood) : k % 2 ? "#bba98e" : "#d2c2aa"} />)}
            <rect x={X + 12} y={40} width={132} height={30} rx="6" fill={on ? C.ink : "#bfae96"} />
            <rect x={X + 30} y={51} width={on ? 72 : 92} height="8" rx="4" fill={on ? C.wood : "#efe4d4"} />
            <rect x={X + 22} y={110} width={64} height={110} rx="3" fill={on ? "#2a2a2a" : "#efe4d4"} />
            <rect x={X + 96} y={110} width={46} height={50} rx="3" fill={on ? "#3a3a3a" : "#f5ede1"} />
            <path d={`M${X + 100} 114 l14 0 l-16 40`} stroke="#fff" strokeWidth="3" opacity="0.4" />
          </g>
        );
      })}
        <Check x={312} y={30} r={16} /></>);
    case "i13": // Distingo el logotipo entre otros logotipos
      return (<><Shadow x={120} y={164} rx={40} ry={5} o={0.1} /><Badge x={120} y={110} r={42} color="#bfae96" mark="#efe4d4" />
        <g><Shadow x={240} y={164} rx={40} ry={5} o={0.1} /><rect x={198} y={70} width="84" height="84" rx="18" fill="#cfc0a9" /><circle cx={240} cy={112} r={22} fill="#efe4d4" /><circle cx={240} cy={112} r={10} fill="#cfc0a9" /></g>
        <Shadow x={360} y={168} rx={48} ry={6} o={0.18} /><Badge x={360} y={110} r={46} /><circle cx={360} cy={110} r={56} fill="none" stroke={C.accent} strokeWidth="3" strokeDasharray="6 6" />
        <g><Shadow x={492} y={164} rx={40} ry={5} o={0.1} /><path d="M452 70 h80 l-12 84 h-56 Z" fill="#cfc0a9" /><path d="M472 100 h40" stroke="#efe4d4" strokeWidth="8" strokeLinecap="round" /><path d="M478 120 h28" stroke="#efe4d4" strokeWidth="6" strokeLinecap="round" /></g>
        <Check x={404} y={62} r={15} /></>);
    case "i14": // Publicación en redes sociales
      return (<><Hanging x={610} /><Plant x={60} y={176} />
        <Person x={170} style="long" skin={SKINS.tan} hair="#2b1d14" shirt="#8aa4b8" hand={[262, 150]} lookAt={2.5} />
        <Phone x={262} y={40}>
          <circle cx={278} cy={58} r={5} fill={C.ink} /><rect x={287} y={55} width="30" height="4" rx="2" fill={C.muted} />
          <rect x={267} y={68} width="66" height="50" fill="#f1e5d3" /><Cup x={300} y={102} s={1.15} />
          <Heart x={276} y={128} s={0.8} /><rect x={288} y={124} width="36" height="4" rx="2" fill={C.muted} /><rect x={288} y={132} width="26" height="4" rx="2" fill={C.muted} />
        </Phone>
        <Bubble x={370} y={46} w={74} h={36}><Badge x={392} y={64} r={10} /><text x={424} y={71} textAnchor="middle" fontSize="18" fontWeight="800" fill={C.accent} fontFamily="sans-serif">?</text></Bubble>
        <Heart x={474} y={120} s={1.4} /><Heart x={504} y={90} s={0.9} fill={C.crema} /><Heart x={530} y={128} s={0.7} /></>);
    case "i15": // Identifico la marca en los materiales del negocio
    default:
      return (<><Window /><Counter />
        <Bag x={110} y={130} s={1.4} /><Cup x={204} y={146} s={1.5} />
        <g><Shadow x={296} y={160} rx={40} ry={3} /><rect x={258} y={92} width="76" height="68" rx="3" fill="#fffaf3" stroke={C.line} /><path d="M258 92 l38 -10 l38 10" fill="#efe4d4" stroke={C.line} /><Badge x={296} y={118} r={13} /><rect x={270} y={140} width="52" height="4" rx="2" fill={C.muted} /></g>
        <g><Shadow x={380} y={160} rx={34} ry={3} /><rect x={350} y={122} width="62" height="38" rx="3" fill={C.wood} /><rect x={350} y={122} width="62" height="8" rx="3" fill={C.woodDark} /><Badge x={381} y={143} r={10} /></g>
        <path d="M96 64 q150 -44 330 0" stroke={C.accent} strokeWidth="2" strokeDasharray="6 6" fill="none" /><Check x={436} y={64} /></>);
  }
}

/** Escena dibujada en código: respaldo si la ilustración de R2 no está disponible. */
function SvgScene({ id }: { id: string }) {
  return (
    <div className="item-banner" aria-hidden>
      <svg viewBox="0 0 640 220" preserveAspectRatio="xMidYMid slice">
        <Defs p={id} />
        <Pid.Provider value={id}>
          <Room />
          <Scene id={id} />
        </Pid.Provider>
      </svg>
    </div>
  );
}

/**
 * Banner de la afirmación: ilustración de línea (banco de imágenes, servida desde R2) sobre fondo crema con un
 * círculo de madera detrás del personaje, el ícono del tema y el filete de madera de la marca.
 */
export default function ItemBanner({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <SvgScene id={id} />;
  return (
    <div className="item-banner photo" aria-hidden>
      <span className="banner-sun" />
      <img src={"/api/ilustraciones/" + id} alt="" decoding="async" onError={() => setFailed(true)} />
      <span className="banner-topic"><ItemIcon id={id} /></span>
    </div>
  );
}
