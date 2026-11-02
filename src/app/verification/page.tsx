"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import { VerificationBadges, BadgeInfo } from "@/components/VerificationBadges";
import { compressImageFile } from "@/lib/media/compress-image";
import {
  ShieldCheck,
  Camera,
  Smartphone,
  Award,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
} from "lucide-react";

export default function VerificationPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [badges, setBadges] = useState<BadgeInfo[]>([
    {
      type: "MOBILE_OTP",
      label: "Mobile Verified",
      verified: true,
      description: "Mobile verified via single-use SMS OTP during registration",
    },
    {
      type: "SELFIE",
      label: "Selfie Verified",
      verified: false,
      pending: false,
      description: "Live selfie compared against profile photo by moderators",
    },
    {
      type: "ADMIN_REVIEWED",
      label: "Admin Reviewed",
      verified: false,
      pending: true,
      description: "Community declaration and profile details reviewed by administration",
    },
    {
      type: "OPTIONAL_ID",
      label: "Government ID",
      verified: false,
      available: true,
      description: "Voluntary identity trust check (Aadhaar never mandatory)",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadStatus() {
      try {
        const res = await fetch("/api/verification/status", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.verification?.badges && isMounted) {
            setBadges(data.verification.badges);
          }
        }
      } catch (err) {
        console.error("Failed to load verification status:", err);
      }
    }
    loadStatus();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSubmitSelfie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select or capture a live selfie image first.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const compressed = await compressImageFile(selectedFile, 720, 0.8);

      const res = await fetch("/api/verification/selfie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name || "live_selfie.jpg",
          contentType: compressed.contentType,
          imageBase64: compressed.dataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSuccessMsg(t("verification.pendingReview"));
      setBadges((prev) =>
        prev.map((b) => (b.type === "SELFIE" ? { ...b, pending: true, verified: false } : b))
      );
      setSelectedFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting selfie";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const selfieBadge = badges.find((b) => b.type === "SELFIE");

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-warmgrey p-8 sm:p-10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-plum-50 border border-plum-100 text-plum text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-gold-600" />
              <span>Multi-Tier Trust Framework</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-plum">
              {t("verification.pageTitle")}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-light max-w-2xl leading-relaxed">
              {t("verification.pageSubtitle")}
            </p>
          </div>
        </div>

        {/* Current Badges Preview */}
        <div className="pt-4 border-t border-warmgrey">
          <span className="text-xs font-bold text-plum uppercase tracking-wider block mb-2">
            Active Verified Credentials:
          </span>
          <VerificationBadges badges={badges} size="md" />
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-forest-50 border border-forest-200 text-forest text-xs flex items-center space-x-2.5 font-semibold">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-plum text-xs flex items-center space-x-2.5 font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid of 4 Verification Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier 1: Live Selfie Verification (Actionable) */}
        <div className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-8 space-y-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gold-50 flex items-center justify-center text-gold-700">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-plum text-base">
                    {t("verification.selfieCardTitle")}
                  </h3>
                  <span className="text-[11px] text-charcoal-light font-medium">Tier 2 Trust Marker</span>
                </div>
              </div>

              {selfieBadge?.verified ? (
                <span className="px-2.5 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest text-xs font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              ) : selfieBadge?.pending ? (
                <span className="px-2.5 py-1 rounded-full bg-gold-50 border border-gold-300 text-gold-800 text-xs font-bold flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Review</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-ivory border border-warmgrey text-charcoal-light text-xs font-medium">
                  Not Submitted
                </span>
              )}
            </div>

            <p className="text-xs text-charcoal leading-relaxed">
              {t("verification.selfieCardDesc")}
            </p>

            {/* Guidelines Box */}
            <div className="p-3.5 rounded-2xl bg-ivory border border-warmgrey text-xs space-y-1.5 text-charcoal">
              <span className="font-bold text-plum block">{t("verification.instructionsTitle")}</span>
              <ul className="space-y-1 list-disc list-inside text-charcoal-light text-[11px]">
                <li>{t("verification.inst1")}</li>
                <li>{t("verification.inst2")}</li>
                <li>{t("verification.inst3")}</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          {!selfieBadge?.verified && (
            <form onSubmit={handleSubmitSelfie} className="space-y-4 pt-2">
              <label className="block p-4 border-2 border-dashed border-warmgrey rounded-2xl hover:border-plum text-center cursor-pointer transition bg-ivory">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {previewUrl ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Selfie preview"
                      className="w-24 h-24 object-cover rounded-xl mx-auto border border-warmgrey"
                    />
                    <span className="text-xs text-plum font-semibold block">Click to choose another photo</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-plum mx-auto mb-1" />
                    <span className="text-xs font-bold text-plum block">Upload or Capture Live Selfie</span>
                    <span className="text-[10px] text-charcoal-light">JPEG, PNG, WebP up to 5MB</span>
                  </div>
                )}
              </label>

              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="w-full py-3 px-4 rounded-2xl bg-plum hover:bg-plum-900 text-ivory font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>{loading ? t("verification.uploading") : t("verification.uploadButton")}</span>
              </button>
            </form>
          )}
        </div>

        {/* Tier 2: Mobile OTP Badge */}
        <div className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-8 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-forest-50 flex items-center justify-center text-forest">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-plum text-base">
                    {t("verification.mobileTitle")}
                  </h3>
                  <span className="text-[11px] text-charcoal-light font-medium">Tier 1 Trust Marker</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest text-xs font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            </div>

            <p className="text-xs text-charcoal leading-relaxed">
              {t("verification.mobileDesc")} Every active account on Pal Matrimony has proven mobile ownership through cryptographic OTP challenge.
            </p>

            <div className="p-3.5 rounded-2xl bg-ivory border border-warmgrey text-xs space-y-1">
              <span className="font-bold text-plum block">Security Invariant:</span>
              <p className="text-[11px] text-charcoal-light leading-relaxed">
                Mobile verification is strictly reported as device possession — it is never misrepresented as legal identity verification.
              </p>
            </div>
          </div>
        </div>

        {/* Tier 3: Community & Biodata Review */}
        <div className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-8 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-plum-50 flex items-center justify-center text-plum">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-plum text-base">
                    {t("verification.communityTitle")}
                  </h3>
                  <span className="text-[11px] text-charcoal-light font-medium">Tier 3 Trust Marker</span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-plum-50 border border-plum-200 text-plum text-xs font-bold">
                Moderator Queued
              </span>
            </div>

            <p className="text-xs text-charcoal leading-relaxed">
              {t("verification.communityDesc")} Human moderators verify that candidate biodata maintains respectful language, community alignment, and zero contact leaks.
            </p>

            <div className="p-3.5 rounded-2xl bg-ivory border border-warmgrey text-xs space-y-1">
              <span className="font-bold text-plum block">DPDP Act Compliance:</span>
              <p className="text-[11px] text-charcoal-light leading-relaxed">
                Rejections and approvals are logged in audit trails with documented justification.
              </p>
            </div>
          </div>
        </div>

        {/* Tier 4: Optional Government ID Check */}
        <div className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-8 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-plum">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-plum text-base">
                    {t("verification.idTitle")}
                  </h3>
                  <span className="text-[11px] text-charcoal-light font-medium">Voluntary Trust Marker</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-ivory border border-warmgrey text-charcoal-light text-xs font-semibold">
                Optional
              </span>
            </div>

            <p className="text-xs text-charcoal leading-relaxed">
              {t("verification.idDesc")}
            </p>

            <div className="p-3.5 rounded-2xl bg-ivory border border-warmgrey text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-plum">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero-Retention Policy</span>
              </div>
              <p className="text-[11px] text-charcoal-light leading-relaxed">
                We never store copies of government identity cards. Verification outcomes are recorded as cryptographic attestations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
