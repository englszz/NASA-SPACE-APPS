"use client";

import Image from "next/image";
import { useState } from "react";
import { openRamoncito } from "./RamoncitoChat";

// Contenido tomado de la configuración de field-shift-data/build-data.mjs
// (cultivos: valores aproximados FAO ECOCROP / FAO-56; indicadores del reto).

export const SOURCES = [
  { name: "NASA POWER", what: "Temperatura, lluvia y humedad del suelo (MERRA-2)" },
  { name: "GPM IMERG V07", what: "Lluvia medida por satélite" },
  { name: "MODIS", what: "Vigor de la vegetación (NDVI) y evapotranspiración" },
  { name: "SMAP L4", what: "Humedad del suelo en la zona de raíces" },
  { name: "GRACE / GRACE-FO", what: "Agua almacenada en el subsuelo" },
  { name: "CMIP6", what: "Proyecciones de clima futuro" },
  { name: "ISRIC SoilGrids", what: "Textura, pH y carbono del suelo" },
];

type Family = "cereal" | "leguminosa" | "raiz" | "perenne";

const FAMILIES: Record<Family, { label: string; role: string }> = {
  cereal: { label: "Cereal", role: "Rastrojo que aporta materia orgánica" },
  leguminosa: { label: "Leguminosa", role: "Fija nitrógeno en el suelo" },
  raiz: { label: "Raíz / tubérculo", role: "Raíces profundas que mejoran la infiltración" },
  perenne: { label: "Perenne", role: "Cobertura permanente contra la erosión" },
};

const CROPS: { name: string; family: Family; cycle: number; heat: "baja" | "media" | "alta" }[] = [
  { name: "Maíz", family: "cereal", cycle: 4, heat: "media" },
  { name: "Arroz", family: "cereal", cycle: 4, heat: "media" },
  { name: "Sorgo", family: "cereal", cycle: 4, heat: "alta" },
  { name: "Habichuela", family: "leguminosa", cycle: 3, heat: "baja" },
  { name: "Maní", family: "leguminosa", cycle: 4, heat: "alta" },
  { name: "Guandul", family: "leguminosa", cycle: 6, heat: "alta" },
  { name: "Yuca", family: "raiz", cycle: 10, heat: "alta" },
  { name: "Batata", family: "raiz", cycle: 5, heat: "media" },
  { name: "Cacao", family: "perenne", cycle: 12, heat: "media" },
  { name: "Plátano", family: "perenne", cycle: 12, heat: "media" },
];

const INDICATORS = [
  { title: "Estrés térmico", unit: "Días al año con máxima ≥ 32 °C", source: "NASA POWER" },
  { title: "Precipitaciones", unit: "Lluvia anual en mm", source: "GPM IMERG" },
  { title: "Humedad del suelo", unit: "Índice 0–1 en la zona de raíces", source: "NASA POWER + SMAP" },
  { title: "Evaporación", unit: "Demanda de agua de la atmósfera, mm/año", source: "NASA POWER + MODIS" },
  { title: "Riesgo de heladas", unit: "Días al año con mínima ≤ 2 °C", source: "NASA POWER" },
  { title: "Lluvias extremas", unit: "Meses con lluvia sobre el percentil 90", source: "GPM IMERG" },
  { title: "Estrés de la vegetación", unit: "Meses con NDVI anómalo bajo", source: "MODIS NDVI" },
  { title: "Tendencia hídrica", unit: "Lluvia menos evaporación, mm/año", source: "NASA POWER + GRACE" },
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
  return (
    <div className="sourcesStrip" aria-label="Fuentes de datos">
      <span className="sourcesLabel">Datos de</span>
      <ul>
        {SOURCES.map((s) => (
          <li key={s.name}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}

export function MapSection({ onOpenMap }: { onOpenMap: () => void }) {
  const steps = [
    { t: "Escoge tu parcela", d: "Toca un punto del Valle del Cibao en el mapa." },
    { t: "Mira cómo ha cambiado", d: "20 años de calor, lluvia, humedad y vegetación medidos desde el espacio." },
    { t: "Compara rotaciones", d: "Tu rotación actual frente a dos alternativas, con su evidencia, beneficios y riesgos." },
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
            eyebrow="El mapa"
            title="Tu conuco, visto desde el espacio"
            lead="Una herramienta para decidir, no solo otro mapa satelital: cada punto traduce datos científicos en recomendaciones que un agricultor puede usar."
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
            <span className="tag">Valle del Cibao · República Dominicana</span>
            <span className="tag tagSoft">52 puntos de análisis</span>
          </div>
          <svg viewBox="0 0 400 230" className="mapDots" aria-hidden="true">
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="9" className={`dot v${d.v}`} />
            ))}
            <circle cx={30 + 6 * 34 + 6} cy={30 + 3 * 34} r="18" className="dotRing" />
            <circle cx={30 + 6 * 34 + 6} cy={30 + 3 * 34} r="10" className="dotActive" />
          </svg>
          <button type="button" className="cta" onClick={onOpenMap}>
            Abrir el mapa
          </button>
        </div>
      </div>
    </section>
  );
}


const GLOSSARY = [
  { term: "Evapotranspiración", def: "El agua que sale del suelo y de las plantas hacia el aire. Si sube, el cultivo necesita más riego." },
  { term: "Anomalía de humedad", def: "Cuánto más seco o más húmedo está el suelo comparado con lo normal para ese mes." },
  { term: "NDVI", def: "Un índice de verdor medido desde el satélite. Si baja fuera de temporada, la vegetación está estresada." },
  { term: "Riesgo de helada", def: "Días en que la temperatura mínima baja tanto que puede quemar hojas y flores." },
  { term: "Balance hídrico", def: "Lluvia menos evaporación. Negativo significa que la tierra pierde más agua de la que recibe." },
  { term: "Satélite vs. estación", def: "El satélite cubre todo el valle pero en cuadros de varios km; la estación en tierra mide un solo punto con más precisión. Juntos se corrigen." },
];

type Priority = "agua" | "nitrogeno" | "erosion" | "organica" | "forraje" | "mercado";

const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "agua", label: "Ahorrar agua" },
  { id: "nitrogeno", label: "Fijar nitrógeno" },
  { id: "erosion", label: "Frenar la erosión" },
  { id: "organica", label: "Materia orgánica" },
  { id: "forraje", label: "Forraje para animales" },
  { id: "mercado", label: "Venta en el mercado" },
];

