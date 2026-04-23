/**
 * Detection de patterns comportementaux pour le coaching personnalise
 * Analyse les trades de l'user et retourne une liste de patterns upsertables.
 */

export interface DetectedPattern {
  pattern_type: string;
  pattern_key: string;
  pattern_data: {
    detail: string;
    [k: string]: any;
  };
  occurrences: number;
  avg_pnl_impact: number | null;
  confidence: number;
}

interface TradeLite {
  id: string;
  symbol: string;
  direction: string;
  entry_time: string;
  pnl: number | null;
  setup_name: string | null;
  quantity: number | null;
  risk_reward_ratio?: number | null;
}

interface EmotionTagRow {
  trade_id: string;
  emotion_tags: string[] | null;
}

const REVENGE_WINDOW_MIN = 15;
const OVERTRADING_DAILY_THRESHOLD = 8;
const LOSING_STREAK_THRESHOLD = 3;
const MIN_TRADES_FOR_SETUP = 3;

export function detectPatterns(trades: TradeLite[], emotionTags: EmotionTagRow[] = []): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (!trades || trades.length === 0) return patterns;

  // Grouper par jour
  const byDay = new Map<string, TradeLite[]>();
  trades.forEach(t => {
    const d = new Date(t.entry_time).toISOString().split("T")[0];
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(t);
  });

  // === REVENGE TRADING ===
  // Trade < 15min apres une perte
  const revengeEvents: number[] = [];
  byDay.forEach((dayTrades) => {
    dayTrades.sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    for (let i = 1; i < dayTrades.length; i++) {
      const prev = dayTrades[i - 1];
      const cur = dayTrades[i];
      if ((prev.pnl || 0) < 0) {
        const dt = (new Date(cur.entry_time).getTime() - new Date(prev.entry_time).getTime()) / 60000;
        if (dt > 0 && dt < REVENGE_WINDOW_MIN) {
          revengeEvents.push(cur.pnl || 0);
        }
      }
    }
  });
  if (revengeEvents.length >= 2) {
    const avgImpact = revengeEvents.reduce((s, v) => s + v, 0) / revengeEvents.length;
    patterns.push({
      pattern_type: "revenge_trading",
      pattern_key: "default",
      pattern_data: {
        detail: `${revengeEvents.length} trades pris en moins de ${REVENGE_WINDOW_MIN}min apres une perte`,
        window_min: REVENGE_WINDOW_MIN,
      },
      occurrences: revengeEvents.length,
      avg_pnl_impact: avgImpact,
      confidence: Math.min(100, revengeEvents.length * 15),
    });
  }

  // === OVERTRADING ===
  // Jours avec > 8 trades
  const overDays: string[] = [];
  const overDayPnL: number[] = [];
  byDay.forEach((dayTrades, date) => {
    if (dayTrades.length > OVERTRADING_DAILY_THRESHOLD) {
      overDays.push(date);
      const totalPnL = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      overDayPnL.push(totalPnL);
    }
  });
  if (overDays.length >= 2) {
    const avgImpact = overDayPnL.reduce((s, v) => s + v, 0) / overDayPnL.length;
    patterns.push({
      pattern_type: "overtrading",
      pattern_key: "default",
      pattern_data: {
        detail: `${overDays.length} jours avec plus de ${OVERTRADING_DAILY_THRESHOLD} trades`,
        threshold: OVERTRADING_DAILY_THRESHOLD,
        days: overDays.slice(-5),
      },
      occurrences: overDays.length,
      avg_pnl_impact: avgImpact,
      confidence: Math.min(100, overDays.length * 20),
    });
  }

  // === LOSING STREAK ===
  let totalStreaks = 0;
  const streakPnLs: number[] = [];
  byDay.forEach((dayTrades) => {
    dayTrades.sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    let streak = 0;
    let streakPnL = 0;
    dayTrades.forEach(t => {
      if ((t.pnl || 0) < 0) {
        streak++;
        streakPnL += t.pnl || 0;
      } else {
        if (streak >= LOSING_STREAK_THRESHOLD) {
          totalStreaks++;
          streakPnLs.push(streakPnL);
        }
        streak = 0;
        streakPnL = 0;
      }
    });
    if (streak >= LOSING_STREAK_THRESHOLD) {
      totalStreaks++;
      streakPnLs.push(streakPnL);
    }
  });
  if (totalStreaks > 0) {
    const avgImpact = streakPnLs.length > 0 ? streakPnLs.reduce((s, v) => s + v, 0) / streakPnLs.length : 0;
    patterns.push({
      pattern_type: "losing_streak",
      pattern_key: "default",
      pattern_data: {
        detail: `${totalStreaks} series de ${LOSING_STREAK_THRESHOLD}+ pertes consecutives`,
        threshold: LOSING_STREAK_THRESHOLD,
      },
      occurrences: totalStreaks,
      avg_pnl_impact: avgImpact,
      confidence: Math.min(100, totalStreaks * 25),
    });
  }

  // === BEST / WORST SETUP ===
  const setupAgg = new Map<string, { count: number; wins: number; pnl: number }>();
  trades.forEach(t => {
    const s = t.setup_name || "Non defini";
    if (!setupAgg.has(s)) setupAgg.set(s, { count: 0, wins: 0, pnl: 0 });
    const agg = setupAgg.get(s)!;
    agg.count++;
    if ((t.pnl || 0) > 0) agg.wins++;
    agg.pnl += t.pnl || 0;
  });
  let bestSetup: { name: string; pnl: number; wr: number; count: number } | null = null;
  let worstSetup: { name: string; pnl: number; wr: number; count: number } | null = null;
  setupAgg.forEach((a, name) => {
    if (a.count < MIN_TRADES_FOR_SETUP) return;
    const wr = (a.wins / a.count) * 100;
    if (!bestSetup || a.pnl > bestSetup.pnl) bestSetup = { name, pnl: a.pnl, wr, count: a.count };
    if (!worstSetup || a.pnl < worstSetup.pnl) worstSetup = { name, pnl: a.pnl, wr, count: a.count };
  });
  if (bestSetup && (bestSetup as any).pnl > 0) {
    const bs = bestSetup as { name: string; pnl: number; wr: number; count: number };
    patterns.push({
      pattern_type: "best_setup",
      pattern_key: bs.name,
      pattern_data: {
        detail: `Setup "${bs.name}" genere +${bs.pnl.toFixed(2)}$ (WR ${bs.wr.toFixed(0)}% sur ${bs.count} trades)`,
        setup_name: bs.name,
        win_rate: bs.wr,
        total_pnl: bs.pnl,
        trade_count: bs.count,
      },
      occurrences: bs.count,
      avg_pnl_impact: bs.pnl / bs.count,
      confidence: Math.min(100, bs.count * 10),
    });
  }
  if (worstSetup && (worstSetup as any).pnl < 0) {
    const ws = worstSetup as { name: string; pnl: number; wr: number; count: number };
    patterns.push({
      pattern_type: "worst_setup",
      pattern_key: ws.name,
      pattern_data: {
        detail: `Setup "${ws.name}" coute ${ws.pnl.toFixed(2)}$ (WR ${ws.wr.toFixed(0)}% sur ${ws.count} trades)`,
        setup_name: ws.name,
        win_rate: ws.wr,
        total_pnl: ws.pnl,
        trade_count: ws.count,
      },
      occurrences: ws.count,
      avg_pnl_impact: ws.pnl / ws.count,
      confidence: Math.min(100, ws.count * 10),
    });
  }

  // === BEST HOUR (par P&L) ===
  const hourAgg = new Map<number, { count: number; pnl: number }>();
  trades.forEach(t => {
    const h = new Date(t.entry_time).getHours();
    if (!hourAgg.has(h)) hourAgg.set(h, { count: 0, pnl: 0 });
    const agg = hourAgg.get(h)!;
    agg.count++;
    agg.pnl += t.pnl || 0;
  });
  let bestHour: { h: number; pnl: number; count: number } | null = null;
  let worstHour: { h: number; pnl: number; count: number } | null = null;
  hourAgg.forEach((a, h) => {
    if (a.count < 3) return;
    if (!bestHour || a.pnl > bestHour.pnl) bestHour = { h, pnl: a.pnl, count: a.count };
    if (!worstHour || a.pnl < worstHour.pnl) worstHour = { h, pnl: a.pnl, count: a.count };
  });
  if (bestHour && (bestHour as any).pnl > 0) {
    const bh = bestHour as { h: number; pnl: number; count: number };
    patterns.push({
      pattern_type: "best_hour",
      pattern_key: String(bh.h),
      pattern_data: {
        detail: `Tu performes le mieux a ${bh.h}h: +${bh.pnl.toFixed(2)}$ sur ${bh.count} trades`,
        hour: bh.h,
        total_pnl: bh.pnl,
        trade_count: bh.count,
      },
      occurrences: bh.count,
      avg_pnl_impact: bh.pnl / bh.count,
      confidence: Math.min(100, bh.count * 8),
    });
  }
  if (worstHour && (worstHour as any).pnl < 0) {
    const wh = worstHour as { h: number; pnl: number; count: number };
    patterns.push({
      pattern_type: "worst_hour",
      pattern_key: String(wh.h),
      pattern_data: {
        detail: `Tu perds le plus a ${wh.h}h: ${wh.pnl.toFixed(2)}$ sur ${wh.count} trades`,
        hour: wh.h,
        total_pnl: wh.pnl,
        trade_count: wh.count,
      },
      occurrences: wh.count,
      avg_pnl_impact: wh.pnl / wh.count,
      confidence: Math.min(100, wh.count * 8),
    });
  }

  // === EMOTION IMPACT ===
  const emotionMap = new Map<string, number[]>();
  emotionTags.forEach(row => {
    const trade = trades.find(t => t.id === row.trade_id);
    if (!trade || !row.emotion_tags) return;
    row.emotion_tags.forEach(e => {
      const key = String(e).toLowerCase().trim();
      if (!key) return;
      if (!emotionMap.has(key)) emotionMap.set(key, []);
      emotionMap.get(key)!.push(trade.pnl || 0);
    });
  });
  emotionMap.forEach((pnls, emotion) => {
    if (pnls.length < 3) return;
    const avg = pnls.reduce((s, v) => s + v, 0) / pnls.length;
    if (Math.abs(avg) < 10) return;
    patterns.push({
      pattern_type: "emotion_impact",
      pattern_key: emotion,
      pattern_data: {
        detail: `Emotion "${emotion}" detectee sur ${pnls.length} trades (avg ${avg > 0 ? "+" : ""}${avg.toFixed(2)}$)`,
        emotion,
        trade_count: pnls.length,
        avg_pnl: avg,
      },
      occurrences: pnls.length,
      avg_pnl_impact: avg,
      confidence: Math.min(100, pnls.length * 10),
    });
  });

  return patterns;
}
