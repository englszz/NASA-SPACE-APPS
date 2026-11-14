"use client";

// Mapa del Cibao: 52 puntos de análisis sobre imagen satelital.
// Se carga solo en el navegador (Leaflet necesita `window`).

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";

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
};

type Indicator = {
  key: string;
  title: string;
  unit?: string;
  source?: string;
  early?: number;
  recent?: number;
  significant?: boolean;
  pValue?: number;
  direction?: string;
  message?: string;
};

type CropBest = { sowMonth: string; harvestMonth: string; rainfed: number; irrigated: number; irrigationMm: number };
type Crop = {
  id: string;
  name: string;
  family: string;
  cycle: number;
  best: CropBest;
  bestIrrigated: CropBest;
  aptitude: { early: number; recent: number; future: number };
};

type PointDetail = {
  region: { name: string; lat: number; lon: number; elevationM: number };
  compare: { early: string; recent: string };
  indicators: Indicator[];
  soil?: { textureClass: string; note?: string; sand: number; clay: number; silt: number; ph: number };
  projections?: {
    key: string;
    label: string;
    tempChangeC: number;
    rainChangePct: number;
    heatDaysNow: number;
    heatDaysFuture: number;
    waterBalanceNowMm: number;
    waterBalanceFutureMm: number;
  }[];
  crops: Crop[];
  insights?: { type: string; text: string }[];
};

// ---------- capas del mapa ----------
type LayerId = "agua" | "lluvia" | "suelo" | "erosion";
type Bin = { label: string; color: string; test: (p: PointSummary) => boolean };

const LAYERS: Record<LayerId, { label: string; title: string; bins: Bin[] }> = {
  agua: {
    label: "Agua",
    title: "Balance hídrico (lluvia − evaporación), mm/año",
    bins: [
      { label: "< −200 · déficit fuerte", color: "#b45309", test: (p) => (p.waterBalanceMm ?? 0) < -200 },
      { label: "−200 a 0 · déficit", color: "#f2b544", test: (p) => (p.waterBalanceMm ?? 0) < 0 },
      { label: "0 a 300 · superávit", color: "#9ad17f", test: (p) => (p.waterBalanceMm ?? 0) < 300 },
      { label: "> 300 · superávit alto", color: "#2f9e57", test: () => true },
    ],
  },
  lluvia: {
    label: "Lluvia",
    title: "Lluvia anual 2016–2025 (GPM IMERG), mm",
    bins: [
      { label: "< 1350", color: "#cfe8f3", test: (p) => (p.rainMm ?? 0) < 1350 },
      { label: "1350–1450", color: "#8cc4e0", test: (p) => (p.rainMm ?? 0) < 1450 },
      { label: "1450–1600", color: "#3f8fd0", test: (p) => (p.rainMm ?? 0) < 1600 },
      { label: "> 1600", color: "#1c4f94", test: () => true },
    ],
  },
  suelo: {
    label: "Suelo",
    title: "Textura del suelo 0–30 cm (ISRIC SoilGrids)",
    bins: [
      { label: "Arcilla", color: "#b5651d", test: (p) => p.soil === "Arcilla" },
      { label: "Franco arcilloso", color: "#e8b06a", test: (p) => p.soil === "Franco arcilloso" },
      { label: "Otro", color: "#d9d9d9", test: () => true },
    ],
  },
  erosion: {
    label: "Erosión",
    title: "Riesgo de erosión por pendiente (NASA SRTM)",
    bins: [
      { label: "Baja (< 3 %)", color: "#7bc96f", test: (p) => p.erosionRisk === "baja" },
      { label: "Media (3–8 %)", color: "#f2b544", test: (p) => p.erosionRisk === "media" },
      { label: "Alta (> 8 %)", color: "#d64545", test: (p) => p.erosionRisk === "alta" },
      { label: "Sin dato", color: "#d9d9d9", test: () => true },
    ],
  },
};

// En el celular el panel inferior y la leyenda tapan la parte de abajo y de arriba
const fitPadding = (): L.FitBoundsOptions =>
  window.innerWidth <= 820
    ? { paddingTopLeft: [16, 110], paddingBottomRight: [16, 140] }
    : { padding: [48, 48] };

const colorFor = (layer: LayerId, p: PointSummary) => LAYERS[layer].bins.find((b) => b.test(p))!.color;

const FAMILY_LABEL: Record<string, string> = {
  cereal: "Cereal",
  leguminosa: "Leguminosa",
  raiz: "Raíz",
  perenne: "Perenne",
};

