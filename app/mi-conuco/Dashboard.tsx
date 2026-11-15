"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import type { Model } from "@/app/agro";
import { ForecastDays, RotationsTab } from "@/app/PanelExtras";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AGUA, MAX_ZONE_KM, nearestZone, type Conuco, type ZonePoint } from "@/lib/conuco";
import ConucoForm from "./ConucoForm";

type Msg = { role: "user" | "assistant"; content: string };

// Muestra el texto de la IA: saltos de línea y **negritas**, sin HTML
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        line.trim() ? (
          <p key={i}>
            {line.split("**").map((part, j) => (j % 2 ? <b key={j}>{part}</b> : <Fragment key={j}>{part}</Fragment>))}
          </p>
        ) : null,
      )}
    </>
  );
}

async function ask(body: object): Promise<string> {
  const r = await fetch("/api/ramoncito", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Ramoncito no pudo responder ahora.");
  return j.reply as string;
}

export default function Dashboard({ conuco, firstName }: { conuco: Conuco; firstName: string }) {
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
    if (!confirm("¿Borrar tu conuco y todos sus datos? Esto no se puede deshacer.")) return;
    await supabaseBrowser().from("conucos").delete().eq("user_id", conuco.user_id!);
    router.refresh();
  };

  if (editing)
    return (
      <section className="mcCard">
        <h1>Cambiar los datos de tu conuco</h1>
        <ConucoForm initial={conuco} onDone={() => setEditing(false)} />
      </section>
    );

  return (
    <div className="mcDash">
      <section className="mcHello">
        <div>
          <p className="eyebrowMini">Mi conuco</p>
          <h1>{conuco.nombre}</h1>
          <p className="mcLead">
            {firstName ? `${firstName}, ` : ""}
            {zone ? (
              zone.km <= MAX_ZONE_KM ? (
                <>
                  tus datos vienen de la zona <b>{zone.name}</b>
                </>
              ) : (
                <>tu conuco está fuera del área que analizamos: toma los consejos con cuidado</>
              )
            ) : (
              "buscando la zona de tus datos…"
            )}
            {conuco.tareas ? ` · ${conuco.tareas} tareas` : ""} · {AGUA[conuco.agua].toLowerCase()}
          </p>
        </div>
        <div className="mcHelloActions">
          <button type="button" className="fcMore" onClick={() => setEditing(true)}>
            Cambiar datos
          </button>
          <button type="button" className="fcMore" onClick={signOut}>
            Salir
          </button>
        </div>
      </section>

      <div className="mcGrid">
        <section className="mcCard">
          <h2>El tiempo esta semana</h2>
          {zone ? <ForecastDays lat={zone.lat} lon={zone.lon} /> : <p className="hint">Cargando…</p>}
        </section>

        <div className="mcCol">
          <Advice />
          <Chat />
        </div>
      </div>

      <section className="mcCard">
        <h2>Tus rotaciones</h2>
        <p className="mcLead">Lo que siembras hoy, frente a otras opciones calculadas para tu zona.</p>
        {model ? <RotationsTab model={model} initialPreset={conuco.siembra_actual} /> : <p className="hint">Cargando…</p>}
      </section>

      <section className="mcPrivacy">
        <p>
          <b>Tus datos son tuyos.</b> Solo tú puedes ver tu conuco. Para darte consejos, Ramoncito envía a la IA (Groq)
          un resumen de tu conuco y de tu zona, sin tu nombre, tu correo ni tu ubicación exacta.
        </p>
        <button type="button" className="linkDanger" onClick={remove}>
          Borrar mi conuco
        </button>
      </section>
    </div>
  );
}

// ---------- Consejos de Ramoncito (IA) ----------
function Advice() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      setText(await ask({ mode: "consejos" }));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mcCard mcAdvice">
      <div className="mcAdviceHead">
        <Image src="/ramoncito-planta.png" alt="" width={566} height={451} />
        <div>
          <h2>Consejos de Ramoncito</h2>
          <p className="hint">Con el tiempo de esta semana, tu tierra y lo que te importa.</p>
        </div>
      </div>
      {busy && <p className="hint">Ramoncito está pensando…</p>}
      {error && <p className="mcError">{error}</p>}
      {text && !busy && (
        <div className="aiText">
          <RichText text={text} />
        </div>
      )}
      <button type="button" className="fcMore" onClick={load} disabled={busy}>
        Pedir consejos otra vez
      </button>
      <p className="hint">Ramoncito es una IA: puede equivocarse. Confírmalo con tu experiencia o con un técnico.</p>
    </section>
  );
}

// ---------- Chat con Ramoncito ----------
const EXAMPLES = ["¿Qué siembro el mes que viene?", "¿Riego esta semana?", "¿Cómo protejo mi tierra de la lluvia?"];

function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q.slice(0, 1500) }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const reply = await ask({ mode: "chat", messages: next });
      setMsgs([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <section className="mcCard mcChat">
      <h2>Pregúntale a Ramoncito</h2>
      <div className="chatLog" aria-live="polite">
        {!msgs.length && (
          <div className="chips">
            {EXAMPLES.map((q) => (
              <button key={q} type="button" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`bubbleMsg ${m.role === "user" ? "me" : "bot"}`}>
            {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
          </div>
        ))}
        {busy && <div className="bubbleMsg bot">Ramoncito está escribiendo…</div>}
        <div ref={endRef} />
      </div>
      {error && <p className="mcError">{error}</p>}
      <form
        className="chatForm"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          maxLength={1500}
          aria-label="Tu pregunta para Ramoncito"
        />
        <button type="submit" className="cta" disabled={busy || !input.trim()}>
          Enviar
        </button>
      </form>
    </section>
  );
}
