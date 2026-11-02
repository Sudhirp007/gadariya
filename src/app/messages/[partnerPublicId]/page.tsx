"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import {
  ArrowLeft,
  Send,
  Shield,
  Phone,
  AlertTriangle,
  Ban,
  CheckCheck,
  Check,
  Lock,
  RefreshCw,
  MoreVertical,
  X,
} from "lucide-react";

export default function ChatThreadPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const partnerPublicId = params.partnerPublicId as string;

  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Safety modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState("INAPPROPRIATE_CONTENT");
  const [reportDetails, setReportDetails] = useState("");
  const [safetySubmitting, setSafetySubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadThread = async () => {
    try {
      const res = await fetch(`/api/messages/${partnerPublicId}`);
      if (res.ok) {
        const data = await res.json();
        setPartner(data.partner);
        setMessages(data.messages || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Unable to load conversation thread.");
      }
    } catch (err: any) {
      console.error("Error loading chat:", err);
      setErrorMsg("Network error loading messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partnerPublicId) {
      loadThread();
      const interval = setInterval(loadThread, 5000); // Poll every 5s for active chat
      return () => clearInterval(interval);
    }
  }, [partnerPublicId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setErrorMsg(null);
    const textToSend = newMessage.trim();

    try {
      const res = await fetch(`/api/messages/${partnerPublicId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: textToSend }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setNewMessage("");
      await loadThread();
    } catch (err: any) {
      setErrorMsg(err.message || "Error sending message");
    } finally {
      setSending(false);
    }
  };

  const handleBlockCandidate = async () => {
    if (!confirm(`Are you sure you want to block ${partner?.name || "this candidate"}? They will no longer be able to message or view your profile.`)) return;

    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPublicId: partnerPublicId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to block");
      alert(data.message);
      router.push("/messages");
    } catch (err: any) {
      alert(err.message || "Failed to block");
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSafetySubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedPublicId: partnerPublicId,
          category: reportCategory,
          details: reportDetails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit report");
      alert(data.message);
      setShowReportModal(false);
      setReportDetails("");
    } catch (err: any) {
      alert(err.message || "Failed to submit report");
    } finally {
      setSafetySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center space-x-2 text-plum text-xs font-semibold">
        <RefreshCw className="w-4 h-4 animate-spin text-gold-600" />
        <span>Loading secure chat...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-120px)] min-h-[500px]">
      {/* Top Chat Header */}
      <div className="bg-white rounded-2xl border border-warmgrey p-4 shadow-sm flex items-center justify-between gap-4 mb-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Link
            href="/messages"
            className="p-2 rounded-xl hover:bg-stone-100 text-charcoal-light hover:text-plum transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="w-10 h-10 rounded-xl bg-plum text-ivory flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
            {partner?.name?.charAt(0) || "P"}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h2 className="font-extrabold text-sm text-plum">
                {partner?.name || "Candidate"}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-plum-50 text-plum border border-plum-100">
                {partnerPublicId}
              </span>
            </div>
            <p className="text-[11px] text-charcoal-light">
              {partner?.location || "Gadaria Community Match"}
            </p>
          </div>
        </div>

        {/* Action dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl hover:bg-stone-100 text-charcoal-light hover:text-plum transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-warmgrey shadow-lg py-2 z-20 text-xs font-semibold divide-y divide-warmgrey">
              <Link
                href={`/discovery/${partnerPublicId}`}
                className="flex items-center space-x-2 px-4 py-2.5 text-charcoal hover:bg-ivory transition"
                onClick={() => setShowMenu(false)}
              >
                <span>View Full Biodata</span>
              </Link>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowReportModal(true);
                }}
                className="w-full text-left flex items-center space-x-2 px-4 py-2.5 text-rose-700 hover:bg-rose-50 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Report Candidate</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleBlockCandidate();
                }}
                className="w-full text-left flex items-center space-x-2 px-4 py-2.5 text-rose-700 hover:bg-rose-50 transition"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block Candidate</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security notice */}
      <div className="px-3 py-1.5 rounded-xl bg-ivory border border-warmgrey/80 mb-3 flex items-center justify-between text-[11px] text-charcoal-light flex-shrink-0">
        <span className="flex items-center space-x-1.5">
          <Lock className="w-3 h-3 text-gold-600" />
          <span>AES-256-GCM Encrypted Chat • Mutual Interest Verified</span>
        </span>
        <Link
          href="/connections"
          className="text-plum hover:underline font-bold text-[10px]"
        >
          Exchange Phone Number →
        </Link>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 rounded-3xl bg-white border border-warmgrey space-y-3.5 shadow-sm">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-8 text-charcoal-light text-xs">
            <div className="w-10 h-10 rounded-2xl bg-ivory border border-warmgrey flex items-center justify-center text-gold-600">
              <Shield className="w-5 h-5" />
            </div>
            <p className="font-bold text-plum">Encrypted Channel Ready</p>
            <p className="text-[11px] max-w-xs">
              Say hello to {partner?.name}! Respectful dialogue and dignified interactions are cherished in the Pal community.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderProfileId !== partner?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? "bg-plum text-ivory rounded-br-none"
                      : "bg-ivory border border-warmgrey text-charcoal rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>

                <div className="flex items-center space-x-1 mt-1 text-[10px] text-charcoal-light/70 px-1">
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && (
                    <span>
                      {m.readAt ? (
                        <CheckCheck className="w-3 h-3 text-forest" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="mt-3 flex items-center space-x-2 flex-shrink-0"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Type a respectful message to ${partner?.name || "candidate"}...`}
          className="flex-1 px-4 py-3 rounded-2xl border border-warmgrey bg-white text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-plum shadow-sm"
          maxLength={1000}
        />

        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="px-5 py-3 rounded-2xl bg-plum hover:bg-plum-900 disabled:opacity-50 text-ivory text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
        >
          <span>{sending ? "Sending..." : "Send"}</span>
          <Send className="w-3.5 h-3.5 text-gold-300" />
        </button>
      </form>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-warmgrey shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-warmgrey pb-3">
              <h3 className="font-extrabold text-sm text-plum flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Report Candidate ({partnerPublicId})</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg text-charcoal-light hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-charcoal block">Category</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-warmgrey bg-white text-charcoal"
                >
                  <option value="INAPPROPRIATE_CONTENT">Inappropriate Language / Vulgarity</option>
                  <option value="COMMERCIAL_SPAM">Commercial Solicitation / Financial Scams</option>
                  <option value="HARASSMENT">Harassment or Stalking</option>
                  <option value="FAKE_PROFILE">Suspected Fake Profile</option>
                  <option value="UNDERAGE">Suspected Underage Candidate</option>
                  <option value="OTHER">Other Violation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-charcoal block">Details (Confidential)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  placeholder="Provide context for community moderators..."
                  className="w-full p-2.5 rounded-xl border border-warmgrey text-xs bg-white text-charcoal"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl border border-warmgrey text-charcoal font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={safetySubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {safetySubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
