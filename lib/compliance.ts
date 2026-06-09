/**
 * Compliance engine — règles structurées + évaluation par trade + agrégats.
 *
 * Une règle a un type discriminé (`type`) et des paramètres typés (`params`).
 * `evaluateTrade(rule, trade, ctx)` retourne un Violation si la règle est
 * enfreinte, avec une métrique de distance ("de combien" la règle a été
 * dépassée) — c'est ce qui rend la discipline quantifiable.
 */

export type RuleType =
  | "position_limit"
  | "time_window"
  | "instrument_ban"
  | "instrument_only"
  | "max_trades_per_day"
  | "max_daily_loss"
  | "no_reentry_after_loss"
  | "min_rr"
  | "journaling";

export interface ComplianceRule {
  id: string;
  type: RuleType;
  active: boolean;
  created_at: string;   // ISO
  effective_at: string; // ISO — created_at + 24h, modifs aussi remettent à +24h
  params: {
    max?: number;            // position_limit, max_trades_per_day, max_daily_loss
    minTime?: string;        // time_window — "HH:MM"
    maxTime?: string;        // time_window — "HH:MM"
    symbols?: string[];      // instrument_ban / instrument_only
    minutes?: number;        // no_reentry_after_loss
    minRR?: number;          // min_rr
  };
  /** Override humain. Sinon `describeRule()` génère un libellé. */
  label?: string;
}

export interface Trade {
  id: string;
  date?: string;             // "YYYY-MM-DD" ou ISO
  symbol?: string;
  direction?: string;
  entry?: number | string;
  exit?: number | string;
  pnl?: number;
  entry_time?: string;       // "HH:MM" ou ISO
  exit_time?: string;
  quantity?: number;
  account_id?: string;
}

export interface Violation {
  rule_id: string;
  rule_type: RuleType;
  trade_id: string;
  date: string;             // YYYY-MM-DD
  /** Numéraire pour tri/insights : plus la valeur est grande, pire la transgression */
  distance: number;
  /** Libellé court ex "+2 contrats", "+4 min après fenêtre", "150€ over" */
  distance_label: string;
  /** Description complète de la transgression */
  message: string;
  /** Heure du trade pour clustering temporel ("HH:MM") */
  time?: string;
}

/** ───────────────────────── Helpers ───────────────────────── */

const LOCK_HOURS = 0;
export const RULE_LOCK_MS = LOCK_HOURS * 60 * 60 * 1000;

export function nowEffectiveAt(from: Date = new Date()): string {
  return new Date(from.getTime() + RULE_LOCK_MS).toISOString();
}

export function isRuleLive(rule: ComplianceRule, _at: Date = new Date()): boolean {
  return !!rule.active;
}

export function describeRule(rule: ComplianceRule): string {
  if (rule.label) return rule.label;
  const p = rule.params;
  switch (rule.type) {
    case "position_limit": return `Max ${p.max ?? "?"} contrats par trade`;
    case "time_window":    return `Trade entre ${p.minTime ?? "?"} et ${p.maxTime ?? "?"}`;
    case "instrument_ban": return `Pas de trade sur ${(p.symbols || []).join(", ")}`;
    case "instrument_only":return `Trade uniquement sur ${(p.symbols || []).join(", ")}`;
    case "max_trades_per_day": return `Max ${p.max ?? "?"} trades par jour`;
    case "max_daily_loss": return `Stop trading après ${p.max ?? "?"} de perte journalière`;
    case "no_reentry_after_loss": return `Cooldown ${p.minutes ?? "?"} min après un trade perdant`;
    case "min_rr":         return `RR minimum ${p.minRR ?? "?"}`;
    case "journaling":     return `Journal quotidien`;
  }
}

