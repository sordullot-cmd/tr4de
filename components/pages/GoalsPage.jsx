"use client";

import React, { useEffect, useState } from "react";
import { Plus, Target, Trash2, Pencil, Check, X } from "lucide-react";
import { getCurrencySymbol } from "@/lib/userPrefs";
import { useTrades } from "@/lib/hooks/useTradeData";

const T = {
  white: "#FFFFFF",
  border: "#E5E5E5",
  text: "#0D0D0D",
  textSub: "#5C5C5C",
  textMut: "#8E8E8E",
  accent: "#0D0D0D",
  accentBg: "#F0F0F0",
  green: "#10A37F",
  red: "#EF4444",
  blue: "#3B82F6",
};

const STORAGE_KEY = "tr4de_goals";

// Types d'objectifs calculés automatiquement à partir des trades
const GOAL_TYPES = [
  { id: "pnl_month",    label: "P&L mensuel cible",     unit: "$"  },
  { id: "pnl_week",     label: "P&L hebdomadaire cible", unit: "$" },
  { id: "winrate",      label: "Taux de victoire cible", unit: "%" },
  { id: "trades_month", label: "Trades ce mois",         unit: ""  },
  { id: "max_dd",       label: "Drawdown max à ne pas dépasser", unit: "$" },
  { id: "custom",       label: "Personnalisé",           unit: ""  },
];

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}
function currentWeekRange() {
  const now = new Date();
  const dow = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59);
  return { start, end };
}
function tradesInRange(trades, start, end) {
  return (trades || []).filter(t => {
    const d = new Date(t.date);
    return !isNaN(d.getTime()) && d >= start && d <= end;
  });
}

export default function GoalsPage() {
  const tradesHook = useTrades();
  const trades = tradesHook?.trades || [];

  const [goals, setGoals] = useState(() => {
    if (typeof window === "undefined") return defaultGoals();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return Array.isArray(saved) && saved.length ? saved : defaultGoals();
    } catch { return defaultGoals(); }
  });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ label: "", type: "pnl_month", target: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(goals)); } catch {}
  }, [goals]);

  function defaultGoals() {
    return [
      { id: 1, label: "P&L mensuel", type: "pnl_month", target: 1000 },
      { id: 2, label: "Win rate", type: "winrate", target: 60 },
      { id: 3, label: "Trades ce mois", type: "trades_month", target: 20 },
    ];
  }

  const computeProgress = (goal) => {
    const tgt = parseFloat(goal.target) || 0;
    let current = 0;
    if (goal.type === "pnl_month") {
      const { start, end } = currentMonthRange();
      current = tradesInRange(trades, start, end).reduce((s, t) => s + (t.pnl || 0), 0);
    } else if (goal.type === "pnl_week") {
      const { start, end } = currentWeekRange();
      current = tradesInRange(trades, start, end).reduce((s, t) => s + (t.pnl || 0), 0);
    } else if (goal.type === "winrate") {
      const { start, end } = currentMonthRange();
      const list = tradesInRange(trades, start, end);
      const wins = list.filter(t => (t.pnl || 0) > 0).length;
      const losses = list.filter(t => (t.pnl || 0) < 0).length;
      current = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
    } else if (goal.type === "trades_month") {
      const { start, end } = currentMonthRange();
      current = tradesInRange(trades, start, end).length;
    } else if (goal.type === "max_dd") {
      // Drawdown courant du mois
      const { start, end } = currentMonthRange();
      const list = tradesInRange(trades, start, end).sort((a, b) => new Date(a.date) - new Date(b.date));
      let peak = 0, cum = 0, maxDd = 0;
      for (const tr of list) {
        cum += (tr.pnl || 0);
        if (cum > peak) peak = cum;
        const dd = peak - cum;
        if (dd > maxDd) maxDd = dd;
      }
      current = maxDd;
    } else {
      current = parseFloat(goal.current) || 0;
    }
    const pct = tgt === 0 ? 0 : Math.max(0, Math.min(100, (current / tgt) * 100));
    return { current, target: tgt, pct };
  };

  const goalUnit = (goal) => {
    const type = GOAL_TYPES.find(g => g.id === goal.type);
    return type?.unit === "$" ? getCurrencySymbol() : (type?.unit || "");
  };
  const fmtValue = (v, unit) => {
    if (unit === "%") return `${Math.round(v)}%`;
    if (unit === "") return Math.round(v).toLocaleString("fr-FR");
    return `${unit}${Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const resetForm = () => { setForm({ label: "", type: "pnl_month", target: "" }); setEditingId(null); setShowForm(false); };
  const startEdit = (goal) => { setForm({ label: goal.label, type: goal.type, target: String(goal.target) }); setEditingId(goal.id); setShowForm(true); };
  const save = () => {
    if (!form.label.trim() || !form.target) return;
    if (editingId) {
      setGoals(prev => prev.map(g => g.id === editingId ? { ...g, label: form.label.trim(), type: form.type, target: parseFloat(form.target) } : g));
    } else {
      setGoals(prev => [...prev, { id: Date.now(), label: form.label.trim(), type: form.type, target: parseFloat(form.target) }]);
    }
    resetForm();
  };
  const remove = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Objectifs</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ label: "", type: "pnl_month", target: "" }); }}
          style={{
            marginLeft: "auto", padding: "7px 14px", height: 34, borderRadius: 8,
            background: T.text, border: `1px solid ${T.text}`, color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <Plus size={14} strokeWidth={2} /> Nouvel objectif
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {showForm && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: 10, color: T.textMut, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Nom</label>
              <input
                type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="ex. Atteindre 2000$ en avril"
                style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, color: T.textMut, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Type</label>
              <select
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }}
              >
                {GOAL_TYPES.map(g => (<option key={g.id} value={g.id}>{g.label}</option>))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, color: T.textMut, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Cible</label>
              <input
                type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
                placeholder="ex. 1000"
                style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={save} style={{ width: 36, height: 36, borderRadius: 8, background: T.green, border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={14} strokeWidth={2.5} />
              </button>
              <button onClick={resetForm} style={{ width: 36, height: 36, borderRadius: 8, background: T.white, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div style={{ background: T.white, border: `1px dashed ${T.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: T.accentBg, marginBottom: 12 }}>
            <Target size={20} strokeWidth={1.75} color={T.textSub} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Aucun objectif défini</div>
          <div style={{ fontSize: 12, color: T.textSub }}>Ajoute un objectif pour suivre ta progression</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {goals.map(goal => {
            const { current, target, pct } = computeProgress(goal);
            const unit = goalUnit(goal);
            const color = goal.type === "max_dd" ? (current <= target ? T.green : T.red) : (pct >= 100 ? T.green : T.blue);
            const typeLabel = GOAL_TYPES.find(g => g.id === goal.type)?.label || "";
            return (
              <div key={goal.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>{goal.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 }}>{typeLabel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => startEdit(goal)} title="Modifier"
                      style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Pencil size={11} strokeWidth={1.75} />
                    </button>
                    <button onClick={() => remove(goal.id)} title="Supprimer"
                      style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, color: T.red, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={11} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>
                      {fmtValue(current, unit)}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500 }}>
                      / {fmtValue(target, unit)}
                    </div>
                  </div>
                  <div style={{ height: 6, background: T.accentBg, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.textMut, fontWeight: 500, marginTop: 4, textAlign: "right" }}>
                    {Math.round(pct)}% {goal.type === "max_dd" ? "du plafond" : "atteint"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
