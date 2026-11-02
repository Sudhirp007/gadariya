"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { VerificationBadges } from "@/components/VerificationBadges";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Shield,
  Phone,
  Lock,
  Heart,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  FileText,
  Eye,
  MessageCircle,
} from "lucide-react";

export default function CandidateDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const publicId = params.publicId as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interestSent, setInterestSent] = useState(false);
  const [contactRequested, setContactRequested] = useState(false);
  const [biodataRequested, setBiodataRequested] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await fetch(`/api/discovery/${publicId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          if (data.profile?.relationshipState?.interest) {
            setInterestSent(true);
          }
          if (data.profile?.relationshipState?.contactExchange) {
            setContactRequested(true);
          }
          if (data.profile?.relationshipState?.biodataShare) {
            setBiodataRequested(true);
          }
        }
      } catch (err) {
        console.error("Error loading candidate profile:", err);
      } finally {
        setLoading(false);
      }
    }
    if (publicId) loadDetail();
  }, [publicId]);

  const handleSendInterest = async () => {
    if (!profile) return;
    setRequestLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProfileId: profile.id, action: "SEND" }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send interest");
      setInterestSent(true);
      setMsg({ type: "success", text: "Interest sent respectfully!" });
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "Error sending interest";
      setMsg({ type: "error", text: errorText });
    } finally {
      setRequestLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!profile) return;
    setDownloadingPdf(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/biodata/${profile.publicId}/pdf`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to download biodata PDF");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pal_Matrimony_Biodata_${profile.publicId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMsg({ type: "success", text: "Watermarked biodata PDF downloaded successfully." });
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "Error downloading PDF";
      setMsg({ type: "error", text: errorText });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRequestBiodataShare = async () => {
    if (!profile) return;
    setRequestLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/biodata-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPublicId: profile.publicId }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request access");
      setBiodataRequested(true);
      setMsg({ type: "success", text: "Photo & biodata access requested. Awaiting approval." });
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "Error requesting access";
      setMsg({ type: "error", text: errorText });
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRequestContact = async () => {
    if (!profile) return;
    setRequestLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/contact-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverProfileId: profile.id,
          disclosePhone: true,
          discloseEmail: false,
        }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate request");

      setContactRequested(true);
      setMsg({ type: "success", text: data.message });
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "Error initiating contact exchange";
      setMsg({ type: "error", text: errorText });
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="text-xs text-plum font-semibold">Loading candidate biodata...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-plum">Profile Not Available</h2>
        <p className="text-xs text-charcoal-light">
          This profile may not be published or does not exist.
        </p>
        <Link
          href="/discovery"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-plum text-ivory text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discovery</span>
        </Link>
      </div>
    );
  }

  const exchangeState = profile.relationshipState?.contactExchange;
  const isBothApproved = exchangeState?.status === "BOTH_APPROVED";
  const isInterestAccepted = profile.relationshipState?.interest?.status === "ACCEPTED";
  const hasPhotoShareAccess = profile.relationshipState?.biodataShare?.status === "APPROVED";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/discovery"
          className="inline-flex items-center space-x-2 text-xs font-bold text-plum hover:text-plum-900 transition"
        >
          <ArrowLeft className="w-4 h-4 text-gold-600" />
          <span>Back to Matches</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isInterestAccepted ? (
            <Link
              href={`/messages/${profile.publicId}`}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-forest hover:bg-forest-800 text-ivory text-xs font-bold shadow-sm transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Open Encrypted Chat</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSendInterest}
              disabled={interestSent || requestLoading}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition ${
                interestSent
                  ? "bg-forest-50 border border-forest-200 text-forest"
                  : "bg-plum hover:bg-plum-900 text-ivory"
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-gold-300" />
              <span>{interestSent ? t("discovery.interestSent") : t("discovery.sendInterest")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gold-600 hover:bg-gold-700 text-ivory text-xs font-bold shadow-sm transition"
          >
            <FileText className="w-3.5 h-3.5 text-ivory" />
            <span>{downloadingPdf ? "Generating PDF..." : "Download Biodata (PDF)"}</span>
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hero Profile Card */}
      <div className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-warmgrey pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-plum">
                {profile.firstName}
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-plum-50 text-plum border border-plum-100">
                {profile.publicId}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-light">
              {profile.age} years • {profile.gender === "FEMALE" ? "Bride" : "Groom"} • {profile.city}, {profile.state}
            </p>
            {profile.subCommunity && (
              <p className="text-xs text-gold-700 font-semibold">
                Sub-community: {profile.subCommunity}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end space-y-2">
            <VerificationBadges badges={profile.badges || []} size="md" />
          </div>
        </div>

        {/* Notification Banner */}
        {msg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 font-medium ${
              msg.type === "success"
                ? "bg-forest-50 border-forest-200 text-forest"
                : "bg-rose-50 border-rose-200 text-plum"
            }`}
          >
            {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Approved Candidate Photos Gallery (if any) */}
        {profile.photos && profile.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profile.photos.map((ph: any, idx: number) => {
              const canViewClear = ph.hasImage && (ph.visibility === "PUBLIC_TO_MEMBERS" || hasPhotoShareAccess);
              const canViewBlur = ph.hasImage && ph.visibility === "BLURRED" && !hasPhotoShareAccess;
              return (
                <div key={ph.id} className="h-36 rounded-2xl border border-warmgrey bg-ivory overflow-hidden flex items-center justify-center relative">
                  {canViewClear ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/profile/photo/${ph.id}`} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : canViewBlur ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/profile/photo/${ph.id}`} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover blur-md scale-110" />
                  ) : (
                    <div className="text-center p-2">
                      <Lock className="w-5 h-5 text-plum mx-auto" />
                      <span className="text-[10px] text-charcoal-light font-semibold block mt-1">Consent Gated</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Photo & Biodata Privacy Gate */}
        <div className="p-4 rounded-2xl bg-ivory border border-warmgrey flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-warmgrey flex items-center justify-center text-plum flex-shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-plum block">
                Photo & Private Biodata Privacy Gate
              </span>
              <p className="text-[11px] text-charcoal-light">
                {hasPhotoShareAccess
                  ? "Access granted: You are authorized to view full candidate photos and biodata."
                  : "Candidate photos require explicit owner permission to safeguard family privacy."}
              </p>
            </div>
          </div>

          <div>
            {hasPhotoShareAccess ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-forest-50 border border-forest-200 text-forest text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Access Granted</span>
              </span>
            ) : biodataRequested || profile.relationshipState?.biodataShare?.status === "REQUESTED" ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gold-50 border border-gold-200 text-gold-800 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-gold-600" />
                <span>Access Requested</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestBiodataShare}
                disabled={requestLoading}
                className="px-4 py-2 rounded-xl bg-plum hover:bg-plum-900 text-ivory text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-gold-300" />
                <span>Request Photo Access</span>
              </button>
            )}
          </div>
        </div>

        {/* Candidate Bio */}
        {profile.aboutMe && (
          <div className="p-5 rounded-2xl bg-ivory border border-warmgrey space-y-2">
            <span className="text-xs font-bold text-plum uppercase tracking-wider block">
              {t("discovery.aboutCandidate")}
            </span>
            <p className="text-xs sm:text-sm text-charcoal leading-relaxed italic">
              &quot;{profile.aboutMe}&quot;
            </p>
          </div>
        )}

        {/* Education & Career */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-plum uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>Education & Career</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-warmgrey bg-white">
              <span className="text-charcoal-light block text-[11px]">Highest Qualification</span>
              <span className="font-bold text-charcoal">{profile.highestEducation || "Graduate"}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-warmgrey bg-white">
              <span className="text-charcoal-light block text-[11px]">Occupation / Profession</span>
              <span className="font-bold text-charcoal">{profile.occupation || "Working Professional"}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-warmgrey bg-white">
              <span className="text-charcoal-light block text-[11px]">Sector</span>
              <span className="font-bold text-charcoal">{profile.employedIn || "Private"}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-warmgrey bg-white">
              <span className="text-charcoal-light block text-[11px]">Annual Income Range</span>
              <span className="font-bold text-charcoal">{profile.annualIncomeRange || "Disclosed on Mutual Interest"}</span>
            </div>
          </div>
        </div>

        {/* Family Background */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-plum uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>{t("discovery.familyBackground")}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-warmgrey bg-white">
              <span className="text-charcoal-light block text-[11px]">Father&apos;s Occupation</span>
              <span className="font-bold text-charcoal">{profile.fatherOccupation || "Not specified"}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-warmgrey bg-white">
              <span className="text-charcoal-light block text-[11px]">Mother&apos;s Occupation</span>
              <span className="font-bold text-charcoal">{profile.motherOccupation || "Homemaker"}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-warmgrey bg-white">
              <span className="text-charcoal-light block text-[11px]">Family Type & Values</span>
              <span className="font-bold text-charcoal">{profile.familyType || "Nuclear"} ({profile.familyValues || "Moderate"})</span>
            </div>
          </div>
        </div>

        {/* Dual-Approval Bilateral Contact Exchange Box */}
        <div className="p-6 rounded-2xl bg-plum-50 border border-plum-200 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-plum text-ivory flex items-center justify-center">
              <Shield className="w-4 h-4 text-gold-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-plum">
                Bilateral Dual-Approval Contact Exchange
              </h3>
              <p className="text-xs text-charcoal-light">
                {t("discovery.dualApprovalNotice")}
              </p>
            </div>
          </div>

          {isBothApproved ? (
            <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-forest text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Dual Mutual Consent Verified!</span>
              </div>
              <p className="text-charcoal leading-relaxed">
                Both candidates have approved sharing contact information. You can view the disclosed phone number in your Connections tab.
              </p>
              <Link
                href="/connections"
                className="inline-block py-2 px-4 rounded-xl bg-forest text-ivory font-bold text-xs"
              >
                Go to Connections & Contact Info
              </Link>
            </div>
          ) : contactRequested ? (
            <div className="p-4 rounded-xl bg-ivory border border-warmgrey text-xs flex items-center justify-between gap-3 text-charcoal">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gold-600 flex-shrink-0" />
                <span>
                  Contact exchange active. Visit Connections to manage or approve mutual contact sharing.
                </span>
              </div>
              <Link href="/connections" className="px-3 py-1.5 rounded-lg bg-plum text-ivory font-bold text-xs whitespace-nowrap">
                Connections
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestContact}
              disabled={requestLoading}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-plum hover:bg-plum-900 text-ivory font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
            >
              <Phone className="w-3.5 h-3.5 text-gold-300" />
              <span>{requestLoading ? "Initiating..." : t("discovery.requestContact")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
