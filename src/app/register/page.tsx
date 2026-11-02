"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { ShieldCheck, UserCheck, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    managedBy: "SELF",
    firstName: "",
    gender: "MALE",
    dob: "",
    heightCm: 168,
    maritalStatus: "NEVER_MARRIED",
    state: "Uttar Pradesh",
    city: "",
    subCommunity: "",
    phone: "",
    email: "",
    otp: "",
    otpVerified: false,
    communityDeclaration: false,
    consentTerms: false,
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [registeredProfile, setRegisteredProfile] = useState<{ publicId: string } | null>(null);

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birth = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleNextStep1 = () => {
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    setError(null);
    if (!formData.firstName.trim()) {
      setError("Please enter candidate's name");
      return;
    }
    if (!formData.dob) {
      setError("Please select date of birth");
      return;
    }
    const age = calculateAge(formData.dob);
    if (age < 18) {
      setError(t("register.underageError"));
      return;
    }
    if (!formData.city.trim()) {
      setError("Please enter city");
      return;
    }
    setStep(3);
  };

  const handleSendOtp = async () => {
    setError(null);
    if (!formData.phone || formData.phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: formData.phone, channel: "phone" }),
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

  const handleVerifyOtp = async () => {
    setError(null);
    if (!formData.otp || formData.otp.length !== 6) {
      setError("Please enter a 6-digit OTP code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: formData.phone, otp: formData.otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP code");
      setFormData((prev) => ({ ...prev, otpVerified: true }));
      setStep(4);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRegistration = async () => {
    setError(null);
    if (!formData.communityDeclaration) {
      setError(t("register.communityRequired"));
      return;
    }
    if (!formData.consentTerms) {
      setError(t("register.consentRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managedBy: formData.managedBy,
          firstName: formData.firstName,
          gender: formData.gender,
          dob: formData.dob,
          heightCm: Number(formData.heightCm),
          maritalStatus: formData.maritalStatus,
          state: formData.state,
          city: formData.city,
          subCommunity: formData.subCommunity || undefined,
          phone: formData.phone,
          email: formData.email || undefined,
          communityDeclaration: formData.communityDeclaration,
          consentTerms: formData.consentTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      setRegisteredProfile({ publicId: data.profile.publicId });
      setStep(5);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl mx-auto flex items-center justify-center font-bold text-xl shadow-xs">
            प
          </div>
          <h2 className="text-2xl font-bold text-stone-900">{t("register.title")}</h2>
          <p className="text-xs sm:text-sm text-stone-500">{t("register.subtitle")}</p>
        </div>

        {/* Stepper Progress */}
        {step < 5 && (
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 text-xs font-medium text-stone-500">
            <span className={step >= 1 ? "text-orange-600 font-bold" : ""}>1. {t("register.step1")}</span>
            <span>→</span>
            <span className={step >= 2 ? "text-orange-600 font-bold" : ""}>2. {t("register.step2")}</span>
            <span>→</span>
            <span className={step >= 3 ? "text-orange-600 font-bold" : ""}>3. {t("register.step3")}</span>
            <span>→</span>
            <span className={step >= 4 ? "text-orange-600 font-bold" : ""}>4. {t("register.step4")}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Managed By */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-stone-800 text-base">{t("register.step1")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "SELF", label: t("register.managedBy.SELF") },
                { key: "SON", label: t("register.managedBy.SON") },
                { key: "DAUGHTER", label: t("register.managedBy.DAUGHTER") },
                { key: "BROTHER", label: t("register.managedBy.BROTHER") },
                { key: "SISTER", label: t("register.managedBy.SISTER") },
                { key: "RELATIVE", label: t("register.managedBy.RELATIVE") },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFormData({ ...formData, managedBy: item.key })}
                  className={`p-4 rounded-xl border text-sm font-medium text-left transition ${
                    formData.managedBy === item.key
                      ? "border-orange-600 bg-orange-50/70 text-orange-900 font-bold shadow-xs"
                      : "border-stone-200 hover:border-stone-300 text-stone-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextStep1}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
            >
              <span>{t("common.next")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Personal Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-stone-800 text-base">{t("register.step2")}</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">{t("register.firstName")} *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Ramesh / Sunita"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">{t("register.gender")} *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="MALE">{t("register.male")}</option>
                  <option value="FEMALE">{t("register.female")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">{t("register.dob")} *</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">{t("register.maritalStatus")}</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="NEVER_MARRIED">{t("register.maritalOptions.NEVER_MARRIED")}</option>
                  <option value="DIVORCED">{t("register.maritalOptions.DIVORCED")}</option>
                  <option value="WIDOWED">{t("register.maritalOptions.WIDOWED")}</option>
                  <option value="AWAITING_DIVORCE">{t("register.maritalOptions.AWAITING_DIVORCE")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">{t("register.height")}</label>
                <input
                  type="number"
                  value={formData.heightCm}
                  onChange={(e) => setFormData({ ...formData, heightCm: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">{t("register.state")} *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">{t("register.city")} *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Indore / Agra"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={handleNextStep2}
                className="w-2/3 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
              >
                <span>{t("common.next")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact & OTP Verification */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-stone-800 text-base">{t("register.step3")}</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">{t("register.phone")} *</label>
              <div className="flex space-x-2">
                <span className="inline-flex items-center px-3.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-600 text-sm font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  disabled={otpSent}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="98XXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:bg-stone-50"
                />
                {!otpSent && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || formData.phone.length < 10}
                    className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-medium text-xs rounded-xl transition whitespace-nowrap"
                  >
                    {loading ? t("common.loading") : t("auth.sendOtp")}
                  </button>
                )}
              </div>
            </div>

            {otpSent && (
              <div className="space-y-2 p-4 rounded-xl bg-orange-50/70 border border-orange-200">
                <label className="text-xs font-semibold text-orange-950 block">
                  {t("auth.enterOtp")} ({t("auth.otpSentTo")} +91 {formData.phone})
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.otp}
                    onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 rounded-xl border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base font-mono tracking-widest text-center"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || formData.otp.length !== 6}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                  >
                    {loading ? t("common.loading") : t("common.submit")}
                  </button>
                </div>
                {otpTimer > 0 ? (
                  <p className="text-xs text-orange-700">
                    {t("auth.resendIn")} {otpTimer} {t("auth.seconds")}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-orange-700 font-semibold underline"
                  >
                    {t("auth.resendOtp")}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-stone-700">{t("register.email")} ({t("common.optional")})</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="candidate@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition"
              >
                {t("common.back")}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Community Declaration & DPDP Consent */}
        {step === 4 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-stone-800 text-base">{t("register.step4")}</h3>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.communityDeclaration}
                  onChange={(e) => setFormData({ ...formData, communityDeclaration: e.target.checked })}
                  className="w-5 h-5 mt-0.5 text-orange-600 rounded border-stone-300 focus:ring-orange-500"
                />
                <span className="text-xs sm:text-sm font-medium text-amber-950 leading-relaxed">
                  {t("register.communityDeclaration")}
                </span>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consentTerms}
                  onChange={(e) => setFormData({ ...formData, consentTerms: e.target.checked })}
                  className="w-5 h-5 mt-0.5 text-orange-600 rounded border-stone-300 focus:ring-orange-500"
                />
                <span className="text-xs sm:text-sm font-medium text-amber-950 leading-relaxed">
                  {t("register.dpdpConsent")}
                </span>
              </label>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-1/3 py-3 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={handleSubmitRegistration}
                disabled={loading || !formData.communityDeclaration || !formData.consentTerms}
                className="w-2/3 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 text-white font-semibold rounded-xl shadow-md transition"
              >
                {loading ? t("common.loading") : t("common.submit")}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success & Public ID Confirmation */}
        {step === 5 && registeredProfile && (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-stone-900">{t("register.successTitle")}</h3>
              <p className="text-xs sm:text-sm text-stone-600">{t("register.successMessage")}</p>
              <div className="inline-block px-6 py-2.5 bg-orange-100 text-orange-800 font-mono text-2xl font-extrabold rounded-2xl tracking-widest mt-2 border border-orange-200">
                {registeredProfile.publicId}
              </div>
            </div>

            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              {t("register.pendingReviewNotice")}
            </p>

            <div className="pt-4">
              <Link
                href="/"
                className="inline-block px-8 py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl shadow-sm transition"
              >
                {t("register.goToDashboard")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
