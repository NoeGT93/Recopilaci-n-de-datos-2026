"use client";
import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import QRCode from "qrcode";
import { login, createInvitation, revealPersonal, changePassword } from "@/app/admin/actions";
import { PERSONAL_FIELDS } from "@/lib/instruments";
import { Button, Notice } from "./ui";

const LINKS = [
  ["/admin", "Resumen"],
  ["/admin/encuesta", "Encuesta"],
  ["/admin/entrevista", "Entrevista"],
  ["/admin/observacion", "Observación"],
  ["/admin/enlaces", "Enlaces, metas e invitaciones"],
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

export function InvitationForm() {
  const [state, action, pending] = useActionState(createInvitation, {});
  return (
    <form action={action} className="stack">
      <div className="filters">
        <div className="field">
          <label htmlFor="inv-i">Instrumento</label>
          <select id="inv-i" name="instrument">
            <option value="entrevista">Entrevista a la dirección</option>
            <option value="observacion">Ficha de observación</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="inv-l">Etiqueta</label>
          <input id="inv-l" name="label" type="text" maxLength={60} placeholder="Observador 1" required />
        </div>
        <div className="field">
          <label htmlFor="inv-d">Vigencia (días)</label>
          <input id="inv-d" name="days" type="number" min={1} max={90} defaultValue={14} required />
        </div>
        <Button busy={pending} type="submit">Crear invitación</Button>
      </div>
      <p className="small muted">Use etiquetas sin datos personales: la etiqueta de observación se registra como «observador» en las fichas.</p>
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      {state?.link && (
        <Notice kind="ok">
          <p><strong>Invitación creada.</strong> Copie el enlace ahora: por seguridad no se vuelve a mostrar.</p>
          <CopyLink url={state.link} label="Enlace de invitación" />
        </Notice>
      )}
    </form>
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
