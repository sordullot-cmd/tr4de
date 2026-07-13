"use client";

import React from "react";
import { T } from "@/lib/ui/tokens";
import { fmt } from "@/lib/ui/format";
import { getCurrencySymbol } from "@/lib/userPrefs";
import { backdropDismiss } from "@/lib/hooks/useBackdropDismiss";
import { createClient } from "@/lib/supabase/client";
import { t, useLang } from "@/lib/i18n";

const fmtNoCents = (n) => {
  const sym = getCurrencySymbol();
  const v = Math.round(Number(n) || 0);
  const prefix = v < 0 ? "-" : "";
  return `${prefix}${sym}${Math.abs(v).toLocaleString("en-US")}`;
};
import { Plus, Trophy, Wallet, Users, Target as TargetIcon, Pencil, Trash2, Check, X, Calendar, ChevronDown } from "lucide-react";
import { isPlaceholderAccount } from "@/lib/utils/placeholderAccount";
import { isArchivedAccount, ARCHIVED_VIEW_ID } from "@/lib/utils/archivedAccounts";
import { useCloudState } from "@/lib/hooks/useCloudState";
import ReactDOM from "react-dom";
import { RoadmapSection } from "@/components/pages/ScalingPage";

const BROKER_LOGOS = {
  "tradovate":           "/trado.png",
  "rithmic":             "/brokers/rithmic.png",
  "rithmic r|trader":    "/brokers/rithmic.png",
  "ninjatrader":         "/brokers/ninja trader.png",
  "ninja trader":        "/brokers/ninja trader.png",
  "topstep":             "/brokers/Topstep_Logo.jpg",
  "topstep x":           "/brokers/Topstep_Logo.jpg",
  "apex":                "/brokers/apex.avif",
  "apex trader funding": "/brokers/apex.avif",
  "alphafutures":        "/brokers/alpha futur.svg",
  "alpha futures":       "/brokers/alpha futur.svg",
  "tradeify":            "/brokers/Tradeify.png",
  "lucid":               "/brokers/lucid.png",
  "lucid trading":       "/brokers/lucid.png",
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
  "ig":                  "/brokers/ig logo.png",
  "webull":              "/brokers/webull.png",
};

const getBrokerLogo = (broker) => {
  if (!broker) return null;
  return BROKER_LOGOS[String(broker).trim().toLowerCase()] || null;
};

/* ─── Métadonnées funded (localStorage uniquement, pas de migration DB) ──
   Stocke par account.id : date de passage funded + paramètres (target, DD, payout).
   Permet de "remettre le PnL à 0" en n'agrégeant que les trades datés après
   funded_at, et d'afficher DD restant + payout dispo sur la carte. */
const FUNDED_META_KEY = "tr4de_accounts_funded_meta";
const readFundedMeta = () => {
  try { return JSON.parse(localStorage.getItem(FUNDED_META_KEY) || "{}"); } catch { return {}; }
};
const writeFundedMeta = (m) => {
  try { localStorage.setItem(FUNDED_META_KEY, JSON.stringify(m)); } catch {}
};

