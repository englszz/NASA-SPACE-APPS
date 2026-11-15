"use client";

import Image from "next/image";
import { useState } from "react";
import { openRamoncito } from "./RamoncitoChat";
import { useLang } from "@/lib/i18n";
import { PRIORITY_TEXT } from "@/lib/conuco";

// Contenido tomado de la configuración de field-shift-data/build-data.mjs
// (cultivos: valores aproximados FAO ECOCROP / FAO-56; indicadores del reto).
// Cada texto va en los dos idiomas: { es, en }.

type L = { es: string; en: string };
const useTx = () => {
  const { t } = useLang();
  return (x: L) => t(x.es, x.en);
};

export const SOURCES: { name: string; what: L }[] = [
  { name: "NASA POWER", what: { es: "Temperatura, lluvia y humedad del suelo (MERRA-2)", en: "Temperature, rainfall and soil moisture (MERRA-2)" } },
  { name: "GPM IMERG V07", what: { es: "Lluvia medida por satélite", en: "Satellite-measured rainfall" } },
  { name: "MODIS", what: { es: "Vigor de la vegetación (NDVI) y evapotranspiración", en: "Vegetation vigor (NDVI) and evapotranspiration" } },
  { name: "SMAP L4", what: { es: "Humedad del suelo en la zona de raíces", en: "Root-zone soil moisture" } },
  { name: "GRACE / GRACE-FO", what: { es: "Agua almacenada en el subsuelo", en: "Water stored underground" } },
  { name: "SRTM", what: { es: "Altura y pendiente del terreno", en: "Terrain elevation and slope" } },
  { name: "CMIP6", what: { es: "Proyecciones de clima futuro", en: "Future climate projections" } },
  { name: "ISRIC SoilGrids", what: { es: "Textura, pH y carbono del suelo", en: "Soil texture, pH and carbon" } },
];

type Family = "cereal" | "leguminosa" | "raiz" | "perenne";

export const FAMILIES: Record<Family, { label: L; role: L }> = {
  cereal: {
    label: { es: "Cereal", en: "Cereal" },
    role: { es: "Rastrojo que aporta materia orgánica", en: "Crop residue that adds organic matter" },
  },
  leguminosa: {
    label: { es: "Leguminosa", en: "Legume" },
    role: { es: "Fija nitrógeno en el suelo", en: "Fixes nitrogen in the soil" },
  },
  raiz: {
    label: { es: "Raíz / tubérculo", en: "Root / tuber" },
    role: { es: "Raíces profundas que mejoran la infiltración", en: "Deep roots that help water soak in" },
  },
  perenne: {
    label: { es: "Perenne", en: "Perennial" },
    role: { es: "Cobertura permanente contra la erosión", en: "Year-round cover against erosion" },
  },
};

const CROPS: { name: L; family: Family; cycle: number; heat: "baja" | "media" | "alta" }[] = [
  { name: { es: "Maíz", en: "Corn" }, family: "cereal", cycle: 4, heat: "media" },
  { name: { es: "Arroz", en: "Rice" }, family: "cereal", cycle: 4, heat: "media" },
  { name: { es: "Sorgo", en: "Sorghum" }, family: "cereal", cycle: 4, heat: "alta" },
  { name: { es: "Habichuela", en: "Beans" }, family: "leguminosa", cycle: 3, heat: "baja" },
  { name: { es: "Maní", en: "Peanut" }, family: "leguminosa", cycle: 4, heat: "alta" },
  { name: { es: "Guandul", en: "Pigeon pea" }, family: "leguminosa", cycle: 6, heat: "alta" },
  { name: { es: "Yuca", en: "Cassava" }, family: "raiz", cycle: 10, heat: "alta" },
  { name: { es: "Batata", en: "Sweet potato" }, family: "raiz", cycle: 5, heat: "media" },
  { name: { es: "Cacao", en: "Cocoa" }, family: "perenne", cycle: 12, heat: "media" },
  { name: { es: "Plátano", en: "Plantain" }, family: "perenne", cycle: 12, heat: "media" },
];

