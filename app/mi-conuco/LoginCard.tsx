"use client";

import Image from "next/image";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

// compact: la versión secundaria que va debajo de «Mi conuco» sin cuenta
export default function LoginCard({ failed, compact }: { failed?: boolean; compact?: boolean }) {
  const { lang, t } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    failed ? t("No se pudo entrar con Google. Inténtalo otra vez.", "Couldn't sign in with Google. Please try again.") : "",
  );

  const login = async () => {
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(false);
      setError(t("No se pudo conectar con Google. Inténtalo otra vez.", "Couldn't connect to Google. Please try again."));
    }
  };

  const googleBtn = (
    <button type="button" className="googleBtn" onClick={login} disabled={busy}>
      <svg viewBox="0 0 48 48" aria-hidden="true" width="20" height="20">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
      </svg>
      {busy ? t("Abriendo Google…", "Opening Google…") : t("Entrar con Google", "Sign in with Google")}
    </button>
  );

  if (compact)
    return (
      <section className="mcCard mcLoginSmall">
        <div>
          <h2>{t("Inicia sesión para una experiencia más personalizada", "Sign in for a more personalized experience")}</h2>
          <p className="hint">
            {t(
              "Es opcional. Con tu cuenta de Google, tu conuco queda guardado en tu cuenta y lo ves en cualquier teléfono o computadora. Sin cuenta, se guarda solo en este navegador.",
              "It's optional. With your Google account, your conuco is saved to your account and you can see it on any phone or computer. Without an account, it's saved only in this browser.",
            )}{" "}
            <a href="/privacidad">{t("Política de privacidad", "Privacy policy")}</a>.
          </p>
          {error && <p className="mcError">{error}</p>}
        </div>
        {googleBtn}
      </section>
    );

  return (
    <section className="mcCard mcLogin">
      <Image src="/ramoncito-ok.png" alt="" width={489} height={624} className="mcLoginArt" />
      <div>
        <p className="eyebrowMini">{t("Mi conuco", "My conuco")}</p>
        <h1>{t("Tu tierra, tus datos, tus consejos", "Your land, your data, your advice")}</h1>
        <p className="mcLead">
          {t(
            "Registra tu conuco una sola vez y cada día verás el tiempo, qué sembrar y los consejos de Ramoncito para tu tierra.",
            "Register your conuco (your farm) once, and every day you'll see the weather, what to plant and Ramoncito's advice for your land.",
          )}
        </p>
        {googleBtn}
        {error && <p className="mcError">{error}</p>}
        <p className="hint">
          {lang === "en" ? (
            <>
              We only use your name to greet you. Only you can see your conuco's data; to give you advice, Ramoncito sends
              the AI (Groq) a summary of your conuco <b>without your name, email or exact location</b>.
            </>
          ) : (
            <>
              Solo usamos tu nombre para saludarte. Los datos de tu conuco solo los ves tú; para darte consejos, Ramoncito
              envía a la IA (Groq) un resumen de tu conuco <b>sin tu nombre, tu correo ni tu ubicación exacta</b>.
            </>
          )}{" "}
          <a href="/privacidad">{t("Política de privacidad", "Privacy policy")}</a>.
        </p>
      </div>
    </section>
  );
}
