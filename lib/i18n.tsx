"use client";

// Idiomas de la web: inglés por defecto y español como opción.
// - useLang() da { lang, t }, donde t("texto en español", "text in English") devuelve el del idioma actual.
// - El idioma se guarda en la cookie «lang» para que el servidor también lo sepa.
// - Los datos de field-shift-data vienen en español: se traducen al mostrarlos (dataText).

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LANG_COOKIE, type Lang, pick } from "./lang";

export type { Lang } from "./lang";

type Ctx = { lang: Lang; t: (es: string, en: string) => string; setLang: (l: Lang) => void };

const LangContext = createContext<Ctx>({ lang: "en", t: (_es, en) => en, setLang: () => {} });

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
  }, []);
  const value = useMemo(() => ({ lang, t: pick(lang), setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