const fmt = (v: number | undefined | null) =>
  v == null ? "—" : Math.abs(v) >= 100 ? Math.round(v).toLocaleString("es-DO") : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

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

  // Cargar la lista de puntos
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
          <span>{points.length || "…"} puntos · toca uno para ver su análisis</span>
        </div>
        <div className="layerSwitch" role="radiogroup" aria-label="Capa del mapa">
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
              <h2>Escoge un punto del valle</h2>
              <p>
                Cada círculo resume unos 11 km del Cibao con 20 años de datos de la NASA. Cambia la capa arriba para ver
                agua, lluvia, suelo o erosión.
              </p>
            </div>
          )}

          {selected && (
            <>
              <div className="panelHead">
                <div>
                  <p className="eyebrowMini">Punto de análisis</p>
                  <h2>{summary?.name ?? "…"}</h2>
                  {summary && (
                    <p className="panelMeta">
                      {summary.lat.toFixed(2)}°, {summary.lon.toFixed(2)}° · {summary.elevationM} m de altura
                    </p>
                  )}
                </div>
                <button type="button" className="panelClose" onClick={() => setSelected(null)} aria-label="Cerrar">
                  ×
                </button>
              </div>

              {!detail ? (
                <p className="panelLoading">Cargando análisis…</p>
              ) : (
                <PointPanel d={detail} s={summary} />
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

// =====================================================================

function PointPanel({ d, s }: { d: PointDetail; s: PointSummary | null }) {
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
  const proj = d.projections?.find((p) => p.key === "ssp245_2041-2060") ?? d.projections?.[0];

  return (
    <div className="panelBody">
      <ul className="facts">
        {d.soil && (
          <li>
            <span>Suelo</span>
            <strong>{d.soil.textureClass}</strong>
          </li>
        )}
        {s?.erosionRisk && (
          <li>
            <span>Erosión</span>
            <strong className={`risk risk-${s.erosionRisk}`}>
              {s.erosionRisk} · {s.slopePct} %
            </strong>
          </li>
        )}
        {s?.rainMm != null && (
          <li>
            <span>Lluvia</span>
            <strong>{fmt(s.rainMm)} mm/año</strong>
          </li>
        )}
        {s?.waterBalanceMm != null && (
          <li>
            <span>Balance</span>
            <strong>{fmt(s.waterBalanceMm)} mm/año</strong>
          </li>
        )}
      </ul>
      {d.soil?.note && <p className="soilNote">{d.soil.note}</p>}

      <section className="panelSec">
        <div className="secHead">
          <h3>Qué sembrar</h3>
          <div className="miniTabs" role="radiogroup" aria-label="Tipo de manejo">
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
            const delta = c.aptitude.future - c.aptitude.recent;
            return (
              <li key={c.id}>
                <div className="cropTop">
                  <strong>{c.name}</strong>
                  <span className={`famTag fam-${c.family}`}>{FAMILY_LABEL[c.family] ?? c.family}</span>
                  <span className="cropScore">{Math.round(score * 100)}%</span>
                </div>
                <div className="bar">
                  <i style={{ width: `${Math.round(score * 100)}%` }} />
                </div>
                <p className="cropMeta">
                  Siembra {b.sowMonth} → cosecha {b.harvestMonth}
                  {mode === "riego" && ` · riego ~${Math.round(b.irrigationMm)} mm`}
                  {Math.abs(delta) >= 0.05 && (
                    <span className={delta < 0 ? "down" : "up"}>
                      {" "}
                      · 2041–60: {delta < 0 ? "▼" : "▲"} {Math.round(Math.abs(delta) * 100)} pts
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
        <p className="hint">Aptitud según temperatura, lluvia y suelo del punto (parámetros FAO).</p>
      </section>

      <section className="panelSec">
        <h3>Cómo ha cambiado</h3>
        <p className="hint">
          {d.compare.early} frente a {d.compare.recent}
        </p>
        <ul className="indList">
          {d.indicators.map((i) => (
            <li key={i.key}>
              <div className="indTop">
                <strong>{i.title}</strong>
                {i.early != null && (
                  <span className={`conf ${i.significant ? "isClear" : ""}`}>
                    {!i.significant
                      ? "No concluyente"
                      : i.direction === "en descenso"
                        ? "▼ Tendencia clara"
                        : "▲ Tendencia clara"}
                  </span>
                )}
              </div>
              {i.early != null ? (
                <p className="indVals">
                  {fmt(i.early)} → <b>{fmt(i.recent)}</b> <span>{i.unit}</span>
                </p>
              ) : (
                <p className="indVals">{i.message}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {proj && (
        <section className="panelSec">
          <h3>Lo que viene</h3>
          <p className="hint">{proj.label} · CMIP6</p>
          <ul className="facts factsFuture">
            <li>
              <span>Temperatura</span>
              <strong>+{proj.tempChangeC} °C</strong>
            </li>
            <li>
              <span>Días sobre 32 °C</span>
              <strong>
                {fmt(proj.heatDaysNow)} → {fmt(proj.heatDaysFuture)}
              </strong>
            </li>
            <li>
              <span>Lluvia</span>
              <strong>
                {proj.rainChangePct > 0 ? "+" : ""}
                {proj.rainChangePct}%
              </strong>
            </li>
            <li>
              <span>Balance</span>
              <strong>
                {fmt(proj.waterBalanceNowMm)} → {fmt(proj.waterBalanceFutureMm)}
              </strong>
            </li>
          </ul>
        </section>
      )}

      {!!d.insights?.length && (
        <section className="panelSec">
          <h3>Avisos para este punto</h3>
          <ul className="insights">
            {d.insights.map((x, i) => (
              <li key={i} className={`ins-${x.type}`}>
                <span>{x.type}</span>
                {x.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="uncertainty">
        <strong>Cómo leer estos datos.</strong> Cada punto resume un área de unos 11 km, no tu finca exacta.
        «Tendencia clara» significa que el cambio es estadísticamente significativo (p &lt; 0.05); «no concluyente», que
        puede deberse a la variación normal entre años. Las proyecciones son un rango posible, no una predicción.
        Confirma siempre con tu experiencia y con un técnico agrícola local.
      </p>
    </div>
  );
}
