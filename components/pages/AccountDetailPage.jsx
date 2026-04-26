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
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Évolution du P&L</div>
          <div style={{ fontSize: 11, color: T.textMut, marginTop: 2 }}>P&L cumulé jour par jour — {stats.total} trades</div>
        </div>
        <div style={{ padding: 12 }}>
          <EquityCurve curve={stats.curve} />
        </div>
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
