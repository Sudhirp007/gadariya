"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { ConfirmationResult } from "firebase/auth";

export default function LoginPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();

  const [existingUser, setExistingUser] = useState<{ firstName: string; publicId: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.profile) {
          setExistingUser(data.profile);
        }
      })
      .catch(() => {});
  }, []);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Send Firebase Phone OTP
  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanDigits = phone.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const { auth, RecaptchaVerifier, signInWithPhoneNumber } = await import("@/lib/firebase/client");

      const isTestNumber = cleanDigits === "9876543210" || cleanDigits === "9811111111";
      auth.settings.appVerificationDisabledForTesting = isTestNumber;

      let appVerifier = (window as any).recaptchaVerifier;
      if (!appVerifier) {
        appVerifier = new RecaptchaVerifier(auth, "login-recaptcha-container", {
          size: "invisible",
          callback: () => {},
        });
        (window as any).recaptchaVerifier = appVerifier;
      }

      const formattedPhone = `+91${cleanDigits.slice(-10)}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setCodeSent(true);
      setTimer(60);

      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending login code";
      setError(msg);
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {}
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify Phone Code and Login
  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code || code.trim().length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      if (!confirmationResult) {
        throw new Error("No pending verification. Please request a new code.");
      }

      const credential = await confirmationResult.confirm(code.trim());
      const token = await credential.user.getIdToken();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseIdToken: token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      if (data.notRegistered) {
        router.push("/register");
        return;
      }

      setSuccess(true);
      window.dispatchEvent(new Event("pal-auth-changed"));
      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Alternative
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const { auth, googleProvider, signInWithPopup } = await import("@/lib/firebase/client");
      const res = await signInWithPopup(auth, googleProvider);
      const token = await res.user.getIdToken();

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseIdToken: token }),
      });

      const data = await loginRes.json();
      if (!loginRes.ok) throw new Error(data.error || "Google login failed");

      if (data.notRegistered) {
        router.push("/register");
        return;
      }

      setSuccess(true);
      window.dispatchEvent(new Event("pal-auth-changed"));
      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in error";
      if (msg.includes("popup-closed-by-user") || msg.includes("cancelled-popup-request")) {
        setError("Google Sign-In popup was closed. Please try again or use Phone OTP.");
      } else if (msg.includes("popup-blocked")) {
        setError("Browser popup was blocked. Please allow popups for this site or use Phone OTP.");
      } else if (msg.includes("operation-not-allowed")) {
        setError("Google Sign-In is pending activation in the Firebase console. Please sign in using Phone verification.");
      } else if (msg.includes("unauthorized-domain") || msg.includes("not iterable")) {
        setError("Google authentication service is validating domain. Please sign in using Phone verification.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (existingUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="bg-white rounded-3xl border border-warmgrey p-8 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-forest-50 border border-forest-200 text-forest flex items-center justify-center mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-plum">
            {locale === "hi" ? "आप पहले से लॉग इन हैं" : "Already Signed In"}
          </h2>
          <p className="text-sm text-charcoal leading-relaxed">
            {locale === "hi"
              ? `आप ${existingUser.firstName} (${existingUser.publicId}) के रूप में सक्रिय हैं।`
              : `You are signed in as ${existingUser.firstName} (${existingUser.publicId}).`}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/profile"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-plum hover:bg-plum-800 text-white font-semibold text-sm shadow-md transition"
            >
              {locale === "hi" ? "मेरी प्रोफ़ाइल" : "Go to My Profile"}
            </Link>
            <Link
              href="/discovery"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gold-100 hover:bg-gold-200 text-plum-900 border border-gold-300 font-semibold text-sm shadow-xs transition"
            >
              {locale === "hi" ? "रिश्ते देखें" : "Browse Matches"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div id="login-recaptcha-container"></div>
      <div className="bg-white rounded-3xl border border-warmgrey shadow-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo variant="icon" className="justify-center mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-plum">{t("auth.login")}</h2>
          <p className="text-xs text-charcoal-light">Sign in with Firebase Verified Mobile or Google</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-burgundy-50 border border-burgundy-200 text-burgundy-900 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-burgundy-700" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-forest-900 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-forest-700" />
            <span>Authentication successful! Redirecting to profile...</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || success}
          className="w-full py-3 px-4 rounded-xl border border-warmgrey hover:bg-ivory text-charcoal font-semibold text-sm flex items-center justify-center space-x-3 transition shadow-2xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-warmgrey w-full"></div>
          <span className="bg-white px-3 text-2xs uppercase tracking-wider text-charcoal-light font-semibold">
            Or with Verified Mobile
          </span>
        </div>

        {/* Phone Sign-In Form */}
        {!codeSent ? (
          <form onSubmit={handleSendPhoneCode} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("register.phone")}</label>
              <div className="flex space-x-2">
                <span className="inline-flex items-center px-3.5 rounded-xl border border-warmgrey bg-ivory text-charcoal text-sm font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, "").length < 10}
              className="w-full py-3.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <span>{loading ? t("common.loading") : "Send Verification Code"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPhoneCode} className="space-y-4">
            <div className="p-4 rounded-xl bg-plum-50 border border-plum-200 space-y-3">
              <label className="text-xs font-semibold text-plum-900 block">
                Enter 6-digit code sent to +91 {phone}
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2.5 rounded-xl border border-plum-300 focus:outline-none focus:ring-2 focus:ring-plum text-base font-mono tracking-widest text-center"
              />
              {timer > 0 ? (
                <p className="text-xs text-plum-700">Resend code in {timer} seconds</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendPhoneCode}
                  className="text-xs text-plum-700 font-semibold underline"
                >
                  Resend verification code
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length !== 6}
              className="w-full py-3.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold rounded-xl shadow-md transition"
            >
              {loading ? t("common.loading") : "Verify & Sign In"}
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-xs text-charcoal-light">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-plum font-bold hover:underline">
            Register Candidate
          </Link>
        </div>
      </div>
    </div>
  );
}
