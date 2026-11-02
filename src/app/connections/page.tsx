"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import {
  Heart,
  Bookmark,
  Phone,
  ShieldCheck,
  Check,
  CheckCircle2,
  X,
  Eye,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  RefreshCw,
  Mail,
  MessageSquare,
} from "lucide-react";

export default function ConnectionsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"received" | "sent" | "shortlists" | "exchanges">("received");
  const [loading, setLoading] = useState(true);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [receivedInterests, setReceivedInterests] = useState<any[]>([]);
  const [sentInterests, setSentInterests] = useState<any[]>([]);
  const [shortlists, setShortlists] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);

  // Disclosed contacts revealed on demand
  const [disclosedContacts, setDisclosedContacts] = useState<Record<string, { phone: string | null; email: string | null }>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [respondingExchangeId, setRespondingExchangeId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [interestsRes, shortlistsRes, exchangesRes] = await Promise.all([
        fetch("/api/interests", { cache: "no-store" }),
        fetch("/api/shortlists", { cache: "no-store" }),
        fetch("/api/contact-exchange", { cache: "no-store" }),
      ]);

      if (interestsRes.status === 401) {
        router.push("/login");
        return;
      }

      if (interestsRes.ok) {
        const data = await interestsRes.json();
        setReceivedInterests(data.interests?.received || []);
        setSentInterests(data.interests?.sent || []);
      }
      if (shortlistsRes.ok) {
        const data = await shortlistsRes.json();
        setShortlists(data.shortlists || []);
      }
      if (exchangesRes.ok) {
        const data = await exchangesRes.json();
        if (data.myProfileId) setMyProfileId(data.myProfileId);
        setExchanges(data.requests || []);
      }
    } catch (err) {
      console.error("Error loading connections data:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespondInterest = async (interestId: string, action: "ACCEPTED" | "DECLINED") => {
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interestId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to respond to interest");

      setReceivedInterests((prev) =>
        prev.map((i) => (i.id === interestId ? { ...i, status: action } : i))
      );
      setActionMsg({
        type: "success",
        text: action === "ACCEPTED" ? "Interest accepted! Encrypted messaging is now unlocked." : "Interest declined.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error responding to interest";
      setActionMsg({ type: "error", text: msg });
    }
  };

  const handleRespondExchange = async (
    requestId: string,
    action: "APPROVE" | "REJECT" | "WITHDRAW"
  ) => {
    setRespondingExchangeId(requestId);
    setActionMsg(null);
    try {
      const res = await fetch("/api/contact-exchange", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          disclosePhone: true,
          discloseEmail: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update contact exchange");

      setExchanges((prev) =>
        prev.map((ex) => (ex.id === requestId ? { ...ex, status: data.request?.status || ex.status } : ex))
      );
      setActionMsg({ type: "success", text: data.message || "Contact exchange updated." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error updating contact exchange";
      setActionMsg({ type: "error", text: msg });
    } finally {
      setRespondingExchangeId(null);
    }
  };

  const handleRevealContact = async (requestId: string) => {
    setRevealingId(requestId);
    try {
      const res = await fetch(`/api/contact-exchange/${requestId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to reveal contact");
      setDisclosedContacts((prev) => ({
        ...prev,
        [requestId]: {
          phone: data.contact?.phone || null,
          email: data.contact?.email || null,
        },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error revealing contact";
      setActionMsg({ type: "error", text: msg });
    } finally {
      setRevealingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-8 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-plum text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-gold-600" />
          <span>Matrimonial Relationships & Consents</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-plum">
          {t("connections.pageTitle")}
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-light max-w-2xl leading-relaxed">
          {t("connections.pageSubtitle")}
        </p>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 font-semibold ${
            actionMsg.type === "success"
              ? "bg-forest-50 border-forest-200 text-forest"
              : "bg-rose-50 border-rose-200 text-plum"
          }`}
        >
          {actionMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-warmgrey pb-1 overflow-x-auto">
        {[
          { id: "received", label: `${t("connections.tabReceived")} (${receivedInterests.length})`, icon: Heart },
          { id: "sent", label: `${t("connections.tabSent")} (${sentInterests.length})`, icon: Heart },
          { id: "shortlists", label: `${t("connections.tabShortlists")} (${shortlists.length})`, icon: Bookmark },
          { id: "exchanges", label: `${t("connections.tabExchanges")} (${exchanges.length})`, icon: Phone },
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

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex items-center space-x-3 text-plum font-semibold">
            <RefreshCw className="w-5 h-5 animate-spin text-gold" />
            <span>Loading connections...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tab 1: Received Interests */}
          {activeTab === "received" && (
            <div className="space-y-4">
              {receivedInterests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-warmgrey text-xs text-charcoal-light">
                  No interests received yet. Keep your biodata and photos complete to attract verified matches.
                </div>
              ) : (
                receivedInterests.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-warmgrey p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-plum text-base">{item.first_name}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-plum-50 text-plum">
                          {item.public_id}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-light mt-1">
                        {item.city}, {item.state} • {item.highest_education || "Graduate"} • {item.occupation || "Professional"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {item.status === "SENT" ? (
                        <>
                          <button
                            onClick={() => handleRespondInterest(item.id, "ACCEPTED")}
                            className="py-2 px-4 rounded-xl bg-forest hover:bg-forest-800 text-ivory text-xs font-bold transition flex items-center space-x-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t("connections.accept")}</span>
                          </button>
                          <button
                            onClick={() => handleRespondInterest(item.id, "DECLINED")}
                            className="py-2 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-plum text-xs font-bold transition flex items-center space-x-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{t("connections.decline")}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              item.status === "ACCEPTED"
                                ? "bg-forest-50 text-forest"
                                : "bg-rose-50 text-plum"
                            }`}
                          >
                            {item.status === "ACCEPTED" ? t("connections.accepted") : t("connections.declined")}
                          </span>
                          {item.status === "ACCEPTED" && (
                            <Link
                              href={`/messages/${item.public_id}`}
                              className="py-2 px-3 rounded-xl bg-plum text-ivory text-xs font-bold hover:bg-plum-900 transition flex items-center space-x-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-gold-300" />
                              <span>Message</span>
                            </Link>
                          )}
                        </>
                      )}

                      <Link
                        href={`/discovery/${item.public_id}`}
                        className="p-2 rounded-xl border border-warmgrey text-charcoal hover:bg-ivory"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Sent Interests */}
          {activeTab === "sent" && (
            <div className="space-y-4">
              {sentInterests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-warmgrey text-xs text-charcoal-light">
                  You haven&apos;t sent any interests yet. Explore matches in Discovery.
                </div>
              ) : (
                sentInterests.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-warmgrey p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-plum text-base">{item.first_name}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-plum-50 text-plum">
                          {item.public_id}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-light mt-1">
                        {item.city}, {item.state} • {item.highest_education || "Graduate"} • {item.occupation || "Professional"}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.status === "ACCEPTED"
                            ? "bg-forest-50 text-forest border border-forest-200"
                            : "bg-ivory border border-warmgrey text-charcoal"
                        }`}
                      >
                        {item.status === "SENT" ? "Awaiting Response" : item.status}
                      </span>
                      {item.status === "ACCEPTED" && (
                        <Link
                          href={`/messages/${item.public_id}`}
                          className="py-2 px-3 rounded-xl bg-plum text-ivory text-xs font-bold hover:bg-plum-900 transition flex items-center space-x-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-gold-300" />
                          <span>Message</span>
                        </Link>
                      )}
                      <Link
                        href={`/discovery/${item.public_id}`}
                        className="py-2 px-3 rounded-xl border border-warmgrey text-xs font-semibold hover:bg-ivory flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-plum" />
                        <span>View</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Shortlists */}
          {activeTab === "shortlists" && (
            <div className="space-y-4">
              {shortlists.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-warmgrey text-xs text-charcoal-light">
                  No shortlisted profiles saved.
                </div>
              ) : (
                shortlists.map((item) => (
                  <div
                    key={item.shortlist_id}
                    className="bg-white rounded-3xl border border-warmgrey p-6 flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-plum text-base">{item.first_name}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-plum-50 text-plum">
                          {item.public_id}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-light mt-1">
                        {item.city}, {item.state} • {item.occupation || "Community Member"}
                      </p>
                    </div>

                    <Link
                      href={`/discovery/${item.public_id}`}
                      className="py-2 px-4 rounded-xl bg-plum text-ivory text-xs font-bold hover:bg-plum-900 transition flex items-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-gold-300" />
                      <span>View Biodata</span>
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Mutual Contact Exchanges */}
          {activeTab === "exchanges" && (
            <div className="space-y-4">
              {exchanges.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-warmgrey text-xs text-charcoal-light">
                  No contact exchange requests initiated yet.
                </div>
              ) : (
                exchanges.map((ex) => {
                  const isBothApproved = ex.status === "BOTH_APPROVED";
                  const isPendingApproval = ex.status === "SENDER_APPROVED";
                  const isReceiver = myProfileId && ex.receiver_profile_id === myProfileId;
                  const isSender = myProfileId && ex.sender_profile_id === myProfileId;
                  const disclosed = disclosedContacts[ex.id];
                  const isBusy = respondingExchangeId === ex.id;

                  return (
                    <div
                      key={ex.id}
                      className="bg-white rounded-3xl border border-warmgrey p-6 sm:p-8 space-y-4 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-warmgrey pb-4 gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-plum text-base">
                              {ex.sender_name} ↔ {ex.receiver_name}
                            </span>
                          </div>
                          <p className="text-xs text-charcoal-light mt-0.5">
                            Status: <span className="font-bold text-plum">{ex.status}</span>
                          </p>
                        </div>

                        {isBothApproved ? (
                          <span className="px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest text-xs font-bold flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t("connections.bothApproved")}</span>
                          </span>
                        ) : isPendingApproval ? (
                          <span className="px-3 py-1 rounded-full bg-gold-50 border border-gold-300 text-gold-800 text-xs font-bold flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Dual Approval</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-plum text-xs font-bold">
                            {ex.status}
                          </span>
                        )}
                      </div>

                      {/* Contact Info Unlocked Card */}
                      {isBothApproved ? (
                        <div className="p-5 rounded-2xl bg-ivory border border-warmgrey space-y-3">
                          <div className="flex items-center space-x-2 text-forest text-xs font-bold">
                            <Unlock className="w-4 h-4 text-forest" />
                            <span>{t("connections.disclosedNotice")}</span>
                          </div>

                          {disclosed ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                              <div className="p-3.5 rounded-xl bg-white border border-warmgrey space-y-1">
                                <span className="text-charcoal-light text-[11px] font-semibold flex items-center space-x-1">
                                  <Phone className="w-3 h-3 text-plum" />
                                  <span>{t("connections.phoneLabel")}</span>
                                </span>
                                <span className="text-sm font-mono font-extrabold text-plum">
                                  {disclosed.phone || "Not shared"}
                                </span>
                              </div>
                              <div className="p-3.5 rounded-xl bg-white border border-warmgrey space-y-1">
                                <span className="text-charcoal-light text-[11px] font-semibold flex items-center space-x-1">
                                  <Mail className="w-3 h-3 text-plum" />
                                  <span>{t("connections.emailLabel")}</span>
                                </span>
                                <span className="text-sm font-mono font-bold text-charcoal">
                                  {disclosed.email || "Not shared"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRevealContact(ex.id)}
                              disabled={revealingId === ex.id}
                              className="py-2.5 px-5 rounded-xl bg-forest hover:bg-forest-800 text-ivory text-xs font-bold transition flex items-center space-x-2 shadow-xs"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{revealingId === ex.id ? "Decrypting..." : t("connections.viewContact")}</span>
                            </button>
                          )}
                        </div>
                      ) : isPendingApproval ? (
                        <div className="p-4 rounded-2xl bg-ivory border border-warmgrey space-y-3">
                          <div className="text-xs text-charcoal-light flex items-center space-x-2">
                            <Lock className="w-4 h-4 text-plum flex-shrink-0" />
                            <span>
                              Contact numbers remain encrypted until both candidates have independently granted approval.
                            </span>
                          </div>

                          {isReceiver && (
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              <button
                                onClick={() => handleRespondExchange(ex.id, "APPROVE")}
                                disabled={isBusy}
                                className="py-2.5 px-5 rounded-xl bg-forest hover:bg-forest-800 text-ivory text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isBusy ? "Processing..." : "Approve & Share Contact"}</span>
                              </button>
                              <button
                                onClick={() => handleRespondExchange(ex.id, "REJECT")}
                                disabled={isBusy}
                                className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-plum text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </div>
                          )}

                          {isSender && (
                            <div className="pt-1">
                              <button
                                onClick={() => handleRespondExchange(ex.id, "WITHDRAW")}
                                disabled={isBusy}
                                className="py-2 px-4 rounded-xl border border-warmgrey bg-white hover:bg-rose-50 text-plum text-xs font-bold transition disabled:opacity-50"
                              >
                                {isBusy ? "Withdrawing..." : "Withdraw Request"}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-ivory border border-warmgrey text-xs text-charcoal-light flex items-center space-x-2">
                          <Lock className="w-4 h-4 text-plum flex-shrink-0" />
                          <span>This contact exchange request was {ex.status.toLowerCase()}.</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
