import { requireRole } from "@/lib/server";
import { AdminNav, LoginForm } from "@/components/AdminClient";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración · Recopilación de datos 2026" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await requireRole("admin");
  if (!ok)
    return (
      <main className="page" style={{ maxWidth: "28rem" }}>
        <div className="card step">
          <p className="eyebrow">Administración</p>
          <h1 style={{ fontSize: "1.5rem" }}>Ingresar al panel</h1>
          <p className="muted">Acceso exclusivo del equipo investigador.</p>
          <LoginForm />
        </div>
      </main>
    );
  return (
    <main className="page wide">
      <div className="row spread no-print" style={{ marginBottom: "1.25rem" }}>
        <div>
          <p className="eyebrow">Panel del equipo investigador</p>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Administración</h1>
        </div>
        <form action={logout}>
          <button className="btn secondary small" type="submit">Cerrar sesión</button>
        </form>
      </div>
      <div className="admin-shell">
        <AdminNav />
        <div className="admin-main">{children}</div>
      </div>
    </main>
  );
}
