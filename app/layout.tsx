import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/supabaseAuthProvider";
import { UndoProvider } from "@/lib/contexts/UndoContext";
import PWAInstall from "@/components/PWAInstall";
import ErrorBoundary from "@/components/ErrorBoundary";

// OpenAI Sans (locale) — variable utilisée dans toute l'app : --font-geist-sans
const openAISans = localFont({
  variable: "--font-geist-sans",
  display: "swap",
  src: [
    { path: "../public/fonts/OpenAISans-Light.woff2",         weight: "300", style: "normal" },
    { path: "../public/fonts/OpenAISans-LightItalic.woff2",   weight: "300", style: "italic" },
    { path: "../public/fonts/OpenAISans-Regular.woff2",       weight: "400", style: "normal" },
    { path: "../public/fonts/OpenAISans-RegularItalic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/OpenAISans-Medium.woff2",        weight: "500", style: "normal" },
    { path: "../public/fonts/OpenAISans-MediumItalic.woff2",  weight: "500", style: "italic" },
    { path: "../public/fonts/OpenAISans-Semibold.woff2",      weight: "600", style: "normal" },
    { path: "../public/fonts/OpenAISans-SemiboldItalic.woff2",weight: "600", style: "italic" },
    { path: "../public/fonts/OpenAISans-Bold.woff2",          weight: "700", style: "normal" },
    { path: "../public/fonts/OpenAISans-BoldItalic.woff2",    weight: "700", style: "italic" },
  ],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tao-trade.vercel.app"),
  title: {
    default: "tao trade",
    template: "%s · tao trade",
  },
  description: "Plateforme de trading : journal, stratégies, discipline, productivité.",
  applicationName: "tao trade",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  // Open Graph (Facebook / LinkedIn / Discord / Slack)
  openGraph: {
    type: "website",
    siteName: "tao trade",
    title: "tao trade",
    description: "Plateforme de trading : journal, stratégies, discipline, productivité.",
    url: "https://tao-trade.vercel.app",
    images: [
      { url: "/web-app-manifest-512x512.png", width: 512, height: 512, alt: "tao trade" },
    ],
    locale: "fr_FR",
  },
  // Twitter / X card
  twitter: {
    card: "summary",
    title: "tao trade",
    description: "Plateforme de trading : journal, stratégies, discipline, productivité.",
    images: ["/web-app-manifest-512x512.png"],
  },
  // Indexation : on autorise sur la landing/login (server-side redirect →
  // /login) ; les pages applicatives privées sont exclues via robots.ts.
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "tao trade",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0D0D0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${openAISans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Applique le thème enregistré avant l'hydratation (évite le flash) */}
        <Script id="tr4de-theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('tr4de_theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}`}
        </Script>
        <ErrorBoundary>
          <AuthProvider>
            <UndoProvider>
              {children}
            </UndoProvider>
          </AuthProvider>
        </ErrorBoundary>
        <PWAInstall />
      </body>
    </html>
  );
}
