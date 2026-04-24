"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Battery, AlertCircle, Trophy, Target as TargetIcon } from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B", purple: "#A855F7",
};

const STORAGE_KEY = "tr4de_weekly_reviews";

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return d;
}
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const formatWeekLabel = (monday) => {
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
  const sameMonth = monday.getMonth() === sun.getMonth();
  if (sameMonth) return `${monday.getDate()} – ${sun.getDate()} ${sun.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
  return `${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
};

const SECTIONS = [
  { id: "wins",         label: "Ce qui a bien marché",     icon: ThumbsUp,    color: T.green, placeholder: "Victoires (trading et perso)..." },
  { id: "losses",       label: "Ce qui n'a pas marché",    icon: ThumbsDown,  color: T.red,   placeholder: "Difficultés, erreurs..." },
  { id: "distractions", label: "Distractions principales",  icon: AlertCircle, color: T.amber, placeholder: "Ce qui m'a fait perdre du temps..." },
  { id: "nonFinancial", label: "Victoires non-financières", icon: Trophy,      color: T.purple, placeholder: "Santé, relations, apprentissages..." },
];

export default function WeeklyReviewPage() {
  const [weekStart, setWeekStart] = useState(() => isoDay(mondayOf(new Date())));
  const [store, setStore] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {} }, [store]);

  const week = store[weekStart] || { sections: {}, energy: 7, priorities: ["", "", ""] };
  const updateWeek = (patch) => setStore(prev => ({ ...prev, [weekStart]: { ...week, ...patch } }));
  const setSection = (id, text) => updateWeek({ sections: { ...week.sections, [id]: text } });
  const setPriority = (i, text) => {
    const next = [...(week.priorities || ["", "", ""])];
    next[i] = text;
    updateWeek({ priorities: next });
  };

  const shiftWeek = (delta) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(isoDay(mondayOf(d)));
  };

  const monday = new Date(weekStart + "T00:00:00");
  const energyColor = week.energy >= 8 ? T.green : week.energy >= 5 ? T.amber : T.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Weekly Review</h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>

      {/* Week nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px" }}>
        <button onClick={() => shiftWeek(-1)} style={iconBtn()}><ChevronLeft size={16} /></button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Semaine du {formatWeekLabel(monday)}</div>
          {weekStart !== isoDay(mondayOf(new Date())) && (
            <button onClick={() => setWeekStart(isoDay(mondayOf(new Date())))} style={{ marginTop: 4, fontSize: 11, color: T.blue, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Semaine courante</button>
          )}
        </div>
        <button onClick={() => shiftWeek(1)} style={iconBtn()}><ChevronRight size={16} /></button>
      </div>

      {/* 4 sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} strokeWidth={1.75} color={s.color} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{s.label}</div>
              </div>
              <textarea
                value={week.sections[s.id] || ""}
                onChange={(e) => setSection(s.id, e.target.value)}
                placeholder={s.placeholder}
                style={{ minHeight: 110, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: T.text, resize: "vertical", padding: 0, lineHeight: 1.5 }}
              />
            </div>
          );
        })}
      </div>

      {/* Energy & 3 priorities for next week */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Battery size={14} strokeWidth={1.75} color={T.textSub} />
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Énergie de la semaine</div>
            <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: energyColor }}>{week.energy}/10</div>
          </div>
          <input type="range" min={1} max={10} step={1} value={week.energy}
            onChange={(e) => updateWeek({ energy: parseInt(e.target.value, 10) })}
            style={{ width: "100%", accentColor: energyColor }} />
        </div>

        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TargetIcon size={14} strokeWidth={1.75} color={T.textSub} />
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>3 priorités de la semaine prochaine</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.accentBg, color: T.textSub, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <input type="text" value={(week.priorities || ["", "", ""])[i] || ""} onChange={(e) => setPriority(i, e.target.value)}
                  placeholder={`Priorité ${i + 1}...`}
                  style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function iconBtn() {
  return { width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.white, color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
}
