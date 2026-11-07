import { notFound } from "next/navigation";
import { loadMedia, requireRole } from "@/lib/server";
import { INSTRUMENT_NAMES } from "@/lib/instruments";
import AnnexView from "@/components/AnnexView";
import { PrintButton } from "@/components/AdminClient";

export const dynamic = "force-dynamic";
const CODES = ["encuesta", "entrevista", "observacion"] as const;

// Vista web para anexos: solo el equipo (admin) la genera.
export default async function Anexo({ params }: { params: Promise<{ instrumento: string }> }) {
  const code = (await params).instrumento as (typeof CODES)[number];
  if (!CODES.includes(code)) notFound();
  if (!(await requireRole("admin")))
    return (
      <main className="page"><div className="card"><p style={{ margin: 0 }}>Acceso restringido. <a href="/admin">Ingrese al panel</a> y vuelva a abrir esta vista.</p></div></main>
    );
  return (
    <main className="page annex-page">
      <div className="print-toolbar no-print">
        <a href="/admin/imprimir" className="btn ghost small">← Volver</a>
        <span className="small muted">{INSTRUMENT_NAMES[code]} · vista web</span>
        <PrintButton label="Guardar como PDF" />
      </div>
      <p className="small muted no-print">
        Todas las pantallas del formulario tal como se ven en la web. En el diálogo de impresión elija «Guardar como PDF» y active
        «Gráficos de fondo» para conservar colores e ilustraciones.
      </p>
      <AnnexView code={code} media={code === "encuesta" ? await loadMedia() : []} />
    </main>
  );
}
