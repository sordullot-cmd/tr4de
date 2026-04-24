"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Flame, TrendingUp, Heart } from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const STORAGE_KEY = "tr4de_habits";
const HISTORY_KEY = "tr4de_habits_history"; // { [habitId]: { [YYYY-MM-DD]: true } }

const CATEGORIES = [
  { id: "trading", label: "Trading",  icon: TrendingUp, color: "#10A37F" },
  { id: "life",    label: "Vie",      icon: Heart,      color: "#EF4444" },
];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const defaultHabits = () => ([
  { id: 1, name: "Journaliser mes trades", category: "trading" },
  { id: 2, name: "Revue de marché matinale", category: "trading" },
  { id: 3, name: "Sport 30min", category: "life" },
  { id: 4, name: "Méditation / respiration", category: "life" },
  { id: 5, name: "Sommeil > 7h", category: "life" },
]);

export default function HabitsPage() {
  const [habits, setHabits] = useState(() => {
    if (typeof window === "undefined") return defaultHabits();
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return Array.isArray(s) && s.length ? s : defaultHabits();
    } catch { return defaultHabits(); }
  });
  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}"); } catch { return {}; }
  });
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("trading");

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(habits)); } catch {} }, [habits]);
  useEffect(() => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {} }, [history]);

  // Derive last 14 days columns
  const days = useMemo(() => {
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        day: d.getDate(),
        weekday: d.toLocaleDateString("fr-FR", { weekday: "narrow" }).toUpperCase(),
        isToday: i === 0,
      });
    }
    return arr;
  }, []);

  const toggle = (habitId, iso) => {
    setHistory(prev => {
      const h = { ...(prev[habitId] || {}) };
      if (h[iso]) delete h[iso]; else h[iso] = true;
      return { ...prev, [habitId]: h };
    });
  };

  const computeStreak = (habitId) => {
    const h = history[habitId] || {};
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (h[iso]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return streak;
  };

  const completion30d = (habitId) => {
    const h = history[habitId] || {};
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (h[iso]) count++;
    }
    return Math.round((count / 30) * 100);
  };

  const addHabit = () => {
    if (!newName.trim()) return;
    setHabits(prev => [...prev, { id: Date.now(), name: newName.trim(), category: newCategory }]);
    setNewName(""); setNewCategory("trading");
  };
  const removeHabit = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setHistory(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Habits Tracker</h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>

      {/* Add form */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addHabit(); }}
          placeholder="Nouvelle habitude..."
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }}
        />
        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
          style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }}>
          {CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
        </select>
        <button onClick={addHabit} style={{ padding: "0 14px", height: 36, background: T.text, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Ajouter
        </button>
      </div>

      {/* Grid header */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: `2fr repeat(14, 1fr) 80px 90px`, gap: 4, padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: "#FAFAFA", alignItems: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4 }}>Habitude</div>
          {days.map(d => (
            <div key={d.iso} title={d.iso} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.textMut, fontWeight: 500 }}>{d.weekday}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: d.isToday ? T.text : T.textSub }}>{d.day}</div>
            </div>
          ))}
          <div style={{ fontSize: 10, fontWeight: 600, color: T.textMut, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4 }}>Streak</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.textMut, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4 }}>30j</div>
        </div>

        {habits.length === 0 ? (
          <div style={{ padding: "32px 14px", textAlign: "center", color: T.textSub, fontSize: 13 }}>
            Ajoute ta première habitude
          </div>
        ) : habits.map((h, idx) => {
          const cat = CATEGORIES.find(c => c.id === h.category) || CATEGORIES[0];
          const streak = computeStreak(h.id);
          const pct = completion30d(h.id);
          return (
            <div key={h.id} style={{ display: "grid", gridTemplateColumns: `2fr repeat(14, 1fr) 80px 90px`, gap: 4, padding: "10px 14px", borderBottom: idx < habits.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{h.name}</div>
                <button onClick={() => removeHabit(h.id)}
                  style={{ width: 20, height: 20, background: "transparent", border: "none", color: T.textMut, cursor: "pointer", borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  title="Supprimer"
                >
                  <Trash2 size={11} strokeWidth={1.75} />
                </button>
              </div>
              {days.map(d => {
                const done = !!(history[h.id] && history[h.id][d.iso]);
                return (
                  <button
                    key={d.iso}
                    onClick={() => toggle(h.id, d.iso)}
                    title={`${d.iso}${done ? " ✓" : ""}`}
                    style={{
                      width: "100%", aspectRatio: "1/1", maxHeight: 22,
                      borderRadius: 4, border: "none", cursor: "pointer",
                      background: done ? cat.color : T.accentBg,
                      opacity: done ? 1 : 0.6,
                      transition: "all .15s ease",
                    }}
                  />
                );
              })}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "center", color: streak > 0 ? T.amber : T.textMut, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {streak > 0 && <Flame size={12} strokeWidth={2} />}
                {streak}
              </div>
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: pct >= 70 ? T.green : pct >= 40 ? T.amber : T.textSub, fontVariantNumeric: "tabular-nums" }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
