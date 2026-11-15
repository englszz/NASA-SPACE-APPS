"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Model } from "@/app/agro";
import { ForecastDays, RotationsTab } from "@/app/PanelExtras";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AGUA, MAX_ZONE_KM, nearestZone, type Conuco, type ZonePoint } from "@/lib/conuco";
import ConucoForm from "./ConucoForm";
import RichText from "@/app/RichText";
import { openRamoncito } from "@/app/RamoncitoChat";
import { useLang } from "@/lib/i18n";
import { zoneName } from "@/lib/lang";

async function ask(body: object, fallback: string): Promise<string> {
  const r = await fetch("/api/ramoncito", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || fallback);
  return j.reply as string;
}

export default function Dashboard({ conuco, firstName }: { conuco: Conuco; firstName: string }) {
  const { lang, t } = useLang();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [zone, setZone] = useState<(ZonePoint & { km: number }) | null>(null);
  const [model, setModel] = useState<Model | null>(null);

  // Zona de datos más cercana y su modelo
  useEffect(() => {
    let alive = true;
    (async () => {
      const points: ZonePoint[] = await (await fetch("/data/points.json")).json();
      const { zone, km } = nearestZone(points, conuco.lat, conuco.lon);
      if (!alive) return;
      setZone({ ...zone, km });
      const d = await (await fetch(`/data/points/${zone.id}.json`)).json();
      if (alive) setModel(d.model ?? null);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [conuco.lat, conuco.lon]);

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.refresh();
  };

  const remove = async () => {
    if (!confirm(t("¿Borrar tu conuco y todos sus datos? Esto no se puede deshacer.", "Delete your conuco and all its data? This can't be undone.")))
      return;
    await supabaseBrowser().from("conucos").delete().eq("user_id", conuco.user_id!);
    router.refresh();
  };

  if (editing)
    return (
      <section className="mcCard">
        <h1>{t("Cambiar los datos de tu conuco", "Edit your conuco details")}</h1>
        <ConucoForm initial={conuco} onDone={() => setEditing(false)} />
      </section>
    );

  const water = t(AGUA[conuco.agua].es, AGUA[conuco.agua].en).toLowerCase();

  return (
    <div className="mcDash">
      <section className="mcHello">
        <div>
          <p className="eyebrowMini">{t("Mi conuco", "My conuco")}</p>
          <h1>{conuco.nombre}</h1>
          <p className="mcLead">
            {firstName ? `${firstName}, ` : ""}
            {zone ? (
              zone.km <= MAX_ZONE_KM ? (
                <>
                  {t("tus datos vienen de la zona", "your data comes from the area")} <b>{zoneName(lang, zone.name)}</b>
                </>
              ) : (
                <>
                  {t(
                    "tu conuco está fuera del área que analizamos: toma los consejos con cuidado",
                    "your conuco is outside the area we analyze: take the advice with care",
                  )}
                </>
              )
            ) : (
              t("buscando la zona de tus datos…", "finding your data area…")
            )}
            {conuco.tareas ? t(` · ${conuco.tareas} tareas`, ` · ${conuco.tareas} tareas (≈ ${Math.round(conuco.tareas * 629)} m²)`) : ""} · {water}
          </p>
        </div>
        <div className="mcHelloActions">
          <button type="button" className="fcMore" onClick={() => setEditing(true)}>
            {t("Cambiar datos", "Edit details")}
          </button>
          <button type="button" className="fcMore" onClick={signOut}>
            {t("Cerrar sesión", "Sign out")}
          </button>
        </div>
      </section>

      <div className="mcGrid">
        <section className="mcCard">
          <h2>{t("El tiempo esta semana", "This week's weather")}</h2>
          {zone ? <ForecastDays lat={zone.lat} lon={zone.lon} /> : <p className="hint">{t("Cargando…", "Loading…")}</p>}
        </section>

        <Advice />
      </div>

      <section className="mcCard">
        <h2>{t("Tus rotaciones", "Your rotations")}</h2>
        <p className="mcLead">
          {t("Lo que siembras hoy, frente a otras opciones calculadas para tu zona.", "What you grow today, compared with other options calculated for your area.")}
        </p>
        {model ? (
          <RotationsTab model={model} initialPreset={conuco.siembra_actual} />
        ) : (
          <p className="hint">{t("Cargando…", "Loading…")}</p>
        )}
      </section>

      <section className="mcPrivacy">
        {lang === "en" ? (
          <p>
            <b>Your data is yours.</b> Only you can see your conuco. To give you advice, Ramoncito sends the AI (Groq) a
            summary of your conuco and your area, without your name, email or exact location.
          </p>
        ) : (
          <p>
            <b>Tus datos son tuyos.</b> Solo tú puedes ver tu conuco. Para darte consejos, Ramoncito envía a la IA (Groq)
            un resumen de tu conuco y de tu zona, sin tu nombre, tu correo ni tu ubicación exacta.
          </p>
        )}
        <button type="button" className="linkDanger" onClick={remove}>
          {t("Borrar mi conuco", "Delete my conuco")}
        </button>
      </section>
    </div>
  );
}

// ---------- Consejos de Ramoncito (IA) ----------
function Advice() {
  const { lang, t } = useLang();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setText(await ask({ mode: "consejos", lang }, lang === "en" ? "Ramoncito couldn't answer right now." : "Ramoncito no pudo responder ahora."));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }, [lang]);
  // Se piden al abrir y otra vez si cambia el idioma
  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mcCard mcAdvice">
      <div className="mcAdviceHead">
        <span className="rcAvatar rcAvatarLg">
          <Image src="/ia-sombrero.png" alt="" width={256} height={256} />
        </span>
        <div>
          <h2>{t("Consejos de Ramoncito", "Ramoncito's advice")}</h2>
          <p className="hint">{t("Con el tiempo de esta semana, tu tierra y lo que te importa.", "Based on this week's weather, your soil and what matters to you.")}</p>
        </div>
      </div>
      {busy && <p className="hint">{t("Ramoncito está pensando…", "Ramoncito is thinking…")}</p>}
      {error && <p className="mcError">{error}</p>}
      {text && !busy && (
        <div className="aiText">
          <RichText text={text} />
        </div>
      )}
      <div className="formActions">
        <button type="button" className="fcMore" onClick={load} disabled={busy}>
          {t("Pedir consejos otra vez", "Get new advice")}
        </button>
        <button type="button" className="fcMore" onClick={openRamoncito}>
          {t("Hacerle una pregunta", "Ask a question")}
        </button>
      </div>
      <p className="hint">
        {t(
          "Ramoncito es una IA: puede equivocarse. Confírmalo con tu experiencia o con un técnico.",
          "Ramoncito is an AI: it can make mistakes. Check with your own experience or an agronomist.",
        )}
      </p>
    </section>
  );
}
