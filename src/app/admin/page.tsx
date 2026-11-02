"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  UserX,
  LogOut,
  Shield,
  Eye,
  Camera,
  RefreshCw,
  Search,
  Check,
  X,
  Slash,
} from "lucide-react";

interface AdminStats {
  pendingProfiles: number;
  pendingVerifications: number;
  activeReports: number;
  totalUsers: number;
}

interface PendingProfile {
  id: string;
  publicId: string;
  firstName: string;
  gender: string;
  age: number;
  city: string;
  state: string;
  subCommunity?: string;
  highestEducation?: string;
  occupation?: string;
  aboutMe?: string;
  fatherOccupation?: string;
  familyType?: string;
  completionScore: number;
}

interface VerificationItem {
  id: string;
  profile_id: string;
  verification_type: string;
  status: string;
  selfie_storage_key?: string;
  created_at: string;
  public_id: string;
  first_name: string;
  city: string;
  state: string;
}

interface ReportItem {
  id: string;
  category: string;
  details: string;
  created_at: string;
  reporter_public_id: string;
  reported_public_id: string;
  reported_name: string;
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [admin, setAdmin] = useState<{ id: string; email: string; role: string } | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    pendingProfiles: 0,
    pendingVerifications: 0,
    activeReports: 0,
    totalUsers: 0,
  });

  const [activeTab, setActiveTab] = useState<"overview" | "profiles" | "verifications" | "reports">("overview");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Queues data
  const [profiles, setProfiles] = useState<PendingProfile[]>([]);
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  // Action notes state
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});

  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.admin) setAdmin(data.admin);
      if (data.stats) setStats(data.stats);
    } catch {
      showNotification("error", "Error connecting to admin control plane");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadProfilesQueue = async () => {
    try {
      const res = await fetch("/api/admin/profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadVerificationsQueue = async () => {
    try {
      const res = await fetch("/api/admin/verifications");
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.queue || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadReportsQueue = async () => {
    try {
      const res = await fetch("/api/admin/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === "profiles") loadProfilesQueue();
    if (activeTab === "verifications") loadVerificationsQueue();
    if (activeTab === "reports") loadReportsQueue();
  }, [activeTab]);

  const handleModerateProfile = async (profileId: string, action: "PUBLISHED" | "REJECTED" | "SUSPENDED") => {
    const notes = actionNotes[profileId] || (action === "PUBLISHED" ? "Approved by admin verification" : "Profile rejected after review");
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action, notes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      showNotification("success", `Profile successfully ${action.toLowerCase()}`);
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      setStats((prev) => ({ ...prev, pendingProfiles: Math.max(0, prev.pendingProfiles - 1) }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing action";
      showNotification("error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleModerateVerification = async (verificationId: string, action: "APPROVED" | "REJECTED" | "REVOKED") => {
    const notes = actionNotes[verificationId] || (action === "APPROVED" ? "Selfie matches profile photo" : "Selfie mismatch or blur");
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, action, notes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      showNotification("success", `Verification ${action.toLowerCase()}`);
      setVerifications((prev) => prev.filter((v) => v.id !== verificationId));
      setStats((prev) => ({ ...prev, pendingVerifications: Math.max(0, prev.pendingVerifications - 1) }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing action";
      showNotification("error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, resolution: "RESOLVED" | "DISMISSED", suspend = false) => {
    const notes = actionNotes[reportId] || (resolution === "RESOLVED" ? "Investigation completed and resolution applied" : "Dismissed as unsubstantiated");
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, resolution, notes, suspendReportedUser: suspend }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      showNotification("success", `Report marked as ${resolution.toLowerCase()}`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setStats((prev) => ({ ...prev, activeReports: Math.max(0, prev.activeReports - 1) }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing action";
      showNotification("error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-plum font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-gold" />
          <span>Loading Admin Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Admin Header */}
      <div className="bg-white rounded-3xl border border-warmgrey shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-plum-50 border border-plum-100 text-plum font-mono text-xs font-bold uppercase tracking-wider">
              {admin?.role || "ADMIN"}
            </span>
            <span className="text-xs text-charcoal-light">{admin?.email}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-plum">
            {t("admin.portalTitle")}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboard}
            className="p-2.5 rounded-2xl border border-warmgrey text-charcoal hover:bg-ivory transition"
            title="Refresh stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-plum font-bold text-xs flex items-center space-x-1.5 transition"
          >
            <LogOut className="w-4 h-4 text-plum" />
            <span>{t("admin.logout")}</span>
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center space-x-2 font-medium ${
            message.type === "success"
              ? "bg-forest-50 border-forest-200 text-forest"
              : "bg-rose-50 border-rose-200 text-plum"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-warmgrey shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-light">{t("admin.statPendingProfiles")}</span>
            <FileCheck2 className="w-4 h-4 text-plum" />
          </div>
          <div className="text-2xl font-black text-plum">{stats.pendingProfiles}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-warmgrey shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-light">{t("admin.statPendingVerifications")}</span>
            <Camera className="w-4 h-4 text-gold" />
          </div>
          <div className="text-2xl font-black text-gold-600">{stats.pendingVerifications}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-warmgrey shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-light">{t("admin.statActiveReports")}</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{stats.activeReports}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-warmgrey shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-light">{t("admin.statTotalUsers")}</span>
            <Users className="w-4 h-4 text-forest" />
          </div>
          <div className="text-2xl font-black text-forest">{stats.totalUsers}</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-warmgrey pb-1 overflow-x-auto">
        {[
          { id: "overview", label: t("admin.tabOverview"), icon: Shield },
          { id: "profiles", label: `${t("admin.tabProfiles")} (${stats.pendingProfiles})`, icon: FileCheck2 },
          { id: "verifications", label: `${t("admin.tabVerifications")} (${stats.pendingVerifications})`, icon: Camera },
          { id: "reports", label: `${t("admin.tabReports")} (${stats.activeReports})`, icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-5 rounded-2xl text-xs font-bold flex items-center space-x-2 whitespace-nowrap transition ${
                active
                  ? "bg-plum text-ivory shadow-md"
                  : "bg-white text-charcoal hover:bg-ivory border border-warmgrey"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-gold-300" : "text-plum"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Overview */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-8 space-y-6">
          <div className="border-b border-warmgrey pb-4">
            <h3 className="text-lg font-bold text-plum">Security & Compliance Dashboard</h3>
            <p className="text-xs text-charcoal-light">
              Zero-Trust Community Moderation conforming to PRD v1.0 and DPDP Act 2025.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-warmgrey bg-ivory space-y-2">
              <h4 className="text-xs font-bold text-plum uppercase">1. Pre-Moderation AI Guard</h4>
              <p className="text-xs text-charcoal-light leading-relaxed">
                Inception Labs Mercury AI intercepts free-text contact leakage (phone numbers, emails) before submission.
              </p>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-forest-50 text-forest text-[11px] font-semibold">
                <Check className="w-3 h-3" />
                <span>Active</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-warmgrey bg-ivory space-y-2">
              <h4 className="text-xs font-bold text-plum uppercase">2. Dual-Approval State Engine</h4>
              <p className="text-xs text-charcoal-light leading-relaxed">
                Contact details disclosure view is strictly locked to status = BOTH_APPROVED.
              </p>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-forest-50 text-forest text-[11px] font-semibold">
                <Check className="w-3 h-3" />
                <span>PostgreSQL View Enforced</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-warmgrey bg-ivory space-y-2">
              <h4 className="text-xs font-bold text-plum uppercase">3. Family Manager Authority (C-06)</h4>
              <p className="text-xs text-charcoal-light leading-relaxed">
                Family guardians strictly prohibited from disclosing candidate contact or ID verification documents.
              </p>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-forest-50 text-forest text-[11px] font-semibold">
                <Check className="w-3 h-3" />
                <span>Check Constraint Guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Profiles Review Queue */}
      {activeTab === "profiles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-plum">
              Profiles Awaiting Approval ({profiles.length})
            </h3>
          </div>

          {profiles.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-warmgrey text-xs text-charcoal-light">
              All submitted profiles have been reviewed. Queue is clean.
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((p) => (
                <div key={p.id} className="bg-white rounded-3xl border border-warmgrey p-6 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-warmgrey pb-4 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-plum text-lg">{p.firstName}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-plum-50 text-plum">
                          {p.publicId}
                        </span>
                        <span className="text-xs text-charcoal-light">
                          ({p.gender}, {p.age} years)
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-light mt-0.5">
                        {p.city}, {p.state} • Sub-community: {p.subCommunity || "Pal"}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-charcoal">Completion: {p.completionScore}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-charcoal">Education & Career:</span>
                      <p className="text-charcoal-light mt-0.5">
                        {p.highestEducation || "Not specified"} • {p.occupation || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-charcoal">Family Background:</span>
                      <p className="text-charcoal-light mt-0.5">
                        Father: {p.fatherOccupation || "Not specified"} ({p.familyType || "Nuclear"})
                      </p>
                    </div>
                  </div>

                  {p.aboutMe && (
                    <div className="p-3.5 rounded-2xl bg-ivory border border-warmgrey text-xs">
                      <span className="font-bold text-plum block mb-1">About Me (Candidate Bio):</span>
                      <p className="text-charcoal italic">{p.aboutMe}</p>
                    </div>
                  )}

                  {/* Notes & Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      placeholder={t("admin.notesPlaceholder")}
                      value={actionNotes[p.id] || ""}
                      onChange={(e) => setActionNotes({ ...actionNotes, [p.id]: e.target.value })}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-warmgrey text-xs bg-ivory focus:bg-white focus:outline-none focus:ring-1 focus:ring-plum"
                    />

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleModerateProfile(p.id, "PUBLISHED")}
                        disabled={actionLoading}
                        className="py-2.5 px-4 rounded-xl bg-forest hover:bg-forest-800 text-ivory text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t("admin.approveProfile")}</span>
                      </button>
                      <button
                        onClick={() => handleModerateProfile(p.id, "REJECTED")}
                        disabled={actionLoading}
                        className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-plum text-xs font-bold transition flex items-center space-x-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t("admin.rejectProfile")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: Verification Queue */}
      {activeTab === "verifications" && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-plum">
            Selfie & Identity Verification Queue ({verifications.length})
          </h3>

          {verifications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-warmgrey text-xs text-charcoal-light">
              No pending verification requests.
            </div>
          ) : (
            <div className="space-y-4">
              {verifications.map((v) => (
                <div key={v.id} className="bg-white rounded-3xl border border-warmgrey p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-warmgrey pb-4">
                    <div>
                      <span className="font-extrabold text-plum text-base">{v.first_name}</span>
                      <span className="text-xs font-mono font-bold ml-2 px-2 py-0.5 rounded bg-plum-50 text-plum">
                        {v.public_id}
                      </span>
                      <p className="text-xs text-charcoal-light mt-0.5">
                        {v.city}, {v.state} • Type: {v.verification_type}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-gold-50 text-gold-700 text-xs font-semibold">
                      Pending Comparison
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-ivory border border-warmgrey flex items-center space-x-4 text-xs">
                    <Camera className="w-8 h-8 text-gold" />
                    <div>
                      <span className="font-bold text-charcoal block">Selfie Storage Key:</span>
                      <span className="font-mono text-xs text-charcoal-light">{v.selfie_storage_key || "Uploaded via secure buffer"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      placeholder="Verification review note..."
                      value={actionNotes[v.id] || ""}
                      onChange={(e) => setActionNotes({ ...actionNotes, [v.id]: e.target.value })}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-warmgrey text-xs bg-ivory focus:bg-white focus:outline-none focus:ring-1 focus:ring-plum"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleModerateVerification(v.id, "APPROVED")}
                        disabled={actionLoading}
                        className="py-2.5 px-4 rounded-xl bg-forest hover:bg-forest-800 text-ivory text-xs font-bold transition flex items-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Award Verified Badge</span>
                      </button>
                      <button
                        onClick={() => handleModerateVerification(v.id, "REJECTED")}
                        disabled={actionLoading}
                        className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-plum text-xs font-bold transition flex items-center space-x-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 4: Reports & Abuse Queue */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-plum">
            Abuse & Safety Reports ({reports.length})
          </h3>

          {reports.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-warmgrey text-xs text-charcoal-light">
              No open reports. Platform safety metrics normal.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => (
                <div key={r.id} className="bg-white rounded-3xl border border-warmgrey p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-warmgrey pb-4">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-plum font-bold text-xs">
                        {r.category}
                      </span>
                      <p className="text-xs text-charcoal-light mt-1">
                        Reported Candidate: <span className="font-bold text-plum">{r.reported_name}</span> ({r.reported_public_id})
                        by Reporter ({r.reporter_public_id})
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-ivory border border-warmgrey text-xs text-charcoal">
                    <span className="font-bold text-plum block mb-0.5">Complaint Details:</span>
                    <p>{r.details}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      placeholder="Resolution notes..."
                      value={actionNotes[r.id] || ""}
                      onChange={(e) => setActionNotes({ ...actionNotes, [r.id]: e.target.value })}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-warmgrey text-xs bg-ivory focus:bg-white focus:outline-none focus:ring-1 focus:ring-plum"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleResolveReport(r.id, "RESOLVED", true)}
                        disabled={actionLoading}
                        className="py-2.5 px-4 rounded-xl bg-plum hover:bg-plum-900 text-ivory text-xs font-bold transition flex items-center space-x-1.5"
                      >
                        <UserX className="w-3.5 h-3.5 text-gold-300" />
                        <span>Suspend User</span>
                      </button>
                      <button
                        onClick={() => handleResolveReport(r.id, "DISMISSED", false)}
                        disabled={actionLoading}
                        className="py-2.5 px-4 rounded-xl border border-warmgrey text-charcoal text-xs font-bold hover:bg-ivory transition"
                      >
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
