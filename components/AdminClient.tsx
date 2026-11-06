"use client";
import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import QRCode from "qrcode";
import { login, createInvitation, newCode, revealPersonal, changePassword } from "@/app/admin/actions";
import { PERSONAL_FIELDS } from "@/lib/instruments";
import { Button, Notice } from "./ui";

const LINKS = [
  ["/admin", "Resumen"],
  ["/admin/encuesta", "Encuesta"],
  ["/admin/entrevista", "Entrevista"],
  ["/admin/observacion", "Observación"],
  ["/admin/enlaces", "Enlaces y accesos"],
  ["/admin/contrasena", "Contraseña"],
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="adminnav" aria-label="Administración">
      {LINKS.map(([href, label]) => (
        <a key={href} href={href} aria-current={path === href ? "page" : undefined}>
          {label}
        </a>
      ))}
    </nav>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="stack" style={{ maxWidth: "24rem" }}>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      <Button busy={pending} type="submit">Ingresar</Button>
    </form>
  );
}

export function CopyLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  return (
    <div className="stack">
      <div className="copy">
        <input type="text" readOnly value={url} aria-label={label} onFocus={(e) => e.target.select()} />
        <button
          className="btn secondary small"
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
        <button
          className="btn secondary small"
          onClick={async () => setQr(qr ? null : await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }))}
        >
          {qr ? "Ocultar QR" : "Código QR"}
        </button>
      </div>
      {qr && (
        <div className="row">
          <div className="qr" role="img" aria-label={`Código QR de ${label}`} dangerouslySetInnerHTML={{ __html: qr }} />
          <a className="small" download={`qr-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`} href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`}>
            Descargar QR (SVG)
          </a>
        </div>
      )}
    </div>
  );
}

export function ChannelLink({ base }: { base: string }) {
  const [channel, setChannel] = useState("qr");
  const slug = channel.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  return (
    <div className="stack">
      <div className="field" style={{ maxWidth: "18rem" }}>
        <label htmlFor="canal">Canal de captación <span className="hint">Letras minúsculas, números y guiones (p. ej. qr-mesa, whatsapp, facebook).</span></label>
        <input id="canal" type="text" value={channel} onChange={(e) => setChannel(e.target.value)} />
      </div>
      {slug && <CopyLink url={`${base}?canal=${slug}`} label={`Encuesta canal ${slug}`} />}
    </div>
  );
}

/** Muestra un código recién generado (solo esta vez) con botón para copiar un mensaje listo para enviar. */
function CodeCard({ name, code, link }: { name: string; code: string; link: string }) {
  const [copied, setCopied] = useState(false);
  const message = `Hola ${name}: ingrese a ${link} , elija su nombre y escriba el código ${code}. Sus avances se guardan solos.`;
  return (
    <Notice kind="ok">
      <p><strong>Código de {name}</strong> — cópielo ahora; por seguridad no se vuelve a mostrar.</p>
      <div className="row" style={{ margin: "0.6rem 0" }}>
        <span className="code-show">{code}</span>
        <button
          type="button"
          className="btn secondary small"
          onClick={async () => {
            await navigator.clipboard.writeText(message).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Mensaje copiado" : "Copiar mensaje para enviar"}
        </button>
      </div>
      <p className="small" style={{ margin: 0 }}>{message}</p>
    </Notice>
  );
}

export function InvitationForm({ links }: { links: Record<"entrevista" | "observacion", string> }) {
  const [state, action, pending] = useActionState(createInvitation, {});
  const [instrument, setInstrument] = useState<"entrevista" | "observacion">("observacion");
  return (
    <form action={action} className="stack">
      <div className="filters">
        <div className="field">
          <label htmlFor="inv-i">Formulario</label>
          <select id="inv-i" name="instrument" value={instrument} onChange={(e) => setInstrument(e.target.value as "entrevista" | "observacion")}>
            <option value="observacion">Ficha de observación (equipo)</option>
            <option value="entrevista">Entrevista a la dirección</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="inv-l">Nombre que verá en la lista</label>
          <input id="inv-l" name="label" type="text" maxLength={60} placeholder="Ej.: Julia" required />
        </div>
        <div className="field">
          <label htmlFor="inv-d">Vigencia (días)</label>
          <input id="inv-d" name="days" type="number" min={1} max={365} defaultValue={90} required />
        </div>
        <Button busy={pending} type="submit">Dar acceso</Button>
      </div>
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      {state?.code && <CodeCard name={state.name!} code={state.code} link={links[instrument]} />}
    </form>
  );
}

export function NewCodeButton({ id, link }: { id: string; link: string }) {
  const [res, setRes] = useState<{ code?: string; name?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (res?.code) return <CodeCard name={res.name!} code={res.code} link={link} />;
  return (
    <>
      <button
        type="button"
        className="btn secondary small"
        disabled={busy}
        onClick={async () => {
          if (!confirm("El código anterior dejará de funcionar y se cerrará su sesión. ¿Continuar?")) return;
          setBusy(true);
          setRes(await newCode(id));
          setBusy(false);
        }}
      >
        Nuevo código
      </button>
      {res?.error && <span className="small" style={{ color: "var(--danger)" }}>{res.error}</span>}
    </>
  );
}

export function RevealPersonal({ id }: { id: string }) {
  const [data, setData] = useState<Record<string, unknown> | null | undefined>(undefined);
  useEffect(() => setData(undefined), [id]);
  if (data === undefined)
    return (
      <button className="btn secondary small" onClick={async () => setData(await revealPersonal(id))}>
        Ver datos personales (queda registrado)
      </button>
    );
  if (data === null) return <p className="muted">Sin datos personales registrados.</p>;
  return (
    <table>
      <tbody>
        {PERSONAL_FIELDS.map((f) => (
          <tr key={f.key}><th>{f.label}</th><td>{String(data[f.key] ?? "—")}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} className="stack" style={{ maxWidth: "24rem" }}>
      {[
        ["current", "Contraseña actual", "current-password"],
        ["next", "Nueva contraseña (mínimo 12 caracteres)", "new-password"],
        ["confirm", "Repita la nueva contraseña", "new-password"],
      ].map(([name, label, ac]) => (
        <div className="field" key={name}>
          <label htmlFor={`pw-${name}`}>{label}</label>
          <input id={`pw-${name}`} name={name} type="password" autoComplete={ac} minLength={name === "current" ? undefined : 12} required />
        </div>
      ))}
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      {state?.ok && <Notice kind="ok">Contraseña cambiada. Las demás sesiones de admin se cerraron; use la nueva la próxima vez.</Notice>}
      <Button busy={pending} type="submit">Cambiar contraseña</Button>
    </form>
  );
}
