import React from "react";
import { ShieldCheck, Lock, Users, FileCheck2, UserCheck, Heart } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 text-center space-y-6 pt-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold tracking-wide uppercase">
          <ShieldCheck className="w-4 h-4 text-orange-600" />
          <span>Pal (Gadaria) Community Dedicated Platform</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight max-w-3xl mx-auto leading-tight">
          Trusted Profiles. Respectful Connections. <br />
          <span className="text-orange-600">Private by Design.</span>
        </h1>

        <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          The high-trust matrimony platform built specifically for the Pal community. 
          Your phone number and private biodata are never exposed until both parties explicitly agree.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-md transition text-base"
          >
            Create Verified Profile (Free)
          </a>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-stone-50 text-stone-800 font-semibold rounded-xl border border-stone-300 shadow-sm transition text-base"
          >
            Explore How We Protect Privacy
          </a>
        </div>
      </section>

      {/* Trust Invariants Cards */}
      <section id="safety" className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Zero Contact Leakage</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Phone numbers, email addresses, and residential locations are strictly encrypted. 
              They are never sent in search results or public profile cards.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Dual-Approval Exchange</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Contact exchange is an iron-clad bilateral state machine. 
              Both parties must independently approve the request before contact info is revealed.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Watermarked Biodata</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              When you permit a family to view your biodata, downloaded PDFs carry a tamper-evident 
              watermark encoding the recipient&apos;s unique ID and timestamp.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 bg-orange-50/60 rounded-3xl p-8 md:p-12 border border-orange-100">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900">How Pal Matrimony Works</h2>
          <p className="text-stone-600 text-sm">
            Simple, dignified steps ensuring complete respect and security for candidates and families.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold mx-auto flex items-center justify-center text-sm shadow">
              1
            </div>
            <h4 className="font-semibold text-stone-900">Register with OTP</h4>
            <p className="text-xs text-stone-500">
              Verify your mobile and email securely. Underage profiles are rejected at the gate.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold mx-auto flex items-center justify-center text-sm shadow">
              2
            </div>
            <h4 className="font-semibold text-stone-900">Complete Biodata</h4>
            <p className="text-xs text-stone-500">
              Add education, profession, family background, and private photos with visibility controls.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold mx-auto flex items-center justify-center text-sm shadow">
              3
            </div>
            <h4 className="font-semibold text-stone-900">Manual Verification</h4>
            <p className="text-xs text-stone-500">
              Admin team reviews selfies against profile photos to issue genuine verification badges.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold mx-auto flex items-center justify-center text-sm shadow">
              4
            </div>
            <h4 className="font-semibold text-stone-900">Connect with Dignity</h4>
            <p className="text-xs text-stone-500">
              Exchange interests, chat after mutual consent, and release contact numbers only when ready.
            </p>
          </div>
        </div>
      </section>

      {/* Community Callout */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <Heart className="w-8 h-8 text-orange-600 mx-auto" />
        <h3 className="text-2xl font-bold text-stone-900">For the Community, By the Community</h3>
        <p className="text-stone-600 text-sm max-w-xl mx-auto leading-relaxed">
          Pal Matrimony honors our traditions while providing modern privacy standards. 
          Managed directly by adult candidates or trusted family managers with granular permission controls.
        </p>
        <div className="pt-2">
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm rounded-xl shadow-sm transition"
          >
            Join Pal Matrimony Today
          </a>
        </div>
      </section>
    </div>
  );
}
