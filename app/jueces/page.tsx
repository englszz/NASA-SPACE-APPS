import type { Metadata } from "next";
import HomeView from "../HomeView";

// Entrada para los jueces de NASA Space Apps: siempre empieza con la animación del
// granero entrando al mapa y con la guía de Ramoncito desde cero.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Judges() {
  return <HomeView intro />;
}
