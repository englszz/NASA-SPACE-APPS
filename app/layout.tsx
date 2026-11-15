import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import "./globals.css";
import RamoncitoChat from "./RamoncitoChat";
import LangToggle from "./LangToggle";
import { LangProvider } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";

// Respaldo mientras no esté el archivo de Bowl Shadow en /public/fonts
const display = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-fallback-display" });
const body = Nunito({ subsets: ["latin"], variable: "--font-body" });

// Dirección pública de la web (en Vercel se toma sola; en local es localhost)
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  const description = en
    ? "NASA data to decide what to plant, when and where in the Cibao Valley, Dominican Republic. NASA Space Apps Challenge 2026 (Field Shift)."
    : "Datos de la NASA para decidir qué sembrar, cuándo y dónde en el Cibao. Proyecto para NASA Space Apps Challenge 2026 (Field Shift).";
  return {
    metadataBase: new URL(SITE_URL),
    // Código de Google Search Console, si Google pide comprobar que la web es tuya
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
      : {}),
    title: "The Conuco",
    description,
    applicationName: "The Conuco",
    appleWebApp: { title: "The Conuco", capable: true, statusBarStyle: "default" },
    openGraph: {
      title: "The Conuco",
      description: en
        ? "NASA data to decide what to plant, when and where in the Cibao Valley."
        : "Datos de la NASA para decidir qué sembrar, cuándo y dónde en el Cibao.",
      locale: en ? "en_US" : "es_DO",
      alternateLocale: en ? "es_DO" : "en_US",
      type: "website",
    },
  };
}

export const viewport: Viewport = { themeColor: "#1d4a19" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${display.variable} ${body.variable}`}>
      <body>
        <LangProvider initial={lang}>
          {children}
          <LangToggle className="langFloat" />
          <RamoncitoChat />
        </LangProvider>
      </body>
    </html>
  );
}
