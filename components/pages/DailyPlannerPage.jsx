"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sun, TrendingUp, CloudSun, Moon, Plus, Check, Trash2, Battery } from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const STORAGE_KEY = "tr4de_daily_planner";

const BLOCKS = [
  { id: "morning",  label: "Matin",            icon: Sun,      color: "#F59E0B", bg: "#FFF7ED" },
  { id: "trading",  label: "Session de trading", icon: TrendingUp, color: "#10A37F", bg: "#ECFDF5" },
  { id: "afternoon", label: "Après-midi",      icon: CloudSun, color: "#3B82F6", bg: "#EFF6FF" },
  { id: "evening",  label: "Soir",             icon: Moon,     color: "#6366F1", bg: "#EEF2FF" },
];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDateLong = (iso) => {
  const d = new Date(iso + "T00:00:00");
  const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function DailyPlannerPage() {
  const [dateKey, setDateKey] = useState(() => todayKey());
  const [store, setStore] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {} }, [store]);

  const day = store[dateKey] || { blocks: {}, goals: [], priorities: [], energy: 7 };
  const updateDay = (patch) => setStore(prev => ({ ...prev, [dateKey]: { ...day, ...patch } }));

  const setBlockText = (blockId, text) => updateDay({ blocks: { ...day.blocks, [blockId]: text } });
  const [newGoal, setNewGoal] = useState("");
  const [newPriority, setNewPriority] = useState("");

  const addGoal = () => {
    if (!newGoal.trim()) return;
    updateDay({ goals: [...(day.goals || []), { id: Date.now(), text: newGoal.trim(), done: false }] });
    setNewGoal("");
  };
  const toggleGoal = (id) => updateDay({ goals: day.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) });
  const removeGoal = (id) => updateDay({ goals: day.goals.filter(g => g.id !== id) });
  const addPriority = () => {
    if (!newPriority.trim()) return;
    if ((day.priorities || []).length >= 3) return;
    updateDay({ priorities: [...(day.priorities || []), { id: Date.now(), text: newPriority.trim(), done: false }] });
    setNewPriority("");
  };
  const togglePriority = (id) => updateDay({ priorities: day.priorities.map(p => p.id === id ? { ...p, done: !p.done } : p) });
  const removePriority = (id) => updateDay({ priorities: day.priorities.filter(p => p.id !== id) });

  const shiftDay = (delta) => {
    const d = new Date(dateKey + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDateKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  const energyColor = day.energy >= 8 ? T.green : day.energy >= 5 ? T.amber : T.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Daily Planner</h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>

      {/* Date nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px" }}>
        <button onClick={() => shiftDay(-1)} style={iconBtn()}><ChevronLeft size={16} /></button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{fmtDateLong(dateKey)}</div>
          {dateKey !== todayKey() && (
            <button onClick={() => setDateKey(todayKey())}
              style={{ marginTop: 4, fontSize: 11, color: T.blue, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Revenir à aujourd&apos;hui
            </button>
          )}
        </div>
        <button onClick={() => shiftDay(1)} style={iconBtn()}><ChevronRight size={16} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* Left : time blocks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {BLOCKS.map(b => {
            const Icon = b.icon;
            return (
              <div key={b.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: b.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={1.75} color={b.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>{b.label}</div>
                  <textarea
                    value={day.blocks[b.id] || ""}
                    onChange={(e) => setBlockText(b.id, e.target.value)}
                    placeholder="Qu'est-ce que tu fais sur ce créneau ?"
                    style={{
                      width: "100%", minHeight: 48, resize: "vertical",
                      border: "none", outline: "none", background: "transparent",
                      fontFamily: "inherit", fontSize: 13, color: T.text, lineHeight: 1.5, padding: 0,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right : goals, priorities, energy */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Energy */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Battery size={14} strokeWidth={1.75} color={T.textSub} />
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Énergie estimée</div>
              <div style={{ marginLeft: "auto", fontSize: 16, fontWeight: 700, color: energyColor }}>{day.energy}/10</div>
            </div>
            <input
              type="range" min={1} max={10} step={1}
              value={day.energy} onChange={(e) => updateDay({ energy: parseInt(e.target.value, 10) })}
              style={{ width: "100%", accentColor: energyColor }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textMut, marginTop: 2 }}>
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>

          {/* Priorities (max 3) */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>
              3 priorités du jour <span style={{ color: T.textMut, fontWeight: 500 }}>({(day.priorities || []).length}/3)</span>
            </div>
            {(day.priorities || []).map(p => (
              <Row key={p.id} done={p.done} text={p.text} onToggle={() => togglePriority(p.id)} onDelete={() => removePriority(p.id)} accent={T.amber} />
            ))}
            {(day.priorities || []).length < 3 && (
              <AddInput value={newPriority} onChange={setNewPriority} onAdd={addPriority} placeholder="Ajouter une priorité..." />
            )}
          </div>

          {/* Goals */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>Objectifs du jour</div>
            {(day.goals || []).map(g => (
              <Row key={g.id} done={g.done} text={g.text} onToggle={() => toggleGoal(g.id)} onDelete={() => removeGoal(g.id)} accent={T.green} />
            ))}
            <AddInput value={newGoal} onChange={setNewGoal} onAdd={addGoal} placeholder="Ajouter un objectif..." />
          </div>
        </div>
      </div>
    </div>
  );
}

function iconBtn() {
  return {
    width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.white,
    color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
}

function Row({ done, text, onToggle, onDelete, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <button onClick={onToggle}
        style={{
          width: 18, height: 18, borderRadius: 4,
          border: `1.5px solid ${done ? accent : T.border}`,
          background: done ? accent : T.white,
          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
        {done && <Check size={11} strokeWidth={2.5} color="#fff" />}
      </button>
      <div style={{ flex: 1, fontSize: 13, color: done ? T.textMut : T.text, textDecoration: done ? "line-through" : "none" }}>{text}</div>
      <button onClick={onDelete} style={{ width: 22, height: 22, background: "transparent", border: "none", color: T.textMut, cursor: "pointer", borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Trash2 size={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function AddInput({ value, onChange, onAdd, placeholder }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
        placeholder={placeholder}
        style={{ flex: 1, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }}
      />
      <button onClick={onAdd} style={{ padding: "0 10px", height: 28, background: T.text, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
