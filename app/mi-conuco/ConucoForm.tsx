"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CURRENT_PRESETS } from "@/app/agro";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AGUA, EQUIPO, PRIORIDADES, VENTA, type Conuco } from "@/lib/conuco";
import { useLang } from "@/lib/i18n";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="pickerMap" />,
});

const EMPTY: Omit<Conuco, "lat" | "lon"> = {
  nombre: "",
  tareas: null,
  siembra_actual: "maiz-maiz",
  agua: "lluvia",
  prioridades: [],
  equipo: "manual",
  venta: "mercado_local",
  notas: null,
};

export default function ConucoForm({ initial, onDone }: { initial?: Conuco; onDone?: () => void }) {
  const { lang, t } = useLang();
  const tx = (x: { es: string; en: string }) => t(x.es, x.en);
  const router = useRouter();
  const [f, setF] = useState<Omit<Conuco, "lat" | "lon">>(initial ?? EMPTY);
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(
    initial ? { lat: initial.lat, lon: initial.lon } : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const togglePriority = (id: string) =>
    set("prioridades", f.prioridades.includes(id) ? f.prioridades.filter((p) => p !== id) : [...f.prioridades, id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nombre.trim()) return setError(t("Ponle un nombre a tu conuco.", "Give your conuco a name."));
    if (!loc) return setError(t("Marca en el mapa dónde está tu conuco.", "Mark where your conuco is on the map."));
    setBusy(true);
    setError("");
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setError(t("Tu sesión se cerró. Vuelve a entrar con Google.", "Your session ended. Sign in with Google again."));
    }
    const row = {
      user_id: user.id,
      nombre: f.nombre.trim().slice(0, 80),
      lat: loc.lat,
      lon: loc.lon,
      tareas: f.tareas && f.tareas > 0 ? f.tareas : null,
      siembra_actual: f.siembra_actual,
      agua: f.agua,
      prioridades: f.prioridades,
      equipo: f.equipo,
      venta: f.venta,
      notas: f.notas?.trim() ? f.notas.trim().slice(0, 500) : null,
    };
    const { error } = await supabase.from("conucos").upsert(row, { onConflict: "user_id" });
    setBusy(false);
    if (error) return setError(t("No se pudo guardar. Revisa tu conexión e inténtalo otra vez.", "Couldn't save. Check your connection and try again."));
    onDone?.();
    router.refresh();
  };

  return (
    <form className="conucoForm" onSubmit={save}>
      <label className="field">
        <span>{t("¿Cómo se llama tu conuco?", "What's your conuco called?")}</span>
        <input
          value={f.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder={t("Ej.: La finquita de abuela", "e.g. Grandma's little farm")}
          maxLength={80}
          required
        />
      </label>

      <div className="field">
        <span>{t("¿Dónde está?", "Where is it?")}</span>
        <LocationPicker value={loc} onChange={setLoc} />
      </div>

      <label className="field">
        <span>{t("¿Cuántas tareas tiene? (opcional)", "How many tareas is it? (optional)")}</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={f.tareas ?? ""}
          onChange={(e) => set("tareas", e.target.value ? +e.target.value : null)}
          placeholder={t("Ej.: 10", "e.g. 10")}
        />
        <small>{t("1 tarea son unos 629 m². 16 tareas ≈ 1 hectárea.", "A tarea is a Dominican land unit of about 629 m². 16 tareas ≈ 1 hectare (≈ 2.5 acres).")}</small>
      </label>

      <label className="field">
        <span>{t("¿Qué siembras hoy?", "What do you grow today?")}</span>
        <select value={f.siembra_actual} onChange={(e) => set("siembra_actual", e.target.value)}>
          {CURRENT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {lang === "en" ? p.en : p.label}
            </option>
          ))}
        </select>
        <small>{t("Es tu rotación de hoy: así comparamos con otras opciones.", "This is your current rotation: we compare other options against it.")}</small>
      </label>

      <fieldset className="field">
        <legend>{t("¿Qué agua tienes?", "What water do you have?")}</legend>
        {(Object.keys(AGUA) as Conuco["agua"][]).map((k) => (
          <label key={k} className="choice">
            <input type="radio" name="agua" checked={f.agua === k} onChange={() => set("agua", k)} />
            {tx(AGUA[k])}
          </label>
        ))}
      </fieldset>

      <fieldset className="field">
        <legend>{t("¿Cómo trabajas la tierra?", "How do you work the land?")}</legend>
        {(Object.keys(EQUIPO) as Conuco["equipo"][]).map((k) => (
          <label key={k} className="choice">
            <input type="radio" name="equipo" checked={f.equipo === k} onChange={() => set("equipo", k)} />
            {tx(EQUIPO[k])}
          </label>
        ))}
      </fieldset>

      <fieldset className="field">
        <legend>{t("¿Dónde vendes tu cosecha?", "Where do you sell your harvest?")}</legend>
        {(Object.keys(VENTA) as Conuco["venta"][]).map((k) => (
          <label key={k} className="choice">
            <input type="radio" name="venta" checked={f.venta === k} onChange={() => set("venta", k)} />
            {tx(VENTA[k])}
          </label>
        ))}
      </fieldset>

      <fieldset className="field">
        <legend>{t("¿Qué es lo más importante para ti? (puedes marcar varias)", "What matters most to you? (you can pick several)")}</legend>
        <div className="prioChips">
          {PRIORIDADES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={f.prioridades.includes(p.id)}
              className={f.prioridades.includes(p.id) ? "isOn" : undefined}
              onClick={() => togglePriority(p.id)}
            >
              <span className="prioLabel">{tx(p.label)}</span>
              <small className="prioHint">{tx(p.hint)}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>{t("¿Algo más que Ramoncito deba saber? (opcional)", "Anything else Ramoncito should know? (optional)")}</span>
        <textarea
          value={f.notas ?? ""}
          onChange={(e) => set("notas", e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={t("Ej.: la parte de abajo se encharca cuando llueve mucho", "e.g. the lower part floods when it rains a lot")}
        />
      </label>

      {error && <p className="mcError">{error}</p>}
      <div className="formActions">
        <button type="submit" className="cta" disabled={busy}>
          {busy ? t("Guardando…", "Saving…") : initial ? t("Guardar cambios", "Save changes") : t("Guardar mi conuco", "Save my conuco")}
        </button>
        {onDone && (
          <button type="button" className="fcMore" onClick={onDone}>
            {t("Cancelar", "Cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
