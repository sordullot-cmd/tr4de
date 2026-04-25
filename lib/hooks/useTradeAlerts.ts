"use client";

import { useEffect, useRef } from "react";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { getLocalDateString } from "@/lib/dateUtils";

export interface AlertSettings {
  /** Active la surveillance globalement. */
  enabled: boolean;
  /** Seuil de gain quotidien (en devise du compte). 0 = désactivé. */
  dailyTakeProfit: number;
  /** Seuil de perte quotidien. Doit être positif (le hook ajoute le "-"). 0 = désactivé. */
  dailyMaxLoss: number;
  /** Nombre de pertes consécutives avant alerte. 0 = désactivé. */
  losingStreak: number;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  dailyTakeProfit: 500,
  dailyMaxLoss: 300,
  losingStreak: 3,
};

interface MinimalTrade {
  date?: string;
  pnl?: number;
}

function fireNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
    return;
  }
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/web-app-manifest-192x192.png" });
  } catch {}
}

function fireToast(title: string, body: string, severity: "info" | "warn" | "danger" = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tr4de:alert", { detail: { title, body, severity } }));
}

function todayPnL(trades: MinimalTrade[]): number {
  const today = getLocalDateString();
  return trades.reduce((sum, t) => {
    if (!t.date) return sum;
    const d = String(t.date).split("T")[0];
    return d === today ? sum + (t.pnl || 0) : sum;
  }, 0);
}

function consecutiveLosses(trades: MinimalTrade[]): number {
  // Trades supposés en ordre chronologique (le hook les trie d'abord).
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const pnl = trades[i].pnl || 0;
    if (pnl < 0) streak++;
    else break;
  }
  return streak;
}

/**
 * useTradeAlerts — surveille les trades et déclenche des notifications navigateur
 * (+ un événement `tr4de:alert` interne pour toast UI) quand les seuils sont
 * dépassés. Idempotent par jour : ne refire pas la même alerte plusieurs fois.
 */
export function useTradeAlerts(trades: MinimalTrade[]): void {
  const [settings] = useCloudState<AlertSettings>(
    "tr4de_alert_settings",
    "alert_settings",
    DEFAULT_ALERT_SETTINGS
  );
  const firedTodayRef = useRef<Set<string>>(new Set());
  const firedDateRef = useRef<string>("");

  useEffect(() => {
    if (!settings.enabled || !Array.isArray(trades) || trades.length === 0) return;

    // Reset daily fired keys when the day changes
    const today = getLocalDateString();
    if (firedDateRef.current !== today) {
      firedDateRef.current = today;
      firedTodayRef.current = new Set();
    }
    const fired = firedTodayRef.current;

    const sorted = [...trades].sort((a, b) =>
      new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
    );

    // 1) Daily take profit
    const tp = settings.dailyTakeProfit;
    if (tp > 0 && !fired.has("tp")) {
      const pnlToday = todayPnL(sorted);
      if (pnlToday >= tp) {
        fired.add("tp");
        fireNotification("🎯 Take profit atteint", `P&L du jour : +${pnlToday.toFixed(2)}`);
        fireToast("Take profit atteint", `+${pnlToday.toFixed(2)} aujourd'hui`, "info");
      }
    }

    // 2) Daily max loss
    const mloss = settings.dailyMaxLoss;
    if (mloss > 0 && !fired.has("mloss")) {
      const pnlToday = todayPnL(sorted);
      if (pnlToday <= -mloss) {
        fired.add("mloss");
        fireNotification("🚨 Perte journalière dépassée", `P&L du jour : ${pnlToday.toFixed(2)}. Stop trading recommandé.`);
        fireToast("Perte journalière dépassée", `${pnlToday.toFixed(2)} aujourd'hui`, "danger");
      }
    }

    // 3) Losing streak
    const ls = settings.losingStreak;
    if (ls > 0) {
      const streak = consecutiveLosses(sorted);
      const key = `streak-${streak}`;
      if (streak >= ls && !fired.has(key)) {
        fired.add(key);
        fireNotification("⚠️ Série perdante", `${streak} pertes consécutives. Pause recommandée.`);
        fireToast("Série perdante", `${streak} pertes d'affilée`, "warn");
      }
    }
  }, [trades, settings]);
}
