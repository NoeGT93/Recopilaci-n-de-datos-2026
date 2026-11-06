import { requireRole } from "@/lib/server";
import { ChangePasswordForm } from "@/components/AdminClient";

export default async function Contrasena() {
  if (!(await requireRole("admin"))) return null;
  return (
    <section>
      <h2 style={{ marginTop: 0 }}>Cambiar contraseña</h2>
      <p className="small muted">Se guarda como hash PBKDF2 en la base de datos; nadie puede leerla. Al cambiarla se cierran las demás sesiones de admin.</p>
      <ChangePasswordForm />
    </section>
  );
}
