"use client";

// Mapa del Cibao: 52 puntos de análisis sobre imagen satelital.
// Se carga solo en el navegador (Leaflet necesita `window`).
// Todo el texto está pensado para que lo entienda cualquier agricultor, en inglés o en español.

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Model } from "./agro";
import { ForecastDays, RotationsTab, Timeline, WhatIf } from "./PanelExtras";
import { useLang } from "@/lib/i18n";
import { type Lang, crop, dataText, locale, month, soil as soilName, zoneName } from "@/lib/lang";

// ---------- tipos (lo que usamos de los JSON de field-shift-data) ----------
type PointSummary = {
  id: string;
  lat: number;
  lon: number;
  name: string;
  elevationM: number;
  soil: string | null;
  rainMm: number | null;
  waterBalanceMm: number | null;
  slopePct?: number;
  erosionRisk?: "baja" | "media" | "alta" | null;
  heatDaysNow?: number;
  heatDaysFuture?: number;
};

type Indicator = {
  key: string;
  title: string;
  early?: number;
  recent?: number;
  significant?: boolean;
  direction?: string;
  message?: string;
};

type CropBest = { sowMonth: string; harvestMonth: string; rainfed: number; irrigated: number; irrigationMm: number };
type Crop = {
  id: string;
  name: string;
  family: string;
  best: CropBest;
  bestIrrigated: CropBest;
  aptitude: { recent: number; future: number | null; futureByScenario?: Record<string, number> };
};

type Projection = {
  key: string;
  scenario: string;
  horizon: string;
  tempChangeC: number;
  rainChangePct: number;
  heatDaysNow: number;
  heatDaysFuture: number;
  waterBalanceNowMm: number;
  waterBalanceFutureMm: number;
};

type PointDetail = {
  compare: { early: string; recent: string };
  indicators: Indicator[];
  soil?: { textureClass: string; note?: string };
  projections?: Projection[];
  crops: Crop[];
  insights?: { type: string; text: string }[];
  annual?: { year: number; rainMm: number | null; heatDays32: number | null }[];
  model?: Model;
};

type L2 = { es: string; en: string };

// ---------- textos sencillos ----------
const SOIL_PLAIN: Record<string, L2> = {
  Arcilla: { es: "Tierra pesada: guarda mucha agua y puede encharcarse.", en: "Heavy soil: holds a lot of water and can get waterlogged." },
  "Franco arcilloso": { es: "Tierra equilibrada, algo pesada: guarda bien el agua.", en: "Balanced, somewhat heavy soil: holds water well." },
  Franco: { es: "Tierra equilibrada: buena para casi todo.", en: "Balanced soil: good for almost everything." },
  "Franco arenoso": { es: "Tierra suelta: el agua se va rápido.", en: "Loose soil: water drains away fast." },
  Arena: { es: "Tierra muy suelta: casi no guarda agua.", en: "Very loose soil: barely holds any water." },
};

const EROSION_PLAIN: Record<"baja" | "media" | "alta", { word: L2; text: L2 }> = {
  baja: {
    word: { es: "Poca", en: "Low" },
    text: { es: "Terreno llano: la lluvia casi no arrastra la tierra.", en: "Flat land: rain hardly washes the soil away." },
  },
  media: {
    word: { es: "Algo", en: "Some" },
    text: { es: "Terreno algo inclinado: cuida que el suelo no quede desnudo.", en: "Somewhat sloped land: don't leave the soil bare." },
  },
  alta: {
    word: { es: "Mucha", en: "High" },
    text: { es: "Terreno inclinado: la lluvia puede llevarse la tierra buena.", en: "Sloped land: rain can wash away the good topsoil." },
  },
};

export const waterPlain = (lang: Lang, mm: number) => {
  const t = (es: string, en: string) => (lang === "en" ? en : es);
  return mm < -200
    ? t("Falta mucha agua: se evapora más de lo que llueve.", "Water is very short: more evaporates than falls as rain.")
    : mm < 0
      ? t("Falta un poco de agua en el año.", "A little water is missing over the year.")
      : mm < 300
        ? t("Hay agua suficiente en el año.", "There's enough water over the year.")
        : t("Sobra agua: cuidado con encharcamientos.", "There's extra water: watch out for waterlogging.");
};

