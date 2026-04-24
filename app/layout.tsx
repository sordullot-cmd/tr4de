import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/supabaseAuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tr4de",
  description: "Professional trading platform with analytics",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Applique le thème enregistré avant l'hydratation (évite le flash) */}
        <Script id="tr4de-theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('tr4de_theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}`}
        </Script>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
