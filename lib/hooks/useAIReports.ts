"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AIReport {
  id: string;
  report_type: "daily" | "weekly";
  period_start: string;
  period_end: string;
  title: string | null;
  content: string;
  stats: {
    totalTrades?: number;
    wins?: number;
    losses?: number;
    winRate?: number;
    totalPnL?: number;
    bestSetup?: string | null;
    worstSetup?: string | null;
  } | null;
  is_read: boolean;
  created_at: string;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -13 : -7 - (day - 1); // lundi de la semaine precedente
  d.setDate(d.getDate() + diff);
  return ymd(d);
}

export type ReportStatus =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "success"; message: string }
  | { kind: "no_trades"; message: string }
  | { kind: "error"; message: string };

export function useAIReports(opts: { autoGenerate?: boolean; trades?: any[] } = {}) {
  const { autoGenerate = true, trades = [] } = opts;
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<ReportStatus>({ kind: "idle" });
  const autoRunRef = useRef(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/reports?limit=30", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setReports([]);
        setStatus({ kind: "error", message: `Erreur ${res.status}: ${text.slice(0, 200) || "impossible de charger les rapports (migrations appliquees ?)"}` });
        return;
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error("Fetch reports error:", e);
      setStatus({ kind: "error", message: "Impossible de contacter le serveur" });
    } finally {
      setLoading(false);
    }
  }, []);

  const generate = useCallback(async (type: "daily" | "weekly", date?: string, force = false): Promise<AIReport | null> => {
    setGenerating(true);
    setStatus({ kind: "generating" });
    try {
      const res = await fetch("/api/ai/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, date, force, trades }),
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { rawText: raw }; }

      if (!res.ok) {
        const hint = res.status === 500 ? " (verifie que les migrations 007-009 sont appliquees)" : "";
        const msg = data?.error ? `Erreur ${res.status}: ${data.error}${hint}` : `Erreur ${res.status}${hint}`;
        setStatus({ kind: "error", message: msg });
        return null;
      }
      if (data.error === "no_trades") {
        setStatus({ kind: "no_trades", message: type === "daily" ? "Aucun trade sur ce jour — impossible de generer le rapport" : "Aucun trade sur cette semaine — impossible de generer le rapport" });
        return null;
      }
      if (data.report) {
        setReports(prev => {
          const filtered = prev.filter(r => !(r.report_type === data.report.report_type && r.period_start === data.report.period_start));
          return [data.report, ...filtered];
        });
        setStatus({ kind: "success", message: data.cached ? "Rapport deja existant — affiche" : "Rapport genere avec succes" });
        return data.report as AIReport;
      }
      setStatus({ kind: "error", message: "Reponse serveur inattendue" });
      return null;
    } catch (e: any) {
      console.error("Generate report error:", e);
      setStatus({ kind: "error", message: `Erreur reseau: ${e?.message || "inconnue"}` });
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await fetch("/api/ai/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, is_read: true }),
      });
      setReports(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r));
    } catch (e) {
      console.error("Mark read error:", e);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Auto-trigger: hier (daily) + lundi de la semaine precedente (weekly)
  useEffect(() => {
    if (!autoGenerate || autoRunRef.current || loading) return;
    if (!trades || trades.length === 0) return;
    autoRunRef.current = true;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = ymd(yesterday);

    const lastWeekMonday = lastMondayISO();

    (async () => {
      // Daily pour hier si pas deja genere et si trades hier
      const hasDailyYesterday = reports.some(r => r.report_type === "daily" && r.period_start === yesterdayISO);
      if (!hasDailyYesterday) {
        const tradesYesterday = (trades as any[]).filter((t: any) => {
          const d = new Date(t.entry_time || t.date);
          return ymd(d) === yesterdayISO;
        });
        if (tradesYesterday.length > 0) {
          await generate("daily", yesterdayISO, false);
        }
      }

      // Weekly pour la semaine precedente si on est lundi ou apres et pas deja genere
      const today = new Date();
      const isMondayOrLater = today.getDay() !== 0; // tout sauf dimanche
      const hasWeekly = reports.some(r => r.report_type === "weekly" && r.period_start === lastWeekMonday);
      if (isMondayOrLater && !hasWeekly) {
        const weekStart = new Date(lastWeekMonday);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
        const tradesWeek = (trades as any[]).filter((t: any) => {
          const d = new Date(t.entry_time || t.date);
          return d >= weekStart && d <= weekEnd;
        });
        if (tradesWeek.length > 0) {
          await generate("weekly", lastWeekMonday, false);
        }
      }
    })();
  }, [autoGenerate, loading, reports, trades, generate]);

  const unreadCount = reports.filter(r => !r.is_read).length;
  const latestDaily = reports.find(r => r.report_type === "daily") || null;
  const latestWeekly = reports.find(r => r.report_type === "weekly") || null;

  return { reports, loading, generating, status, clearStatus: () => setStatus({ kind: "idle" }), generate, markRead, refetch: fetchReports, unreadCount, latestDaily, latestWeekly };
}