type Slot = { crop: string; family: Family | "bare"; months: number };

const STRATEGIES: {
  id: string;
  name: string;
  kind: string;
  sequence: Slot[];
  serves: Priority[];
  rows: [string, string][];
}[] = [
  {
    id: "actual",
    name: "Tu rotación actual",
    kind: "Punto de partida",
    sequence: [
      { crop: "Suelo desnudo", family: "bare", months: 3 },
      { crop: "Maíz", family: "cereal", months: 4 },
      { crop: "Suelo desnudo", family: "bare", months: 1 },
      { crop: "Maíz", family: "cereal", months: 4 },
    ],
    serves: ["mercado"],
    rows: [
      ["Por qué aparece", "Es la referencia contra la que se comparan las alternativas."],
      ["Evidencia", "Meses con NDVI bajo y suelo expuesto entre cosechas (MODIS)."],
      ["Beneficios", "Cultivo conocido y con venta asegurada."],
      ["Vacíos de información", "Rendimientos reales de la parcela y uso de fertilizante."],
      ["Riesgos a revisar", "Cuatro meses sin cobertura: erosión y pérdida de nutrientes."],
    ],
  },
  {
    id: "leguminosas",
    name: "Con leguminosas",
    kind: "Alternativa",
    sequence: [
      { crop: "Batata", family: "raiz", months: 5 },
      { crop: "Maíz", family: "cereal", months: 4 },
      { crop: "Habichuela", family: "leguminosa", months: 3 },
    ],
    serves: ["nitrogeno", "organica", "erosion", "mercado"],
    rows: [
      ["Por qué aparece", "La habichuela devuelve nitrógeno que el maíz consumió."],
      ["Evidencia", "Lluvia de la temporada (GPM IMERG) y humedad del suelo (SMAP)."],
      ["Beneficios", "Menos fertilizante, suelo cubierto todo el año y corta ciclos de plagas."],
      ["Vacíos de información", "Precio local de la habichuela y disponibilidad de semilla."],
      ["Riesgos a revisar", "La habichuela tolera poco el calor: va en la época fresca y hay que vigilar la fecha."],
    ],
  },
  {
    id: "seca",
    name: "Para años secos",
    kind: "Alternativa",
    sequence: [
      { crop: "Suelo desnudo", family: "bare", months: 2 },
      { crop: "Sorgo", family: "cereal", months: 4 },
      { crop: "Guandul", family: "leguminosa", months: 6 },
    ],
    serves: ["agua", "nitrogeno", "forraje"],
    rows: [
      ["Por qué aparece", "Sorgo y guandul resisten calor y sequía mejor que el maíz."],
      ["Evidencia", "Tendencia del balance hídrico (NASA POWER, GRACE) y proyección CMIP6."],
      ["Beneficios", "Menos riego, forraje para animales y nitrógeno del guandul."],
      ["Vacíos de información", "Acceso a mercado para el sorgo en la zona."],
      ["Riesgos a revisar", "Dos meses sin cobertura antes de la siembra del sorgo."],
    ],
  },
];

