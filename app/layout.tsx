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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${cinzel.variable}`}>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a className="brand" href="/">
              {/* Logotipo oficial, usado con autorización de Coffee Bike. */}
              <img className="brand-logo" src="/coffee-bike-logo.webp" width={44} height={44} alt="Coffee Bike" />
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