// Indicadores con nombre y unidad en palabras sencillas
const IND_PLAIN: Record<string, { label: L2; unit: L2; dec?: number }> = {
  heat: { label: { es: "Días de mucho calor", en: "Very hot days" }, unit: { es: "días al año con más de 32 °C", en: "days per year above 32 °C" }, dec: 0 },
  rain: { label: { es: "Lluvia", en: "Rainfall" }, unit: { es: "mm al año", en: "mm per year" }, dec: 0 },
  soil: { label: { es: "Humedad de la tierra", en: "Soil moisture" }, unit: { es: "de 0 (seca) a 1 (empapada)", en: "from 0 (dry) to 1 (soaked)" }, dec: 2 },
  evap: { label: { es: "Agua que se evapora", en: "Water that evaporates" }, unit: { es: "mm al año", en: "mm per year" }, dec: 0 },
  frost: { label: { es: "Heladas", en: "Frost" }, unit: { es: "días al año", en: "days per year" }, dec: 0 },
  extreme: { label: { es: "Aguaceros muy fuertes", en: "Very heavy downpours" }, unit: { es: "meses al año", en: "months per year" }, dec: 1 },
  veg: {
    label: { es: "Plantas estresadas", en: "Stressed plants" },
    unit: { es: "meses al año con plantas débiles (visto por satélite)", en: "months per year with weak plants (seen by satellite)" },
    dec: 1,
  },
  water: {
    label: { es: "Agua disponible", en: "Available water" },
    unit: { es: "mm al año (lluvia menos evaporación)", en: "mm per year (rain minus evaporation)" },
    dec: 0,
  },
};

const INSIGHT_LABEL: Record<string, L2> = {
  oportunidad: { es: "Buena oportunidad", en: "Good opportunity" },
  "oportunidad-futuro": { es: "Mejora en el futuro", en: "Improves in the future" },
  alerta: { es: "Cuidado", en: "Caution" },
  "alerta-futuro": { es: "Cuidado en el futuro", en: "Caution for the future" },
  riego: { es: "Con riego", en: "With irrigation" },
  futuro: { es: "El futuro", en: "The future" },
  riesgo: { es: "Riesgo", en: "Risk" },
  "tendencia+": { es: "Mejoró", en: "Improved" },
};

export const FAMILY_LABEL: Record<string, L2> = {
  cereal: { es: "Cereal", en: "Cereal" },
  leguminosa: { es: "Leguminosa", en: "Legume" },
  raiz: { es: "Raíz", en: "Root" },
  perenne: { es: "Perenne", en: "Perennial" },
};

// ---------- capas del mapa ----------
type LayerId = "agua" | "futuro" | "lluvia" | "suelo" | "erosion";
type Bin = { label: L2; color: string; test: (p: PointSummary) => boolean };