const INDICATORS: { title: L; unit: L; source: string }[] = [
  { title: { es: "Estrés térmico", en: "Heat stress" }, unit: { es: "Días al año con máxima ≥ 32 °C", en: "Days per year with max ≥ 32 °C" }, source: "NASA POWER" },
  { title: { es: "Precipitaciones", en: "Rainfall" }, unit: { es: "Lluvia anual en mm", en: "Annual rainfall in mm" }, source: "GPM IMERG" },
  { title: { es: "Humedad del suelo", en: "Soil moisture" }, unit: { es: "Índice 0–1 en la zona de raíces", en: "0–1 index in the root zone" }, source: "NASA POWER + SMAP" },
  { title: { es: "Evaporación", en: "Evaporation" }, unit: { es: "Demanda de agua de la atmósfera, mm/año", en: "Atmospheric water demand, mm/year" }, source: "NASA POWER + MODIS" },
  { title: { es: "Riesgo de heladas", en: "Frost risk" }, unit: { es: "Días al año con mínima ≤ 2 °C", en: "Days per year with min ≤ 2 °C" }, source: "NASA POWER" },
  { title: { es: "Lluvias extremas", en: "Extreme rainfall" }, unit: { es: "Meses con lluvia sobre el percentil 90", en: "Months with rain above the 90th percentile" }, source: "GPM IMERG" },
  { title: { es: "Estrés de la vegetación", en: "Vegetation stress" }, unit: { es: "Meses con NDVI anómalo bajo", en: "Months with unusually low NDVI" }, source: "MODIS NDVI" },
  { title: { es: "Tendencia hídrica", en: "Water trend" }, unit: { es: "Lluvia menos evaporación, mm/año", en: "Rainfall minus evaporation, mm/year" }, source: "NASA POWER + GRACE" },
];

const HEAT_LEVEL = { baja: 1, media: 2, alta: 3 };

function SectionHead({ n, eyebrow, title, lead }: { n: string; eyebrow: string; title: string; lead: string }) {
  return (
    <header className="sectionHead">
      <p className="eyebrow">
        <span>{n}</span> {eyebrow}
      </p>
      <h2>{title}</h2>
      <p className="lead">{lead}</p>
    </header>
  );
}

export function SourcesStrip() {
  const { t } = useLang();
  return (
    <div className="sourcesStrip" aria-label={t("Fuentes de datos", "Data sources")}>
      <span className="sourcesLabel">{t("Datos de", "Data from")}</span>
      <ul>
        {SOURCES.map((s) => (
          <li key={s.name}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}

export function MapSection({ onOpenMap }: { onOpenMap: () => void }) {
  const { t } = useLang();
  const steps = [
    { t: t("Escoge tu parcela", "Pick your plot"), d: t("Toca un punto del Valle del Cibao en el mapa.", "Tap a point of the Cibao Valley on the map.") },
    {
      t: t("Mira cómo ha cambiado", "See how it has changed"),
      d: t(
        "20 años de calor, lluvia, humedad y vegetación medidos desde el espacio.",
        "20 years of heat, rainfall, moisture and vegetation measured from space.",
      ),
    },
    {
      t: t("Compara rotaciones", "Compare rotations"),
      d: t(
        "Tu rotación actual frente a otras alternativas, con su evidencia, beneficios y riesgos.",
        "Your current rotation against other options, with their evidence, benefits and risks.",
      ),
    },
  ];
  // Rejilla decorativa de puntos (vista previa del mapa)
  const dots: { x: number; y: number; v: number }[] = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 11; c++) {
      if ((r === 0 && c > 7) || (r === 5 && c < 3)) continue;
      dots.push({ x: 30 + c * 34 + (r % 2) * 6, y: 30 + r * 34, v: (c * 7 + r * 13) % 5 });
    }

  return (
    <section id="mapa" className="band bandCream">
      <div className="container split">
        <div>
          <SectionHead
            n="01"
            eyebrow={t("El mapa", "The map")}
            title={t("Tu conuco, visto desde el espacio", "Your conuco, seen from space")}
            lead={t(
              "Una herramienta para decidir, no solo otro mapa satelital: cada punto traduce datos científicos en recomendaciones que un agricultor puede usar.",
              "A tool for deciding, not just another satellite map: each point turns scientific data into advice a farmer can use. (A conuco is a small Dominican family farm.)",
            )}
          />
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.t}>
                <span className="stepN">{i + 1}</span>
                <div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mapPreview">
          <div className="mapPreviewTop">
            <span className="tag">{t("Valle del Cibao · República Dominicana", "Cibao Valley · Dominican Republic")}</span>
            <span className="tag tagSoft">{t("52 puntos de análisis", "52 analysis points")}</span>
          </div>
          <svg viewBox="0 0 400 230" className="mapDots" aria-hidden="true">
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="9" className={`dot v${d.v}`} />
            ))}
            <circle cx={30 + 6 * 34 + 6} cy={30 + 3 * 34} r="18" className="dotRing" />
            <circle cx={30 + 6 * 34 + 6} cy={30 + 3 * 34} r="10" className="dotActive" />
          </svg>
          <button type="button" className="cta" onClick={onOpenMap}>
            {t("Abrir el mapa", "Open the map")}
          </button>
        </div>
      </div>
    </section>
  );
}

