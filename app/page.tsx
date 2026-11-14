"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Fields from "./Fields";
import BarnTransition from "./BarnTransition";
import {
  ChallengeSection,
  ClimateSection,
  CropsSection,
  RotationSection,
  MapSection,
  RamoncitoSection,
  SiteFooter,
  SourcesStrip,
} from "./Sections";

const NAV = [
  { id: "inicio", label: "Inicio" },
  { id: "mapa", label: "El mapa" },
  { id: "rotaciones", label: "Rotaciones" },
  { id: "cultivos", label: "Cultivos" },
  { id: "clima", label: "Clima futuro" },
  { id: "ramoncito", label: "Ramoncito" },
  { id: "reto", label: "El reto" },
];

export default function Home() {
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
        <a href="#inicio" className="brand" aria-label="The Conuco, inicio">
          <Image src="/logo-texto.png" alt="The Conuco" width={900} height={271} priority />
        </a>

        <button
          type="button"
          className="menuToggle"
          aria-expanded={menuOpen}
          aria-controls="mainNav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "Cerrar" : "Menú"}
        </button>

        <nav id="mainNav" className={`nav${menuOpen ? " isOpen" : ""}`} aria-label="Secciones">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={active === item.id ? "isActive" : undefined}
              aria-current={active === item.id ? "true" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
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
                Datos de la NASA para decidir qué sembrar, cuándo y dónde, hoy y en el clima que viene.
              </p>
              <button type="button" className="cta" onClick={() => setMapOpen(true)}>
                Abrir el mapa
              </button>
            </div>

            <button
              type="button"
              className={`mascot${jump ? " isJumping" : ""}`}
              onClick={hop}
              onAnimationEnd={() => setJump(false)}
              aria-label="Ramoncito, la mascota de The Conuco"
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
      </main>

      <SiteFooter />

      <BarnTransition open={mapOpen} onClose={() => setMapOpen(false)} />
    </div>
  );
}
