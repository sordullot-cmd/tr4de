"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, PiggyBank, Target as TargetIcon, Plus, Trash2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/userPrefs";
import { useTrades } from "@/lib/hooks/useTradeData";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B", purple: "#A855F7",
};

const STORAGE_KEY = "tr4de_financial";

function defaultState() {
  return {
    annualGoal: 50000,
    incomes:  [],  // { id, label, amount }
    expenses: [],  // { id, label, amount, category }
    savings:  0,
  };
}

function Field({ label, children }) { return (<div><label style={{ display: "block", fontSize: 10, color: T.textMut, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>{children}</div>); }
function inputStyle() { return { width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }; }

export default function FinancialDashboardPage() {
  const tradesHook = useTrades();
  const trades = tradesHook?.trades || [];

  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return defaultState();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || defaultState(); } catch { return defaultState(); }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }, [state]);

  const [incomeForm, setIncomeForm] = useState({ label: "", amount: "" });
  const [expenseForm, setExpenseForm] = useState({ label: "", amount: "", category: "Fixe" });

  const currency = getCurrencySymbol();
  const fmt = (n) => `${currency}${Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  // Trading P&L this year
  const tradingYearPnL = useMemo(() => {
    const year = new Date().getFullYear();
    return trades.filter(t => {
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d.getFullYear() === year;
    }).reduce((s, t) => s + (t.pnl || 0), 0);
  }, [trades]);

  const totalIncome = (state.incomes || []).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  const totalExpenses = (state.expenses || []).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  const netMonthly = totalIncome - totalExpenses;
  const totalEarned = tradingYearPnL + totalIncome * 12; // approximation année
  const pctToGoal = state.annualGoal > 0 ? Math.max(0, Math.min(100, (totalEarned / state.annualGoal) * 100)) : 0;

  const addIncome = () => {
    const amt = parseFloat(incomeForm.amount);
    if (!incomeForm.label.trim() || !amt) return;
    setState(prev => ({ ...prev, incomes: [...(prev.incomes || []), { id: Date.now(), label: incomeForm.label.trim(), amount: amt }] }));
    setIncomeForm({ label: "", amount: "" });
  };
  const addExpense = () => {
    const amt = parseFloat(expenseForm.amount);
    if (!expenseForm.label.trim() || !amt) return;
    setState(prev => ({ ...prev, expenses: [...(prev.expenses || []), { id: Date.now(), label: expenseForm.label.trim(), amount: amt, category: expenseForm.category }] }));
    setExpenseForm({ label: "", amount: "", category: "Fixe" });
  };
  const removeIncome = (id) => setState(prev => ({ ...prev, incomes: prev.incomes.filter(x => x.id !== id) }));
  const removeExpense = (id) => setState(prev => ({ ...prev, expenses: prev.expenses.filter(x => x.id !== id) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Tableau financier</h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Kpi icon={TrendingUp}   label="P&L Trading (année)"   value={fmt(tradingYearPnL)}  color={tradingYearPnL >= 0 ? T.green : T.red} />
        <Kpi icon={PiggyBank}    label="Revenus (mensuel)"     value={fmt(totalIncome)}     color={T.blue} />
        <Kpi icon={TrendingDown} label="Dépenses (mensuel)"    value={fmt(totalExpenses)}   color={T.red} />
        <Kpi icon={TargetIcon}   label={netMonthly >= 0 ? "Solde net" : "Déficit"}   value={`${netMonthly >= 0 ? "+" : "-"}${fmt(netMonthly)}`}   color={netMonthly >= 0 ? T.green : T.red} />
      </div>

      {/* Goal */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10, gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Objectif financier annuel</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 4 }}>
              {fmt(totalEarned)} <span style={{ fontSize: 13, color: T.textMut, fontWeight: 500 }}>/ {fmt(state.annualGoal)}</span>
            </div>
            <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginTop: 2 }}>P&L trading + revenus × 12</div>
          </div>
          <div style={{ minWidth: 180 }}>
            <label style={{ display: "block", fontSize: 10, color: T.textMut, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>Modifier l&apos;objectif</label>
            <input type="number" value={state.annualGoal} onChange={(e) => setState(p => ({ ...p, annualGoal: parseFloat(e.target.value) || 0 }))} style={inputStyle()} />
          </div>
        </div>
        <div style={{ height: 8, background: T.accentBg, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pctToGoal}%`, background: pctToGoal >= 100 ? T.green : T.blue, borderRadius: 4, transition: "width .6s ease" }} />
        </div>
        <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginTop: 4, textAlign: "right" }}>{Math.round(pctToGoal)}% de l&apos;objectif atteint</div>
      </div>

      {/* Incomes + expenses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <PiggyBank size={14} strokeWidth={1.75} color={T.blue} />
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Revenus</div>
            <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: T.blue }}>{fmt(totalIncome)}</div>
          </div>
          {(state.incomes || []).map((x, i) => (
            <Row key={x.id} label={x.label} amount={fmt(x.amount)} color={T.blue} onDelete={() => removeIncome(x.id)} last={i === state.incomes.length - 1} />
          ))}
          <div style={{ padding: 10, display: "flex", gap: 6, borderTop: `1px solid ${T.border}` }}>
            <input type="text" value={incomeForm.label} onChange={(e) => setIncomeForm({ ...incomeForm, label: e.target.value })} placeholder="Source" style={{ ...inputStyle(), flex: 2 }} />
            <input type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} placeholder="Montant" style={{ ...inputStyle(), flex: 1 }} />
            <button onClick={addIncome} style={{ padding: "0 12px", height: 36, background: T.blue, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}><Plus size={14} strokeWidth={2.5} /></button>
          </div>
        </div>

        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingDown size={14} strokeWidth={1.75} color={T.red} />
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Dépenses</div>
            <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: T.red }}>{fmt(totalExpenses)}</div>
          </div>
          {(state.expenses || []).map((x, i) => (
            <Row key={x.id} label={`${x.label} · ${x.category}`} amount={fmt(x.amount)} color={T.red} onDelete={() => removeExpense(x.id)} last={i === state.expenses.length - 1} />
          ))}
          <div style={{ padding: 10, display: "flex", gap: 6, borderTop: `1px solid ${T.border}` }}>
            <input type="text" value={expenseForm.label} onChange={(e) => setExpenseForm({ ...expenseForm, label: e.target.value })} placeholder="Libellé" style={{ ...inputStyle(), flex: 2 }} />
            <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} style={{ ...inputStyle(), flex: 1 }}>
              <option>Fixe</option><option>Variable</option><option>Loisir</option><option>Investissement</option>
            </select>
            <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="Montant" style={{ ...inputStyle(), flex: 1 }} />
            <button onClick={addExpense} style={{ padding: "0 12px", height: 36, background: T.red, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}><Plus size={14} strokeWidth={2.5} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
function Kpi({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
        <Icon size={12} strokeWidth={1.75} /> {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: -0.3, lineHeight: 1 }}>{value}</div>
    </div>
  );
}
function Row({ label, amount, color, onDelete, last }) {
  return (
    <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: last ? "none" : `1px solid ${T.border}` }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{amount}</div>
      <button onClick={onDelete} style={{ background: "transparent", border: "none", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", padding: 4 }}><Trash2 size={12} strokeWidth={1.75} /></button>
    </div>
  );
}
