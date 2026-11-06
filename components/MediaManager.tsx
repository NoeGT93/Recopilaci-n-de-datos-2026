"use client";
// Gestión de imágenes de referencia de la encuesta (portada y por afirmación).
import { useState } from "react";
import { SURVEY } from "@/lib/instruments";
import ItemIcon from "./ItemIcon";
import { Button, Notice, compress } from "./ui";

type Media = { id: string; item: string; caption: string | null };
const MAX = 5 * 1024 * 1024;

function Slot({ item, title, media, onChange }: { item: string; title: React.ReactNode; media: Media[]; onChange: (m: Media[]) => void }) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = media.filter((m) => m.item === item);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await compress(file).catch(() => null);
      if (!blob) return setError("No se pudo leer la imagen.");
      if (blob.size > MAX) return setError("La imagen supera 5 MB incluso comprimida.");
      const fd = new FormData();
      fd.append("item", item);
      fd.append("caption", caption);
      fd.append("file", blob, "imagen");
      const r = await fetch("/api/admin/medios", { method: "POST", body: fd }).catch(() => null);
      const data = (r ? await r.json().catch(() => ({})) : { error: "Sin conexión." }) as { id?: string; error?: string };
      if (!r?.ok || !data.id) return setError(data.error ?? "No se pudo subir.");
      onChange([...media, { id: data.id, item, caption: caption || null }]);
      setCaption("");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="media-admin-row">
      {item === "portada" ? <span className="item-icon" aria-hidden>★</span> : <ItemIcon id={item} />}
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {mine.length > 0 && (
          <div className="media-thumbs">
            {mine.map((m) => (
              <figure key={m.id}>
                <img src={"/api/medios/" + m.id} alt={m.caption ?? ""} />
                <figcaption>
                  {m.caption ?? "Sin descripción"} ·{" "}
                  <button
                    className="linkbtn"
                    onClick={async () => {
                      if (!confirm("¿Quitar esta imagen de la encuesta?")) return;
                      const r = await fetch("/api/admin/medios?id=" + m.id, { method: "DELETE" }).catch(() => null);
                      if (r?.ok) onChange(media.filter((x) => x.id !== m.id));
                    }}
                  >
                    Quitar
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: "0.5rem", alignItems: "flex-end" }}>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <input type="text" placeholder="Descripción breve (opcional)" maxLength={160} value={caption} onChange={(e) => setCaption(e.target.value)} style={{ flex: 1, minWidth: "12rem" }} />
          <Button className="btn small" busy={busy} disabled={!file} onClick={upload}>Subir</Button>
        </div>
        {error && <div style={{ marginTop: "0.5rem" }}><Notice kind="error">{error}</Notice></div>}
      </div>
    </div>
  );
}

export default function MediaManager({ initial }: { initial: Media[] }) {
  const [media, setMedia] = useState(initial);
  return (
    <div className="media-admin">
      <Slot item="portada" title="Portada de la encuesta (banner)" media={media} onChange={setMedia} />
      {SURVEY.items.map((it) => (
        <Slot key={it.id} item={it.id} title={<>{it.n}. <span style={{ fontWeight: 500 }}>{it.text}</span></>} media={media} onChange={setMedia} />
      ))}
    </div>
  );
}
