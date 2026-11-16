import Image from "next/image";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";

export async function generateMetadata() {
  return (await getLang()) === "en"
    ? {
        title: "Privacy policy · The Conuco",
        description: "What data The Conuco keeps, what it's used for, who it's shared with and how to delete it.",
      }
    : {
        title: "Política de privacidad · The Conuco",
        description: "Qué datos guarda The Conuco, para qué los usa, con quién los comparte y cómo borrarlos.",
      };
}

const UPDATED = { es: "15 de noviembre de 2026", en: "November 15, 2026" };
const REPO = "https://github.com/englszz/NASA-SPACE-APPS";

export default async function PrivacidadPage() {
  const en = (await getLang()) === "en";
  return (
    <div className="mcPage">
      <header className="mcHeader">
        <Link href="/" className="brand" aria-label={en ? "Back to home" : "Volver al inicio"}>
          <Image src="/logo-texto.png" alt="The Conuco" width={900} height={271} priority />
        </Link>
        <div className="mcBarActions">
          <Link href="/" className="mcBack">
            ← {en ? "Home" : "Inicio"}
          </Link>
        </div>
      </header>

      {en ? <PrivacyEn /> : <PrivacyEs />}
    </div>
  );
}

function PrivacyEs() {
  return (
      <main className="mcMain legal">
        <p className="eyebrowMini">Última actualización: {UPDATED.es}</p>
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

        <p>
          Si nos dejas <b>tu opinión</b> al final de la portada, guardamos lo que escribes, quién dices ser (por
          ejemplo, agricultor) y la calificación, <b>sin tu nombre, tu correo ni tu dirección IP</b>. Solo el equipo
          puede leerlas. Por eso te pedimos que no escribas datos personales en el comentario.
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
        <p>Si registras tu conuco, se guarda lo que tú escribas:</p>
        <ul>
          <li>el nombre del conuco y su ubicación en el mapa,</li>
          <li>el tamaño en tareas, lo que siembras hoy, el agua que tienes, cómo trabajas la tierra y dónde vendes,</li>
          <li>lo que es más importante para ti y las notas que quieras agregar.</li>
        </ul>
        <p>
          Lo usamos <b>solo</b> para mostrarte información y consejos sobre tu conuco. Dónde se guarda depende de ti:
        </p>
        <ul>
          <li>
            <b>Sin cuenta</b> (la opción de siempre): se guarda en una <b>cookie de tu propio navegador</b>, con la
            ubicación redondeada a unos 100 metros. No queda en nuestra base de datos: tu navegador la envía a
            nuestro servidor solo cuando le pides algo a Ramoncito, para calcular la zona y los consejos. Si borras
            las cookies o usas otro teléfono, no estará.
          </li>
          <li>
            <b>Con tu cuenta de Google</b>: se guarda en nuestra base de datos y <b>solo tú puedes verlo</b>. La base
            de datos tiene reglas que impiden que otra persona, incluso con acceso a la web, lea o cambie tu conuco.
          </li>
        </ul>
        <p>
          La web también guarda en tu navegador algunas preferencias pequeñas: el idioma, si ya la visitaste y qué
          consejos de Ramoncito ya viste.
        </p>

        <h2>4. Ramoncito (inteligencia artificial)</h2>
        <p>
          Para darte consejos y responder tus preguntas, enviamos a <b>Groq</b>, el servicio que ejecuta la
          inteligencia artificial, un <b>resumen</b> de tu conuco y de los datos de tu zona, junto con lo que escribes
          en el chat. Ese resumen <b>no incluye tu nombre, tu correo ni la ubicación exacta de tu conuco</b>. No
          guardamos el historial de tus conversaciones: se borra al cerrar o recargar la página. Si estás mirando una
          zona del mapa, también se usan los datos de esa zona.
        </p>
        <p>
          Si usas <b>«Llamar a Ramoncito»</b>, la web te pide permiso para usar el micrófono. Solo graba mientras dura
          la llamada y mientras tú hablas; cada frase se envía a Groq para convertirla en texto (con el modelo Whisper)
          y <b>no guardamos el audio</b>. La respuesta la lee en voz alta tu propio teléfono o computadora. Si tu
          aparato no tiene voz, la web descarga una sola vez un modelo de voz abierto (Piper, desde HuggingFace) que
          funciona dentro de tu navegador: el texto de la respuesta no sale de tu aparato para eso. Puedes silenciar el
          micrófono o colgar cuando quieras.
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
          Sin cuenta, la cookie dura un año en tu navegador. Con cuenta, guardamos los datos de tu conuco mientras
          tengas tu cuenta. En los dos casos puedes <b>cambiarlos o borrarlos cuando quieras</b> desde{" "}
          <Link href="/mi-conuco">Mi conuco</Link> con el botón «Borrar mi conuco». Si también
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
  );
}

