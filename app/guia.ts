// Ramoncito como guía: consejos cortos que salen en el globo del sombrero.
// - guide("punto") se llama al tocar algo que puede costar entender (un punto del mapa,
//   una capa, una pestaña…). Cada consejo sale UNA vez por persona.
// - Además, cada cierto tiempo sale un consejo general (pocos por visita, para no molestar).
// - askRamoncito("pregunta") abre el chat y le manda esa pregunta a la IA.
// Quien muestra los globos y decide cuándo es app/RamoncitoChat.tsx.

type L = { es: string; en: string };

export const TIPS = {
  hola: {
    es: "¡Hola! Mi nombre es Ramoncito y soy tu asistente virtual. Te iré dando consejos mientras recorres la página. ¡Consulta cualquier duda!",
    en: "Hi! My name is Ramoncito and I'm your virtual assistant. I'll give you tips as you explore. Ask me anything!",
  },
  mapa: {
    es: "Este es el mapa del Cibao. Cada círculo es una zona de unos 11 km. Toca el que esté más cerca de tu conuco.",
    en: "This is the Cibao map. Each circle is an area of about 11 km. Tap the one closest to your conuco (farm).",
  },
  "capa-agua": {
    es: "«Agua» compara la lluvia con lo que se evapora. Si el círculo es marrón, a esa zona le falta agua casi todo el año.",
    en: "«Water» compares rainfall with what evaporates. A brown circle means that area is short of water most of the year.",
  },
  "capa-futuro": {
    es: "«Futuro» muestra cuántos días de mucho calor (más de 32 °C) tendría cada zona hacia 2041–2060.",
    en: "«Future» shows how many very hot days (over 32 °C) each area would have by 2041–2060.",
  },
  "capa-lluvia": {
    es: "«Lluvia» es cuánta agua cae en un año, medida por satélite. Más oscuro, más lluvia.",
    en: "«Rain» is how much water falls in a year, measured by satellite. Darker means more rain.",
  },
  "capa-suelo": {
    es: "«Tierra» es el tipo de suelo: el arcilloso guarda mucha agua y el arenoso la pierde rápido.",
    en: "«Soil» is the soil type: clay holds a lot of water and sandy soil loses it quickly.",
  },
  "capa-erosion": {
    es: "«Erosión» marca dónde el terreno tiene más pendiente y la lluvia se puede llevar la tierra.",
    en: "«Erosion» shows where the land is steeper and rain can wash the soil away.",
  },
  punto: {
    es: "Esta es la zona que tocaste. Arriba ves su tierra, su agua y su erosión. Abajo, en las pestañas, qué sembrar y cuándo.",
    en: "This is the area you tapped. At the top you see its soil, water and erosion. Below, in the tabs, what to plant and when.",
  },
  "tab-rotaciones": {
    es: "Escoge lo que siembras hoy y te muestro otras rotaciones para esa zona. Si tu cultivo no está en la lista, elige «Otro» y escríbelo.",
    en: "Choose what you grow today and I'll show you other rotations for that area. If your crop isn't listed, pick «Other» and type it.",
  },
  "tab-futuro": {
    es: "Aquí ves el tiempo de los próximos días y, en «Años que vienen», cómo cambiaría el clima de esta zona.",
    en: "Here you see the weather for the next days and, under «Years ahead», how this area's climate could change.",
  },
  "tab-pasado": {
    es: "Esto es lo que ya cambió: compara 2006–2015 con 2016–2025, medido por satélites de la NASA.",
    en: "This is what has already changed: it compares 2006–2015 with 2016–2025, measured by NASA satellites.",
  },
  otro: {
    es: "Escribe lo que siembras y toca «Pregúntale a Ramoncito». Lo comparo con las rotaciones de esta zona.",
    en: "Type what you grow and tap «Ask Ramoncito». I'll compare it with this area's rotations.",
  },
  simulador: {
    es: "Mueve las barras para imaginar más calor o menos lluvia y mira qué cultivos aguantarían.",
    en: "Move the sliders to imagine more heat or less rain and see which crops would hold up.",
  },
  lejos: {
    es: "Por ahora solo cubrimos el Valle del Cibao. Toca «Centrar en el Cibao» para volver.",
    en: "For now we only cover the Cibao Valley. Tap «Center on the Cibao» to go back.",
  },
  registro: {
    es: "No necesitas cuenta: tus datos se guardan solo en este teléfono o computadora. Con ellos te doy consejos para tu tierra.",
    en: "You don't need an account: your details are saved only on this phone or computer. I use them to give advice for your land.",
  },
  ubicacion: {
    es: "Toca el mapa donde está tu conuco. No tiene que ser exacto: uso la zona de datos más cercana.",
    en: "Tap the map where your conuco is. It doesn't have to be exact: I use the closest data area.",
  },
  "mi-conuco": {
    es: "Estos consejos salen del tiempo de esta semana y de lo que me contaste. Si quieres, pregúntame lo que sea.",
    en: "This advice comes from this week's weather and what you told me. Feel free to ask me anything.",
  },
  // ---- consejos generales que salen cada cierto tiempo ----
  "g-mapa": {
    es: "¿Ya abriste el mapa? Ahí ves qué sembrar en cada zona del Cibao.",
    en: "Have you opened the map yet? It shows what to plant in each area of the Cibao.",
  },
  "g-registro": {
    es: "Si registras tu conuco (sin cuenta), te doy consejos para tu tierra y el tiempo de tu zona.",
    en: "If you register your conuco (no account needed), I'll give advice for your land and your area's weather.",
  },
  "g-preguntar": {
    es: "Puedes preguntarme cosas como «¿qué siembro el mes que viene?» o «¿riego esta semana?».",
    en: "You can ask me things like «what should I plant next month?» or «should I water this week?».",
  },
  "g-capas": {
    es: "Arriba del mapa puedes cambiar lo que pintan los círculos: agua, futuro, lluvia, tierra o erosión.",
    en: "Above the map you can change what the circles show: water, future, rain, soil or erosion.",
  },
  "g-otro": {
    es: "¿Siembras algo que no sale en la lista? En «Rotaciones» elige «Otro», escríbelo y yo te ayudo.",
    en: "Do you grow something that's not on the list? In «Rotations» pick «Other», type it and I'll help.",
  },
} satisfies Record<string, L>;

export type TipId = keyof typeof TIPS;

/** Consejos generales: los de la página principal y los del mapa */
export const GENERAL_TIPS: { home: TipId[]; map: TipId[] } = {
  home: ["g-mapa", "g-registro", "g-preguntar"],
  map: ["g-capas", "g-otro", "g-registro", "g-preguntar"],
};

/** Consejos que solo tienen sentido con el mapa abierto */
export const MAP_TIPS = new Set<TipId>(["mapa", "capa-agua", "capa-futuro", "capa-lluvia", "capa-suelo", "capa-erosion", "punto", "tab-rotaciones", "tab-futuro", "tab-pasado", "simulador", "lejos", "g-capas"]);

export const guide = (id: TipId) => window.dispatchEvent(new CustomEvent("ramoncito-guia", { detail: id }));

export const askRamoncito = (question: string, zoneId?: string) =>
  window.dispatchEvent(new CustomEvent("preguntar-ramoncito", { detail: { question, zoneId } }));
