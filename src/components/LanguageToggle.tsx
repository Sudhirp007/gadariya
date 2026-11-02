"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/context";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  const toggleLanguage = () => {
    const nextLocale = locale === "hi" ? "en" : "hi";
    setLocale(nextLocale);
  };

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-gold-400/60 bg-plum-800/80 hover:bg-plum-900 text-gold-200 hover:text-gold-100 text-xs font-semibold transition shadow-xs"
      title="Switch Language / भाषा बदलें"
      aria-label="Switch Language"
    >
      <Languages className="w-3.5 h-3.5 text-gold-300" />
      <span>{locale === "hi" ? "English" : "हिंदी"}</span>
    </button>
  );
}
