"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, Camera, Smartphone, Clock, Award } from "lucide-react";

export interface BadgeInfo {
  type: string;
  label: string;
  verified: boolean;
  pending?: boolean;
  available?: boolean;
  timestamp?: string | null;
  description: string;
}

interface VerificationBadgesProps {
  badges: BadgeInfo[];
  size?: "sm" | "md" | "lg";
}

export function VerificationBadges({ badges, size = "md" }: VerificationBadgesProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "MOBILE_OTP":
        return Smartphone;
      case "SELFIE":
        return Camera;
      case "ADMIN_REVIEWED":
        return ShieldCheck;
      case "OPTIONAL_ID":
        return Award;
      default:
        return CheckCircle2;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((b) => {
        const Icon = getIcon(b.type);

        if (b.verified) {
          return (
            <div
              key={b.type}
              title={b.description}
              className={`inline-flex items-center space-x-1.5 rounded-full font-bold transition shadow-xs ${
                size === "sm"
                  ? "px-2 py-0.5 text-[10px]"
                  : "px-3 py-1 text-xs"
              } ${
                b.type === "SELFIE"
                  ? "bg-gold-50 border border-gold-300 text-gold-800"
                  : b.type === "ADMIN_REVIEWED"
                  ? "bg-plum-50 border border-plum-200 text-plum"
                  : "bg-forest-50 border border-forest-200 text-forest"
              }`}
            >
              <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
              <span>{b.label}</span>
              <CheckCircle2 className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
            </div>
          );
        }

        if (b.pending) {
          return (
            <div
              key={b.type}
              title={b.description}
              className={`inline-flex items-center space-x-1.5 rounded-full border border-warmgrey bg-ivory text-charcoal-light font-medium ${
                size === "sm"
                  ? "px-2 py-0.5 text-[10px]"
                  : "px-2.5 py-0.5 text-xs"
              }`}
            >
              <Clock className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
              <span>{b.label} (Review Pending)</span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
