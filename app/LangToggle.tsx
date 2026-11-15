"use client";

// Botón EN | ES. Cambia el idioma al instante y lo recuerda.
import { useRouter } from "next/navigation";
import { useLang, type Lang } from "@/lib/i18n";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  const router = useRouter();
  const choose = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    router.refresh(); // las partes que arma el servidor también cambian de idioma
  };
  return (
    <div className={`langToggle ${className}`} role="group" aria-label="Language / Idioma">
      {(["en", "es"] as Lang[]).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? "isOn" : undefined} onClick={() => choose(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
