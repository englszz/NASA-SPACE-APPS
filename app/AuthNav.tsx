"use client";

// Botón «Registrar mi conuco» (o «Mi conuco» si ya lo registró, con o sin cuenta) y,
// si hay sesión iniciada, «Cerrar sesión».
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { readLocalConuco } from "@/lib/conuco-local";

const configured = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function AuthNav({ showConuco = true, variant = "nav" }: { showConuco?: boolean; variant?: "nav" | "bar" }) {
  const router = useRouter();
  const { t } = useLang();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);

  useEffect(() => {
    const check = () => setHasLocal(!!readLocalConuco());
    check();
    window.addEventListener("conuco-cambio", check);
    return () => window.removeEventListener("conuco-cambio", check);
  }, []);

  useEffect(() => {
    if (!configured()) return;
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setBusy(true);
    await supabaseBrowser().auth.signOut();
    setBusy(false);
    setSignedIn(false);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      {showConuco && (
        <a href="/mi-conuco" className={`navConuco${signedIn || hasLocal ? "" : " isRegister"}`}>
          {signedIn || hasLocal ? t("Mi conuco", "My conuco") : t("Registrar mi conuco", "Register my conuco")}
        </a>
      )}
      {signedIn && (
        <button type="button" className={variant === "bar" ? "mcSignOut" : "navSignOut"} onClick={signOut} disabled={busy}>
          {busy ? t("Saliendo…", "Signing out…") : t("Cerrar sesión", "Sign out")}
        </button>
      )}
    </>
  );
}