const MONTHS = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function RotationSection() {
  const [picked, setPicked] = useState<Priority[]>(["agua", "nitrogeno"]);
  const toggle = (p: Priority) =>
    setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <section id="rotaciones" className="band bandCream bandSand">
      <div className="container">
        <SectionHead
          n="02"
          eyebrow="Rotaciones"
          title="Tres caminos para tu parcela, con sus razones"
          lead="Comparamos tu rotación actual con dos alternativas. Cada una dice por qué se sugiere, en qué datos se apoya, qué gana tu suelo, qué información falta y qué riesgos hay que revisar."
        />

        <div className="priorities">
          <p className="prioritiesLabel">¿Qué es lo más importante para ti?</p>
          <ul>
            {PRIORITIES.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={picked.includes(p.id) ? "isOn" : undefined}
                  aria-pressed={picked.includes(p.id)}
                  onClick={() => toggle(p.id)}
                >
                  {p.label}
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
                  <span className="strategyKind">{st.kind}</span>
                  <h3>{st.name}</h3>
                  <p className="strategySeq">{st.sequence.filter((x) => x.family !== "bare").map((x) => x.crop).join(" → ")}</p>
                </header>

                <div className="calendar" aria-label="Calendario de 12 meses">
                  <div className="calBar">
                    {st.sequence.map((slot, i) => (
                      <span
                        key={i}
                        className={`calSlot ${slot.family === "bare" ? "isBare" : `fam-${slot.family}`}`}
                        style={{ gridColumn: `span ${slot.months}` }}
                        title={`${slot.crop} · ${slot.months} meses`}
                      >
                        {slot.months >= 3 ? slot.crop : ""}
                      </span>
                    ))}
                  </div>
                  <div className="calMonths" aria-hidden="true">
                    {MONTHS.map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                  </div>
                </div>

                <p className={`match${hits ? " isHit" : ""}`}>
                  {picked.length === 0
                    ? "Escoge tus prioridades arriba"
                    : `Coincide con ${hits} de ${picked.length} prioridades`}
                </p>

                <dl className="strategyRows">
                  {st.rows.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>

        <div className="calLegend" aria-hidden="true">
          <span><i className="fam-cereal" /> Cereal</span>
          <span><i className="fam-leguminosa" /> Leguminosa</span>
          <span><i className="fam-raiz" /> Raíz</span>
          <span><i className="isBare" /> Suelo desnudo</span>
        </div>

        <p className="notice">
          <strong>Ejemplo ilustrativo.</strong> En el mapa, cada estrategia se calcula con los datos de tu punto. The Conuco
          es una herramienta de apoyo: no reemplaza tu experiencia ni la revisión de un técnico agrícola local.
        </p>
      </div>
    </section>
  );
}

export function CropsSection() {
  return (
    <section id="cultivos" className="band bandDeep bandPattern">
      <div className="container">
        <div className="headWithArt">
          <SectionHead
            n="03"
            eyebrow="Cultivos"
            title="Rotar familias protege el suelo"
            lead="Alternar cereales, leguminosas y raíces devuelve nutrientes, corta plagas y conserva el agua. Evaluamos cada cultivo según la temperatura, la lluvia y el tipo de suelo de tu parcela."
          />
          <Image
            src="/ramoncito-planta.png"
            alt="Ramoncito sentado, mostrando una plantita"
            width={566}
            height={451}
            className="sectionArt"
          />
        </div>

        <ul className="families">
          {(Object.keys(FAMILIES) as Family[]).map((f) => (
            <li key={f} className={`fam fam-${f}`}>
              <strong>{FAMILIES[f].label}</strong>
              <span>{FAMILIES[f].role}</span>
            </li>
          ))}
        </ul>

        <ul className="cropGrid">
          {CROPS.map((c) => (
            <li key={c.name} className="cropCard">
              <span className={`famTag fam-${c.family}`}>{FAMILIES[c.family].label}</span>
              <h3>{c.name}</h3>
              <dl>
                <div>
                  <dt>Ciclo</dt>
                  <dd>{c.cycle >= 12 ? "Todo el año" : `${c.cycle} meses`}</dd>
                </div>
                <div>
                  <dt>Tolera el calor</dt>
                  <dd className="meter" aria-label={`Tolerancia ${c.heat}`}>
                    {[1, 2, 3].map((n) => (
                      <i key={n} className={n <= HEAT_LEVEL[c.heat] ? "on" : undefined} />
                    ))}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <p className="fineprint">Parámetros de referencia: FAO ECOCROP y coeficientes de cultivo FAO-56.</p>
      </div>
    </section>
  );
}

export function ClimateSection() {
  return (
    <section id="clima" className="band bandCream">
      <div className="container">
        <SectionHead
          n="04"
          eyebrow="Clima futuro"
          title="Ocho señales para leer el clima de tu tierra"
          lead="Comparamos 2006–2015 con 2016–2025 para ver qué ya cambió, y usamos los modelos CMIP6 para estimar lo que viene."
        />

        <div className="scenario">
          <div>
            <span className="scenarioK">Histórico</span>
            <strong>2006–2025</strong>
          </div>
          <div>
            <span className="scenarioK">Escenario</span>
            <strong>SSP2-4.5</strong>
          </div>
          <div>
            <span className="scenarioK">Horizontes</span>
            <strong>2026–2045 · 2041–2060</strong>
          </div>
        </div>

        <ol className="indicatorGrid">
          {INDICATORS.map((ind, i) => (
            <li key={ind.title} className="indicator">
              <span className="indN">{String(i + 1).padStart(2, "0")}</span>
              <h3>{ind.title}</h3>
              <p>{ind.unit}</p>
              <span className="tag tagSoft">{ind.source}</span>
            </li>
          ))}
        </ol>

        <div className="glossary">
          <h3 className="subhead">Glosario en palabras sencillas</h3>
          <dl>
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt>{g.term}</dt>
                <dd>{g.def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

const RAMONCITO_CAN = [
  {
    icon: "🌦️",
    title: "Te dice qué hacer esta semana",
    text: "Mira el pronóstico de tu zona y te avisa si conviene regar, sembrar, abonar o esperar a que pase el aguacero.",
  },
  {
    icon: "🌱",
    title: "Qué sembrar y cuándo",
    text: "Los cultivos que mejor se dan en tu tierra, con el mes para sembrar y el mes de cosecha.",
  },
  {
    icon: "🔄",
    title: "Compara tus rotaciones",
    text: "Pone lo que siembras hoy al lado de otras opciones y te explica por qué podrían cuidar mejor tu tierra.",
  },
  {
    icon: "🛰️",
    title: "Traduce los datos de la NASA",
    text: "Calor, lluvia, humedad de la tierra y salud de las plantas, explicados en palabras sencillas.",
  },
  {
    icon: "⚠️",
    title: "Te avisa de los riesgos",
    text: "Meses de mucho calor, falta de agua, lluvias fuertes y terrenos donde la lluvia se lleva la tierra.",
  },
  {
    icon: "📅",
    title: "Piensa en los años que vienen",
    text: "Cómo cambiarán el calor y el agua en tu zona hacia 2040–2060 y qué cultivos aguantarán mejor.",
  },
];

export function RamoncitoSection() {
  return (
    <section id="ramoncito" className="band bandDeep bandPattern">
      <div className="container">
        <div className="headWithArt">
          <SectionHead
            n="05"
            eyebrow="Pregúntale a Ramoncito"
            title="Tu asistente para el conuco"
            lead="Ramoncito es una inteligencia artificial que conoce los datos de tu zona y lo que siembras. Te responde en palabras sencillas, a cualquier hora."
          />
          <Image
            src="/ramoncito-rastrillo.png"
            alt="Ramoncito con su rastrillo"
            width={462}
            height={581}
            className="sectionArt"
          />
        </div>

        <ul className="canGrid">
          {RAMONCITO_CAN.map((c) => (
            <li key={c.title}>
              <span className="canIcon" aria-hidden="true">
                {c.icon}
              </span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>

        <div className="ramoncitoRow">
          <div className="chatMock chatDemo" aria-label="Ejemplo de conversación">
            <div className="chatTop">
              <span className="rcAvatar">
                <Image src="/ia-sombrero.png" alt="" width={256} height={256} />
              </span>
              <strong>Así responde Ramoncito</strong>
            </div>
            <p className="demoMe">¿Riego esta semana? Siembro maíz cerca de Mao.</p>
            <div className="demoBot">
              <p>
                <b>Esta semana no hace falta.</b> Mañana se esperan unos 16 mm de lluvia y la tierra de tu zona guarda
                bien el agua.
              </p>
              <p>
                <b>Ojo con:</b> la parte baja de tu conuco, que se encharca. Abre canales para que el agua corra.
              </p>
            </div>
            <p className="demoNote">Ejemplo basado en una respuesta real con datos de la zona de Mao.</p>
          </div>

          <div className="ramoncitoSide">
            <h3>Para que te ayude mejor</h3>
            <ol className="steps stepsLight">
              <li>
                <span className="stepN">1</span>
                <div>
                  <h4>Entra con Google</h4>
                  <p>Es gratis. Tus datos solo los ves tú.</p>
                </div>
              </li>
              <li>
                <span className="stepN">2</span>
                <div>
                  <h4>Registra tu conuco</h4>
                  <p>Dónde está, qué siembras, qué agua tienes y qué te importa más.</p>
                </div>
              </li>
              <li>
                <span className="stepN">3</span>
                <div>
                  <h4>Pregúntale lo que quieras</h4>
                  <p>Toca el sombrero que está abajo a la derecha, en cualquier página.</p>
                </div>
              </li>
            </ol>
            <div className="formActions">
              <button type="button" className="cta" onClick={openRamoncito}>
                Habla con Ramoncito
              </button>
              <a href="/mi-conuco" className="ctaGhost">
                Registrar mi conuco
              </a>
            </div>
            <p className="ramoncitoLimits">
              <b>Lo que Ramoncito no hace:</b> no ve tu finca exacta (sus datos son de una zona de unos 11 km), no
              recomienda químicos ni dosis y no reemplaza a un técnico agrícola. Es una IA: puede equivocarse.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ChallengeSection() {
  const answers = [
    { ask: "Observaciones de la Tierra de la NASA", how: "SMAP, GPM, MODIS, NASA POWER, GRACE/GRACE-FO y CMIP6 sobre una misma rejilla del Cibao, con 20 años de historia." },
    { ask: "Al menos tres rotaciones, incluida la actual", how: "Cada una con su porqué, la evidencia, los beneficios, los vacíos de información y los riesgos." },
    { ask: "Suelo desnudo y temporadas vulnerables", how: "Calendario mes a mes que marca cuándo el suelo queda expuesto y cuándo el cultivo sufre más estrés." },
    { ask: "Prioridades del agricultor", how: "Agua, nitrógeno, erosión, materia orgánica, forraje y mercado ordenan qué alternativa conviene." },
    { ask: "Lenguaje para el agricultor", how: "Glosario sencillo y Ramoncito, un asistente que explica los datos como se habla en el conuco." },
  ];
  return (
    <section id="reto" className="band bandCream">
      <div className="container split">
        <div>
          <SectionHead
            n="06"
            eyebrow="El reto"
            title="Field Shift: Adapting Farms with NASA Data"
            lead="Los agricultores enfrentan temperaturas cambiantes, lluvias irregulares, escasez de agua, clima extremo y suelos que se agotan. El reto de NASA Space Apps Challenge 2026 es crear una herramienta de apoyo a la decisión que combine observaciones de la NASA con el suelo local, las características de los cultivos y las prioridades del agricultor para explorar rotaciones que fortalezcan el suelo."
          />
          <blockquote className="principle">
            Una herramienta que ayuda a ver patrones y posibilidades, pero que no reemplaza el criterio del agricultor ni la
            experiencia agrícola local.
          </blockquote>
          <a
            className="textLink"
            href="https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/"
            target="_blank"
            rel="noreferrer"
          >
            Ver el reto oficial ↗
          </a>
        </div>
        <div>
          <h3 className="subhead">Lo que pide el reto y cómo respondemos</h3>
          <ul className="answers">
            {answers.map((a) => (
              <li key={a.ask}>
                <span className="answerAsk">{a.ask}</span>
                <p>{a.how}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="container footerGrid">
        <div>
          <Image src="/logo-texto.png" alt="The Conuco" width={900} height={271} className="footerLogo" />
          <p>
            <a href="/privacidad" className="footerLink">
              Política de privacidad
            </a>
            <br />
            Proyecto del equipo The Conuco para NASA Space Apps Challenge 2026. Sitio independiente: no está
            afiliado ni respaldado por la NASA.
          </p>
          <Image
            src="/ramoncito-cosecha.png"
            alt="Ramoncito caminando con una caja de cosecha"
            width={626}
            height={668}
            className="footerArt"
          />
        </div>
        <div>
          <h3>Fuentes de datos</h3>
          <ul>
            {SOURCES.map((s) => (
              <li key={s.name}>
                <strong>{s.name}</strong> — {s.what}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
