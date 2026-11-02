import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-devanagari",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "पाल मैट्रिमोनी (Pal Matrimony) — gadariya.org",
  description:
    "पाल (गड़ेरिया) समाज का विश्वसनीय वैवाहिक मंच। रिश्तों की नई शुरुआत, विश्वास के साथ। Where Trust Begins, Relationships Blossom.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi" className={`${inter.variable} ${notoSansDevanagari.variable}`}>
      <body className="min-h-screen flex flex-col antialiased bg-ivory text-charcoal font-sans">
        <I18nProvider>
          <AppHeader />
          <main className="flex-1">{children}</main>
          <AppFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
