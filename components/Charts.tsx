// Gráficos simples en HTML: barras horizontales con etiqueta, valor y porcentaje sobre un denominador explícito.
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