function PrivacyEn() {
  return (
      <main className="mcMain legal">
        <p className="eyebrowMini">Last updated: {UPDATED.en}</p>
        <h1>Privacy policy</h1>
        <p className="mcLead">
          The Conuco is a non-commercial project by The Conuco team for the NASA Space Apps Challenge 2026. Here we
          explain, in plain words, what data we keep, why, and how you can delete it.
        </p>

        <h2>1. If you only visit the site</h2>
        <p>
          You can use the map, crops, rotations and forecast <b>without creating an account</b>. In that case we don&apos;t
          keep any of your data. Your browser does connect to outside services to show the map and the weather (see
          section 5), and our hosting provider may log normal technical data from any visit, such as your IP address,
          so the site works and stays secure.
        </p>

        <p>
          If you leave <b>feedback</b> at the bottom of the home page, we keep what you write, who you say you are (for
          example, a farmer) and your rating, <b>without your name, email or IP address</b>. Only the team can read it.
          That&apos;s why we ask you not to include personal details in your comment.
        </p>

        <h2>2. If you sign in with Google</h2>
        <p>When you use “Sign in with Google”, Google shares only:</p>
        <ul>
          <li>your name (we only use it to greet you),</li>
          <li>your email address (it identifies your account),</li>
          <li>your profile photo (it&apos;s stored with your account, but we don&apos;t show or use it).</li>
        </ul>
        <p>We never receive your Google password or access to your email, contacts or files.</p>

        <h2>3. Your conuco&apos;s data</h2>
        <p>If you register your conuco (your farm), what you write is saved:</p>
        <ul>
          <li>the conuco&apos;s name and its location on the map,</li>
          <li>its size in tareas, what you grow today, the water you have, how you work the land and where you sell,</li>
          <li>what matters most to you and any notes you add.</li>
        </ul>
        <p>
          We use it <b>only</b> to show you information and advice about your conuco. Where it&apos;s saved is up to you:
        </p>
        <ul>
          <li>
            <b>Without an account</b> (the default): it&apos;s saved in a <b>cookie in your own browser</b>, with the
            location rounded to about 100 meters. It isn&apos;t kept in our database: your browser sends it to our server
            only when you ask Ramoncito something, to work out your area and the advice. If you clear your cookies or
            use another phone, it won&apos;t be there.
          </li>
          <li>
            <b>With your Google account</b>: it&apos;s saved in our database and <b>only you can see it</b>. The database
            has rules that stop anyone else, even with access to the site, from reading or changing your conuco.
          </li>
        </ul>
        <p>
          The site also keeps a few small preferences in your browser: the language, whether you&apos;ve visited before
          and which of Ramoncito&apos;s tips you&apos;ve already seen.
        </p>

        <h2>4. Ramoncito (artificial intelligence)</h2>
        <p>
          To give you advice and answer your questions, we send <b>Groq</b>, the service that runs the artificial
          intelligence, a <b>summary</b> of your conuco and your area&apos;s data, along with what you type in the chat. That
          summary <b>does not include your name, your email or your conuco&apos;s exact location</b>. We don&apos;t keep your
          chat history: it&apos;s erased when you close or reload the page. If you&apos;re looking at an area on the map, that
          area&apos;s data is used too.
        </p>
        <p>
          If you use <b>“Call Ramoncito”</b>, the site asks for permission to use your microphone. It only records during
          the call and while you speak; each sentence is sent to Groq to turn it into text (with the Whisper model) and{" "}
          <b>we don&apos;t keep the audio</b>. Your own phone or computer reads the answer aloud. If your device has no voice, the
          site downloads, just once, an open voice model (Piper, from HuggingFace) that runs inside your browser: the answer&apos;s
          text doesn&apos;t leave your device for that. You can mute the microphone or hang up at any time.
        </p>

        <h2>5. Services we use</h2>
        <ul>
          <li>
            <b>Supabase</b>: sign-in and the database where your conuco is stored.
          </li>
          <li>
            <b>Google</b>: the “Sign in with Google” button.
          </li>
          <li>
            <b>Groq</b>: Ramoncito&apos;s artificial intelligence.
          </li>
          <li>
            <b>Vercel</b>: website hosting.
          </li>
          <li>
            <b>Open-Meteo</b>: the weather forecast. It receives the coordinates of the center of the area, not those of
            your conuco.
          </li>
          <li>
            <b>Esri</b>: the map&apos;s satellite imagery, which your browser downloads directly.
          </li>
        </ul>
        <p>
          Each service has its own privacy policy. <b>We don&apos;t sell your data</b>, we don&apos;t show ads, and we don&apos;t use
          it for anything other than what&apos;s described here.
        </p>

        <h2>6. How long we keep it and how to delete it</h2>
        <p>
          Without an account, the cookie lasts one year in your browser. With an account, we keep your conuco&apos;s data
          for as long as you have your account. Either way, you can <b>change or delete it at any time</b> from{" "}
          <Link href="/mi-conuco">My conuco</Link> with the “Delete my conuco” button. If you also want us
          to delete your account, contact us (section 8).
        </p>

        <h2>7. Limits of the information</h2>
        <p>
          The Conuco&apos;s data and advice come from NASA satellites and models and other public sources, describe areas
          of about 11 km and may be wrong. They&apos;re a helping hand: <b>they don&apos;t replace your experience or an
          agronomist</b>.
        </p>

        <h2>8. Contact</h2>
        <p>
          If you have questions about your data or want your account deleted, contact us by opening a request in the{" "}
          <a href={`${REPO}/issues`} target="_blank" rel="noreferrer">
            project repository
          </a>
          .
        </p>

        <p className="hint">The Conuco is an independent site: it is not affiliated with or endorsed by NASA.</p>
      </main>
  );
}
