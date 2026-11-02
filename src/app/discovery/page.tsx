"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { VerificationBadges } from "@/components/VerificationBadges";
import {
  Search,
  Filter,
  Heart,
  Bookmark,
  Shield,
  Eye,
  GraduationCap,
  Briefcase,
  MapPin,
  Lock,
  Sparkles,
  Check,
  RefreshCw,
} from "lucide-react";

interface DiscoveryProfile {
  id: string;
  publicId: string;
  firstName: string;
  gender: string;
  age: number;
  heightCm?: number;
  maritalStatus: string;
  state: string;
  city: string;
  subCommunity?: string;
  completionScore: number;
  highestEducation?: string;
  employedIn?: string;
  occupation?: string;
  diet?: string;
  photoKey?: string;
  photoVisibility: string;
  selfieVerified: boolean;
}

export default function DiscoveryPage() {
  const { t } = useTranslation();

  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [gender, setGender] = useState<string>("");
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(45);
  const [state, setState] = useState<string>("");
  const [subCommunity, setSubCommunity] = useState<string>("");

  // Action status state
  const [sentInterests, setSentInterests] = useState<Record<string, boolean>>({});
  const [shortlisted, setShortlisted] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gender) params.append("gender", gender);
      if (minAge) params.append("minAge", minAge.toString());
      if (maxAge) params.append("maxAge", maxAge.toString());
      if (state) params.append("state", state);
      if (subCommunity) params.append("subCommunity", subCommunity);

      const res = await fetch(`/api/discovery?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error("Error fetching discovery profiles:", err);
    } finally {
      setLoading(false);
    }
  }, [gender, minAge, maxAge, state, subCommunity]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSendInterest = async (profileId: string) => {
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProfileId: profileId, action: "SEND" }),
      });
      if (res.ok) {
        setSentInterests((prev) => ({ ...prev, [profileId]: true }));
        showToast("Interest sent with respectful notification!");
      }
    } catch {
      showToast("Error sending interest");
    }
  };

  const handleToggleShortlist = async (profileId: string) => {
    try {
      const res = await fetch("/api/shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProfileId: profileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setShortlisted((prev) => ({ ...prev, [profileId]: data.shortlisted }));
        showToast(data.message);
      }
    } catch {
      showToast("Error updating shortlist");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-8 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-plum text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-gold-600" />
          <span>Pal Matrimony Discovery</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-plum">
          {t("discovery.pageTitle")}
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-light max-w-3xl leading-relaxed">
          {t("discovery.pageSubtitle")}
        </p>

        <div className="pt-3 flex items-center space-x-2 text-xs text-charcoal font-medium">
          <Shield className="w-4 h-4 text-forest flex-shrink-0" />
          <span>{t("discovery.privacyNotice")}</span>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-plum text-ivory text-xs font-bold shadow-xl border border-gold-300 animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl border border-warmgrey p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-plum uppercase">
          <Filter className="w-4 h-4" />
          <span>{t("discovery.filters")}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Gender */}
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">{t("discovery.filterGender")}</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-warmgrey bg-ivory focus:bg-white focus:outline-none focus:ring-1 focus:ring-plum"
            >
              <option value="">{t("discovery.all")}</option>
              <option value="FEMALE">{t("discovery.brides")}</option>
              <option value="MALE">{t("discovery.grooms")}</option>
            </select>
          </div>

          {/* Age Range */}
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">{t("discovery.filterAge")}</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={18}
                max={maxAge}
                value={minAge}
                onChange={(e) => setMinAge(parseInt(e.target.value) || 18)}
                className="w-1/2 px-2.5 py-2 rounded-xl border border-warmgrey bg-ivory text-center"
              />
              <span className="text-charcoal-light">to</span>
              <input
                type="number"
                min={minAge}
                max={70}
                value={maxAge}
                onChange={(e) => setMaxAge(parseInt(e.target.value) || 70)}
                className="w-1/2 px-2.5 py-2 rounded-xl border border-warmgrey bg-ivory text-center"
              />
            </div>
          </div>

          {/* State */}
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">{t("discovery.filterState")}</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-warmgrey bg-ivory focus:bg-white focus:outline-none focus:ring-1 focus:ring-plum"
            >
              <option value="">All Regions</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Delhi-NCR">Delhi-NCR</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Haryana">Haryana</option>
              <option value="Bihar">Bihar</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>
          </div>

          {/* Sub-Community */}
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">{t("discovery.filterSubCommunity")}</label>
            <input
              type="text"
              placeholder="e.g. Dhangar, Baghel"
              value={subCommunity}
              onChange={(e) => setSubCommunity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-warmgrey bg-ivory focus:bg-white focus:outline-none focus:ring-1 focus:ring-plum"
            />
          </div>

          {/* Reset / Search */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setGender("");
                setMinAge(18);
                setMaxAge(45);
                setState("");
                setSubCommunity("");
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-warmgrey text-charcoal-light hover:bg-ivory font-bold text-xs transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex items-center space-x-3 text-plum font-semibold">
            <RefreshCw className="w-5 h-5 animate-spin text-gold" />
            <span>Finding verified community profiles...</span>
          </div>
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-warmgrey p-16 text-center space-y-3 shadow-sm">
          <Search className="w-10 h-10 text-charcoal-light mx-auto" />
          <h3 className="text-base font-bold text-plum">{t("discovery.noProfilesFound")}</h3>
          <p className="text-xs text-charcoal-light max-w-md mx-auto">
            Try adjusting your age or regional filters to discover prospective matrimonial matches.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((p) => {
            const isInterestSent = sentInterests[p.id];
            const isShortlisted = shortlisted[p.id];

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-warmgrey p-6 space-y-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Photo & Identity Header */}
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 rounded-2xl bg-ivory border border-warmgrey flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                      {p.photoVisibility === "PUBLIC_TO_MEMBERS" && p.photoKey ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/icon.svg"
                          alt={p.firstName}
                          className="w-12 h-12 opacity-80"
                        />
                      ) : (
                        <div className="text-center p-2 space-y-1">
                          <Lock className="w-4 h-4 text-plum mx-auto" />
                          <span className="text-[9px] font-bold text-charcoal-light block">
                            Private Photo
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-plum text-lg truncate">
                          {p.firstName}
                        </span>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-plum-50 text-plum">
                          {p.publicId}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-light">
                        {p.age} years • {p.gender === "FEMALE" ? "Bride" : "Groom"}
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-charcoal-light pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />
                        <span className="truncate">{p.city}, {p.state}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="pt-1">
                    <VerificationBadges
                      badges={[
                        {
                          type: "MOBILE_OTP",
                          label: "Mobile Verified",
                          verified: true,
                          description: "Verified via OTP",
                        },
                        {
                          type: "SELFIE",
                          label: "Selfie Verified",
                          verified: p.selfieVerified,
                          description: "Verified by live selfie",
                        },
                      ]}
                      size="sm"
                    />
                  </div>

                  {/* Biodata Summary */}
                  <div className="p-3.5 rounded-2xl bg-ivory border border-warmgrey space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-charcoal">
                      <GraduationCap className="w-3.5 h-3.5 text-plum flex-shrink-0" />
                      <span className="truncate">{p.highestEducation || "Graduate"}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-charcoal">
                      <Briefcase className="w-3.5 h-3.5 text-plum flex-shrink-0" />
                      <span className="truncate">{p.occupation || "Professional"}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-warmgrey space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSendInterest(p.id)}
                      disabled={isInterestSent}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                        isInterestSent
                          ? "bg-forest-50 border border-forest-200 text-forest"
                          : "bg-plum hover:bg-plum-900 text-ivory shadow-xs"
                      }`}
                    >
                      {isInterestSent ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t("discovery.interestSent")}</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-3.5 h-3.5 text-gold-300" />
                          <span>{t("discovery.sendInterest")}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleShortlist(p.id)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border border-warmgrey flex items-center justify-center space-x-1.5 transition ${
                        isShortlisted
                          ? "bg-gold-50 text-gold-800 border-gold-300"
                          : "bg-white text-charcoal hover:bg-ivory"
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isShortlisted ? "text-gold fill-gold" : "text-charcoal-light"}`} />
                      <span>{isShortlisted ? t("discovery.shortlisted") : t("discovery.shortlist")}</span>
                    </button>
                  </div>

                  <Link
                    href={`/discovery/${p.publicId}`}
                    className="w-full py-2 px-3 rounded-xl border border-warmgrey text-charcoal hover:bg-ivory text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-plum" />
                    <span>{t("discovery.viewProfile")}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