const LAYERS: Record<LayerId, { label: L2; title: L2; bins: Bin[] }> = {
  agua: {
    label: { es: "Agua", en: "Water" },
    title: { es: "¿Alcanza el agua de lluvia?", en: "Is rainwater enough?" },
    bins: [
      { label: { es: "Falta mucha", en: "Very short" }, color: "#b45309", test: (p) => (p.waterBalanceMm ?? 0) < -200 },
      { label: { es: "Falta un poco", en: "A little short" }, color: "#f2b544", test: (p) => (p.waterBalanceMm ?? 0) < 0 },
      { label: { es: "Suficiente", en: "Enough" }, color: "#9ad17f", test: (p) => (p.waterBalanceMm ?? 0) < 300 },
      { label: { es: "Sobra", en: "Surplus" }, color: "#2f9e57", test: () => true },
    ],
  },
  futuro: {
    label: { es: "Futuro", en: "Future" },
    title: { es: "Días de mucho calor al año hacia 2041–2060", en: "Very hot days per year by 2041–2060" },
    bins: [
      { label: { es: "Menos de 120", en: "Under 120" }, color: "#fde7a6", test: (p) => (p.heatDaysFuture ?? 0) < 120 },
      { label: { es: "120 a 200", en: "120 to 200" }, color: "#f6b04a", test: (p) => (p.heatDaysFuture ?? 0) < 200 },
      { label: { es: "200 a 240", en: "200 to 240" }, color: "#e0662e", test: (p) => (p.heatDaysFuture ?? 0) < 240 },
      { label: { es: "Más de 240", en: "Over 240" }, color: "#a8261e", test: () => true },
    ],
  },
  lluvia: {
    label: { es: "Lluvia", en: "Rain" },
    title: { es: "Cuánto llueve al año (satélite GPM)", en: "Rain per year (GPM satellite)" },
    bins: [
      { label: { es: "Menos de 1350 mm", en: "Under 1,350 mm" }, color: "#cfe8f3", test: (p) => (p.rainMm ?? 0) < 1350 },
      { label: { es: "1350 a 1450 mm", en: "1,350 to 1,450 mm" }, color: "#8cc4e0", test: (p) => (p.rainMm ?? 0) < 1450 },
      { label: { es: "1450 a 1600 mm", en: "1,450 to 1,600 mm" }, color: "#3f8fd0", test: (p) => (p.rainMm ?? 0) < 1600 },
      { label: { es: "Más de 1600 mm", en: "Over 1,600 mm" }, color: "#1c4f94", test: () => true },
    ],
  },
  suelo: {
    label: { es: "Tierra", en: "Soil" },
    title: { es: "Tipo de tierra", en: "Soil type" },
    bins: [
      { label: { es: "Arcilla (pesada)", en: "Clay (heavy)" }, color: "#b5651d", test: (p) => p.soil === "Arcilla" },
      { label: { es: "Franco arcillosa (equilibrada)", en: "Clay loam (balanced)" }, color: "#e8b06a", test: (p) => p.soil === "Franco arcilloso" },
      { label: { es: "Otra", en: "Other" }, color: "#d9d9d9", test: () => true },
    ],
  },
  erosion: {
    label: { es: "Erosión", en: "Erosion" },
    title: { es: "¿La lluvia arrastra la tierra?", en: "Does rain wash the soil away?" },
    bins: [
      { label: { es: "Poco (terreno llano)", en: "Little (flat land)" }, color: "#7bc96f", test: (p) => p.erosionRisk === "baja" },
      { label: { es: "Algo", en: "Some" }, color: "#f2b544", test: (p) => p.erosionRisk === "media" },
      { label: { es: "Mucho (inclinado)", en: "A lot (sloped)" }, color: "#d64545", test: (p) => p.erosionRisk === "alta" },
      { label: { es: "Sin dato", en: "No data" }, color: "#d9d9d9", test: () => true },
    ],
  },
};

const colorFor = (layer: LayerId, p: PointSummary) => LAYERS[layer].bins.find((b) => b.test(p))!.color;

// En el celular el panel inferior y la leyenda tapan la parte de abajo y de arriba
const fitPadding = (): L.FitBoundsOptions =>
  window.innerWidth <= 820 ? { paddingTopLeft: [16, 110], paddingBottomRight: [16, 140] } : { padding: [48, 48] };

const fmt = (lang: Lang, v: number | undefined | null, dec?: number) =>
  v == null
    ? "—"
    : dec != null
      ? v.toLocaleString(locale(lang), { maximumFractionDigits: dec, minimumFractionDigits: dec })
      : Math.abs(v) >= 100
        ? Math.round(v).toLocaleString(locale(lang))
        : v.toFixed(1);

export const aptWord = (lang: Lang, x: number) =>
  lang === "en"
    ? x >= 0.8 ? "Very good" : x >= 0.6 ? "Good" : x >= 0.4 ? "Fair" : "Hard"
    : x >= 0.8 ? "Muy bien" : x >= 0.6 ? "Bien" : x >= 0.4 ? "Regular" : "Difícil";

// =====================================================================

