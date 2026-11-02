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
      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50/80 hover:bg-orange-100/80 text-orange-800 text-xs font-semibold transition shadow-sm"
      title="Switch Language / भाषा बदलें"
      aria-label="Switch Language"
    >
      <Languages className="w-3.5 h-3.5 text-orange-600" />
      <span>{locale === "hi" ? "English" : "हिंदी"}</span>
    </button>
  );
}
