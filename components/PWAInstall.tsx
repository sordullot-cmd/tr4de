"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * PWAInstall — gère l'enregistrement du service worker et l'invite
 * d'installation (BeforeInstallPromptEvent).
 *
 * - Enregistre /sw.js au mount
 * - Capture l'événement `beforeinstallprompt` et propose un bouton d'install
 *   discret en bas-gauche (dismissible 7 jours via localStorage)
 */

const DISMISS_KEY = "tr4de_pwa_install_dismissed_until";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Eviter d'enregistrer le SW en dev (HMR / cache busting déjà géré par Next)
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[PWA] sw register failed:", err?.message || err);
    });
  }, []);

  // Capture install prompt
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() < dismissedUntil) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const onInstall = async () => {
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "dismissed") {
        // 7 jours de pause
        localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      }
    } catch {}
    setVisible(false);
    setDeferredPrompt(null);
  };

  const onClose = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Installer tao trade"
      style={{
        position: "fixed",
        left: 16, bottom: 16,
        zIndex: 9997,
        maxWidth: 320,
        background: "#FFFFFF",
        border: "1px solid #E5E5E5",
        borderRadius: 12,
        padding: 14,
        boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
        fontFamily: "var(--font-sans)",
        animation: "fadeUp 220ms cubic-bezier(0.4, 0, 0.2, 1) both",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: "#0D0D0D",
          color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, flexShrink: 0,
        }}>t</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0D0D0D", marginBottom: 2 }}>
            Installer tao trade
          </div>
          <div style={{ fontSize: 11, color: "#5C5C5C", marginBottom: 10 }}>
            Accès direct depuis l&apos;écran d&apos;accueil, mode hors-ligne basique.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onInstall}
              style={{
                padding: "6px 12px", borderRadius: 6, border: "none",
                background: "#0D0D0D", color: "#FFFFFF",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}
            >
              <Download size={12} strokeWidth={2} /> Installer
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "6px 10px", borderRadius: 6,
                border: "1px solid #E5E5E5", background: "#FFFFFF",
                color: "#5C5C5C", fontSize: 12, fontWeight: 500, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#8E8E8E", padding: 2 }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
