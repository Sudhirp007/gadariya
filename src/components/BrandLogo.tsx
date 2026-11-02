"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

interface BrandLogoProps {
  variant?: "full" | "icon";
  className?: string;
  isLight?: boolean;
}

export function BrandLogo({ variant = "full", className = "", isLight = false }: BrandLogoProps) {
  const { locale } = useTranslation();

  return (
    <Link href="/" className={`inline-flex items-center space-x-3 group ${className}`}>
      {/* Approved Symbol: Two Interlocking Forms + Subtle Heart (Royal Plum & Antique Gold) */}
      <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 40 40"
          className="w-10 h-10 transform group-hover:scale-105 transition duration-200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer circle / base container */}
          <rect width="40" height="40" rx="12" fill={isLight ? "#ffffff" : "#702747"} />

          {/* Left loop (Plum / Gold) */}
          <path
            d="M14 14C11.7909 14 10 15.7909 10 18C10 22 17 27 20 29C18 25 14 20 14 18C14 16.8954 14.8954 16 16 16C17.1046 16 18 16.8954 18 18V21"
            stroke={isLight ? "#702747" : "#C6A15B"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right interlocking loop (Two families uniting into heart) */}
          <path
            d="M26 14C28.2091 14 30 15.7909 30 18C30 22 23 27 20 29C22 25 26 20 26 18C26 16.8954 25.1046 16 24 16C22.8954 16 22 16.8954 22 18V21"
            stroke={isLight ? "#C6A15B" : "#FFF9F2"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center decorative gold bindu / connection point */}
          <circle cx="20" cy="18" r="1.75" fill={isLight ? "#C6A15B" : "#C6A15B"} />
        </svg>
      </div>

      {variant === "full" && (
        <div className="flex flex-col">
          <span
            className={`font-bold text-lg sm:text-xl tracking-tight leading-tight ${
              isLight ? "text-white" : "text-plum-700"
            }`}
          >
            {locale === "hi" ? "पाल मैट्रिमोनी" : "Pal Matrimony"}
          </span>
          <span
            className={`text-[11px] font-medium tracking-wide ${
              isLight ? "text-gold-300" : "text-gold-600"
            }`}
          >
            gadariya.org
          </span>
        </div>
      )}
    </Link>
  );
}
