"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import hiMessages from "../../../messages/hi.json";
import enMessages from "../../../messages/en.json";

export type Locale = "hi" | "en";

interface I18nContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (path: string, fallback?: string) => string;
}

const dictionaries: Record<Locale, any> = {
  hi: hiMessages,
  en: enMessages,
};

const I18nContext = createContext<I18nContextType>({
  locale: "hi",
  setLocale: () => {},
  t: (path: string) => path,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("hi"); // Default to Hindi (hi) per D-003

  useEffect(() => {
    // Check cookie or localStorage on client mount
    const saved = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="))
      ?.split("=")[1] as Locale | undefined;

    if (saved === "hi" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    // Persist in cookie (1 year)
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem("NEXT_LOCALE", newLocale);
  };

  const t = (path: string, fallback?: string): string => {
    const keys = path.split(".");
    let curr = dictionaries[locale];

    for (const key of keys) {
      if (curr && typeof curr === "object" && key in curr) {
        curr = curr[key];
      } else {
        // Fallback to English if missing in active dictionary
        let fallbackVal = dictionaries["en"];
        for (const fKey of keys) {
          if (fallbackVal && typeof fallbackVal === "object" && fKey in fallbackVal) {
            fallbackVal = fallbackVal[fKey];
          } else {
            return fallback || path;
          }
        }
        return typeof fallbackVal === "string" ? fallbackVal : fallback || path;
      }
    }

    return typeof curr === "string" ? curr : fallback || path;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
