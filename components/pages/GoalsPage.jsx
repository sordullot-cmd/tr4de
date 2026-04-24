"use client";

import React, { useEffect, useState } from "react";
import { Plus, Target, Trash2, Pencil, Check, X, TrendingUp, Heart, ChevronDown, ChevronRight } from "lucide-react";
import { getCurrencySymbol } from "@/lib/userPrefs";
import { useTrades } from "@/lib/hooks/useTradeData";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const STORAGE_KEY = "tr4de_goals_v2";

const HORIZONS = [
  { id: "week",  label: "Semaine" },
  { id: "month", label: "Mois" },
  { id: "year",  label: "Année" },
];
const CATEGORIES = [
  { id: "trading",  label: "Trading",  icon: TrendingUp, color: "#10A37F" },
  { id: "personal", label: "Personnel", icon: Heart,     color: "#EF4444" },
];
const AUTO_TYPES = [
  { id: "manual",       label: "Manuel (saisi à la main)", unit: "" },
  { id: "pnl_week",     label: "P&L de la semaine",        unit: "$" },
  { id: "pnl_month",    label: "P&L du mois",              unit: "$" },
  { id: "pnl_year",     label: "P&L de l'année",           unit: "$" },
  { id: "winrate",      label: "Taux de victoire (mois)",  unit: "%" },
  { id: "trades_month", label: "Nombre de trades (mois)",  unit: "" },
  { id: "max_dd",       label: "Drawdown max (mois)",      unit: "$" },
];

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
  const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function defaultGoals() {
  return [
    { id: 1, label: "P&L mensuel cible",    horizon: "month", category: "trading",  autoType: "pnl_month",    target: 1000, manual: 0, deadline: "", subtasks: [] },
    { id: 2, label: "Win rate",             horizon: "month", category: "trading",  autoType: "winrate",      target: 60,   manual: 0, deadline: "", subtasks: [] },
    { id: 3, label: "Lire 1 livre business", horizon: "month", category: "personal", autoType: "manual",       target: 1,    manual: 0, deadline: "", subtasks: [] },
  ];
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
  const emptyForm = { label: "", horizon: "month", category: "trading", autoType: "pnl_month", target: "", deadline: "" };
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState({}); // { goalId: true }
  const [subtaskInput, setSubtaskInput] = useState({});

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(goals)); } catch {} }, [goals]);

  const compute = (goal) => {
    const tgt = parseFloat(goal.target) || 0;
    let current = 0;
    if (goal.autoType === "manual") {
      current = parseFloat(goal.manual) || 0;
    } else if (goal.autoType === "pnl_week") {
      const { start, end } = weekRange();
      current = tradesInRange(trades, start, end).reduce((s, t) => s + (t.pnl || 0), 0);
    } else if (goal.autoType === "pnl_month") {
      const { start, end } = monthRange();
      current = tradesInRange(trades, start, end).reduce((s, t) => s + (t.pnl || 0), 0);
    } else if (goal.autoType === "pnl_year") {
      const { start, end } = yearRange();
      current = tradesInRange(trades, start, end).reduce((s, t) => s + (t.pnl || 0), 0);
    } else if (goal.autoType === "winrate") {
      const { start, end } = monthRange();
      const list = tradesInRange(trades, start, end);
      const w = list.filter(t => (t.pnl || 0) > 0).length;
      const l = list.filter(t => (t.pnl || 0) < 0).length;
      current = (w + l) > 0 ? (w / (w + l)) * 100 : 0;
    } else if (goal.autoType === "trades_month") {
      const { start, end } = monthRange();
      current = tradesInRange(trades, start, end).length;
    } else if (goal.autoType === "max_dd") {
      const { start, end } = monthRange();
      const list = tradesInRange(trades, start, end).sort((a, b) => new Date(a.date) - new Date(b.date));
      let peak = 0, cum = 0, mdd = 0;
      for (const tr of list) { cum += (tr.pnl || 0); if (cum > peak) peak = cum; if (peak - cum > mdd) mdd = peak - cum; }
      current = mdd;
    }
    const pct = tgt === 0 ? 0 : Math.max(0, Math.min(100, (current / tgt) * 100));
    return { current, target: tgt, pct };
  };

  const unitOf = (goal) => {
    const u = AUTO_TYPES.find(a => a.id === goal.autoType)?.unit || "";
    return u === "$" ? getCurrencySymbol() : u;
  };
  const fmtVal = (v, u) => {
    if (u === "%") return `${Math.round(v)}%`;
    if (u === "") return Math.round(v).toLocaleString("fr-FR");
    return `${u}${Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };
  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (g) => { setForm({ label: g.label, horizon: g.horizon || "month", category: g.category || "trading", autoType: g.autoType || "manual", target: String(g.target), deadline: g.deadline || "" }); setEditingId(g.id); setShowForm(true); };
  const save = () => {
    if (!form.label.trim() || !form.target) return;
    if (editingId) {
      setGoals(prev => prev.map(g => g.id === editingId ? { ...g, label: form.label.trim(), horizon: form.horizon, category: form.category, autoType: form.autoType, target: parseFloat(form.target), deadline: form.deadline } : g));
    } else {
      setGoals(prev => [...prev, { id: Date.now(), label: form.label.trim(), horizon: form.horizon, category: form.category, autoType: form.autoType, target: parseFloat(form.target), deadline: form.deadline, manual: 0, subtasks: [] }]);
    }
    resetForm();
  };
  const remove = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  const addSubtask = (goalId) => {
    const txt = (subtaskInput[goalId] || "").trim();
    if (!txt) return;
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, subtasks: [...(g.subtasks || []), { id: Date.now(), text: txt, done: false }] } : g));
    setSubtaskInput(prev => ({ ...prev, [goalId]: "" }));
  };
  const toggleSub = (goalId, subId) => setGoals(prev => prev.map(g => g.id === goalId ? { ...g, subtasks: g.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s) } : g));
  const removeSub = (goalId, subId) => setGoals(prev => prev.map(g => g.id === goalId ? { ...g, subtasks: g.subtasks.filter(s => s.id !== subId) } : g));
  const adjustManual = (goalId, delta) => setGoals(prev => prev.map(g => g.id === goalId ? { ...g, manual: Math.max(0, (parseFloat(g.manual) || 0) + delta) } : g));

  // Group goals by horizon
  const byHorizon = (hid) => goals.filter(g => (g.horizon || "month") === hid);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Goals Tracker</h1>
        <button onClick={openCreate}
          style={{ marginLeft: "auto", padding: "7px 14px", height: 34, borderRadius: 8, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Nouvel objectif
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {showForm && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <Field label="Nom">
              <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="ex. Atteindre 2000$ ce mois" style={inputStyle()} />
            </Field>
            <Field label="Horizon">
              <select value={form.horizon} onChange={(e) => setForm({ ...form, horizon: e.target.value })} style={inputStyle()}>
                {HORIZONS.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </Field>
            <Field label="Catégorie">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle()}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select value={form.autoType} onChange={(e) => setForm({ ...form, autoType: e.target.value })} style={inputStyle()}>
                {AUTO_TYPES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </Field>
            <Field label="Cible">
              <input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="1000" style={inputStyle()} />
            </Field>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={save} style={{ width: 36, height: 36, borderRadius: 8, background: T.green, border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={14} strokeWidth={2.5} /></button>
              <button onClick={resetForm} style={{ width: 36, height: 36, borderRadius: 8, background: T.white, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={14} strokeWidth={2.5} /></button>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Field label="Deadline (optionnel)">
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} style={{ ...inputStyle(), maxWidth: 200 }} />
            </Field>
          </div>
        </div>
      )}

      {HORIZONS.map(h => {
        const list = byHorizon(h.id);
        if (list.length === 0) return null;
        return (
          <div key={h.id}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{h.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {list.map(g => {
                const cat = CATEGORIES.find(c => c.id === g.category) || CATEGORIES[0];
                const Icon = cat.icon;
                const { current, target, pct } = compute(g);
                const unit = unitOf(g);
                const barColor = g.autoType === "max_dd" ? (current <= target ? T.green : T.red) : (pct >= 100 ? T.green : T.blue);
                const dl = daysLeft(g.deadline);
                const open = !!expanded[g.id];
                return (
                  <div key={g.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: cat.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={12} strokeWidth={1.75} color={cat.color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.label}</div>
                          <div style={{ fontSize: 10, color: T.textMut, fontWeight: 500, marginTop: 2 }}>
                            {AUTO_TYPES.find(a => a.id === g.autoType)?.label}
                            {dl !== null && <span style={{ marginLeft: 8, color: dl < 0 ? T.red : dl <= 3 ? T.amber : T.textMut }}>
                              · {dl < 0 ? `${Math.abs(dl)}j dépassée` : dl === 0 ? "aujourd'hui" : `${dl}j restants`}
                            </span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => openEdit(g)} style={miniBtn()} title="Modifier"><Pencil size={11} strokeWidth={1.75} /></button>
                        <button onClick={() => remove(g.id)} style={{ ...miniBtn(), color: T.red }} title="Supprimer"><Trash2 size={11} strokeWidth={1.75} /></button>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{fmtVal(current, unit)}</div>
                        <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500 }}>/ {fmtVal(target, unit)}</div>
                      </div>
                      <div style={{ height: 6, background: T.accentBg, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width .4s ease" }} />
                      </div>
                      <div style={{ fontSize: 10, color: T.textMut, fontWeight: 500, marginTop: 4, textAlign: "right" }}>{Math.round(pct)}% {g.autoType === "max_dd" ? "du plafond" : "atteint"}</div>
                    </div>

                    {g.autoType === "manual" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <button onClick={() => adjustManual(g.id, -1)} style={chipBtn()}>−1</button>
                        <button onClick={() => adjustManual(g.id, 1)} style={chipBtn()}>+1</button>
                      </div>
                    )}

                    {/* Sub-tasks */}
                    <button onClick={() => setExpanded(p => ({ ...p, [g.id]: !p[g.id] }))}
                      style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: T.textSub, fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Sous-tâches ({(g.subtasks || []).filter(s => s.done).length}/{(g.subtasks || []).length})
                    </button>
                    {open && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        {(g.subtasks || []).map(s => (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => toggleSub(g.id, s.id)}
                              style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${s.done ? T.green : T.border}`, background: s.done ? T.green : T.white, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {s.done && <Check size={9} strokeWidth={2.5} color="#fff" />}
                            </button>
                            <div style={{ flex: 1, fontSize: 12, color: s.done ? T.textMut : T.text, textDecoration: s.done ? "line-through" : "none" }}>{s.text}</div>
                            <button onClick={() => removeSub(g.id, s.id)} style={{ background: "transparent", border: "none", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center" }}><Trash2 size={10} strokeWidth={1.75} /></button>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                          <input
                            type="text" value={subtaskInput[g.id] || ""}
                            onChange={(e) => setSubtaskInput(p => ({ ...p, [g.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") addSubtask(g.id); }}
                            placeholder="Ajouter une sous-tâche..."
                            style={{ flex: 1, padding: "6px 8px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }}
                          />
                          <button onClick={() => addSubtask(g.id)} style={{ padding: "0 8px", height: 24, background: T.text, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                            <Plus size={10} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {goals.length === 0 && (
        <div style={{ background: T.white, border: `1px dashed ${T.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: T.accentBg, marginBottom: 12 }}>
            <Target size={20} strokeWidth={1.75} color={T.textSub} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Aucun objectif défini</div>
          <div style={{ fontSize: 12, color: T.textSub }}>Ajoute un objectif pour suivre ta progression</div>
        </div>
      )}
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
function miniBtn() {
  return { width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
}
function chipBtn() {
  return { padding: "4px 10px", borderRadius: 999, border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" };
}