// Cible/DD inférés depuis la taille du compte. Fallback : 6% target / 5% DD.
const inferEvalParams = (capital) => {
  const c = Number(capital) || 0;
  if (!c) return { profitTarget: 0, maxDD: 0, payoutMin: 0 };
  return {
    profitTarget: Math.round(c * 0.06),
    maxDD: Math.round(c * 0.05),
    payoutMin: 0,
  };
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

export default function AccountsPage({ accounts = [], trades = [], setPage, selectedAccountIds = [], setSelectedAccountIds, setSelectedAccountDetailId, setAccounts, archivedMeta = {}, setArchivedMeta }) {
  useLang();
  const notPlaceholder = (accounts || []).filter((a) => !isPlaceholderAccount(a.id));
  // Comptes actifs (grille principale + KPI) vs comptes eval archivés (section
  // dédiée en bas). Un compte archivé garde ses trades mais son P&L ne compte
  // plus dans les totaux du site.
  const visibleAccounts = notPlaceholder.filter((a) => !isArchivedAccount(a.id, archivedMeta));
  // Comptes eval passés : le compte a été SUPPRIMÉ de la base, on le
  // reconstruit à partir des métadonnées d'archivage (nom, taille, trade_ids).
  const archivedAccounts = React.useMemo(
    () => Object.entries(archivedMeta || {}).map(([id, m]) => ({
      id,
      name: m?.name || "Compte",
      broker: m?.broker || null,
      eval_account_size: m?.eval_account_size || null,
      account_type: "eval",
      trade_ids: Array.isArray(m?.trade_ids) ? m.trade_ids : [],
      archived_at: m?.archived_at || null,
    })),
    [archivedMeta]
  );
  const [fundedMeta, setFundedMeta] = React.useState(() => readFundedMeta());

  // Passage funded : on crée un tout nouveau compte funded vierge (P&L à 0, MÊME
  // nom que l'eval, sans suffixe), puis on SUPPRIME le compte eval de la base
  // (il disparaît donc de partout : sélecteurs, page Add Trade, réglages…).
  // Les trades de l'eval sont conservés (FK ON DELETE SET NULL) et restitués
  // dans la carte agrégée « Comptes eval passés » via leurs trade_ids ; ils
  // restent aussi dans la page Stratégies (mapping par trade, pas par compte).
  const [passing, setPassing] = React.useState(null); // id du compte en cours de passage
  const passToFunded = async (acc) => {
    if (!acc || passing) return;
    setPassing(acc.id);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      const userId = user?.id;
      if (!userId) { console.error("⚠️ passToFunded: pas d'utilisateur connecté"); setPassing(null); return; }

      // trade_ids de l'eval (pour garder l'attribution dans la carte agrégée)
      const evalTradeIds = (trades || [])
        .filter(t => t.account_id === acc.id)
        .map(t => t.id)
        .filter(Boolean);

      // 1. Créer le nouveau compte funded vierge — MÊME nom (pas de suffixe)
      const { data: created, error: insErr } = await sb
        .from("trading_accounts")
        .insert([{
          user_id: userId,
          name: acc.name || "Compte",
          broker: acc.broker || null,
          account_type: "funded",
          eval_account_size: acc.eval_account_size || null,
        }])
        .select();
      if (insErr) { console.error("⚠️ Création compte funded échouée:", insErr); setPassing(null); return; }
      const newAcc = created?.[0];

      // 2. Mémoriser l'eval passé (snapshot pour la carte agrégée)
      setArchivedMeta?.(prev => ({
        ...(prev || {}),
        [acc.id]: {
          archived_at: new Date().toISOString(),
          name: acc.name || "Compte",
          broker: acc.broker || null,
          eval_account_size: acc.eval_account_size || null,
          trade_ids: evalTradeIds,
          funded_child_id: newAcc?.id || null,
        },
      }));

      // 3. Supprimer le compte eval en base (trades conservés via SET NULL)
      const { error: delErr } = await sb.from("trading_accounts").delete().eq("id", acc.id);
      if (delErr) console.error("⚠️ Suppression compte eval échouée:", delErr);

      // 4. MAJ locale : retirer l'eval, ajouter le funded, ajuster la sélection
      if (setAccounts) {
        setAccounts(prev => [newAcc, ...(prev || []).filter(a => a.id !== acc.id)]);
      }
      if (setSelectedAccountIds) {
        setSelectedAccountIds(prev => {
          const next = (prev || []).filter(id => id !== acc.id);
          if (newAcc && !next.includes(newAcc.id)) next.push(newAcc.id);
          try { localStorage.setItem("selectedAccountIds", JSON.stringify(next)); } catch {}
          return next;
        });
      }
    } catch (e) {
      console.error("⚠️ passToFunded exception:", e);
    } finally {
      setPassing(null);
    }
  };

  // Taille de compte partagée avec la roadmap (même clé Supabase).
  const [simState, setSimState] = useCloudState("tr4de_scaling_sim", "scaling_sim", {
    capitalSize: 50000, pctMonthly: 5, accountsTarget: 3, weeksPerEval: 7,
  });
  const capitalSize = simState?.capitalSize || 50000;
  const setCapitalSize = (v) => setSimState(prev => ({ ...(prev || {}), capitalSize: v }));

  const stats = React.useMemo(() => {
    const map = new Map();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    // Stats des comptes actifs (les comptes eval passés sont supprimés de la
    // base et gérés séparément via `archivedStats`, à partir des trade_ids).
    for (const acc of notPlaceholder) {
      map.set(acc.id, {
        trades: 0, wins: 0, losses: 0, pnl: 0, monthlyPnl: 0,
        peak: 0, maxDD: 0,
        // Stats spécifiques à la période funded (depuis funded_at)
        fundedTrades: 0, fundedWins: 0, fundedLosses: 0, fundedPnl: 0, fundedPeak: 0, fundedDD: 0,
      });
    }
    // Pré-trie les trades par date pour calculer le drawdown funded correctement
    const sortedTrades = [...(trades || [])].sort((a, b) => {
      const da = new Date(a.date || a.entry_time || 0).getTime();
      const db = new Date(b.date || b.entry_time || 0).getTime();
      return da - db;
    });
    // Index des comptes funded pour savoir si on doit alimenter les stats funded.
    // Si funded_at n'existe pas (compte créé directement en funded), on
    // compte tous les trades — sinon uniquement ceux après funded_at.
    const accById = new Map(notPlaceholder.map(a => [a.id, a]));
    for (const tr of sortedTrades) {
      const s = map.get(tr.account_id);
      if (!s) continue;
      const pnl = Number(tr.pnl) || 0;
      s.trades += 1;
      s.pnl += pnl;
      if (s.pnl > s.peak) s.peak = s.pnl;
      const gdd = s.peak - s.pnl;
      if (gdd > s.maxDD) s.maxDD = gdd;
      if (pnl > 0) s.wins += 1;
      else if (pnl < 0) s.losses += 1;
      const td = new Date(tr.date || 0).getTime();
      if (!isNaN(td) && td >= monthStart) s.monthlyPnl += pnl;
      // Stats funded — actives dès que account_type === "funded"
      const acc = accById.get(tr.account_id);
      if (acc && (acc.account_type || "live") === "funded") {
        const meta = fundedMeta[tr.account_id];
        const fundedAt = meta?.funded_at ? new Date(meta.funded_at).getTime() : 0;
        if (!isNaN(td) && td >= fundedAt) {
          s.fundedTrades += 1;
          s.fundedPnl += pnl;
          if (pnl > 0) s.fundedWins += 1;
          else if (pnl < 0) s.fundedLosses += 1;
          if (s.fundedPnl > s.fundedPeak) s.fundedPeak = s.fundedPnl;
          const dd = s.fundedPeak - s.fundedPnl;
          if (dd > s.fundedDD) s.fundedDD = dd;
        }
      }
    }
    return map;
  }, [notPlaceholder, trades, fundedMeta]);

  const totals = React.useMemo(() => {
    // Totaux du site = comptes actifs uniquement (les eval archivés en sont
    // exclus : leur P&L n'apparaît que sur leur propre carte / détail).
    let trades = 0, pnl = 0, wins = 0, capital = 0;
    for (const acc of visibleAccounts) {
      const s = stats.get(acc.id);
      if (s) { trades += s.trades; pnl += s.pnl; wins += s.wins; }
      capital += parseEvalSize(acc.eval_account_size) || 0;
    }
    return { trades, pnl, wins, capital, accounts: visibleAccounts.length };
  }, [stats, visibleAccounts]);

  const onSelectOnly = (id) => {
    setSelectedAccountIds?.([id]);
    try { localStorage.setItem("selectedAccountIds", JSON.stringify([id])); } catch {}
  };

  const onOpenDetail = (id) => {
    setSelectedAccountDetailId?.(id);
    setPage?.("account-detail");
  };

  // Stats des comptes eval passés : leurs trades ont perdu account_id (compte
  // supprimé), on les retrouve par trade_ids stockés dans l'archivage.
  const archivedStats = React.useMemo(() => {
    const idToAcc = {};
    archivedAccounts.forEach(a => (a.trade_ids || []).forEach(tid => { idToAcc[tid] = a.id; }));
    const map = new Map();
    archivedAccounts.forEach(a => map.set(a.id, { trades: 0, wins: 0, losses: 0, pnl: 0 }));
    (trades || []).forEach(tr => {
      const accId = idToAcc[tr.id];
      if (!accId) return;
      const s = map.get(accId);
      if (!s) return;
      const p = Number(tr.pnl) || 0;
      s.trades += 1; s.pnl += p;
      if (p > 0) s.wins += 1; else if (p < 0) s.losses += 1;
    });
    return map;
  }, [archivedAccounts, trades]);

  const winRateGlobal = totals.trades > 0 ? (totals.wins / totals.trades) * 100 : 0;
  const pnlColorGlobal = totals.pnl > 0 ? T.green : totals.pnl < 0 ? T.red : T.text;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="anim-1">
      {/* Header — titre + bouton */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1 }}>
          {t("accountsPage.title")}
        </h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
        <button
          onClick={() => setPage?.("add-trade")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 999,
            border: `1px solid ${T.text}`, background: T.text, color: "#fff",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Plus size={13} strokeWidth={1.75} /> {t("accountsPage.newAccount")}
        </button>
      </div>

      {/* Totaux */}
      <div style={{
        background: "var(--color-card-bg, #FFFFFF)",
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
          <KpiCell label={t("accountsPage.kpiAccounts")} value={String(totals.accounts)} />
          <KpiCell label={t("accountsPage.kpiCapital")} value={totals.capital > 0 ? fmtNoCents(totals.capital) : "—"} />
          <KpiCell label={t("accountsPage.kpiTrades")} value={String(totals.trades)} />
          <KpiCell
            label={t("accountsPage.kpiPnL")}
            value={fmt(totals.pnl, true)}
            valueColor={totals.pnl > 0 ? T.green : totals.pnl < 0 ? T.red : T.text}
          />
          <KpiCell
            label={t("accountsPage.kpiWR")}
            value={totals.trades > 0 ? `${winRateGlobal.toFixed(1)}%` : "—"}
            last
          />
        </div>
      </div>

      {/* Liste des comptes */}
      {visibleAccounts.length === 0 && archivedAccounts.length === 0 ? (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "40px 40px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Wallet size={22} strokeWidth={1.75} color={T.text} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 6, letterSpacing: -0.1 }}>{t("accountsPage.empty")}</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20, maxWidth: 380, lineHeight: 1.5 }}>{t("accountsPage.emptySub")}</div>
          <button onClick={() => setPage?.("add-trade")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, background: T.white, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${T.text}`, fontFamily: "var(--font-sans)" }}>
            <Plus size={14} strokeWidth={2} /> {t("accountsPage.newAccount")}
          </button>
        </div>
      ) : (
        <div className="anim-stagger tr4de-accounts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          {(() => {
            const cards = [...visibleAccounts].sort((a, b) => {
            const sa = stats.get(a.id) || { trades: 0, pnl: 0 };
            const sb = stats.get(b.id) || { trades: 0, pnl: 0 };
            if (sb.trades !== sa.trades) return sb.trades - sa.trades;
            return sb.pnl - sa.pnl;
          }).map((acc) => {
            const s = stats.get(acc.id) || { trades: 0, wins: 0, losses: 0, pnl: 0, fundedTrades: 0, fundedWins: 0, fundedLosses: 0, fundedPnl: 0 };
            const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
            const fundedWinRate = s.fundedTrades > 0 ? (s.fundedWins / s.fundedTrades) * 100 : 0;
            const isActive = selectedAccountIds.length === 1 && selectedAccountIds[0] === acc.id;
            const type = acc.account_type || "live";
            const dotColor = type === "eval" ? T.amber
              : type === "funded" ? "#2563EB"
              : type === "demo" ? "#8B5CF6"
              : T.green;
            const typeLabel = type === "eval"
              ? `Eval${acc.eval_account_size ? ` · ${acc.eval_account_size}` : ""}`
              : type === "funded"
                ? `Funded${acc.eval_account_size ? ` · ${acc.eval_account_size}` : ""}`
                : type === "demo"
                  ? t("accountsPage.demo")
                  : t("accountsPage.live");
            const capital = parseEvalSize(acc.eval_account_size);
            const hasBalance = capital !== null;
            const meta = fundedMeta[acc.id];
            // Vue funded dès que account_type === "funded", avec ou sans meta.
            // Si pas de funded_at → on considère tous les trades comme funded.
            const isFundedView = type === "funded";
            // En vue funded, le PnL/balance affichés repartent de funded_at.
            const displayPnl = isFundedView ? s.fundedPnl : s.pnl;
            const displayTrades = isFundedView ? s.fundedTrades : s.trades;
            const balance = hasBalance ? capital + displayPnl : null;
            const pnlColor = displayPnl > 0 ? T.green : displayPnl < 0 ? T.red : T.textSub;
            const pnlPct = capital ? (displayPnl / capital) * 100 : null;
            // Pour eval : seuils inférés (target, DD)
            const evalParams = capital ? inferEvalParams(capital) : null;
            const canPassFunded = type === "eval" && evalParams && s.pnl >= evalParams.profitTarget && evalParams.profitTarget > 0;
            // Pour funded : DD restant / payout dispo
            const fundedMaxDD = meta?.funded_max_dd || (capital ? Math.round(capital * 0.05) : 0);
            const ddRemaining = Math.max(0, fundedMaxDD - (s.fundedDD || 0));
            const ddPct = fundedMaxDD > 0 ? Math.min(100, ((s.fundedDD || 0) / fundedMaxDD) * 100) : 0;
            const payoutAvail = isFundedView ? Math.max(0, s.fundedPnl - (meta?.funded_payout_min || 0)) : 0;

            const tradesCount = isFundedView ? s.fundedTrades : s.trades;
            const wrValue = isFundedView ? fundedWinRate : winRate;
            const winsValue = isFundedView ? s.fundedWins : s.wins;
            const lossesValue = isFundedView ? s.fundedLosses : s.losses;

            // Donut win rate (style strategy card)
            const DonutChart = ({ winRate: wr, size = 48 }) => {
              const radius = size / 2 - 6;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference - (wr / 100) * circumference;
              const color = wr >= 50 ? T.green : T.red;
              return (
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))" }}>
                  <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={T.border} strokeWidth="5" />
                  <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="5"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
                </svg>
              );
            };

            return (
              <div
                key={acc.id}
                data-card
                onClick={() => onOpenDetail(acc.id)}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 20,
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "border-color .15s, box-shadow .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Nom du compte */}
                <div style={{ paddingRight: 200, marginBottom: 6 /* respiration avant la ligne type · broker */ }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} title={typeLabel} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: T.text, lineHeight: 1.3, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.name || "Compte"}
                    </span>
                  </div>
                </div>

                {/* Pills type + broker — top-right absolu */}
                <div style={{ position: "absolute", top: 16, right: 16, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "60%" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "2px 8px", borderRadius: 999,
                    border: `1px solid ${T.border}`, background: T.white,
                    fontSize: 11, color: T.textSub, fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    {typeLabel}
                  </span>
                  {acc.broker && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "2px 8px", borderRadius: 999,
                      border: `1px solid ${T.border}`, background: T.white,
                      fontSize: 11, color: T.textSub, fontWeight: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200,
                    }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{acc.broker}</span>
                      {getBrokerLogo(acc.broker) && (
                        <img
                          src={getBrokerLogo(acc.broker)}
                          alt=""
                          style={{ height: 14, maxWidth: 48, objectFit: "contain", flexShrink: 0, opacity: 0.85 }}
                        />
                      )}
                    </span>
                  )}
                </div>

                {/* Ligne P&L (gauche) | Win rate (centre) | Payout (droite, funded uniquement) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
                  {/* P&L — gauche */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: hasBalance ? T.text : pnlColor, letterSpacing: -0.2, fontVariantNumeric: "tabular-nums" }}>
                      {hasBalance ? fmtNoCents(balance) : (displayTrades > 0 ? fmt(displayPnl, true) : "—")}
                    </div>
                    {hasBalance && (
                      <div style={{ fontSize: 12, fontWeight: 500, color: pnlColor, fontVariantNumeric: "tabular-nums" }}>
                        {displayPnl >= 0 ? "+" : ""}{fmtNoCents(displayPnl)}
                        {pnlPct !== null && ` (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)`}
                      </div>
                    )}
                  </div>

                  {/* Win rate — centre */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, justifySelf: "center" }}>
                    <DonutChart winRate={tradesCount > 0 ? Math.round(wrValue) : 0} size={48} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>Win rate</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                        {tradesCount > 0 ? `${wrValue.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Bloc droite — varie selon le type de compte */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, justifySelf: "end", textAlign: "right", minWidth: 0 }}>
                    {isFundedView ? (
                      <>
                        <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>Payout dispo</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: payoutAvail > 0 ? T.green : T.textSub, letterSpacing: -0.1, fontVariantNumeric: "tabular-nums" }}>
                          {fmtNoCents(payoutAvail)}
                        </div>
                      </>
                    ) : type === "eval" && evalParams ? (
                      <>
                        <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>Cible</div>
                        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.1, fontVariantNumeric: "tabular-nums" }}>
                          <span style={{ color: T.text }}>
                            {fmtNoCents(s.pnl)}
                          </span>
                          <span style={{ color: T.textMut, fontWeight: 400 }}> / </span>
                          <span style={{ color: T.text }}>{fmtNoCents(evalParams.profitTarget)}</span>
                        </div>
                      </>
                    ) : (type === "live" || type === "demo") ? (
                      <>
                        <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>Trades</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: T.text, letterSpacing: -0.1, fontVariantNumeric: "tabular-nums" }}>
                          {s.trades}
                        </div>
                        {hasBalance && (
                          <div style={{ fontSize: 11, color: T.textMut, fontVariantNumeric: "tabular-nums" }}>
                            ROI {pnlPct !== null ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%` : "—"}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                {/* "Objectif atteint" : passe en funded — bandeau bas, pleine largeur */}
                {canPassFunded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10,
                      background: T.greenBg, border: `1px solid ${T.greenBd || "#A7F3D0"}`,
                      marginTop: 4,
                    }}>
                    <Trophy size={14} strokeWidth={1.75} color={T.green} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.green }}>
                        Objectif atteint ({fmtNoCents(evalParams.profitTarget)})
                      </div>
                      <div style={{ fontSize: 11, color: T.textSub }}>
                        Crée un nouveau compte funded vierge. L&apos;eval est archivé (ses trades restent dans Stratégies).
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={passing === acc.id}
                      onClick={(e) => { e.stopPropagation(); passToFunded(acc); }}
                      style={{
                        padding: "6px 12px", borderRadius: 999,
                        border: `1px solid ${T.green}`, background: T.white, color: T.green,
                        fontSize: 11, fontWeight: 600, cursor: passing === acc.id ? "wait" : "pointer", fontFamily: "inherit",
                        whiteSpace: "nowrap", opacity: passing === acc.id ? 0.6 : 1,
                      }}>
                      {passing === acc.id ? "Création…" : "Passer en Funded"}
                    </button>
                  </div>
                )}
              </div>
            );
          });
            // Carte agrégée « Comptes eval passés » insérée en 2e position
            // (haut-droite en layout 2 colonnes) pour qu'elle soit bien visible.
            if (archivedAccounts.length > 0) {
              cards.splice(1, 0, (
                <ArchivedAccountsCard
                  key="__archived_card__"
                  accounts={archivedAccounts}
                  stats={archivedStats}
                  onOpen={() => onOpenDetail(ARCHIVED_VIEW_ID)}
                />
              ));
            }
            return cards;
          })()}
        </div>
      )}

      {/* Simulateur de scaling — bloc déplacé depuis la page Scaling */}
      <ScalingSimulator accounts={visibleAccounts} />
    </div>
  );
}

/* ============== CARTE UNIQUE « COMPTES EVAL PASSÉS » (ARCHIVÉS) ==============
   Une seule carte qui agrège toutes les données de tous les comptes eval passés.
   Le clic ouvre la vue détail agrégée (AccountDetailPage en mode ARCHIVED_VIEW_ID),
   où l'on peut filtrer/trier par compte individuel. */
function ArchivedDonut({ winRate: wr, size = 48 }) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (wr / 100) * circumference;
  const color = wr >= 50 ? T.green : T.red;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))" }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={T.border} strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}

function ArchivedAccountsCard({ accounts = [], stats, onOpen }) {
  // Agrégat de tous les comptes archivés
  const agg = React.useMemo(() => {
    let trades = 0, wins = 0, losses = 0, pnl = 0, capital = 0;
    for (const acc of accounts) {
      const s = stats.get(acc.id);
      if (s) { trades += s.trades; wins += s.wins; losses += s.losses; pnl += s.pnl; }
      capital += parseEvalSize(acc.eval_account_size) || 0;
    }
    const winRate = trades > 0 ? (wins / trades) * 100 : 0;
    return { trades, wins, losses, pnl, capital, winRate };
  }, [accounts, stats]);

  const pnlColor = agg.pnl > 0 ? T.green : agg.pnl < 0 ? T.red : T.textSub;

  return (
    <div
      data-card
      onClick={onOpen}
      style={{
        position: "relative", display: "flex", flexDirection: "column", gap: 8,
        padding: 20, background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 12, cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Titre + pill */}
      <div style={{ paddingRight: 160, marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, lineHeight: 1.3, letterSpacing: -0.1 }}>
          Comptes eval passés
        </div>
        <div style={{ fontSize: 11, color: T.textMut, marginTop: 3 }}>
          Données unifiées · exclues des totaux du site, conservées dans Stratégies
        </div>
      </div>
      <div style={{ position: "absolute", top: 16, right: 16, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "2px 8px", borderRadius: 999,
          border: `1px solid ${T.border}`, background: T.white,
          fontSize: 11, color: T.textSub, fontWeight: 500, whiteSpace: "nowrap",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.amber, flexShrink: 0 }} />
          {accounts.length} compte{accounts.length > 1 ? "s" : ""} archivé{accounts.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Ligne P&L | Win rate | Trades */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: pnlColor, letterSpacing: -0.2, fontVariantNumeric: "tabular-nums" }}>
            {agg.trades > 0 ? fmt(agg.pnl, true) : "—"}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.textSub }}>P&L cumulé</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, justifySelf: "center" }}>
          <ArchivedDonut winRate={agg.trades > 0 ? Math.round(agg.winRate) : 0} size={48} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>Win rate</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text, fontVariantNumeric: "tabular-nums" }}>
              {agg.trades > 0 ? `${agg.winRate.toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, justifySelf: "end", textAlign: "right" }}>
          <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>Trades</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text, letterSpacing: -0.1, fontVariantNumeric: "tabular-nums" }}>
            {agg.trades}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== SCALING SIMULATOR ============== */
function ScalingSimulator({ accounts = [] }) {
  const [sim, setSim] = useCloudState("tr4de_scaling_sim", "scaling_sim", { capitalSize: 100000, pctMonthly: 5, accountsTarget: 3, weeksPerEval: 7 });
  const [open, setOpen] = useCloudState("tr4de_scaling_sim_open", "scaling_sim_open", false);

  // Comptes "financés" = ceux dont le type est funded dans la liste de comptes existante.
  const fundedAccounts = (accounts || []).filter(a => (a.account_type || "live") === "funded");
  const fundedCount = fundedAccounts.length;
  // Capital déjà géré par les comptes existants (somme des eval_account_size).
  const existingCapital = fundedAccounts.reduce((s, a) => s + (parseEvalSize(a.eval_account_size) || 0), 0);
  // Cible : nombre total de comptes financés visés
  const accountsTarget = Math.max(sim.accountsTarget, fundedCount);
  // Capital total projeté = existant + (manque × capitalSize visé)
  const remaining = Math.max(0, accountsTarget - fundedCount);
  const totalCapital = existingCapital + remaining * sim.capitalSize;
  const monthlyRevenue = totalCapital * (sim.pctMonthly / 100);
  const weeksPerEval = Number(sim.weeksPerEval) || 7;
  const challengesLeft = remaining;
  const weeks = challengesLeft * weeksPerEval;

  const fmtMoney = (n) => `${getCurrencySymbol()}${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

  const monthsEst = weeks > 0 ? (weeks / 4.33).toFixed(1) : "0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Carte sliders (en haut) — titre + sous-titre cliquables pour replier */}
      <div style={{
        background: "var(--color-card-bg, #FFFFFF)",
        border: `1px solid ${T.border}`,
        borderRadius: open ? "12px 12px 0 0" : 12,
        borderBottom: open ? "none" : `1px solid ${T.border}`,
        overflow: "hidden",
      }}>
        <div
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          role="button"
          style={{
            padding: "14px 20px",
            borderBottom: open ? `1px solid ${T.border}` : "none",
            display: "flex", alignItems: "center", gap: 12,
            cursor: "pointer",
            transition: "background .12s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.bg || "#FAFAFA"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1 }}>{t("accountsPage.simTitle")}</h2>
            <div style={{ fontSize: 11, color: T.textMut, marginTop: 2 }}>{t("accountsPage.simSub")}</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", color: T.textSub }}>
            <ChevronDown size={14} strokeWidth={2}
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s ease" }} />
          </span>
        </div>
        {open && (
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <SimSlider label={t("accountsPage.simCapital")} sub={`${fmtMoney(25000)} → ${fmtMoney(200000)}`} value={sim.capitalSize} min={25000} max={200000} step={25000} fmt={fmtMoney} onChange={(v) => setSim((p) => ({ ...p, capitalSize: v }))} />
          <SimSlider label={t("accountsPage.simPctMonthly")} sub="1 → 20 %" value={sim.pctMonthly} min={1} max={20} step={0.5} fmt={(v) => `${v}%`} onChange={(v) => setSim((p) => ({ ...p, pctMonthly: v }))} />
          <SimSlider label={t("accountsPage.accountsTarget")} sub="1 → 20" value={sim.accountsTarget} min={1} max={20} step={1} fmt={(v) => `${v}`} onChange={(v) => setSim((p) => ({ ...p, accountsTarget: v }))} />
          <SimSlider label={t("accountsPage.weeksPerEval")} sub={`1 → 16 ${t("accountsPage.simWeeks")}`} value={sim.weeksPerEval ?? 7} min={1} max={16} step={1} fmt={(v) => `${v} ${t("accountsPage.simWeeks")}`} onChange={(v) => setSim((p) => ({ ...p, weeksPerEval: v }))} />
        </div>
        )}
      </div>

      {/* Carte KPIs + progression (rattachée en dessous, visible quand ouvert) */}
      {open && (
      <div style={{ background: "var(--color-card-bg, #FFFFFF)", border: `1px solid ${T.border}`, borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <SimKpi label={t("accountsPage.kpiCapital")} value={fmtMoney(totalCapital)} />
          <SimKpi label={t("accountsPage.simMonthlyRevenue")} value={fmtMoney(monthlyRevenue)} valueColor={T.green} />
          <SimKpi label={t("accountsPage.estimatedTime")} value={`${weeks} ${t("accountsPage.simWeeks")}`} sub={weeks >= 4 ? `≈ ${monthsEst} ${t("accountsPage.simMonths")}` : null} />
          <SimKpi label={t("accountsPage.evalsToPass")} value={`${challengesLeft}`} last />
        </div>

        {/* Stepper de progression — intégré dans la même carte */}
        {(() => {
          const pct = accountsTarget > 0 ? Math.min(100, Math.round((fundedCount / accountsTarget) * 100)) : 0;
          const remaining = Math.max(0, accountsTarget - fundedCount);
          const allDone = fundedCount >= accountsTarget;
          return (
            <div style={{ borderTop: `1px solid ${T.border}`, padding: "14px 20px" }}>
              {/* Hero avec gros chiffre */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{
                    fontSize: 22, fontWeight: 700,
                    color: allDone ? T.green : T.text,
                    letterSpacing: -0.4, lineHeight: 1, fontVariantNumeric: "tabular-nums",
                  }}>
                    {fundedCount}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.textMut, fontVariantNumeric: "tabular-nums" }}>
                    / {accountsTarget}
                  </span>
                  <span style={{ fontSize: 11, color: T.textMut, marginLeft: 4 }}>
                    {accountsTarget > 1 ? t("accountsPage.simFundedAccounts") : t("accountsPage.simFundedAccount")}
                  </span>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  padding: "3px 10px", borderRadius: 999,
                  background: allDone ? "#F0FDF4" : "#F5F5F5",
                  color: allDone ? T.green : T.text,
                  border: `1px solid ${allDone ? "#A7F3D0" : T.border}`,
                  fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                }}>
                  {pct}%
                </div>
              </div>

              {/* Stepper */}
              <div style={{ display: "flex", alignItems: "center", padding: "4px 0" }}>
                {Array.from({ length: accountsTarget }).map((_, idx) => {
                  const done = idx < fundedCount;
                  const isNext = idx === fundedCount && !allDone;
                  return (
                    <React.Fragment key={idx}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        background: done ? T.green : isNext ? "#FFFFFF" : "#FAFAFA",
                        color: done ? "#FFFFFF" : isNext ? T.text : T.textMut,
                        border: `1px solid ${done ? T.green : isNext ? T.text : T.border}`,
                        fontSize: 10, fontWeight: 700,
                        boxShadow: isNext ? `0 0 0 3px #F0F0F0` : "none",
                        transition: "all .15s ease",
                      }}>
                        {done ? <Check size={10} strokeWidth={3} /> : idx + 1}
                      </div>
                      {idx < accountsTarget - 1 && (
                        <div style={{
                          flex: 1, height: 2, margin: "0 3px",
                          background: idx < fundedCount - 1
                            ? T.green
                            : (idx === fundedCount - 1 ? `linear-gradient(90deg, ${T.green} 0%, ${T.border} 100%)` : T.border),
                          borderRadius: 1,
                          transition: "background .3s ease",
                        }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Sous-texte */}
              <div style={{ marginTop: 8, fontSize: 11, color: T.textMut }}>
                {allDone
                  ? t("accountsPage.simAllDone")
                  : remaining === 1
                    ? t("accountsPage.simAccountsLeft1")
                    : t("accountsPage.simAccountsLeftN").replace("{n}", String(remaining))}
              </div>
            </div>
          );
        })()}
      </div>
      )}
    </div>
  );
}

