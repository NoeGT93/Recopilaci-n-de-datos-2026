import { requireRole } from "@/lib/server";
import { AdminNav, LoginForm } from "@/components/AdminClient";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración · Recopilación de datos 2026" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await requireRole("admin");
  return (
    <main className="page wide">
      <header className="masthead row spread">
        <div>
          <p className="org">Recopilación de datos 2026</p>
          <h1 style={{ margin: 0 }}>Administración</h1>
        </div>
        {ok && (
          <form action={logout}>
            <button className="btn secondary small" type="submit">Cerrar sesión</button>
          </form>
        )}
      </header>
      {ok ? (
        <>
          <AdminNav />
          {children}
        </>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
