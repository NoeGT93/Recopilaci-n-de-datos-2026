import { loadMedia, requireRole } from "@/lib/server";
import MediaManager from "@/components/MediaManager";

export default async function Imagenes() {
  if (!(await requireRole("admin"))) return null;
  return (
    <section className="card">
      <div className="card-title"><h2>Imágenes de la encuesta</h2></div>
      <p className="small muted">
        Cada afirmación muestra la ilustración de la izquierda. Aquí puede agregar además imágenes de referencia (por ejemplo, el logotipo, el
        menú o una publicación de Instagram de Coffee Bike) y un banner de portada. Se comprimen antes de subir (máx. 5 MB).
      </p>
      <div className="notice accent" style={{ marginBottom: "0.5rem" }}>
        <strong>Cuidado metodológico:</strong> una imagen puede influir en la respuesta, sobre todo en las afirmaciones de
        reconocimiento (10 a 15), donde mostrar la marca adelanta lo que se pregunta. Úselas de forma consistente para todas las
        personas, defínalas antes de abrir la recolección y evite cambiarlas a mitad: cada envío guarda qué imágenes estaban activas.
      </div>
      <MediaManager initial={await loadMedia()} />
    </section>
  );
}