function SimKpi({ label, value, valueColor, sub, last }) {
  return (
    <div style={{ padding: "14px 18px", borderRight: last ? "none" : `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: valueColor || T.text, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.textMut, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SimSlider({ label, value, min, max, step, fmt, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 2fr 80px", alignItems: "center", gap: 16 }}>
      <style>{`
        input[type="range"].tr4de-slim {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px; padding: 0; margin: 0;
          background: transparent; cursor: pointer; outline: none;
        }
        input[type="range"].tr4de-slim::-webkit-slider-runnable-track {
          height: 4px; border-radius: 2px;
          background: linear-gradient(to right, ${T.blue} 0%, ${T.blue} var(--p,0%), ${T.border} var(--p,0%), ${T.border} 100%);
        }
        input[type="range"].tr4de-slim::-moz-range-track { height: 4px; border-radius: 2px; background: ${T.border}; }
        input[type="range"].tr4de-slim::-moz-range-progress { height: 4px; border-radius: 2px; background: ${T.blue}; }
        input[type="range"].tr4de-slim::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: ${T.blue}; border: 2px solid #FFFFFF;
          margin-top: -5px; cursor: pointer;
          box-shadow: 0 0 0 1px ${T.blue}, 0 1px 3px rgba(0,0,0,0.12);
          transition: transform .12s ease;
        }
        input[type="range"].tr4de-slim::-webkit-slider-thumb:hover { transform: scale(1.15); }
        input[type="range"].tr4de-slim::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: ${T.blue}; border: 2px solid #FFFFFF;
          box-shadow: 0 0 0 1px ${T.blue}; cursor: pointer;
        }
      `}</style>
      <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{label}</span>
      <input
        className="tr4de-slim"
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--p": `${pct}%` }}
      />
      <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontVariantNumeric: "tabular-nums", letterSpacing: -0.1, textAlign: "right" }}>{fmt(value)}</span>
    </div>
  );
}

function SimMetric({ label, value, sub, valueColor }) {
  return (
    <div style={{ background: T.bg || "#FAFAFA", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: valueColor || T.text, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.textMut, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}


/* Cellule stat "tableau classique" : label muted en haut, valeur en bas. */
function StatCol({ label, value, valueColor }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: T.textMut,
        marginBottom: 4,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{label}</div>
      <div style={{
        fontSize: 14, fontWeight: 600,
        color: valueColor || T.text,
        letterSpacing: -0.1,
        fontVariantNumeric: "tabular-nums",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{value}</div>
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

/* =====================================================================
   PLANS DE PROGRESSION
   - Templates de prop firms (Topstep, FTMO, Apex…) avec phases pré-câblées
   - Liaison à 1+ comptes : la progression vient des trades réels
   - Plans simples (manuel) en fallback
   - Persistés via useCloudState (Supabase).
   ===================================================================== */

// Templates de prop firms — règles publiques courantes (à adapter au cas
// par cas, l'utilisateur peut éditer ou créer un template "custom").
// Tous les montants sont en USD (la devise est gérée par le formatage).
const PLAN_TEMPLATES = [
  {
    id: "topstep_50",
    name: "Topstep 50k",
    accountSize: 50000,
    color: "#F59E0B",
    phases: [
      { id: "eval", label: "Évaluation", profitTarget: 3000, maxDD: 2000, minDays: 5, kind: "eval" },
      { id: "funded", label: "Funded", profitTarget: null, maxDD: 2500, minDays: 0, kind: "funded" },
    ],
  },
  {
    id: "topstep_100",
    name: "Topstep 100k",
    accountSize: 100000,
    color: "#F59E0B",
    phases: [
      { id: "eval", label: "Évaluation", profitTarget: 6000, maxDD: 3000, minDays: 5, kind: "eval" },
      { id: "funded", label: "Funded", profitTarget: null, maxDD: 3000, minDays: 0, kind: "funded" },
    ],
  },
  {
    id: "topstep_150",
    name: "Topstep 150k",
    accountSize: 150000,
    color: "#F59E0B",
    phases: [
      { id: "eval", label: "Évaluation", profitTarget: 9000, maxDD: 4500, minDays: 5, kind: "eval" },
      { id: "funded", label: "Funded", profitTarget: null, maxDD: 4500, minDays: 0, kind: "funded" },
    ],
  },
  {
    id: "ftmo_100",
    name: "FTMO 100k",
    accountSize: 100000,
    color: "#2563EB",
    phases: [
      { id: "phase1", label: "Phase 1", profitTarget: 10000, maxDD: 10000, dailyLossLimit: 5000, minDays: 4, kind: "eval" },
      { id: "phase2", label: "Phase 2", profitTarget: 5000, maxDD: 10000, dailyLossLimit: 5000, minDays: 4, kind: "eval" },
      { id: "funded", label: "Funded", profitTarget: null, maxDD: 10000, dailyLossLimit: 5000, minDays: 0, kind: "funded" },
    ],
  },
  {
    id: "apex_50",
    name: "Apex 50k",
    accountSize: 50000,
    color: "#8B5CF6",
    phases: [
      { id: "eval", label: "Évaluation", profitTarget: 3000, trailingDD: 2500, minDays: 0, kind: "eval" },
      { id: "funded", label: "Funded", profitTarget: null, trailingDD: 2500, minDays: 0, kind: "funded" },
    ],
  },
  {
    id: "apex_100",
    name: "Apex 100k",
    accountSize: 100000,
    color: "#8B5CF6",
    phases: [
      { id: "eval", label: "Évaluation", profitTarget: 6000, trailingDD: 3000, minDays: 0, kind: "eval" },
      { id: "funded", label: "Funded", profitTarget: null, trailingDD: 3000, minDays: 0, kind: "funded" },
    ],
  },
  {
    id: "custom",
    name: "Plan personnalisé",
    accountSize: 0,
    color: "#8E8E8E",
    phases: [
      { id: "p1", label: "Phase 1", profitTarget: 1000, maxDD: 500, minDays: 0, kind: "eval" },
    ],
  },
];

// Calcule la progression (P&L cumulé, drawdown max, jours tradés) sur les
// trades des comptes liés depuis la date de début de la phase courante.
function computePhaseProgress(trades, accountIds, phaseStartedAt) {
  const start = phaseStartedAt ? new Date(phaseStartedAt).getTime() : 0;
  const linked = (trades || []).filter(t => {
    if (!accountIds || accountIds.length === 0) return false;
    if (!accountIds.includes(t.account_id)) return false;
    const d = new Date(t.date || t.entry_time || 0).getTime();
    return !isNaN(d) && d >= start;
  });
  const sorted = [...linked].sort((a, b) => {
    const da = new Date(a.date || a.entry_time || 0).getTime();
    const db = new Date(b.date || b.entry_time || 0).getTime();
    return da - db;
  });
  let cum = 0, peak = 0, maxDD = 0;
  const tradedDays = new Set();
  for (const t of sorted) {
    const p = Number(t.pnl) || 0;
    cum += p;
    if (cum > peak) peak = cum;
    if (peak - cum > maxDD) maxDD = peak - cum;
    const dKey = String(t.date || "").slice(0, 10);
    if (dKey) tradedDays.add(dKey);
  }
  return { pnl: cum, maxDD, daysTraded: tradedDays.size, tradeCount: sorted.length };
}

const PLAN_TYPES = [
  {
    id: "eval_pass",
    label: "Passer une eval",
    desc: "Atteindre N comptes funded",
    Icon: Trophy,
    color: "#F59E0B",
    fmt: (n) => `${Math.round(n)}`,
    auto: (accounts) => (accounts || []).filter(a => (a.account_type || "") === "funded").length,
  },
  {
    id: "capital",
    label: "Augmenter capital",
    desc: "Cumul du capital sur les funded",
    Icon: Wallet,
    color: "#16A34A",
    fmt: (n) => fmtNoCents(n),
    auto: (accounts) => (accounts || [])
      .filter(a => (a.account_type || "") === "funded")
      .reduce((s, a) => s + (parseEvalSize(a.eval_account_size) || 0), 0),
  },
  {
    id: "prop_count",
    label: "Multiplier comptes prop",
    desc: "Nombre de comptes funded actifs",
    Icon: Users,
    color: "#2563EB",
    fmt: (n) => `${Math.round(n)}`,
    auto: (accounts) => (accounts || []).filter(a => (a.account_type || "") === "funded").length,
  },
  {
    id: "custom",
    label: "Plan personnalisé",
    desc: "Compteur manuel libre",
    Icon: TargetIcon,
    color: "#8E8E8E",
    fmt: (n) => `${Math.round(n)}`,
    auto: null,
  },
];

function AccountPlans({ accounts, trades }) {
  const [plans, setPlans] = useCloudState("tr4de_account_plans", "account_plans", []);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  // Form supporte les 2 modes : `mode: "template"` (templateId, accountIds…)
  // ou `mode: "simple"` (type, target, manual…) — pour rétro-compat avec
  // les plans simples créés avant.
  const emptyForm = {
    mode: "template",
    title: "",
    templateId: "topstep_50",
    accountIds: [],
    deadline: "",
    // Champs mode simple
    type: "eval_pass", target: "", manual: 0,
  };
  const [form, setForm] = React.useState(emptyForm);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (p) => {
    if (p.templateId) {
      setForm({
        mode: "template",
        title: p.title || "",
        templateId: p.templateId,
        accountIds: Array.isArray(p.accountIds) ? p.accountIds : [],
        deadline: p.deadline || "",
        type: "eval_pass", target: "", manual: 0,
      });
    } else {
      setForm({
        mode: "simple",
        title: p.title || "",
        templateId: "topstep_50", accountIds: [],
        deadline: p.deadline || "",
        type: p.type || "eval_pass",
        target: String(p.target ?? ""),
        manual: Number(p.manual) || 0,
      });
    }
    setEditingId(p.id);
    setShowForm(true);
  };
  const close = () => { setShowForm(false); setEditingId(null); };
  const save = () => {
    const isTemplate = form.mode === "template";
    if (!form.title.trim()) return;
    if (!isTemplate && !form.target) return;

    const nowISO = new Date().toISOString();
    const baseData = { title: form.title.trim(), deadline: form.deadline };
    const data = isTemplate
      ? {
          ...baseData,
          templateId: form.templateId,
          accountIds: Array.isArray(form.accountIds) ? form.accountIds : [],
          // currentPhaseIndex et phaseStartedAt sont initialisés à la
          // création ; en édition on les conserve.
        }
      : {
          ...baseData,
          type: form.type,
          target: parseFloat(form.target),
          manual: parseFloat(form.manual) || 0,
        };

    if (editingId) {
      setPlans(prev => (prev || []).map(p => p.id === editingId ? { ...p, ...data } : p));
    } else {
      const id = Date.now();
      const initial = isTemplate
        ? { currentPhaseIndex: 0, phaseStartedAt: nowISO }
        : {};
      setPlans(prev => [...(prev || []), { id, createdAt: new Date(id).toISOString(), ...data, ...initial }]);
    }
    close();
  };
  const remove = (id) => setPlans(prev => (prev || []).filter(p => p.id !== id));
  const advancePhase = (id) => {
    setPlans(prev => (prev || []).map(p => {
      if (p.id !== id) return p;
      const tpl = PLAN_TEMPLATES.find(t => t.id === p.templateId);
      if (!tpl) return p;
      const next = Math.min((p.currentPhaseIndex || 0) + 1, tpl.phases.length - 1);
      return { ...p, currentPhaseIndex: next, phaseStartedAt: new Date().toISOString() };
    }));
  };
  const resetPhase = (id) => {
    setPlans(prev => (prev || []).map(p => p.id === id ? { ...p, phaseStartedAt: new Date().toISOString() } : p));
  };

  const getCurrent = (p) => {
    const def = PLAN_TYPES.find(t => t.id === p.type) || PLAN_TYPES[3];
    if (def.auto) return def.auto(accounts);
    return Number(p.manual) || 0;
  };
  const adjustManual = (id, delta) => {
    setPlans(prev => (prev || []).map(p => p.id === id ? { ...p, manual: Math.max(0, (Number(p.manual) || 0) + delta) } : p));
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>Plans de progression</div>
          <div style={{ fontSize: 11, color: "#8E8E8E", marginTop: 2 }}>Passer une eval, augmenter capital, multiplier comptes prop…</div>
        </div>
        <button onClick={openCreate}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 999,
            border: `1px solid ${T.border}`, background: "var(--color-card-bg, #FFFFFF)", color: T.text,
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
          <Plus size={12} strokeWidth={1.75} /> Nouveau plan
        </button>
      </div>

      {(plans || []).length === 0 ? (
        <div style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: 24, textAlign: "center", background: "var(--color-card-bg, #FFFFFF)", color: "#8E8E8E", fontSize: 12 }}>
          Aucun plan. Crée ton premier plan pour suivre tes objectifs de progression sur tes comptes.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
          {(plans || []).map(p => {
            // Plan-template (riche) ou plan simple (legacy)
            if (p.templateId) {
              return <TemplatePlanCard key={p.id} plan={p} accounts={accounts} trades={trades}
                onEdit={() => openEdit(p)} onDelete={() => remove(p.id)}
                onAdvance={() => advancePhase(p.id)} onResetPhase={() => resetPhase(p.id)} />;
            }
            const def = PLAN_TYPES.find(t => t.id === p.type) || PLAN_TYPES[3];
            const Icon = def.Icon;
            const current = getCurrent(p);
            const target = Number(p.target) || 0;
            const pct = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
            const achieved = pct >= 100;
            const dueLabel = p.deadline
              ? new Date(p.deadline + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
              : null;
            return (
              <div key={p.id}
                style={{
                  background: "var(--color-card-bg, #FFFFFF)", border: `1px solid ${T.border}`, borderRadius: 12,
                  padding: 14, display: "flex", flexDirection: "column", gap: 10,
                }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: `${def.color}1F`, color: def.color,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={15} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ fontSize: 10, color: "#8E8E8E", marginTop: 2 }}>{def.label}</div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button onClick={() => openEdit(p)} aria-label="Modifier"
                      style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: "#8E8E8E", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; e.currentTarget.style.color = T.text; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8E8E8E"; }}>
                      <Pencil size={11} strokeWidth={1.75} />
                    </button>
                    <button onClick={() => remove(p.id)} aria-label="Supprimer"
                      style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: "#8E8E8E", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8E8E8E"; }}>
                      <Trash2 size={11} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                      {def.fmt(current)} <span style={{ color: "#8E8E8E", fontWeight: 500 }}>/ {def.fmt(target)}</span>
                    </span>
                    <span style={{ fontSize: 11, color: achieved ? "#16A34A" : "#5C5C5C", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "#F0F0F0", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`, borderRadius: 2,
                      background: achieved ? "#16A34A" : def.color,
                      transition: "width .4s ease",
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#8E8E8E" }}>
                  {dueLabel ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={11} strokeWidth={1.75} /> {dueLabel}
                    </span>
                  ) : (
                    <span style={{ color: "#B5B5B5" }}>Sans deadline</span>
                  )}
                  {p.type === "custom" && (
                    <div style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
                      <button onClick={() => adjustManual(p.id, -1)} aria-label="−"
                        style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${T.border}`, background: "var(--color-card-bg, #FFFFFF)", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1 }}>−</button>
                      <button onClick={() => adjustManual(p.id, 1)} aria-label="+"
                        style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${T.border}`, background: "var(--color-card-bg, #FFFFFF)", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1 }}>+</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de création / édition */}
      {showForm && typeof document !== "undefined" && ReactDOM.createPortal(
        <div {...backdropDismiss(close)}
          style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
            style={{ width: "min(560px, 100%)", maxHeight: "min(85vh, 760px)", display: "flex", flexDirection: "column", background: "var(--color-card-bg, #FFFFFF)", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden", fontFamily: "var(--font-sans)" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                {editingId ? "Modifier le plan" : "Nouveau plan"}
              </div>
              <button onClick={close} aria-label="Fermer"
                style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: "#5C5C5C", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>

            {/* Switch mode template / simple */}
            <div style={{ padding: "10px 20px 0", display: "flex", gap: 6 }}>
              {[
                { id: "template", label: "Plan eval (template)" },
                { id: "simple",   label: "Plan simple" },
              ].map(opt => {
                const active = form.mode === opt.id;
                return (
                  <button key={opt.id} type="button"
                    onClick={() => setForm({ ...form, mode: opt.id })}
                    style={{
                      padding: "6px 12px", borderRadius: 999,
                      border: `1px solid ${active ? T.text : T.border}`,
                      background: active ? T.text : "#FFFFFF",
                      color: active ? "#FFFFFF" : T.textSub,
                      fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              {form.mode === "template" ? (
                <>
                  {/* Template picker */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Template prop firm</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                      {PLAN_TEMPLATES.map(tpl => {
                        const active = form.templateId === tpl.id;
                        return (
                          <button key={tpl.id} type="button"
                            onClick={() => setForm({ ...form, templateId: tpl.id, title: form.title || tpl.name })}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "10px 12px", borderRadius: 8,
                              border: `1px solid ${active ? tpl.color : T.border}`,
                              background: active ? `${tpl.color}10` : "#FFFFFF",
                              color: T.text, cursor: "pointer", fontFamily: "inherit",
                              textAlign: "left",
                            }}>
                            <span style={{
                              width: 24, height: 24, borderRadius: "50%",
                              background: `${tpl.color}1F`, color: tpl.color,
                              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              fontSize: 11, fontWeight: 700,
                            }}>{tpl.phases.length}</span>
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{tpl.name}</div>
                              <div style={{ fontSize: 10, color: "#8E8E8E" }}>
                                {tpl.phases.length} phase{tpl.phases.length > 1 ? "s" : ""}
                                {tpl.accountSize > 0 ? ` · ${(tpl.accountSize / 1000).toFixed(0)}k` : ""}
                              </div>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Aperçu phases du template choisi */}
                  {(() => {
                    const tpl = PLAN_TEMPLATES.find(t => t.id === form.templateId);
                    if (!tpl) return null;
                    return (
                      <div style={{ background: "var(--color-bg, #FAFAFA)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Règles des phases</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {tpl.phases.map((ph, i) => (
                            <div key={ph.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.text }}>
                              <span style={{ minWidth: 18, fontWeight: 700, color: "#8E8E8E" }}>{i + 1}.</span>
                              <span style={{ minWidth: 90, fontWeight: 600 }}>{ph.label}</span>
                              <span style={{ color: "#5C5C5C" }}>
                                {ph.profitTarget ? `Profit ${fmtNoCents(ph.profitTarget)}` : "Pas de target"}
                                {ph.maxDD ? ` · DD max ${fmtNoCents(ph.maxDD)}` : ""}
                                {ph.trailingDD ? ` · Trailing DD ${fmtNoCents(ph.trailingDD)}` : ""}
                                {ph.dailyLossLimit ? ` · DLL ${fmtNoCents(ph.dailyLossLimit)}` : ""}
                                {ph.minDays ? ` · ${ph.minDays}j min` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Comptes liés */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                      Comptes liés <span style={{ fontWeight: 500 }}>· {form.accountIds.length} sélectionné{form.accountIds.length > 1 ? "s" : ""}</span>
                    </div>
                    {(accounts || []).length === 0 ? (
                      <div style={{ fontSize: 12, color: "#8E8E8E" }}>Aucun compte disponible.</div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(accounts || []).map(a => {
                          const sel = form.accountIds.includes(a.id);
                          return (
                            <button key={a.id} type="button"
                              onClick={() => setForm({
                                ...form,
                                accountIds: sel ? form.accountIds.filter(x => x !== a.id) : [...form.accountIds, a.id],
                              })}
                              style={{
                                padding: "5px 12px", borderRadius: 999,
                                border: `1px solid ${sel ? T.text : T.border}`,
                                background: sel ? T.text : "#FFFFFF",
                                color: sel ? "#FFFFFF" : T.text,
                                fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                              }}>
                              {a.name || "Compte"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Titre + deadline */}
                  <label style={{ display: "block" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Nom du plan</div>
                    <input type="text" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="ex. Topstep 50k — passe Q1 2026"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", color: T.text, background: "var(--color-card-bg, #FFFFFF)" }} />
                  </label>
                  <label style={{ display: "block" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Échéance (optionnel)</div>
                    <input type="date" value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", color: T.text, background: "var(--color-card-bg, #FFFFFF)" }} />
                  </label>
                </>
              ) : (
                <>
                  {/* Mode SIMPLE */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Type</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                      {PLAN_TYPES.map(t => {
                        const Icon = t.Icon;
                        const active = form.type === t.id;
                        return (
                          <button key={t.id} type="button"
                            onClick={() => setForm({ ...form, type: t.id })}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "9px 11px", borderRadius: 8,
                              border: `1px solid ${active ? t.color : T.border}`,
                              background: active ? `${t.color}10` : "#FFFFFF",
                              color: T.text, cursor: "pointer", fontFamily: "inherit",
                              textAlign: "left",
                            }}>
                            <span style={{ width: 24, height: 24, borderRadius: "50%", background: `${t.color}1F`, color: t.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Icon size={12} strokeWidth={1.75} />
                            </span>
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
                              <div style={{ fontSize: 10, color: "#8E8E8E" }}>{t.desc}</div>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label style={{ display: "block" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Nom du plan</div>
                    <input type="text" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="ex. Passer 3 évals 50k cette année"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", color: T.text, background: "var(--color-card-bg, #FFFFFF)" }} />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Cible</div>
                      <input type="number" value={form.target}
                        onChange={(e) => setForm({ ...form, target: e.target.value })}
                        placeholder="3"
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", color: T.text, background: "var(--color-card-bg, #FFFFFF)" }} />
                    </label>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Échéance</div>
                      <input type="date" value={form.deadline}
                        onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", color: T.text, background: "var(--color-card-bg, #FFFFFF)" }} />
                    </label>
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={close}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "transparent", color: "#5C5C5C", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              {(() => {
                const ok = form.title.trim() && (form.mode === "template" ? !!form.templateId : !!form.target);
                return (
                  <button onClick={save} disabled={!ok}
                    style={{
                      padding: "8px 16px", borderRadius: 8, border: "none",
                      background: ok ? T.text : "#F0F0F0",
                      color: ok ? "#FFFFFF" : "#8E8E8E",
                      fontSize: 13, fontWeight: 600,
                      cursor: ok ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}>
                    <Check size={13} strokeWidth={2} /> {editingId ? "Enregistrer" : "Créer"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* Carte d'un plan basé sur un template (Topstep, FTMO, Apex, custom).
   Affiche un stepper de phases + 3 barres de progression (profit, drawdown,
   jours tradés) calculées depuis les trades des comptes liés. */
function TemplatePlanCard({ plan, accounts, trades, onEdit, onDelete, onAdvance, onResetPhase }) {
  const tpl = PLAN_TEMPLATES.find(t => t.id === plan.templateId) || PLAN_TEMPLATES[0];
  const phaseIdx = Math.min(plan.currentPhaseIndex || 0, tpl.phases.length - 1);
  const currentPhase = tpl.phases[phaseIdx];
  const isFinalPhase = phaseIdx >= tpl.phases.length - 1;

  const linkedAccounts = (accounts || []).filter(a => (plan.accountIds || []).includes(a.id));
  const progress = computePhaseProgress(trades, plan.accountIds || [], plan.phaseStartedAt || plan.createdAt);

  const profitTarget = currentPhase?.profitTarget || 0;
  const ddLimit = currentPhase?.maxDD || currentPhase?.trailingDD || 0;
  const minDays = currentPhase?.minDays || 0;

  const pnlPct = profitTarget > 0 ? Math.max(0, Math.min(100, (progress.pnl / profitTarget) * 100)) : 0;
  const ddPct = ddLimit > 0 ? Math.max(0, Math.min(100, (progress.maxDD / ddLimit) * 100)) : 0;
  const daysPct = minDays > 0 ? Math.max(0, Math.min(100, (progress.daysTraded / minDays) * 100)) : 100;

  const profitDone = !profitTarget || progress.pnl >= profitTarget;
  const ddOK = !ddLimit || progress.maxDD < ddLimit;
  const daysDone = !minDays || progress.daysTraded >= minDays;
  const phaseComplete = profitDone && ddOK && daysDone && progress.tradeCount > 0;

  const dueLabel = plan.deadline
    ? new Date(plan.deadline + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div style={{
      background: "var(--color-card-bg, #FFFFFF)", border: `1px solid ${T.border}`, borderRadius: 12,
      padding: 14, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: `${tpl.color}1F`, color: tpl.color,
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          fontSize: 12, fontWeight: 700,
        }}>{tpl.phases.length}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plan.title}</div>
          <div style={{ fontSize: 10, color: "#8E8E8E", marginTop: 2 }}>
            {tpl.name}
            {linkedAccounts.length > 0 ? ` · ${linkedAccounts.map(a => a.name).join(", ")}` : " · Aucun compte lié"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={onEdit} aria-label="Modifier"
            style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: "#8E8E8E", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; e.currentTarget.style.color = T.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8E8E8E"; }}>
            <Pencil size={11} strokeWidth={1.75} />
          </button>
          <button onClick={onDelete} aria-label="Supprimer"
            style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: "#8E8E8E", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8E8E8E"; }}>
            <Trash2 size={11} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {tpl.phases.map((ph, i) => {
          const done = i < phaseIdx;
          const active = i === phaseIdx;
          return (
            <React.Fragment key={ph.id}>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 9px", borderRadius: 999,
                background: active ? `${tpl.color}1F` : (done ? "#16A34A18" : "#F5F5F5"),
                color: active ? tpl.color : (done ? "#16A34A" : "#8E8E8E"),
                fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
              }}>
                {done && <Check size={9} strokeWidth={2.5} />}
                {ph.label}
              </div>
              {i < tpl.phases.length - 1 && (
                <div style={{ flex: 1, height: 1, background: T.border, minWidth: 6 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {linkedAccounts.length === 0 ? (
        <div style={{ fontSize: 11, color: "#8E8E8E", fontStyle: "italic", padding: "4px 0" }}>
          Liez un compte pour voir la progression auto.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {profitTarget > 0 && (
            <PhaseMetricBar
              label="Profit"
              currentText={fmtSigned(progress.pnl)}
              targetText={`/ ${fmtNoCents(profitTarget)}`}
              pct={pnlPct}
              color={profitDone ? "#16A34A" : tpl.color}
              done={profitDone}
            />
          )}
          {ddLimit > 0 && (
            <PhaseMetricBar
              label="Drawdown"
              currentText={`-${fmtNoCents(progress.maxDD)}`}
              targetText={`/ -${fmtNoCents(ddLimit)} max`}
              pct={ddPct}
              color={!ddOK ? "#EF4444" : (ddPct > 70 ? "#F59E0B" : "#16A34A")}
              done={ddOK && progress.maxDD > 0}
              warn={!ddOK}
            />
          )}
          {minDays > 0 && (
            <PhaseMetricBar
              label="Jours tradés"
              currentText={`${progress.daysTraded}`}
              targetText={`/ ${minDays} jours min`}
              pct={daysPct}
              color={daysDone ? "#16A34A" : tpl.color}
              done={daysDone}
            />
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#8E8E8E", marginTop: 2 }}>
        {dueLabel ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Calendar size={11} strokeWidth={1.75} /> {dueLabel}
          </span>
        ) : (
          <span style={{ color: "#B5B5B5" }}>Sans deadline</span>
        )}
        <div style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
          <button onClick={onResetPhase}
            title="Recommencer la phase (reset de la progression à zéro)"
            style={{
              padding: "4px 10px", borderRadius: 999,
              border: `1px solid ${T.border}`, background: "var(--color-card-bg, #FFFFFF)",
              color: T.textSub, fontSize: 10, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
            }}>
            Reset
          </button>
          {!isFinalPhase && (
            <button onClick={onAdvance}
              disabled={!phaseComplete}
              title={phaseComplete ? "Valider et passer à la phase suivante" : "Atteins les targets de la phase pour valider"}
              style={{
                padding: "4px 12px", borderRadius: 999, border: "none",
                background: phaseComplete ? "#16A34A" : "#F0F0F0",
                color: phaseComplete ? "#FFFFFF" : "#8E8E8E",
                fontSize: 10, fontWeight: 600,
                cursor: phaseComplete ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
              <Check size={10} strokeWidth={2.5} /> Valider phase
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseMetricBar({ label, currentText, targetText, pct, color, done, warn }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {label}
          {done && <Check size={9} strokeWidth={2.5} style={{ marginLeft: 4, color: "#16A34A", verticalAlign: "middle" }} />}
        </span>
        <span style={{ fontSize: 11, color: warn ? "#EF4444" : T.text, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {currentText} <span style={{ color: "#8E8E8E", fontWeight: 500 }}>{targetText}</span>
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "#F0F0F0", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 2,
          background: color, transition: "width .4s ease",
        }} />
      </div>
    </div>
  );
}

function fmtSigned(n) {
  const sym = getCurrencySymbol();
  const v = Math.round(Number(n) || 0);
  if (v === 0) return `${sym}0`;
  return v > 0 ? `+${sym}${v.toLocaleString("en-US")}` : `-${sym}${Math.abs(v).toLocaleString("en-US")}`;
}
