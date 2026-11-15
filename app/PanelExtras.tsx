"use client";

// Piezas del panel del mapa: rotaciones por zona, simulador «¿y si…?», línea de
// tiempo de 20 años y pronóstico de los próximos días. Todo se calcula con
// app/agro.ts (mismo método que field-shift-data/build-data.mjs). Textos en inglés y español.

import { useEffect, useMemo, useState } from "react";
import {
  CURRENT_PRESETS,
  adjustClimate,
  bestFor,
  monthNotes,
  rotationsFor,
  type Model,
  type Rotation,
} from "./agro";
import { useLang } from "@/lib/i18n";
import { type Lang, crop, locale, monthByIndex } from "@/lib/lang";
import { askRamoncito, guide } from "./guia";
import { OTHER_PREFIX, cleanCrop, isOther, otherText } from "@/lib/conuco-local";

type L2 = { es: string; en: string };

const FAMILY_LABEL: Record<string, L2> = {
  cereal: { es: "Cereal", en: "Cereal" },
  leguminosa: { es: "Leguminosa", en: "Legume" },
  raiz: { es: "Raíz", en: "Root" },
  perenne: { es: "Perenne", en: "Perennial" },
};

const BADGES: Record<string, L2> = {
  futuro: { es: "La mejor para el futuro", en: "Best for the future" },
  lluvia: { es: "Rinde más con la lluvia", en: "Does best on rainfall" },
  riego: { es: "Menos riego", en: "Least irrigation" },
  suelo: { es: "Menos tierra desnuda", en: "Least bare soil" },
  nitrogeno: { es: "Da nutrientes a la tierra", en: "Feeds the soil" },
};

const HARD_WHY: Record<string, L2> = {
  "calor fuerte": { es: "calor fuerte", en: "strong heat" },
  "falta agua": { es: "falta agua", en: "water shortage" },
  aguaceros: { es: "aguaceros", en: "downpours" },
};

const aptLabel = (lang: Lang, x: number) =>
  lang === "en"
    ? x >= 0.8 ? "Very good" : x >= 0.6 ? "Good" : x >= 0.4 ? "Fair" : "Hard"
    : x >= 0.8 ? "Muy bien" : x >= 0.6 ? "Bien" : x >= 0.4 ? "Regular" : "Difícil";
