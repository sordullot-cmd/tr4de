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

  const winRateGlobal = totals.trades > 0 ? (totals.wins / totals.trades) * 100 : 0;
  const pnlColorGlobal = totals.pnl > 0 ? T.green : totals.pnl < 0 ? T.red : T.text;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="anim-1">
      {/* Header — titre + bouton */}
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

      {/* Hero typographique — pas de carte, juste de la hiérarchie */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 10, color: T.textMut, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>
          P&amp;L cumulé
        </div>
        <div style={{
          fontSize: 24, fontWeight: 600, color: pnlColorGlobal, letterSpacing: -0.4,
          lineHeight: 1.1, fontVariantNumeric: "tabular-nums",
        }}>
          {fmt(totals.pnl, true)}
        </div>
        <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500, marginTop: 2 }}>
          <span style={{ color: T.text, fontWeight: 600 }}>{totals.accounts}</span> {totals.accounts > 1 ? "comptes" : "compte"}
          <span style={{ color: T.textMut, margin: "0 6px" }}>·</span>
          <span style={{ color: T.text, fontWeight: 600 }}>{totals.trades}</span> trade{totals.trades > 1 ? "s" : ""}
          <span style={{ color: T.textMut, margin: "0 6px" }}>·</span>
          <span style={{ color: T.text, fontWeight: 600 }}>{totals.trades > 0 ? `${winRateGlobal.toFixed(1)}%` : "—"}</span> de réussite
        </div>
      </div>

      {/* Liste des comptes — rows fines séparées par des hairlines */}
      {visibleAccounts.length === 0 ? (
        <p style={{ margin: 0, color: T.textMut, fontSize: 14, padding: "32px 0" }}>
          Aucun compte de trading. Ajoutez-en un depuis la page “Ajouter des trades”.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[...visibleAccounts].sort((a, b) => {
            const sa = stats.get(a.id) || { trades: 0, pnl: 0 };
            const sb = stats.get(b.id) || { trades: 0, pnl: 0 };
            if (sb.trades !== sa.trades) return sb.trades - sa.trades;
            return sb.pnl - sa.pnl;
          }).map((acc) => {
            const s = stats.get(acc.id) || { trades: 0, wins: 0, losses: 0, pnl: 0 };
            const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
            const type = acc.account_type || "live";
            const typeLabel = type === "eval"
              ? `Eval${acc.eval_account_size ? ` ${acc.eval_account_size}` : ""}`
              : type === "funded"
                ? `Funded${acc.eval_account_size ? ` ${acc.eval_account_size}` : ""}`
                : "Live";
            const capital = parseEvalSize(acc.eval_account_size);
            const hasBalance = capital !== null;
            const balance = hasBalance ? capital + s.pnl : null;
            const pnlColor = s.pnl > 0 ? T.green : s.pnl < 0 ? T.red : T.textSub;
            const pnlPct = capital ? (s.pnl / capital) * 100 : null;

            return (
              <div
                key={acc.id}
                onClick={() => onOpenDetail(acc.id)}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAFA"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                style={{
                  cursor: "pointer",
                  padding: "12px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  transition: "background .12s ease",
                  background: "transparent",
                }}
              >
                {/* Logo broker (compact, à gauche) */}
                <div style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {getBrokerLogo(acc.broker) ? (
                    <img src={getBrokerLogo(acc.broker)} alt="" style={{ maxHeight: 22, maxWidth: 36, objectFit: "contain", opacity: 0.85 }} />
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: T.bg, border: `1px solid ${T.border}` }} />
                  )}
                </div>

                {/* Nom + meta — typographique */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {acc.name || "Compte"}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500 }}>
                    {typeLabel}
                    {acc.broker && (
                      <>
                        <span style={{ margin: "0 6px" }}>·</span>
                        {acc.broker}
                      </>
                    )}
                  </div>
                </div>

                {/* Stats compactes — typographie alignée à droite */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
                  fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 120,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.15 }}>
                    {hasBalance ? fmtNoCents(balance) : (s.trades > 0 ? fmt(s.pnl, true) : "—")}
                  </span>
                  {hasBalance ? (
                    <span style={{ fontSize: 11, fontWeight: 500, color: pnlColor }}>
                      {s.pnl >= 0 ? "+" : ""}{fmtNoCents(s.pnl)}
                      {pnlPct !== null && ` · ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 500, color: T.textMut }}>
                      {s.trades > 0 ? `${s.trades} trade${s.trades > 1 ? "s" : ""}` : "Aucun trade"}
                    </span>
                  )}
                </div>

                {/* Win rate + W/L — colonne discrète */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
                  fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 70,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                    {s.trades > 0 ? `${winRate.toFixed(1)}%` : "—"}
                  </span>
                  <span style={{ fontSize: 10, color: T.textMut, fontWeight: 500 }}>
                    {s.trades > 0 ? <><span style={{ color: T.text }}>{s.wins}</span> / {s.losses}</> : "0 / 0"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
