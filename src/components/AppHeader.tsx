"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageToggle } from "./LanguageToggle";
import { BrandLogo } from "./BrandLogo";
import {
  LogOut,
  User,
  Shield,
  Menu,
  X,
  Sparkles,
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface AuthMeState {
  checked: boolean;
  authenticated: boolean;
  profile: {
    id: string;
    publicId: string;
    firstName: string;
    publicationStatus: string;
  } | null;
  admin: {
    email: string;
    role: string;
  } | null;
}

export function AppHeader() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const [auth, setAuth] = useState<AuthMeState>({
    checked: false,
    authenticated: false,
    profile: null,
    admin: null,
  });
  const [signingOut, setSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAuth({
          checked: true,
          authenticated: !!data.authenticated,
          profile: data.profile || null,
          admin: data.admin || null,
        });
      } else {
        setAuth((prev) => ({ ...prev, checked: true }));
      }
    } catch {
      setAuth((prev) => ({ ...prev, checked: true }));
    }
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [pathname, fetchAuth]);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = () => fetchAuth();
    window.addEventListener("pal-auth-changed", handler);
    return () => window.removeEventListener("pal-auth-changed", handler);
  }, [fetchAuth]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuth((prev) => ({
        ...prev,
        authenticated: false,
        profile: null,
      }));
      setMobileMenuOpen(false);
      window.dispatchEvent(new Event("pal-auth-changed"));
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const isMatchesActive = pathname.startsWith("/discovery");
  const isConnectionsActive = pathname.startsWith("/connections");
  const isMessagesActive = pathname.startsWith("/messages");
  const isProfileActive = pathname.startsWith("/profile");

  return (
    <>
      {/* Top Header Bar */}
      <header className="bg-plum text-white sticky top-0 z-50 shadow-md border-b border-plum-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <BrandLogo isLight={true} />

          {/* Desktop Navigation (>= md screens) */}
          <nav className="hidden md:flex items-center gap-4">
            {auth.authenticated ? (
              <>
                <Link
                  href="/discovery"
                  className={`text-xs sm:text-sm font-semibold transition px-2 py-1 rounded-md ${
                    isMatchesActive
                      ? "text-gold bg-white/10"
                      : "text-rose-100 hover:text-white"
                  }`}
                >
                  {t("nav.discovery")}
                </Link>

                <Link
                  href="/connections"
                  className={`text-xs sm:text-sm font-semibold transition px-2 py-1 rounded-md ${
                    isConnectionsActive
                      ? "text-gold bg-white/10"
                      : "text-rose-100 hover:text-white"
                  }`}
                >
                  {t("nav.connections")}
                </Link>

                <Link
                  href="/messages"
                  className={`text-xs sm:text-sm font-semibold transition px-2 py-1 rounded-md ${
                    isMessagesActive
                      ? "text-gold bg-white/10"
                      : "text-rose-100 hover:text-white"
                  }`}
                >
                  {t("nav.messages")}
                </Link>

                <Link
                  href="/verification"
                  className="text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition px-2 py-1"
                >
                  {t("nav.verification")}
                </Link>

                <Link
                  href="/settings/privacy"
                  className="text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition px-2 py-1"
                >
                  {t("nav.privacy")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#how-it-works"
                  className="text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition px-2 py-1"
                >
                  {t("nav.howItWorks")}
                </Link>
                <Link
                  href="/settings/privacy"
                  className="text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition px-2 py-1"
                >
                  {t("nav.safety")}
                </Link>
                <Link
                  href="/verification"
                  className="text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition px-2 py-1"
                >
                  {t("nav.verification")}
                </Link>
              </>
            )}

            {auth.admin && (
              <Link
                href="/admin"
                className="px-2.5 py-1 rounded-lg bg-plum-950/70 border border-gold-400/50 text-gold-300 hover:text-white text-xs font-bold flex items-center space-x-1 transition"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            )}

            <LanguageToggle />

            {auth.authenticated && auth.profile ? (
              <div className="flex items-center gap-2 pl-1">
                <Link
                  href="/profile"
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition ${
                    isProfileActive
                      ? "bg-white/20 border-gold-400 text-white"
                      : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                  }`}
                  title={t("nav.profile")}
                >
                  <User className="w-3.5 h-3.5 text-gold-300" />
                  <span className="max-w-[110px] truncate">{auth.profile.firstName}</span>
                  <span className="hidden sm:inline font-mono text-[10px] text-gold-300">
                    {auth.profile.publicId}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="px-3 py-1.5 text-xs font-semibold text-plum-900 bg-gold hover:bg-gold-400 rounded-lg shadow-sm transition flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("auth.logout")}</span>
                </button>
              </div>
            ) : auth.checked ? (
              <div className="flex items-center gap-2 pl-1">
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
              </div>
            ) : null}
          </nav>

          {/* Mobile Right Controls (< md screens) */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageToggle />

            {auth.admin && (
              <Link
                href="/admin"
                className="p-1.5 rounded-lg bg-plum-950/70 border border-gold-400/50 text-gold-300"
                title="Admin"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}

            {auth.authenticated && auth.profile ? (
              <Link
                href="/profile"
                className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-semibold transition ${
                  isProfileActive
                    ? "bg-white/25 border-gold-400 text-white"
                    : "bg-white/10 border-white/20 text-white"
                }`}
                title={auth.profile.firstName}
              >
                <User className="w-4 h-4 text-gold-300" />
                <span className="max-w-[70px] truncate text-[11px]">
                  {auth.profile.firstName}
                </span>
              </Link>
            ) : auth.checked ? (
              <Link
                href="/login"
                className="px-3 py-1 text-xs font-semibold text-plum-900 bg-gold hover:bg-gold-400 rounded-lg shadow-sm"
              >
                {t("common.signIn")}
              </Link>
            ) : null}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-plum-900 border-t border-plum-800 px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            {auth.authenticated && auth.profile ? (
              <>
                {/* User card in mobile menu */}
                <div className="p-3 rounded-xl bg-plum-950/80 border border-plum-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{auth.profile.firstName}</span>
                      <span className="font-mono text-[10px] text-gold-300 bg-plum px-1.5 py-0.5 rounded border border-gold-400/30">
                        {auth.profile.publicId}
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-200 mt-0.5">
                      {locale === "hi" ? "स्थिति:" : "Status:"}{" "}
                      <span className="font-semibold text-gold-300">
                        {auth.profile.publicationStatus}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-lg transition"
                  >
                    {t("nav.profile")}
                  </Link>
                </div>

                {/* Logged in member links */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/discovery"
                    className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold transition ${
                      isMatchesActive
                        ? "bg-white/20 text-gold"
                        : "bg-white/5 text-rose-100 hover:bg-white/10"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-gold-400" />
                    <span>{t("nav.discovery")}</span>
                  </Link>

                  <Link
                    href="/connections"
                    className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold transition ${
                      isConnectionsActive
                        ? "bg-white/20 text-gold"
                        : "bg-white/5 text-rose-100 hover:bg-white/10"
                    }`}
                  >
                    <HeartHandshake className="w-4 h-4 text-rose-300" />
                    <span>{t("nav.connections")}</span>
                  </Link>

                  <Link
                    href="/messages"
                    className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold transition ${
                      isMessagesActive
                        ? "bg-white/20 text-gold"
                        : "bg-white/5 text-rose-100 hover:bg-white/10"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-rose-300" />
                    <span>{t("nav.messages")}</span>
                  </Link>

                  <Link
                    href="/profile"
                    className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold transition ${
                      isProfileActive
                        ? "bg-white/20 text-gold"
                        : "bg-white/5 text-rose-100 hover:bg-white/10"
                    }`}
                  >
                    <User className="w-4 h-4 text-gold-400" />
                    <span>{t("nav.profile")}</span>
                  </Link>

                  <Link
                    href="/verification"
                    className="flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold bg-white/5 text-rose-100 hover:bg-white/10 transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-forest-200" />
                    <span>{t("nav.verification")}</span>
                  </Link>

                  <Link
                    href="/settings/privacy"
                    className="flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold bg-white/5 text-rose-100 hover:bg-white/10 transition"
                  >
                    <Lock className="w-4 h-4 text-gold-300" />
                    <span>{t("nav.privacy")}</span>
                  </Link>
                </div>

                <div className="pt-2 border-t border-plum-800 flex items-center justify-between">
                  <span className="text-[11px] text-rose-200">
                    {locale === "hi" ? "सत्र समाप्त करें" : "End your session"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="px-3.5 py-1.5 text-xs font-semibold text-plum-900 bg-gold hover:bg-gold-400 rounded-lg shadow-sm transition flex items-center space-x-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t("auth.logout")}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Guest mobile menu */}
                <div className="space-y-1">
                  <Link
                    href="/#how-it-works"
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-rose-100 hover:bg-white/10 transition"
                  >
                    {t("nav.howItWorks")}
                  </Link>
                  <Link
                    href="/settings/privacy"
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-rose-100 hover:bg-white/10 transition"
                  >
                    {t("nav.safety")}
                  </Link>
                  <Link
                    href="/verification"
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-rose-100 hover:bg-white/10 transition"
                  >
                    {t("nav.verification")}
                  </Link>
                </div>

                <div className="pt-3 border-t border-plum-800 flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1 text-center py-2 text-xs font-semibold text-plum-900 bg-gold hover:bg-gold-400 rounded-lg shadow-sm transition"
                  >
                    {t("common.signIn")}
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 text-center py-2 text-xs font-semibold text-plum bg-white hover:bg-ivory rounded-lg shadow-sm transition"
                  >
                    {t("common.register")}
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Mobile Sticky Bottom Navigation Bar (Visible only on mobile for logged-in users) */}
      {auth.authenticated && auth.profile && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-warmgrey shadow-[0_-2px_10px_rgba(0,0,0,0.06)] px-2 py-1.5"
        >
          <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
            {/* Matches */}
            <Link
              href="/discovery"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
                isMatchesActive
                  ? "text-plum bg-plum-50 font-bold"
                  : "text-charcoal-light hover:text-plum font-medium"
              }`}
            >
              <div className="relative">
                <Sparkles
                  className={`w-5 h-5 ${isMatchesActive ? "text-plum" : "text-charcoal-light"}`}
                />
                {isMatchesActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-600"></span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate">
                {t("nav.discovery")}
              </span>
            </Link>

            {/* Connections */}
            <Link
              href="/connections"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
                isConnectionsActive
                  ? "text-plum bg-plum-50 font-bold"
                  : "text-charcoal-light hover:text-plum font-medium"
              }`}
            >
              <div className="relative">
                <HeartHandshake
                  className={`w-5 h-5 ${isConnectionsActive ? "text-plum" : "text-charcoal-light"}`}
                />
                {isConnectionsActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-600"></span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate">
                {t("nav.connections")}
              </span>
            </Link>

            {/* Messages */}
            <Link
              href="/messages"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
                isMessagesActive
                  ? "text-plum bg-plum-50 font-bold"
                  : "text-charcoal-light hover:text-plum font-medium"
              }`}
            >
              <div className="relative">
                <MessageSquare
                  className={`w-5 h-5 ${isMessagesActive ? "text-plum" : "text-charcoal-light"}`}
                />
                {isMessagesActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-600"></span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate">
                {t("nav.messages")}
              </span>
            </Link>

            {/* Profile */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
                isProfileActive
                  ? "text-plum bg-plum-50 font-bold"
                  : "text-charcoal-light hover:text-plum font-medium"
              }`}
            >
              <div className="relative">
                <User
                  className={`w-5 h-5 ${isProfileActive ? "text-plum" : "text-charcoal-light"}`}
                />
                {isProfileActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-600"></span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate">
                {t("nav.profile")}
              </span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
