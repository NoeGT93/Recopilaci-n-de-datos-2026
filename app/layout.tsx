import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter se descarga al compilar y se sirve desde el propio sitio (sin peticiones a Google en el navegador).
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Recopilación de datos 2026",
  description: "Instrumentos de investigación — Maestría en Marketing Estratégico y Alta Gerencia, CUNOC-USAC.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a className="brand" href="/">
              <span className="brand-mark" aria-hidden>CU</span>
              <span className="brand-text">
                <strong>Recopilación de datos 2026</strong>
                <span>CUNOC · USAC · Maestría en Marketing Estratégico y Alta Gerencia</span>
              </span>
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
