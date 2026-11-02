import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pal Matrimony — Trusted Profiles. Respectful Connections. Private by Design.",
  description:
    "The trusted matrimonial platform for the Pal (Gadaria) community. Strictly verified profiles, zero contact leakage, and dual-approval privacy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <header className="border-b border-orange-100 bg-white/90 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                प
              </div>
              <div>
                <span className="font-bold text-xl text-stone-900 tracking-tight">Pal Matrimony</span>
                <span className="text-xs text-orange-600 block font-medium -mt-1">पाल वैवाहिक मंच</span>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              <a
                href="#safety"
                className="text-stone-600 hover:text-stone-900 text-sm font-medium transition"
              >
                Privacy & Safety
              </a>
              <a
                href="#verification"
                className="text-stone-600 hover:text-stone-900 text-sm font-medium transition"
              >
                Verification
              </a>
              <a
                href="/login"
                className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
              >
                Sign In
              </a>
              <a
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition"
              >
                Register Free
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-stone-200 bg-stone-50 py-10 text-stone-600 text-sm">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="font-bold text-stone-900 mb-2">Pal Matrimony</div>
              <p className="text-stone-500 text-xs leading-relaxed">
                Dedicated exclusively to members of the Pal (Gadaria) community.
                Built on high-trust verification, zero contact leakage, and explicit mutual consent.
              </p>
            </div>
            <div>
              <div className="font-bold text-stone-900 mb-2">Non-Negotiable Privacy</div>
              <ul className="text-xs space-y-1 text-stone-500">
                <li>• No phone numbers or emails shown in discovery</li>
                <li>• Dual bilateral approval required for contact exchange</li>
                <li>• Watermarked biodata with recipient ID tracking</li>
                <li>• Full DPDP Act 2025 compliance & audit logging</li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-stone-900 mb-2">Community & Support</div>
              <p className="text-xs text-stone-500">
                Free evergreen registration and discovery. For assistance or grievances, contact{" "}
                <span className="font-medium text-stone-800">support@palmatrimony.in</span>.
              </p>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 mt-8 pt-4 border-t border-stone-200 text-center text-xs text-stone-400">
            © 2026 Pal Matrimony. All rights reserved. Self-declared community affiliation with manual admin review.
          </div>
        </footer>
      </body>
    </html>
  );
}
