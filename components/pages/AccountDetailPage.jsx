"use client";

import React from "react";
import { T } from "@/lib/ui/tokens";
import { fmt } from "@/lib/ui/format";
import { getCurrencySymbol } from "@/lib/userPrefs";
import { ArrowLeft, ArrowRight, Pencil, Eye } from "lucide-react";

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
    let pnl = 0, wins = 0, losses = 0, grossWin = 0, grossLoss = 0;
    let bestTrade = null, worstTrade = null;
    const dayMap = new Map();
    const sorted = [...accountTrades].sort((a, b) => {
      const da = new Date(a.date || a.entry_time || 0).getTime();
      const db = new Date(b.date || b.entry_time || 0).getTime();
      return da - db;
    });
    let cum = 0, peak = 0, maxDD = 0;
    const curve = [];
    for (const t of sorted) {
      const p = Number(t.pnl) || 0;
      pnl += p;
      cum += p;
      if (cum > peak) peak = cum;
      const dd = peak - cum;
      if (dd > maxDD) maxDD = dd;
      curve.push({ date: t.date, cum });
      if (p > 0) { wins += 1; grossWin += p; if (!bestTrade || p > bestTrade.pnl) bestTrade = { ...t, pnl: p }; }
      else if (p < 0) { losses += 1; grossLoss += Math.abs(p); if (!worstTrade || p < worstTrade.pnl) worstTrade = { ...t, pnl: p }; }
      const dKey = String(t.date || "").slice(0, 10);
      dayMap.set(dKey, (dayMap.get(dKey) || 0) + p);
    }
    const winRate = sorted.length ? (wins / sorted.length) * 100 : 0;
    const avgWin = wins ? grossWin / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    const profitFactor = grossLoss ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
    const expectancy = sorted.length ? pnl / sorted.length : 0;
    let bestDay = null, worstDay = null;
    for (const [k, v] of dayMap) {
      if (bestDay === null || v > bestDay.pnl) bestDay = { date: k, pnl: v };
      if (worstDay === null || v < worstDay.pnl) worstDay = { date: k, pnl: v };
    }
    return {
      total: sorted.length, pnl, wins, losses, winRate,
      avgWin, avgLoss, profitFactor, expectancy, maxDD,
      bestTrade, worstTrade, bestDay, worstDay,
      curve, sorted,
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
  const palette = type === "eval"
    ? { bg: T.amberBg, fg: T.amber, bd: T.amber }
    : type === "funded"
      ? { bg: "#EFF6FF", fg: "#2563EB", bd: "#93C5FD" }
      : { bg: T.greenBg, fg: T.green, bd: T.greenBd };
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
        <button
          onClick={() => setPage?.("accounts")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 8,
            border: `1px solid ${T.border}`, background: "#FFFFFF",
            color: T.textSub, fontSize: 12, fontWeight: 500,
            cursor: "pointer", marginBottom: 14,
            fontFamily: "inherit",
          }}
        >
          <ArrowLeft size={13} /> Comptes
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {account.name || "Compte"}
            </h1>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: "3px 8px", borderRadius: 999,
              background: palette.bg, color: palette.fg, border: `1px solid ${palette.bd}`,
            }}>
              {typeLabel}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {getBrokerLogo(account.broker) && (
              <img src={getBrokerLogo(account.broker)} alt={account.broker || ""} style={{ height: 30, maxWidth: 110, objectFit: "contain" }} />
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedAccountIds?.([account.id]);
                try { localStorage.setItem("selectedAccountIds", JSON.stringify([account.id])); } catch {}
                setPage?.("dashboard");
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 12px", borderRadius: 8,
                border: `1px solid ${T.border}`, background: "#FAFAFA",
                color: T.text, fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Eye size={13} /> Ouvrir le dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedAccountIds?.([account.id]);
                try { localStorage.setItem("selectedAccountIds", JSON.stringify([account.id])); } catch {}
                setPage?.("add-trade");
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 12px", borderRadius: 8,
                border: `1px solid ${T.border2}`, background: T.text, color: "#FFFFFF",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Pencil size={13} /> Éditer / Importer
            </button>
          </div>
        </div>
      </div>

      {/* KPIs principaux — style OpenAI Home */}
      <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
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

      {/* Equity curve */}
      <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Évolution P&L</div>
          <div style={{ fontSize: 11, color: T.textMut }}>{stats.total} trades</div>
        </div>
        <EquityCurve curve={stats.curve} />
      </div>

      {/* Best/Worst */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        <HighlightCard label="Meilleur trade" value={stats.bestTrade ? fmt(stats.bestTrade.pnl, true) : "—"} sub={stats.bestTrade ? `${stats.bestTrade.symbol || ""} · ${formatDate(stats.bestTrade.date)}` : ""} tone="green" />
        <HighlightCard label="Pire trade" value={stats.worstTrade ? fmt(stats.worstTrade.pnl, true) : "—"} sub={stats.worstTrade ? `${stats.worstTrade.symbol || ""} · ${formatDate(stats.worstTrade.date)}` : ""} tone="red" />
        <HighlightCard label="Meilleure journée" value={stats.bestDay ? fmt(stats.bestDay.pnl, true) : "—"} sub={stats.bestDay ? formatDate(stats.bestDay.date) : ""} tone="green" />
        <HighlightCard label="Pire journée" value={stats.worstDay ? fmt(stats.worstDay.pnl, true) : "—"} sub={stats.worstDay ? formatDate(stats.worstDay.date) : ""} tone="red" />
      </div>

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
  const ref = React.useRef(null);
  const [w, setW] = React.useState(600);
  React.useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (ref.current) setW(ref.current.clientWidth || 600);
    });
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  if (!curve || curve.length < 2) {
    return (
      <div ref={ref} style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: T.textSub, fontSize: 12 }}>
        Pas assez de données.
      </div>
    );
  }
  const h = 180;
  const padX = 10, padTop = 14, padBottom = 18;
  const min = Math.min(0, ...curve.map(c => c.cum));
  const max = Math.max(0, ...curve.map(c => c.cum));
  const span = (max - min) || 1;
  const innerH = h - padTop - padBottom;
  const x = (i) => padX + (i / (curve.length - 1)) * (w - padX * 2);
  const y = (v) => padTop + innerH - ((v - min) / span) * innerH;
  const last = curve[curve.length - 1];
  const lineColor = last.cum >= 0 ? T.green : T.red;
  const path = curve.map((c, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(c.cum).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  return (
    <div ref={ref} style={{ width: "100%", height: h }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#F0F0F0" strokeWidth="1" />
        <path d={path} fill="none" stroke={lineColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
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
