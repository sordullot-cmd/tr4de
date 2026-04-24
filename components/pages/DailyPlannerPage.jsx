"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Sun, TrendingUp, CloudSun, Moon, Plus, Check, Trash2,
  Battery, Flame, ListTodo, Target as TargetIcon,
} from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  bg: "#F5F5F5",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

// Stockage : daily planner (par jour), habits (partagées), tasks (partagées)
const STORAGE_PLANNER = "tr4de_daily_planner";
const STORAGE_HABITS = "tr4de_habits";
const STORAGE_HABITS_HISTORY = "tr4de_habits_history";
const STORAGE_TASKS = "tr4de_tasks";

const BLOCKS = [
  { id: "morning",  label: "Matin",             icon: Sun,        color: "#F59E0B", bg: "#FFF7ED" },
  { id: "trading",  label: "Session de trading", icon: TrendingUp, color: "#10A37F", bg: "#ECFDF5" },
  { id: "afternoon", label: "Après-midi",       icon: CloudSun,   color: "#3B82F6", bg: "#EFF6FF" },
  { id: "evening",  label: "Soir",              icon: Moon,       color: "#6366F1", bg: "#EEF2FF" },
];
const TASK_PRIORITIES = [
  { id: "low",    label: "Basse",  color: "#8E8E8E" },
  { id: "normal", label: "Normale", color: "#3B82F6" },
  { id: "high",   label: "Haute",  color: "#F59E0B" },
  { id: "urgent", label: "Urgente", color: "#EF4444" },
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

const defaultHabits = () => ([
  { id: 1, name: "sommeil 8h" },
  { id: 2, name: "méditation" },
  { id: 3, name: "sport" },
]);

export default function DailyPlannerPage() {
  const [dateKey, setDateKey] = useState(() => todayKey());

  // --- Daily planner (blocks, goals, priorities, energy) ---
  const [plannerStore, setPlannerStore] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_PLANNER) || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_PLANNER, JSON.stringify(plannerStore)); } catch {} }, [plannerStore]);
  const day = plannerStore[dateKey] || { blocks: {}, goals: [], priorities: [], energy: 7 };
  const updateDay = (patch) => setPlannerStore(prev => ({ ...prev, [dateKey]: { ...day, ...patch } }));
  const setBlockText = (blockId, text) => updateDay({ blocks: { ...day.blocks, [blockId]: text } });

  // --- Tasks (simple list, no date) ---
  const [tasks, setTasks] = useState(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_TASKS) || "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks)); } catch {} }, [tasks]);

  // --- Habits ---
  const [habits, setHabits] = useState(() => {
    if (typeof window === "undefined") return defaultHabits();
    try { const s = JSON.parse(localStorage.getItem(STORAGE_HABITS) || "null"); return Array.isArray(s) && s.length ? s : defaultHabits(); }
    catch { return defaultHabits(); }
  });
  const [habitHistory, setHabitHistory] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_HABITS_HISTORY) || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_HABITS, JSON.stringify(habits)); } catch {} }, [habits]);
  useEffect(() => { try { localStorage.setItem(STORAGE_HABITS_HISTORY, JSON.stringify(habitHistory)); } catch {} }, [habitHistory]);

  const toggleHabit = (habitId) => {
    setHabitHistory(prev => {
      const h = { ...(prev[habitId] || {}) };
      if (h[dateKey]) delete h[dateKey]; else h[dateKey] = true;
      return { ...prev, [habitId]: h };
    });
  };
  const computeStreak = (habitId) => {
    const hh = habitHistory[habitId] || {};
    let streak = 0;
    const cursor = new Date(dateKey + "T00:00:00");
    while (true) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (hh[iso]) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
    }
    return streak;
  };

  // --- Inline inputs ---
  const [newGoal, setNewGoal] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newTask, setNewTask] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [newHabitName, setNewHabitName] = useState("");
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [taskFilter, setTaskFilter] = useState("open"); // all | open | done

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

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(prev => [
      { id: Date.now() + Math.random(), text: newTask.trim(), priority: taskPriority, done: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setNewTask(""); setTaskPriority("normal");
  };
  const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const addHabit = () => {
    const name = newHabitName.trim();
    if (!name) return;
    setHabits(prev => [...prev, { id: Date.now(), name }]);
    setNewHabitName(""); setShowHabitForm(false);
  };
  const removeHabit = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setHabitHistory(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const shiftDay = (delta) => {
    const d = new Date(dateKey + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDateKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  const energyColor = day.energy >= 8 ? T.green : day.energy >= 5 ? T.amber : T.red;
  const shownTasks = tasks.filter(t => taskFilter === "all" ? true : taskFilter === "open" ? !t.done : t.done);
  const openCount = tasks.filter(t => !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Ma journée</h1>
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

      {/* Habitudes du jour : row minimaliste */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Habitudes du jour</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {showHabitForm ? (
              <>
                <input type="text" autoFocus value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addHabit(); if (e.key === "Escape") { setShowHabitForm(false); setNewHabitName(""); } }}
                  placeholder="ex. lire 20 min"
                  style={{ padding: "4px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "inherit", color: T.text, background: T.white, width: 180 }} />
                <button onClick={addHabit} style={{ padding: "0 10px", height: 28, background: T.text, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>OK</button>
              </>
            ) : (
              <button onClick={() => setShowHabitForm(true)}
                style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={12} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
        {habits.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textMut, padding: "8px 0" }}>Aucune habitude pour le moment</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {habits.map(h => {
              const done = !!(habitHistory[h.id] && habitHistory[h.id][dateKey]);
              const streak = computeStreak(h.id);
              return (
                <div key={h.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.bg, borderRadius: 999, padding: "4px 6px 4px 4px" }}>
                  <button onClick={() => toggleHabit(h.id)}
                    title={done ? "Décocher" : "Marquer fait"}
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: done ? T.text : T.white,
                      color: done ? "#fff" : T.text,
                      border: done ? "none" : `1px solid ${T.border}`,
                      cursor: "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      transition: "background .15s ease",
                    }}>
                    {done && <Check size={13} strokeWidth={2.5} />}
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{h.name}</span>
                  {streak >= 2 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: "#F59E0B", fontSize: 11, fontWeight: 700 }}>
                      <Flame size={10} strokeWidth={2} />{streak}
                    </span>
                  )}
                  <button onClick={() => removeHabit(h.id)} title="Supprimer"
                    style={{ width: 18, height: 18, background: "transparent", border: "none", color: T.textMut, cursor: "pointer", borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", marginRight: 4 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; }}
                  >
                    <Trash2 size={10} strokeWidth={1.75} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
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

        {/* Right : energy, priorities, goals, tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Energy */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Battery size={14} strokeWidth={1.75} color={T.textSub} />
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Énergie estimée</div>
              <div style={{ marginLeft: "auto", fontSize: 16, fontWeight: 700, color: energyColor }}>{day.energy}/10</div>
            </div>
            <input type="range" min={1} max={10} step={1} value={day.energy}
              onChange={(e) => updateDay({ energy: parseInt(e.target.value, 10) })}
              style={{ width: "100%", accentColor: energyColor }} />
          </div>

          {/* 3 priorités */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <TargetIcon size={13} strokeWidth={1.75} color={T.amber} />
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                3 priorités du jour <span style={{ color: T.textMut, fontWeight: 500 }}>({(day.priorities || []).length}/3)</span>
              </div>
            </div>
            {(day.priorities || []).map(p => (
              <Row key={p.id} done={p.done} text={p.text} onToggle={() => togglePriority(p.id)} onDelete={() => removePriority(p.id)} accent={T.amber} />
            ))}
            {(day.priorities || []).length < 3 && (
              <AddInput value={newPriority} onChange={setNewPriority} onAdd={addPriority} placeholder="Ajouter une priorité..." />
            )}
          </div>

          {/* Goals du jour */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>Objectifs du jour</div>
            {(day.goals || []).map(g => (
              <Row key={g.id} done={g.done} text={g.text} onToggle={() => toggleGoal(g.id)} onDelete={() => removeGoal(g.id)} accent={T.green} />
            ))}
            <AddInput value={newGoal} onChange={setNewGoal} onAdd={addGoal} placeholder="Ajouter un objectif..." />
          </div>

          {/* Tâches (long terme) */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <ListTodo size={13} strokeWidth={1.75} color={T.blue} />
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Tâches</div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {[{ id: "open", label: openCount }, { id: "done", label: doneCount }, { id: "all", label: tasks.length }].map(f => (
                  <button key={f.id} onClick={() => setTaskFilter(f.id)}
                    style={{
                      padding: "2px 8px", borderRadius: 999,
                      border: `1px solid ${taskFilter === f.id ? T.text : T.border}`,
                      background: taskFilter === f.id ? T.text : T.white,
                      color: taskFilter === f.id ? T.white : T.textSub,
                      fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}>
                    {f.id === "open" ? "Ouvertes" : f.id === "done" ? "Faites" : "Toutes"} · {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                placeholder="Nouvelle tâche..."
                style={{ flex: 1, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
              <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}
                style={{ padding: "6px 8px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }}>
                {TASK_PRIORITIES.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
              </select>
              <button onClick={addTask} style={{ padding: "0 10px", height: 28, background: T.text, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={12} strokeWidth={2.5} />
              </button>
            </div>
            {shownTasks.length === 0 ? (
              <div style={{ padding: "10px 0", fontSize: 12, color: T.textMut, textAlign: "center" }}>Rien pour l&apos;instant</div>
            ) : shownTasks.slice(0, 8).map(task => {
              const pr = TASK_PRIORITIES.find(p => p.id === task.priority) || TASK_PRIORITIES[1];
              return (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <button onClick={() => toggleTask(task.id)}
                    style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${task.done ? T.green : T.border}`, background: task.done ? T.green : T.white, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {task.done && <Check size={10} strokeWidth={2.5} color="#fff" />}
                  </button>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: pr.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: task.done ? T.textMut : T.text, textDecoration: task.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.text}</div>
                  <button onClick={() => removeTask(task.id)}
                    style={{ width: 18, height: 18, background: "transparent", border: "none", color: T.textMut, cursor: "pointer", borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={10} strokeWidth={1.75} />
                  </button>
                </div>
              );
            })}
            {shownTasks.length > 8 && (
              <div style={{ fontSize: 11, color: T.textMut, textAlign: "center", marginTop: 6 }}>+ {shownTasks.length - 8} autres</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function iconBtn() {
  return { width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.white, color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
}
function Row({ done, text, onToggle, onDelete, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <button onClick={onToggle}
        style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${done ? accent : T.border}`, background: done ? accent : T.white, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
        placeholder={placeholder}
        style={{ flex: 1, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
      <button onClick={onAdd} style={{ padding: "0 10px", height: 28, background: T.text, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
