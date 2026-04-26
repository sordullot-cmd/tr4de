"use client";

import React from "react";
import { T } from "@/lib/ui/tokens";
import { fmt } from "@/lib/ui/format";
import { getCurrencySymbol } from "@/lib/userPrefs";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";

const fmtNoCents = (n) => {
  const sym = getCurrencySymbol();
  const v = Math.round(Number(n) || 0);
  const prefix = v < 0 ? "-" : "";
  return `${prefix}${sym}${Math.abs(v).toLocaleString("en-US")}`;
};

const parseEvalSize = (size) => {
  if (size == null) return null;
  const m = String(size).match(/(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k") return num * 1000;
  if (unit === "m") return num * 1000000;
  return num;
};

const BROKER_LOGOS = {
  "tradovate":           "/trado.png",
  "rithmic":             "/brokers/rithmic.png",
  "rithmic r|trader":    "/brokers/rithmic.png",
  "ninjatrader":         "/brokers/ninja trader.png",
  "ninja trader":        "/brokers/ninja trader.png",
  "topstep":             "/brokers/Topstep_Logo.jpg",
  "topstep x":           "/brokers/Topstep_Logo.jpg",
  "ftmo":                "/brokers/ftmo.png",
  "tradingview":         "/brokers/tradingview.webp",
  "metatrader 5":        "/MetaTrader_5.png",
  "metatrader 4":        "/brokers/MetaTrader_4.png",
  "mt5":                 "/MetaTrader_5.png",
  "mt4":                 "/brokers/MetaTrader_4.png",
  "thinkorswim":         "/brokers/thinkorswim.png",
  "wealthcharts":        "/weal.webp",
  "interactive brokers": "/brokers/Interactive broker.png",
  "ibkr":                "/brokers/Interactive broker.png",
  "capital.com":         "/brokers/capital.png",
  "capital":             "/brokers/capital.png",
  "ig":                  "/brokers/if logo.png",
  "webull":              "/brokers/webull.png",
};
const getBrokerLogo = (b) => b ? (BROKER_LOGOS[String(b).trim().toLowerCase()] || null) : null;

export default function AccountDetailPage({ accountId, accounts = [], trades = [], setPage, setSelectedAccountIds }) {
  const account = accounts.find(a => a.id === accountId);
  const accountTrades = (trades || []).filter(t => t.account_id === accountId);

  const stats = React.useMemo(() => {
    let pnl = 0, wins = 0, losses = 0, scratch = 0, grossWin = 0, grossLoss = 0;
    let bestTrade = null, worstTrade = null;
    let longCount = 0, shortCount = 0;
    let totalFees = 0, totalVolume = 0, openPositions = 0, totalExecutions = 0;
    let holdWinSum = 0, holdWinCount = 0, holdLossSum = 0, holdLossCount = 0;
    let maxWinStreak = 0, maxLossStreak = 0, curStreak = 0, curStreakSign = 0;
    const dayMap = new Map();
    const sorted = [...accountTrades].sort((a, b) => {
      const da = new Date(a.date || a.entry_time || 0).getTime();
      const db = new Date(b.date || b.entry_time || 0).getTime();
      return da - db;
    });
    let cum = 0, peak = 0, maxDD = 0;
    const curve = [];
    const pnlValues = [];
    const durationSec = (entry, exit) => {
      if (!entry || !exit) return null;
      const e = new Date(entry).getTime();
      const x = new Date(exit).getTime();
      if (isNaN(e) || isNaN(x)) return null;
      return Math.max(0, (x - e) / 1000);
    };
    for (const t of sorted) {
      const p = Number(t.pnl) || 0;
      pnl += p;
      cum += p;
      if (cum > peak) peak = cum;
      const dd = peak - cum;
      if (dd > maxDD) maxDD = dd;
      curve.push({ date: t.date, cum });
      pnlValues.push(p);

      // Direction
      const dir = String(t.direction || "long").toLowerCase();
      if (dir === "short") shortCount += 1; else longCount += 1;

      // Volume / Fees / Executions
      const qty = Number(t.qty ?? t.quantity ?? t.size ?? t.contracts) || 0;
      totalVolume += qty;
      totalFees += Number(t.fees ?? t.commission) || 0;
      totalExecutions += Number(t.executions ?? 0) || 1;

      // Open positions = pas d'exit
      if (!t.exit && !t.exit_time) openPositions += 1;

      // Hold duration
      const hold = durationSec(t.entry_time || t.entryTime || t.date, t.exit_time || t.exitTime);

      if (p > 0) {
        wins += 1; grossWin += p;
        if (hold !== null) { holdWinSum += hold; holdWinCount += 1; }
        if (!bestTrade || p > bestTrade.pnl) bestTrade = { ...t, pnl: p };
        if (curStreakSign === 1) curStreak += 1; else { curStreakSign = 1; curStreak = 1; }
        if (curStreak > maxWinStreak) maxWinStreak = curStreak;
      } else if (p < 0) {
        losses += 1; grossLoss += Math.abs(p);
        if (hold !== null) { holdLossSum += hold; holdLossCount += 1; }
        if (!worstTrade || p < worstTrade.pnl) worstTrade = { ...t, pnl: p };
        if (curStreakSign === -1) curStreak += 1; else { curStreakSign = -1; curStreak = 1; }
        if (curStreak > maxLossStreak) maxLossStreak = curStreak;
      } else {
        scratch += 1;
        curStreakSign = 0; curStreak = 0;
      }

      const dKey = String(t.date || "").slice(0, 10);
      dayMap.set(dKey, (dayMap.get(dKey) || 0) + p);
    }
    const winRate = sorted.length ? (wins / sorted.length) * 100 : 0;
    const avgWin = wins ? grossWin / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    const profitFactor = grossLoss ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
    const expectancy = sorted.length ? pnl / sorted.length : 0;
    const avgTradePnL = expectancy;

    // Std dev des P&L
    let pnlStdDev = 0;
    if (pnlValues.length > 1) {
      const mean = pnl / pnlValues.length;
      const variance = pnlValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (pnlValues.length - 1);
      pnlStdDev = Math.sqrt(variance);
    }

    // Days stats
    let winDays = 0, loseDays = 0, winDaySum = 0, loseDaySum = 0;
    let bestDay = null, worstDay = null;
    for (const [k, v] of dayMap) {
      if (bestDay === null || v > bestDay.pnl) bestDay = { date: k, pnl: v };
      if (worstDay === null || v < worstDay.pnl) worstDay = { date: k, pnl: v };
      if (v > 0) { winDays += 1; winDaySum += v; }
      else if (v < 0) { loseDays += 1; loseDaySum += v; }
    }
    const tradingDays = dayMap.size;
    const avgDailyPnL = tradingDays ? pnl / tradingDays : 0;
    const avgWinDayPnL = winDays ? winDaySum / winDays : 0;
    const avgLoseDayPnL = loseDays ? loseDaySum / loseDays : 0;
    const avgDailyVolume = tradingDays ? sorted.length / tradingDays : 0;
    const avgTradeVolume = sorted.length ? totalVolume / sorted.length : 0;

    // Hold avg (en minutes)
    const avgHoldWinMin = holdWinCount ? holdWinSum / holdWinCount / 60 : 0;
    const avgHoldLossMin = holdLossCount ? holdLossSum / holdLossCount / 60 : 0;

    // SQN = sqrt(N) * mean(P&L) / std(P&L)
    const sqn = pnlStdDev > 0 ? Math.sqrt(pnlValues.length) * (expectancy / pnlStdDev) : 0;

    // Expectancy ratio = avg win / avg loss * win rate / loss rate
    const lossRate = sorted.length ? losses / sorted.length : 0;
    const winR = sorted.length ? wins / sorted.length : 0;
    const expectancyRatio = (avgLoss > 0 && lossRate > 0) ? (winR * avgWin) / (lossRate * avgLoss) : 0;

    // Kelly % = winRate - (lossRate / (avgWin/avgLoss))
    const kellyPct = avgLoss > 0 ? (winR - lossRate * (avgLoss / avgWin || 0)) * 100 : 0;

    // K-Ratio (approximation simple : pente / écart-type des résidus de l'equity)
    let kRatio = 0;
    if (curve.length > 2) {
      const n = curve.length;
      const xs = curve.map((_, i) => i);
      const ys = curve.map(c => c.cum);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const meanX = sumX / n, meanY = sumY / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) { num += (xs[i] - meanX) * (ys[i] - meanY); den += (xs[i] - meanX) ** 2; }
      const slope = den > 0 ? num / den : 0;
      const intercept = meanY - slope * meanX;
      let resVar = 0;
      for (let i = 0; i < n; i++) { resVar += (ys[i] - (slope * xs[i] + intercept)) ** 2; }
      const stdRes = n > 2 ? Math.sqrt(resVar / (n - 2)) : 0;
      kRatio = stdRes > 0 ? slope / stdRes : 0;
    }

    return {
      total: sorted.length, pnl, wins, losses, scratch, winRate,
      avgWin, avgLoss, profitFactor, expectancy, maxDD,
      bestTrade, worstTrade, bestDay, worstDay,
      curve, sorted,
      longCount, shortCount, totalFees, totalVolume, openPositions, totalExecutions,
      avgHoldWinMin, avgHoldLossMin,
      maxWinStreak, maxLossStreak,
      tradingDays, winDays, loseDays,
      avgDailyPnL, avgWinDayPnL, avgLoseDayPnL,
      avgDailyVolume, avgTradeVolume, avgTradePnL,
      pnlStdDev, sqn, expectancyRatio, kellyPct, kRatio,
    };
  }, [accountTrades]);

  if (!account) {
    return (
      <div style={{ padding: 32, color: T.textSub }}>
        <button
          onClick={() => setPage?.("accounts")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", cursor: "pointer", fontSize: 12 }}
        >
          <ArrowLeft size={13} /> Retour
        </button>
        <p>Compte introuvable.</p>
      </div>
    );
  }

  const type = account.account_type || "live";
  const typeLabel = type === "eval"
    ? `Eval${account.eval_account_size ? ` ${account.eval_account_size}` : ""}`
    : type === "funded"
      ? `Funded${account.eval_account_size ? ` ${account.eval_account_size}` : ""}`
      : "Live";

  const capital = parseEvalSize(account.eval_account_size);
  const balance = capital !== null ? capital + stats.pnl : null;
  const pnlPct = capital ? (stats.pnl / capital) * 100 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setPage?.("accounts")}
              aria-label="Retour aux comptes"
              title="Retour"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 6,
                border: `1px solid ${T.border}`, background: "#FFFFFF",
                color: T.textSub, cursor: "pointer", flexShrink: 0,
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; e.currentTarget.style.color = T.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = T.textSub; }}
            >
              <ArrowLeft size={14} strokeWidth={1.75} />
            </button>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0D0D0D", letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}>
              {account.name || "Compte"}
            </h1>
            {getBrokerLogo(account.broker) && (
              <img src={getBrokerLogo(account.broker)} alt={account.broker || ""} style={{ height: 20, maxWidth: 64, objectFit: "contain" }} />
            )}
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: "3px 8px", borderRadius: 999,
              background: T.bg, color: T.textSub, border: `1px solid ${T.border}`,
            }}>
              {typeLabel}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setSelectedAccountIds?.([account.id]);
                try { localStorage.setItem("selectedAccountIds", JSON.stringify([account.id])); } catch {}
                setPage?.("add-trade");
              }}
              title="Éditer / Importer"
              aria-label="Éditer / Importer"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 6,
                border: `1px solid ${T.border}`, background: "#FFFFFF",
                color: T.textMut, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Pencil size={12} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs principaux — collés au graphique en dessous */}
      <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: "12px 12px 0 0", borderBottom: "none", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <KpiCell
            label="Account balance"
            value={balance !== null ? fmtNoCents(balance) : "—"}
            sub={capital !== null ? `/ ${fmtNoCents(capital)}` : undefined}
          />
          <KpiCell
            label="P&L cumulé"
            value={fmt(stats.pnl, true)}
            sub={pnlPct !== null ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` : undefined}
            valueColor={stats.pnl > 0 ? T.green : stats.pnl < 0 ? T.red : T.text}
          />
          <KpiCell
            label="Trades"
            value={String(stats.total)}
            sub={`${stats.wins} W / ${stats.losses} L`}
          />
          <KpiCell
            label="Win rate"
            value={stats.total > 0 ? `${stats.winRate.toFixed(1)}%` : "—"}
            last
          />
        </div>
        {/* Row 2 — KPIs secondaires */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: `1px solid ${T.border}` }}>
          <KpiCell
            label="Profit factor"
            value={stats.profitFactor === Infinity ? "∞" : (stats.total > 0 ? stats.profitFactor.toFixed(2) : "—")}
          />
          <KpiCell
            label="Espérance / trade"
            value={stats.total > 0 ? fmt(stats.expectancy, true) : "—"}
            valueColor={stats.expectancy > 0 ? T.green : stats.expectancy < 0 ? T.red : T.text}
          />
          <KpiCell
            label="Drawdown max"
            value={stats.maxDD > 0 ? `-${fmtNoCents(stats.maxDD)}` : "—"}
            valueColor={stats.maxDD > 0 ? T.red : T.text}
          />
          <KpiCell
            label="Avg win / loss"
            value={stats.total > 0 ? `${fmtNoCents(stats.avgWin)} / -${fmtNoCents(stats.avgLoss)}` : "—"}
            last
          />
        </div>
      </div>

      {/* Equity curve — collé à la carte KPIs */}
      <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: "0 0 12px 12px", overflow: "hidden", marginTop: -16 }}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Évolution du P&L</div>
          <div style={{ fontSize: 11, color: T.textMut, marginTop: 2 }}>P&L cumulé jour par jour — {stats.total} trades</div>
        </div>
        <div style={{ padding: 12 }}>
          <EquityCurve curve={stats.curve} />
        </div>
      </div>

      {/* Tableau de stats détaillées */}
      <StatsTable stats={stats} />

      {/* Recent trades */}
      <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Trades récents</div>
          <button
            type="button"
            onClick={() => {
              setSelectedAccountIds?.([account.id]);
              try { localStorage.setItem("selectedAccountIds", JSON.stringify([account.id])); } catch {}
              setPage?.("trades");
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 6,
              border: `1px solid ${T.border}`, background: "#FFFFFF",
              color: T.textSub, fontSize: 11, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Tout voir <ArrowRight size={11} />
          </button>
        </div>
        {stats.sorted.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: T.textSub, fontSize: 13 }}>Aucun trade sur ce compte.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAFA" }}>
                <Th>Date</Th>
                <Th>Symbole</Th>
                <Th>Sens</Th>
                <Th align="right">Entrée</Th>
                <Th align="right">Sortie</Th>
                <Th align="right">P&L</Th>
              </tr>
            </thead>
            <tbody>
              {[...stats.sorted].slice(-10).reverse().map((t, i) => {
                const p = Number(t.pnl) || 0;
                return (
                  <tr key={t.id || i} style={{ borderTop: `1px solid ${T.border}` }}>
                    <Td>{formatDate(t.date)}</Td>
                    <Td><span style={{ fontWeight: 600 }}>{t.symbol || "—"}</span></Td>
                    <Td>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4,
                        padding: "2px 6px", borderRadius: 4,
                        background: t.direction === "short" ? T.redBg : T.greenBg,
                        color: t.direction === "short" ? T.red : T.green,
                      }}>
                        {t.direction || "long"}
                      </span>
                    </Td>
                    <Td align="right">{t.entry != null ? Number(t.entry).toLocaleString("en-US", { maximumFractionDigits: 4 }) : "—"}</Td>
                    <Td align="right">{t.exit != null ? Number(t.exit).toLocaleString("en-US", { maximumFractionDigits: 4 }) : "—"}</Td>
                    <Td align="right">
                      <span style={{ color: p > 0 ? T.green : p < 0 ? T.red : T.text, fontWeight: 600 }}>
                        {fmt(p, true)}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCell({ label, value, sub, valueColor, last }) {
  return (
    <div style={{
      padding: "14px 18px",
      borderRight: last ? "none" : `1px solid ${T.border}`,
      position: "relative",
    }}>
      <div style={{ fontSize: 12, color: "#5C5C5C", marginBottom: 8, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label} <span style={{ color: "#8E8E8E" }}>›</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: valueColor || T.text, letterSpacing: -0.2 }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: T.textSub }}>{sub}</span>}
      </div>
    </div>
  );
}

function StatsTable({ stats }) {
  const fmtMoney = (v) => fmtNoCents(v);
  const fmtMoneyCents = (v) => fmt(v);
  const fmtNum = (v, dec = 2) => Number(v).toFixed(dec);
  const fmtMin = (m) => {
    if (!m) return "—";
    if (m < 1) return `${Math.round(m * 60)}s`;
    const mm = Math.round(m);
    if (mm < 60) return `${mm} min`;
    const h = Math.floor(mm / 60);
    const r = mm % 60;
    return r === 0 ? `${h} h` : `${h} h ${r} min`;
  };
  const sign = (v) => (v >= 0 ? "+" : "");

  const cells = [
    // Row 1
    { label: "Total trades", value: String(stats.total) },
    { label: "Gagnants", value: String(stats.wins) },
    { label: "Perdants", value: String(stats.losses) },
    { label: "Neutres", value: String(stats.scratch) },
    { label: "Durée moy. (gagnants)", value: fmtMin(stats.avgHoldWinMin) },
    { label: "Durée moy. (perdants)", value: fmtMin(stats.avgHoldLossMin) },
    // Row 2
    { label: "Série gagnante max", value: String(stats.maxWinStreak) },
    { label: "Série perdante max", value: String(stats.maxLossStreak) },
    { label: "Plus gros gain", value: stats.bestTrade ? fmtMoneyCents(stats.bestTrade.pnl) : "—" },
    { label: "Plus grosse perte", value: stats.worstTrade ? fmtMoneyCents(stats.worstTrade.pnl) : "—" },
    { label: "Total exécutions", value: String(stats.totalExecutions) },
    { label: "Volume moy. / trade", value: stats.avgTradeVolume ? fmtNum(stats.avgTradeVolume, 1) : "—" },
    // Row 3
    { label: "P&L total", value: fmtMoneyCents(stats.pnl) },
    { label: "Trades longs", value: String(stats.longCount) },
    { label: "Trades shorts", value: String(stats.shortCount) },
    { label: "Taux de victoire", value: stats.total > 0 ? `${stats.winRate.toFixed(1)}%` : "—" },
    { label: "Frais totaux", value: fmtMoneyCents(stats.totalFees) },
    { label: "Positions ouvertes", value: String(stats.openPositions) },
    // Row 4
    { label: "P&L moy. / trade", value: stats.total > 0 ? fmtMoneyCents(stats.avgTradePnL) : "—" },
    { label: "Gagnant moyen", value: stats.wins ? fmtMoneyCents(stats.avgWin) : "—" },
    { label: "Perdant moyen", value: stats.losses ? `-${fmt(stats.avgLoss)}` : "—" },
    { label: "Profit factor", value: stats.profitFactor === Infinity ? "∞" : (stats.total > 0 ? fmtNum(stats.profitFactor) : "—") },
    { label: "K-Ratio", value: stats.curve.length > 2 ? fmtNum(stats.kRatio) : "—" },
    { label: "Kelly %", value: stats.total > 0 ? `${stats.kellyPct.toFixed(1)}%` : "—" },
    // Row 5
    { label: "Total jours tradés", value: String(stats.tradingDays) },
    { label: "Jours gagnants", value: String(stats.winDays) },
    { label: "Jours perdants", value: String(stats.loseDays) },
    { label: "Drawdown max", value: stats.maxDD > 0 ? `-${fmtMoney(stats.maxDD)}` : "—" },
    { label: "Volume quotidien moy.", value: stats.tradingDays ? fmtNum(stats.avgDailyVolume, 1) : "—" },
    { label: "SQN", value: stats.pnlStdDev > 0 ? fmtNum(stats.sqn) : "—" },
    // Row 6
    { label: "P&L quotidien moy.", value: stats.tradingDays ? fmtMoneyCents(stats.avgDailyPnL) : "—" },
    { label: "P&L moy. jour gagnant", value: stats.winDays ? fmtMoneyCents(stats.avgWinDayPnL) : "—" },
    { label: "P&L moy. jour perdant", value: stats.loseDays ? fmtMoneyCents(stats.avgLoseDayPnL) : "—" },
    { label: "Écart-type P&L", value: stats.pnlStdDev > 0 ? fmtMoneyCents(stats.pnlStdDev) : "—" },
    { label: "Espérance", value: stats.total > 0 ? fmtMoneyCents(stats.expectancy) : "—" },
    { label: "Ratio d'espérance", value: stats.expectancyRatio > 0 ? fmtNum(stats.expectancyRatio) : "—" },
  ];

  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        {cells.map((c, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          const lastRow = row === 5;
          const lastCol = col === 5;
          return (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                borderRight: lastCol ? "none" : `1px solid ${T.border}`,
                borderBottom: lastRow ? "none" : `1px solid ${T.border}`,
                minWidth: 0,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.color || T.text, fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HighlightCard({ label, value, sub, tone }) {
  const color = tone === "green" ? T.green : tone === "red" ? T.red : T.text;
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function EquityCurve({ curve }) {
  if (!curve || curve.length < 2) {
    return (
      <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: T.textSub, fontSize: 12 }}>
        Pas assez de données.
      </div>
    );
  }

  // Group by day (cumulative P&L per date)
  const byDay = {};
  let cum = 0;
  const sorted = [...curve].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  sorted.forEach(p => {
    const d = String(p.date || "").slice(0, 10);
    byDay[d] = p.cum;
  });
  const allDates = Object.keys(byDay).sort();
  const points = allDates.map(d => ({ date: d, value: byDay[d] }));

  const yMin = Math.min(0, ...points.map(p => p.value));
  const yMax = Math.max(0, ...points.map(p => p.value));
  const yRange = (yMax - yMin) || 1;

  const W = 800, H = 220;
  const padL = 0, padR = 28, padT = 10, padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xFor = (i) => padL + (allDates.length === 1 ? plotW / 2 : (i / (allDates.length - 1)) * plotW);
  const yFor = (v) => padT + plotH - ((v - yMin) / yRange) * plotH;

  const last = points[points.length - 1].value;
  const lineColor = last >= 0 ? T.green : T.red;

  const fmtVal = (v) => {
    const sign = v >= 0 ? "+" : "-";
    const abs = Math.abs(v);
    if (abs >= 10000) return `${sign}${Math.round(abs / 10000) * 10}k`;
    if (abs >= 1000)  return `${sign}${Math.round(abs / 1000)}k`;
    return `${sign}${Math.round(abs)}`;
  };
  const fmtD = (d) => {
    const [, m, dd] = d.split("-");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    return `${parseInt(dd)} ${months[parseInt(m) - 1]}`;
  };

  // Y ticks (4 niveaux)
  const yTicks = [];
  const N = 3;
  for (let i = 0; i <= N; i++) {
    const ratio = i / N;
    const v = yMax - ratio * yRange;
    yTicks.push({ y: padT + plotH * ratio, value: v });
  }

  // X labels — premier, milieu, dernier (pour ne pas surcharger)
  const xLabels = [];
  if (allDates.length <= 6) {
    allDates.forEach((d, i) => xLabels.push({ i, date: d, anchor: i === 0 ? "start" : i === allDates.length - 1 ? "end" : "middle" }));
  } else {
    xLabels.push({ i: 0, date: allDates[0], anchor: "start" });
    xLabels.push({ i: Math.floor(allDates.length / 2), date: allDates[Math.floor(allDates.length / 2)], anchor: "middle" });
    xLabels.push({ i: allDates.length - 1, date: allDates[allDates.length - 1], anchor: "end" });
  }

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${xFor(points.length - 1).toFixed(1)} ${yFor(yMin).toFixed(1)} L ${xFor(0).toFixed(1)} ${yFor(yMin).toFixed(1)} Z`;
  const zeroY = yFor(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible", aspectRatio: `${W} / ${H}` }}>
      <defs>
        <linearGradient id="acc-equity-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y labels (à droite) */}
      {yTicks.map((tk, i) => (
        <text key={i} x={W - 2} y={tk.y + 2.5} fill={T.textMut} fontSize="7" fontWeight="500" textAnchor="end" dominantBaseline="middle">{fmtVal(tk.value)}</text>
      ))}

      {/* Ligne de zéro si dans l'échelle */}
      {yMin < 0 && yMax > 0 && (
        <line x1={padL} y1={zeroY} x2={padL + plotW} y2={zeroY} stroke="#F0F0F0" strokeWidth="0.5" strokeDasharray="2 2" />
      )}

      {/* Gradient sous la courbe */}
      <path d={areaPath} fill="url(#acc-equity-grad)" />

      {/* Courbe */}
      <path d={path} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* X labels */}
      {xLabels.map((x, i) => (
        <text key={i} x={xFor(x.i)} y={H - 5} fill={T.textMut} fontSize="7" textAnchor={x.anchor}>{fmtD(x.date)}</text>
      ))}
    </svg>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th style={{
      padding: "8px 12px", textAlign: align,
      fontSize: 10, fontWeight: 700, color: T.textMut,
      textTransform: "uppercase", letterSpacing: 0.4,
    }}>
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td style={{ padding: "8px 12px", textAlign: align, color: T.text, fontSize: 12 }}>
      {children}
    </td>
  );
}

function formatDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d).slice(0, 10);
    return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
}
