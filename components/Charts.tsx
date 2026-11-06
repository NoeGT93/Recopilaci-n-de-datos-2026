// Gráficos del panel (servidor, sin librerías). Tooltips nativos con <title>; las tablas del panel son la
// vista tabular de los mismos datos.

/** Paleta divergente validada (dataviz/validate_palette): polo favorable café, desfavorable azul; gris = sin dato. */
export const LIKERT_COLORS = ["#9a5523", "#d9a066", "#5fa3e0", "#1f5fae"];
export const NEUTRAL = "#d4cdc2";
const SERIES = "#9a5523";
const GRID = "#ece7df";
const INK = "#6b6560";

// Barras horizontales con etiqueta, valor y porcentaje sobre un denominador explícito.
export function Bars({ rows, total, alt }: { rows: { label: string; value: number }[]; total: number; alt?: boolean }) {
  return (
    <div className="bars">
      {rows.map((r) => {
        const pct = total ? (r.value / total) * 100 : 0;
        return (
          <div className="bar" key={r.label}>
            <span>{r.label}</span>
            <span className="track" aria-hidden>
              <span className={`fill ${alt ? "alt" : ""}`} style={{ display: "block", width: `${pct}%` }} />
            </span>
            <span className="val">
              {r.value}
              {total > 0 && <span className="muted small"> · {pct.toFixed(0)} %</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Kpis({ items }: { items: [string, string | number][] }) {
  return (
    <div className="kpis">
      {items.map(([l, v]) => (
        <div className="kpi" key={l}>
          <div className="v">{v}</div>
          <div className="l">{l}</div>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Columna con extremo de datos redondeado (4px) y base recta. */
function colPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Columnas de una sola serie (distribuciones de puntajes, evolución diaria). Se rotula solo el máximo. */
export function Columns({ data, unit = "", height = 180, labelEvery = 1 }: { data: { label: string; value: number }[]; unit?: string; height?: number; labelEvery?: number }) {
  const W = 640, H = height, L = 32, B = 26, T = 18;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = (W - L) / Math.max(1, data.length);
  const bw = Math.min(24, step - 2);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const peak = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Columnas: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={L} x2={W} y1={y(max * t)} y2={y(max * t)} stroke={GRID} />
          <text x={L - 6} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill={INK}>{Math.round(max * t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = L + step * i + (step - bw) / 2;
        return (
          <g key={d.label}>
            <rect x={L + step * i} y={T} width={step} height={H - T - B} fill="transparent">
              <title>{`${d.label}: ${d.value}${unit}`}</title>
            </rect>
            {d.value > 0 && <path d={colPath(x, y(d.value), bw, H - B - y(d.value))} fill={SERIES} pointerEvents="none" />}
            {i % labelEvery === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={INK}>{d.label}</text>}
            {i === peak && d.value > 0 && <text x={x + bw / 2} y={y(d.value) - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#141414">{d.value}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Barras 100 % apiladas por fila (escala Likert u opciones C/P/NC/NV), con hueco de 2px entre segmentos. */
export function Stacked({ rows, keys }: { rows: { label: string; counts: number[] }[]; keys: { label: string; color: string }[] }) {
  const W = 640, gap = 2;
  return (
    <>
      <Legend items={keys} />
      <div className="stacked">
        {rows.map((r) => {
          const total = r.counts.reduce((a, b) => a + b, 0);
          let acc = 0;
          return (
            <div className="stacked-row" key={r.label}>
              <span className="stacked-label" title={r.label}>{r.label}</span>
              <svg viewBox={`0 0 ${W} 18`} preserveAspectRatio="none" role="img" aria-label={`${r.label}: ${keys.map((k, i) => `${k.label} ${r.counts[i]}`).join(", ")}`}>
                {total === 0 ? (
                  <rect x="0" y="0" width={W} height="18" rx="4" fill={GRID} />
                ) : (
                  r.counts.map((c, i) => {
                    if (!c) return null;
                    const x = (acc / total) * W;
                    const w = (c / total) * W;
                    acc += c;
                    return (
                      <rect key={i} x={x + (x > 0 ? gap / 2 : 0)} y="0" width={Math.max(0, w - gap)} height="18" rx="3" fill={keys[i].color}>
                        <title>{`${r.label} · ${keys[i].label}: ${c} (${Math.round((c / total) * 100)} %)`}</title>
                      </rect>
                    );
                  })
                )}
              </svg>
              <span className="stacked-n">n={total}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Dispersión imagen × reconocimiento: puntos agregados por coordenada (área ∝ número de personas). */
export function Scatter({ points, x, y }: { points: [number, number][]; x: { label: string; min: number; max: number }; y: { label: string; min: number; max: number } }) {
  const W = 640, H = 340, L = 44, B = 40, T = 12, R = 14;
  const sx = (v: number) => L + ((v - x.min) / (x.max - x.min)) * (W - L - R);
  const sy = (v: number) => T + (1 - (v - y.min) / (y.max - y.min)) * (H - T - B);
  const agg = new Map<string, { x: number; y: number; n: number }>();
  for (const [a, b] of points) {
    const k = `${a},${b}`;
    const e = agg.get(k) ?? { x: a, y: b, n: 0 };
    e.n++;
    agg.set(k, e);
  }
  const maxN = Math.max(1, ...[...agg.values()].map((e) => e.n));
  const ticks = (lo: number, hi: number) => Array.from({ length: 5 }, (_, i) => Math.round(lo + ((hi - lo) * i) / 4));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Dispersión de ${points.length} pares: ${x.label} frente a ${y.label}`}>
      {ticks(x.min, x.max).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={T} y2={H - B} stroke={GRID} />
          <text x={sx(t)} y={H - B + 16} textAnchor="middle" fontSize="11" fill={INK}>{t}</text>
        </g>
      ))}
      {ticks(y.min, y.max).map((t) => (
        <g key={`y${t}`}>
          <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke={GRID} />
          <text x={L - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill={INK}>{t}</text>
        </g>
      ))}
      <text x={(W + L) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="#141414">{x.label}</text>
      <text x={14} y={(H - B) / 2} textAnchor="middle" fontSize="12" fill="#141414" transform={`rotate(-90 14 ${(H - B) / 2})`}>{y.label}</text>
      {[...agg.values()].map((e) => (
        <circle key={`${e.x},${e.y}`} cx={sx(e.x)} cy={sy(e.y)} r={4 + 8 * Math.sqrt(e.n / maxN)} fill={SERIES} fillOpacity="0.75" stroke="#fff" strokeWidth="2">
          <title>{`${x.label} ${e.x} · ${y.label} ${e.y}: ${e.n} persona(s)`}</title>
        </circle>
      ))}
    </svg>
  );
}

/** Mediana de cada puntaje sobre su escala posible (mín–máx). */
export function RangeBars({ rows }: { rows: { label: string; median: number | null; min: number; max: number; n: number }[] }) {
  return (
    <div className="range-bars">
      {rows.map((r) => {
        const pct = r.median === null ? 0 : ((r.median - r.min) / (r.max - r.min)) * 100;
        return (
          <div className="range-row" key={r.label} title={`${r.label}: mediana ${r.median ?? "—"} (rango ${r.min}–${r.max}, n=${r.n})`}>
            <span className="range-label">{r.label}</span>
            <span className="range-track">
              <span className="range-fill" style={{ width: `${pct}%` }} />
              {r.median !== null && <span className="range-dot" style={{ left: `${pct}%` }} />}
            </span>
            <span className="range-val">
              {r.median === null ? "—" : r.median.toLocaleString("es-GT", { maximumFractionDigits: 1 })}
              <small> / {r.max}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
