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

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return (
      <Shell t={t}>
        <section className="mcCard">
          <h1>{t("Falta configurar el inicio de sesión", "Sign-in isn't set up yet")}</h1>
          <p>
            {t("Agrega", "Add")} <code>NEXT_PUBLIC_SUPABASE_URL</code> {t("y", "and")} <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            {t("en", "to")} <code>.env.local</code> {t("y reinicia el servidor. Los pasos están en", "and restart the server. The steps are in")}{" "}
            <code>CONFIGURAR.md</code>.
          </p>
        </section>
      </Shell>
    );

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return (
      <Shell t={t}>
        <LoginCard failed={error === "login"} />
      </Shell>
    );

  const { data: conuco } = await supabase.from("conucos").select("*").eq("user_id", user.id).maybeSingle();
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "";

  return (
    <Shell t={t}>
      {conuco ? (
        <Dashboard conuco={conuco as Conuco} firstName={firstName} />
      ) : (
        <section className="mcCard">
          <p className="eyebrowMini">{t("Paso 1 de 1", "Step 1 of 1")}</p>
          <h1>
            {firstName ? t(`Hola, ${firstName}. `, `Hi, ${firstName}. `) : ""}
            {t("Cuéntanos sobre tu conuco", "Tell us about your conuco")}
          </h1>
          <p className="mcLead">
            {t(
              "Con esto Ramoncito te da consejos para tu tierra exacta. Lo que escribas aquí",
              "With this, Ramoncito can give you advice for your exact land. What you write here",
            )}{" "}
            <b>{t("solo lo ves tú", "is visible only to you")}</b>.
          </p>
          <ConucoForm />
        </section>
      )}
    </Shell>
  );
}
