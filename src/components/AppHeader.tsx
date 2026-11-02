"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageToggle } from "./LanguageToggle";
import { BrandLogo } from "./BrandLogo";

export function AppHeader() {
  const { t } = useTranslation();

  return (
    <header className="bg-plum text-white sticky top-0 z-50 shadow-md border-b border-plum-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <BrandLogo isLight={true} />

        <nav className="flex items-center space-x-3 sm:space-x-5">
          <Link
            href="/#safety"
            className="hidden md:inline-block text-rose-100 hover:text-white text-sm font-medium transition"
          >
            {t("nav.safety")}
          </Link>
          <Link
            href="/#how-it-works"
            className="hidden md:inline-block text-rose-100 hover:text-white text-sm font-medium transition"
          >
            {t("nav.howItWorks")}
          </Link>

          <Link
            href="/profile"
            className="hidden sm:inline-block text-rose-100 hover:text-white text-sm font-medium transition"
          >
            {t("nav.profile")}
          </Link>

          <LanguageToggle />

          <Link
            href="/login"
            className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-plum-900 bg-gold hover:bg-gold-400 rounded-lg shadow-sm transition"
          >
            {t("common.signIn")}
          </Link>
          <Link
            href="/register"
            className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-plum bg-white hover:bg-ivory rounded-lg shadow-sm transition"
          >
            {t("common.register")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
