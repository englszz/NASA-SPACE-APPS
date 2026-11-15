# Configurar «Mi conuco»: Google, Supabase y Groq

Son 4 partes. Hazlas en orden. **Nunca pegues claves en el chat ni las subas a GitHub**:
van solo en el archivo `.env.local`, que git ya ignora.

---

## Parte A — Groq (la IA de Ramoncito)

1. Entra a **https://console.groq.com** y crea una cuenta (puedes usar Google).
2. Menú **API Keys** → **Create API Key** → nómbrala `the-conuco` → copia la clave (empieza por `gsk_`).
   Solo se muestra una vez: guárdala para la Parte D.
3. Menú **Docs → Models** (o https://console.groq.com/docs/models): busca un modelo de texto grande que
   esté disponible (por ejemplo `llama-3.3-70b-versatile`). Anota su nombre exacto para la Parte D.

> Plan gratuito: tiene un límite de peticiones por minuto y por día. La web ya limita a cada usuario a
> 20 preguntas cada 10 minutos para no gastarlo.

---

## Parte B — Supabase (cuentas y base de datos privada)

1. Entra a **https://supabase.com** → **New project**.
   - Nombre: `the-conuco`
   - Contraseña de la base de datos: una fuerte; guárdala en un lugar seguro.
   - Región: **East US** (la más cercana a República Dominicana).
2. Cuando termine de crearse: menú **SQL Editor** → **New query** → pega TODO el contenido de
   `supabase/schema.sql` → **Run**. Debe decir *Success*.
   Esto crea la tabla `conucos` con la regla de que **cada persona solo ve su propio conuco**.
3. Copia estos dos valores (Supabase cambió los nombres; estos son los actuales):
   - **La URL del proyecto:** **Project Settings → Data API → API URL**.
     Tiene la forma `https://xxxxxxxx.supabase.co`. («Project URL» y «API URL» son lo mismo.)
   - **La clave pública:** **Project Settings → API Keys → Publishable key**
     (empieza por `sb_publishable_…`; reemplaza a la antigua clave «anon»). Usa la que ya existe
     (la marcada *default*); no hace falta crear otra.
   - ⚠️ **NO uses la Secret key** (`sb_secret_…`): salta todas las reglas de privacidad y esta web no
     la necesita. No la copies a ningún archivo.

---

## Parte C — Google (el botón «Entrar con Google»)

1. Entra a **https://console.cloud.google.com** → arriba, **Seleccionar proyecto → Proyecto nuevo** →
   nombre `The Conuco` → Crear.
2. Menú **APIs y servicios → Pantalla de consentimiento de OAuth** (en la versión nueva se llama
   **Google Auth Platform → Branding / Audience**):
   - Nombre de la app: `The Conuco`, correo de asistencia: el tuyo.
   - Público: **Externo**.
   - Mientras esté en modo *Prueba*, agrega en **Usuarios de prueba** los correos de Google que van a
     probar (el tuyo y los de tu equipo).
3. Menú **Credenciales → Crear credenciales → ID de cliente de OAuth** (o **Clients → Create client**):
   - Tipo: **Aplicación web**.
   - **Orígenes de JavaScript autorizados:** `http://localhost:3000`
   - **URI de redireccionamiento autorizados:** `https://TU-PROYECTO.supabase.co/auth/v1/callback`
     (cópiala exacta de Supabase → **Authentication → Sign In / Providers → Google**, donde dice
     *Callback URL*).
   - Crear → copia el **ID de cliente** y el **Secreto del cliente**.
4. De vuelta en Supabase → **Authentication → Sign In / Providers → Google** → actívalo → pega el
   *Client ID* y el *Client Secret* → **Save**.
5. Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** agrega `http://localhost:3000/auth/callback`

> Cuando publiquemos la web en internet (por ejemplo en Vercel), habrá que agregar también esa
> dirección en los pasos C3 y C5.

---

## Parte D — El archivo `.env.local`

En la carpeta del proyecto:

```bash
cp .env.example .env.local
```

Abre `.env.local` y reemplaza los valores:

```
NEXT_PUBLIC_SUPABASE_URL=   ← API URL, https://xxxx.supabase.co (Parte B3)
NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← Publishable key, sb_publishable_… (Parte B3)
GROQ_API_KEY=   ← clave gsk_... (Parte A2)
GROQ_MODEL=   ← nombre del modelo (Parte A3)
```

Reinicia el servidor (`Ctrl+C` y luego `npm run dev`) y entra a **http://localhost:3000/mi-conuco**.

---

## ¿Qué hacer si algo falla?

| Mensaje | Causa probable |
|---|---|
| «Falta configurar el inicio de sesión» | Faltan las variables de Supabase o no reiniciaste el servidor |
| Google dice *redirect_uri_mismatch* | La URI de la Parte C3 no es exactamente la de Supabase |
| Google dice que la app no está verificada / acceso bloqueado | Tu correo no está en *Usuarios de prueba* (Parte C2) |
| «No se pudo guardar» | No corriste `supabase/schema.sql` (Parte B2) |
| «El modelo … no está disponible en Groq» | Cambia `GROQ_MODEL` por uno de la lista de modelos de Groq |
| «La clave de Groq no es válida» | Revisa `GROQ_API_KEY` |
