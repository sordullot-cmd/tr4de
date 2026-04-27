import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/supabaseAuthProvider";
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
  title: "tao trade",
  description: "Professional trading platform with analytics",
  manifest: "/manifest.webmanifest",
  applicationName: "tao trade",
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
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <PWAInstall />
      </body>
    </html>
  );
}
