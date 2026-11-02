import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "पाल वैवाहिक मंच (Pal Matrimony) — gadariya.org",
  description:
    "पाल (गड़ेरिया) समाज का विश्वसनीय वैवाहिक मंच। Trusted Profiles. Respectful Connections. Private by Design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi">
      <body className="min-h-screen flex flex-col antialiased">
        <I18nProvider>
          <AppHeader />
          <main className="flex-1">{children}</main>
          <AppFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
