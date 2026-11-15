"use client";

// Piezas del panel del mapa: rotaciones por zona, simulador «¿y si…?» y la
// línea de tiempo de 20 años. Todo se calcula con app/agro.ts (mismo método
// que field-shift-data/build-data.mjs).

import { useEffect, useMemo, useState } from "react";
import {
  CURRENT_PRESETS,
  MONTHS,
  adjustClimate,
  bestFor,
  monthNotes,
  rotationsFor,
  type Model,
  type Rotation,
} from "./agro";

const FAMILY_LABEL: Record<string, string> = {
  cereal: "Cereal",
  leguminosa: "Leguminosa",
  raiz: "Raíz",
  perenne: "Perenne",
};

const aptLabel = (x: number) => (x >= 0.8 ? "Muy bien" : x >= 0.6 ? "Bien" : x >= 0.4 ? "Regular" : "Difícil");
const monthList = (idx: number[]) => idx.map((i) => MONTHS[i]).join(", ");

// =====================================================================
// ROTACIONES
// =====================================================================

export function RotationsTab({ model }: { model: Model }) {
  const [preset, setPreset] = useState(CURRENT_PRESETS[0].id);
  const rots = useMemo(() => rotationsFor(model, preset), [model, preset]);
  const notes = useMemo(() => monthNotes(model.clim), [model]);
  const base = rots[0];

  return (
    <section className="tabPane">
      <label className="presetPick">
        <span>¿Qué siembras hoy en tu conuco?</span>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          {CURRENT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <small>
          La <b>rotación</b> es el orden en que siembras tus cultivos durante el año. Cambiar de familia de cultivo
          descansa la tierra y corta las plagas.
        </small>
      </label>

      <YearStrip notes={notes} />

      <ol className="rotList">
        {rots.map((r, i) => (
          <RotationCard key={r.id + preset} r={r} base={i === 0 ? null : base} model={model} />
        ))}
      </ol>

      <div className="calLegend calLegendSmall" aria-hidden="true">
        <span><i className="fam-cereal" /> Cereal</span>
        <span><i className="fam-leguminosa" /> Leguminosa</span>
        <span><i className="fam-raiz" /> Raíz</span>
        <span><i className="fam-perenne" /> Perenne</span>
        <span><i className="isBare" /> Tierra desnuda</span>
        <span><b className="hardDot" /> Mes difícil</span>
      </div>
    </section>
  );
}

// El año de esta zona: cuándo llueve fuerte, cuándo hace mucho calor, cuándo falta agua
function YearStrip({ notes }: { notes: ReturnType<typeof monthNotes> }) {
  return (
    <div className="yearStrip">
      <p className="lede">Así es el año en esta zona:</p>
      <div className="yearGrid">
        {notes.map((n, i) => (
          <div key={i} className="yearCell">
            <span className="yearM">{MONTHS[i][0]}</span>
            <span className={n.rainy ? "on rain" : ""} title={n.rainy ? `${MONTHS[i]}: llueve fuerte` : undefined} />
            <span className={n.hot ? "on hot" : ""} title={n.hot ? `${MONTHS[i]}: mucho calor` : undefined} />
            <span className={n.dry ? "on dry" : ""} title={n.dry ? `${MONTHS[i]}: falta agua` : undefined} />
          </div>
        ))}
        <div className="yearKeys">
          <span><i className="rain" /> Llueve fuerte</span>
          <span><i className="hot" /> Mucho calor</span>
          <span><i className="dry" /> Falta agua</span>
        </div>
      </div>
    </div>
  );
}

function Calendar({ r }: { r: Rotation }) {
  const hard = new Set(r.hardMonths.map((h) => h.month));
  return (
    <div className="calendar" aria-label="Calendario de 12 meses">
      <div className="calBar">
        {r.calendar.map((pl, i) => {
          const first = pl && (i === 0 || r.calendar[i - 1] !== pl);
          return (
            <span
              key={i}
              className={`calCell ${pl ? `fam-${pl.crop.family}` : "isBare"}`}
              title={`${MONTHS[i]}: ${pl ? pl.crop.name : "tierra desnuda"}${hard.has(i) ? ` (${r.hardMonths.find((h) => h.month === i)!.why})` : ""}`}
            >
              {first && pl.crop.cycle >= 2 ? pl.crop.name : ""}
              {hard.has(i) && <b className="hardDot" />}
            </span>
          );
        })}
      </div>
      <div className="calMonths" aria-hidden="true">
        {MONTHS.map((m, i) => (
          <span key={i}>{m[0]}</span>
        ))}
      </div>
    </div>
  );
}

function RotationCard({ r, base, model }: { r: Rotation & { badges?: { id: string; label: string }[] }; base: Rotation | null; model: Model }) {
  const isBase = !base;
  const why = explain(r, base, model);
  return (
    <li className={`rotCard${isBase ? " isBase" : ""}`}>
      <p className="rotKind">{isBase ? "Lo que siembras hoy" : "Otra opción"}</p>
      <h4>{isBase ? r.placements.map((p) => p.crop.name).join(" → ") : r.name}</h4>
      {!isBase && (
        <p className="rotSeq">
          {r.placements.map((p) => `${p.crop.name} (siembra ${MONTHS[p.start - 1]})`).join(" → ")}
        </p>
      )}
      {!!r.badges?.length && (
        <ul className="badges">
          {r.badges.map((b) => (
            <li key={b.id} className={`badge b-${b.id}`}>
              {b.label}
            </li>
          ))}
        </ul>
      )}

      <Calendar r={r} />

      <dl className="rotStats">
        <div>
          <dt>Con la lluvia</dt>
          <dd>{aptLabel(r.avgRainfed)}</dd>
        </div>
        <div>
          <dt>Riego al año</dt>
          <dd>{r.irrigationMm < 10 ? "Casi nada" : `~${r.irrigationMm} mm`}</dd>
        </div>
        <div>
          <dt>Tierra desnuda</dt>
          <dd>{r.bareMonths.length ? `${r.bareMonths.length} meses` : "Nunca"}</dd>
        </div>
        <div>
          <dt>En 2041–2060</dt>
          <dd>{r.future == null ? "—" : aptLabel(r.future)}</dd>
        </div>
      </dl>

      <details className="rotWhy">
        <summary>¿Por qué? Ver la explicación</summary>
        <dl>
          {why.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </details>
    </li>
  );
}

// Las 5 cosas que pide el reto para cada estrategia, en palabras sencillas
function explain(r: Rotation, base: Rotation | null, model: Model): [string, string][] {
  const crops = r.placements.map((p) => p.crop);
  const fams = [...new Set(crops.map((c) => FAMILY_LABEL[c.family].toLowerCase()))];
  const out: [string, string][] = [];

  // 1. Por qué se sugiere
  if (!base) {
    out.push(["Por qué aparece", "Es lo que siembras hoy. Sirve para comparar las otras opciones."]);
  } else {
    const parts = [`Alterna ${fams.join(" y ")}: cambiar de familia descansa la tierra y corta el ciclo de las plagas.`];
    if (r.hasLegume) parts.push("La leguminosa devuelve nitrógeno a la tierra, así necesitas menos abono.");
    if (r.bareMonths.length < base.bareMonths.length)
      parts.push(`La tierra queda desnuda ${r.bareMonths.length} meses en vez de ${base.bareMonths.length}.`);
    out.push(["Por qué aparece", parts.join(" ")]);
  }

  // 2. Evidencia
  out.push([
    "En qué datos se apoya",
    `${r.placements
      .map((p) => `${p.crop.name} sembrado en ${MONTHS[p.start - 1]}: «${aptLabel(p.ev.rainfed).toLowerCase()}» con la lluvia y el calor de 2016–2025`)
      .join("; ")}. Datos de NASA POWER y GPM IMERG (clima), ISRIC SoilGrids (tierra${model.group ? ` ${model.group.replace("-", " ")}` : ""}) y NEX-GDDP-CMIP6 (futuro); rangos de cultivo de la FAO.`,
  ]);

  // 3. Beneficios
  const ben: string[] = [];
  if (r.hasLegume) ben.push("aporta nitrógeno");
  if (base && r.irrigationMm < base.irrigationMm - 20) ben.push(`unos ${base.irrigationMm - r.irrigationMm} mm menos de riego al año`);
  if (base && r.avgRainfed > base.avgRainfed + 0.05) ben.push("rinde mejor con la lluvia de la zona");
  if (base && (r.future ?? 0) > (base.future ?? 0) + 0.05) ben.push("aguanta mejor el calor que viene");
  if (base && r.bareMonths.length < base.bareMonths.length) ben.push("menos erosión porque la tierra pasa más tiempo cubierta");
  if (crops.some((c) => c.id === "sorgo" || c.id === "guandul")) ben.push("da forraje para animales");
  out.push(["Qué gana tu tierra", ben.length ? ben.join("; ") + "." : base ? "Parecido a lo que siembras hoy." : "—"]);

  // 4. Vacíos
  out.push([
    "Lo que falta saber",
    `Precio y venta de ${crops.map((c) => c.name.toLowerCase()).join(" y ")} en tu zona, si consigues semilla, y cómo está de verdad tu tierra (un análisis de suelo lo confirma). Los datos describen una zona de unos 11 km, no tu finca.`,
  ]);

  // 5. Riesgos
  const risks: string[] = [];
  if (r.hardMonths.length) {
    const byWhy = new Map<string, number[]>();
    for (const h of r.hardMonths) byWhy.set(h.why, [...(byWhy.get(h.why) ?? []), h.month]);
    for (const [why, ms] of byWhy) risks.push(`${why} en ${monthList(ms)}`);
  }
  if (r.bareRainyMonths.length) risks.push(`tierra desnuda en meses de mucha lluvia (${monthList(r.bareRainyMonths)}): riesgo de erosión`);
  const weak = r.placements.filter((p) => p.ev.rainfed < 0.6);
  if (weak.length) risks.push(`${weak.map((p) => p.crop.name).join(" y ")} puede necesitar riego de apoyo`);
  if (r.future != null && r.future < r.avgRainfed - 0.1) risks.push("con el calor que viene rendiría menos");
  out.push(["Riesgos a revisar", risks.length ? risks.join("; ") + ". Revísalo con un técnico agrícola." : "No vemos riesgos grandes en los datos; igual confírmalo con un técnico agrícola."]);

  return out;
}

// =====================================================================
// SIMULADOR «¿Y SI…?»
// =====================================================================

export function WhatIf({ model }: { model: Model }) {
  const [rain, setRain] = useState(0);
  const [dT, setDT] = useState(0);
  const rows = useMemo(() => {
    const sim = adjustClimate(model, rain, dT);
    return model.crops
      .map((c) => {
        const now = bestFor(c, model.clim, model.group);
        const then = bestFor(c, sim, model.group);
        return { c, now, then };
      })
      .filter((x) => x.now.rainfed >= 0.3 || x.then.rainfed >= 0.3)
      .sort((a, b) => b.then.rainfed - a.then.rainfed)
      .slice(0, 6);
  }, [model, rain, dT]);

  return (
    <div className="whatIf">
      <p className="lede">Prueba tú: ¿y si…?</p>
      <label className="slider">
        <span>
          La lluvia {rain === 0 ? "no cambia" : rain > 0 ? `sube ${rain}%` : `baja ${Math.abs(rain)}%`}
        </span>
        <input type="range" min={-40} max={20} step={5} value={rain} onChange={(e) => setRain(+e.target.value)} />
      </label>
      <label className="slider">
        <span>La temperatura {dT === 0 ? "no cambia" : `sube ${dT.toLocaleString("es-DO")} °C`}</span>
        <input type="range" min={0} max={3} step={0.5} value={dT} onChange={(e) => setDT(+e.target.value)} />
      </label>
      <ul className="simList">
        {rows.map(({ c, now, then }) => {
          const d = then.rainfed - now.rainfed;
          return (
            <li key={c.id}>
              <strong>{c.name}</strong>
              <span>{aptLabel(then.rainfed)}</span>
              <em className={d < -0.04 ? "down" : d > 0.04 ? "up" : ""}>
                {Math.abs(d) < 0.05 ? "igual que hoy" : d < 0 ? "▼ peor que hoy" : "▲ mejor que hoy"}
              </em>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        Mueve las barras para ver qué cultivos aguantan. Es una estimación con el mismo método del mapa; con más calor
        también sube la evaporación.
      </p>
    </div>
  );
}

// =====================================================================
// LÍNEA DE TIEMPO (20 años) — dos gráficos pequeños, uno por medida
// =====================================================================

type Year = { year: number; rainMm: number | null; heatDays32: number | null };

export function Timeline({ annual }: { annual: Year[] }) {
  return (
    <details className="timeline">
      <summary>Ver los últimos 20 años en esta zona</summary>
      <MiniBars title="Lluvia de cada año" unit="mm" data={annual.map((a) => ({ x: a.year, y: a.rainMm }))} color="var(--chart-rain)" />
      <MiniBars
        title="Días de mucho calor (más de 32 °C) cada año"
        unit="días"
        data={annual.map((a) => ({ x: a.year, y: a.heatDays32 }))}
        color="var(--chart-heat)"
      />
      <details className="tableView">
        <summary>Ver como tabla</summary>
        <table>
          <thead>
            <tr>
              <th>Año</th>
              <th>Lluvia (mm)</th>
              <th>Días de mucho calor</th>
            </tr>
          </thead>
          <tbody>
            {annual.map((a) => (
              <tr key={a.year}>
                <td>{a.year}</td>
                <td>{a.rainMm == null ? "—" : Math.round(a.rainMm).toLocaleString("es-DO")}</td>
                <td>{a.heatDays32 == null ? "—" : Math.round(a.heatDays32)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </details>
  );
}

function MiniBars({ title, unit, data, color }: { title: string; unit: string; data: { x: number; y: number | null }[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 360, H = 110, padB = 18, padT = 6;
  const vals = data.map((d) => d.y ?? 0);
  const max = Math.max(...vals, 1);
  const bw = W / data.length;
  const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
  const h = hover != null ? data[hover] : null;
  return (
    <figure className="miniChart">
      <figcaption>
        <span>{title}</span>
        <b>
          {h ? `${h.x}: ${h.y == null ? "—" : Math.round(h.y).toLocaleString("es-DO")} ${unit}` : `Promedio: ${Math.round(avg).toLocaleString("es-DO")} ${unit}`}
        </b>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}, de ${data[0]?.x} a ${data.at(-1)?.x}`} onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H - padB} y2={H - padB} className="axis" />
        <line x1="0" x2={W} y1={H - padB - ((avg / max) * (H - padB - padT))} y2={H - padB - ((avg / max) * (H - padB - padT))} className="avgLine" />
        {data.map((d, i) => {
          const bh = ((d.y ?? 0) / max) * (H - padB - padT);
          const x = i * bw + bw * 0.18;
          return (
            <g key={d.x} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              <path
                d={bh > 4 ? `M${x},${H - padB} V${H - padB - bh + 4} q0,-4 4,-4 h${bw * 0.64 - 8} q4,0 4,4 V${H - padB} Z` : `M${x},${H - padB} v-${bh} h${bw * 0.64} v${bh} Z`}
                fill={color}
                opacity={hover == null || hover === i ? 1 : 0.45}
              />
            </g>
          );
        })}
        {[0, data.length - 1].map((i) => (
          <text key={i} x={i * bw + bw / 2} y={H - 4} textAnchor={i === 0 ? "start" : "end"} className="tick">
            {data[i]?.x}
          </text>
        ))}
      </svg>
    </figure>
  );
}

// =====================================================================
// PRONÓSTICO DE LOS PRÓXIMOS DÍAS (Open-Meteo: modelos de NOAA, ECMWF y otros)
// La NASA no publica un pronóstico diario de fácil acceso; sus datos miden lo
// que ya pasó. Para los próximos 14 días usamos Open-Meteo (gratuito, abierto).
// =====================================================================

type Day = {
  date: string;
  code: number;
  tmax: number;
  tmin: number;
  rain: number;
  prob: number | null;
  et0: number;
  wind: number;
};

const forecastCache = new Map<string, { at: number; days: Day[] }>();

async function loadForecast(lat: number, lon: number): Promise<Day[]> {
  const key = `${lat},${lon}`;
  const hit = forecastCache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.days;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum," +
    "precipitation_probability_max,et0_fao_evapotranspiration,wind_speed_10m_max" +
    "&timezone=America%2FSanto_Domingo&forecast_days=14";
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  const d = (await r.json()).daily;
  const days: Day[] = d.time.map((date: string, i: number) => ({
    date,
    code: d.weather_code[i],
    tmax: d.temperature_2m_max[i],
    tmin: d.temperature_2m_min[i],
    rain: d.precipitation_sum[i] ?? 0,
    prob: d.precipitation_probability_max[i],
    et0: d.et0_fao_evapotranspiration[i] ?? 0,
    wind: d.wind_speed_10m_max[i] ?? 0,
  }));
  forecastCache.set(key, { at: Date.now(), days });
  return days;
}

// Códigos del tiempo de la OMM en palabras sencillas
function sky(code: number): [string, string] {
  if (code === 0) return ["☀️", "Despejado"];
  if (code <= 2) return ["🌤️", "Poco nublado"];
  if (code === 3) return ["☁️", "Nublado"];
  if (code === 45 || code === 48) return ["🌫️", "Neblina"];
  if (code >= 51 && code <= 57) return ["🌦️", "Llovizna"];
  if (code >= 61 && code <= 67) return ["🌧️", "Lluvia"];
  if (code >= 80 && code <= 82) return ["🌧️", "Aguaceros"];
  if (code >= 95) return ["⛈️", "Tormenta"];
  return ["🌥️", "Variable"];
}

// Un consejo práctico por día (el primero que aplique)
function advice(d: Day, prev: Day[]): { text: string; kind: string } {
  if (d.rain >= 20)
    return { text: "Aguacero: no abones ni fumigues, el agua lo lava. Revisa que el agua corra.", kind: "storm" };
  if (d.code >= 95)
    return { text: "Tormenta eléctrica: evita estar en el campo abierto cuando truene y no fumigues.", kind: "storm" };
  if (d.wind >= 35) return { text: "Viento fuerte: no fumigues hoy.", kind: "wind" };
  const rainedBefore = prev.slice(-2).reduce((s, x) => s + x.rain, 0);
  if (rainedBefore >= 10 && d.rain < 10)
    return { text: "Buen día para sembrar: la tierra quedó húmeda de la lluvia.", kind: "sow" };
  if (d.rain >= 5 && (d.prob ?? 100) >= 60) return { text: "Va a llover: no hace falta regar.", kind: "rain" };
  if (d.tmax >= 34) return { text: "Mucho calor: riega temprano o al caer la tarde.", kind: "hot" };
  if (d.rain < 1 && d.et0 >= 4) return { text: "Seco y caluroso: la tierra pierde agua, vigila el riego.", kind: "dry" };
  return { text: "Buen día para trabajar el conuco.", kind: "ok" };
}

const dayName = (iso: string, i: number) => {
  if (i === 0) return "Hoy";
  if (i === 1) return "Mañana";
  const d = new Date(iso + "T12:00:00");
  const s = d.toLocaleDateString("es-DO", { weekday: "short", day: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function ForecastDays({ lat, lon }: { lat: number; lon: number }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    setDays(null);
    setError(false);
    loadForecast(lat, lon)
      .then((d) => alive && setDays(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [lat, lon]);

  if (error)
    return (
      <p className="lede">No se pudo cargar el pronóstico. Revisa la conexión a internet e inténtalo de nuevo.</p>
    );
  if (!days) return <p className="hint">Buscando el pronóstico…</p>;

  const week = days.slice(0, 7);
  const rain7 = week.reduce((s, d) => s + d.rain, 0);
  const lost7 = week.reduce((s, d) => s + d.et0, 0);
  const balance = rain7 - lost7;
  const maxRain = Math.max(...days.map((d) => d.rain), 5);
  const shown = showAll ? days : week;

  return (
    <div className="forecast">
      <div className={`fcSummary ${balance >= 0 ? "ok" : "short"}`}>
        <strong>
          Esta semana {balance >= 0 ? "la lluvia alcanza" : `faltarán unos ${Math.round(-balance)} mm de agua`}
        </strong>
        <p>
          Lloverán unos <b>{Math.round(rain7)} mm</b> y la tierra perderá unos <b>{Math.round(lost7)} mm</b> por el sol y
          el calor (evaporación).{" "}
          {balance < 0 ? "Si tu cultivo está pequeño o en flor, conviene regar." : "Por ahora no hace falta regar."}
        </p>
      </div>

      <ol className="fcList">
        {shown.map((d, i) => {
          const [icon, label] = sky(d.code);
          const a = advice(d, days.slice(0, i));
          return (
            <li key={d.date} className={i >= 7 ? "far" : undefined}>
              <div className="fcTop">
                <span className="fcDay">{dayName(d.date, i)}</span>
                <span className="fcIcon" title={label} aria-label={label}>
                  {icon}
                </span>
                <span className="fcTemp">
                  <b>{Math.round(d.tmax)}°</b> / {Math.round(d.tmin)}°
                </span>
                <span className="fcRain" title={`Lluvia: ${d.rain.toFixed(1)} mm`}>
                  <i style={{ width: `${Math.min(100, (d.rain / maxRain) * 100)}%` }} />
                  <em>
                    {d.rain < 0.5 ? "sin lluvia" : `${Math.round(d.rain)} mm`}
                    {d.prob != null && d.rain >= 0.5 ? ` · ${d.prob}%` : ""}
                  </em>
                </span>
              </div>
              <p className={`fcTip tip-${a.kind}`}>{a.text}</p>
            </li>
          );
        })}
      </ol>

      <button type="button" className="fcMore" onClick={() => setShowAll((x) => !x)}>
        {showAll ? "Ver solo 7 días" : "Ver 14 días"}
      </button>
      {showAll && <p className="hint">Después de 7 días el pronóstico es menos seguro: tómalo como una idea.</p>}
      <p className="hint">
        Pronóstico para el centro de esta zona, de{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        (modelos de NOAA, ECMWF y otros servicios meteorológicos). Se actualiza cada hora.
      </p>
    </div>
  );
}
