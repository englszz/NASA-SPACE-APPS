import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import "./globals.css";
import RamoncitoChat from "./RamoncitoChat";

// Respaldo mientras no esté el archivo de Bowl Shadow en /public/fonts
const display = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-fallback-display" });
const body = Nunito({ subsets: ["latin"], variable: "--font-body" });

// Dirección pública de la web (en Vercel se toma sola; en local es localhost)
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "The Conuco",
  description: "Datos de la NASA para decidir qué sembrar, cuándo y dónde en el Cibao. Proyecto para NASA Space Apps Challenge 2026 (Field Shift).",
  applicationName: "The Conuco",
  appleWebApp: { title: "The Conuco", capable: true, statusBarStyle: "default" },
  openGraph: {
    title: "The Conuco",
    description: "Datos de la NASA para decidir qué sembrar, cuándo y dónde en el Cibao.",
    locale: "es_DO",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#1d4a19" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        <RamoncitoChat />
      </body>
    </html>
  );
}
