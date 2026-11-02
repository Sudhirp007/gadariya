"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { ShieldCheck, Lock, UserCheck, FileCheck2, Heart } from "lucide-react";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 text-center space-y-6 pt-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold tracking-wide">
          <ShieldCheck className="w-4 h-4 text-orange-600" />
          <span>{t("home.badge")}</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight max-w-3xl mx-auto leading-tight">
          {t("home.heroTitle1")} <br />
          <span className="text-orange-600">{t("home.heroTitle2")}</span>
        </h1>

        <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          {t("home.heroSubtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-md transition text-base"
          >
            {t("home.ctaRegister")}
          </Link>
          <a
            href="#safety"
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-stone-50 text-stone-800 font-semibold rounded-xl border border-stone-300 shadow-sm transition text-base"
          >
            {t("home.ctaExplore")}
          </a>
        </div>
      </section>

      {/* Trust Invariants Cards */}
      <section id="safety" className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">{t("home.card1Title")}</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {t("home.card1Desc")}
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">{t("home.card2Title")}</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {t("home.card2Desc")}
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">{t("home.card3Title")}</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {t("home.card3Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 bg-orange-50/60 rounded-3xl p-8 md:p-12 border border-orange-100">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900">{t("home.stepsTitle")}</h2>
          <p className="text-stone-600 text-sm">
            {t("home.stepsSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold mx-auto flex items-center justify-center text-sm shadow">
              1
            </div>
            <h4 className="font-semibold text-stone-900">{t("home.step1Title")}</h4>
            <p className="text-xs text-stone-500">
              {t("home.step1Desc")}
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold mx-auto flex items-center justify-center text-sm shadow">
              2
            </div>
            <h4 className="font-semibold text-stone-900">{t("home.step2Title")}</h4>
            <p className="text-xs text-stone-500">
              {t("home.step2Desc")}
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold mx-auto flex items-center justify-center text-sm shadow">
              3
            </div>
            <h4 className="font-semibold text-stone-900">{t("home.step3Title")}</h4>
            <p className="text-xs text-stone-500">
              {t("home.step3Desc")}
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold mx-auto flex items-center justify-center text-sm shadow">
              4
            </div>
            <h4 className="font-semibold text-stone-900">{t("home.step4Title")}</h4>
            <p className="text-xs text-stone-500">
              {t("home.step4Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* Community Callout */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <Heart className="w-8 h-8 text-orange-600 mx-auto" />
        <h3 className="text-2xl font-bold text-stone-900">{t("home.communityCalloutTitle")}</h3>
        <p className="text-stone-600 text-sm max-w-xl mx-auto leading-relaxed">
          {t("home.communityCalloutDesc")}
        </p>
        <div className="pt-2">
          <Link
            href="/register"
            className="inline-block px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm rounded-xl shadow-sm transition"
          >
            {t("home.joinToday")}
          </Link>
        </div>
      </section>
    </div>
  );
}
