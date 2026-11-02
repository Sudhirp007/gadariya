"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageToggle } from "./LanguageToggle";

export function AppHeader() {
  const { t, locale } = useTranslation();

  return (
    <header className="border-b border-orange-100 bg-white/95 backdrop-blur sticky top-0 z-50 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition">
            प
          </div>
          <div>
            <span className="font-bold text-xl text-stone-900 tracking-tight block">
              {locale === "hi" ? "पाल वैवाहिक मंच" : "Pal Matrimony"}
            </span>
            <span className="text-xs text-orange-600 block font-medium -mt-1">
              gadariya.org
            </span>
          </div>
        </Link>

        <nav className="flex items-center space-x-3 sm:space-x-5">
          <Link
            href="/#safety"
            className="hidden md:inline-block text-stone-600 hover:text-stone-900 text-sm font-medium transition"
          >
            {t("nav.safety")}
          </Link>
          <Link
            href="/#how-it-works"
            className="hidden md:inline-block text-stone-600 hover:text-stone-900 text-sm font-medium transition"
          >
            {t("nav.howItWorks")}
          </Link>

          <LanguageToggle />

          <Link
            href="/login"
            className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
          >
            {t("common.signIn")}
          </Link>
          <Link
            href="/register"
            className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition"
          >
            {t("common.register")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
