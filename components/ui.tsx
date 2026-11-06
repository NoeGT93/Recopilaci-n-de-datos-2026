"use client";
import { PERSONAL_FIELDS } from "@/lib/instruments";

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
  return (
    <fieldset>
      <legend>Datos de identificación (opcionales)</legend>
      <p className="small muted">{purpose}</p>
      <div className="grid2">
        {PERSONAL_FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`pd-${f.key}`}>{f.label}</label>
            <input
              id={`pd-${f.key}`}
              type={f.key === "age" ? "number" : "text"}
              inputMode={f.key === "age" ? "numeric" : undefined}
              min={f.key === "age" ? 0 : undefined}
              max={f.key === "age" ? 120 : undefined}
              maxLength={100}
              autoComplete="off"
              value={value[f.key] ?? ""}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            />
          </div>
        ))}
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
