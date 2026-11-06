"use client";
import { EDUCATION_OPTIONS, PERSONAL_FIELDS, SEX_OPTIONS } from "@/lib/instruments";

export type PersonalValues = Partial<Record<(typeof PERSONAL_FIELDS)[number]["key"], string>>;

export function Button({ busy, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button className="btn" aria-busy={busy || undefined} disabled={busy || p.disabled} {...p}>
      {busy && <span className="spinner" aria-hidden />}
      {children}
    </button>
  );
}

export function Notice({ kind, children }: { kind?: "error" | "ok" | "accent"; children: React.ReactNode }) {
  return (
    <div className={`notice ${kind ?? ""}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

/** Datos personales opcionales: nunca se guardan en el navegador ni en la URL. */
export function PersonalFields({ value, onChange, purpose }: { value: PersonalValues; onChange: (v: PersonalValues) => void; purpose: string }) {
  const label = (k: keyof PersonalValues) => PERSONAL_FIELDS.find((f) => f.key === k)!.label;
  const set = (k: keyof PersonalValues, v: string) => onChange({ ...value, [k]: v });
  return (
    <fieldset>
      <legend className="sr-only">Datos de identificación (opcionales)</legend>
      <p className="small muted">{purpose}</p>
      <div className="grid2">
        <div className="field">
          <label htmlFor="pd-name">{label("name")}</label>
          <input id="pd-name" type="text" maxLength={100} autoComplete="off" value={value.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pd-age">{label("age")} <span className="hint" style={{ display: "inline" }}>(años)</span></label>
          <input id="pd-age" type="number" inputMode="numeric" min={0} max={120} autoComplete="off" value={value.age ?? ""} onChange={(e) => set("age", e.target.value)} />
        </div>
      </div>
      <fieldset className="field">
        <legend style={{ fontWeight: 550, fontSize: "0.94rem", marginBottom: "0.35rem" }}>{label("sex")}</legend>
        <div className="chips">
          {SEX_OPTIONS.map((o) => (
            <label className="chip" key={o}>
              <input type="radio" name="pd-sex" checked={value.sex === o} onChange={() => set("sex", o)} onClick={() => value.sex === o && set("sex", "")} />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid2">
        <div className="field">
          <label htmlFor="pd-education">{label("education")}</label>
          <select id="pd-education" value={value.education ?? ""} onChange={(e) => set("education", e.target.value)}>
            <option value="">Seleccione…</option>
            {EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pd-job">{label("job")}</label>
          <input id="pd-job" type="text" maxLength={100} autoComplete="organization-title" placeholder="Ej.: estudiante, contador, comerciante" value={value.job ?? ""} onChange={(e) => set("job", e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}

/** POST JSON con mensaje de error legible; nunca lanza por errores HTTP. */
export async function postJson<T = Record<string, unknown>>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await r.json().catch(() => ({ error: "Respuesta inesperada del servidor." }))) as T & { error?: string };
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Sin conexión. Lo ingresado se conserva; intente de nuevo." } as T & { error: string } };
  }
}

export function uuid() {
  return crypto.randomUUID();
}

export function randomKey() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const store = {
  get<T>(k: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(k) ?? "null");
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getJson = (url: string): Promise<any> => fetch(url).then((r) => r.json());