const monthList = (lang: Lang, idx: number[]) => idx.map((i) => monthByIndex(lang, i)).join(", ");
const joinAnd = (lang: Lang, items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} ${lang === "en" ? "and" : "y"} ${items.at(-1)}` : (items[0] ?? "");

// =====================================================================
// ROTACIONES
// =====================================================================

// «Otro»: si lo que siembra la persona no está en la lista, lo escribe y Ramoncito (IA)
// lo compara con las opciones calculadas para la zona.
export function RotationsTab({
  model,
  initialPreset,
  zone,
}: {
  model: Model;
  initialPreset?: string;
  zone?: { id: string; name: string };
}) {
  const { lang, t } = useLang();
  const [preset, setPreset] = useState(
    isOther(initialPreset)
      ? OTHER_PREFIX
      : CURRENT_PRESETS.some((p) => p.id === initialPreset)
        ? initialPreset!
        : CURRENT_PRESETS[0].id,
  );
  const [other, setOther] = useState(isOther(initialPreset) ? otherText(initialPreset!) : "");
  const otherMode = preset === OTHER_PREFIX;
  // Con «Otro» no hay rotación actual calculada: se muestran solo las opciones de la zona
  const rots = useMemo(() => rotationsFor(model, otherMode ? CURRENT_PRESETS[0].id : preset), [model, preset, otherMode]);
  const shown = otherMode ? rots.slice(1) : rots;
  const notes = useMemo(() => monthNotes(model.clim), [model]);
  const base = rots[0];

  useEffect(() => {
    guide("tab-rotaciones");
  }, []);

  const askOther = () => {
    const what = cleanCrop(other);
    if (!what) return;
    const options = rots
      .slice(1)
      .map((r) => r.placements.map((p) => crop(lang, p.crop.name)).join(" → "))
      .join("; ");
    const where = zone ? t(`en la zona ${zone.name}`, `in the ${zone.name} area`) : t("en mi zona", "in my area");
    askRamoncito(
      t(
        `Yo siembro ${what} ${where}. Eso no sale en la lista. ¿Le va bien a esta zona? ¿Cómo se compara con estas opciones (${options}) y con qué lo puedo rotar?`,
        `I grow ${what} ${where}. It isn't on the list. Does it suit this area? How does it compare with these options (${options}) and what can I rotate it with?`,
      ),
      zone?.id,
    );
  };

  return (
    <section className="tabPane">
      <label className="presetPick">
        <span>{t("¿Qué siembras hoy en tu conuco?", "What do you grow on your conuco today?")}</span>
        <select
          value={preset}
          onChange={(e) => {
            setPreset(e.target.value);
            if (e.target.value === OTHER_PREFIX) guide("otro");
          }}
        >
          {CURRENT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {lang === "en" ? p.en : p.label}
            </option>
          ))}
          <option value={OTHER_PREFIX}>{t("Otro cultivo (escríbelo)", "Another crop (type it)")}</option>
        </select>
        {lang === "en" ? (
          <small>
            A <b>rotation</b> is the order in which you plant your crops through the year. Switching crop families rests
            the soil and breaks pest cycles.
          </small>
        ) : (
          <small>
            La <b>rotación</b> es el orden en que siembras tus cultivos durante el año. Cambiar de familia de cultivo
            descansa la tierra y corta las plagas.
          </small>
        )}
      </label>

      {otherMode && (
        <form
          className="otherCrop"
          onSubmit={(e) => {
            e.preventDefault();
            askOther();
          }}
        >
          <label>
            <span>{t("¿Qué siembras?", "What do you grow?")}</span>
            <input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder={t("Ej.: ají, tomate, café…", "e.g. peppers, tomatoes, coffee…")}
              maxLength={60}
            />
          </label>
          <button type="submit" className="cta" disabled={!cleanCrop(other)}>
            {t("Pregúntale a Ramoncito", "Ask Ramoncito")}
          </button>
          <small>
            {t(
              "Ese cultivo no está en nuestros cálculos. Ramoncito (IA) lo compara con las opciones de esta zona que ves abajo.",
              "That crop isn't in our calculations. Ramoncito (AI) compares it with this area's options shown below.",
            )}
          </small>
        </form>
      )}

      <YearStrip notes={notes} />

      <ol className="rotList">
        {shown.map((r, i) => (
          <RotationCard
            key={r.id + preset}
            r={r}
            base={otherMode ? null : i === 0 ? null : base}
            standalone={otherMode}
            model={model}
          />
        ))}
      </ol>

      <div className="calLegend calLegendSmall" aria-hidden="true">
        <span>
          <i className="fam-cereal" /> {t("Cereal", "Cereal")}
        </span>
        <span>
          <i className="fam-leguminosa" /> {t("Leguminosa", "Legume")}
        </span>
        <span>
          <i className="fam-raiz" /> {t("Raíz", "Root")}
        </span>
        <span>
          <i className="fam-perenne" /> {t("Perenne", "Perennial")}
        </span>
        <span>
          <i className="isBare" /> {t("Tierra desnuda", "Bare soil")}
        </span>
        <span>
          <b className="hardDot" /> {t("Mes difícil", "Hard month")}
        </span>
      </div>
    </section>
  );
}

