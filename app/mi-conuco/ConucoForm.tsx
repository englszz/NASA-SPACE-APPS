"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CURRENT_PRESETS } from "@/app/agro";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AGUA, EQUIPO, PRIORIDADES, VENTA, type Conuco } from "@/lib/conuco";

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
    if (!f.nombre.trim()) return setError("Ponle un nombre a tu conuco.");
    if (!loc) return setError("Marca en el mapa dónde está tu conuco.");
    setBusy(true);
    setError("");
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setError("Tu sesión se cerró. Vuelve a entrar con Google.");
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
    if (error) return setError("No se pudo guardar. Revisa tu conexión e inténtalo otra vez.");
    onDone?.();
    router.refresh();
  };

  return (
    <form className="conucoForm" onSubmit={save}>
      <label className="field">
        <span>¿Cómo se llama tu conuco?</span>
        <input
          value={f.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej.: La finquita de abuela"
          maxLength={80}
          required
        />
      </label>

      <div className="field">
        <span>¿Dónde está?</span>
        <LocationPicker value={loc} onChange={setLoc} />
      </div>

      <label className="field">
        <span>¿Cuántas tareas tiene? (opcional)</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={f.tareas ?? ""}
          onChange={(e) => set("tareas", e.target.value ? +e.target.value : null)}
          placeholder="Ej.: 10"
        />
        <small>1 tarea son unos 629 m². 16 tareas ≈ 1 hectárea.</small>
      </label>

      <label className="field">
        <span>¿Qué siembras hoy?</span>
        <select value={f.siembra_actual} onChange={(e) => set("siembra_actual", e.target.value)}>
          {CURRENT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <small>Es tu rotación de hoy: así comparamos con otras opciones.</small>
      </label>

      <fieldset className="field">
        <legend>¿Qué agua tienes?</legend>
        {(Object.keys(AGUA) as Conuco["agua"][]).map((k) => (
          <label key={k} className="choice">
            <input type="radio" name="agua" checked={f.agua === k} onChange={() => set("agua", k)} />
            {AGUA[k]}
          </label>
        ))}
      </fieldset>

      <fieldset className="field">
        <legend>¿Cómo trabajas la tierra?</legend>
        {(Object.keys(EQUIPO) as Conuco["equipo"][]).map((k) => (
          <label key={k} className="choice">
            <input type="radio" name="equipo" checked={f.equipo === k} onChange={() => set("equipo", k)} />
            {EQUIPO[k]}
          </label>
        ))}
      </fieldset>

      <fieldset className="field">
        <legend>¿Dónde vendes tu cosecha?</legend>
        {(Object.keys(VENTA) as Conuco["venta"][]).map((k) => (
          <label key={k} className="choice">
            <input type="radio" name="venta" checked={f.venta === k} onChange={() => set("venta", k)} />
            {VENTA[k]}
          </label>
        ))}
      </fieldset>

      <fieldset className="field">
        <legend>¿Qué es lo más importante para ti? (puedes marcar varias)</legend>
        <div className="prioChips">
          {PRIORIDADES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={f.prioridades.includes(p.id)}
              className={f.prioridades.includes(p.id) ? "isOn" : undefined}
              onClick={() => togglePriority(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>¿Algo más que Ramoncito deba saber? (opcional)</span>
        <textarea
          value={f.notas ?? ""}
          onChange={(e) => set("notas", e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ej.: la parte de abajo se encharca cuando llueve mucho"
        />
      </label>

      {error && <p className="mcError">{error}</p>}
      <div className="formActions">
        <button type="submit" className="cta" disabled={busy}>
          {busy ? "Guardando…" : initial ? "Guardar cambios" : "Guardar mi conuco"}
        </button>
        {onDone && (
          <button type="button" className="fcMore" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
