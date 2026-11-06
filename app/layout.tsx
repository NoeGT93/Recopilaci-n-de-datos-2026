import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";

// Fuentes descargadas al compilar y servidas desde el propio sitio. Cinzel evoca la serif de «SINCE 2020 · GUATEMALA».
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--font-cinzel" });

export const metadata: Metadata = {
  title: "Estudio Coffee Bike · Recopilación de datos 2026",
  description: "Investigación académica sobre la imagen y el reconocimiento de Coffee Bike — Maestría en Marketing Estratégico y Alta Gerencia, CUNOC-USAC.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#111111" };

/** Cordillera con nieve: trazo propio inspirado en la estética de la marca (no reproduce su logotipo). */
function Mountains() {
  return (
    <svg className="brand-mark" viewBox="0 0 46 30" aria-hidden>
      <path d="M1 27 13 9l5 7 7-13 9 14 4-5 7 15Z" fill="currentColor" />
      <path d="m25 3-4.2 7.8 2.3-1.4 1.9 2.1 1.6-2.4 2.6 1.3Z" fill="#111" />
      <path d="m13 9-3.1 4.6 1.8-.9 1.5 1.4 1.3-1.6Z" fill="#111" />
      <path d="M1 28.5h44" stroke="var(--wood)" strokeWidth="1.4" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${cinzel.variable}`}>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a className="brand" href="/">
              <Mountains />
              <span className="brand-text">
                <strong>Estudio <em>Coffee Bike</em></strong>
                <span>Investigación · CUNOC–USAC</span>
              </span>
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