// El año de esta zona: cuándo llueve fuerte, cuándo hace mucho calor, cuándo falta agua
function YearStrip({ notes }: { notes: ReturnType<typeof monthNotes> }) {
  const { lang, t } = useLang();
  return (
    <div className="yearStrip">
      <p className="lede">{t("Así es el año en esta zona:", "This is what the year looks like here:")}</p>
      <div className="yearGrid">
        {notes.map((n, i) => {
          const m = monthByIndex(lang, i);
          return (
            <div key={i} className="yearCell">
              <span className="yearM">{m[0]}</span>
              <span className={n.rainy ? "on rain" : ""} title={n.rainy ? `${m}: ${t("llueve fuerte", "heavy rain")}` : undefined} />
              <span className={n.hot ? "on hot" : ""} title={n.hot ? `${m}: ${t("mucho calor", "very hot")}` : undefined} />
              <span className={n.dry ? "on dry" : ""} title={n.dry ? `${m}: ${t("falta agua", "water shortage")}` : undefined} />
            </div>
          );
        })}
        <div className="yearKeys">
          <span>
            <i className="rain" /> {t("Llueve fuerte", "Heavy rain")}
          </span>
          <span>
            <i className="hot" /> {t("Mucho calor", "Very hot")}
          </span>
          <span>
            <i className="dry" /> {t("Falta agua", "Water shortage")}
          </span>
        </div>
      </div>
    </div>
  );
}

function Calendar({ r }: { r: Rotation }) {
  const { lang, t } = useLang();
  const hard = new Map(r.hardMonths.map((h) => [h.month, h.why]));
  return (
    <div className="calendar" aria-label={t("Calendario de 12 meses", "12-month calendar")}>
      <div className="calBar">
        {r.calendar.map((pl, i) => {
          const first = pl && (i === 0 || r.calendar[i - 1] !== pl);
          const why = hard.get(i);
          return (
            <span
              key={i}
              className={`calCell ${pl ? `fam-${pl.crop.family}` : "isBare"}`}
              title={`${monthByIndex(lang, i)}: ${pl ? crop(lang, pl.crop.name) : t("tierra desnuda", "bare soil")}${
                why ? ` (${HARD_WHY[why] ? t(HARD_WHY[why].es, HARD_WHY[why].en) : why})` : ""
              }`}
            >
              {first && pl.crop.cycle >= 2 ? crop(lang, pl.crop.name) : ""}
              {why && <b className="hardDot" />}
            </span>
          );
        })}
      </div>
      <div className="calMonths" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>{monthByIndex(lang, i)[0]}</span>
        ))}
      </div>
    </div>
  );
}

