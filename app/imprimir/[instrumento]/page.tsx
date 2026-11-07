import { notFound } from "next/navigation";
import { requireRole } from "@/lib/server";
import { INSTRUMENT_NAMES, type InstrumentCode } from "@/lib/instruments";
import PrintableForm from "@/components/PrintableForm";
import { PrintButton } from "@/components/AdminClient";

export const dynamic = "force-dynamic";
const CODES = ["encuesta", "entrevista", "observacion"];

// Solo el equipo (admin) genera los formularios en papel; no es un directorio público de herramientas.
export default async function Imprimir({ params, searchParams }: { params: Promise<{ instrumento: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const code = (await params).instrumento as InstrumentCode;
  if (!CODES.includes(code)) notFound();
  if (!(await requireRole("admin")))
    return (
      <main className="page"><div className="card"><p style={{ margin: 0 }}>Acceso restringido. <a href="/admin">Ingrese al panel</a> y vuelva a abrir este formulario.</p></div></main>
    );
  const adjustments = (await searchParams).ajustes !== "0";
  return (
    <main className="print-page">
      <div className="print-toolbar no-print">
        <a href="/admin/imprimir" className="btn ghost small">← Volver</a>
        <span className="small muted">{INSTRUMENT_NAMES[code]} · A4</span>
        <PrintButton />
      </div>
      <PrintableForm code={code} adjustments={adjustments} />
    </main>
  );
}