const GLOSSARY: { term: L; def: L }[] = [
  {
    term: { es: "Evapotranspiración", en: "Evapotranspiration" },
    def: {
      es: "El agua que sale del suelo y de las plantas hacia el aire. Si sube, el cultivo necesita más riego.",
      en: "Water that leaves the soil and plants into the air. When it rises, crops need more irrigation.",
    },
  },
  {
    term: { es: "Anomalía de humedad", en: "Moisture anomaly" },
    def: {
      es: "Cuánto más seco o más húmedo está el suelo comparado con lo normal para ese mes.",
      en: "How much drier or wetter the soil is compared with what is normal for that month.",
    },
  },
  {
    term: { es: "NDVI", en: "NDVI" },
    def: {
      es: "Un índice de verdor medido desde el satélite. Si baja fuera de temporada, la vegetación está estresada.",
      en: "A greenness index measured from space. If it drops out of season, vegetation is stressed.",
    },
  },
  {
    term: { es: "Riesgo de helada", en: "Frost risk" },
    def: {
      es: "Días en que la temperatura mínima baja tanto que puede quemar hojas y flores.",
      en: "Days when the minimum temperature drops low enough to burn leaves and flowers.",
    },
  },
  {
    term: { es: "Balance hídrico", en: "Water balance" },
    def: {
      es: "Lluvia menos evaporación. Negativo significa que la tierra pierde más agua de la que recibe.",
      en: "Rainfall minus evaporation. Negative means the land loses more water than it receives.",
    },
  },
  {
    term: { es: "Satélite vs. estación", en: "Satellite vs. station" },
    def: {
      es: "El satélite cubre todo el valle pero en cuadros de varios km; la estación en tierra mide un solo punto con más precisión. Juntos se corrigen.",
      en: "Satellites cover the whole valley but in squares several km wide; a ground station measures one spot more precisely. Together they correct each other.",
    },
  },
];

type Priority = "agua" | "nitrogeno" | "erosion" | "organica" | "forraje" | "mercado";

const PRIORITIES: Priority[] = ["agua", "nitrogeno", "erosion", "organica", "forraje", "mercado"];

type Slot = { crop: L; family: Family | "bare"; months: number };
const BARE: L = { es: "Suelo desnudo", en: "Bare soil" };

