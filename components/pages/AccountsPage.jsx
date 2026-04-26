"use client";

import React from "react";
import { T } from "@/lib/ui/tokens";
import { fmt } from "@/lib/ui/format";
import { getCurrencySymbol } from "@/lib/userPrefs";

const fmtNoCents = (n) => {
  const sym = getCurrencySymbol();
  const v = Math.round(Number(n) || 0);
  const prefix = v < 0 ? "-" : "";
  return `${prefix}${sym}${Math.abs(v).toLocaleString("en-US")}`;
};
import { Plus } from "lucide-react";
import { isPlaceholderAccount } from "@/lib/utils/placeholderAccount";

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

const getBrokerLogo = (broker) => {
  if (!broker) return null;
  return BROKER_LOGOS[String(broker).trim().toLowerCase()] || null;
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

export default function AccountsPage({ accounts = [], trades = [], setPage, selectedAccountIds = [], setSelectedAccountIds, setSelectedAccountDetailId }) {
  const visibleAccounts = (accounts || []).filter((a) => !isPlaceholderAccount(a.id));

  const stats = React.useMemo(() => {
    const map = new Map();
    for (const acc of visibleAccounts) {
      map.set(acc.id, { trades: 0, wins: 0, losses: 0, pnl: 0 });
    }
    for (const tr of trades || []) {
      const s = map.get(tr.account_id);
      if (!s) continue;
      const pnl = Number(tr.pnl) || 0;
      s.trades += 1;
      s.pnl += pnl;
      if (pnl > 0) s.wins += 1;
      else if (pnl < 0) s.losses += 1;
    }
    return map;
  }, [visibleAccounts, trades]);

  const totals = React.useMemo(() => {
    let trades = 0, pnl = 0, wins = 0;
    for (const s of stats.values()) {
      trades += s.trades;
      pnl += s.pnl;
      wins += s.wins;
    }
    return { trades, pnl, wins, accounts: visibleAccounts.length };
  }, [stats, visibleAccounts.length]);

  const onSelectOnly = (id) => {
    setSelectedAccountIds?.([id]);
    try { localStorage.setItem("selectedAccountIds", JSON.stringify([id])); } catch {}
  };

  const onOpenDetail = (id) => {
    setSelectedAccountDetailId?.(id);
    setPage?.("account-detail");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1 }}>
          Mes comptes
        </h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
        <button
          onClick={() => setPage?.("add-trade")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 6,
            border: `1px solid ${T.text}`, background: T.text, color: "#FFFFFF",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Plus size={13} strokeWidth={1.75} /> Nouveau compte
        </button>
      </div>

      {/* Totaux — style OpenAI Home : carte fusionnée 4 KPIs */}
      <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <KpiCell label="Comptes" value={String(totals.accounts)} />
          <KpiCell label="Trades total" value={String(totals.trades)} />
          <KpiCell
            label="P&L cumulé"
            value={fmt(totals.pnl, true)}
            valueColor={totals.pnl > 0 ? T.green : totals.pnl < 0 ? T.red : T.text}
          />
          <KpiCell
            label="Win rate global"
            value={totals.trades > 0 ? `${((totals.wins / totals.trades) * 100).toFixed(1)}%` : "—"}
            last
          />
        </div>
      </div>

      {/* Liste des comptes */}
      {visibleAccounts.length === 0 ? (
        <div style={{
          border: `1px dashed ${T.border2}`, borderRadius: 12, padding: 40,
          textAlign: "center", background: T.surface,
        }}>
          <p style={{ margin: 0, color: T.textSub, fontSize: 14 }}>
            Aucun compte de trading. Ajoutez-en un depuis la page “Ajouter des trades”.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          {[...visibleAccounts].sort((a, b) => {
            const sa = stats.get(a.id) || { trades: 0, pnl: 0 };
            const sb = stats.get(b.id) || { trades: 0, pnl: 0 };
            if (sb.trades !== sa.trades) return sb.trades - sa.trades;
            return sb.pnl - sa.pnl;
          }).map((acc) => {
            const s = stats.get(acc.id) || { trades: 0, wins: 0, losses: 0, pnl: 0 };
            const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
            const isActive = selectedAccountIds.length === 1 && selectedAccountIds[0] === acc.id;
            return (
              <div
                key={acc.id}
                onClick={() => onOpenDetail(acc.id)}
                style={{
                  border: `1px solid ${isActive ? T.text : T.border}`,
                  borderRadius: 12,
                  padding: 16,
                  background: T.surface,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "border-color .15s",
                }}
              >
                {(() => {
                  const type = acc.account_type || "live";
                  const dotColor = type === "eval" ? T.amber : type === "funded" ? "#2563EB" : T.green;
                  const typeLabel = type === "eval"
                    ? `Eval${acc.eval_account_size ? ` · ${acc.eval_account_size}` : ""}`
                    : type === "funded"
                      ? `Funded${acc.eval_account_size ? ` · ${acc.eval_account_size}` : ""}`
                      : "Live";
                  const capital = parseEvalSize(acc.eval_account_size);
                  const hasBalance = capital !== null;
                  const balance = hasBalance ? capital + s.pnl : null;
                  const pnlColor = s.pnl > 0 ? T.green : s.pnl < 0 ? T.red : T.textSub;
                  const pnlPct = capital ? (s.pnl / capital) * 100 : null;

                  return (
                    <>
                      {/* Top row: name + meta · broker logo */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{
                            fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: -0.15,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {acc.name || "Compte"}
                          </div>
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                            fontSize: 11, color: T.textSub, fontWeight: 500,
                          }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "2px 8px", borderRadius: 999,
                              border: `1px solid ${T.border}`, background: T.white,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                              {typeLabel}
                            </span>
                            {acc.broker && (
                              <span style={{
                                display: "inline-flex", alignItems: "center",
                                padding: "2px 8px", borderRadius: 999,
                                border: `1px solid ${T.border}`, background: T.white,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
                              }}>
                                {acc.broker}
                              </span>
                            )}
                          </div>
                        </div>
                        {getBrokerLogo(acc.broker) && (
                          <img
                            src={getBrokerLogo(acc.broker)}
                            alt=""
                            style={{ height: 20, maxWidth: 64, objectFit: "contain", flexShrink: 0, opacity: 0.75 }}
                          />
                        )}
                      </div>

                      {/* Hero balance (gauche) + stats (droite) */}
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{
                            fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: -0.6,
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {hasBalance ? fmtNoCents(balance) : (s.trades > 0 ? fmt(s.pnl, true) : "—")}
                          </span>
                          {hasBalance && (
                            <span style={{
                              fontSize: 12, fontWeight: 500, color: pnlColor,
                              fontVariantNumeric: "tabular-nums",
                            }}>
                              {s.pnl >= 0 ? "+" : ""}{fmtNoCents(s.pnl)}
                              {pnlPct !== null && ` (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)`}
                            </span>
                          )}
                        </div>

                        <div style={{
                          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3,
                          fontSize: 12, color: T.textSub, fontWeight: 400,
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                        }}>
                          <span>{s.trades} trade{s.trades > 1 ? "s" : ""}</span>
                          <span>{s.trades > 0 ? `${winRate.toFixed(1)}% wr` : "—% wr"}</span>
                          <span>
                            <span style={{ color: T.green }}>{s.wins}W</span>
                            <span style={{ color: T.textMut }}> / </span>
                            <span style={{ color: T.red }}>{s.losses}L</span>
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCell({ label, value, valueColor, last }) {
  return (
    <div style={{
      padding: "14px 18px",
      borderRight: last ? "none" : `1px solid ${T.border}`,
      position: "relative",
    }}>
      <div style={{
        fontSize: 12, color: "#5C5C5C", marginBottom: 8, fontWeight: 500,
        display: "inline-flex", alignItems: "center", gap: 4,
      }}>
        {label} <span style={{ color: "#8E8E8E" }}>›</span>
      </div>
      <div style={{
        fontSize: 20, fontWeight: 600,
        color: valueColor || T.text, letterSpacing: -0.2,
      }}>
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value, tone, sub }) {
  const color = tone === "green" ? T.green : tone === "red" ? T.red : T.text;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: 10, color: T.textSub, whiteSpace: "nowrap" }}>{sub}</span>}
      </div>
    </div>
  );
}
