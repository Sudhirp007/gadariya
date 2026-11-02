"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageToggle } from "./LanguageToggle";
import { BrandLogo } from "./BrandLogo";
import { LogOut, User, Shield } from "lucide-react";

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
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const [auth, setAuth] = useState<AuthMeState>({
    checked: false,
    authenticated: false,
    profile: null,
    admin: null,
  });
  const [signingOut, setSigningOut] = useState(false);

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
      window.dispatchEvent(new Event("pal-auth-changed"));
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="bg-plum text-white sticky top-0 z-50 shadow-md border-b border-plum-800">
      <div className="max-w-6xl mx-auto px-4 min-h-16 py-2 flex flex-wrap items-center justify-between gap-2">
        <BrandLogo isLight={true} />

        <nav className="flex flex-wrap items-center gap-2 sm:gap-3.5">
          <Link
            href="/discovery"
            className="text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition"
          >
            {t("nav.discovery")}
          </Link>

          {auth.authenticated && (
            <>
              <Link
                href="/connections"
                className="text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition"
              >
                {t("nav.connections")}
              </Link>
              <Link
                href="/messages"
                className="text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition"
              >
                {t("nav.messages")}
              </Link>
              <Link
                href="/verification"
                className="hidden md:inline-block text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition"
              >
                {t("nav.verification")}
              </Link>
              <Link
                href="/settings/privacy"
                className="hidden lg:inline-block text-rose-100 hover:text-white text-xs sm:text-sm font-semibold transition"
              >
                {t("nav.privacy")}
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
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
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
            <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
}