const STRATEGIES: { id: string; name: L; kind: L; sequence: Slot[]; serves: Priority[]; rows: [L, L][] }[] = [
  {
    id: "actual",
    name: { es: "Tu rotación actual", en: "Your current rotation" },
    kind: { es: "Punto de partida", en: "Starting point" },
    sequence: [
      { crop: BARE, family: "bare", months: 3 },
      { crop: { es: "Maíz", en: "Corn" }, family: "cereal", months: 4 },
      { crop: BARE, family: "bare", months: 1 },
      { crop: { es: "Maíz", en: "Corn" }, family: "cereal", months: 4 },
    ],
    serves: ["mercado"],
    rows: [
      [{ es: "Por qué aparece", en: "Why it's here" }, { es: "Es la referencia contra la que se comparan las alternativas.", en: "It's the baseline the alternatives are compared against." }],
      [{ es: "Evidencia", en: "Evidence" }, { es: "Meses con NDVI bajo y suelo expuesto entre cosechas (MODIS).", en: "Months with low NDVI and exposed soil between harvests (MODIS)." }],
      [{ es: "Beneficios", en: "Benefits" }, { es: "Cultivo conocido y con venta asegurada.", en: "A familiar crop with a reliable market." }],
      [{ es: "Vacíos de información", en: "Information gaps" }, { es: "Rendimientos reales de la parcela y uso de fertilizante.", en: "Actual plot yields and fertilizer use." }],
      [{ es: "Riesgos a revisar", en: "Risks to review" }, { es: "Cuatro meses sin cobertura: erosión y pérdida de nutrientes.", en: "Four months without cover: erosion and nutrient loss." }],
    ],
  },
  {
    id: "leguminosas",
    name: { es: "Con leguminosas", en: "With legumes" },
    kind: { es: "Alternativa", en: "Alternative" },
    sequence: [
      { crop: { es: "Batata", en: "Sweet potato" }, family: "raiz", months: 5 },
      { crop: { es: "Maíz", en: "Corn" }, family: "cereal", months: 4 },
      { crop: { es: "Habichuela", en: "Beans" }, family: "leguminosa", months: 3 },
    ],
    serves: ["nitrogeno", "organica", "erosion", "mercado"],
    rows: [
      [{ es: "Por qué aparece", en: "Why it's here" }, { es: "La habichuela devuelve nitrógeno que el maíz consumió.", en: "Beans give back the nitrogen the corn used up." }],
      [{ es: "Evidencia", en: "Evidence" }, { es: "Lluvia de la temporada (GPM IMERG) y humedad del suelo (SMAP).", en: "Seasonal rainfall (GPM IMERG) and soil moisture (SMAP)." }],
      [{ es: "Beneficios", en: "Benefits" }, { es: "Menos fertilizante, suelo cubierto todo el año y corta ciclos de plagas.", en: "Less fertilizer, soil covered all year and broken pest cycles." }],
      [{ es: "Vacíos de información", en: "Information gaps" }, { es: "Precio local de la habichuela y disponibilidad de semilla.", en: "Local bean prices and seed availability." }],
      [{ es: "Riesgos a revisar", en: "Risks to review" }, { es: "La habichuela tolera poco el calor: va en la época fresca y hay que vigilar la fecha.", en: "Beans handle heat poorly: they go in the cool season and the date needs watching." }],
    ],
  },
  {
    id: "seca",
    name: { es: "Para años secos", en: "For dry years" },
    kind: { es: "Alternativa", en: "Alternative" },
    sequence: [
      { crop: BARE, family: "bare", months: 2 },
      { crop: { es: "Sorgo", en: "Sorghum" }, family: "cereal", months: 4 },
      { crop: { es: "Guandul", en: "Pigeon pea" }, family: "leguminosa", months: 6 },
    ],
    serves: ["agua", "nitrogeno", "forraje"],
    rows: [
      [{ es: "Por qué aparece", en: "Why it's here" }, { es: "Sorgo y guandul resisten calor y sequía mejor que el maíz.", en: "Sorghum and pigeon pea withstand heat and drought better than corn." }],
      [{ es: "Evidencia", en: "Evidence" }, { es: "Tendencia del balance hídrico (NASA POWER, GRACE) y proyección CMIP6.", en: "Water-balance trend (NASA POWER, GRACE) and CMIP6 projection." }],
      [{ es: "Beneficios", en: "Benefits" }, { es: "Menos riego, forraje para animales y nitrógeno del guandul.", en: "Less irrigation, animal fodder and nitrogen from the pigeon pea." }],
      [{ es: "Vacíos de información", en: "Information gaps" }, { es: "Acceso a mercado para el sorgo en la zona.", en: "Market access for sorghum in the area." }],
      [{ es: "Riesgos a revisar", en: "Risks to review" }, { es: "Dos meses sin cobertura antes de la siembra del sorgo.", en: "Two months without cover before sowing the sorghum." }],
    ],
  },
];

const MONTH_LETTERS: L[] = "EFMAMJJASOND".split("").map((es, i) => ({ es, en: "JFMAMJJASOND"[i] }));

