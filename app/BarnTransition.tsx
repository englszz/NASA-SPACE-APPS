"use client";

import { useEffect, useRef, useState } from "react";

// Transición "Abrir el mapa": el granero aparece, abre sus puertas y la cámara
// entra por la puerta hasta el mapa. Estilo plano como Ramoncito: formas
// sólidas, sin contornos, detalles recortados en crema.

type Phase = "closed" | "pop" | "doors" | "zoom" | "inside";
const ORDER: Phase[] = ["closed", "pop", "doors", "zoom", "inside"];

const SUN = "#f4a518";
const SUN_DARK = "#d98a0c";
const DEEP = "#1d4a19";
const CREAM = "#fbf6e6";
const ROOF = "#b4561c"; // tierra, de la familia de la montaña del logo

export default function BarnTransition({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("closed");
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setPhase("closed");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("inside");
      return;
    }
    setPhase("pop");
    const timers = [
      setTimeout(() => setPhase("doors"), 650),
      setTimeout(() => setPhase("zoom"), 1450),
      setTimeout(() => setPhase("inside"), 2550),
    ];
    return () => timers.forEach(clearTimeout);
  }, [open]);

  useEffect(() => {
    if (phase === "inside") backRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Clases acumuladas: en "zoom" también siguen activas "pop" y "doors"
  const reached = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);
  const cls = ["barnOverlay", ...ORDER.slice(1).filter(reached).map((p) => `is-${p}`)].join(" ");

  return (
    <div className={cls} aria-hidden={!open}>
      <div className="barnZoom">
        <div className="barnPop">
          <svg viewBox="0 0 400 360" className="barnSvg" role="img" aria-label="Granero de The Conuco">
            {/* sombra en el suelo */}
            <ellipse cx="200" cy="334" rx="175" ry="11" fill="#000" opacity="0.2" />

            {/* cuerpo */}
            <path d="M62 330V192L88 128 200 72 312 128 338 192V330Z" fill={SUN} />

            {/* techo: una sola franja gruesa */}
            <path
              d="M50 196L80 122 200 60 320 122 350 196"
              fill="none"
              stroke={ROOF}
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* tablones recortados en crema (como los detalles de Ramoncito) */}
            <g fill={CREAM}>
              <rect x="62" y="200" width="68" height="8" rx="4" />
              <rect x="270" y="200" width="68" height="8" rx="4" />
            </g>

            {/* ventana del pajar */}
            <rect x="172" y="112" width="56" height="46" rx="10" fill={CREAM} />
            <rect x="196" y="112" width="8" height="46" fill={SUN} />
            <rect x="172" y="131" width="56" height="8" fill={SUN} />

            {/* hueco de la puerta (interior) */}
            <rect x="142" y="218" width="116" height="112" rx="6" fill={DEEP} />

            {/* puertas */}
            <g className="door doorL">
              <rect x="142" y="218" width="58" height="112" rx="6" fill={SUN_DARK} />
              <path d="M154 232L188 316M188 232L154 316" stroke={CREAM} strokeWidth="8" strokeLinecap="round" />
            </g>
            <g className="door doorR">
              <rect x="200" y="218" width="58" height="112" rx="6" fill={SUN_DARK} />
              <path d="M212 232L246 316M246 232L212 316" stroke={CREAM} strokeWidth="8" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </div>

      <section className="mapRoom" aria-label="El mapa">
        <h2 className="mapTitle">El mapa del Cibao</h2>
        <p>Aquí irá el mapa.</p>
        <button type="button" className="cta" ref={backRef} onClick={onClose} tabIndex={open ? 0 : -1}>
          Volver
        </button>
      </section>
    </div>
  );
}
