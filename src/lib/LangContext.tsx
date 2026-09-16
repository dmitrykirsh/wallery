import { createContext, useContext, useState, type ReactNode } from "react";
import { loadLang, saveLang, translate, type Lang, type TranslationKey } from "./i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang());

  function setLang(next: Lang) {
    setLangState(next);
    saveLang(next);
  }

  return <LangContext.Provider value={{ lang, setLang, t: (key) => translate(lang, key) }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