function RotationCard({
  r,
  base,
  model,
  standalone = false,
}: {
  r: Rotation & { badges?: { id: string; label: string }[] };
  base: Rotation | null;
  model: Model;
  standalone?: boolean; // una opción de la zona sin rotación actual con qué compararla («Otro»)
}) {
  const { lang, t } = useLang();
  const isBase = !base && !standalone;
  const why = explain(lang, r, base, model, standalone);
  const names = r.placements.map((p) => crop(lang, p.crop.name));
  return (
    <li className={`rotCard${isBase ? " isBase" : ""}`}>
      <p className="rotKind">{isBase ? t("Lo que siembras hoy", "What you grow today") : t("Otra opción", "Another option")}</p>
      <h4>{isBase ? names.join(" → ") : joinAnd(lang, names)}</h4>
      {!isBase && (
        <p className="rotSeq">
          {r.placements
            .map((p) => `${crop(lang, p.crop.name)} (${t("siembra", "sow")} ${monthByIndex(lang, p.start - 1)})`)
            .join(" → ")}
        </p>
      )}
      {!!r.badges?.length && (
        <ul className="badges">
          {r.badges.map((b) => (
            <li key={b.id} className={`badge b-${b.id}`}>
              {BADGES[b.id] ? t(BADGES[b.id].es, BADGES[b.id].en) : b.label}
            </li>
          ))}
        </ul>
      )}

      <Calendar r={r} />

      <dl className="rotStats">
        <div>
          <dt>{t("Con la lluvia", "On rainfall")}</dt>
          <dd>{aptLabel(lang, r.avgRainfed)}</dd>
        </div>
        <div>
          <dt>{t("Riego al año", "Irrigation/year")}</dt>
          <dd>{r.irrigationMm < 10 ? t("Casi nada", "Almost none") : `~${r.irrigationMm} mm`}</dd>
        </div>
        <div>
          <dt>{t("Tierra desnuda", "Bare soil")}</dt>
          <dd>{r.bareMonths.length ? t(`${r.bareMonths.length} meses`, `${r.bareMonths.length} months`) : t("Nunca", "Never")}</dd>
        </div>
        <div>
          <dt>{t("En 2041–2060", "In 2041–2060")}</dt>
          <dd>{r.future == null ? "—" : aptLabel(lang, r.future)}</dd>
        </div>
      </dl>

      <details className="rotWhy">
        <summary>{t("¿Por qué? Ver la explicación", "Why? See the explanation")}</summary>
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
function explain(lang: Lang, r: Rotation, base: Rotation | null, model: Model, standalone = false): [string, string][] {
  const t = (es: string, en: string) => (lang === "en" ? en : es);
  const crops = r.placements.map((p) => p.crop);
  const name = (c: { name: string }) => crop(lang, c.name);
  const fams = [...new Set(crops.map((c) => t(FAMILY_LABEL[c.family].es, FAMILY_LABEL[c.family].en).toLowerCase()))];
  const out: [string, string][] = [];

  // 1. Por qué se sugiere
  if (!base && !standalone) {
    out.push([
      t("Por qué aparece", "Why it's here"),
      t("Es lo que siembras hoy. Sirve para comparar las otras opciones.", "It's what you grow today. It's the baseline for comparing the other options."),
    ]);
  } else {
    const parts = [
      t(
        `Alterna ${joinAnd(lang, fams)}: cambiar de familia descansa la tierra y corta el ciclo de las plagas.`,
        `It alternates ${joinAnd(lang, fams)}: switching families rests the soil and breaks pest cycles.`,
      ),
    ];
    if (r.hasLegume)
      parts.push(
        t(
          "La leguminosa devuelve nitrógeno a la tierra, así necesitas menos abono.",
          "The legume returns nitrogen to the soil, so you need less fertilizer.",
        ),
      );
    if (base && r.bareMonths.length < base.bareMonths.length)
      parts.push(
        t(
          `La tierra queda desnuda ${r.bareMonths.length} meses en vez de ${base.bareMonths.length}.`,
          `The soil is left bare ${r.bareMonths.length} months instead of ${base.bareMonths.length}.`,
        ),
      );
    out.push([t("Por qué aparece", "Why it's here"), parts.join(" ")]);
  }

  // 2. Evidencia
  const soilGroup = model.group ? ` ${model.group.replace("-", " ")}` : "";
  out.push([
    t("En qué datos se apoya", "What data supports it"),
    `${r.placements
      .map((p) =>
        t(
          `${name(p.crop)} sembrado en ${monthByIndex(lang, p.start - 1)}: «${aptLabel(lang, p.ev.rainfed).toLowerCase()}» con la lluvia y el calor de 2016–2025`,
          `${name(p.crop)} sown in ${monthByIndex(lang, p.start - 1)}: “${aptLabel(lang, p.ev.rainfed).toLowerCase()}” with the rain and heat of 2016–2025`,
        ),
      )
      .join("; ")}. ${t(
      `Datos de NASA POWER y GPM IMERG (clima), ISRIC SoilGrids (tierra${soilGroup}) y NEX-GDDP-CMIP6 (futuro); rangos de cultivo de la FAO.`,
      `Data from NASA POWER and GPM IMERG (climate), ISRIC SoilGrids (soil${soilGroup}) and NEX-GDDP-CMIP6 (future); FAO crop ranges.`,
    )}`,
  ]);

  // 3. Beneficios
  const ben: string[] = [];
  if (r.hasLegume) ben.push(t("da nutrientes a la tierra (fija nitrógeno)", "feeds the soil (fixes nitrogen)"));
  if (base && r.irrigationMm < base.irrigationMm - 20)
    ben.push(
      t(`unos ${base.irrigationMm - r.irrigationMm} mm menos de riego al año`, `about ${base.irrigationMm - r.irrigationMm} mm less irrigation per year`),
    );
  if (base && r.avgRainfed > base.avgRainfed + 0.05) ben.push(t("rinde mejor con la lluvia de la zona", "does better on the area's rainfall"));
  if (base && (r.future ?? 0) > (base.future ?? 0) + 0.05) ben.push(t("aguanta mejor el calor que viene", "copes better with the coming heat"));
  if (base && r.bareMonths.length < base.bareMonths.length)
    ben.push(t("menos erosión porque la tierra pasa más tiempo cubierta", "less erosion because the soil stays covered longer"));
  if (crops.some((c) => c.id === "sorgo" || c.id === "guandul")) ben.push(t("da comida para los animales (forraje)", "provides food for animals (fodder)"));
  out.push([
    t("Qué gana tu tierra", "What your soil gains"),
    ben.length ? ben.join("; ") + "." : base ? t("Parecido a lo que siembras hoy.", "Similar to what you grow today.") : "—",
  ]);

  // 4. Vacíos
  out.push([
    t("Lo que falta saber", "What we don't know yet"),
    t(
      `Precio y venta de ${joinAnd(lang, crops.map((c) => name(c).toLowerCase()))} en tu zona, si consigues semilla, y cómo está de verdad tu tierra (un análisis de suelo lo confirma). Los datos describen una zona de unos 11 km, no tu finca.`,
      `Prices and demand for ${joinAnd(lang, crops.map((c) => name(c).toLowerCase()))} in your area, whether you can get seed, and the real condition of your soil (a soil test confirms it). The data describes an area of about 11 km, not your farm.`,
    ),
  ]);

  // 5. Riesgos
  const risks: string[] = [];
  if (r.hardMonths.length) {
    const byWhy = new Map<string, number[]>();
    for (const h of r.hardMonths) byWhy.set(h.why, [...(byWhy.get(h.why) ?? []), h.month]);
    for (const [why, ms] of byWhy)
      risks.push(`${HARD_WHY[why] ? t(HARD_WHY[why].es, HARD_WHY[why].en) : why} ${t("en", "in")} ${monthList(lang, ms)}`);
  }
  if (r.bareRainyMonths.length)
    risks.push(
      t(
        `tierra desnuda en meses de mucha lluvia (${monthList(lang, r.bareRainyMonths)}): riesgo de erosión`,
        `bare soil in very rainy months (${monthList(lang, r.bareRainyMonths)}): erosion risk`,
      ),
    );
  const weak = r.placements.filter((p) => p.ev.rainfed < 0.6);
  if (weak.length)
    risks.push(
      t(
        `${joinAnd(lang, weak.map((p) => name(p.crop)))} puede necesitar riego de apoyo`,
        `${joinAnd(lang, weak.map((p) => name(p.crop)))} may need supplemental irrigation`,
      ),
    );
  if (r.future != null && r.future < r.avgRainfed - 0.1) risks.push(t("con el calor que viene rendiría menos", "it would yield less with the coming heat"));
  out.push([
    t("Riesgos a revisar", "Risks to review"),
    risks.length
      ? risks.join("; ") + t(". Revísalo con un técnico agrícola.", ". Review it with an agronomist.")
      : t(
          "No vemos riesgos grandes en los datos; igual confírmalo con un técnico agrícola.",
          "We don't see major risks in the data; still, confirm it with an agronomist.",
        ),
  ]);

  return out;
}

// =====================================================================
// SIMULADOR «¿Y SI…?»
// =====================================================================

export function WhatIf({ model }: { model: Model }) {
  const { lang, t } = useLang();
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
      <p className="lede">{t("Prueba tú: ¿y si…?", "Try it: what if…?")}</p>
      <label className="slider">
        <span>
          {rain === 0
            ? t("La lluvia no cambia", "Rainfall doesn't change")
            : rain > 0
              ? t(`La lluvia sube ${rain}%`, `Rainfall rises ${rain}%`)
              : t(`La lluvia baja ${Math.abs(rain)}%`, `Rainfall drops ${Math.abs(rain)}%`)}
        </span>
        <input
          type="range"
          min={-40}
          max={20}
          step={5}
          value={rain}
          onChange={(e) => {
            setRain(+e.target.value);
            guide("simulador");
          }}
        />
      </label>
      <label className="slider">
        <span>
          {dT === 0
            ? t("La temperatura no cambia", "Temperature doesn't change")
            : t(`La temperatura sube ${dT.toLocaleString(locale(lang))} °C`, `Temperature rises ${dT.toLocaleString(locale(lang))} °C`)}
        </span>
        <input type="range" min={0} max={3} step={0.5} value={dT} onChange={(e) => setDT(+e.target.value)} />
      </label>
      <ul className="simList">
        {rows.map(({ c, now, then }) => {
          const d = then.rainfed - now.rainfed;
          return (
            <li key={c.id}>
              <strong>{crop(lang, c.name)}</strong>
              <span>{aptLabel(lang, then.rainfed)}</span>
              <em className={d < -0.04 ? "down" : d > 0.04 ? "up" : ""}>
                {Math.abs(d) < 0.05 ? t("igual que hoy", "same as today") : d < 0 ? t("▼ peor que hoy", "▼ worse than today") : t("▲ mejor que hoy", "▲ better than today")}
              </em>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        {t(
          "Mueve las barras para ver qué cultivos aguantan. Es una estimación con el mismo método del mapa; con más calor también sube la evaporación.",
          "Move the sliders to see which crops hold up. It's an estimate using the same method as the map; with more heat, evaporation also rises.",
        )}
      </p>
    </div>
  );
}

// =====================================================================
// LÍNEA DE TIEMPO (20 años) — dos gráficos pequeños, uno por medida
// =====================================================================

type Year = { year: number; rainMm: number | null; heatDays32: number | null };

export function Timeline({ annual }: { annual: Year[] }) {
  const { lang, t } = useLang();
  return (
    <details className="timeline">
      <summary>{t("Ver los últimos 20 años en esta zona", "See the last 20 years in this area")}</summary>
      <MiniBars
        title={t("Lluvia de cada año", "Rainfall each year")}
        unit="mm"
        data={annual.map((a) => ({ x: a.year, y: a.rainMm }))}
        color="var(--chart-rain)"
      />
      <MiniBars
        title={t("Días de mucho calor (más de 32 °C) cada año", "Very hot days (above 32 °C) each year")}
        unit={t("días", "days")}
        data={annual.map((a) => ({ x: a.year, y: a.heatDays32 }))}
        color="var(--chart-heat)"
      />
      <details className="tableView">
        <summary>{t("Ver como tabla", "View as a table")}</summary>
        <table>
          <thead>
            <tr>
              <th>{t("Año", "Year")}</th>
              <th>{t("Lluvia (mm)", "Rainfall (mm)")}</th>
              <th>{t("Días de mucho calor", "Very hot days")}</th>
            </tr>
          </thead>
          <tbody>
            {annual.map((a) => (
              <tr key={a.year}>
                <td>{a.year}</td>
                <td>{a.rainMm == null ? "—" : Math.round(a.rainMm).toLocaleString(locale(lang))}</td>
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
  const { lang, t } = useLang();
  const [hover, setHover] = useState<number | null>(null);
  const W = 360,
    H = 110,
    padB = 18,
    padT = 6;
  const vals = data.map((d) => d.y ?? 0);
  const max = Math.max(...vals, 1);
  const bw = W / data.length;
  const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
  const h = hover != null ? data[hover] : null;
  const n = (v: number) => Math.round(v).toLocaleString(locale(lang));
  return (
    <figure className="miniChart">
      <figcaption>
        <span>{title}</span>
        <b>{h ? `${h.x}: ${h.y == null ? "—" : n(h.y)} ${unit}` : `${t("Promedio", "Average")}: ${n(avg)} ${unit}`}</b>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}, ${t("de", "from")} ${data[0]?.x} ${t("a", "to")} ${data.at(-1)?.x}`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1="0" x2={W} y1={H - padB} y2={H - padB} className="axis" />
        <line
          x1="0"
          x2={W}
          y1={H - padB - (avg / max) * (H - padB - padT)}
          y2={H - padB - (avg / max) * (H - padB - padT)}
          className="avgLine"
        />
        {data.map((d, i) => {
          const bh = ((d.y ?? 0) / max) * (H - padB - padT);
          const x = i * bw + bw * 0.18;
          return (
            <g key={d.x} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              <path
                d={
                  bh > 4
                    ? `M${x},${H - padB} V${H - padB - bh + 4} q0,-4 4,-4 h${bw * 0.64 - 8} q4,0 4,4 V${H - padB} Z`
                    : `M${x},${H - padB} v-${bh} h${bw * 0.64} v${bh} Z`
                }
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
function sky(code: number): [string, L2] {
  if (code === 0) return ["☀️", { es: "Despejado", en: "Clear" }];
  if (code <= 2) return ["🌤️", { es: "Poco nublado", en: "Partly cloudy" }];
  if (code === 3) return ["☁️", { es: "Nublado", en: "Cloudy" }];
  if (code === 45 || code === 48) return ["🌫️", { es: "Neblina", en: "Fog" }];
  if (code >= 51 && code <= 57) return ["🌦️", { es: "Llovizna", en: "Drizzle" }];
  if (code >= 61 && code <= 67) return ["🌧️", { es: "Lluvia", en: "Rain" }];
  if (code >= 80 && code <= 82) return ["🌧️", { es: "Aguaceros", en: "Showers" }];
  if (code >= 95) return ["⛈️", { es: "Tormenta", en: "Thunderstorm" }];
  return ["🌥️", { es: "Variable", en: "Variable" }];
}

// Un consejo práctico por día (el primero que aplique)
function advice(d: Day, prev: Day[]): { text: L2; kind: string } {
  if (d.rain >= 20)
    return {
      text: {
        es: "Aguacero: no abones ni fumigues, el agua lo lava. Revisa que el agua corra.",
        en: "Downpour: don't fertilize or spray, the rain washes it off. Make sure water can drain.",
      },
      kind: "storm",
    };
  if (d.code >= 95)
    return {
      text: {
        es: "Tormenta eléctrica: evita estar en el campo abierto cuando truene y no fumigues.",
        en: "Thunderstorm: stay out of open fields when it thunders, and don't spray.",
      },
      kind: "storm",
    };
  if (d.wind >= 35) return { text: { es: "Viento fuerte: no fumigues hoy.", en: "Strong wind: don't spray today." }, kind: "wind" };
  const rainedBefore = prev.slice(-2).reduce((s, x) => s + x.rain, 0);
  if (rainedBefore >= 10 && d.rain < 10)
    return {
      text: { es: "Buen día para sembrar: la tierra quedó húmeda de la lluvia.", en: "Good day to sow: the soil is still moist from the rain." },
      kind: "sow",
    };
  if (d.rain >= 5 && (d.prob ?? 100) >= 60)
    return { text: { es: "Va a llover: no hace falta regar.", en: "Rain is coming: no need to water." }, kind: "rain" };
  if (d.tmax >= 34)
    return { text: { es: "Mucho calor: riega temprano o al caer la tarde.", en: "Very hot: water early or late in the afternoon." }, kind: "hot" };
  if (d.rain < 1 && d.et0 >= 4)
    return {
      text: { es: "Seco y caluroso: la tierra pierde agua, vigila el riego.", en: "Dry and hot: the soil is losing water, keep an eye on irrigation." },
      kind: "dry",
    };
  return { text: { es: "Buen día para trabajar el conuco.", en: "Good day to work on the conuco." }, kind: "ok" };
}

const dayName = (lang: Lang, iso: string, i: number) => {
  if (i === 0) return lang === "en" ? "Today" : "Hoy";
  if (i === 1) return lang === "en" ? "Tomorrow" : "Mañana";
  const d = new Date(iso + "T12:00:00");
  const s = d.toLocaleDateString(locale(lang), { weekday: "short", day: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function ForecastDays({ lat, lon }: { lat: number; lon: number }) {
  const { lang, t } = useLang();
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
      <p className="lede">
        {t(
          "No se pudo cargar el pronóstico. Revisa la conexión a internet e inténtalo de nuevo.",
          "Couldn't load the forecast. Check your internet connection and try again.",
        )}
      </p>
    );
  if (!days) return <p className="hint">{t("Buscando el pronóstico…", "Loading the forecast…")}</p>;

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
          {balance >= 0
            ? t("Esta semana la lluvia alcanza", "This week the rain is enough")
            : t(`Esta semana faltarán unos ${Math.round(-balance)} mm de agua`, `This week you'll be about ${Math.round(-balance)} mm of water short`)}
        </strong>
        {lang === "en" ? (
          <p>
            About <b>{Math.round(rain7)} mm</b> of rain will fall and the soil will lose about <b>{Math.round(lost7)} mm</b> to
            sun and heat (evaporation).{" "}
            {balance < 0 ? "If your crop is young or flowering, it's worth watering." : "No need to water for now."}
          </p>
        ) : (
          <p>
            Lloverán unos <b>{Math.round(rain7)} mm</b> y la tierra perderá unos <b>{Math.round(lost7)} mm</b> por el sol y
            el calor (evaporación).{" "}
            {balance < 0 ? "Si tu cultivo está pequeño o en flor, conviene regar." : "Por ahora no hace falta regar."}
          </p>
        )}
      </div>

      <ol className="fcList">
        {shown.map((d, i) => {
          const [icon, label] = sky(d.code);
          const a = advice(d, days.slice(0, i));
          const lbl = t(label.es, label.en);
          return (
            <li key={d.date} className={i >= 7 ? "far" : undefined}>
              <div className="fcTop">
                <span className="fcDay">{dayName(lang, d.date, i)}</span>
                <span className="fcIcon" title={lbl} aria-label={lbl}>
                  {icon}
                </span>
                <span className="fcTemp">
                  <b>{Math.round(d.tmax)}°</b> / {Math.round(d.tmin)}°
                </span>
                <span className="fcRain" title={`${t("Lluvia", "Rain")}: ${d.rain.toFixed(1)} mm`}>
                  <i style={{ width: `${Math.min(100, (d.rain / maxRain) * 100)}%` }} />
                  <em>
                    {d.rain < 0.5 ? t("sin lluvia", "no rain") : `${Math.round(d.rain)} mm`}
                    {d.prob != null && d.rain >= 0.5 ? ` · ${d.prob}%` : ""}
                  </em>
                </span>
              </div>
              <p className={`fcTip tip-${a.kind}`}>{t(a.text.es, a.text.en)}</p>
            </li>
          );
        })}
      </ol>

      <button type="button" className="fcMore" onClick={() => setShowAll((x) => !x)}>
        {showAll ? t("Ver solo 7 días", "Show only 7 days") : t("Ver 14 días", "Show 14 days")}
      </button>
      {showAll && (
        <p className="hint">
          {t("Después de 7 días el pronóstico es menos seguro: tómalo como una idea.", "Beyond 7 days the forecast is less certain: take it as a rough idea.")}
        </p>
      )}
      <p className="hint">
        {t("Pronóstico para el centro de esta zona, de", "Forecast for the center of this area, from")}{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        {t(
          "(modelos de NOAA, ECMWF y otros servicios meteorológicos). Se actualiza cada hora.",
          "(models from NOAA, ECMWF and other weather services). Updated hourly.",
        )}
      </p>
    </div>
  );
}