/** Parse "HH:MM" ou ISO "2024-01-15T11:04:00Z" en minutes depuis minuit local. */
function parseTimeToMin(s?: string): number | null {
  if (!s) return null;
  if (/^\d{2}:\d{2}/.test(s)) {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function tradeDate(t: Trade): string {
  if (t.date) {
    if (t.date.length >= 10) return t.date.slice(0, 10);
    return t.date;
  }
  if (t.entry_time) return new Date(t.entry_time).toISOString().slice(0, 10);
  return "";
}

function tradeTimeStr(t: Trade): string | undefined {
  if (t.entry_time) {
    if (/^\d{2}:\d{2}/.test(t.entry_time)) return t.entry_time.slice(0, 5);
    const d = new Date(t.entry_time);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
  return undefined;
}

/** ───────────────────────── Évaluation ───────────────────────── */

interface DayContext {
  /** Trades du même jour, dans l'ordre chronologique */
  dayTrades: Trade[];
  /** Index du trade courant dans dayTrades */
  index: number;
}

export function evaluateTrade(
  rule: ComplianceRule,
  trade: Trade,
  ctx: DayContext
): Violation | null {
  if (!isRuleLive(rule)) return null;
  const date = tradeDate(trade);
  const time = tradeTimeStr(trade);
  const base = {
    rule_id: rule.id,
    rule_type: rule.type,
    trade_id: trade.id,
    date,
    time,
  };

  switch (rule.type) {
    case "position_limit": {
      const max = rule.params.max ?? Infinity;
      const qty = Number(trade.quantity) || 0;
      if (qty > max) {
        const over = qty - max;
        return { ...base, distance: over, distance_label: `+${over} contrat${over > 1 ? "s" : ""}`,
          message: `Position de ${qty} (limite ${max})` };
      }
      return null;
    }
    case "time_window": {
      const tMin = parseTimeToMin(trade.entry_time);
      if (tMin == null) return null;
      const a = parseTimeToMin(rule.params.minTime);
      const b = parseTimeToMin(rule.params.maxTime);
      if (a == null || b == null) return null;
      if (tMin < a) {
        const d = a - tMin;
        return { ...base, distance: d, distance_label: `${d} min avant fenêtre`,
          message: `Entré à ${time} (fenêtre ${rule.params.minTime}–${rule.params.maxTime})` };
      }
      if (tMin > b) {
        const d = tMin - b;
        return { ...base, distance: d, distance_label: `${d} min après fenêtre`,
          message: `Entré à ${time} (fenêtre ${rule.params.minTime}–${rule.params.maxTime})` };
      }
      return null;
    }
    case "instrument_ban": {
      const sym = String(trade.symbol || "").toUpperCase();
      const banned = (rule.params.symbols || []).map(s => s.toUpperCase());
      if (banned.some(b => sym === b || sym.startsWith(b))) {
        return { ...base, distance: 1, distance_label: sym,
          message: `Trade sur ${sym} (interdit)` };
      }
      return null;
    }
    case "instrument_only": {
      const sym = String(trade.symbol || "").toUpperCase();
      const allowed = (rule.params.symbols || []).map(s => s.toUpperCase());
      if (allowed.length && !allowed.some(b => sym === b || sym.startsWith(b))) {
        return { ...base, distance: 1, distance_label: sym,
          message: `Trade sur ${sym} (autorisé : ${allowed.join(", ")})` };
      }
      return null;
    }
    case "max_trades_per_day": {
      const max = rule.params.max ?? Infinity;
      const n = ctx.index + 1;
      if (n > max) {
        const over = n - max;
        return { ...base, distance: over, distance_label: `+${over} trade${over > 1 ? "s" : ""}`,
          message: `Trade #${n} du jour (limite ${max})` };
      }
      return null;
    }
    case "max_daily_loss": {
      const max = rule.params.max ?? Infinity;
      let cumul = 0;
      for (let i = 0; i <= ctx.index; i++) cumul += Number(ctx.dayTrades[i].pnl) || 0;
      const loss = -cumul;
      if (loss > max) {
        const over = loss - max;
        return { ...base, distance: over, distance_label: `${Math.round(over)} over`,
          message: `Perte cumulée -${Math.round(loss)} (limite -${max})` };
      }
      return null;
    }
    case "no_reentry_after_loss": {
      const minMin = rule.params.minutes ?? 0;
      const prev = ctx.dayTrades[ctx.index - 1];
      if (!prev) return null;
      const prevPnl = Number(prev.pnl) || 0;
      if (prevPnl >= 0) return null;
      const prevExit = parseTimeToMin(prev.exit_time) ?? parseTimeToMin(prev.entry_time);
      const curEntry = parseTimeToMin(trade.entry_time);
      if (prevExit == null || curEntry == null) return null;
      const gap = curEntry - prevExit;
      if (gap < minMin) {
        const d = minMin - gap;
        return { ...base, distance: d, distance_label: `${d} min trop tôt`,
          message: `Re-entry ${gap} min après perte (cooldown ${minMin} min)` };
      }
      return null;
    }
    case "min_rr": {
      const minRR = rule.params.minRR ?? 0;
      const entry = Number(trade.entry);
      const exit = Number(trade.exit);
      const pnl = Number(trade.pnl) || 0;
      if (!isFinite(entry) || !isFinite(exit) || pnl === 0) return null;
      // RR estimé = |pnl| / risque(approx |entry-exit|*qty)
      const qty = Math.max(1, Number(trade.quantity) || 1);
      const risk = Math.abs(entry - exit) * qty;
      if (risk === 0) return null;
      const rr = Math.abs(pnl) / risk;
      if (pnl < 0) return null; // RR n'a de sens que sur winners
      if (rr < minRR) {
        const d = minRR - rr;
        return { ...base, distance: d, distance_label: `RR ${rr.toFixed(2)}`,
          message: `RR ${rr.toFixed(2)} (min ${minRR})` };
      }
      return null;
    }
    case "journaling":
      // Évaluée au niveau du jour dans computeStats (pas par trade).
      return null;
  }
}

/** ───────────────────────── Agrégats ───────────────────────── */

export interface ComplianceDay {
  date: string;
  trades: number;
  violations: number;
  /** `clean` : trades >0 + violations=0. `violated` : violations>0. `no-trade` : trades=0 */
  status: "clean" | "violated" | "no-trade";
}

export interface ComplianceStats {
  violations: Violation[];
  byDay: Map<string, ComplianceDay>;
  /** Jours consécutifs clean (en partant du jour le plus récent ayant tradé, à reculons) */
  streak: number;
  bestStreak: number;
  /** Win-rate des trades qui n'ont enfreint aucune règle */
  compliantWinRate: number;
  /** Win-rate des trades qui ont enfreint au moins une règle */
  violatingWinRate: number;
  multiplier: number;       // compliantWR / violatingWR (1 si pas de violations)
  totalTrades: number;
  compliantTrades: number;
  violatingTrades: number;
  complianceRatePct: number;  // % trading days clean
  /** Insights : règle la plus enfreinte, jours/heures à risque */
  topRule: { rule_type: RuleType; count: number } | null;
  topHourBin: { bin: string; count: number } | null;  // ex "11:00–11:45"
  topWeekday: { weekday: string; count: number } | null;
}

export function computeStats(
  rules: ComplianceRule[],
  trades: Trade[],
  journaledDates: Set<string> = new Set(),
): ComplianceStats {
  // Group trades by day, sorted chronologically
  const byDay = new Map<string, Trade[]>();
  for (const tr of trades) {
    const d = tradeDate(tr);
    if (!d) continue;
    const arr = byDay.get(d) || [];
    arr.push(tr);
    byDay.set(d, arr);
  }
  for (const [d, arr] of byDay) {
    arr.sort((a, b) => {
      const ta = parseTimeToMin(a.entry_time) ?? 0;
      const tb = parseTimeToMin(b.entry_time) ?? 0;
      return ta - tb;
    });
    byDay.set(d, arr);
  }

  // Évaluation
  const violations: Violation[] = [];
  const violatingTradeIds = new Set<string>();
  for (const [, dayTrades] of byDay) {
    for (let i = 0; i < dayTrades.length; i++) {
      const t = dayTrades[i];
      for (const rule of rules) {
        const v = evaluateTrade(rule, t, { dayTrades, index: i });
        if (v) {
          violations.push(v);
          violatingTradeIds.add(t.id);
        }
      }
    }
  }

  // Règles de journaling : évaluées au niveau du JOUR (pas du trade).
  // Un jour qui a tradé mais qui n'a pas été journalisé dans la page Journal
  // (ni note de session, ni note de trade) génère une violation — à l'inverse,
  // dès que la session est journalisée, aucune violation n'est levée.
  // On ne marque PAS les trades comme "violants" : la qualité d'exécution reste
  // indépendante, mais le jour passe en "violated" (casse le streak clean).
  const journalingRules = rules.filter(r => r.type === "journaling" && isRuleLive(r));
  if (journalingRules.length) {
    for (const [d, dayTrades] of byDay) {
      if (!dayTrades.length || journaledDates.has(d)) continue;
      for (const rule of journalingRules) {
        violations.push({
          rule_id: rule.id,
          rule_type: "journaling",
          trade_id: `journal:${d}`,
          date: d,
          distance: dayTrades.length,
          distance_label: "non journalisé",
          message: `Session non journalisée (${dayTrades.length} trade${dayTrades.length > 1 ? "s" : ""})`,
        });
      }
    }
  }

  // Day map avec status
  const dayMap = new Map<string, ComplianceDay>();
  for (const [d, arr] of byDay) {
    const dayViolations = violations.filter(v => v.date === d).length;
    dayMap.set(d, {
      date: d,
      trades: arr.length,
      violations: dayViolations,
      status: dayViolations > 0 ? "violated" : arr.length > 0 ? "clean" : "no-trade",
    });
  }

  // Streak : consécutifs clean en partant du dernier jour traded
  const sortedDays = [...dayMap.keys()].sort();
  let streak = 0;
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const day = dayMap.get(sortedDays[i])!;
    if (day.status === "clean") streak++;
    else break;
  }
  // Best streak : plus longue suite de clean dans l'historique
  let bestStreak = 0, run = 0;
  for (const d of sortedDays) {
    if (dayMap.get(d)!.status === "clean") {
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else if (dayMap.get(d)!.status === "violated") {
      run = 0;
    }
    // no-trade : on n'incrémente ni ne reset
  }

  // Win rates
  const totalTrades = trades.length;
  const compliantTrades = totalTrades - violatingTradeIds.size;
  const violatingTrades = violatingTradeIds.size;
  const compliantWins = trades.filter(t => !violatingTradeIds.has(t.id) && (t.pnl ?? 0) > 0).length;
  const violatingWins = trades.filter(t => violatingTradeIds.has(t.id) && (t.pnl ?? 0) > 0).length;
  const compliantWinRate = compliantTrades > 0 ? compliantWins / compliantTrades : 0;
  const violatingWinRate = violatingTrades > 0 ? violatingWins / violatingTrades : 0;
  const multiplier = violatingWinRate > 0 ? compliantWinRate / violatingWinRate : (compliantWinRate > 0 ? Infinity : 1);

  // Compliance rate
  const tradingDays = sortedDays.filter(d => dayMap.get(d)!.trades > 0).length;
  const cleanDays = sortedDays.filter(d => dayMap.get(d)!.status === "clean").length;
  const complianceRatePct = tradingDays > 0 ? (cleanDays / tradingDays) * 100 : 0;

  // Insights
  const ruleCounts = new Map<RuleType, number>();
  for (const v of violations) ruleCounts.set(v.rule_type, (ruleCounts.get(v.rule_type) || 0) + 1);
  const topRuleEntry = [...ruleCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topRule = topRuleEntry ? { rule_type: topRuleEntry[0], count: topRuleEntry[1] } : null;

  // Hour bin clustering : tranches de 30 min
  const hourCounts = new Map<string, number>();
  for (const v of violations) {
    if (!v.time) continue;
    const [hh, mm] = v.time.split(":").map(Number);
    const bin = `${String(hh).padStart(2, "0")}:${mm < 30 ? "00" : "30"}`;
    const end = mm < 30
      ? `${String(hh).padStart(2, "0")}:30`
      : `${String((hh + 1) % 24).padStart(2, "0")}:00`;
    const key = `${bin}–${end}`;
    hourCounts.set(key, (hourCounts.get(key) || 0) + 1);
  }
  const topHourEntry = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topHourBin = topHourEntry && topHourEntry[1] >= 2
    ? { bin: topHourEntry[0], count: topHourEntry[1] }
    : null;

  // Weekday
  const wdCounts = new Map<number, number>();
  for (const v of violations) {
    const d = new Date(v.date);
    if (isNaN(d.getTime())) continue;
    const wd = d.getDay(); // 0=Dim
    wdCounts.set(wd, (wdCounts.get(wd) || 0) + 1);
  }
  const wdNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const topWdEntry = [...wdCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topWeekday = topWdEntry && topWdEntry[1] >= 2
    ? { weekday: wdNames[topWdEntry[0]], count: topWdEntry[1] }
    : null;

  return {
    violations: violations.sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "")),
    byDay: dayMap,
    streak,
    bestStreak,
    compliantWinRate,
    violatingWinRate,
    multiplier,
    totalTrades,
    compliantTrades,
    violatingTrades,
    complianceRatePct,
    topRule,
    topHourBin,
    topWeekday,
  };
}

/**
 * Calcule l'ensemble des dates (YYYY-MM-DD) considérées comme « journalisées ».
 * Un jour compte comme journalisé s'il possède une note de session non vide,
 * ou si au moins un de ses trades porte une note. Alimente la règle `journaling`.
 *
 * Les clés de `tradeNotes` suivent le même schéma que la page Journal :
 * `trade.date + trade.symbol + trade.entry`.
 */
export function computeJournaledDates(
  trades: Trade[],
  dailyNotes: Record<string, string> = {},
  tradeNotes: Record<string, string> = {},
): Set<string> {
  const journaled = new Set<string>();
  for (const [date, note] of Object.entries(dailyNotes)) {
    if (note && note.trim()) journaled.add(date.slice(0, 10));
  }
  for (const t of trades) {
    const d = tradeDate(t);
    if (!d || journaled.has(d)) continue;
    const tradeId = `${t.date ?? ""}${t.symbol ?? ""}${t.entry ?? ""}`;
    const note = tradeNotes[tradeId];
    if (note && note.trim()) journaled.add(d);
  }
  return journaled;
}

/** ───────────────────────── Webhook ───────────────────────── */

/** Envoie un message vers un webhook Discord ou Telegram (détecté par URL). */
export async function fireWebhook(url: string, message: string): Promise<{ ok: boolean; error?: string }> {
  if (!url) return { ok: false, error: "URL vide" };
  try {
    let body: BodyInit;
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    if (url.includes("api.telegram.org")) {
      // Format Telegram bot : URL doit inclure le chat_id en query (ex sendMessage?chat_id=XXX)
      body = JSON.stringify({ text: message });
    } else {
      // Discord webhook + générique
      body = JSON.stringify({ content: message });
    }
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

export function formatViolationMessage(v: Violation, ruleLabel: string): string {
  return `🚨 Violation : ${ruleLabel}\n• ${v.message}\n• Écart : ${v.distance_label}\n• Date : ${v.date}${v.time ? ` ${v.time}` : ""}`;
}
