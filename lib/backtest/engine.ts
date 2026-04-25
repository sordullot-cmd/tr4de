/**
 * Moteur de backtest "what-if" : étant donné les trades historiques et un
 * filtre (par exemple "uniquement la stratégie X"), produit l'equity curve
 * et les statistiques associées.
 *
 * Note: ce n'est pas du backtesting vrai (replay sur données de marché).
 * C'est un filtre sur trades passés : "et si j'avais SEULEMENT pris les
 * trades de la stratégie X ?". Utile pour valider qu'une stratégie tire
 * vraiment la performance globale.
 */

export interface BacktestTrade {
  id?: string | number;
  date: string;          // ISO ou YYYY-MM-DD
  pnl: number;
  symbol?: string;
  strategyId?: string | null;
}

export interface BacktestPoint {
  /** Date ISO YYYY-MM-DD */
  date: string;
  /** P&L cumulé jusqu'à cette date incluse */
  cumPnL: number;
  /** P&L du jour (somme des trades du jour) */
  dayPnL: number;
  /** Nombre de trades ce jour */
  count: number;
}

export interface BacktestResult {
  /** Trades retenus après filtre, triés chronologiquement */
  trades: BacktestTrade[];
  /** Courbe d'équité (1 point par jour avec trades) */
  curve: BacktestPoint[];
  totalPnL: number;
  totalTrades: number;
  wins: number;
  losses: number;
  /** % entre 0 et 100 */
  winRate: number;
  avgWin: number;
  avgLoss: number;
  /** Profit factor : gross win / gross loss. ∞ si pas de loss → renvoie Infinity */
  profitFactor: number;
  /** Drawdown max en valeur absolue */
  maxDrawdown: number;
  /** Date au pic d'équité avant le max drawdown */
  maxDrawdownPeakDate: string | null;
  /** Date du creux du max drawdown */
  maxDrawdownTroughDate: string | null;
  /** Sharpe ratio annualisé (basé sur P&L journaliers, 252 jours/an) */
  sharpeRatio: number;
  /** Plus longue série gagnante consécutive (en trades) */
  longestWinStreak: number;
  /** Plus longue série perdante consécutive (en trades) */
  longestLossStreak: number;
  /** Espérance par trade ($) */
  expectancy: number;
}

export interface BacktestFilter {
  /** Si défini, ne garde que les trades dont strategyId est dans cette liste. */
  strategyIds?: string[];
  /** Si défini (YYYY-MM-DD), ignore les trades avant. */
  fromDate?: string;
  /** Si défini (YYYY-MM-DD), ignore les trades après. */
  toDate?: string;
  /** Si défini, ne garde que les trades dont symbol est dans cette liste. */
  symbols?: string[];
}

const ZERO_RESULT = (trades: BacktestTrade[]): BacktestResult => ({
  trades,
  curve: [],
  totalPnL: 0,
  totalTrades: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  avgWin: 0,
  avgLoss: 0,
  profitFactor: 0,
  maxDrawdown: 0,
  maxDrawdownPeakDate: null,
  maxDrawdownTroughDate: null,
  sharpeRatio: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
  expectancy: 0,
});

const dateKey = (d: string): string => String(d).split("T")[0];

