// Ícono de referencia por afirmación: indica el tema (logotipo, colores, personal…) sin mostrar la marca,
// para no influir en las respuestas de reconocimiento. Trazos de 24×24 al estilo de línea del sitio.
const ICONS: Record<string, React.ReactNode> = {
  // 1 Logotipo claro: insignia circular con cordillera
  i1: (<><circle cx="12" cy="12" r="9" /><path d="m6.5 15.5 3.5-5 2 2.5 2.5-4.5 3 7" /></>),
  // 2 Mismos colores: paleta
  i2: (<><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.8 0-1.4-1.2-1.6-1.2-2.8 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14.5" cy="7" r="1" /></>),
  // 3 Estilo coherente: piezas apiladas
  i3: (<><path d="m12 3 9 4.5-9 4.5L3 7.5Z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></>),
  // 4 Calidad del producto: taza
  i4: (<><path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" /><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8 3v3M12 3v3" /></>),
  // 5 Cumple lo que ofrece: sello con verificación
  i5: (<><path d="M12 3 14.6 5l3.2-.2.8 3.1L21 10l-1.4 2.9.6 3.1-3 1.1-1.6 2.8-3.1-.8-3 1.1-1.9-2.6-3.1-.7.3-3.2L2.5 10l2.3-2.2.4-3.2 3.2.3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  // 6 Personal con conocimiento: persona con idea
  i6: (<><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20a6.5 6.5 0 0 1 13 0" /><path d="M18.5 3.5v2M21 6l-1.4 1.4M16 6l1.4 1.4" /></>),
  // 7 Marca agradable: corazón
  i7: (<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />),
  // 8 Confianza: escudo
  i8: (<><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6Z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></>),
  // 9 Cercanía: dos personas
  i9: (<><circle cx="8" cy="8.5" r="3" /><circle cx="16.5" cy="9.5" r="2.5" /><path d="M2.5 19.5a5.5 5.5 0 0 1 11 0" /><path d="M14 14.6a4.5 4.5 0 0 1 7 3.9" /></>),
  // 10 Reconoce el nombre: etiqueta con texto
  i10: (<><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9Z" /><path d="M7.5 9h4M7.5 12.5h2" /></>),
  // 11 Reconoce el logotipo: ojo
  i11: (<><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>),
  // 12 Distingue el nombre entre otros: lista con uno resaltado
  i12: (<><path d="M4 6h10M4 12h16M4 18h8" /><circle cx="19" cy="6" r="2" /></>),
  // 13 Distingue el logotipo entre otros: varias insignias, una marcada
  i13: (<><circle cx="6" cy="7" r="3" /><circle cx="18" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3.5" /><path d="m16.6 17 1 1 2-2" /></>),
  // 14 Publicación en redes: teléfono con corazón
  i14: (<><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M12 15.5s-3-1.8-3-4a1.6 1.6 0 0 1 3-.9 1.6 1.6 0 0 1 3 .9c0 2.2-3 4-3 4Z" /></>),
  // 15 Materiales del negocio: bolsa
  i15: (<><path d="M5 8h14l-1 12.5H6Z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>),
};

export default function ItemIcon({ id }: { id: string }) {
  return (
    <span className="item-icon" aria-hidden>
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[id]}
      </svg>
    </span>
  );
}
