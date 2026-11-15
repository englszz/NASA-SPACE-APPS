"use client";

// Mapa del Cibao: 52 puntos de análisis sobre imagen satelital.
// Se carga solo en el navegador (Leaflet necesita `window`).
// Todo el texto está pensado para que lo entienda cualquier agricultor.

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Model } from "./agro";
import { ForecastDays, RotationsTab, Timeline, WhatIf } from "./PanelExtras";

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

// ---------- textos sencillos ----------
const SOIL_PLAIN: Record<string, string> = {
  Arcilla: "Tierra pesada: guarda mucha agua y puede encharcarse.",
  "Franco arcilloso": "Tierra equilibrada, algo pesada: guarda bien el agua.",
  Franco: "Tierra equilibrada: buena para casi todo.",
  "Franco arenoso": "Tierra suelta: el agua se va rápido.",
  Arena: "Tierra muy suelta: casi no guarda agua.",
};

const EROSION_PLAIN = {
  baja: "Terreno llano: la lluvia casi no arrastra la tierra.",
  media: "Terreno algo inclinado: cuida que el suelo no quede desnudo.",
  alta: "Terreno inclinado: la lluvia puede llevarse la tierra buena.",
};

const waterPlain = (mm: number) =>
  mm < -200
    ? "Falta mucha agua: se evapora más de lo que llueve."
    : mm < 0
      ? "Falta un poco de agua en el año."
      : mm < 300
        ? "Hay agua suficiente en el año."
        : "Sobra agua: cuidado con encharcamientos.";

// Indicadores con nombre y unidad en palabras sencillas
const IND_PLAIN: Record<string, { label: string; unit: string; dec?: number }> = {
  heat: { label: "Días de mucho calor", unit: "días al año con más de 32 °C", dec: 0 },
  rain: { label: "Lluvia", unit: "mm al año", dec: 0 },
  soil: { label: "Humedad de la tierra", unit: "de 0 (seca) a 1 (empapada)", dec: 2 },
  evap: { label: "Agua que se evapora", unit: "mm al año", dec: 0 },
  frost: { label: "Heladas", unit: "días al año", dec: 0 },
  extreme: { label: "Aguaceros muy fuertes", unit: "meses al año", dec: 1 },
  veg: { label: "Plantas estresadas", unit: "meses al año con plantas débiles (visto por satélite)", dec: 1 },
  water: { label: "Agua disponible", unit: "mm al año (lluvia menos evaporación)", dec: 0 },
};

const INSIGHT_LABEL: Record<string, string> = {
  oportunidad: "Buena oportunidad",
  "oportunidad-futuro": "Mejora en el futuro",
  alerta: "Cuidado",
  "alerta-futuro": "Cuidado en el futuro",
  riego: "Con riego",
  futuro: "El futuro",
  riesgo: "Riesgo",
};

const FAMILY_LABEL: Record<string, string> = {
  cereal: "Cereal",
  leguminosa: "Leguminosa",
  raiz: "Raíz",
  perenne: "Perenne",
};

// ---------- capas del mapa ----------
type LayerId = "agua" | "futuro" | "lluvia" | "suelo" | "erosion";
type Bin = { label: string; color: string; test: (p: PointSummary) => boolean };

