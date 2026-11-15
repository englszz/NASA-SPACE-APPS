"use client";

// Mapa para marcar dónde está el conuco. Solo se carga en el navegador.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MAX_ZONE_KM, nearestZone, type ZonePoint } from "@/lib/conuco";

export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lon: number } | null;
  onChange: (v: { lat: number; lon: number }) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinRef = useRef<L.CircleMarker | null>(null);
  const [zones, setZones] = useState<ZonePoint[]>([]);
  const [geoMsg, setGeoMsg] = useState("");

  useEffect(() => {
    fetch("/data/points.json")
      .then((r) => r.json())
      .then(setZones)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const map = L.map(el.current, { zoomSnap: 0.25 }).setView(value ? [value.lat, value.lon] : [19.45, -70.85], value ? 13 : 8.75);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 18,
      attribution: "Imagen © Esri, Maxar, Earthstar Geographics",
    }).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18, opacity: 0.9 },
    ).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => onChange({ lat: e.latlng.lat, lon: e.latlng.lng }));
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin del conuco
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (!pinRef.current)
      pinRef.current = L.circleMarker([value.lat, value.lon], {
        radius: 11,
        weight: 4,
        color: "#ffffff",
        fillColor: "#f4a518",
        fillOpacity: 1,
      }).addTo(map);
    else pinRef.current.setLatLng([value.lat, value.lon]);
  }, [value]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeoMsg("Tu teléfono o navegador no permite saber la ubicación.");
    setGeoMsg("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = { lat: p.coords.latitude, lon: p.coords.longitude };
        onChange(v);
        mapRef.current?.setView([v.lat, v.lon], 14);
        setGeoMsg("");
      },
      () => setGeoMsg("No pudimos saber tu ubicación. Toca tu conuco en el mapa."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const near = value && zones.length ? nearestZone(zones, value.lat, value.lon) : null;

  return (
    <div className="picker">
      <div ref={el} className="pickerMap" />
      <div className="pickerBar">
        <button type="button" className="fcMore" onClick={useMyLocation}>
          📍 Estoy en mi conuco: usar mi ubicación
        </button>
        {geoMsg && <span className="hint">{geoMsg}</span>}
      </div>
      {!value && <p className="hint">Acerca el mapa y toca el lugar exacto de tu conuco.</p>}
      {near &&
        (near.km <= MAX_ZONE_KM ? (
          <p className="pickerOk">
            ✓ Tu conuco usa los datos de la zona <b>{near.zone.name}</b> (a {near.km.toFixed(1)} km).
          </p>
        ) : (
          <p className="pickerWarn">
            Tu conuco está a {Math.round(near.km)} km de la zona más cercana que analizamos. Por ahora The Conuco cubre
            el Valle del Cibao: los consejos podrían no ajustarse bien a tu tierra.
          </p>
        ))}
    </div>
  );
}
