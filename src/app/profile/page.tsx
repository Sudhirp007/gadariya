"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { compressImageFile } from "@/lib/media/compress-image";
import {
  GraduationCap,
  Users,
  Sliders,
  Camera,
  Shield,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Save,
  UserPlus,
  RefreshCw,
  Upload,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";

interface PhotoRecord {
  id: string;
  storageKey: string;
  visibility: "PUBLIC_TO_MEMBERS" | "BLURRED" | "APPROVAL_REQUIRED";
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  isPrimary?: boolean;
  hasImage?: boolean;
}

interface ManagerRecord {
  id: string;
  phone?: string;
  relation: string;
  status?: string;
  permissions: Record<string, boolean>;
}

interface ProfileData {
  id: string;
  publicId: string;
  firstName: string;
  age: number;
  gender: string;
  dob: string;
  heightCm: number | null;
  maritalStatus: string;
  city: string;
  state: string;
  subCommunity: string;
  publicationStatus: string;
  isDiscoverable: boolean;
  completionScore: number;
  highestEducation: string;
  educationDetail: string;
  employedIn: string;
  occupation: string;
  annualIncomeRange: string;
  diet: string;
  aboutMe: string;
  fatherOccupation: string;
  motherOccupation: string;
  brothersCount: number;
  sistersCount: number;
  familyType: string;
  familyValues: string;
  familyLocation: string;
  aboutFamily: string;
  prefMinAge: number;
  prefMaxAge: number;
  prefMinHeightCm: number;
  prefMaxHeightCm: number;
  prefStates: string[];
  photos: PhotoRecord[];
  managers: ManagerRecord[];
}

type TabType = "biodata" | "family" | "preferences" | "photos" | "managers";

export default function ProfilePage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("biodata");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Manager Invite State
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRelation, setInviteRelation] = useState("FATHER");
  const [managerPermissions, setManagerPermissions] = useState({
    viewBiodata: true,
    editBiodata: false,
    managePreferences: false,
    sendInterests: false,
  });

  // Real Photo Upload State
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoVisibility, setPhotoVisibility] = useState<"APPROVAL_REQUIRED" | "BLURRED" | "PUBLIC_TO_MEMBERS">("APPROVAL_REQUIRED");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadProfile = useCallback(async () => {
    setInitialLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Unable to load your profile from the database.");
      }
      setProfile(data.profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load profile";
      setLoadError(msg);
    } finally {
      setInitialLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const showSuccess = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  const handleSaveProfile = async (silent = false): Promise<boolean> => {
    if (!profile) return false;
    setError(null);
    if (!silent) setSaveSuccess(null);
    setSaving(true);

    try {
      const payload = {
        firstName: profile.firstName,
        heightCm: profile.heightCm,
        maritalStatus: profile.maritalStatus,
        city: profile.city,
        state: profile.state,
        subCommunity: profile.subCommunity,
        isDiscoverable: profile.isDiscoverable,
        highestEducation: profile.highestEducation,
        educationDetail: profile.educationDetail,
        employedIn: profile.employedIn,
        occupation: profile.occupation,
        annualIncomeRange: profile.annualIncomeRange,
        diet: profile.diet,
        aboutMe: profile.aboutMe,
        fatherOccupation: profile.fatherOccupation,
        motherOccupation: profile.motherOccupation,
        brothersCount: profile.brothersCount,
        sistersCount: profile.sistersCount,
        familyType: profile.familyType,
        familyValues: profile.familyValues,
        familyLocation: profile.familyLocation,
        aboutFamily: profile.aboutFamily,
        prefMinAge: profile.prefMinAge,
        prefMaxAge: Math.max(profile.prefMinAge, profile.prefMaxAge),
        prefMinHeightCm: profile.prefMinHeightCm,
        prefMaxHeightCm: Math.max(profile.prefMinHeightCm, profile.prefMaxHeightCm),
        prefStates: profile.prefStates,
      };

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setProfile(data.profile);
      window.dispatchEvent(new Event("pal-auth-changed"));
      if (!silent) showSuccess(t("profile.savedSuccess"));
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile";
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Successive progression: saves current category and smoothly scrolls to next
  const handleSaveAndContinue = async (nextTab: TabType) => {
    const success = await handleSaveProfile(true);
    if (success) {
      setActiveTab(nextTab);
      showSuccess("Details saved! Proceeding to next category.");
      setTimeout(() => {
        const el = document.getElementById(`section-${nextTab}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  };

  const scrollToSection = (tab: TabType) => {
    setActiveTab(tab);
    setTimeout(() => {
      const el = document.getElementById(`section-${tab}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError("Please select a valid JPG, PNG, or WebP image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Selected image exceeds 8MB limit. Please choose a smaller photo.");
      return;
    }

    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhotoFile || !profile) {
      fileInputRef.current?.click();
      return;
    }

    setError(null);
    setUploadingPhoto(true);
    try {
      const { dataUrl, contentType } = await compressImageFile(selectedPhotoFile, 900, 0.82);

      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedPhotoFile.name || "profile_photo.jpg",
          contentType,
          visibility: photoVisibility,
          imageData: dataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Photo upload failed");

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              photos: [data.photo, ...(prev.photos || [])],
            }
          : prev
      );
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showSuccess("Photo uploaded! Pending moderator review before visible to members.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      setError(msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdatePhotoVisibility = async (
    photoId: string,
    newVisibility: "APPROVAL_REQUIRED" | "BLURRED" | "PUBLIC_TO_MEMBERS"
  ) => {
    setError(null);
    try {
      const res = await fetch("/api/profile/photo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, visibility: newVisibility }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update photo visibility");

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              photos: prev.photos.map((p) => (p.id === photoId ? { ...p, ...data.photo } : p)),
            }
          : prev
      );
      showSuccess("Photo privacy updated.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Photo update failed";
      setError(msg);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/profile/photo?photoId=${photoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete photo");

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              photos: prev.photos.filter((p) => p.id !== photoId),
            }
          : prev
      );
      showSuccess("Photo deleted.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete error";
      setError(msg);
    }
  };

  const handleInviteManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invitePhone || invitePhone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number for the family guardian");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: invitePhone,
          relation: inviteRelation,
          permissions: managerPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite manager");

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              managers: [
                ...prev.managers.filter((m) => m.id !== data.invite.id),
                {
                  id: data.invite.id,
                  relation: data.invite.relation,
                  permissions: data.invite.permissions,
                },
              ],
            }
          : prev
      );
      setInvitePhone("");
      showSuccess("Family guardian added successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invitation failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeManager = async (managerId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/profile/managers?managerId=${managerId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke manager");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              managers: prev.managers.filter((m) => m.id !== managerId),
            }
          : prev
      );
      showSuccess("Family guardian access revoked.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Revoke error";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-plum font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-gold" />
          <span>Loading your verified profile...</span>
        </div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-white rounded-3xl border border-warmgrey p-8 shadow-sm space-y-4">
          <AlertCircle className="w-10 h-10 text-plum mx-auto" />
          <h2 className="text-xl font-extrabold text-plum">Could Not Load Profile</h2>
          <p className="text-xs text-charcoal-light">{loadError || "Profile unavailable."}</p>
          <button
            type="button"
            onClick={loadProfile}
            className="px-6 py-2.5 rounded-xl bg-plum hover:bg-plum-900 text-ivory text-xs font-bold shadow-sm transition inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Successive completion flags
  const isBiodataFilled = Boolean(
    profile.firstName && (profile.city || profile.highestEducation || profile.completionScore >= 20)
  );
  const isFamilyFilled = Boolean(
    profile.fatherOccupation || profile.familyType || profile.familyLocation || profile.completionScore >= 45
  );
  const isPreferencesFilled = Boolean(
    profile.prefMinAge && profile.prefMaxAge
  );
  const isPhotosFilled = Boolean(
    profile.photos && profile.photos.length > 0
  );

  // Progressive unlocking rules:
  // Step 1 (biodata) is always unlocked
  // Step 2 (family) unlocks once Step 1 is filled & saved
  // Step 3 (preferences) unlocks once Step 2 is filled & saved
  // Step 4 (photos) unlocks once Step 3 is filled & saved
  // Step 5 (managers) unlocks once Step 4 is reached
  const isFamilyUnlocked = isBiodataFilled || profile.completionScore >= 20;
  const isPreferencesUnlocked = (isFamilyUnlocked && isFamilyFilled) || profile.completionScore >= 45;
  const isPhotosUnlocked = (isPreferencesUnlocked && isPreferencesFilled) || profile.completionScore >= 60;
  const isManagersUnlocked = isPhotosUnlocked || profile.completionScore >= 75;

  const categories: {
    id: TabType;
    label: string;
    icon: any;
    isFilled: boolean;
    isUnlocked: boolean;
    stepNumber: number;
  }[] = [
    {
      id: "biodata",
      label: t("profile.tabBiodata"),
      icon: GraduationCap,
      isFilled: isBiodataFilled,
      isUnlocked: true,
      stepNumber: 1,
    },
    {
      id: "family",
      label: t("profile.tabFamily"),
      icon: Users,
      isFilled: isFamilyFilled,
      isUnlocked: isFamilyUnlocked,
      stepNumber: 2,
    },
    {
      id: "preferences",
      label: t("profile.tabPreferences"),
      icon: Sliders,
      isFilled: isPreferencesFilled,
      isUnlocked: isPreferencesUnlocked,
      stepNumber: 3,
    },
    {
      id: "photos",
      label: `${t("profile.tabPhotos")} (${profile.photos?.length || 0})`,
      icon: Camera,
      isFilled: isPhotosFilled,
      isUnlocked: isPhotosUnlocked,
      stepNumber: 4,
    },
    {
      id: "managers",
      label: t("profile.tabManagers"),
      icon: Shield,
      isFilled: (profile.managers?.length || 0) > 0,
      isUnlocked: isManagersUnlocked,
      stepNumber: 5,
    },
  ];

  const currentCategoryIndex = categories.findIndex((c) => c.id === activeTab);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Top Banner & Profile Overview */}
      <div className="bg-white rounded-3xl border border-warmgrey shadow-sm p-5 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-warmgrey pb-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-plum">
                {profile.firstName} ({profile.age} {locale === "hi" ? "वर्ष" : "yrs"})
              </h1>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold-100 text-plum-900 border border-gold-300">
                {profile.publicationStatus}
              </span>
            </div>
            <p className="text-xs text-charcoal-light flex flex-wrap items-center gap-2">
              <span>{t("profile.publicIdLabel")}:</span>
              <span className="font-mono font-bold text-plum bg-ivory px-2 py-0.5 rounded border border-warmgrey">
                {profile.publicId}
              </span>
              <span>• {profile.city}, {profile.state}</span>
              {profile.subCommunity && <span>• {profile.subCommunity}</span>}
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSaveProfile()}
              disabled={saving}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4 text-gold-300" />
              <span>{saving ? t("common.loading") : t("common.save")}</span>
            </button>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-charcoal">
            <span className="text-plum">{t("profile.completionScore")}</span>
            <span className="text-gold-700 font-bold">{profile.completionScore}%</span>
          </div>
          <div className="w-full bg-ivory rounded-full h-3 overflow-hidden border border-warmgrey">
            <div
              className="bg-gradient-to-r from-plum to-gold-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${profile.completionScore}%` }}
            ></div>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-forest text-xs flex items-center space-x-2 font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Non-Horizontal Step Progress Indicator (Mobile Friendly & Adaptive) */}
        <div className="border-t border-warmgrey pt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-plum flex items-center space-x-1.5">
              <span>Category {currentCategoryIndex + 1} of 5:</span>
              <span className="text-gold-700 font-extrabold">{categories[currentCategoryIndex]?.label}</span>
            </span>
            <span className="text-charcoal-light text-[11px] hidden sm:inline">
              Tap any unlocked category to jump directly
            </span>
          </div>

          {/* 5 Step Progress Buttons (Never scrolls horizontally, fully fits mobile) */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {categories.map((cat) => {
              const isCurrent = activeTab === cat.id;
              const isClickable = cat.isUnlocked;

              return (
                <button
                  key={cat.id}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => scrollToSection(cat.id)}
                  className={`p-2 rounded-xl text-center flex flex-col items-center justify-center transition border ${
                    isCurrent
                      ? "bg-plum text-white border-plum shadow-sm"
                      : cat.isFilled
                      ? "bg-forest-50 text-forest border-forest-200 hover:bg-forest-100"
                      : isClickable
                      ? "bg-ivory text-charcoal border-warmgrey hover:bg-rose-50"
                      : "bg-gray-100 text-gray-400 border-gray-200 opacity-60 cursor-not-allowed"
                  }`}
                  title={cat.label}
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mb-1">
                    {cat.isFilled ? (
                      <Check className="w-3.5 h-3.5 text-forest" />
                    ) : !isClickable ? (
                      <Lock className="w-3 h-3 text-gray-400" />
                    ) : (
                      <span>{cat.stepNumber}</span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold leading-tight line-clamp-1 truncate max-w-full">
                    {cat.label.split("&")[0].trim()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Successive Category Cards Container */}
      <div className="space-y-6">
        {/* Category 1: Career & Education */}
        <section
          id="section-biodata"
          className="bg-white rounded-3xl border border-warmgrey shadow-sm overflow-hidden transition-all duration-200"
        >
          {/* Card Header */}
          <div
            onClick={() => setActiveTab(activeTab === "biodata" ? "biodata" : "biodata")}
            className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition border-b border-warmgrey"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition ${
                  isBiodataFilled
                    ? "bg-forest-50 text-forest border border-forest-200"
                    : activeTab === "biodata"
                    ? "bg-plum text-white"
                    : "bg-ivory text-charcoal"
                }`}
              >
                {isBiodataFilled ? <Check className="w-5 h-5 text-forest" /> : 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-plum">
                    1. {t("profile.tabBiodata")}
                  </h2>
                  {isBiodataFilled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-50 text-forest border border-forest-200">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-xs text-charcoal-light">
                  {profile.firstName
                    ? `${profile.firstName} • ${profile.highestEducation || "Education pending"} • ${profile.city || ""}`
                    : "Candidate's personal information, qualification, and career"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {activeTab === "biodata" ? (
                <ChevronUp className="w-5 h-5 text-plum" />
              ) : (
                <ChevronDown className="w-5 h-5 text-charcoal-light" />
              )}
            </div>
          </div>

          {/* Card Content (Visible when active) */}
          {activeTab === "biodata" && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("register.firstName")} *</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.height")}</label>
                  <input
                    type="number"
                    min={100}
                    max={250}
                    value={profile.heightCm ?? ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        heightCm: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="e.g. 171"
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.maritalStatus")}</label>
                  <select
                    value={profile.maritalStatus}
                    onChange={(e) => setProfile({ ...profile, maritalStatus: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm bg-white"
                  >
                    <option value="NEVER_MARRIED">{t("profile.neverMarried")}</option>
                    <option value="DIVORCED">{t("profile.divorced")}</option>
                    <option value="WIDOWED">{t("profile.widowed")}</option>
                    <option value="AWAITING_DIVORCE">{t("profile.awaitingDivorce")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("register.city")}</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("register.state")}</label>
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("register.subCommunity")}</label>
                  <input
                    type="text"
                    value={profile.subCommunity}
                    onChange={(e) => setProfile({ ...profile, subCommunity: e.target.value })}
                    placeholder="e.g. Holkar, Nikhar, Dhangar"
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-warmgrey">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.education")}</label>
                  <input
                    type="text"
                    value={profile.highestEducation}
                    onChange={(e) => setProfile({ ...profile, highestEducation: e.target.value })}
                    placeholder="e.g. B.Tech, MBA, M.Sc."
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.educationDetail")}</label>
                  <input
                    type="text"
                    value={profile.educationDetail}
                    onChange={(e) => setProfile({ ...profile, educationDetail: e.target.value })}
                    placeholder="e.g. IIT Delhi, Lucknow University"
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.employedIn")}</label>
                  <select
                    value={profile.employedIn}
                    onChange={(e) => setProfile({ ...profile, employedIn: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm bg-white"
                  >
                    <option value="">Select Employment Sector</option>
                    <option value="PRIVATE">Private Sector</option>
                    <option value="GOVERNMENT">Government / PSU</option>
                    <option value="BUSINESS">Business / Self-Employed</option>
                    <option value="DEFENCE">Defence / Civil Services</option>
                    <option value="NOT_WORKING">Student / Not Working</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.occupation")}</label>
                  <input
                    type="text"
                    value={profile.occupation}
                    onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                    placeholder="e.g. Civil Engineer, Teacher"
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.annualIncome")}</label>
                  <input
                    type="text"
                    value={profile.annualIncomeRange}
                    onChange={(e) => setProfile({ ...profile, annualIncomeRange: e.target.value })}
                    placeholder="e.g. Rs. 10 Lakh - 15 Lakh"
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.diet")}</label>
                  <select
                    value={profile.diet}
                    onChange={(e) => setProfile({ ...profile, diet: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm bg-white"
                  >
                    <option value="">Select Dietary Preference</option>
                    <option value="VEGETARIAN">Vegetarian</option>
                    <option value="EGGETARIAN">Eggetarian</option>
                    <option value="NON_VEGETARIAN">Non-Vegetarian</option>
                    <option value="JAIN">Jain</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-charcoal">{t("profile.aboutMe")}</label>
                  <span className="text-[11px] text-charcoal-light flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-gold" />
                    <span>AI PII Guard Protected</span>
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={profile.aboutMe}
                  onChange={(e) => setProfile({ ...profile, aboutMe: e.target.value })}
                  placeholder="Share a brief, respectful introduction about education, values, and aspirations..."
                  className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                />
                <p className="text-[11px] text-charcoal-light">
                  Note: Phone numbers, email addresses, and residential addresses are prohibited in public bio text.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2.5 text-xs font-semibold text-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.isDiscoverable}
                    onChange={(e) => setProfile({ ...profile, isDiscoverable: e.target.checked })}
                    className="rounded text-plum focus:ring-plum"
                  />
                  <span>Show my profile in Discovery search once approved by Admin</span>
                </label>
              </div>

              {/* Bottom Action Bar: Save & Successive Advance to Family Details */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-warmgrey">
                <button
                  type="button"
                  onClick={() => handleSaveProfile()}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-ivory hover:bg-rose-50 text-plum border border-warmgrey font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4 text-gold-600" />
                  <span>{saving ? t("common.loading") : t("common.save")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAndContinue("family")}
                  disabled={saving}
                  className="w-full sm:w-auto px-7 py-3 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                >
                  <span>Save & Continue to Family Details</span>
                  <ArrowRight className="w-4 h-4 text-gold-300" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Category 2: Family Details */}
        <section
          id="section-family"
          className="bg-white rounded-3xl border border-warmgrey shadow-sm overflow-hidden transition-all duration-200"
        >
          {!isFamilyUnlocked ? (
            /* Locked State */
            <div className="p-5 sm:p-6 flex items-center justify-between bg-ivory/50 opacity-70">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-warmgrey/50 text-charcoal-light flex items-center justify-center font-bold text-sm">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-charcoal-light">
                    2. {t("profile.tabFamily")}
                  </h2>
                  <p className="text-xs text-charcoal-light">
                    Complete & save Career & Education above to unlock Family Details
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-charcoal-light bg-warmgrey/40 px-2.5 py-1 rounded-lg">
                Locked
              </span>
            </div>
          ) : (
            /* Unlocked State */
            <>
              <div
                onClick={() => scrollToSection("family")}
                className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition border-b border-warmgrey"
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition ${
                      isFamilyFilled
                        ? "bg-forest-50 text-forest border border-forest-200"
                        : activeTab === "family"
                        ? "bg-plum text-white"
                        : "bg-ivory text-charcoal"
                    }`}
                  >
                    {isFamilyFilled ? <Check className="w-5 h-5 text-forest" /> : 2}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-plum">
                        2. {t("profile.tabFamily")}
                      </h2>
                      {isFamilyFilled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-50 text-forest border border-forest-200">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-light">
                      {profile.familyLocation
                        ? `${profile.familyType || "Family"} • ${profile.familyLocation}`
                        : "Parents' background, siblings, values and native origin"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {activeTab === "family" ? (
                    <ChevronUp className="w-5 h-5 text-plum" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-charcoal-light" />
                  )}
                </div>
              </div>

              {activeTab === "family" && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.fatherOccupation")}</label>
                      <input
                        type="text"
                        value={profile.fatherOccupation}
                        onChange={(e) => setProfile({ ...profile, fatherOccupation: e.target.value })}
                        placeholder="e.g. Government Officer, Farmer, Business"
                        className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.motherOccupation")}</label>
                      <input
                        type="text"
                        value={profile.motherOccupation}
                        onChange={(e) => setProfile({ ...profile, motherOccupation: e.target.value })}
                        placeholder="e.g. Homemaker, Teacher"
                        className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.brothersCount")}</label>
                      <input
                        type="number"
                        min={0}
                        value={profile.brothersCount}
                        onChange={(e) => setProfile({ ...profile, brothersCount: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.sistersCount")}</label>
                      <input
                        type="number"
                        min={0}
                        value={profile.sistersCount}
                        onChange={(e) => setProfile({ ...profile, sistersCount: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.familyType")}</label>
                      <select
                        value={profile.familyType}
                        onChange={(e) => setProfile({ ...profile, familyType: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm bg-white"
                      >
                        <option value="">Select Family Type</option>
                        <option value="NUCLEAR">Nuclear (एकल परिवार)</option>
                        <option value="JOINT">Joint (संयुक्त परिवार)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.familyValues")}</label>
                      <select
                        value={profile.familyValues}
                        onChange={(e) => setProfile({ ...profile, familyValues: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm bg-white"
                      >
                        <option value="">Select Family Values</option>
                        <option value="TRADITIONAL">Traditional</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="LIBERAL">Progressive / Liberal</option>
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.familyLocation")}</label>
                      <input
                        type="text"
                        value={profile.familyLocation}
                        onChange={(e) => setProfile({ ...profile, familyLocation: e.target.value })}
                        placeholder="e.g. Dibiyapur, Auraiya, Uttar Pradesh"
                        className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-semibold text-charcoal">{t("profile.aboutFamily")}</label>
                    <textarea
                      rows={3}
                      value={profile.aboutFamily}
                      onChange={(e) => setProfile({ ...profile, aboutFamily: e.target.value })}
                      placeholder="Brief overview of family heritage and values..."
                      className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
                    />
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-warmgrey">
                    <button
                      type="button"
                      onClick={() => scrollToSection("biodata")}
                      className="w-full sm:w-auto px-5 py-2.5 bg-ivory hover:bg-rose-50 text-plum border border-warmgrey font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Career & Education</span>
                    </button>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleSaveProfile()}
                        disabled={saving}
                        className="w-full sm:w-auto px-5 py-2.5 bg-ivory hover:bg-rose-50 text-plum border border-warmgrey font-semibold text-xs rounded-xl transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAndContinue("preferences")}
                        disabled={saving}
                        className="w-full sm:w-auto px-7 py-3 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                      >
                        <span>Save & Continue to Partner Preferences</span>
                        <ArrowRight className="w-4 h-4 text-gold-300" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Category 3: Partner Preferences */}
        <section
          id="section-preferences"
          className="bg-white rounded-3xl border border-warmgrey shadow-sm overflow-hidden transition-all duration-200"
        >
          {!isPreferencesUnlocked ? (
            /* Locked State */
            <div className="p-5 sm:p-6 flex items-center justify-between bg-ivory/50 opacity-70">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-warmgrey/50 text-charcoal-light flex items-center justify-center font-bold text-sm">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-charcoal-light">
                    3. {t("profile.tabPreferences")}
                  </h2>
                  <p className="text-xs text-charcoal-light">
                    Complete & save Family Details above to unlock Partner Preferences
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-charcoal-light bg-warmgrey/40 px-2.5 py-1 rounded-lg">
                Locked
              </span>
            </div>
          ) : (
            /* Unlocked State */
            <>
              <div
                onClick={() => scrollToSection("preferences")}
                className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition border-b border-warmgrey"
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition ${
                      isPreferencesFilled
                        ? "bg-forest-50 text-forest border border-forest-200"
                        : activeTab === "preferences"
                        ? "bg-plum text-white"
                        : "bg-ivory text-charcoal"
                    }`}
                  >
                    {isPreferencesFilled ? <Check className="w-5 h-5 text-forest" /> : 3}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-plum">
                        3. {t("profile.tabPreferences")}
                      </h2>
                      {isPreferencesFilled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-50 text-forest border border-forest-200">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-light">
                      Age: {profile.prefMinAge}-{profile.prefMaxAge} yrs • Height: {profile.prefMinHeightCm}-{profile.prefMaxHeightCm} cm
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {activeTab === "preferences" ? (
                    <ChevronUp className="w-5 h-5 text-plum" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-charcoal-light" />
                  )}
                </div>
              </div>

              {activeTab === "preferences" && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.prefAge")}</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={18}
                          max={80}
                          value={profile.prefMinAge}
                          onChange={(e) => setProfile({ ...profile, prefMinAge: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-warmgrey text-sm"
                          placeholder="Min"
                        />
                        <span className="text-charcoal">-</span>
                        <input
                          type="number"
                          min={18}
                          max={80}
                          value={profile.prefMaxAge}
                          onChange={(e) => setProfile({ ...profile, prefMaxAge: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-warmgrey text-sm"
                          placeholder="Max"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal">{t("profile.prefHeight")}</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={100}
                          max={250}
                          value={profile.prefMinHeightCm}
                          onChange={(e) => setProfile({ ...profile, prefMinHeightCm: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-warmgrey text-sm"
                          placeholder="Min cm"
                        />
                        <span className="text-charcoal">-</span>
                        <input
                          type="number"
                          min={100}
                          max={250}
                          value={profile.prefMaxHeightCm}
                          onChange={(e) => setProfile({ ...profile, prefMaxHeightCm: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-warmgrey text-sm"
                          placeholder="Max cm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-warmgrey">
                    <button
                      type="button"
                      onClick={() => scrollToSection("family")}
                      className="w-full sm:w-auto px-5 py-2.5 bg-ivory hover:bg-rose-50 text-plum border border-warmgrey font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Family Details</span>
                    </button>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleSaveProfile()}
                        disabled={saving}
                        className="w-full sm:w-auto px-5 py-2.5 bg-ivory hover:bg-rose-50 text-plum border border-warmgrey font-semibold text-xs rounded-xl transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAndContinue("photos")}
                        disabled={saving}
                        className="w-full sm:w-auto px-7 py-3 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                      >
                        <span>Save & Continue to Photos</span>
                        <ArrowRight className="w-4 h-4 text-gold-300" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Category 4: Private Photos */}
        <section
          id="section-photos"
          className="bg-white rounded-3xl border border-warmgrey shadow-sm overflow-hidden transition-all duration-200"
        >
          {!isPhotosUnlocked ? (
            /* Locked State */
            <div className="p-5 sm:p-6 flex items-center justify-between bg-ivory/50 opacity-70">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-warmgrey/50 text-charcoal-light flex items-center justify-center font-bold text-sm">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-charcoal-light">
                    4. {t("profile.tabPhotos")}
                  </h2>
                  <p className="text-xs text-charcoal-light">
                    Complete previous sections to unlock private photos
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-charcoal-light bg-warmgrey/40 px-2.5 py-1 rounded-lg">
                Locked
              </span>
            </div>
          ) : (
            /* Unlocked State */
            <>
              <div
                onClick={() => scrollToSection("photos")}
                className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition border-b border-warmgrey"
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition ${
                      isPhotosFilled
                        ? "bg-forest-50 text-forest border border-forest-200"
                        : activeTab === "photos"
                        ? "bg-plum text-white"
                        : "bg-ivory text-charcoal"
                    }`}
                  >
                    {isPhotosFilled ? <Check className="w-5 h-5 text-forest" /> : 4}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-plum">
                        4. {t("profile.tabPhotos")} ({profile.photos?.length || 0})
                      </h2>
                      {isPhotosFilled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-50 text-forest border border-forest-200">
                          {profile.photos.length} uploaded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-light">
                      Upload verified photos with granular privacy and consent options
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {activeTab === "photos" ? (
                    <ChevronUp className="w-5 h-5 text-plum" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-charcoal-light" />
                  )}
                </div>
              </div>

              {activeTab === "photos" && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="p-6 rounded-2xl border-2 border-dashed border-warmgrey bg-ivory text-center space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoFileSelect}
                      className="hidden"
                      data-testid="profile-photo-file-input"
                    />

                    {photoPreviewUrl ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreviewUrl}
                          alt="Selected preview"
                          className="w-32 h-32 object-cover rounded-2xl mx-auto border-2 border-gold shadow-sm"
                        />
                        <p className="text-xs font-bold text-plum">
                          {selectedPhotoFile?.name} ({Math.round((selectedPhotoFile?.size || 0) / 1024)} KB)
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-plum underline font-semibold"
                        >
                          Choose a different image
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer space-y-2 py-2"
                      >
                        <Camera className="w-10 h-10 text-gold mx-auto" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-plum">{t("profile.photoUpload")}</p>
                          <p className="text-xs text-charcoal-light">
                            Click to select a JPG, PNG, or WebP photo from your phone or computer (up to 8MB).
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="max-w-xs mx-auto space-y-2 text-left">
                      <label className="text-xs font-semibold text-charcoal block">{t("profile.photoVisibility")}</label>
                      <select
                        value={photoVisibility}
                        onChange={(e) => setPhotoVisibility(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-warmgrey text-xs bg-white"
                      >
                        <option value="APPROVAL_REQUIRED">{t("profile.visibilityOptions.APPROVAL_REQUIRED")}</option>
                        <option value="BLURRED">{t("profile.visibilityOptions.BLURRED")}</option>
                        <option value="PUBLIC_TO_MEMBERS">{t("profile.visibilityOptions.PUBLIC_TO_MEMBERS")}</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="px-4 py-2.5 bg-white hover:bg-rose-50 border border-warmgrey text-plum font-semibold text-xs rounded-xl shadow-xs transition inline-flex items-center space-x-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Select Photo</span>
                      </button>

                      {selectedPhotoFile && (
                        <button
                          type="button"
                          onClick={handlePhotoUpload}
                          disabled={uploadingPhoto}
                          className="px-6 py-2.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold text-xs rounded-xl shadow-sm transition inline-flex items-center space-x-1.5"
                        >
                          <Camera className="w-3.5 h-3.5 text-gold-300" />
                          <span>{uploadingPhoto ? "Uploading..." : "Upload Selected Photo"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Photos Grid */}
                  {profile.photos?.length === 0 ? (
                    <p className="text-xs text-charcoal-light text-center py-4">
                      No photos uploaded yet. Select a photo above to add it to your private gallery.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                      {profile.photos?.map((p, idx) => (
                        <div key={p.id} className="p-3 rounded-2xl border border-warmgrey bg-ivory space-y-2.5">
                          <div className="h-40 bg-rose-100 rounded-xl flex items-center justify-center text-plum font-bold text-xs relative overflow-hidden">
                            {p.hasImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/profile/photo/${p.id}`}
                                alt={`Photo ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Lock className="w-6 h-6 text-plum-600 opacity-60" />
                            )}
                            {p.isPrimary && (
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] bg-plum text-gold-300 font-bold flex items-center space-x-1">
                                <Star className="w-2.5 h-2.5 fill-gold-300" />
                                <span>Primary</span>
                              </span>
                            )}
                            <span
                              className={`absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded text-[10px] font-bold shadow-xs ${
                                p.moderationStatus === "APPROVED"
                                  ? "bg-forest text-white"
                                  : p.moderationStatus === "REJECTED"
                                  ? "bg-red-600 text-white"
                                  : "bg-gold-100 text-plum-950 border border-gold-300"
                              }`}
                            >
                              {p.moderationStatus}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <select
                              value={p.visibility}
                              onChange={(e) => handleUpdatePhotoVisibility(p.id, e.target.value as any)}
                              className="w-full px-2 py-1.5 rounded-lg border border-warmgrey text-[11px] bg-white text-charcoal font-medium"
                            >
                              <option value="APPROVAL_REQUIRED">Consent Required</option>
                              <option value="BLURRED">Blurred Preview</option>
                              <option value="PUBLIC_TO_MEMBERS">Visible to Members</option>
                            </select>

                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[11px] font-semibold text-charcoal">Photo #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(p.id)}
                                className="text-[11px] text-red-700 hover:text-red-900 font-semibold inline-flex items-center space-x-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-warmgrey">
                    <button
                      type="button"
                      onClick={() => scrollToSection("preferences")}
                      className="w-full sm:w-auto px-5 py-2.5 bg-ivory hover:bg-rose-50 text-plum border border-warmgrey font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Preferences</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollToSection("managers")}
                      className="w-full sm:w-auto px-7 py-3 bg-plum hover:bg-plum-800 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                    >
                      <span>Continue to Family Guardians</span>
                      <ArrowRight className="w-4 h-4 text-gold-300" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Category 5: Family Guardians (Managers Delegation) */}
        <section
          id="section-managers"
          className="bg-white rounded-3xl border border-warmgrey shadow-sm overflow-hidden transition-all duration-200"
        >
          {!isManagersUnlocked ? (
            /* Locked State */
            <div className="p-5 sm:p-6 flex items-center justify-between bg-ivory/50 opacity-70">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-warmgrey/50 text-charcoal-light flex items-center justify-center font-bold text-sm">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-charcoal-light">
                    5. {t("profile.tabManagers")}
                  </h2>
                  <p className="text-xs text-charcoal-light">
                    Complete previous sections to unlock family delegation
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-charcoal-light bg-warmgrey/40 px-2.5 py-1 rounded-lg">
                Locked
              </span>
            </div>
          ) : (
            /* Unlocked State */
            <>
              <div
                onClick={() => scrollToSection("managers")}
                className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition border-b border-warmgrey"
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition ${
                      (profile.managers?.length || 0) > 0
                        ? "bg-forest-50 text-forest border border-forest-200"
                        : activeTab === "managers"
                        ? "bg-plum text-white"
                        : "bg-ivory text-charcoal"
                    }`}
                  >
                    {(profile.managers?.length || 0) > 0 ? <Check className="w-5 h-5 text-forest" /> : 5}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-plum">
                        5. {t("profile.tabManagers")}
                      </h2>
                      <span className="text-xs text-charcoal-light bg-ivory border border-warmgrey px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-light">
                      Add trusted family guardians to help manage interests with scoped permissions
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {activeTab === "managers" ? (
                    <ChevronUp className="w-5 h-5 text-plum" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-charcoal-light" />
                  )}
                </div>
              </div>

              {activeTab === "managers" && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="p-4 rounded-2xl bg-plum-50 border border-plum-200 text-plum-950 text-xs flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-plum flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">
                      {t("profile.managerWarning")}
                    </span>
                  </div>

                  <form onSubmit={handleInviteManager} className="space-y-4 p-5 rounded-2xl border border-warmgrey bg-ivory">
                    <h4 className="text-xs font-bold text-plum uppercase tracking-wider">{t("profile.inviteManager")}</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-charcoal">{t("profile.managerPhone")} *</label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={invitePhone}
                          onChange={(e) => setInvitePhone(e.target.value)}
                          placeholder="98XXXXXXXX"
                          className="w-full px-4 py-2 rounded-xl border border-warmgrey text-sm bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-charcoal">{t("profile.managerRelation")}</label>
                        <select
                          value={inviteRelation}
                          onChange={(e) => setInviteRelation(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-warmgrey text-sm bg-white"
                        >
                          <option value="FATHER">Father (पिता)</option>
                          <option value="MOTHER">Mother (माता)</option>
                          <option value="BROTHER">Brother (भाई)</option>
                          <option value="SISTER">Sister (बहन)</option>
                          <option value="RELATIVE">Guardian / Relative (अभिभावक)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-warmgrey">
                      <span className="text-xs font-semibold text-charcoal block">Assigned Permissions</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={managerPermissions.viewBiodata}
                            onChange={(e) => setManagerPermissions({ ...managerPermissions, viewBiodata: e.target.checked })}
                            className="rounded text-plum focus:ring-plum"
                          />
                          <span>Can view profile details</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={managerPermissions.editBiodata}
                            onChange={(e) => setManagerPermissions({ ...managerPermissions, editBiodata: e.target.checked })}
                            className="rounded text-plum focus:ring-plum"
                          />
                          <span>Can edit non-critical biodata</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={managerPermissions.managePreferences}
                            onChange={(e) => setManagerPermissions({ ...managerPermissions, managePreferences: e.target.checked })}
                            className="rounded text-plum focus:ring-plum"
                          />
                          <span>Can manage partner preferences</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={managerPermissions.sendInterests}
                            onChange={(e) => setManagerPermissions({ ...managerPermissions, sendInterests: e.target.checked })}
                            className="rounded text-plum focus:ring-plum"
                          />
                          <span>Can send and respond to interests</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center space-x-2"
                    >
                      <UserPlus className="w-4 h-4 text-gold-300" />
                      <span>{t("profile.inviteManager")}</span>
                    </button>
                  </form>

                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-plum uppercase tracking-wider">Active Family Guardians</h4>
                    {profile.managers?.length === 0 ? (
                      <p className="text-xs text-charcoal-light py-2">No family guardians added yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {profile.managers?.map((m) => (
                          <div key={m.id} className="p-4 rounded-xl border border-warmgrey flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-plum">{m.relation}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded bg-forest-50 text-forest font-semibold">Active</span>
                              <button
                                type="button"
                                onClick={() => handleRevokeManager(m.id)}
                                className="px-2 py-0.5 rounded bg-rose-50 text-plum hover:bg-rose-100 font-medium transition"
                              >
                                Revoke
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-warmgrey">
                    <button
                      type="button"
                      onClick={() => scrollToSection("photos")}
                      className="w-full sm:w-auto px-5 py-2.5 bg-ivory hover:bg-rose-50 text-plum border border-warmgrey font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Photos</span>
                    </button>

                    <Link
                      href="/discovery"
                      className="w-full sm:w-auto px-7 py-3 bg-plum hover:bg-plum-800 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4 text-gold-300" />
                      <span>{locale === "hi" ? "सुयोग्य रिश्ते देखें" : "Explore Community Matches"}</span>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
