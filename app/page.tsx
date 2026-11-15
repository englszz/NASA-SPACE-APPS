"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Fields from "./Fields";
import AuthNav from "./AuthNav";
import { useLang } from "@/lib/i18n";
import BarnTransition from "./BarnTransition";
import {
  ChallengeSection,
  GlobalSection,
  ClimateSection,
  CropsSection,
  RotationSection,
  MapSection,
  RamoncitoSection,
  SiteFooter,
  SourcesStrip,
} from "./Sections";

const NAV = [
  { id: "inicio", es: "Inicio", en: "Home" },
  { id: "mapa", es: "El mapa", en: "Map" },
  { id: "rotaciones", es: "Rotaciones", en: "Rotations" },
  { id: "cultivos", es: "Cultivos", en: "Crops" },
  { id: "clima", es: "Clima futuro", en: "Future climate" },
  { id: "ramoncito", es: "Ramoncito", en: "Ramoncito" },
  { id: "reto", es: "El reto", en: "The challenge" },
];

export default function Home() {
  const { t } = useLang();
  const [jump, setJump] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [active, setActive] = useState("inicio");

  // Marca en el header la sección que se está viendo
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const hop = () => {
    setJump(false);
    requestAnimationFrame(() => setJump(true));
  };

  return (
    <div className="page">
      <header className="siteHeader">
        <a href="#inicio" className="brand" aria-label={t("The Conuco, inicio", "The Conuco, home")}>
          <Image src="/logo-texto.png" alt="The Conuco" width={900} height={271} priority />
        </a>

        <button
          type="button"
          className="menuToggle"
          aria-expanded={menuOpen}
          aria-controls="mainNav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? t("Cerrar", "Close") : t("Menú", "Menu")}
        </button>

        <nav id="mainNav" className={`nav${menuOpen ? " isOpen" : ""}`} aria-label={t("Secciones", "Sections")}>
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={active === item.id ? "isActive" : undefined}
              aria-current={active === item.id ? "true" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {t(item.es, item.en)}
            </a>
          ))}
          <AuthNav />
        </nav>
      </header>

      <main>
        <section className="heroWrap" id="inicio">
          <Fields />
          <div className="hero">
            <div className="heroCopy">
              <h1 className="heroLogo">
                <Image src="/logo-hero.png" alt="The Conuco" width={1200} height={522} priority />
              </h1>
              <p className="tagline">
                {t(
                  "Datos de la NASA para decidir qué sembrar, cuándo y dónde, hoy y en el clima que viene.",
                  "NASA data to decide what to plant, when and where, today and in the climate to come.",
                )}
              </p>
              <button type="button" className="cta" onClick={() => setMapOpen(true)}>
                {t("Abrir el mapa", "Open the map")}
              </button>
            </div>

            <button
              type="button"
              className={`mascot${jump ? " isJumping" : ""}`}
              onClick={hop}
              onAnimationEnd={() => setJump(false)}
              aria-label={t("Ramoncito, la mascota de The Conuco", "Ramoncito, The Conuco mascot")}
            >
              <Image src="/ramoncito.svg" alt="" width={606} height={516} priority />
              <span className="shadow" aria-hidden="true" />
            </button>
          </div>
          <SourcesStrip />
        </section>

        <MapSection onOpenMap={() => setMapOpen(true)} />
        <RotationSection />
        <CropsSection />
        <ClimateSection />
        <RamoncitoSection />
        <ChallengeSection />
        <GlobalSection />
      </main>

      <SiteFooter />

      <BarnTransition open={mapOpen} onClose={() => setMapOpen(false)} />
    </div>
  );
}