export default function MapExplorer({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang();
  const tx = (x: L2) => t(x.es, x.en);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const userMovedRef = useRef(false);

  const [points, setPoints] = useState<PointSummary[]>([]);
  const [layer, setLayer] = useState<LayerId>("agua");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<PointDetail | null>(null);
  const [error, setError] = useState<L2 | null>(null);

  useEffect(() => {
    fetch("/data/points.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setPoints)
      .catch(() =>
        setError({ es: "No se pudieron cargar los puntos. Corre «npm run data».", en: "Couldn't load the points. Run «npm run data»." }),
      );
  }, []);

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 17,
      attribution: "© Esri, Maxar, Earthstar Geographics",
    }).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 17, opacity: 0.9 },
    ).addTo(map);
    map.setView([19.45, -70.85], 9);
    mapRef.current = map;
    // El contenedor crece con la animación del granero: recalcular tamaño y
    // volver a encuadrar los puntos mientras la persona no haya movido el mapa
    map.on("dragstart", () => (userMovedRef.current = true));
    mapEl.current.addEventListener("wheel", () => (userMovedRef.current = true), { passive: true });
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (boundsRef.current && !userMovedRef.current) map.fitBounds(boundsRef.current, fitPadding());
    });
    ro.observe(mapEl.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Dibujar los puntos
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !points.length) return;
    for (const p of points) {
      const m = L.circleMarker([p.lat, p.lon], {
        radius: 9,
        weight: 2,
        color: "#ffffff",
        fillOpacity: 0.95,
        fillColor: colorFor(layer, p),
      })
        .bindTooltip(zoneName(lang, p.name), { direction: "top", offset: [0, -8] })
        .on("click", () => setSelected(p.id))
        .addTo(map);
      markersRef.current.set(p.id, m);
    }
    boundsRef.current = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(boundsRef.current, fitPadding());
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  // Nombres de las zonas en el idioma elegido
  useEffect(() => {
    for (const p of points) markersRef.current.get(p.id)?.setTooltipContent(zoneName(lang, p.name));
  }, [lang, points]);

  // Recolorear al cambiar de capa o de selección
  useEffect(() => {
    for (const p of points) {
      const m = markersRef.current.get(p.id);
      if (!m) continue;
      const on = p.id === selected;
      m.setStyle({
        fillColor: colorFor(layer, p),
        radius: on ? 13 : 9,
        weight: on ? 4 : 2,
        color: on ? "#f4a518" : "#ffffff",
      });
      if (on) m.bringToFront();
    }
  }, [layer, selected, points]);

  // Cargar el detalle del punto seleccionado
  useEffect(() => {
    if (!selected) return;
    setDetail(null);
    let alive = true;
    fetch(`/data/points/${selected}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => alive && setDetail(d))
      .catch(
        () =>
          alive &&
          setError({ es: "No se pudo cargar el detalle de este punto.", en: "Couldn't load this point's details." }),
      );
    return () => {
      alive = false;
    };
  }, [selected]);

  const summary = useMemo(() => points.find((p) => p.id === selected) ?? null, [points, selected]);

  return (
    <div className="explorer">
      <header className="explorerBar">
        <button type="button" className="backBtn" onClick={onClose}>
          ← {t("Volver", "Back")}
        </button>
        <div className="explorerTitle">
          <strong>{t("El mapa del Cibao", "The Cibao map")}</strong>
          <span>{t("Toca un círculo para ver esa zona", "Tap a circle to see that area")}</span>
        </div>
        <div className="layerSwitch" role="radiogroup" aria-label={t("Qué mostrar en el mapa", "What to show on the map")}>
          {(Object.keys(LAYERS) as LayerId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={layer === id}
              className={layer === id ? "isOn" : undefined}
              onClick={() => setLayer(id)}
            >
              {tx(LAYERS[id].label)}
            </button>
          ))}
        </div>
      </header>

      <div className="explorerBody">
        <div className="mapWrap">
          <div ref={mapEl} className="leafletMap" />
          <div className="legend">
            <strong>{tx(LAYERS[layer].title)}</strong>
            <ul>
              {LAYERS[layer].bins
                .filter((b) => points.some((p) => colorFor(layer, p) === b.color))
                .map((b) => (
                  <li key={b.label.es}>
                    <i style={{ background: b.color }} />
                    {tx(b.label)}
                  </li>
                ))}
            </ul>
          </div>
          {error && <p className="mapError">{tx(error)}</p>}
        </div>

        <aside className={`panel${selected ? " isOpen" : ""}`} aria-live="polite">
          {!selected && (
            <div className="panelEmpty">
              <p className="eyebrowMini">{t("Cómo usarlo", "How to use it")}</p>
              <h2>{t("Escoge una zona del valle", "Pick an area of the valley")}</h2>
              {lang === "en" ? (
                <ol className="howTo">
                  <li>
                    <b>Tap a circle</b> near your conuco (farm).
                  </li>
                  <li>
                    See <b>what to plant</b> and in which month.
                  </li>
                  <li>
                    Open <b>The future</b> to see the weather for the coming days and how the climate will change in the
                    years ahead.
                  </li>
                </ol>
              ) : (
                <ol className="howTo">
                  <li>
                    <b>Toca un círculo</b> cerca de tu conuco.
                  </li>
                  <li>
                    Mira <b>qué sembrar</b> y en qué mes.
                  </li>
                  <li>
                    Abre <b>El futuro</b> para ver el tiempo de los próximos días y cómo cambiará el clima en los años
                    que vienen.
                  </li>
                </ol>
              )}
              <p>
                {t(
                  "Arriba puedes cambiar lo que pintan los círculos: agua, futuro, lluvia, tierra o erosión.",
                  "At the top you can change what the circles show: water, future, rain, soil or erosion.",
                )}
              </p>
            </div>
          )}

          {selected && (
            <>
              <div className="panelHead">
                <div>
                  <p className="eyebrowMini">{t("Zona de unos 11 km", "Area of about 11 km")}</p>
                  <h2>{summary ? zoneName(lang, summary.name) : "…"}</h2>
                  {summary && (
                    <p className="panelMeta">
                      {t(`${summary.elevationM} m sobre el nivel del mar`, `${summary.elevationM} m above sea level`)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="panelClose"
                  onClick={() => setSelected(null)}
                  aria-label={t("Cerrar", "Close")}
                >
                  ×
                </button>
              </div>

              {!detail ? (
                <p className="panelLoading">{t("Cargando…", "Loading…")}</p>
              ) : (
                <PointPanel key={selected} d={detail} s={summary} />
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

// =====================================================================

type Tab = "sembrar" | "rotaciones" | "futuro" | "pasado";

function PointPanel({ d, s }: { d: PointDetail; s: PointSummary | null }) {
  const { lang, t } = useLang();
  const tx = (x: L2) => t(x.es, x.en);
  const [tab, setTab] = useState<Tab>("sembrar");

  return (
    <div className="panelBody">
      <ul className="plainFacts">
        {d.soil && (
          <li>
            <span>{t("Tierra", "Soil")}</span>
            <strong>{soilName(lang, d.soil.textureClass)}</strong>
            <p>{SOIL_PLAIN[d.soil.textureClass] ? tx(SOIL_PLAIN[d.soil.textureClass]) : dataText(lang, d.soil.note ?? "")}</p>
          </li>
        )}
        {s?.waterBalanceMm != null && (
          <li>
            <span>{t("Agua", "Water")}</span>
            <strong>
              {s.rainMm != null
                ? t(`Llueven ${fmt(lang, s.rainMm)} mm al año`, `${fmt(lang, s.rainMm)} mm of rain per year`)
                : "—"}
            </strong>
            <p>{waterPlain(lang, s.waterBalanceMm)}</p>
          </li>
        )}
        {s?.erosionRisk && (
          <li>
            <span>{t("Erosión", "Erosion")}</span>
            <strong className={`risk risk-${s.erosionRisk}`}>{tx(EROSION_PLAIN[s.erosionRisk].word)}</strong>
            <p>{tx(EROSION_PLAIN[s.erosionRisk].text)}</p>
          </li>
        )}
      </ul>

      <div className="panelTabs" role="tablist" aria-label={t("Información de la zona", "Area information")}>
        {(
          [
            ["sembrar", t("Qué sembrar", "What to plant")],
            ["rotaciones", t("Rotaciones", "Rotations")],
            ["futuro", t("El futuro", "The future")],
            ["pasado", t("Cómo cambió", "How it changed")],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "isOn" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sembrar" && <SowTab d={d} />}
      {tab === "rotaciones" &&
        (d.model ? (
          <RotationsTab model={d.model} />
        ) : (
          <p className="lede">{t("Faltan datos: corre «npm run data».", "Data missing: run «npm run data».")}</p>
        ))}
      {tab === "futuro" && <FutureTab d={d} s={s} />}
      {tab === "pasado" && <PastTab d={d} />}

      <p className="uncertainty">
        <strong>{t("Ojo:", "Note:")}</strong>{" "}
        {t(
          "cada círculo resume una zona de unos 11 km, no tu finca exacta. Son datos de satélite y modelos de la NASA: úsalos como guía y confírmalos con tu experiencia y con un técnico agrícola.",
          "each circle summarizes an area of about 11 km, not your exact farm. This is NASA satellite and model data: use it as a guide and confirm it with your experience and an agronomist.",
        )}
      </p>

      {!!d.annual?.length && <Timeline annual={d.annual} />}
    </div>
  );
}

// ---------- Qué sembrar ----------
function SowTab({ d }: { d: PointDetail }) {
  const { lang, t } = useLang();
  const tx = (x: L2) => t(x.es, x.en);
  const [mode, setMode] = useState<"secano" | "riego">("secano");
  const crops = useMemo(() => {
    const list = [...d.crops];
    if (mode === "riego")
      list.sort(
        (a, b) =>
          b.bestIrrigated.irrigated - a.bestIrrigated.irrigated ||
          a.bestIrrigated.irrigationMm - b.bestIrrigated.irrigationMm,
      );
    else list.sort((a, b) => b.best.rainfed - a.best.rainfed);
    return list.slice(0, 5);
  }, [d, mode]);

  const tips = (d.insights ?? []).filter((x) => !x.type.includes("futuro"));

  return (
    <section className="tabPane">
      <div className="secHead">
        <p className="lede">{t("Los cultivos que mejor se dan aquí:", "The crops that grow best here:")}</p>
        <div className="miniTabs" role="radiogroup" aria-label={t("Con o sin riego", "With or without irrigation")}>
          {(["secano", "riego"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={mode === m ? "isOn" : undefined}
              onClick={() => setMode(m)}
            >
              {m === "secano" ? t("Solo lluvia", "Rain only") : t("Con riego", "Irrigated")}
            </button>
          ))}
        </div>
      </div>
      <ol className="cropRank">
        {crops.map((c) => {
          const b = mode === "riego" ? c.bestIrrigated : c.best;
          const score = mode === "riego" ? b.irrigated : b.rainfed;
          return (
            <li key={c.id}>
              <div className="cropTop">
                <strong>{crop(lang, c.name)}</strong>
                <span className={`famTag fam-${c.family}`}>{FAMILY_LABEL[c.family] ? tx(FAMILY_LABEL[c.family]) : c.family}</span>
                <span className="cropScore">{aptWord(lang, score)}</span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.round(score * 100)}%` }} />
              </div>
              <p className="cropMeta">
                {t("Siembra en ", "Sow in ")}
                <b>{month(lang, b.sowMonth)}</b>
                {t(", cosecha en ", ", harvest in ")}
                <b>{month(lang, b.harvestMonth)}</b>
                {mode === "riego" &&
                  b.irrigationMm > 5 &&
                  t(
                    ` · necesita unos ${Math.round(b.irrigationMm)} mm de riego`,
                    ` · needs about ${Math.round(b.irrigationMm)} mm of irrigation`,
                  )}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="hint">
        {t(
          "Esto dice qué tan bien le van el clima y la tierra de esta zona a cada cultivo. No mide precios, mercado ni costumbre: por eso el sorgo, que aguanta mucho calor y sequía, suele salir arriba. Para elegir, mira también las Rotaciones y lo que se vende en tu zona.",
          "This shows how well this area's climate and soil suit each crop. It doesn't measure prices, markets or local habits: that's why sorghum, which handles heat and drought very well, usually comes out on top. To choose, also check Rotations and what sells in your area.",
        )}
      </p>
      {!!tips.length && (
        <ul className="insights">
          {tips.slice(0, 4).map((x, i) => (
            <li key={i} className={`ins-${x.type}`}>
              <span>{INSIGHT_LABEL[x.type] ? tx(INSIGHT_LABEL[x.type]) : x.type}</span>
              {dataText(lang, x.text)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- El futuro ----------
function FutureTab({ d, s }: { d: PointDetail; s: PointSummary | null }) {
  const { t } = useLang();
  const [view, setView] = useState<"dias" | "anos">("dias");
  return (
    <section className="tabPane">
      <div className="miniTabs futureSwitch" role="radiogroup" aria-label={t("Qué futuro ver", "Which future to see")}>
        <button
          type="button"
          role="radio"
          aria-checked={view === "dias"}
          className={view === "dias" ? "isOn" : undefined}
          onClick={() => setView("dias")}
        >
          {t("Próximos días", "Next days")}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={view === "anos"}
          className={view === "anos" ? "isOn" : undefined}
          onClick={() => setView("anos")}
        >
          {t("Años que vienen", "Years ahead")}
        </button>
      </div>
      {view === "dias" ? s ? <ForecastDays lat={s.lat} lon={s.lon} /> : null : <ClimateFuture d={d} />}
    </section>
  );
}

function ClimateFuture({ d }: { d: PointDetail }) {
  const { lang, t } = useLang();
  const [horizon, setHorizon] = useState("2041-2060");
  const [scenario, setScenario] = useState("ssp245");
  const key = `${scenario}_${horizon}`;
  const p = d.projections?.find((x) => x.key === key);

  const cropChanges = useMemo(
    () =>
      d.crops
        .map((c) => ({ name: c.name, now: c.aptitude.recent, fut: c.aptitude.futureByScenario?.[key] ?? null }))
        .filter((c): c is { name: string; now: number; fut: number } => c.fut != null && c.now >= 0.3)
        .map((c) => ({ ...c, delta: c.fut - c.now })),
    [d, key],
  );

  if (!p) return <p className="lede">{t("No hay proyección del futuro para esta zona.", "There's no future projection for this area.")}</p>;

  const [y1, y2] = horizon.split("-");
  const hotMore = p.heatDaysFuture - p.heatDaysNow;
  const rainTxt =
    Math.abs(p.rainChangePct) < 5
      ? t("casi igual que hoy", "about the same as today")
      : p.rainChangePct > 0
        ? t(`${p.rainChangePct}% más que hoy`, `${p.rainChangePct}% more than today`)
        : t(`${Math.abs(p.rainChangePct)}% menos que hoy`, `${Math.abs(p.rainChangePct)}% less than today`);
  const waterWorse = p.waterBalanceFutureMm < p.waterBalanceNowMm;
  const losers = cropChanges.filter((c) => c.delta <= -0.1).sort((a, b) => a.delta - b.delta);
  const winners = cropChanges.filter((c) => c.delta >= 0.1).sort((a, b) => b.delta - a.delta);
  const maxHeat = Math.max(p.heatDaysNow, p.heatDaysFuture, 1);
  const names = (list: { name: string }[]) => list.map((c) => crop(lang, c.name)).join(", ");

  return (
    <div>
      <div className="futurePickers">
        <label>
          {t("¿Cuándo?", "When?")}
          <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
            <option value="2026-2045">{t("Pronto (2026–2045)", "Soon (2026–2045)")}</option>
            <option value="2041-2060">{t("Más adelante (2041–2060)", "Later (2041–2060)")}</option>
          </select>
        </label>
        <label>
          {t("Si la contaminación…", "If pollution…")}
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
            <option value="ssp245">{t("baja un poco", "drops a little")}</option>
            <option value="ssp585">{t("sigue igual", "stays the same")}</option>
          </select>
        </label>
      </div>

      <p className="lede">{t(`Entre ${y1} y ${y2}, en esta zona:`, `Between ${y1} and ${y2}, in this area:`)}</p>

      <ul className="futureList">
        <li>
          <span className="fIcon" aria-hidden="true">
            🌡️
          </span>
          <div>
            <strong>
              {t(`Hará ${fmt(lang, p.tempChangeC, 1)} °C más de calor`, `It will be ${fmt(lang, p.tempChangeC, 1)} °C hotter`)}
            </strong>
            <p>{t("en promedio que hoy.", "on average than today.")}</p>
          </div>
        </li>
        <li>
          <span className="fIcon" aria-hidden="true">
            ☀️
          </span>
          <div>
            <strong>
              {hotMore > 0
                ? t(`${Math.round(hotMore)} días más de mucho calor al año`, `${Math.round(hotMore)} more very hot days per year`)
                : t("Los días de mucho calor se mantienen", "Very hot days stay about the same")}
            </strong>
            <div className="compareBars">
              <div>
                <span>{t("Hoy", "Today")}</span>
                <i style={{ width: `${(p.heatDaysNow / maxHeat) * 100}%` }} />
                <b>{Math.round(p.heatDaysNow)}</b>
              </div>
              <div>
                <span>{t("Futuro", "Future")}</span>
                <i className="hot" style={{ width: `${(p.heatDaysFuture / maxHeat) * 100}%` }} />
                <b>{Math.round(p.heatDaysFuture)}</b>
              </div>
            </div>
            <p>{t("días al año con más de 32 °C.", "days per year above 32 °C.")}</p>
          </div>
        </li>
        <li>
          <span className="fIcon" aria-hidden="true">
            🌧️
          </span>
          <div>
            <strong>{t(`Lloverá ${rainTxt}`, `Rainfall: ${rainTxt}`)}</strong>
          </div>
        </li>
        <li>
          <span className="fIcon" aria-hidden="true">
            💧
          </span>
          <div>
            <strong>
              {waterWorse ? t("Faltará más agua", "Water will be shorter") : t("El agua alcanzará igual o mejor", "Water will be as good or better")}
            </strong>
            <p>
              {t("Con más calor se evapora más agua.", "With more heat, more water evaporates.")} {waterPlain(lang, p.waterBalanceFutureMm)}
            </p>
          </div>
        </li>
      </ul>

      <div className="cropFuture">
        <p className="lede">{t("Qué pasará con los cultivos:", "What will happen to crops:")}</p>
        {losers.length > 0 && (
          <p className="down">
            <b>{t("Les irá peor:", "Will do worse:")}</b> {names(losers)}.
          </p>
        )}
        {winners.length > 0 && (
          <p className="up">
            <b>{t("Les irá mejor:", "Will do better:")}</b> {names(winners)}.
          </p>
        )}
        {losers.length === 0 && winners.length === 0 && (
          <p>{t("Los cultivos principales se mantienen parecidos.", "The main crops stay about the same.")}</p>
        )}
      </div>

      <p className="hint">
        {t(
          "Esto no es el pronóstico del tiempo de mañana: es cómo podría ser el clima promedio de esos años, según los modelos climáticos de la NASA (NEX-GDDP-CMIP6).",
          "This isn't tomorrow's weather forecast: it's what the average climate of those years could look like, according to NASA climate models (NEX-GDDP-CMIP6).",
        )}
      </p>

      {d.model && <WhatIf model={d.model} />}
    </div>
  );
}

// ---------- Cómo ha cambiado ----------
function PastTab({ d }: { d: PointDetail }) {
  const { lang, t } = useLang();
  const tx = (x: L2) => t(x.es, x.en);
  return (
    <section className="tabPane">
      <p className="lede">
        {t(`Comparamos los años ${d.compare.early} con ${d.compare.recent}:`, `We compare ${d.compare.early} with ${d.compare.recent}:`)}
      </p>
      <ul className="indList">
        {d.indicators.map((i) => {
          const pl = IND_PLAIN[i.key];
          return (
            <li key={i.key}>
              <div className="indTop">
                <strong>{pl ? tx(pl.label) : i.title}</strong>
                {i.early != null && (
                  <span className={`conf ${i.significant ? "isClear" : ""}`}>
                    {!i.significant
                      ? t("Sin cambio claro", "No clear change")
                      : i.direction === "en descenso"
                        ? t("▼ Bajó", "▼ Went down")
                        : t("▲ Subió", "▲ Went up")}
                  </span>
                )}
              </div>
              {i.early != null ? (
                <p className="indVals">
                  {t("Antes", "Before")} {fmt(lang, i.early, pl?.dec)} → {t("ahora", "now")} <b>{fmt(lang, i.recent, pl?.dec)}</b>{" "}
                  <span>{pl ? tx(pl.unit) : ""}</span>
                </p>
              ) : (
                <p className="indVals">{dataText(lang, i.message ?? "")}</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="hint">
        {t(
          "«Subió» o «Bajó» quiere decir que el cambio es real según una prueba estadística. «Sin cambio claro» quiere decir que la diferencia puede ser solo la variación normal de un año a otro.",
          "“Went up” or “Went down” means the change is real according to a statistical test. “No clear change” means the difference may just be normal year-to-year variation.",
        )}
      </p>
    </section>
  );
}
