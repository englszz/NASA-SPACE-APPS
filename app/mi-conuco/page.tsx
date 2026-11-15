import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Conuco } from "@/lib/conuco";
import ConucoForm from "./ConucoForm";
import Dashboard from "./Dashboard";
import LoginCard from "./LoginCard";
import AuthNav from "@/app/AuthNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi conuco · The Conuco" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mcPage">
      <header className="mcHeader">
        <Link href="/" className="brand" aria-label="Volver al inicio">
          <Image src="/logo-texto.png" alt="The Conuco" width={900} height={271} priority />
        </Link>
        <div className="mcBarActions">
          <Link href="/" className="mcBack">
            ← Inicio
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

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return (
      <Shell>
        <section className="mcCard">
          <h1>Falta configurar el inicio de sesión</h1>
          <p>
            Agrega <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{" "}
            <code>.env.local</code> y reinicia el servidor. Los pasos están en <code>CONFIGURAR.md</code>.
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
      <Shell>
        <LoginCard failed={error === "login"} />
      </Shell>
    );

  const { data: conuco } = await supabase.from("conucos").select("*").eq("user_id", user.id).maybeSingle();
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "";

  return (
    <Shell>
      {conuco ? (
        <Dashboard conuco={conuco as Conuco} firstName={firstName} />
      ) : (
        <section className="mcCard">
          <p className="eyebrowMini">Paso 1 de 1</p>
          <h1>{firstName ? `Hola, ${firstName}. ` : ""}Cuéntanos sobre tu conuco</h1>
          <p className="mcLead">
            Con esto Ramoncito te da consejos para tu tierra exacta. Lo que escribas aquí <b>solo lo ves tú</b>.
          </p>
          <ConucoForm />
        </section>
      )}
    </Shell>
  );
}