const LAYERS: Record<LayerId, { label: string; title: string; bins: Bin[] }> = {
  agua: {
    label: "Agua",
    title: "¿Alcanza el agua de lluvia?",
    bins: [
      { label: "Falta mucha", color: "#b45309", test: (p) => (p.waterBalanceMm ?? 0) < -200 },
      { label: "Falta un poco", color: "#f2b544", test: (p) => (p.waterBalanceMm ?? 0) < 0 },
      { label: "Suficiente", color: "#9ad17f", test: (p) => (p.waterBalanceMm ?? 0) < 300 },
      { label: "Sobra", color: "#2f9e57", test: () => true },
    ],
  },
  futuro: {
    label: "Futuro",
    title: "Días de mucho calor al año hacia 2041–2060",
    bins: [
      { label: "Menos de 120", color: "#fde7a6", test: (p) => (p.heatDaysFuture ?? 0) < 120 },
      { label: "120 a 200", color: "#f6b04a", test: (p) => (p.heatDaysFuture ?? 0) < 200 },
      { label: "200 a 240", color: "#e0662e", test: (p) => (p.heatDaysFuture ?? 0) < 240 },
      { label: "Más de 240", color: "#a8261e", test: () => true },
    ],
  },
  lluvia: {
    label: "Lluvia",
    title: "Cuánto llueve al año (satélite GPM)",
    bins: [
      { label: "Menos de 1350 mm", color: "#cfe8f3", test: (p) => (p.rainMm ?? 0) < 1350 },
      { label: "1350 a 1450 mm", color: "#8cc4e0", test: (p) => (p.rainMm ?? 0) < 1450 },
      { label: "1450 a 1600 mm", color: "#3f8fd0", test: (p) => (p.rainMm ?? 0) < 1600 },
      { label: "Más de 1600 mm", color: "#1c4f94", test: () => true },
    ],
  },
  suelo: {
    label: "Tierra",
    title: "Tipo de tierra",
    bins: [
      { label: "Arcilla (pesada)", color: "#b5651d", test: (p) => p.soil === "Arcilla" },
      { label: "Franco arcillosa (equilibrada)", color: "#e8b06a", test: (p) => p.soil === "Franco arcilloso" },
      { label: "Otra", color: "#d9d9d9", test: () => true },
    ],
  },
  erosion: {
    label: "Erosión",
    title: "¿La lluvia arrastra la tierra?",
    bins: [
      { label: "Poco (terreno llano)", color: "#7bc96f", test: (p) => p.erosionRisk === "baja" },
      { label: "Algo", color: "#f2b544", test: (p) => p.erosionRisk === "media" },
      { label: "Mucho (inclinado)", color: "#d64545", test: (p) => p.erosionRisk === "alta" },
      { label: "Sin dato", color: "#d9d9d9", test: () => true },
    ],
  },
};

const colorFor = (layer: LayerId, p: PointSummary) => LAYERS[layer].bins.find((b) => b.test(p))!.color;

// En el celular el panel inferior y la leyenda tapan la parte de abajo y de arriba
const fitPadding = (): L.FitBoundsOptions =>
  window.innerWidth <= 820 ? { paddingTopLeft: [16, 110], paddingBottomRight: [16, 140] } : { padding: [48, 48] };

const fmt = (v: number | undefined | null, dec?: number) =>
  v == null
    ? "—"
    : dec != null
      ? v.toLocaleString("es-DO", { maximumFractionDigits: dec, minimumFractionDigits: dec })
      : Math.abs(v) >= 100
        ? Math.round(v).toLocaleString("es-DO")
        : v.toFixed(1);

// =====================================================================

