"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import {
  Shield,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  AlertTriangle,
  FileText,
  UserCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function PrivacySettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"shares" | "consent" | "deletion">("shares");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [shares, setShares] = useState<{ incoming: any[]; outgoing: any[] }>({
    incoming: [],
    outgoing: [],
  });
  const [consents, setConsents] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Deletion modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sharesRes, consentRes] = await Promise.all([
        fetch("/api/biodata-shares", { cache: "no-store" }),
        fetch("/api/privacy/consent", { cache: "no-store" }),
      ]);

      if (sharesRes.status === 401 || consentRes.status === 401) {
        router.push("/login");
        return;
      }

      if (sharesRes.ok) {
        const data = await sharesRes.json();
        setShares({ incoming: data.incoming || [], outgoing: data.outgoing || [] });
      }

      if (consentRes.ok) {
        const data = await consentRes.json();
        setConsents(data.records || []);
      }
    } catch (err) {
      console.error("Error loading privacy data:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespondShare = async (shareId: string, action: "APPROVE" | "DECLINE" | "REVOKE") => {
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/biodata-shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update share");

      setMsg({
        type: "success",
        text: `Biodata access request ${action.toLowerCase()}d successfully.`,
      });
      await loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Action failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawConsent = async (purpose: string) => {
    if (!confirm(`Are you sure you want to withdraw consent for "${purpose}"?`)) return;
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/privacy/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to withdraw consent");

      setMsg({ type: "success", text: data.message });
      await loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Action failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      setMsg({
        type: "error",
        text: "Please type exactly 'DELETE MY ACCOUNT' to proceed.",
      });
      return;
    }

    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/privacy/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          reason: deleteReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process erasure");

      alert(data.message || "Account scheduled for erasure.");
      window.location.href = "/";
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Deletion failed" });
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b border-warmgrey pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-plum text-ivory flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-gold-300" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-plum">
              Privacy & Data Protection Center
            </h1>
            <p className="text-xs text-charcoal-light">
              India Digital Personal Data Protection (DPDP) Act 2025 Compliance & Controls
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-warmgrey space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("shares")}
          className={`pb-3.5 transition flex items-center space-x-2 border-b-2 ${
            activeTab === "shares"
              ? "border-plum text-plum"
              : "border-transparent text-charcoal-light hover:text-plum"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Photo & Biodata Access ({shares.incoming.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("consent")}
          className={`pb-3.5 transition flex items-center space-x-2 border-b-2 ${
            activeTab === "consent"
              ? "border-plum text-plum"
              : "border-transparent text-charcoal-light hover:text-plum"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>DPDP Consent Records ({consents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("deletion")}
          className={`pb-3.5 transition flex items-center space-x-2 border-b-2 ${
            activeTab === "deletion"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-charcoal-light hover:text-rose-600"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Right to Erasure (Deletion)</span>
        </button>
      </div>

      {/* Notification banner */}
      {msg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 font-medium ${
            msg.type === "success"
              ? "bg-forest-50 border-forest-200 text-forest"
              : "bg-rose-50 border-rose-200 text-plum"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-plum font-semibold flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-gold-600" />
          <span>Loading privacy records...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: BIODATA SHARES & PHOTO ACCESS */}
          {activeTab === "shares" && (
            <div className="space-y-8">
              {/* Incoming Requests */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-plum">
                    Requests to View Your Private Photos & Biodata
                  </h3>
                  <span className="text-xs text-charcoal-light font-medium">
                    {shares.incoming.length} request(s)
                  </span>
                </div>

                {shares.incoming.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-warmgrey bg-white text-center text-xs text-charcoal-light">
                    No incoming photo access requests at this time.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shares.incoming.map((item) => (
                      <div
                        key={item.id}
                        className="p-5 rounded-2xl border border-warmgrey bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5">
                            <span className="font-extrabold text-plum text-sm">
                              {item.requester_name}
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-plum-50 text-plum border border-plum-100">
                              {item.requester_public_id}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                item.status === "APPROVED"
                                  ? "bg-forest-50 text-forest"
                                  : item.status === "DECLINED"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-gold-50 text-gold-800"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-xs text-charcoal-light">
                            {item.requester_gender === "FEMALE" ? "Bride" : "Groom"} • {item.requester_state}
                          </p>
                          {item.expires_at && item.status === "APPROVED" && (
                            <p className="text-[11px] text-forest font-medium">
                              Access active until: {new Date(item.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {item.status === "REQUESTED" ? (
                            <>
                              <button
                                onClick={() => handleRespondShare(item.id, "APPROVE")}
                                disabled={actionLoading}
                                className="px-3.5 py-2 rounded-xl bg-forest hover:bg-forest-700 text-ivory text-xs font-bold transition flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve (30 Days)</span>
                              </button>
                              <button
                                onClick={() => handleRespondShare(item.id, "DECLINE")}
                                disabled={actionLoading}
                                className="px-3.5 py-2 rounded-xl bg-warmgrey hover:bg-stone-300 text-charcoal text-xs font-bold transition"
                              >
                                Decline
                              </button>
                            </>
                          ) : item.status === "APPROVED" ? (
                            <button
                              onClick={() => handleRespondShare(item.id, "REVOKE")}
                              disabled={actionLoading}
                              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Revoke Access</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRespondShare(item.id, "APPROVE")}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-lg border border-warmgrey text-xs text-plum font-semibold"
                            >
                              Re-approve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing Requests */}
              <div className="space-y-4 pt-4 border-t border-warmgrey">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-plum">
                    Requests You Sent to View Others&apos; Photos
                  </h3>
                  <span className="text-xs text-charcoal-light font-medium">
                    {shares.outgoing.length} request(s)
                  </span>
                </div>

                {shares.outgoing.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-warmgrey bg-white text-center text-xs text-charcoal-light">
                    You have not requested photo access from any candidates.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {shares.outgoing.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-warmgrey bg-white space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-plum text-xs">
                            {item.owner_name} ({item.owner_public_id})
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.status === "APPROVED"
                                ? "bg-forest-50 text-forest"
                                : item.status === "DECLINED"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-gold-50 text-gold-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-charcoal-light">
                          Status updated: {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DPDP CONSENT RECORDS */}
          {activeTab === "consent" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-ivory border border-warmgrey space-y-1">
                <span className="text-xs font-bold text-plum block">
                  Digital Personal Data Protection Act 2025 Notice
                </span>
                <p className="text-[11px] text-charcoal leading-relaxed">
                  Under India&apos;s DPDP Act 2025, you retain full rights over your personal and sensitive data. You may inspect all granted consent purposes, view the exact policy versions agreed upon, and withdraw optional consents at any time.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-warmgrey overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-plum-50 text-plum font-bold border-b border-warmgrey">
                    <tr>
                      <th className="p-4">Consent Purpose</th>
                      <th className="p-4">Policy Version</th>
                      <th className="p-4">Granted At</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warmgrey">
                    {consents.map((c) => (
                      <tr key={c.id} className="hover:bg-ivory/50 transition">
                        <td className="p-4 font-bold text-charcoal">
                          {c.consent_purpose}
                        </td>
                        <td className="p-4 font-mono text-charcoal-light">
                          {c.policy_version}
                        </td>
                        <td className="p-4 text-charcoal-light">
                          {new Date(c.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4">
                          {c.granted ? (
                            <span className="inline-flex items-center space-x-1 text-forest font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-600 font-bold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Withdrawn</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {c.granted ? (
                            <button
                              onClick={() => handleWithdrawConsent(c.consent_purpose)}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold transition"
                            >
                              Withdraw
                            </button>
                          ) : (
                            <span className="text-[11px] text-charcoal-light italic">
                              Withdrawn {c.withdrawn_at ? new Date(c.withdrawn_at).toLocaleDateString() : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RIGHT TO ERASURE (ACCOUNT DELETION) */}
          {activeTab === "deletion" && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-center space-x-2.5 text-rose-800 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>Right to Erasure & Account Deletion Protocol</span>
                </div>
                <p className="text-xs text-charcoal leading-relaxed">
                  Executing account deletion invokes your Right to be Forgotten under Section 12 of the Digital Personal Data Protection Act 2025. Upon confirmation:
                </p>
                <ul className="text-xs text-charcoal space-y-1.5 list-disc pl-5">
                  <li>Your public matrimonial profile is immediately unpublished and permanently removed from discovery.</li>
                  <li>All active photo and biodata sharing grants are instantly revoked.</li>
                  <li>All pending interest requests and contact exchanges are terminated.</li>
                  <li>In accordance with statutory Indian telecom and IT safety compliances, core audit logs and transaction hashes are retained in secure cold storage for a 30-day statutory retention window before irreversible physical database erasure.</li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-warmgrey space-y-4 shadow-sm">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-plum block">
                    Reason for Deletion (Optional)
                  </label>
                  <select
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-warmgrey text-xs bg-white text-charcoal"
                  >
                    <option value="">Select a reason...</option>
                    <option value="MATCHED_OUTSIDE">Found a partner elsewhere / Marriage fixed</option>
                    <option value="PRIVACY_CONCERN">Privacy / Personal choice</option>
                    <option value="NOT_SATISFIED">Service not meeting expectations</option>
                    <option value="OTHER">Other reason</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-rose-700 block">
                    Type &quot;DELETE MY ACCOUNT&quot; to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full p-2.5 rounded-xl border border-rose-300 text-xs font-mono font-bold text-rose-800 placeholder-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <button
                  onClick={handleDeleteAccount}
                  disabled={actionLoading || deleteConfirmation !== "DELETE MY ACCOUNT"}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {actionLoading
                      ? "Processing Statutory Erasure..."
                      : "Permanently Delete My Account & Data"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
