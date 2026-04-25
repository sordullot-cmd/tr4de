"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  Plus, Target, Trash2, Pencil, Check, X, TrendingUp, Heart,
  ChevronDown, ChevronRight, Calendar, AlertCircle, Flag, Sparkles,
  Dumbbell, BookOpen, Users, GraduationCap, Wallet, Briefcase, Activity, Code,
  Clock, Trophy,
} from "lucide-react";
import { getCurrencySymbol } from "@/lib/userPrefs";
import { useTrades } from "@/lib/hooks/useTradeData";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { t, useLang } from "@/lib/i18n";

const T = {
  white: "#FFFFFF", border: "#E5E5E5", bg: "#F5F5F5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const STORAGE_KEY = "tr4de_goals_v2";

const HORIZONS = [
  { id: "week",  label: "Cette semaine", short: "semaine" },
  { id: "month", label: "Ce mois",       short: "mois" },
  { id: "year",  label: "Cette année",   short: "année" },
];
// Priorités (remplace les anciens niveaux facile/moyen/difficile)
const LEVELS = [
  { id: "low",     label: "Basse",    color: "#8E8E8E" },
  { id: "normal",  label: "Normale",  color: "#3B82F6" },
  { id: "high",    label: "Haute",    color: "#F59E0B" },
  { id: "urgent",  label: "Urgente",  color: "#EF4444" },
];

// Unités de cible pour les objectifs manuels (ignoré pour les sources trading
// qui ont déjà leur propre unité).
const UNITS = [
  { id: "count",   label: "Nombre",    suffix: "" },
  { id: "money",   label: "Argent",    suffix: "" /* utilise getCurrencySymbol() */, isMoney: true },
  { id: "percent", label: "Pourcent",  suffix: "%" },
  { id: "kg",      label: "Kilos",     suffix: " kg" },
  { id: "km",      label: "Kilomètres", suffix: " km" },
  { id: "hours",   label: "Heures",    suffix: " h" },
  { id: "minutes", label: "Minutes",   suffix: " min" },
  { id: "pages",   label: "Pages",     suffix: " pages" },
  { id: "times",   label: "Fois",      suffix: "×" },
];
const CATEGORIES = [
  { id: "trading",   label: "Trading",       color: "#10A37F", icon: TrendingUp },
  { id: "personal",  label: "Personnel",     color: "#EF4444", icon: Heart },
  { id: "sport",     label: "Sport",         color: "#F59E0B", icon: Dumbbell },
  { id: "reading",   label: "Lecture",       color: "#8B5CF6", icon: BookOpen },
  { id: "relations", label: "Relations",     color: "#EC4899", icon: Users },
  { id: "learning",  label: "Apprentissage", color: "#3B82F6", icon: GraduationCap },
  { id: "health",    label: "Santé",         color: "#06B6D4", icon: Activity },
  { id: "finance",   label: "Finances",      color: "#059669", icon: Wallet },
  { id: "work",      label: "Travail",       color: "#64748B", icon: Briefcase },
  { id: "code",      label: "Dev",           color: "#6366F1", icon: Code },
];
// Sources de suivi. `trading: true` = calculé à partir des trades et filtré
// sur l'horizon de l'objectif. Ces types ne sont proposés qu'en catégorie
// "Trading".
const AUTO_TYPES = [
  { id: "manual",   label: "Manuel",      unit: "",  trading: false },
  { id: "pnl",      label: "P&L",         unit: "$", trading: true  },
  { id: "winrate",  label: "Win rate",    unit: "%", trading: true  },
  { id: "trades",   label: "Nb de trades", unit: "", trading: true  },
  { id: "max_dd",   label: "Drawdown max", unit: "$", trading: true },
];

/* ---------- Helpers ---------- */
function weekRange() {
  const now = new Date();
  const dow = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59);
  return { start, end };
}
function monthRange() {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
}
function yearRange() {
  const now = new Date();
  return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
}
function tradesInRange(trades, start, end) {
  return (trades || []).filter(t => {
    const d = new Date(t.date);
    return !isNaN(d.getTime()) && d >= start && d <= end;
  });
}
function daysLeft(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline + "T23:59:59");
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
}

function defaultGoals() {
  return [
    { id: 1, label: "P&L du mois",  horizon: "month", level: "high",   category: "trading",  autoType: "pnl",     target: 1000, manual: 0, deadline: "", subtasks: [] },
    { id: 2, label: "Win rate",     horizon: "month", level: "normal", category: "trading",  autoType: "winrate", target: 60,   manual: 0, deadline: "", subtasks: [] },
    { id: 3, label: "Lire 1 livre", horizon: "month", level: "low",    category: "personal", autoType: "manual",  target: 1,    manual: 0, deadline: "", subtasks: [] },
  ];
}

