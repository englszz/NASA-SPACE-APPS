<p align="center">
  <img src="public/logo-hero.png" alt="The Conuco" width="420">
</p>

<p align="center">
  <b>Datos de la NASA para decidir qué sembrar, cuándo y dónde en el Cibao.</b><br>
  NASA Space Apps Challenge 2026 · Reto <i>Field Shift: Adapting Farms with NASA Data</i>
</p>

---

> **In English:** *The Conuco* is a decision-support web app for small farmers ("conucos") in the Cibao Valley,
> Dominican Republic. It combines 20 years of NASA Earth observations (POWER, GPM IMERG, MODIS, SMAP, GRACE,
> SRTM) with CMIP6 climate projections, ISRIC soil data and FAO crop parameters to show, for 52 zones of the
> valley, which crops suit each soil and climate, when to sow, how conditions have changed, what the next 14
> days and the coming decades look like, and how the farmer's current crop rotation compares with at least three
> alternatives (why, evidence, benefits, information gaps and risks). Farmers can register their plot **without an
> account** (it's stored in a cookie in their own browser) or sign in with Google, and get plain-language advice from
> **Ramoncito**, an AI assistant grounded on their zone's data that also guides first-time visitors around the site.
> Crops that aren't in the model can be typed in and Ramoncito compares them with the zone's options.
> It supports — and never replaces — farmers' judgment and local agronomists. Live site: https://theconuco.vercel.app

## ¿Qué es?

Un **conuco** es la parcela del pequeño agricultor dominicano. The Conuco traduce datos científicos de la NASA
en decisiones que cualquier agricultor puede entender: **qué sembrar, en qué mes, cómo rotar los cultivos para
cuidar la tierra y qué esperar del clima**, hoy y en los años que vienen.

Cubre **52 zonas de unos 11 km** en el Valle del Cibao: de Montecristi y Castañuelas, en la Línea Noroeste,
hasta San Francisco de Macorís y Nagua, pasando por Santiago, Mao y La Vega. Empieza en el Cibao, pero el
método y los datos de la NASA sirven para cualquier lugar: la idea es que llegue a todo el mundo.

**Web:** https://theconuco.vercel.app

## Qué hace

| Parte | Qué ofrece |
|---|---|
| **Entrada** | La **primera vez** que alguien entra, la web abre sola el mapa con la animación de un granero (sin mostrar antes la portada). El botón **«Ir al inicio»** lleva a la portada; desde la segunda visita se entra directo a ella. |
| **Mapa del Cibao** | Imagen satelital con las 52 zonas y 5 capas: agua (balance hídrico), futuro (días de mucho calor hacia 2041–2060), lluvia, tipo de tierra y riesgo de erosión. Botón **«Centrar en el Cibao»** y un aviso al alejarse hasta ver todo el país. |
| **Qué sembrar** | Los cultivos que mejor se dan en cada zona, solo con lluvia o con riego, con mes de siembra y de cosecha y el riego que necesitan. |
| **Rotaciones** | Lo que el agricultor siembra hoy frente a **3 alternativas** calculadas para su zona, con un calendario de 12 meses (cuándo queda la tierra desnuda y qué meses son difíciles) y, para cada opción: **por qué se sugiere, en qué datos se apoya, qué gana la tierra, qué falta saber y qué riesgos revisar**. Si siembra algo que no está en la lista (ají, tomate, café…), lo **escribe** y Ramoncito lo compara con las opciones de la zona. |
| **El futuro** | Pronóstico de los próximos **14 días** con un consejo práctico por día, y el clima de **2026–2045 y 2041–2060** en dos escenarios de emisiones, con qué cultivos ganan o pierden. |
| **¿Y si…?** | Simulador: cambia la lluvia (−40 % a +20 %) y la temperatura (0 a +3 °C) y mira qué cultivos aguantan. |
| **Cómo ha cambiado** | 8 indicadores (calor, lluvia, humedad del suelo, evaporación, heladas, lluvias extremas, estrés de la vegetación y agua disponible) de 2006–2015 frente a 2016–2025, marcados como **«Subió», «Bajó» o «Sin cambio claro»** según una prueba estadística, y la línea de tiempo de 20 años. |
| **Mi conuco** | Registrar el conuco (ubicación, tamaño en tareas, siembra actual, agua, equipo, mercado y prioridades) **sin crear una cuenta**: se guarda en una cookie del propio navegador. Quien quiera puede **iniciar sesión con Google** para guardarlo en su cuenta y verlo en cualquier teléfono; cada persona **solo ve su propio conuco**. Se abre con el botón **«Registrar mi conuco»**. |
| **Ramoncito (IA)** | Consejos para el conuco y un chat en todas las páginas (el sombrero de abajo a la derecha), **sin necesidad de cuenta**. Responde sobre la zona que la persona está mirando en el mapa o sobre su conuco, usa solo esos datos y avisa de sus límites. |
| **Guía de Ramoncito** | Globos cortos que explican lo que puede confundir justo cuando se toca (un punto del mapa, cada capa, las pestañas, el simulador, el cultivo «Otro»…) y, de vez en cuando, algún consejo general. Cada consejo sale una sola vez y se pueden apagar. |
| **Del Cibao al mundo** | Sección que explica que el proyecto empieza en el Cibao y que la idea es llevarlo a otras regiones. |

Todo está escrito en **palabras sencillas**, con un glosario y avisos de incertidumbre, porque el reto pide que
la herramienta sirva a agricultores con poca experiencia técnica. La web está en **inglés por defecto** y se
puede cambiar a **español** con el botón **EN | ES** (la elección se recuerda); Ramoncito responde en el idioma
elegido.

## Datos y fuentes

| Fuente | Qué aporta | Resolución / periodo |
|---|---|---|
| **NASA POWER** (reanálisis MERRA-2) | Temperatura diaria (media, máxima, mínima), humedad del suelo (GWETROOT/GWETTOP) | Celdas de 0.5° × 0.625°, 2006–2025 |
| **NASA GPM IMERG V07** | Lluvia mensual por satélite | 0.1°, 2006–2025 |
| **NASA MODIS** MOD13Q1 / MOD16A2GF | Vigor de la vegetación (NDVI) y evapotranspiración | 250 m / 500 m |
| **NASA SMAP L4** | Humedad del suelo en la zona de raíces | 9 km, desde 2015 |
| **NASA GRACE / GRACE-FO** | Agua almacenada en el subsuelo | ~300 km (mascons) |
| **NASA SRTM** | Altura y pendiente → riesgo de erosión y corrección de temperatura | 30 m (suavizado a 90 m) |
| **NASA NEX-GDDP-CMIP6** | Clima futuro: 5 modelos, escenarios SSP2-4.5 y SSP5-8.5 | 0.25°, 2026–2045 y 2041–2060 |
| **ISRIC SoilGrids 2.0** | Arena, arcilla, limo, pH y carbono orgánico (0–30 cm) | 250 m |
| **FAO ECOCROP / FAO-56** | Rangos de temperatura y lluvia de 10 cultivos y coeficientes de cultivo (Kc) | — |
| **Open-Meteo** | Pronóstico de los próximos 14 días (modelos de NOAA, ECMWF y otros) | Diario |
| **Esri World Imagery** | Imagen satelital de fondo del mapa | — |

Los datos de Google Earth Engine se procesan con los scripts de `field-shift-data/` y se convierten en un
archivo JSON por zona que la web lee directamente.

## Cómo funciona (método)

1. **Clima por zona.** Para cada zona se toman 20 años de NASA POWER. Se descartan las celdas que caen sobre
   el mar (diferencia día-noche < 7 °C), se escoge la celda vecina más parecida en distancia y altura, y la
   temperatura se corrige a la altura real de la zona (SRTM) con el gradiente estándar de −6.5 °C/km.
2. **Aptitud de cada cultivo.** Para cada mes de siembra se compara el clima del ciclo con los rangos FAO del
   cultivo (temperatura, lluvia, calor fuerte > 35 °C y heladas) y se ajusta por la textura del suelo.
   El riego necesario sale de la evapotranspiración del cultivo (Kc × ET₀, Hargreaves) menos la lluvia efectiva.
3. **Tendencias.** Cada indicador compara 2006–2015 con 2016–2025 con la prueba de Mann-Kendall y la pendiente
   de Sen; se marca como cambio real solo si p < 0.05.
4. **Futuro.** Los cambios de temperatura y lluvia de NEX-GDDP-CMIP6 se aplican al clima reciente de cada zona
   y se recalcula la aptitud.
5. **Rotaciones.** Se generan todas las secuencias de 1 a 3 cultivos que caben en 12 meses sin repetir familia,
   y se escogen tres alternativas distintas (cuidar la tierra, aprovechar la lluvia y aguantar el clima futuro).
   Las etiquetas («La mejor para el futuro», «Menos riego»…) solo aparecen si de verdad lo son.
6. **Ramoncito.** La IA recibe un resumen de la zona y del conuco (sin nombre, correo ni ubicación exacta) con
   instrucciones de usar solo esos datos, hablar claro y no recomendar químicos.

La web repite en el navegador el mismo cálculo del paso 2 (`app/agro.ts`); se comprobó que coincide con el
script en 6,215 de 6,240 casos (el resto difiere 0.01 por redondeo).

## Tecnología

- **Web:** Next.js 15 (App Router) · React 19 · TypeScript 5 · CSS propio · `next/font` (Lilita One y Nunito)
- **Mapa:** Leaflet 1.9 · imagen satelital de Esri
- **Cuentas y base de datos (opcional):** Supabase (Auth con Google OAuth + PostgreSQL con Row Level Security) · `@supabase/ssr`. Sin cuenta, el conuco se guarda en una cookie del navegador (`lib/conuco-local.ts`)
- **IA:** Groq (modelo `openai/gpt-oss-120b`), llamado solo desde el servidor
- **Pronóstico:** API de Open-Meteo
- **Datos:** Google Earth Engine (JavaScript) · Node.js (scripts `build-data.mjs` y `build-grid.mjs`) · API de NASA POWER

## Probarlo en tu computadora

Necesitas **Node.js 18 o más reciente**.

```bash
git clone https://github.com/englszz/NASA-SPACE-APPS.git
cd NASA-SPACE-APPS
npm install
npm run data        # copia los datos de field-shift-data/data a public/data
npm run dev         # abre http://localhost:3000
```

El mapa, los cultivos, las rotaciones, el pronóstico y **Mi conuco sin cuenta** funcionan sin configurar nada.
Para **Ramoncito** hace falta la clave de Groq, y para **iniciar sesión con Google**, las de Supabase. Van en `.env.local`:
los pasos están en [`CONFIGURAR.md`](CONFIGURAR.md) y el formato en [`.env.example`](.env.example).
**Nunca subas `.env.local` a GitHub.**

### Volver a generar los datos

```bash
cd field-shift-data
node build-grid.mjs   # descarga NASA POWER (se guarda en cache/) y analiza las 52 zonas
node comparar.mjs     # comprueba que los datos anteriores no cambiaron sin querer
cd .. && npm run data
```

Los CSV de entrada salen de los scripts de Google Earth Engine de esa carpeta (`gee-*.js`).
`fieldshift_grid.csv` y `fieldshift_grid_soil.csv` (los 52 puntos) salen de `gee-grid.js`, que por ahora está
en la cuenta de Earth Engine del equipo y falta agregar a esta carpeta.

## Estructura

```
app/                 Páginas y componentes de la web
  page.tsx           Decide si es la primera visita (entrada con el granero)
  HomeView.tsx       Portada y secciones
  Sections.tsx       Textos de cada sección
  BarnTransition.tsx Animación del granero que abre el mapa
  MapExplorer.tsx    Mapa y panel de cada zona
  PanelExtras.tsx    Rotaciones (con cultivo «Otro»), simulador, pronóstico y línea de tiempo
  agro.ts            Motor agrícola (aptitud FAO, rotaciones, simulador)
  RamoncitoChat.tsx  Chat flotante de la IA y globos de la guía
  guia.ts            Textos de la guía de Ramoncito
  mi-conuco/         Registro sin cuenta, inicio de sesión opcional y panel del conuco
  api/ramoncito/     Ruta del servidor que llama a Groq
lib/                 Supabase, idiomas y datos del conuco (cuenta o cookie)
supabase/schema.sql  Tabla «conucos» con reglas de privacidad (RLS)
field-shift-data/    Scripts de Earth Engine y de análisis, y los datos generados
public/              Imágenes, íconos y datos que sirve la web
```

## Privacidad y seguridad

- **Sin cuenta**, el conuco se guarda solo en una cookie del navegador del agricultor, con la ubicación
  redondeada a unos 100 m. El servidor la lee para calcular los consejos, pero no la guarda.
- **Con cuenta**, cada agricultor **solo puede ver, cambiar o borrar su propio conuco**: lo garantiza la base
  de datos con reglas RLS, no solo la web.
- La clave de la IA vive **solo en el servidor**. A la IA se le envía un resumen sin nombre, correo ni
  coordenadas exactas, y hay un límite de preguntas por persona.
- El agricultor puede **borrar su conuco** cuando quiera. Más detalles en la
  [política de privacidad](https://theconuco.vercel.app/privacidad).

## Límites (lo que hay que saber)

- Cada zona resume unos **11 km**: no describe una finca exacta.
- La **aptitud** mide si el clima y la tierra le van bien a un cultivo; **no** mide precios, mercado ni
  costumbre. Por eso el sorgo, muy resistente al calor y la sequía, suele salir primero.
- Los rangos de los cultivos son **valores aproximados** de FAO y deben validarse con técnicos locales.
- Las proyecciones climáticas son **un rango posible**, no una predicción.
- **The Conuco apoya, pero no reemplaza**, el criterio del agricultor ni a los técnicos agrícolas.

## Uso de inteligencia artificial

- **Dentro de la web:** Ramoncito usa un modelo de lenguaje vía Groq para explicar los datos, responder
  preguntas y comparar cultivos que no están en el modelo, siempre con la advertencia de que puede
  equivocarse. Los globos de la guía son textos fijos escritos por el equipo, no generados por la IA.
- **Para construir el proyecto:** el equipo usó asistentes de IA (ChatGPT y Claude) como apoyo para investigar
  las fuentes de datos y para programar; todas las decisiones, los datos y los resultados fueron revisados
  por el equipo.

## Créditos

- Datos: NASA (POWER, GPM IMERG, MODIS, SMAP, GRACE/GRACE-FO, SRTM, NEX-GDDP-CMIP6), ISRIC SoilGrids (CC BY 4.0),
  FAO, Open-Meteo (CC BY 4.0), imagen satelital © Esri, Maxar y Earthstar Geographics.
- Proyecto del equipo **The Conuco** para NASA Space Apps Challenge 2026.
  Sitio independiente: **no está afiliado ni respaldado por la NASA**.
