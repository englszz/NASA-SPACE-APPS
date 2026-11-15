"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Fields from "./Fields";
import AuthNav from "./AuthNav";
import { useLang } from "@/lib/i18n";
import BarnTransition from "./BarnTransition";
import { FIRST_VISIT_COOKIE, readLocalConuco } from "@/lib/conuco-local";
import {
  ChallengeSection,
  GlobalSection,
  FeedbackSection,
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

// La portada. Al entrar por primera vez se abre el mapa con la
// animación del granero. El servidor ya sabe si es la primera visita (cookie), así que
// la pantalla verde del granero sale desde el primer instante, sin mostrar antes la portada.
export default function HomeView({ intro = false }: { intro?: boolean }) {
  const { t } = useLang();
  const [jump, setJump] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(intro);
  // Fondo verde de entrada: solo mientras dura la primera apertura del mapa
  const [introOn, setIntroOn] = useState(intro);
  const [active, setActive] = useState("inicio");

  // ¿Ya registró su conuco en este navegador? Cambia el botón de la portada
  const [hasConuco, setHasConuco] = useState(false);
  useEffect(() => setHasConuco(!!readLocalConuco()), []);

  // Ya visitó: la próxima vez entra directo a la portada
  useEffect(() => {
    document.cookie = `${FIRST_VISIT_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
  }, []);

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
              <div className="heroActions">
                <button type="button" className="cta" onClick={() => setMapOpen(true)}>
                  {t("Abrir el mapa", "Open the map")}
                </button>
                <a href="/mi-conuco" className="ctaGhost">
                  {hasConuco ? t("Mi conuco", "My conuco") : t("Registrar mi conuco", "Register my conuco")}
                </a>
              </div>
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
        <FeedbackSection />
      </main>

      <SiteFooter />

      <BarnTransition
        open={mapOpen}
        intro={introOn}
        onClose={() => {
          setMapOpen(false);
          setIntroOn(false);
        }}
      />
    </div>
  );
}