/* ---------- Donut ---------- */
function Donut({ pct, color, size = 56, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.accentBg} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset .5s ease" }} />
    </svg>
  );
}

/* ---------- Page ---------- */
export default function GoalsPage() {
  useLang();
  const tradesHook = useTrades();
  const trades = tradesHook?.trades || [];

  const [goals, setGoals] = useCloudState(STORAGE_KEY, "goals", defaultGoals());

  // Migration : anciens autoType et anciens levels -> nouveaux
  useEffect(() => {
    const autoMap  = { pnl_week: "pnl", pnl_month: "pnl", pnl_year: "pnl", trades_month: "trades" };
    const levelMap = { easy: "low", medium: "normal", hard: "high" };
    let changed = false;
    const migrated = goals.map(g => {
      let next = g;
      if (autoMap[g.autoType]) { next = { ...next, autoType: autoMap[g.autoType] }; changed = true; }
      if (levelMap[g.level])   { next = { ...next, level: levelMap[g.level] };     changed = true; }
      if (!g.level)            { next = { ...next, level: "normal" };              changed = true; }
      return next;
    });
    if (changed) setGoals(migrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Déduit l'horizon (fenêtre de calcul pour les métriques trading) à partir
  // d'une deadline. Si la deadline est < 10 jours → semaine, < 45 → mois, sinon année.
  // Pas de deadline → mois par défaut.
  const horizonFromDeadline = (deadline) => {
    if (!deadline) return "month";
    const d = new Date(deadline + "T23:59:59");
    if (isNaN(d.getTime())) return "month";
    const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    if (diff <= 10) return "week";
    if (diff <= 45) return "month";
    return "year";
  };

  // Modal d'ajout/édition
  const emptyForm = { label: "", level: "normal", category: "trading", autoType: "manual", target: "", deadline: "", unit: "count" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (g) => { setForm({ label: g.label, level: g.level || "normal", category: g.category || "trading", autoType: g.autoType || "manual", target: String(g.target), deadline: g.deadline || "", unit: g.unit || "count" }); setEditingId(g.id); setShowForm(true); };
  const close = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  // Auto-save : dès qu'un champ change et qu'il y a assez d'infos, on enregistre
  // (édition → mise à jour live, création → insertion unique au 1er passage valide).
  useEffect(() => {
    if (!showForm) return;
    if (!form.label.trim() || !form.target) return;
    const horizon = horizonFromDeadline(form.deadline);
    const handle = setTimeout(() => {
      if (editingId) {
        setGoals(prev => prev.map(g => g.id === editingId ? {
          ...g, label: form.label.trim(), horizon, level: form.level,
          category: form.category, autoType: form.autoType,
          target: parseFloat(form.target), deadline: form.deadline, unit: form.unit,
        } : g));
      } else {
        // Créer le nouveau goal et passer immédiatement en mode édition
        const id = Date.now();
        setGoals(prev => [...prev, {
          id, label: form.label.trim(), horizon, level: form.level,
          category: form.category, autoType: form.autoType,
          target: parseFloat(form.target), deadline: form.deadline, unit: form.unit,
          manual: 0,
        }]);
        setEditingId(id);
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, showForm]);
  const remove = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  const adjustManual = (gid, delta) => setGoals(prev => prev.map(g => g.id === gid ? { ...g, manual: Math.max(0, (parseFloat(g.manual) || 0) + delta) } : g));

  // Compute current/target/pct pour un goal
  // L'horizon détermine la fenêtre temporelle pour les métriques trading.
  const rangeOf = (horizon) => {
    if (horizon === "week") return weekRange();
    if (horizon === "year") return yearRange();
    return monthRange();
  };
  const compute = (g) => {
    const tgt = parseFloat(g.target) || 0;
    const { start, end } = rangeOf(g.horizon || "month");
    let current = 0;
    if (g.autoType === "manual") current = parseFloat(g.manual) || 0;
    else if (g.autoType === "pnl") current = tradesInRange(trades, start, end).reduce((s, t) => s + (t.pnl || 0), 0);
    else if (g.autoType === "winrate") {
      const list = tradesInRange(trades, start, end);
      const w = list.filter(t => (t.pnl || 0) > 0).length;
      const l = list.filter(t => (t.pnl || 0) < 0).length;
      current = (w + l) > 0 ? (w / (w + l)) * 100 : 0;
    }
    else if (g.autoType === "trades") current = tradesInRange(trades, start, end).length;
    else if (g.autoType === "max_dd") {
      const list = tradesInRange(trades, start, end).sort((a, b) => new Date(a.date) - new Date(b.date));
      let peak = 0, cum = 0, mdd = 0;
      for (const tr of list) { cum += (tr.pnl || 0); if (cum > peak) peak = cum; if (peak - cum > mdd) mdd = peak - cum; }
      current = mdd;
    }
    const pct = tgt === 0 ? 0 : Math.max(0, Math.min(100, (current / tgt) * 100));
    return { current, target: tgt, pct };
  };

  // Renvoie { prefix, suffix } pour formater la valeur
  const unitOf = (g) => {
    if (g.autoType !== "manual") {
      const u = AUTO_TYPES.find(a => a.id === g.autoType)?.unit || "";
      if (u === "$") return { prefix: getCurrencySymbol(), suffix: "" };
      if (u === "%") return { prefix: "", suffix: "%" };
      return { prefix: "", suffix: "" };
    }
    const unit = UNITS.find(u => u.id === (g.unit || "count")) || UNITS[0];
    if (unit.isMoney) return { prefix: getCurrencySymbol(), suffix: "" };
    return { prefix: "", suffix: unit.suffix };
  };
  const fmtVal = (v, u) => {
    // u peut être soit l'ancien string (compat), soit { prefix, suffix }
    if (typeof u === "string") {
      if (u === "%") return `${Math.round(v)}%`;
      if (u === "") return Math.round(v).toLocaleString("fr-FR");
      return `${u}${Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    const { prefix = "", suffix = "" } = u || {};
    const n = Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `${prefix}${n}${suffix}`;
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = goals.length;
    let achieved = 0, onTrack = 0, atRisk = 0;
    for (const g of goals) {
      const { pct } = compute(g);
      const dl = daysLeft(g.deadline);
      if (pct >= 100) achieved++;
      else if (dl !== null && dl < 3 && pct < 80) atRisk++;
      else onTrack++;
    }
    return { total, achieved, onTrack, atRisk };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, trades]);

  // Filtre catégorie
  const [catFilter, setCatFilter] = useState("all"); // all | trading | personal
  const filtered = catFilter === "all" ? goals : goals.filter(g => (g.category || "trading") === catFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* Header : pleine largeur au-dessus du drawer */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>{t("nav.goals")}</h1>
        <button onClick={openCreate}
          style={{ marginLeft: "auto", padding: "7px 14px", height: 34, borderRadius: 8, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Nouvel objectif
        </button>
      </div>

      {/* À partir d'ici : le drawer occupe la colonne de droite */}
      <div className="tr4de-goals-layout" style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats strip (style timeline) */}
      <StatStrip kpis={kpis} goals={goals} compute={compute} />

      {/* Séparateur entre les KPIs et la liste des objectifs */}
      <div style={{ height: 1, background: T.border, margin: "0 16px" }} />

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(70px, 110px) minmax(0, 1fr) minmax(90px, 160px) minmax(110px, 160px) 60px", gap: 12, padding: "0 16px", fontSize: 11, color: T.textMut, fontWeight: 500 }}>
        <div>Créé le</div>
        <div>Objectif</div>
        <div>Échéance</div>
        <div>Cible</div>
        <div />
      </div>

      {/* Category tabs : n'afficher que les catégories qui contiennent au moins un objectif */}
      <div style={{ display: "flex", gap: 6, padding: "0 16px", flexWrap: "wrap" }}>
        {(() => {
          const tabs = [{ id: "all", label: "Tous", icon: null }];
          CATEGORIES.forEach(c => {
            const count = goals.filter(g => (g.category || "trading") === c.id).length;
            if (count > 0) tabs.push(c);
          });
          return tabs.map(c => {
            const Icon = c.icon;
            const count = c.id === "all" ? goals.length : goals.filter(g => (g.category || "trading") === c.id).length;
            return (
              <button key={c.id} onClick={() => setCatFilter(c.id)}
                style={{
                  padding: "6px 12px", borderRadius: 999,
                  border: `1px solid ${catFilter === c.id ? T.text : T.border}`,
                  background: catFilter === c.id ? T.text : T.white,
                  color: catFilter === c.id ? T.white : T.text,
                  fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                {Icon && <Icon size={11} strokeWidth={1.75} />}
                {c.label}
                <span style={{ padding: "0 6px", borderRadius: 999, fontSize: 10, background: catFilter === c.id ? "rgba(255,255,255,0.18)" : T.accentBg, color: catFilter === c.id ? "#fff" : T.textSub }}>{count}</span>
              </button>
            );
          });
        })()}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <EmptyState onClick={openCreate} />
      ) : (
        <>
          {(() => {
            // Tri par priorité (urgent > haute > normale > basse), puis par deadline la plus proche
            const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };
            const byPriority = (a, b) => {
              const pa = priorityRank[a.level || "normal"] ?? 2;
              const pb = priorityRank[b.level || "normal"] ?? 2;
              if (pa !== pb) return pa - pb;
              // Même priorité : deadline la plus proche d'abord (pas de deadline = dernier)
              const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
              const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
              return da - db;
            };
            const onGoing = filtered.filter(g => {
              const { pct, current, target } = compute(g);
              return g.autoType === "max_dd" ? current > target : pct < 100;
            }).sort(byPriority);
            const done = filtered.filter(g => {
              const { pct, current, target } = compute(g);
              return g.autoType === "max_dd" ? current <= target : pct >= 100;
            }).sort(byPriority);
            return (
              <>
                {onGoing.length > 0 && (
                  <TimelineSection title="En cours" rows={onGoing}
                    compute={compute} unitOf={unitOf} fmtVal={fmtVal}
                    onEdit={openEdit} onDelete={remove}
                    onAdjustManual={adjustManual}
                  />
                )}
                {done.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => setShowDone(s => !s)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        alignSelf: "flex-start",
                        margin: "8px 16px 0",
                        padding: "6px 10px",
                        border: "none", background: "transparent",
                        color: T.textSub, fontSize: 12, fontWeight: 500,
                        cursor: "pointer", fontFamily: "inherit",
                        borderRadius: 6, transition: "background .12s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <ChevronRight size={12} strokeWidth={2} style={{ transform: showDone ? "rotate(90deg)" : "none", transition: "transform .15s ease" }} />
                      {showDone ? "Masquer" : "Afficher"} les {done.length} objectif{done.length > 1 ? "s" : ""} terminé{done.length > 1 ? "s" : ""}
                    </button>
                    {showDone && (
                      <TimelineSection title="Terminés" rows={done}
                        compute={compute} unitOf={unitOf} fmtVal={fmtVal}
                        onEdit={openEdit} onDelete={remove}
                        onAdjustManual={adjustManual}
                        doneSection
                      />
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

    </div>
    {/* Drawer inline : s'étire pleine hauteur, aligné avec le contenu */}
    {showForm && (
        <div
          className="tr4de-drawer"
          style={{
            width: 360, flexShrink: 0,
            background: T.white,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            display: "flex", flexDirection: "column",
            alignSelf: "stretch",
            minHeight: "100%",
            overflow: "hidden",
            animation: "goalDrawerIn .22s cubic-bezier(.2,.8,.2,1) both",
            fontFamily: "var(--font-sans)",
          }}>
            <style>{`
              @keyframes goalDrawerIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
              .no-spin::-webkit-outer-spin-button,
              .no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
              .no-spin { -moz-appearance: textfield; }
              .fancy-date::-webkit-calendar-picker-indicator {
                opacity: 0; position: absolute; right: 0; top: 0; bottom: 0; width: 100%; cursor: pointer;
              }
              .fancy-date { position: relative; }
            `}</style>

            {/* Header : titre + close */}
            <div style={{ padding: "16px 18px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {editingId ? "Détail de l'objectif" : "Nouvel objectif"}
              </h3>
              <button onClick={close}
                style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>

            {/* Body : style stacked (label au-dessus, valeur en gros), séparé par fines lignes */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 16px" }}>
              {/* Nom */}
              <StackField label="Nom de l'objectif" icon={Pencil}>
                <input type="text" autoFocus value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Nom de l'objectif..."
                  style={stackInput()} />
              </StackField>

              {/* Deadline (full width) avec presets + calendrier custom */}
              <DeadlineField value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} />


              {/* Priorité (full width, sous la deadline) */}
              <StackField label="Priorité">
                <FancyDropdown
                  value={form.level}
                  options={LEVELS}
                  onChange={(v) => setForm({ ...form, level: v })}
                  renderValue={(lv) => (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: lv.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 400, color: lv.color }}>{lv.label}</span>
                    </span>
                  )}
                  renderOption={(lv, active) => (
                    <>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: lv.color, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{lv.label}</span>
                      {active && <Check size={12} strokeWidth={2.5} color={T.green} />}
                    </>
                  )}
                />
              </StackField>

              {/* Cible (full width, sous la priorité) avec sélecteur d'unité à droite */}
              <StackField label="Cible">
                <input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
                  placeholder="1000"
                  className="no-spin"
                  style={{ ...stackInput(), MozAppearance: "textfield", appearance: "textfield" }} />
                {form.autoType === "manual" ? (
                  <div style={{ flexShrink: 0, marginLeft: 8, padding: "4px 10px 4px 12px", background: T.bg, borderRadius: 999, border: `1px solid ${T.border}` }}>
                    <FancyDropdown
                      value={form.unit}
                      options={UNITS}
                      onChange={(v) => setForm({ ...form, unit: v })}
                      renderValue={(u) => (
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{u.label}</span>
                      )}
                      renderOption={(u, active) => (
                        <>
                          <span style={{ flex: 1 }}>{u.label}</span>
                          {active && <Check size={12} strokeWidth={2.5} color={T.green} />}
                        </>
                      )}
                    />
                  </div>
                ) : (() => {
                  const a = AUTO_TYPES.find(x => x.id === form.autoType);
                  const label = a?.unit === "$" ? getCurrencySymbol() : a?.unit === "%" ? "%" : "trades";
                  return (
                    <span style={{ flexShrink: 0, marginLeft: 8, padding: "6px 12px", borderRadius: 999, background: T.bg, border: `1px solid ${T.border}`, color: T.textSub, fontSize: 12, fontWeight: 600 }}>
                      {label}
                    </span>
                  );
                })()}
              </StackField>

              {/* Catégorie — grille compacte (2 lignes de 5) */}
              <div style={{ padding: "12px 0", borderBottom: form.category === "trading" ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>Catégorie</div>
                  {(() => {
                    const cat = CATEGORIES.find(c => c.id === form.category) || CATEGORIES[0];
                    return (
                      <span style={{ fontSize: 11, fontWeight: 600, color: cat.color }}>{cat.label}</span>
                    );
                  })()}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {CATEGORIES.map(c => {
                    const Icon = c.icon;
                    const active = form.category === c.id;
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setForm(prev => {
                          const next = { ...prev, category: c.id };
                          if (c.id !== "trading" && AUTO_TYPES.find(a => a.id === prev.autoType)?.trading) next.autoType = "manual";
                          return next;
                        })}
                        title={c.label}
                        style={{
                          background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit",
                          padding: 0,
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                          minWidth: 0, overflow: "hidden",
                        }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: active ? c.color : T.bg,
                          color: active ? "#fff" : T.textSub,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          transition: "all .15s ease",
                          boxShadow: active ? `0 2px 8px ${c.color}40` : "none",
                        }}>
                          <Icon size={14} strokeWidth={1.75} />
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 600,
                          color: active ? c.color : T.textMut,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
                          transition: "color .15s ease",
                        }}>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source de suivi — visible uniquement pour Trading */}
              {form.category === "trading" && (
                <StackField label="Source de suivi" last={form.autoType !== "manual"}>
                  <FancyDropdown
                    value={form.autoType}
                    options={AUTO_TYPES}
                    onChange={(v) => setForm({ ...form, autoType: v })}
                    renderOption={(a, active) => (
                      <>
                        <span style={{ flex: 1 }}>{a.label}</span>
                        {active && <Check size={12} strokeWidth={2.5} color={T.green} />}
                      </>
                    )}
                  />
                </StackField>
              )}

              {/* Progression actuelle — visible uniquement pour les objectifs manuels */}
              {form.autoType === "manual" && editingId && (() => {
                const g = goals.find(gg => gg.id === editingId);
                if (!g) return null;
                const unit = UNITS.find(u => u.id === (form.unit || "count")) || UNITS[0];
                const suffix = unit.isMoney ? getCurrencySymbol() : unit.suffix;
                return (
                  <StackField label="Progression actuelle" last>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <input type="number" value={g.manual || 0}
                        className="no-spin"
                        onChange={(e) => setGoals(prev => prev.map(x => x.id === g.id ? { ...x, manual: parseFloat(e.target.value) || 0 } : x))}
                        style={{ ...stackInput(), MozAppearance: "textfield", appearance: "textfield" }} />
                      {suffix && <span style={{ fontSize: 12, color: T.textMut, fontWeight: 500, flexShrink: 0 }}>{suffix.trim()}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                      <button onClick={() => adjustManual(g.id, -1)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>−</button>
                      <button onClick={() => adjustManual(g.id, 1)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.text}`, background: T.text, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>+</button>
                    </div>
                  </StackField>
                );
              })()}
            </div>

          </div>
      )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */
function StatStrip({ kpis, goals, compute }) {
  const now = new Date();

  // Objectifs actifs (pas atteints, non archivés)
  const active = goals.filter(g => {
    const { pct, current, target } = compute(g);
    return g.autoType === "max_dd" ? current > target : pct < 100;
  });

  // Objectifs actifs avec deadline dans le mois courant
  const dueThisMonth = active.filter(g => {
    if (!g.deadline) return false;
    const d = new Date(g.deadline + "T23:59:59");
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Prochaine deadline à venir (objectif actif)
  const upcoming = (() => {
    const list = active
      .filter(g => g.deadline)
      .map(g => ({ g, d: new Date(g.deadline + "T23:59:59") }))
      .filter(x => !isNaN(x.d.getTime()) && x.d >= now)
      .sort((a, b) => a.d - b.d);
    return list[0] || null;
  })();

  // Progression moyenne (% moyen sur tous les objectifs actifs)
  const avgProgress = active.length > 0
    ? Math.round(active.reduce((s, g) => s + compute(g).pct, 0) / active.length)
    : 0;

  // Taux de succès global
  const successRate = kpis.total > 0 ? Math.round((kpis.achieved / kpis.total) * 100) : 0;

  return (
    <div style={{ display: "flex", background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <StatCell
        icon={Calendar}
        label="Objectifs ce mois"
        subLabel={`${active.length} actif${active.length > 1 ? "s" : ""} au total`}
        value={`${dueThisMonth.length}`}
      />
      <StatCell
        icon={TrendingUp}
        label="Progression moyenne"
        subLabel={`${active.length} objectif${active.length > 1 ? "s" : ""} en cours`}
        value={`${avgProgress}%`}
      />
      <StatCell
        icon={Clock}
        label="Prochaine échéance"
        subLabel={upcoming ? upcoming.g.label : "Aucune deadline"}
        value={upcoming ? upcoming.d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
      />
      <StatCell
        icon={Trophy}
        label="Objectifs atteints"
        subLabel={kpis.total > 0 ? `${successRate}% de réussite` : "—"}
        value={`${kpis.achieved}/${kpis.total}`}
        isLast
      />
    </div>
  );
}
function StatCell({ icon: Icon, label, subLabel, value, isLast }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: 16, borderRight: isLast ? "none" : `1px solid ${T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {Icon && (
          <div style={{ width: 26, height: 26, borderRadius: 8, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={14} strokeWidth={1.75} color={T.text} />
          </div>
        )}
        <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: -0.2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subLabel}</div>
    </div>
  );
}

function TimelineSection({ title, rows, compute, unitOf, fmtVal, onEdit, onDelete, expanded, onToggleExpand, onAdjustManual, subtaskInput, onSubtaskInputChange, onAddSub, onToggleSub, onRemoveSub, doneSection }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1, padding: "0 16px 8px" }}>{title}</div>
      {rows.map(g => (
        <TimelineRow key={g.id} goal={g}
          compute={compute} unitOf={unitOf} fmtVal={fmtVal}
          onEdit={() => onEdit(g)}
          onDelete={() => onDelete(g.id)}
          onAdjustManual={(d) => onAdjustManual(g.id, d)}
          doneSection={doneSection}
        />
      ))}
    </div>
  );
}

function TimelineRow({ goal: g, compute, unitOf, fmtVal, onEdit, onDelete, onAdjustManual, doneSection }) {
  const cat = CATEGORIES.find(c => c.id === g.category) || CATEGORIES[0];
  const Ic = cat.icon;
  const { current, target, pct } = compute(g);
  const unit = unitOf(g);
  const dl = daysLeft(g.deadline);
  const isAchieved = doneSection || (g.autoType === "max_dd" ? current <= target : pct >= 100);
  const atRisk = !isAchieved && dl !== null && dl < 3 && pct < 80;

  // Date de création courte (format 09:05 si created same day, ou dd MMM)
  const createdLabel = (() => {
    const d = new Date(g.id); // l'id est un timestamp
    if (isNaN(d.getTime())) return "—";
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  })();

  const dueLabel = g.deadline
    ? new Date(g.deadline + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const [hover, setHover] = useState(false);

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onEdit}
        style={{
          display: "grid", gridTemplateColumns: "minmax(70px, 110px) minmax(0, 1fr) minmax(90px, 160px) minmax(110px, 160px) 60px", gap: 12,
          alignItems: "center", padding: "12px 16px",
          background: hover ? "#FAFAFA" : "transparent",
          borderRadius: 8,
          cursor: "pointer",
          transition: "background .12s ease",
        }}
      >
        <div style={{ fontSize: 12, color: T.textMut, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{createdLabel}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {/* Icon bubble — gris neutre, cohérent avec le reste du site */}
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: T.accentBg,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            color: isAchieved ? T.textMut : T.text,
          }}>
            <Ic size={15} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: T.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              textDecoration: doneSection ? "line-through" : "none",
            }}>{g.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontSize: 11, color: T.textMut, overflow: "hidden", whiteSpace: "nowrap" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{cat.label}</span>
              {(() => {
                const lv = LEVELS.find(l => l.id === (g.level || "normal")) || LEVELS[1];
                return (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 999,
                    color: lv.color,
                    background: lv.color + "18",
                  }}>{lv.label}</span>
                );
              })()}
              {atRisk && <span style={{ color: T.amber, marginLeft: 2, fontWeight: 600 }}>· à risque</span>}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>
          {dueLabel}
          {dl !== null && !isAchieved && (
            <div style={{ fontSize: 10, color: dl < 0 ? T.red : dl <= 3 ? T.amber : T.textMut, fontWeight: 500, marginTop: 1 }}>
              {dl < 0 ? `${Math.abs(dl)}j dépassée` : dl === 0 ? "aujourd'hui" : `${dl}j restants`}
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: T.text }}>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtVal(current, unit)}</span>
          <span style={{ color: T.textMut, margin: "0 3px" }}>/</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtVal(target, unit)}</span>
          <div style={{ height: 3, background: T.accentBg, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: isAchieved ? T.green : pct >= 50 ? T.blue : T.amber, borderRadius: 2, transition: "width .4s ease" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, justifyContent: "flex-end", opacity: hover ? 1 : 0, transition: "opacity .12s ease" }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "background .15s ease, color .12s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; e.currentTarget.style.color = T.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
            <Pencil size={11} strokeWidth={1.75} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "background .15s ease, color .12s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
            <Trash2 size={11} strokeWidth={1.75} />
          </button>
        </div>
      </div>

    </>
  );
}


function EmptyState({ onClick }) {
  return (
    <div style={{ background: T.white, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "56px 24px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 12, background: T.accentBg, marginBottom: 12 }}>
        <Target size={22} strokeWidth={1.75} color={T.textSub} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6, letterSpacing: -0.1 }}>Pas d&apos;objectif pour le moment</div>
      <div style={{ fontSize: 13, color: T.textSub, marginBottom: 16, maxWidth: 380, margin: "0 auto 16px" }}>Crée ton premier objectif pour commencer à suivre ta progression.</div>
      <button onClick={onClick}
        style={{ padding: "8px 18px", borderRadius: 8, background: T.text, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Plus size={13} strokeWidth={2} /> Créer un objectif
      </button>
    </div>
  );
}

/* ---------- Tiny helpers ---------- */
// Dropdown stylé (popover) — remplace les <select> natifs
// Champ Deadline : dropdown de presets à gauche + popover calendrier custom
function DeadlineField({ value, onChange }) {
  const today = new Date();
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const plusMonths = (n) => { const d = new Date(today); d.setMonth(d.getMonth() + n); return d; };
  const plusYears = (n) => { const d = new Date(today); d.setFullYear(d.getFullYear() + n); return d; };

  const presets = [
    { id: toISO(endOfMonth),     label: "Ce mois" },
    { id: toISO(plusMonths(1)),  label: "Dans 1 mois" },
    { id: toISO(plusMonths(2)),  label: "Dans 2 mois" },
    { id: toISO(plusMonths(3)),  label: "Dans 3 mois" },
    { id: toISO(plusMonths(6)),  label: "Dans 6 mois" },
    { id: toISO(plusYears(1)),   label: "Dans 1 an" },
  ];
  const activePreset = presets.find(p => p.id === value);

  const [calOpen, setCalOpen] = useState(false);
  const calRef = React.useRef(null);
  useEffect(() => {
    if (!calOpen) return;
    const onDoc = (e) => { if (calRef.current && !calRef.current.contains(e.target)) setCalOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [calOpen]);

  // État du mois affiché dans le popover
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  return (
    <StackField label="Deadline">
      {/* Dropdown de presets (colé à gauche) */}
      <div style={{ flex: "0 0 auto" }}>
        <FancyDropdown
          value={activePreset ? activePreset.id : "__custom"}
          options={[...presets, { id: "__custom", label: value && !activePreset
            ? new Date(value + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
            : "Personnalisée…" }]}
          onChange={(v) => { if (v !== "__custom") onChange(v); }}
          align="left"
          renderValue={(opt) => (
            <span style={{ fontSize: 14, fontWeight: 400, color: value ? T.text : T.textMut }}>
              {value ? (activePreset ? activePreset.label : new Date(value + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })) : "Choisir…"}
            </span>
          )}
          renderOption={(opt, active) => (
            <>
              <span style={{ flex: 1 }}>{opt.label}</span>
              {active && <Check size={12} strokeWidth={2.5} color={T.green} />}
            </>
          )}
        />
      </div>
      {/* Bouton calendrier : poussé à droite */}
      <div ref={calRef} style={{ position: "relative", flexShrink: 0, marginLeft: "auto" }}>
        <button type="button" title="Choisir une date" onClick={() => setCalOpen(v => !v)}
          style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: calOpen ? T.accentBg : T.white, color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Calendar size={13} strokeWidth={1.75} />
        </button>
        {calOpen && (
          <MiniCalendar
            value={value}
            viewDate={viewDate}
            setViewDate={setViewDate}
            onPick={(iso) => { onChange(iso); setCalOpen(false); }}
          />
        )}
      </div>
    </StackField>
  );
}

// Popover calendrier 1 mois, à la DateRangePicker
function MiniCalendar({ value, viewDate, setViewDate, onPick }) {
  const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const WD = ["L", "M", "M", "J", "V", "S", "D"];
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const dow = first.getDay(); // 0 = dim
  const lead = dow === 0 ? 6 : dow - 1; // Lundi en 1ère colonne
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const todayISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 6px)", right: 0,
      width: 280, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12,
      boxShadow: "0 12px 32px rgba(0,0,0,0.10)", zIndex: 200, padding: 12,
    }}>
      {/* Header mois */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button type="button" onClick={goPrev}
          style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} />
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{MONTHS[month]} {year}</div>
        <button type="button" onClick={goNext}
          style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <ChevronDown size={14} style={{ transform: "rotate(-90deg)" }} />
        </button>
      </div>

      {/* Weekdays */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WD.map((w, i) => (
          <div key={i} style={{ fontSize: 10, color: T.textMut, textAlign: "center", padding: "4px 0", fontWeight: 500 }}>{w}</div>
        ))}
      </div>

      {/* Jours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toISO(d);
          const isSel = selected && toISO(selected) === iso;
          const isToday = iso === todayISO;
          return (
            <button key={i} type="button" onClick={() => onPick(iso)}
              style={{
                width: "100%", aspectRatio: "1 / 1",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: isSel ? 600 : 500,
                color: isSel ? "#fff" : T.text,
                background: isSel ? T.text : "transparent",
                border: isToday && !isSel ? `1px solid ${T.border2 || T.border}` : "none",
                borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                transition: "background .1s ease",
              }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = T.accentBg; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FancyDropdown({ value, options, onChange, renderValue, renderOption, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const selected = options.find(o => o.id === value) || options[0];
  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: 0, border: "none", background: "transparent",
          cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: align === "left" ? "flex-start" : "flex-end", gap: 6,
          color: T.text,
        }}>
        {renderValue ? renderValue(selected) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{selected?.label}</span>
        )}
        <ChevronDown size={14} strokeWidth={1.75} color={T.textMut}
          style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)",
          [align === "left" ? "left" : "right"]: 0, minWidth: 200,
          background: T.white, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
          padding: 4, zIndex: 100, maxHeight: 280, overflowY: "auto",
        }}>
          {options.map(o => (
            <button key={o.id} type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 6, border: "none",
                background: value === o.id ? T.accentBg : "transparent",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                fontSize: 13, fontWeight: value === o.id ? 600 : 500, color: T.text,
                transition: "background .12s ease",
              }}
              onMouseEnter={(e) => { if (value !== o.id) e.currentTarget.style.background = T.bg; }}
              onMouseLeave={(e) => { if (value !== o.id) e.currentTarget.style.background = "transparent"; }}>
              {renderOption ? renderOption(o, value === o.id) : o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StackField({ label, icon: Icon, valueColor, last, children }) {
  return (
    <div style={{
      padding: "14px 0",
      borderBottom: last ? "none" : `1px solid ${T.border}`,
    }}>
      <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", color: valueColor || T.text }}>
        {children}
        {Icon && <Icon size={14} strokeWidth={1.75} color={T.textMut} style={{ flexShrink: 0, marginLeft: 10 }} />}
      </div>
    </div>
  );
}
function stackInput() {
  return {
    flex: 1, background: "transparent", border: "none", outline: "none",
    fontSize: 14, fontWeight: 400, color: T.text, padding: 0,
    fontFamily: "inherit", letterSpacing: -0.05, minWidth: 0,
  };
}

function RowField({ label, children, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "16px 0",
      borderBottom: last ? "none" : `1px solid ${T.border}`,
    }}>
      <div style={{ fontSize: 13, color: T.textSub, fontWeight: 500, flexShrink: 0, minWidth: 120 }}>{label}</div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: T.text, letterSpacing: -0.05 }}>
          {label}
        </label>
        {required && <span style={{ color: T.red, fontSize: 12, fontWeight: 600 }}>*</span>}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.textMut, lineHeight: 1.5, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function DetailField({ label, children }) {
  return (
    <div style={{ background: T.bg, borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 10, color: T.textMut, fontWeight: 500, textTransform: "none", letterSpacing: 0.2 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 22 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: T.textMut, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>
      {children}
    </div>
  );
}
function inputStyle() {
  return { width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white };
}
function iconBtnStyle() {
  return { width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
}
function chipBtn() {
  return { padding: "5px 14px", borderRadius: 999, border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" };
}
