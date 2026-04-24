"use client";

import React, { useEffect, useState } from "react";
import { Plus, Check, Trash2, CircleDashed, ListTodo } from "lucide-react";
import { t, useLang } from "@/lib/i18n";

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
  amber: "#F59E0B",
};

const STORAGE_KEY = "tr4de_tasks";

const PRIORITIES = [
  { id: "low",    label: "Basse",  color: "#8E8E8E" },
  { id: "normal", label: "Normale", color: "#3B82F6" },
  { id: "high",   label: "Haute",  color: "#F59E0B" },
  { id: "urgent", label: "Urgente", color: "#EF4444" },
];

export default function TasksPage() {
  useLang();
  const [tasks, setTasks] = useState(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("normal");
  const [filter, setFilter] = useState("all"); // all | open | done

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    setTasks(prev => [
      { id: Date.now() + Math.random(), text, priority, done: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setInput("");
    setPriority("normal");
  };

  const toggleTask = (id) => setTasks(prev => prev.map(t2 => t2.id === id ? { ...t2, done: !t2.done } : t2));
  const removeTask = (id) => setTasks(prev => prev.filter(t2 => t2.id !== id));

  const shown = tasks.filter(t2 =>
    filter === "all" ? true : filter === "open" ? !t2.done : t2.done
  );
  const openCount = tasks.filter(t2 => !t2.done).length;
  const doneCount = tasks.filter(t2 => t2.done).length;

  const FilterBtn = ({ id, label, count }) => (
    <button
      onClick={() => setFilter(id)}
      style={{
        padding: "6px 12px", borderRadius: 999,
        border: `1px solid ${filter === id ? T.text : T.border}`,
        background: filter === id ? T.text : T.white,
        color: filter === id ? T.white : T.text,
        fontSize: 12, fontWeight: 500, cursor: "pointer",
        fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {label}
      <span style={{
        padding: "0 6px", borderRadius: 999, fontSize: 10,
        background: filter === id ? "rgba(255,255,255,0.18)" : T.accentBg,
        color: filter === id ? T.white : T.textSub,
      }}>{count}</span>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>
          Tâches
        </h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>

      {/* Add task card */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
          placeholder="Ajouter une tâche (entrée pour valider)"
          style={{
            flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8,
            fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = T.text; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = T.border; }}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{
            padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8,
            fontSize: 12, outline: "none", fontFamily: "inherit", color: T.text, background: T.white,
          }}
        >
          {PRIORITIES.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <button
          onClick={addTask}
          style={{
            padding: "8px 14px", height: 36, borderRadius: 8, background: T.text, border: `1px solid ${T.text}`,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <Plus size={14} strokeWidth={2} /> Ajouter
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8 }}>
        <FilterBtn id="all" label="Toutes" count={tasks.length} />
        <FilterBtn id="open" label="En cours" count={openCount} />
        <FilterBtn id="done" label="Terminées" count={doneCount} />
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div style={{ background: T.white, border: `1px dashed ${T.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: T.accentBg, marginBottom: 12 }}>
            <ListTodo size={20} strokeWidth={1.75} color={T.textSub} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Aucune tâche pour le moment</div>
          <div style={{ fontSize: 12, color: T.textSub }}>Ajoute-en une au-dessus pour commencer</div>
        </div>
      ) : (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          {shown.map((task, i) => {
            const pr = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1];
            return (
              <div
                key={task.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  borderBottom: i < shown.length - 1 ? `1px solid ${T.border}` : "none",
                  background: task.done ? "rgba(16,163,127,0.04)" : "transparent",
                  transition: "background .12s ease",
                }}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  title={task.done ? "Marquer non faite" : "Marquer faite"}
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `1.5px solid ${task.done ? T.green : T.border}`,
                    background: task.done ? T.green : T.white,
                    cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all .15s ease",
                  }}
                >
                  {task.done && <Check size={13} strokeWidth={2.5} color="#fff" />}
                </button>
                <div style={{
                  fontSize: 13, color: task.done ? T.textMut : T.text,
                  textDecoration: task.done ? "line-through" : "none",
                  flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {task.text}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: pr.color, background: pr.color + "18",
                  padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4,
                  flexShrink: 0,
                }}>{pr.label}</span>
                <button
                  onClick={() => removeTask(task.id)}
                  title="Supprimer"
                  style={{
                    width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: "none", color: T.textMut, cursor: "pointer", borderRadius: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
