"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import { BrandLogo } from "@/components/BrandLogo";
import { ShieldCheck, Mail, KeyRound, AlertCircle, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState("05sudhirpal@gmail.com");
  const [step, setStep] = useState<"EMAIL" | "MFA">("EMAIL");
  const [mfaCode, setMfaCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate login");

      if (data.mfaRequired) {
        setStep("MFA");
        if (data.devCode) {
          setDevCode(data.devCode);
          setMfaCode(data.devCode);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error initiating admin login";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: mfaCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "MFA Verification failed");

      window.dispatchEvent(new Event("pal-auth-changed"));
      router.push("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error verifying MFA code";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-warmgrey shadow-lg p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex justify-center mb-1">
            <BrandLogo />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-plum-50 border border-plum-100 text-plum text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-600" />
            <span>Admin Control Plane</span>
          </div>
          <h1 className="text-2xl font-extrabold text-plum">
            {t("admin.portalTitle")}
          </h1>
          <p className="text-xs text-charcoal-light">
            Restricted access for authorized community moderators and super administrators. Two-step MFA verification required.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-plum text-xs flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-plum flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === "EMAIL" ? (
          <form onSubmit={handleRequestMfa} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-plum" />
                <span>Authorized Admin Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="05sudhirpal@gmail.com"
                className="w-full px-4 py-3 rounded-2xl border border-warmgrey bg-ivory focus:bg-white focus:outline-none focus:ring-2 focus:ring-plum text-sm font-medium transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-plum hover:bg-plum-900 text-ivory font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Verifying..." : t("admin.loginButton")}</span>
              <ArrowRight className="w-4 h-4 text-gold-300" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyMfa} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-forest-50 border border-forest-100 text-forest text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                <span>{t("admin.mfaTitle")}</span>
              </div>
              <p className="text-charcoal-light leading-relaxed">
                {t("admin.mfaDesc")} ({email})
              </p>
              {devCode && (
                <div className="mt-2 text-xs font-mono bg-white p-2 rounded border border-forest-200 text-forest font-bold">
                  Security MFA Code: {devCode}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-plum" />
                <span>6-Digit Security Code</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-2xl border border-warmgrey bg-ivory text-center font-mono text-xl tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-plum transition"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep("EMAIL")}
                className="w-1/3 py-3 px-4 rounded-2xl border border-warmgrey text-xs font-semibold text-charcoal hover:bg-ivory transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || mfaCode.trim().length !== 6}
                className="w-2/3 py-3.5 px-6 rounded-2xl bg-forest hover:bg-forest-800 text-ivory font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? "Authenticating..." : t("admin.verifyMfaButton")}</span>
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-warmgrey text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-plum hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Pal Matrimony Website</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
