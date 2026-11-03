"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { ShieldCheck, Lock, UserCheck, FileCheck2, Heart, Sparkles, User } from "lucide-react";

interface AuthState {
  checked: boolean;
  authenticated: boolean;
  profile: {
    id: string;
    publicId: string;
    firstName: string;
  } | null;
}

export default function HomePage() {
  const { t, locale } = useTranslation();
  const [auth, setAuth] = useState<AuthState>({
    checked: false,
    authenticated: false,
    profile: null,
  });

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAuth({
            checked: true,
            authenticated: !!data.authenticated,
            profile: data.profile || null,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 text-center space-y-6 pt-10">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-100/80 border border-rose-200 text-plum-800 text-xs font-semibold tracking-wide shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-forest" />
          <span>{t("home.badge")}</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-plum-700 tracking-tight max-w-3xl mx-auto leading-tight">
          {t("home.heroTitle1")} <br />
          <span className="text-gold-600">{t("home.heroTitle2")}</span>
        </h1>

        <p className="text-base md:text-lg text-charcoal max-w-2xl mx-auto leading-relaxed">
          {t("home.heroSubtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {auth.authenticated ? (
            <>
              <Link
                href="/discovery"
                className="w-full sm:w-auto px-8 py-3.5 bg-plum hover:bg-plum-800 text-white font-semibold rounded-xl shadow-md transition text-base flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5 text-gold-300" />
                <span>{locale === "hi" ? "सुयोग्य रिश्ते देखें" : "Explore Matches"}</span>
              </Link>
              <Link
                href="/profile"
                className="w-full sm:w-auto px-8 py-3.5 bg-gold-100 hover:bg-gold-200 text-plum-900 font-semibold rounded-xl border border-gold-300 shadow-2xs transition text-base flex items-center justify-center space-x-2"
              >
                <User className="w-5 h-5 text-plum" />
                <span>{locale === "hi" ? "मेरी प्रोफ़ाइल" : "My Profile"}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 bg-plum hover:bg-plum-800 text-white font-semibold rounded-xl shadow-md transition text-base"
              >
                {t("home.ctaRegister")}
              </Link>
              <a
                href="#safety"
                className="w-full sm:w-auto px-8 py-3.5 bg-gold-100 hover:bg-gold-200 text-plum-900 font-semibold rounded-xl border border-gold-300 shadow-2xs transition text-base"
              >
                {t("home.ctaExplore")}
              </a>
            </>
          )}
        </div>
      </section>

      {/* Trust Invariants Cards */}
      <section id="safety" className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 bg-white rounded-2xl border border-warmgrey shadow-sm space-y-3 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-plum-50 text-plum flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-plum">{t("home.card1Title")}</h3>
            <p className="text-sm text-charcoal-light leading-relaxed">
              {t("home.card1Desc")}
            </p>
          </div>

          <div className="p-7 bg-white rounded-2xl border border-warmgrey shadow-sm space-y-3 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-plum-50 text-plum flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-plum">{t("home.card2Title")}</h3>
            <p className="text-sm text-charcoal-light leading-relaxed">
              {t("home.card2Desc")}
            </p>
          </div>

          <div className="p-7 bg-white rounded-2xl border border-warmgrey shadow-sm space-y-3 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-plum-50 text-plum flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-plum">{t("home.card3Title")}</h3>
            <p className="text-sm text-charcoal-light leading-relaxed">
              {t("home.card3Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 bg-white/70 rounded-3xl p-8 md:p-12 border border-warmgrey shadow-sm">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-plum">{t("home.stepsTitle")}</h2>
          <p className="text-charcoal-light text-sm">
            {t("home.stepsSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-full bg-plum text-white font-bold mx-auto flex items-center justify-center text-sm shadow-sm">
              1
            </div>
            <h4 className="font-semibold text-plum-900">{t("home.step1Title")}</h4>
            <p className="text-xs text-charcoal-light leading-relaxed">
              {t("home.step1Desc")}
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-11 h-11 rounded-full bg-plum text-white font-bold mx-auto flex items-center justify-center text-sm shadow-sm">
              2
            </div>
            <h4 className="font-semibold text-plum-900">{t("home.step2Title")}</h4>
            <p className="text-xs text-charcoal-light leading-relaxed">
              {t("home.step2Desc")}
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-11 h-11 rounded-full bg-plum text-white font-bold mx-auto flex items-center justify-center text-sm shadow-sm">
              3
            </div>
            <h4 className="font-semibold text-plum-900">{t("home.step3Title")}</h4>
            <p className="text-xs text-charcoal-light leading-relaxed">
              {t("home.step3Desc")}
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-11 h-11 rounded-full bg-plum text-white font-bold mx-auto flex items-center justify-center text-sm shadow-sm">
              4
            </div>
            <h4 className="font-semibold text-plum-900">{t("home.step4Title")}</h4>
            <p className="text-xs text-charcoal-light leading-relaxed">
              {t("home.step4Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* Community Callout */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4 pb-6">
        <Heart className="w-8 h-8 text-gold mx-auto" />
        <h3 className="text-2xl font-bold text-plum">{t("home.communityCalloutTitle")}</h3>
        <p className="text-charcoal text-sm max-w-xl mx-auto leading-relaxed">
          {t("home.communityCalloutDesc")}
        </p>
        <div className="pt-2">
          {auth.authenticated ? (
            <Link
              href="/discovery"
              className="inline-flex items-center space-x-2 px-7 py-3 bg-plum hover:bg-plum-800 text-white font-semibold text-sm rounded-xl shadow-md transition"
            >
              <Sparkles className="w-4 h-4 text-gold-300" />
              <span>{locale === "hi" ? "समुदाय के रिश्ते देखें" : "Explore Community Matches"}</span>
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-block px-7 py-3 bg-plum hover:bg-plum-800 text-white font-semibold text-sm rounded-xl shadow-md transition"
            >
              {t("home.joinToday")}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
