import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { fr } from "@/i18n/fr";
import { SW_SCOPE, SW_URL } from "@/lib/pwa/sw";
import { siteUrl } from "@/lib/site";

import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const defaultTitle = `${fr.app.name} — ${fr.app.fullName}`;
const description = `${fr.app.tagline} Coach nutrition, sport et communauté, casher-natif.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: fr.app.name,
  title: { default: defaultTitle, template: `%s — ${fr.app.name}` },
  description,
  appleWebApp: { capable: true, statusBarStyle: "default", title: fr.app.name },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: fr.app.name,
    locale: "fr_FR",
    title: defaultTitle,
    description,
  },
  twitter: { card: "summary", title: defaultTitle, description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F1EA" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        {/* Keyboard users jump straight to the page content (AA). */}
        <a
          href="#main"
          className="sr-only z-50 rounded-[10px] bg-ink px-4 py-2 font-semibold text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {fr.a11y.skipToContent}
        </a>
        <SerwistProvider
          swUrl={SW_URL}
          options={{ scope: SW_SCOPE }}
          // The offline queue handles reconnection itself (no hard reload).
          reloadOnOnline={false}
          disable={process.env.NODE_ENV !== "production"}
        >
          {children}
        </SerwistProvider>
        <Toaster />
      </body>
    </html>
  );
}
