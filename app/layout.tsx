import type { Metadata } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import "./globals.css";
import RamoncitoChat from "./RamoncitoChat";

// Respaldo mientras no esté el archivo de Bowl Shadow en /public/fonts
const display = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-fallback-display" });
const body = Nunito({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "The Conuco",
  description: "Field Shift · NASA Space Apps Challenge",
};

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
