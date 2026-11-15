import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Política de privacidad · The Conuco",
  description: "Qué datos guarda The Conuco, para qué los usa, con quién los comparte y cómo borrarlos.",
};

const UPDATED = "14 de noviembre de 2026";
const REPO = "https://github.com/englszz/NASA-SPACE-APPS";

export default function PrivacidadPage() {
  return (
    <div className="mcPage">
      <header className="mcHeader">
        <Link href="/" className="brand" aria-label="Volver al inicio">
          <Image src="/logo-texto.png" alt="The Conuco" width={900} height={271} priority />
        </Link>
        <Link href="/" className="mcBack">
          ← Inicio
        </Link>
      </header>

      <main className="mcMain legal">
        <p className="eyebrowMini">Última actualización: {UPDATED}</p>
        <h1>Política de privacidad</h1>
        <p className="mcLead">
          The Conuco es un proyecto sin fines comerciales del equipo The Conuco para el NASA Space Apps Challenge
          2026. Aquí explicamos, en palabras sencillas, qué datos guardamos, para qué y cómo puedes borrarlos.
        </p>

        <h2>1. Si solo visitas la web</h2>
        <p>
          Puedes usar el mapa, los cultivos, las rotaciones y el pronóstico <b>sin crear una cuenta</b>. En ese caso
          no guardamos datos tuyos. Tu navegador sí se conecta a servicios externos para mostrar el mapa y el tiempo
          (ver punto 5), y nuestro proveedor de alojamiento puede registrar datos técnicos normales de cualquier
          visita, como la dirección IP, para que la web funcione y sea segura.
        </p>

        <h2>2. Si entras con Google</h2>
        <p>Al usar «Entrar con Google», Google nos comparte únicamente:</p>
        <ul>
          <li>tu nombre (lo usamos solo para saludarte),</li>
          <li>tu correo electrónico (identifica tu cuenta),</li>
          <li>tu foto de perfil (queda guardada con tu cuenta, pero no la mostramos ni la usamos).</li>
        </ul>
        <p>
          No recibimos tu contraseña de Google ni acceso a tu correo, tus contactos ni tus archivos.
        </p>

        <h2>3. Los datos de tu conuco</h2>
        <p>Si registras tu conuco, guardamos lo que tú escribas:</p>
        <ul>
          <li>el nombre del conuco y su ubicación en el mapa,</li>
          <li>el tamaño en tareas, lo que siembras hoy, el agua que tienes, cómo trabajas la tierra y dónde vendes,</li>
          <li>lo que es más importante para ti y las notas que quieras agregar.</li>
        </ul>
        <p>
          Lo usamos <b>solo</b> para mostrarte información y consejos sobre tu conuco. <b>Solo tú puedes verlo</b>:
          la base de datos tiene reglas que impiden que otra persona, incluso con acceso a la web, lea o cambie tu
          conuco.
        </p>

        <h2>4. Ramoncito (inteligencia artificial)</h2>
        <p>
          Para darte consejos y responder tus preguntas, enviamos a <b>Groq</b>, el servicio que ejecuta la
          inteligencia artificial, un <b>resumen</b> de tu conuco y de los datos de tu zona, junto con lo que escribes
          en el chat. Ese resumen <b>no incluye tu nombre, tu correo ni la ubicación exacta de tu conuco</b>. No
          guardamos el historial de tus conversaciones: se borra al cerrar o recargar la página.
        </p>

        <h2>5. Servicios que usamos</h2>
        <ul>
          <li>
            <b>Supabase</b>: inicio de sesión y base de datos donde se guarda tu conuco.
          </li>
          <li>
            <b>Google</b>: el botón «Entrar con Google».
          </li>
          <li>
            <b>Groq</b>: la inteligencia artificial de Ramoncito.
          </li>
          <li>
            <b>Vercel</b>: alojamiento de la web.
          </li>
          <li>
            <b>Open-Meteo</b>: el pronóstico del tiempo. Recibe las coordenadas del centro de la zona, no las de tu
            conuco.
          </li>
          <li>
            <b>Esri</b>: las imágenes satelitales del mapa, que tu navegador descarga directamente.
          </li>
        </ul>
        <p>
          Cada servicio tiene su propia política de privacidad. <b>No vendemos tus datos</b>, no mostramos publicidad
          y no los usamos para nada distinto de lo descrito aquí.
        </p>

        <h2>6. Cuánto tiempo los guardamos y cómo borrarlos</h2>
        <p>
          Guardamos los datos de tu conuco mientras tengas tu cuenta. Puedes <b>cambiarlos o borrarlos cuando
          quieras</b> desde <Link href="/mi-conuco">Mi conuco</Link> con el botón «Borrar mi conuco». Si también
          quieres que borremos tu cuenta, escríbenos (punto 8).
        </p>

        <h2>7. Límites de la información</h2>
        <p>
          Los datos y consejos de The Conuco vienen de satélites y modelos de la NASA y de otras fuentes públicas,
          describen zonas de unos 11 km y pueden equivocarse. Son una ayuda: <b>no reemplazan tu experiencia ni a
          un técnico agrícola</b>.
        </p>

        <h2>8. Contacto</h2>
        <p>
          Si tienes preguntas sobre tus datos o quieres borrar tu cuenta, escríbenos abriendo una solicitud en el{" "}
          <a href={`${REPO}/issues`} target="_blank" rel="noreferrer">
            repositorio del proyecto
          </a>
          .
        </p>

        <p className="hint">
          The Conuco es un sitio independiente: no está afiliado ni respaldado por la NASA.
        </p>
      </main>
    </div>
  );
}
