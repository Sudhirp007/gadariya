"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/context";
import {
  GraduationCap,
  Users,
  Sliders,
  Camera,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  Sparkles,
  Save,
  Send,
  UserPlus,
} from "lucide-react";

export default function ProfilePage() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"biodata" | "family" | "preferences" | "photos" | "managers">("biodata");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile Form State
  const [profile, setProfile] = useState({
    publicId: "PAL100001",
    firstName: "राजेश",
    age: 28,
    gender: "MALE",
    city: "Agra",
    state: "Uttar Pradesh",
    publicationStatus: "PENDING_REVIEW",
    isDiscoverable: true,
    completionScore: 65,
    // Biodata
    highestEducation: "B.Tech in Computer Science",
    educationDetail: "AKTU University",
    employedIn: "PRIVATE",
    occupation: "Software Engineer",
    annualIncomeRange: "₹10 Lakh - ₹15 Lakh",
    diet: "VEGETARIAN",
    aboutMe: "साधारण एवं संस्कारवान परिवार से। आधुनिक विचारों के साथ पारिवारिक मूल्यों में विश्वास।",
    // Family
    fatherOccupation: "Government Employee (Retired)",
    motherOccupation: "Homemaker",
    brothersCount: 1,
    sistersCount: 1,
    familyType: "NUCLEAR",
    familyValues: "MODERATE",
    familyLocation: "Agra, Uttar Pradesh",
    aboutFamily: "पारिवारिक प्रतिष्ठा एवं उच्च नैतिक मूल्यों वाला परिवार।",
    // Preferences
    prefMinAge: 23,
    prefMaxAge: 27,
    prefMinHeightCm: 155,
    prefMaxHeightCm: 170,
    prefStates: ["Uttar Pradesh", "Delhi-NCR", "Madhya Pradesh"],
    // Photos
    photos: [
      {
        id: "photo-01",
        storageKey: "photos/prof-001/primary.jpg",
        visibility: "APPROVAL_REQUIRED",
        moderationStatus: "APPROVED",
      },
    ],
    // Managers
    managers: [] as Array<{ id: string; phone: string; relation: string; permissions: Record<string, boolean> }>,
  });

  // Manager Invite State
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRelation, setInviteRelation] = useState("FATHER");
  const [managerPermissions, setManagerPermissions] = useState({
    viewBiodata: true,
    editBiodata: false,
    managePreferences: false,
    sendInterests: false,
  });

  // Photo Upload State
  const [photoVisibility, setPhotoVisibility] = useState("APPROVAL_REQUIRED");

  // Load real profile from database on mount
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile && isMounted) {
            setProfile((prev) => ({
              ...prev,
              ...data.profile,
              photos: data.profile.photos || prev.photos,
              managers: data.profile.managers || prev.managers,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async () => {
    setError(null);
    setSaveSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setProfile(data.profile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invitePhone || invitePhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number for the family guardian");
      return;
    }

    setLoading(true);
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

      setProfile((prev) => ({
        ...prev,
        managers: [
          ...prev.managers,
          {
            id: data.invite.id,
            phone: data.invite.managerPhone,
            relation: data.invite.relation,
            permissions: data.invite.permissions,
          },
        ],
      }));
      setInvitePhone("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invitation failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUploadSim = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "profile_photo.jpg",
          contentType: "image/jpeg",
          visibility: photoVisibility,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Photo upload failed");

      setProfile((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), data.photo],
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeManager = async (managerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/managers?managerId=${managerId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke manager");
      setProfile((prev) => ({
        ...prev,
        managers: prev.managers.filter((m) => m.id !== managerId),
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Revoke error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Top Banner & Profile Overview */}
      <div className="bg-white rounded-3xl border border-warmgrey shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-warmgrey pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-plum">
                {profile.firstName} ({profile.age} वर्ष)
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gold-100 text-plum-900 border border-gold-300">
                {profile.publicationStatus}
              </span>
            </div>
            <p className="text-xs text-charcoal-light flex items-center space-x-2">
              <span>{t("profile.publicIdLabel")}:</span>
              <span className="font-mono font-bold text-plum bg-ivory px-2.5 py-0.5 rounded border border-warmgrey">
                {profile.publicId}
              </span>
              <span>• {profile.city}, {profile.state}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4 text-gold-300" />
              <span>{loading ? t("common.loading") : t("common.save")}</span>
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
          <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-forest text-xs flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{t("profile.savedSuccess")}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto space-x-2 border-b border-warmgrey pt-2 scrollbar-none">
          {[
            { id: "biodata", label: t("profile.tabBiodata"), icon: GraduationCap },
            { id: "family", label: t("profile.tabFamily"), icon: Users },
            { id: "preferences", label: t("profile.tabPreferences"), icon: Sliders },
            { id: "photos", label: t("profile.tabPhotos"), icon: Camera },
            { id: "managers", label: t("profile.tabManagers"), icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  isSelected
                    ? "border-plum text-plum"
                    : "border-transparent text-charcoal-light hover:text-plum hover:border-gold-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-plum" : "text-charcoal-light"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Career & Education */}
      {activeTab === "biodata" && (
        <div className="bg-white rounded-3xl border border-warmgrey shadow-sm p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-plum border-b border-warmgrey pb-3">
            {t("profile.tabBiodata")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.education")}</label>
              <input
                type="text"
                value={profile.highestEducation}
                onChange={(e) => setProfile({ ...profile, highestEducation: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.educationDetail")}</label>
              <input
                type="text"
                value={profile.educationDetail}
                onChange={(e) => setProfile({ ...profile, educationDetail: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.occupation")}</label>
              <input
                type="text"
                value={profile.occupation}
                onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.annualIncome")}</label>
              <input
                type="text"
                value={profile.annualIncomeRange}
                onChange={(e) => setProfile({ ...profile, annualIncomeRange: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
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
              className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
            />
            <p className="text-[11px] text-charcoal-light">
              नियम: बायो में मोबाइल नंबर, ईमेल अथवा घर का पता लिखना वर्जित है।
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Family Details */}
      {activeTab === "family" && (
        <div className="bg-white rounded-3xl border border-warmgrey shadow-sm p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-plum border-b border-warmgrey pb-3">
            {t("profile.tabFamily")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.fatherOccupation")}</label>
              <input
                type="text"
                value={profile.fatherOccupation}
                onChange={(e) => setProfile({ ...profile, fatherOccupation: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.motherOccupation")}</label>
              <input
                type="text"
                value={profile.motherOccupation}
                onChange={(e) => setProfile({ ...profile, motherOccupation: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.brothersCount")}</label>
              <input
                type="number"
                value={profile.brothersCount}
                onChange={(e) => setProfile({ ...profile, brothersCount: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.sistersCount")}</label>
              <input
                type="number"
                value={profile.sistersCount}
                onChange={(e) => setProfile({ ...profile, sistersCount: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.familyType")}</label>
              <select
                value={profile.familyType}
                onChange={(e) => setProfile({ ...profile, familyType: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
              >
                <option value="NUCLEAR">Nuclear (एकल परिवार)</option>
                <option value="JOINT">Joint (संयुक्त परिवार)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.familyLocation")}</label>
              <input
                type="text"
                value={profile.familyLocation}
                onChange={(e) => setProfile({ ...profile, familyLocation: e.target.value })}
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
              className="w-full px-4 py-2.5 rounded-xl border border-warmgrey focus:outline-none focus:ring-2 focus:ring-plum text-sm"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Partner Preferences */}
      {activeTab === "preferences" && (
        <div className="bg-white rounded-3xl border border-warmgrey shadow-sm p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-plum border-b border-warmgrey pb-3">
            {t("profile.tabPreferences")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-charcoal">{t("profile.prefAge")}</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={profile.prefMinAge}
                  onChange={(e) => setProfile({ ...profile, prefMinAge: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-warmgrey text-sm"
                  placeholder="Min"
                />
                <span className="text-charcoal">-</span>
                <input
                  type="number"
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
                  value={profile.prefMinHeightCm}
                  onChange={(e) => setProfile({ ...profile, prefMinHeightCm: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-warmgrey text-sm"
                  placeholder="Min cm"
                />
                <span className="text-charcoal">-</span>
                <input
                  type="number"
                  value={profile.prefMaxHeightCm}
                  onChange={(e) => setProfile({ ...profile, prefMaxHeightCm: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-warmgrey text-sm"
                  placeholder="Max cm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Private Photos */}
      {activeTab === "photos" && (
        <div className="bg-white rounded-3xl border border-warmgrey shadow-sm p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-plum border-b border-warmgrey pb-3">
            {t("profile.tabPhotos")}
          </h3>

          <div className="p-6 rounded-2xl border-2 border-dashed border-warmgrey bg-ivory text-center space-y-4">
            <Camera className="w-10 h-10 text-gold mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-plum">{t("profile.photoUpload")}</p>
              <p className="text-xs text-charcoal-light">PNG, JPG, or WebP. Maximum file size 5MB.</p>
            </div>

            <div className="max-w-xs mx-auto space-y-2 text-left">
              <label className="text-xs font-semibold text-charcoal block">{t("profile.photoVisibility")}</label>
              <select
                value={photoVisibility}
                onChange={(e) => setPhotoVisibility(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-warmgrey text-xs bg-white"
              >
                <option value="APPROVAL_REQUIRED">{t("profile.visibilityOptions.APPROVAL_REQUIRED")}</option>
                <option value="BLURRED">{t("profile.visibilityOptions.BLURRED")}</option>
                <option value="PUBLIC_TO_MEMBERS">{t("profile.visibilityOptions.PUBLIC_TO_MEMBERS")}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handlePhotoUploadSim}
              disabled={loading}
              className="px-6 py-2.5 bg-plum hover:bg-plum-800 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              Upload Photo
            </button>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {profile.photos?.map((p, idx) => (
              <div key={p.id} className="p-3 rounded-2xl border border-warmgrey bg-ivory space-y-2">
                <div className="h-32 bg-rose-100 rounded-xl flex items-center justify-center text-plum font-bold text-xs relative overflow-hidden">
                  <Lock className="w-6 h-6 text-plum-600 opacity-60" />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] bg-white font-semibold text-forest">
                    {p.moderationStatus}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-charcoal truncate">Photo #{idx + 1}</p>
                <span className="text-[10px] text-plum block">
                  {p.visibility === "APPROVAL_REQUIRED" ? "Consent Gated" : p.visibility}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Family Managers Delegation */}
      {activeTab === "managers" && (
        <div className="bg-white rounded-3xl border border-warmgrey shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-warmgrey pb-3 space-y-1">
            <h3 className="text-lg font-bold text-plum">{t("profile.tabManagers")}</h3>
            <p className="text-xs text-charcoal-light">
              Add trusted family guardians to help manage your matrimonial interests with scoped permissions.
            </p>
          </div>

          {/* Critical Privacy Invariant Banner */}
          <div className="p-4 rounded-2xl bg-plum-50 border border-plum-200 text-plum-950 text-xs flex items-start space-x-3">
            <Shield className="w-5 h-5 text-plum flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">
              {t("profile.managerWarning")}
            </span>
          </div>

          {/* Invite Form */}
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

            {/* Scoped Permissions Checklist */}
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
              disabled={loading}
              className="px-6 py-2.5 bg-plum hover:bg-plum-800 disabled:bg-warmgrey text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4 text-gold-300" />
              <span>{t("profile.inviteManager")}</span>
            </button>
          </form>

          {/* Active Managers List */}
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
                      {m.phone && <span className="text-charcoal-light ml-2">({m.phone})</span>}
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
        </div>
      )}
    </div>
  );
}
