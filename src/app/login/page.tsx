"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import { AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Please enter your registered email or 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const isPhone = /^\d{10}$/.test(identifier.replace(/[\s\-\+]/g, ""));
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          channel: isPhone ? "phone" : "email",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setOtpSent(true);
      setOtpTimer(60);
      const timer = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending OTP";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP code");

      setSuccess(true);
      setTimeout(() => {
        router.push("/profile");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl border border-warmgrey shadow-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo variant="icon" className="justify-center mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-plum">{t("auth.loginTitle")}</h2>
          <p className="text-xs text-charcoal-light">{t("auth.loginSubtitle")}</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-forest mx-auto" />
            <h4 className="font-bold text-plum">{t("common.success")}</h4>
            <p className="text-xs text-charcoal-light">Redirecting to your profile dashboard...</p>
          </div>
        ) : !otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">
                {t("auth.phoneLabel")} / {t("auth.emailLabel")}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9876543210 or user@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="w-full py-3.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold rounded-xl shadow-md transition text-sm flex items-center justify-center space-x-2"
            >
              <span>{loading ? t("common.loading") : t("auth.sendOtp")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2 p-4 rounded-xl bg-plum-50 border border-plum-200">
              <label className="text-xs font-semibold text-plum-900 block">
                {t("auth.enterOtp")}
              </label>
              <p className="text-xs text-charcoal-light">
                {t("auth.otpSentTo")} <span className="font-semibold text-plum">{identifier}</span>
              </p>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2.5 rounded-xl border border-plum-300 focus:outline-none focus:ring-2 focus:ring-plum text-base font-mono tracking-widest text-center"
              />
              {otpTimer > 0 ? (
                <p className="text-xs text-plum-700">
                  {t("auth.resendIn")} {otpTimer} {t("auth.seconds")}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-xs text-plum-700 font-semibold underline"
                >
                  {t("auth.resendOtp")}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold rounded-xl shadow-md transition text-sm"
            >
              {loading ? t("common.loading") : t("auth.verifyAndLogin")}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-warmgrey text-center text-xs text-charcoal-light">
          <span>{t("auth.noAccount")} </span>
          <Link href="/register" className="text-plum font-semibold hover:underline">
            {t("common.register")}
          </Link>
        </div>
      </div>
    </div>
  );
}
