"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import {
  MessageSquare,
  Shield,
  Heart,
  Clock,
  CheckCheck,
  Search,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function ConversationsPage() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const filtered = conversations.filter(
    (c) =>
      c.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.partnerPublicId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warmgrey pb-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-plum text-ivory flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-gold-300" />
            </div>
            <h1 className="text-2xl font-extrabold text-plum">
              Mutual Interest Conversations
            </h1>
          </div>
          <p className="text-xs text-charcoal-light">
            End-to-end encrypted (AES-256-GCM) bilateral messages with verified community matches
          </p>
        </div>

        <Link
          href="/connections"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-ivory border border-warmgrey text-plum hover:bg-stone-100 text-xs font-bold transition self-start sm:self-auto"
        >
          <Heart className="w-3.5 h-3.5 text-plum" />
          <span>View All Interests</span>
        </Link>
      </div>

      {/* Security notice banner */}
      <div className="p-4 rounded-2xl bg-plum-50 border border-plum-100 flex items-start space-x-3 text-xs text-charcoal">
        <Shield className="w-4 h-4 text-plum flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-plum block">
            Privacy-by-Design Matrimonial Messaging
          </span>
          <p className="text-[11px] text-charcoal-light leading-relaxed">
            Messaging is strictly unlocked only after mutual interest acceptance. All messages are encrypted at rest with AES-256-GCM. Direct phone numbers remain protected until bilateral contact exchange approval.
          </p>
        </div>
      </div>

      {/* Search filter */}
      {conversations.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-charcoal-light absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search conversations by name or PAL ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warmgrey text-xs bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-plum"
          />
        </div>
      )}

      {/* Conversation Cards List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-plum font-semibold flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-gold-600" />
          <span>Loading conversations...</span>
        </div>
      ) : conversations.length === 0 ? (
        <div className="p-12 rounded-3xl border border-warmgrey bg-white text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-ivory text-gold-600 flex items-center justify-center mx-auto border border-warmgrey">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-plum">No Active Conversations Yet</h3>
            <p className="text-xs text-charcoal-light max-w-md mx-auto">
              Once you and another member mutually accept an interest request in Discovery, an encrypted bilateral chat channel will be unlocked here.
            </p>
          </div>
          <Link
            href="/discovery"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-plum hover:bg-plum-900 text-ivory text-xs font-bold transition shadow-sm"
          >
            <span>Explore Discovery Profiles</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-2xl border border-warmgrey bg-white text-center text-xs text-charcoal-light">
          No matches found for &quot;{searchTerm}&quot;.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Link
              key={item.partnerId}
              href={`/messages/${item.partnerPublicId}`}
              className="block p-5 rounded-2xl border border-warmgrey bg-white hover:border-plum hover:shadow-sm transition group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  {/* Avatar / Initial circle */}
                  <div className="w-12 h-12 rounded-2xl bg-plum text-ivory flex items-center justify-center font-bold text-base flex-shrink-0 group-hover:scale-105 transition shadow-sm">
                    {item.partnerName.charAt(0)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-plum group-hover:text-plum-900">
                        {item.partnerName}
                      </span>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-plum-50 text-plum border border-plum-100">
                        {item.partnerPublicId}
                      </span>
                      {item.isBlocked && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                          Blocked
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-charcoal-light line-clamp-1">
                      {item.lastMessage ? (
                        <span>
                          {item.lastMessage.senderProfileId === item.partnerId
                            ? ""
                            : "You: "}
                          {item.lastMessage.body}
                        </span>
                      ) : (
                        <span className="italic text-charcoal-light/70">
                          Mutual interest accepted. Tap to start chatting!
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1.5 flex-shrink-0">
                  {item.lastMessage?.createdAt && (
                    <span className="text-[11px] text-charcoal-light">
                      {new Date(item.lastMessage.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}

                  {item.unreadCount > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-gold-600 text-ivory text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                      {item.unreadCount}
                    </span>
                  ) : item.lastMessage ? (
                    <CheckCheck className="w-4 h-4 text-forest" />
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