export function RotationSection() {
  const { t } = useLang();
  const tx = useTx();
  const [picked, setPicked] = useState<Priority[]>(["agua", "nitrogeno"]);
  const toggle = (p: Priority) => setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <section id="rotaciones" className="band bandCream bandSand">
      <div className="container">
        <SectionHead
          n="02"
          eyebrow={t("Rotaciones", "Rotations")}
          title={t("Tres caminos para tu parcela, con sus razones", "Three paths for your plot, with their reasons")}
          lead={t(
            "Comparamos tu rotación actual con dos alternativas. Cada una dice por qué se sugiere, en qué datos se apoya, qué gana tu suelo, qué información falta y qué riesgos hay que revisar.",
            "We compare your current rotation with two alternatives. Each one says why it's suggested, what data supports it, what your soil gains, what information is missing and which risks to review.",
          )}
        />

        <div className="priorities">
          <p className="prioritiesLabel">{t("¿Qué es lo más importante para ti?", "What matters most to you?")}</p>
          <ul>
            {PRIORITIES.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  className={picked.includes(p) ? "isOn" : undefined}
                  aria-pressed={picked.includes(p)}
                  onClick={() => toggle(p)}
                >
                  <span className="prioLabel">{tx(PRIORITY_TEXT[p].label)}</span>
                  <small className="prioHint">{tx(PRIORITY_TEXT[p].hint)}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="strategyGrid">
          {STRATEGIES.map((st) => {
            const hits = st.serves.filter((x) => picked.includes(x)).length;
            return (
              <article key={st.id} className={`strategy${st.id === "actual" ? " isBaseline" : ""}`}>
                <header className="strategyHead">
                  <span className="strategyKind">{tx(st.kind)}</span>
                  <h3>{tx(st.name)}</h3>
                  <p className="strategySeq">
                    {st.sequence
                      .filter((x) => x.family !== "bare")
                      .map((x) => tx(x.crop))
                      .join(" → ")}
                  </p>
                </header>

                <div className="calendar" aria-label={t("Calendario de 12 meses", "12-month calendar")}>
                  <div className="calBar">
                    {st.sequence.map((slot, i) => (
                      <span
                        key={i}
                        className={`calSlot ${slot.family === "bare" ? "isBare" : `fam-${slot.family}`}`}
                        style={{ gridColumn: `span ${slot.months}` }}
                        title={`${tx(slot.crop)} · ${slot.months} ${t("meses", "months")}`}
                      >
                        {slot.months >= 3 ? tx(slot.crop) : ""}
                      </span>
                    ))}
                  </div>
                  <div className="calMonths" aria-hidden="true">
                    {MONTH_LETTERS.map((m, i) => (
                      <span key={i}>{tx(m)}</span>
                    ))}
                  </div>
                </div>

                <p className={`match${hits ? " isHit" : ""}`}>
                  {picked.length === 0
                    ? t("Escoge tus prioridades arriba", "Pick your priorities above")
                    : t(`Coincide con ${hits} de ${picked.length} prioridades`, `Matches ${hits} of ${picked.length} priorities`)}
                </p>

                <dl className="strategyRows">
                  {st.rows.map(([k, v]) => (
                    <div key={k.es}>
                      <dt>{tx(k)}</dt>
                      <dd>{tx(v)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>

        <div className="calLegend" aria-hidden="true">
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
            <i className="isBare" /> {t("Suelo desnudo", "Bare soil")}
          </span>
        </div>

        <p className="notice">
          <strong>{t("Ejemplo ilustrativo.", "Illustrative example.")}</strong>{" "}
          {t(
            "En el mapa, cada estrategia se calcula con los datos de tu punto. The Conuco es una herramienta de apoyo: no reemplaza tu experiencia ni la revisión de un técnico agrícola local.",
            "On the map, each strategy is calculated with your point's data. The Conuco is a support tool: it doesn't replace your experience or a review by a local agronomist.",
          )}
        </p>
      </div>
    </section>
  );
}

export function CropsSection() {
  const { t } = useLang();
  const tx = useTx();
  return (
    <section id="cultivos" className="band bandDeep bandPattern">
      <div className="container">
        <div className="headWithArt">
          <SectionHead
            n="03"
            eyebrow={t("Cultivos", "Crops")}
            title={t("Rotar familias protege el suelo", "Rotating crop families protects the soil")}
            lead={t(
              "Alternar cereales, leguminosas y raíces devuelve nutrientes, corta plagas y conserva el agua. Evaluamos cada cultivo según la temperatura, la lluvia y el tipo de suelo de tu parcela.",
              "Alternating cereals, legumes and roots returns nutrients, breaks pest cycles and saves water. We rate each crop by the temperature, rainfall and soil type of your plot.",
            )}
          />
          <Image
            src="/ramoncito-planta.png"
            alt={t("Ramoncito sentado, mostrando una plantita", "Ramoncito sitting, holding a seedling")}
            width={566}
            height={451}
            className="sectionArt"
          />
        </div>

        <ul className="families">
          {(Object.keys(FAMILIES) as Family[]).map((f) => (
            <li key={f} className={`fam fam-${f}`}>
              <strong>{tx(FAMILIES[f].label)}</strong>
              <span>{tx(FAMILIES[f].role)}</span>
            </li>
          ))}
        </ul>

        <ul className="cropGrid">
          {CROPS.map((c) => (
            <li key={c.name.es} className="cropCard">
              <span className={`famTag fam-${c.family}`}>{tx(FAMILIES[c.family].label)}</span>
              <h3>{tx(c.name)}</h3>
              <dl>
                <div>
                  <dt>{t("Ciclo", "Cycle")}</dt>
                  <dd>{c.cycle >= 12 ? t("Todo el año", "Year-round") : t(`${c.cycle} meses`, `${c.cycle} months`)}</dd>
                </div>
                <div>
                  <dt>{t("Tolera el calor", "Heat tolerance")}</dt>
                  <dd
                    className="meter"
                    aria-label={t(`Tolerancia ${c.heat}`, `Tolerance ${{ baja: "low", media: "medium", alta: "high" }[c.heat]}`)}
                  >
                    {[1, 2, 3].map((n) => (
                      <i key={n} className={n <= HEAT_LEVEL[c.heat] ? "on" : undefined} />
                    ))}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <p className="fineprint">
          {t(
            "Parámetros de referencia: FAO ECOCROP y coeficientes de cultivo FAO-56.",
            "Reference parameters: FAO ECOCROP and FAO-56 crop coefficients.",
          )}
        </p>
      </div>
    </section>
  );
}

export function ClimateSection() {
  const { t } = useLang();
  const tx = useTx();
  return (
    <section id="clima" className="band bandCream">
      <div className="container">
        <SectionHead
          n="04"
          eyebrow={t("Clima futuro", "Future climate")}
          title={t("Ocho señales para leer el clima de tu tierra", "Eight signals to read your land's climate")}
          lead={t(
            "Comparamos 2006–2015 con 2016–2025 para ver qué ya cambió, y usamos los modelos CMIP6 para estimar lo que viene.",
            "We compare 2006–2015 with 2016–2025 to see what has already changed, and use CMIP6 models to estimate what's coming.",
          )}
        />

        <div className="scenario">
          <div>
            <span className="scenarioK">{t("Histórico", "Historical")}</span>
            <strong>2006–2025</strong>
          </div>
          <div>
            <span className="scenarioK">{t("Escenario", "Scenario")}</span>
            <strong>SSP2-4.5</strong>
          </div>
          <div>
            <span className="scenarioK">{t("Horizontes", "Horizons")}</span>
            <strong>2026–2045 · 2041–2060</strong>
          </div>
        </div>

        <ol className="indicatorGrid">
          {INDICATORS.map((ind, i) => (
            <li key={ind.title.es} className="indicator">
              <span className="indN">{String(i + 1).padStart(2, "0")}</span>
              <h3>{tx(ind.title)}</h3>
              <p>{tx(ind.unit)}</p>
              <span className="tag tagSoft">{ind.source}</span>
            </li>
          ))}
        </ol>

        <div className="glossary">
          <h3 className="subhead">{t("Glosario en palabras sencillas", "Glossary in plain words")}</h3>
          <dl>
            {GLOSSARY.map((g) => (
              <div key={g.term.es}>
                <dt>{tx(g.term)}</dt>
                <dd>{tx(g.def)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

const RAMONCITO_CAN: { icon: string; title: L; text: L }[] = [
  {
    icon: "🌦️",
    title: { es: "Te dice qué hacer esta semana", en: "Tells you what to do this week" },
    text: {
      es: "Mira el pronóstico de tu zona y te avisa si conviene regar, sembrar, abonar o esperar a que pase el aguacero.",
      en: "Checks your area's forecast and tells you whether to water, sow, fertilize or wait for the downpour to pass.",
    },
  },
  {
    icon: "🌱",
    title: { es: "Qué sembrar y cuándo", en: "What to plant and when" },
    text: {
      es: "Los cultivos que mejor se dan en tu tierra, con el mes para sembrar y el mes de cosecha.",
      en: "The crops that grow best on your land, with the month to sow and the month to harvest.",
    },
  },
  {
    icon: "🔄",
    title: { es: "Compara tus rotaciones", en: "Compares your rotations" },
    text: {
      es: "Pone lo que siembras hoy al lado de otras opciones y te explica por qué podrían cuidar mejor tu tierra.",
      en: "Puts what you plant today next to other options and explains why they could take better care of your soil.",
    },
  },
  {
    icon: "🛰️",
    title: { es: "Traduce los datos de la NASA", en: "Translates NASA data" },
    text: {
      es: "Calor, lluvia, humedad de la tierra y salud de las plantas, explicados en palabras sencillas.",
      en: "Heat, rainfall, soil moisture and plant health, explained in plain words.",
    },
  },
  {
    icon: "⚠️",
    title: { es: "Te avisa de los riesgos", en: "Warns you about risks" },
    text: {
      es: "Meses de mucho calor, falta de agua, lluvias fuertes y terrenos donde la lluvia se lleva la tierra.",
      en: "Very hot months, water shortages, heavy rain and land where rain washes the soil away.",
    },
  },
  {
    icon: "📅",
    title: { es: "Piensa en los años que vienen", en: "Thinks about the years ahead" },
    text: {
      es: "Cómo cambiarán el calor y el agua en tu zona hacia 2040–2060 y qué cultivos aguantarán mejor.",
      en: "How heat and water will change in your area toward 2040–2060 and which crops will hold up best.",
    },
  },
];

export function RamoncitoSection() {
  const { t } = useLang();
  const tx = useTx();
  return (
    <section id="ramoncito" className="band bandDeep bandPattern">
      <div className="container">
        <div className="headWithArt">
          <SectionHead
            n="05"
            eyebrow={t("Pregúntale a Ramoncito", "Ask Ramoncito")}
            title={t("Tu asistente para el conuco", "Your assistant for the conuco")}
            lead={t(
              "Ramoncito es una inteligencia artificial que conoce los datos de tu zona y lo que siembras. Te responde en palabras sencillas, a cualquier hora.",
              "Ramoncito is an artificial intelligence that knows your area's data and what you plant. It answers in plain words, any time.",
            )}
          />
          <Image
            src="/ramoncito-rastrillo.png"
            alt={t("Ramoncito con su rastrillo", "Ramoncito with his rake")}
            width={462}
            height={581}
            className="sectionArt"
          />
        </div>

        <ul className="canGrid">
          {RAMONCITO_CAN.map((c) => (
            <li key={c.title.es}>
              <span className="canIcon" aria-hidden="true">
                {c.icon}
              </span>
              <h3>{tx(c.title)}</h3>
              <p>{tx(c.text)}</p>
            </li>
          ))}
        </ul>

        <div className="ramoncitoRow">
          <div className="chatMock chatDemo" aria-label={t("Ejemplo de conversación", "Sample conversation")}>
            <div className="chatTop">
              <span className="rcAvatar">
                <Image src="/ia-sombrero.png" alt="" width={256} height={256} />
              </span>
              <strong>{t("Así responde Ramoncito", "How Ramoncito answers")}</strong>
            </div>
            <p className="demoMe">
              {t("¿Riego esta semana? Siembro maíz cerca de Mao.", "Should I water this week? I grow corn near Mao.")}
            </p>
            <div className="demoBot">
              <p>
                <b>{t("Esta semana no hace falta.", "Not this week.")}</b>{" "}
                {t(
                  "Mañana se esperan unos 16 mm de lluvia y la tierra de tu zona guarda bien el agua.",
                  "About 16 mm of rain is expected tomorrow and the soil in your area holds water well.",
                )}
              </p>
              <p>
                <b>{t("Ojo con:", "Watch out for:")}</b>{" "}
                {t(
                  "la parte baja de tu conuco, que se encharca. Abre canales para que el agua corra.",
                  "the low part of your conuco, which gets waterlogged. Open channels so the water can drain.",
                )}
              </p>
            </div>
            <p className="demoNote">
              {t(
                "Ejemplo basado en una respuesta real con datos de la zona de Mao.",
                "Example based on a real answer using data from the Mao area.",
              )}
            </p>
          </div>

          <div className="ramoncitoSide">
            <h3>{t("Para que te ayude mejor", "So it can help you better")}</h3>
            <ol className="steps stepsLight">
              <li>
                <span className="stepN">1</span>
                <div>
                  <h4>{t("Entra con Google", "Sign in with Google")}</h4>
                  <p>{t("Es gratis. Tus datos solo los ves tú.", "It's free. Only you can see your data.")}</p>
                </div>
              </li>
              <li>
                <span className="stepN">2</span>
                <div>
                  <h4>{t("Registra tu conuco", "Register your conuco")}</h4>
                  <p>
                    {t(
                      "Dónde está, qué siembras, qué agua tienes y qué te importa más.",
                      "Where it is, what you grow, what water you have and what matters most to you.",
                    )}
                  </p>
                </div>
              </li>
              <li>
                <span className="stepN">3</span>
                <div>
                  <h4>{t("Pregúntale lo que quieras", "Ask anything")}</h4>
                  <p>
                    {t(
                      "Toca el sombrero que está abajo a la derecha, en cualquier página.",
                      "Tap the hat at the bottom right, on any page.",
                    )}
                  </p>
                </div>
              </li>
            </ol>
            <div className="formActions">
              <button type="button" className="cta" onClick={openRamoncito}>
                {t("Habla con Ramoncito", "Talk to Ramoncito")}
              </button>
              <a href="/mi-conuco" className="ctaGhost">
                {t("Registrar mi conuco", "Register my conuco")}
              </a>
            </div>
            <p className="ramoncitoLimits">
              <b>{t("Lo que Ramoncito no hace:", "What Ramoncito doesn't do:")}</b>{" "}
              {t(
                "no ve tu finca exacta (sus datos son de una zona de unos 11 km), no recomienda químicos ni dosis y no reemplaza a un técnico agrícola. Es una IA: puede equivocarse.",
                "it can't see your exact farm (its data covers an area of about 11 km), it doesn't recommend chemicals or doses, and it doesn't replace an agronomist. It's an AI: it can make mistakes.",
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ChallengeSection() {
  const { t } = useLang();
  const tx = useTx();
  const answers: { ask: L; how: L }[] = [
    {
      ask: { es: "Observaciones de la Tierra de la NASA", en: "NASA Earth observations" },
      how: {
        es: "SMAP, GPM, MODIS, NASA POWER, GRACE/GRACE-FO, SRTM y CMIP6 sobre una misma rejilla del Cibao, con 20 años de historia.",
        en: "SMAP, GPM, MODIS, NASA POWER, GRACE/GRACE-FO, SRTM and CMIP6 on a single Cibao grid, with 20 years of history.",
      },
    },
    {
      ask: { es: "Al menos tres rotaciones, incluida la actual", en: "At least three rotations, including the current one" },
      how: {
        es: "Cada una con su porqué, la evidencia, los beneficios, los vacíos de información y los riesgos.",
        en: "Each with its reason, evidence, benefits, information gaps and risks.",
      },
    },
    {
      ask: { es: "Suelo desnudo y temporadas vulnerables", en: "Bare soil and vulnerable seasons" },
      how: {
        es: "Calendario mes a mes que marca cuándo el suelo queda expuesto y cuándo el cultivo sufre más estrés.",
        en: "A month-by-month calendar showing when the soil is exposed and when crops are most stressed.",
      },
    },
    {
      ask: { es: "Prioridades del agricultor", en: "Farmer priorities" },
      how: {
        es: "Usar menos agua, dar nutrientes a la tierra, evitar que se desgaste, comida para los animales y vender lo que se produce ordenan qué alternativa conviene.",
        en: "Using less water, feeding the soil, keeping it from wearing away, food for animals and selling what you grow shape which option fits best.",
      },
    },
    {
      ask: { es: "Lenguaje para el agricultor", en: "Farmer-friendly language" },
      how: {
        es: "Glosario sencillo y Ramoncito, un asistente que explica los datos en palabras sencillas.",
        en: "A plain glossary and Ramoncito, an assistant that explains the data in plain words.",
      },
    },
  ];
  return (
    <section id="reto" className="band bandCream">
      <div className="container split">
        <div>
          <SectionHead
            n="06"
            eyebrow={t("El reto", "The challenge")}
            title="Field Shift: Adapting Farms with NASA Data"
            lead={t(
              "Los agricultores enfrentan temperaturas cambiantes, lluvias irregulares, escasez de agua, clima extremo y suelos que se agotan. El reto de NASA Space Apps Challenge 2026 es crear una herramienta de apoyo a la decisión que combine observaciones de la NASA con el suelo local, las características de los cultivos y las prioridades del agricultor para explorar rotaciones que fortalezcan el suelo.",
              "Farmers face shifting temperatures, erratic rainfall, water shortages, extreme weather and depleted soils. The NASA Space Apps Challenge 2026 asks for a decision-support tool that combines NASA observations with local soil, crop characteristics and farmer priorities to explore rotations that strengthen the soil.",
            )}
          />
          <blockquote className="principle">
            {t(
              "Una herramienta que ayuda a ver patrones y posibilidades, pero que no reemplaza el criterio del agricultor ni la experiencia agrícola local.",
              "A tool that helps reveal patterns and possibilities, but doesn't replace the farmer's judgment or local agricultural expertise.",
            )}
          </blockquote>
          <a
            className="textLink"
            href="https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/"
            target="_blank"
            rel="noreferrer"
          >
            {t("Ver el reto oficial ↗", "See the official challenge ↗")}
          </a>
        </div>
        <div>
          <h3 className="subhead">{t("Lo que pide el reto y cómo respondemos", "What the challenge asks and how we answer")}</h3>
          <ul className="answers">
            {answers.map((a) => (
              <li key={a.ask.es}>
                <span className="answerAsk">{tx(a.ask)}</span>
                <p>{tx(a.how)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const { t } = useLang();
  const tx = useTx();
  return (
    <footer className="siteFooter">
      <div className="container footerGrid">
        <div>
          <Image src="/logo-texto.png" alt="The Conuco" width={900} height={271} className="footerLogo" />
          <p>
            <a href="/privacidad" className="footerLink">
              {t("Política de privacidad", "Privacy policy")}
            </a>
            <br />
            {t(
              "Proyecto del equipo The Conuco para NASA Space Apps Challenge 2026. Sitio independiente: no está afiliado ni respaldado por la NASA.",
              "A project by The Conuco team for the NASA Space Apps Challenge 2026. Independent site: not affiliated with or endorsed by NASA.",
            )}
          </p>
          <Image
            src="/ramoncito-cosecha.png"
            alt={t("Ramoncito caminando con una caja de cosecha", "Ramoncito walking with a crate of produce")}
            width={626}
            height={668}
            className="footerArt"
          />
        </div>
        <div>
          <h3>{t("Fuentes de datos", "Data sources")}</h3>
          <ul>
            {SOURCES.map((s) => (
              <li key={s.name}>
                <strong>{s.name}</strong> — {tx(s.what)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
