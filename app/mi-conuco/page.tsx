import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Conuco } from "@/lib/conuco";
import ConucoForm from "./ConucoForm";
import Dashboard from "./Dashboard";
import LoginCard from "./LoginCard";
import AuthNav from "@/app/AuthNav";
import { getLang } from "@/lib/lang-server";
import { pick } from "@/lib/lang";
import { cookies } from "next/headers";
import { CONUCO_COOKIE, parseConucoCookie } from "@/lib/conuco-local";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: (await getLang()) === "en" ? "My conuco · The Conuco" : "Mi conuco · The Conuco" };
}

function Shell({ children, t }: { children: React.ReactNode; t: (es: string, en: string) => string }) {
  return (
    <div className="mcPage">
      <header className="mcHeader">
        <Link href="/" className="brand" aria-label={t("Volver al inicio", "Back to home")}>
          <Image src="/logo-texto.png" alt="The Conuco" width={900} height={271} priority />
        </Link>
        <div className="mcBarActions">
          <Link href="/" className="mcBack">
            ← {t("Inicio", "Home")}
          </Link>
          <AuthNav showConuco={false} variant="bar" />
        </div>
      </header>
      <main className="mcMain">{children}</main>
    </div>
  );
}

export default async function MiConucoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const t = pick(await getLang());
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Lo que la persona guardó en este navegador sin iniciar sesión
  const local = parseConucoCookie((await cookies()).get(CONUCO_COOKIE)?.value);

  const supabase = configured ? await supabaseServer() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  // ---------- con sesión iniciada: los datos de la cuenta ----------
  if (supabase && user) {
    const { data: conuco } = await supabase.from("conucos").select("*").eq("user_id", user.id).maybeSingle();
    const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "";
    return (
      <Shell t={t}>
        {conuco ? (
          <Dashboard conuco={conuco as Conuco} firstName={firstName} mode="cuenta" />
        ) : (
          <section className="mcCard">
            <p className="eyebrowMini">{t("Tu cuenta", "Your account")}</p>
            <h1>
              {firstName ? t(`Hola, ${firstName}. `, `Hi, ${firstName}. `) : ""}
              {local ? t("Guarda tu conuco en tu cuenta", "Save your conuco to your account") : t("Cuéntanos sobre tu conuco", "Tell us about your conuco")}
            </h1>
            <p className="mcLead">
              {local
                ? t(
                    "Copiamos lo que habías guardado en este navegador. Revísalo y guárdalo para verlo en cualquier teléfono o computadora.",
                    "We copied what you had saved in this browser. Check it and save it to see it on any phone or computer.",
                  )
                : t(
                    "Con esto Ramoncito te da consejos para tu tierra exacta. Lo que escribas aquí solo lo ves tú.",
                    "With this, Ramoncito can give you advice for your exact land. What you write here is visible only to you.",
                  )}
            </p>
            <ConucoForm mode="cuenta" initial={local ?? undefined} />
          </section>
        )}
      </Shell>
    );
  }

  // ---------- sin sesión: el conuco se guarda en este navegador ----------
  return (
    <Shell t={t}>
      {local ? (
        <Dashboard conuco={local} firstName="" mode="local" />
      ) : (
        <section className="mcCard">
          <p className="eyebrowMini">{t("Mi conuco · sin cuenta", "My conuco · no account")}</p>
          <h1>{t("Registra tu conuco", "Register your conuco")}</h1>
          <p className="mcLead">
            {t(
              "Cuéntale a Ramoncito cómo es tu conuco y te dará consejos para tu tierra. No hace falta crear una cuenta: los datos se guardan",
              "Tell Ramoncito about your conuco (your farm) and you'll get advice for your land. You don't need an account: the details are saved",
            )}{" "}
            <b>{t("solo en este navegador", "only in this browser")}</b>.
          </p>
          <ConucoForm mode="local" />
        </section>
      )}
      {configured && <LoginCard compact failed={error === "login"} />}
    </Shell>
  );
}