export default function MapExplorer({ onClose }: { onClose: () => void }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const userMovedRef = useRef(false);

  const [points, setPoints] = useState<PointSummary[]>([]);
  const [layer, setLayer] = useState<LayerId>("agua");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<PointDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/points.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setPoints)
      .catch(() => setError("No se pudieron cargar los puntos. Corre «npm run data»."));
  }, []);

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 17,
      attribution: "Imagen © Esri, Maxar, Earthstar Geographics",
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
        .bindTooltip(p.name, { direction: "top", offset: [0, -8] })
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
      .catch(() => alive && setError("No se pudo cargar el detalle de este punto."));
    return () => {
      alive = false;
    };
  }, [selected]);

  const summary = useMemo(() => points.find((p) => p.id === selected) ?? null, [points, selected]);

  return (
    <div className="explorer">
      <header className="explorerBar">
        <button type="button" className="backBtn" onClick={onClose}>
          ← Volver
        </button>
        <div className="explorerTitle">
          <strong>El mapa del Cibao</strong>
          <span>Toca un círculo para ver esa zona</span>
        </div>
        <div className="layerSwitch" role="radiogroup" aria-label="Qué mostrar en el mapa">
          {(Object.keys(LAYERS) as LayerId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={layer === id}
              className={layer === id ? "isOn" : undefined}
              onClick={() => setLayer(id)}
            >
              {LAYERS[id].label}
            </button>
          ))}
        </div>
      </header>

      <div className="explorerBody">
        <div className="mapWrap">
          <div ref={mapEl} className="leafletMap" />
          <div className="legend">
            <strong>{LAYERS[layer].title}</strong>
            <ul>
              {LAYERS[layer].bins
                .filter((b) => points.some((p) => colorFor(layer, p) === b.color))
                .map((b) => (
                  <li key={b.label}>
                    <i style={{ background: b.color }} />
                    {b.label}
                  </li>
                ))}
            </ul>
          </div>
          {error && <p className="mapError">{error}</p>}
        </div>

        <aside className={`panel${selected ? " isOpen" : ""}`} aria-live="polite">
          {!selected && (
            <div className="panelEmpty">
              <p className="eyebrowMini">Cómo usarlo</p>
              <h2>Escoge una zona del valle</h2>
              <ol className="howTo">
                <li>
                  <b>Toca un círculo</b> cerca de tu conuco.
                </li>
                <li>
                  Mira <b>qué sembrar</b> y en qué mes.
                </li>
                <li>
                  Abre <b>El futuro</b> para ver el tiempo de los próximos días y cómo cambiará el clima en los
                  años que vienen.
                </li>
              </ol>
              <p>Arriba puedes cambiar lo que pintan los círculos: agua, futuro, lluvia, tierra o erosión.</p>
            </div>
          )}

          {selected && (
            <>
              <div className="panelHead">
                <div>
                  <p className="eyebrowMini">Zona de unos 11 km</p>
                  <h2>{summary?.name ?? "…"}</h2>
                  {summary && <p className="panelMeta">{summary.elevationM} m sobre el nivel del mar</p>}
                </div>
                <button type="button" className="panelClose" onClick={() => setSelected(null)} aria-label="Cerrar">
                  ×
                </button>
              </div>

              {!detail ? <p className="panelLoading">Cargando…</p> : <PointPanel key={selected} d={detail} s={summary} />}
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
  const [tab, setTab] = useState<Tab>("sembrar");

  return (
    <div className="panelBody">
      <ul className="plainFacts">
        {d.soil && (
          <li>
            <span>Tierra</span>
            <strong>{d.soil.textureClass}</strong>
            <p>{SOIL_PLAIN[d.soil.textureClass] ?? d.soil.note}</p>
          </li>
        )}
        {s?.waterBalanceMm != null && (
          <li>
            <span>Agua</span>
            <strong>{s.rainMm != null ? `Llueven ${fmt(s.rainMm)} mm al año` : "—"}</strong>
            <p>{waterPlain(s.waterBalanceMm)}</p>
          </li>
        )}
        {s?.erosionRisk && (
          <li>
            <span>Erosión</span>
            <strong className={`risk risk-${s.erosionRisk}`}>
              {s.erosionRisk === "baja" ? "Poca" : s.erosionRisk === "media" ? "Algo" : "Mucha"}
            </strong>
            <p>{EROSION_PLAIN[s.erosionRisk]}</p>
          </li>
        )}
      </ul>

      <div className="panelTabs" role="tablist" aria-label="Información de la zona">
        {(
          [
            ["sembrar", "Qué sembrar"],
            ["rotaciones", "Rotaciones"],
            ["futuro", "El futuro"],
            ["pasado", "Cómo cambió"],
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
        (d.model ? <RotationsTab model={d.model} /> : <p className="lede">Faltan datos: corre «npm run data».</p>)}
      {tab === "futuro" && <FutureTab d={d} s={s} />}
      {tab === "pasado" && <PastTab d={d} />}

      <p className="uncertainty">
        <strong>Ojo:</strong> cada círculo resume una zona de unos 11 km, no tu finca exacta. Son datos de satélite y
        modelos de la NASA: úsalos como guía y confírmalos con tu experiencia y con un técnico agrícola.
      </p>

      {!!d.annual?.length && <Timeline annual={d.annual} />}
    </div>
  );
}

// ---------- Qué sembrar ----------
function SowTab({ d }: { d: PointDetail }) {
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
        <p className="lede">Los cultivos que mejor se dan aquí:</p>
        <div className="miniTabs" role="radiogroup" aria-label="Con o sin riego">
          {(["secano", "riego"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={mode === m ? "isOn" : undefined}
              onClick={() => setMode(m)}
            >
              {m === "secano" ? "Solo lluvia" : "Con riego"}
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
                <strong>{c.name}</strong>
                <span className={`famTag fam-${c.family}`}>{FAMILY_LABEL[c.family] ?? c.family}</span>
                <span className="cropScore">
                  {score >= 0.8 ? "Muy bien" : score >= 0.6 ? "Bien" : score >= 0.4 ? "Regular" : "Difícil"}
                </span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.round(score * 100)}%` }} />
              </div>
              <p className="cropMeta">
                Siembra en <b>{b.sowMonth}</b>, cosecha en <b>{b.harvestMonth}</b>
                {mode === "riego" && b.irrigationMm > 5 && ` · necesita unos ${Math.round(b.irrigationMm)} mm de riego`}
              </p>
            </li>
          );
        })}
      </ol>
      {!!tips.length && (
        <ul className="insights">
          {tips.slice(0, 4).map((x, i) => (
            <li key={i} className={`ins-${x.type}`}>
              <span>{INSIGHT_LABEL[x.type] ?? x.type}</span>
              {x.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- El futuro ----------
function FutureTab({ d, s }: { d: PointDetail; s: PointSummary | null }) {
  const [view, setView] = useState<"dias" | "anos">("dias");
  return (
    <section className="tabPane">
      <div className="miniTabs futureSwitch" role="radiogroup" aria-label="Qué futuro ver">
        <button type="button" role="radio" aria-checked={view === "dias"} className={view === "dias" ? "isOn" : undefined} onClick={() => setView("dias")}>
          Próximos días
        </button>
        <button type="button" role="radio" aria-checked={view === "anos"} className={view === "anos" ? "isOn" : undefined} onClick={() => setView("anos")}>
          Años que vienen
        </button>
      </div>
      {view === "dias" ? (
        s ? <ForecastDays lat={s.lat} lon={s.lon} /> : null
      ) : (
        <ClimateFuture d={d} />
      )}
    </section>
  );
}

function ClimateFuture({ d }: { d: PointDetail }) {
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

  if (!p) return <p className="lede">No hay proyección del futuro para esta zona.</p>;

  const [y1, y2] = horizon.split("-");
  const hotMore = p.heatDaysFuture - p.heatDaysNow;
  const rainTxt =
    Math.abs(p.rainChangePct) < 5
      ? "casi igual que hoy"
      : p.rainChangePct > 0
        ? `${p.rainChangePct}% más que hoy`
        : `${Math.abs(p.rainChangePct)}% menos que hoy`;
  const waterWorse = p.waterBalanceFutureMm < p.waterBalanceNowMm;
  const losers = cropChanges.filter((c) => c.delta <= -0.1).sort((a, b) => a.delta - b.delta);
  const winners = cropChanges.filter((c) => c.delta >= 0.1).sort((a, b) => b.delta - a.delta);
  const maxHeat = Math.max(p.heatDaysNow, p.heatDaysFuture, 1);

  return (
    <div>
      <div className="futurePickers">
        <label>
          ¿Cuándo?
          <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
            <option value="2026-2045">Pronto (2026–2045)</option>
            <option value="2041-2060">Más adelante (2041–2060)</option>
          </select>
        </label>
        <label>
          Si la contaminación…
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
            <option value="ssp245">baja un poco</option>
            <option value="ssp585">sigue igual</option>
          </select>
        </label>
      </div>

      <p className="lede">
        Entre {y1} y {y2}, en esta zona:
      </p>

      <ul className="futureList">
        <li>
          <span className="fIcon" aria-hidden="true">🌡️</span>
          <div>
            <strong>Hará {fmt(p.tempChangeC, 1)} °C más de calor</strong>
            <p>en promedio que hoy.</p>
          </div>
        </li>
        <li>
          <span className="fIcon" aria-hidden="true">☀️</span>
          <div>
            <strong>
              {hotMore > 0
                ? `${Math.round(hotMore)} días más de mucho calor al año`
                : "Los días de mucho calor se mantienen"}
            </strong>
            <div className="compareBars">
              <div>
                <span>Hoy</span>
                <i style={{ width: `${(p.heatDaysNow / maxHeat) * 100}%` }} />
                <b>{Math.round(p.heatDaysNow)}</b>
              </div>
              <div>
                <span>Futuro</span>
                <i className="hot" style={{ width: `${(p.heatDaysFuture / maxHeat) * 100}%` }} />
                <b>{Math.round(p.heatDaysFuture)}</b>
              </div>
            </div>
            <p>días al año con más de 32 °C.</p>
          </div>
        </li>
        <li>
          <span className="fIcon" aria-hidden="true">🌧️</span>
          <div>
            <strong>Lloverá {rainTxt}</strong>
          </div>
        </li>
        <li>
          <span className="fIcon" aria-hidden="true">💧</span>
          <div>
            <strong>{waterWorse ? "Faltará más agua" : "El agua alcanzará igual o mejor"}</strong>
            <p>Con más calor se evapora más agua. {waterPlain(p.waterBalanceFutureMm)}</p>
          </div>
        </li>
      </ul>

      <div className="cropFuture">
        <p className="lede">Qué pasará con los cultivos:</p>
        {losers.length > 0 && (
          <p className="down">
            <b>Les irá peor:</b> {losers.map((c) => c.name).join(", ")}.
          </p>
        )}
        {winners.length > 0 && (
          <p className="up">
            <b>Les irá mejor:</b> {winners.map((c) => c.name).join(", ")}.
          </p>
        )}
        {losers.length === 0 && winners.length === 0 && <p>Los cultivos principales se mantienen parecidos.</p>}
      </div>

      <p className="hint">
        Esto no es el pronóstico del tiempo de mañana: es cómo podría ser el clima promedio de esos años, según los
        modelos climáticos de la NASA (NEX-GDDP-CMIP6).
      </p>

      {d.model && <WhatIf model={d.model} />}
    </div>
  );
}

// ---------- Cómo ha cambiado ----------
function PastTab({ d }: { d: PointDetail }) {
  return (
    <section className="tabPane">
      <p className="lede">
        Comparamos los años {d.compare.early} con {d.compare.recent}:
      </p>
      <ul className="indList">
        {d.indicators.map((i) => {
          const pl = IND_PLAIN[i.key];
          return (
            <li key={i.key}>
              <div className="indTop">
                <strong>{pl?.label ?? i.title}</strong>
                {i.early != null && (
                  <span className={`conf ${i.significant ? "isClear" : ""}`}>
                    {!i.significant ? "Sin cambio claro" : i.direction === "en descenso" ? "▼ Bajó" : "▲ Subió"}
                  </span>
                )}
              </div>
              {i.early != null ? (
                <p className="indVals">
                  Antes {fmt(i.early, pl?.dec)} → ahora <b>{fmt(i.recent, pl?.dec)}</b> <span>{pl?.unit}</span>
                </p>
              ) : (
                <p className="indVals">{i.message}</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="hint">
        «Subió» o «Bajó» quiere decir que el cambio es real según una prueba estadística. «Sin cambio claro» quiere decir
        que la diferencia puede ser solo la variación normal de un año a otro.
      </p>
    </section>
  );
}