export function backtest(
  allTrades: BacktestTrade[],
  filter: BacktestFilter = {}
): BacktestResult {
  // ── Filter ─────────────────────────────────────────────────────────
  let filtered = (allTrades || []).filter(tr => {
    if (!tr || !tr.date) return false;
    return true;
  });

  if (filter.strategyIds && filter.strategyIds.length > 0) {
    const set = new Set(filter.strategyIds.map(String));
    filtered = filtered.filter(tr => tr.strategyId != null && set.has(String(tr.strategyId)));
  }
  if (filter.symbols && filter.symbols.length > 0) {
    const set = new Set(filter.symbols.map(s => s.toUpperCase()));
    filtered = filtered.filter(tr => tr.symbol && set.has(String(tr.symbol).toUpperCase()));
  }
  if (filter.fromDate) {
    filtered = filtered.filter(tr => dateKey(tr.date) >= filter.fromDate!);
  }
  if (filter.toDate) {
    filtered = filtered.filter(tr => dateKey(tr.date) <= filter.toDate!);
  }

  // ── Sort chronologically ───────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  });

  if (sorted.length === 0) return ZERO_RESULT(sorted);

  // ── Equity curve (1 point per day) ─────────────────────────────────
  const byDay = new Map<string, { dayPnL: number; count: number }>();
  for (const tr of sorted) {
    const k = dateKey(tr.date);
    const e = byDay.get(k) || { dayPnL: 0, count: 0 };
    e.dayPnL += tr.pnl || 0;
    e.count += 1;
    byDay.set(k, e);
  }
  const curve: BacktestPoint[] = [];
  let cum = 0;
  const sortedKeys = Array.from(byDay.keys()).sort();
  for (const k of sortedKeys) {
    const e = byDay.get(k)!;
    cum += e.dayPnL;
    curve.push({ date: k, cumPnL: round2(cum), dayPnL: round2(e.dayPnL), count: e.count });
  }

  // ── Trade-level stats ──────────────────────────────────────────────
  const wins = sorted.filter(t => (t.pnl || 0) > 0);
  const losses = sorted.filter(t => (t.pnl || 0) < 0);
  const totalPnL = sorted.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const winRate = sorted.length > 0
    ? Math.round((wins.length / sorted.length) * 100)
    : 0;
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const profitFactor = grossLoss > 0
    ? grossWin / grossLoss
    : (grossWin > 0 ? Infinity : 0);
  const expectancy = sorted.length > 0 ? totalPnL / sorted.length : 0;

  // ── Streaks ────────────────────────────────────────────────────────
  let curWin = 0, curLoss = 0, longestWin = 0, longestLoss = 0;
  for (const t of sorted) {
    if ((t.pnl || 0) > 0) { curWin++; curLoss = 0; if (curWin > longestWin) longestWin = curWin; }
    else if ((t.pnl || 0) < 0) { curLoss++; curWin = 0; if (curLoss > longestLoss) longestLoss = curLoss; }
    else { /* break-even keeps streaks */ }
  }

  // ── Max drawdown (depuis l'equity curve) ───────────────────────────
  let peak = 0;
  let peakDate: string | null = null;
  let mdd = 0;
  let mddPeakDate: string | null = null;
  let mddTroughDate: string | null = null;
  for (const p of curve) {
    if (p.cumPnL > peak) {
      peak = p.cumPnL;
      peakDate = p.date;
    }
    const dd = peak - p.cumPnL;
    if (dd > mdd) {
      mdd = dd;
      mddPeakDate = peakDate;
      mddTroughDate = p.date;
    }
  }

  // ── Sharpe (sur P&L journaliers) ────────────────────────────────────
  const dailyPnLs = curve.map(c => c.dayPnL);
  const mean = dailyPnLs.length > 0 ? dailyPnLs.reduce((a, b) => a + b, 0) / dailyPnLs.length : 0;
  const variance = dailyPnLs.length > 0
    ? dailyPnLs.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / dailyPnLs.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (mean * Math.sqrt(252)) / stdDev : 0;

  return {
    trades: sorted,
    curve,
    totalPnL: round2(totalPnL),
    totalTrades: sorted.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWin: round2(avgWin),
    avgLoss: round2(avgLoss),
    profitFactor: profitFactor === Infinity ? Infinity : round2(profitFactor),
    maxDrawdown: round2(mdd),
    maxDrawdownPeakDate: mddPeakDate,
    maxDrawdownTroughDate: mddTroughDate,
    sharpeRatio: round2(sharpeRatio),
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    expectancy: round2(expectancy),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compare plusieurs filtres et renvoie un tableau de résultats étiquetés.
 * Utile pour le tableau de comparaison de stratégies.
 */
export interface NamedFilter {
  label: string;
  filter: BacktestFilter;
}

export function compareBacktests(
  allTrades: BacktestTrade[],
  filters: NamedFilter[]
): { label: string; result: BacktestResult }[] {
  return filters.map(f => ({
    label: f.label,
    result: backtest(allTrades, f.filter),
  }));
}
