"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { useUndo } from "@/lib/contexts/UndoContext";
import { t, useLang } from "@/lib/i18n";
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2,
  Battery, Flame, Clock, MapPin, Target as TargetIcon, X, Pencil,
  StickyNote, ChevronDown,
  // Icônes pour les habitudes
  Dumbbell, BookOpen, Brain, Footprints, Bike, Waves, PenLine, BedDouble, AlarmClock,
  Droplets, Coffee, Apple, Salad, ShoppingCart, GraduationCap, TrendingUp,
  Music, Sparkles as Sparkle, Wallet, Code as CodeIcon, Users, ShowerHead,
  Pill, Dog, Sprout, Wind, Sun, Star, Mic, Utensils, Car,
} from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  bg: "#F5F5F5",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#16A34A", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const STORAGE_PLANNER = "tr4de_daily_planner";
const STORAGE_HABITS = "tr4de_habits";
const STORAGE_HABITS_HISTORY = "tr4de_habits_history";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDateParts = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return {
    weekday: capFirst(d.toLocaleDateString("fr-FR", { weekday: "long" })),
    day: d.getDate(),
    month: capFirst(d.toLocaleDateString("fr-FR", { month: "long" })),
    year: d.getFullYear(),
  };
};

// Auto-icône : devine une icône pertinente à partir du nom de l'habitude.
const ICON_RULES = [
  { re: /(médit|meditat|yoga|pleine conscience|respir|breath)/i, Icon: Brain },
  { re: /(sport|run|jog|fitness|gym|muscu|entr|étirement|etirement|stretch)/i, Icon: Dumbbell },
  { re: /(marche|walk|balade|promenade)/i, Icon: Footprints },
  { re: /(vélo|velo|bike|cycle)/i, Icon: Bike },
  { re: /(nat(a|er)|swim|pisc)/i, Icon: Waves },
  { re: /(lect|livre|read|book)/i, Icon: BookOpen },
  { re: /(journal|écri|ecri|write|blog)/i, Icon: PenLine },
  { re: /(sommeil|dormi|sleep|coucher)/i, Icon: BedDouble },
  { re: /(lever|réveil|reveil|wake)/i, Icon: AlarmClock },
  { re: /(eau|boire|hydra|water)/i, Icon: Droplets },
  { re: /(café|cafe|coffee|thé|the|tea)/i, Icon: Coffee },
  { re: /(diet|régime|regime|nutri)/i, Icon: Utensils },
  { re: /(sain|healthy|légume|legume|salade|manger|food|repas|brocoli|veget)/i, Icon: Salad },
  { re: /(éloquence|eloquence|oratoire|prise de parole|speaking|discours)/i, Icon: Mic },
  { re: /(salle|gym|muscu|musculation)/i, Icon: Dumbbell },
  { re: /(fruit|pomme|apple|banane)/i, Icon: Apple },
  { re: /(market|course|épicerie|epicerie|shopping|groceries)/i, Icon: ShoppingCart },
  { re: /(étude|etude|study|cours|apprend|learn)/i, Icon: GraduationCap },
  { re: /(trading|marché|marche|bourse|chart)/i, Icon: TrendingUp },
  { re: /(musique|guitare|piano|music)/i, Icon: Music },
  { re: /(argent|budget|money|finance)/i, Icon: Wallet },
  // "Code de la route" / permis : icône voiture (priorité sur le match `code` générique).
  { re: /(code de la route|permis|conduite|driving)/i, Icon: Car },
  { re: /(code|dev|program)/i, Icon: CodeIcon },
  { re: /(famille|family|appel|call)/i, Icon: Users },
  { re: /(douche|shower|bain|hygiène|hygiene)/i, Icon: ShowerHead },
  { re: /(vitamin|suppl|complément|complement|médoc|medoc)/i, Icon: Pill },
  { re: /(chien|dog)/i, Icon: Dog },
  { re: /(jardin|plant)/i, Icon: Sprout },
  { re: /(prière|priere|pray|gratitude|mindful)/i, Icon: Sparkle },
  { re: /(soleil|sun|matin)/i, Icon: Sun },
  { re: /(air|vent|wind)/i, Icon: Wind },
];
function autoIcon(name) {
  if (!name) return Star;
  for (const r of ICON_RULES) if (r.re.test(name)) return r.Icon;
  return Star;
}

// Auto-description : si le nom match un thème connu, suggère une description.
const DESC_RULES = [
  { re: /(lect|livre|read|book)/i,                          desc: "Lire 20 minutes" },
  { re: /(journal|écri|ecri|write|blog)/i,                  desc: "Noter pensées et ressentis du jour" },
  { re: /(diet|régime|regime|nutri|sain|healthy|food|repas)/i, desc: "Manger équilibré et respecter les portions" },
  { re: /(salle|gym|muscu|musculation)/i,                   desc: "Séance de musculation (45-60 min)" },
  { re: /(sport|run|jog|fitness|entr)/i,                    desc: "Séance cardio / entraînement" },
  { re: /(éloquence|eloquence|oratoire|prise de parole|speaking|discours)/i, desc: "S'entraîner à parler à voix haute 10 min" },
  { re: /(sommeil|dormi|sleep|coucher)/i,                   desc: "Dormir au moins 7 à 8 heures" },
  { re: /(médit|meditat|yoga|pleine conscience)/i,          desc: "Méditation 10 minutes" },
  { re: /(marche|walk|balade|promenade)/i,                  desc: "Marcher 30 minutes en extérieur" },
  { re: /(vélo|velo|bike|cycle)/i,                          desc: "Sortie vélo" },
  { re: /(nat(a|er)|swim|pisc)/i,                           desc: "Séance de natation" },
  { re: /(eau|boire|hydra|water)/i,                         desc: "Boire 2L d'eau dans la journée" },
  { re: /(café|cafe|coffee)/i,                              desc: "Limiter la caféine" },
  { re: /(étude|etude|study|cours|apprend|learn)/i,         desc: "Session d'étude 45 min" },
  { re: /(trading|marché|marche|bourse|chart)/i,            desc: "Revue de marché & journal de trading" },
  { re: /(musique|guitare|piano|music)/i,                   desc: "Pratique musicale" },
  { re: /(nettoya|clean|rang|ménage|menage)/i,              desc: "Mise en ordre de l'espace" },
  { re: /(argent|budget|money|finance)/i,                   desc: "Revue du budget" },
  { re: /(code de la route|permis|conduite|driving)/i,      desc: "Réviser le code de la route" },
  { re: /(code|dev|program)/i,                              desc: "Session de code dédiée" },
  { re: /(famille|family|appel|call)/i,                     desc: "Appeler un proche" },
  { re: /(étirement|etirement|stretch)/i,                   desc: "Étirements 10 minutes" },
  { re: /(respir|breath)/i,                                 desc: "Exercices de respiration" },
  { re: /(prière|priere|pray|gratitude)/i,                  desc: "Moment de gratitude" },
];
function autoDescription(name) {
  if (!name) return "";
  for (const r of DESC_RULES) if (r.re.test(name)) return r.desc;
  return "";
}

const defaultHabits = () => {
  const mk = (id, name) => ({ id, name, description: autoDescription(name) });
  return [
    mk(1, "Lecture"),
    mk(2, "Journaling"),
    mk(3, "Diet"),
    mk(4, "Salle de sport"),
    mk(5, "Éloquence"),
    mk(6, "Sommeil"),
    mk(7, "Code de la route"),
  ];
};

export default function DailyPlannerPage() {
  useLang();
  const [dateKey, setDateKey] = useState(() => todayKey());

  // Planner (tâches, objectifs, énergie) par jour — synchronisé Supabase
  const [plannerStore, setPlannerStore] = useCloudState(STORAGE_PLANNER, "daily_planner", {});
  const day = plannerStore[dateKey] || { tasks: [], goals: [], energy: 7 };
  const updateDay = (patch) => setPlannerStore(prev => ({ ...prev, [dateKey]: { ...day, ...patch } }));

  // Habits — synchronisées Supabase
  const [habits, setHabits] = useCloudState(STORAGE_HABITS, "habits", defaultHabits());
  const [habitHistory, setHabitHistory] = useCloudState(STORAGE_HABITS_HISTORY, "habits_history", {});
  const { pushUndo } = useUndo();
  const [dragHabitId, setDragHabitId] = useState(null);
  const [dragOverHabitId, setDragOverHabitId] = useState(null);

  const reorderHabit = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setHabits(prev => {
      const arr = [...prev];
      const sIdx = arr.findIndex(h => h.id === sourceId);
      const tIdx = arr.findIndex(h => h.id === targetId);
      if (sIdx < 0 || tIdx < 0) return prev;
      const [moved] = arr.splice(sIdx, 1);
      arr.splice(tIdx, 0, moved);
      return arr;
    });
  };

  const toggleHabit = (habitId) => {
    const snapDate = dateKey;
    setHabitHistory(prev => {
      const h = { ...(prev[habitId] || {}) };
      if (h[snapDate]) delete h[snapDate]; else h[snapDate] = true;
      return { ...prev, [habitId]: h };
    });
    const toggle = () => setHabitHistory(prev => {
      const h = { ...(prev[habitId] || {}) };
      if (h[snapDate]) delete h[snapDate]; else h[snapDate] = true;
      return { ...prev, [habitId]: h };
    });
    pushUndo({ label: "Habitude", undo: async () => toggle(), redo: async () => toggle() });
  };
  const removeHabit = (id) => {
    const snapHabit = habits.find(h => h.id === id);
    const snapHistory = habitHistory[id];
    setHabits(prev => prev.filter(h => h.id !== id));
    setHabitHistory(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (snapHabit) pushUndo({
      label: "Suppression de l'habitude",
      undo: async () => {
        setHabits(prev => [...prev, snapHabit]);
        if (snapHistory) setHabitHistory(prev => ({ ...prev, [id]: snapHistory }));
      },
      redo: async () => {
        setHabits(prev => prev.filter(h => h.id !== id));
        setHabitHistory(prev => { const n = { ...prev }; delete n[id]; return n; });
      },
    });
  };

  // Habit form (add + edit)
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const emptyHabit = { name: "", description: "", time: "", location: "" };
  const [habitDraft, setHabitDraft] = useState(emptyHabit);
  const openCreateHabit = () => { setHabitDraft(emptyHabit); setEditingHabitId(null); setHabitFormOpen(true); };
  const openEditHabit = (h) => { setHabitDraft({ name: h.name, description: h.description || "", time: h.time || "", location: h.location || "" }); setEditingHabitId(h.id); setHabitFormOpen(true); };
  const saveHabit = () => {
    const nm = habitDraft.name.trim();
    if (!nm) return;
    const desc = habitDraft.description.trim() || autoDescription(nm);
    if (editingHabitId) {
      setHabits(prev => prev.map(h => h.id === editingHabitId ? { ...h, name: nm, description: desc, time: habitDraft.time, location: habitDraft.location.trim() } : h));
    } else {
      setHabits(prev => [...prev, { id: Date.now(), name: nm, description: desc, time: habitDraft.time, location: habitDraft.location.trim() }]);
    }
    setHabitFormOpen(false); setHabitDraft(emptyHabit); setEditingHabitId(null);
  };
  const closeHabitForm = () => { setHabitFormOpen(false); setHabitDraft(emptyHabit); setEditingHabitId(null); };

  // Goals (sans limite)
  const [newGoal, setNewGoal] = useState("");
  const addGoal = () => {
    if (!newGoal.trim()) return;
    updateDay({ goals: [...(day.goals || []), { id: Date.now(), text: newGoal.trim(), done: false }] });
    setNewGoal("");
  };
  const toggleGoal = (id) => updateDay({ goals: (day.goals || []).map(g => g.id === id ? { ...g, done: !g.done } : g) });
  const removeGoal = (id) => updateDay({ goals: (day.goals || []).filter(g => g.id !== id) });

  const shiftDay = (delta) => {
    const d = new Date(dateKey + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDateKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  const energyColor = day.energy >= 8 ? T.green : day.energy >= 5 ? T.amber : T.red;

  // --- Tâches du jour ---
  const tasks = day.tasks || [];
  const [newTaskId, setNewTaskId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const addTask = () => {
    const id = Date.now();
    updateDay({ tasks: [...tasks, { id, text: "", done: false, note: "" }] });
    setNewTaskId(id);
  };
  const toggleTask = (id) => updateDay({ tasks: tasks.map(p => p.id === id ? { ...p, done: !p.done } : p) });
  const updateTaskText = (id, text) => updateDay({ tasks: tasks.map(p => p.id === id ? { ...p, text } : p) });
  const updateTaskNote = (id, note) => updateDay({ tasks: tasks.map(p => p.id === id ? { ...p, note } : p) });
  const removeTask = (id) => updateDay({ tasks: tasks.filter(p => p.id !== id) });
  const taskDoneCount = tasks.filter(p => p.done).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* Header : gros titre */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>{t("nav.dailyPlanner")}</h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>

      {/* Date nav stylée */}
      {(() => {
        const parts = fmtDateParts(dateKey);
        const isToday = dateKey === todayKey();
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 18px" }}>
            <button onClick={() => shiftDay(-1)} style={iconBtn()} aria-label="Jour précédent"><ChevronLeft size={16} /></button>

            {/* Bloc date : day number big + weekday/month */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, minWidth: 48 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: T.textMut }}>{parts.month.slice(0, 3)}.</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: T.text, letterSpacing: -0.3, marginTop: 2 }}>{String(parts.day).padStart(2, "0")}</div>
              </div>
              <div style={{ height: 30, width: 1, background: T.border }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{parts.weekday}</div>
                  {isToday && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: T.green, background: T.green + "18",
                      padding: "2px 7px", borderRadius: 999, letterSpacing: 0.4, textTransform: "uppercase",
                    }}>Aujourd&apos;hui</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500 }}>{parts.month} {parts.year}</div>
              </div>
              {!isToday && (
                <button onClick={() => setDateKey(todayKey())}
                  style={{ marginLeft: "auto", fontSize: 11, color: T.blue, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                  Aujourd&apos;hui
                </button>
              )}
            </div>

            <button onClick={() => shiftDay(1)} style={iconBtn()} aria-label="Jour suivant"><ChevronRight size={16} /></button>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, alignItems: "start" }}>
        {/* LEFT : Habitudes du jour (sans carte, style timeline comme la page Objectifs) */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "0 16px" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1, margin: 0 }}>Habitudes du jour</h2>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 11, color: T.textMut, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              {habits.filter(h => habitHistory[h.id]?.[dateKey]).length}/{habits.length}
            </span>
            <button onClick={openCreateHabit} title="Ajouter une habitude"
              style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", marginRight: 64 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.white; }}>
              <Plus size={13} strokeWidth={2} />
            </button>
          </div>

          {/* Formulaire ajout/edit */}
          {habitFormOpen && typeof document !== "undefined" && ReactDOM.createPortal(
            <div
              onClick={closeHabitForm}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.45)",
                zIndex: 10000,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 16,
                animation: "fadeIn 140ms ease both",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === "Escape") closeHabitForm(); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveHabit(); }}
                style={{
                  background: T.white,
                  borderRadius: 14,
                  padding: 0,
                  width: "min(520px, 96vw)",
                  maxHeight: "92vh",
                  overflow: "auto",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
                  fontFamily: "var(--font-sans)",
                  display: "flex", flexDirection: "column",
                }}
              >
                {/* Header */}
                <div style={{ padding: "20px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>
                      {editingHabitId ? "Modifier l'habitude" : "Nouvelle habitude"}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMut, marginTop: 2 }}>
                      Une habitude, une heure, un lieu — précis = tenu.
                    </div>
                  </div>
                  <button onClick={closeHabitForm} aria-label="Fermer"
                    style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.bg; e.currentTarget.style.color = T.text; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
                    <X size={16} strokeWidth={1.75} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: "8px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Nom */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: T.textSub, display: "block", marginBottom: 6 }}>Nom de l'habitude</label>
                    <input type="text" value={habitDraft.name} onChange={(e) => setHabitDraft({ ...habitDraft, name: e.target.value })}
                      placeholder="ex. Méditer 10 min" autoFocus
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", color: T.text, background: T.white, transition: "border-color .15s ease" }}
                      onFocus={(e) => e.currentTarget.style.borderColor = T.text}
                      onBlur={(e) => e.currentTarget.style.borderColor = T.border}
                    />
                  </div>

                  {/* Heure + Lieu */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: T.textSub, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                        <Clock size={11} strokeWidth={1.75} /> Heure
                      </label>
                      <input type="time" value={habitDraft.time} onChange={(e) => setHabitDraft({ ...habitDraft, time: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: T.textSub, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                        <MapPin size={11} strokeWidth={1.75} /> Lieu <span style={{ color: T.textMut, fontWeight: 400 }}>· optionnel</span>
                      </label>
                      <input type="text" value={habitDraft.location} onChange={(e) => setHabitDraft({ ...habitDraft, location: e.target.value })}
                        placeholder="ex. Bureau, salon…"
                        style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: T.textSub, display: "block", marginBottom: 6 }}>
                      Description <span style={{ color: T.textMut, fontWeight: 400 }}>· optionnel</span>
                    </label>
                    <textarea value={habitDraft.description} onChange={(e) => setHabitDraft({ ...habitDraft, description: e.target.value })}
                      placeholder="Pourquoi cette habitude ? Comment la déclencher ?"
                      rows={3}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white, resize: "vertical", lineHeight: 1.5 }} />
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "12px 24px 20px", display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 11, color: T.textMut }}>
                    <kbd style={{ fontSize: 10, padding: "1px 5px", border: `1px solid ${T.border}`, borderRadius: 4, color: T.textSub, fontFamily: "var(--font-mono, ui-monospace), monospace" }}>Esc</kbd> pour fermer
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={closeHabitForm} style={{ padding: "0 16px", height: 36, background: T.white, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                      Annuler
                    </button>
                    <button onClick={saveHabit} disabled={!habitDraft.name?.trim()}
                      style={{ padding: "0 18px", height: 36, background: habitDraft.name?.trim() ? T.text : T.border2, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: habitDraft.name?.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: habitDraft.name?.trim() ? 1 : 0.7 }}>
                      {editingHabitId ? "Enregistrer" : "Ajouter l'habitude"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Liste des habitudes (style timeline de la page Objectifs) */}
          {habits.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: T.textMut, fontSize: 13 }}>Ajoute ta première habitude</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {habits.map(h => {
                const done = !!(habitHistory[h.id] && habitHistory[h.id][dateKey]);
                const Ico = autoIcon(h.name);
                return (
                  <div key={h.id}
                    draggable
                    onDragStart={(e) => {
                      setDragHabitId(h.id);
                      try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(h.id)); } catch {}
                    }}
                    onDragOver={(e) => {
                      if (!dragHabitId || dragHabitId === h.id) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverHabitId(h.id);
                    }}
                    onDragLeave={() => { if (dragOverHabitId === h.id) setDragOverHabitId(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      reorderHabit(dragHabitId, h.id);
                      setDragHabitId(null);
                      setDragOverHabitId(null);
                    }}
                    onDragEnd={() => { setDragHabitId(null); setDragOverHabitId(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px",
                      borderRadius: 8,
                      transition: "background .12s ease, box-shadow .12s ease",
                      opacity: dragHabitId === h.id ? 0.4 : 1,
                      boxShadow: dragOverHabitId === h.id ? `inset 0 2px 0 ${T.text}` : "none",
                      cursor: "grab",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FAFAFA";
                      const del = e.currentTarget.querySelector("[data-habit-del]"); if (del) del.style.opacity = 1;
                      const ed = e.currentTarget.querySelector("[data-habit-edit]"); if (ed) ed.style.opacity = 1;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      const del = e.currentTarget.querySelector("[data-habit-del]"); if (del) del.style.opacity = 0;
                      const ed = e.currentTarget.querySelector("[data-habit-edit]"); if (ed) ed.style.opacity = 0;
                    }}
                  >
                    {/* Icon bubble (gris neutre, plus de vert) */}
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: T.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, color: done ? T.textMut : T.text,
                    }}>
                      <Ico size={15} strokeWidth={2} />
                    </div>

                    {/* Content (non cliquable) */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: done ? T.textMut : T.text,
                        textDecoration: done ? "line-through" : "none",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2,
                      }}>
                        {h.name}
                      </div>
                      {/* Heure + lieu : ligne inline, descritpion : ligne séparée qui peut wrapper */}
                      {(h.time || h.location) && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6, marginTop: 2,
                          fontSize: 11, color: T.textMut, lineHeight: 1.2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {h.time && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                              <Clock size={10} strokeWidth={1.75} /> {h.time}
                            </span>
                          )}
                          {h.time && h.location && <span>·</span>}
                          {h.location && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                              <MapPin size={10} strokeWidth={1.75} /> {h.location}
                            </span>
                          )}
                        </div>
                      )}
                      {h.description && (
                        <div style={{ marginTop: 4, fontSize: 11, color: T.textMut, lineHeight: 1.4, whiteSpace: "normal", wordBreak: "break-word" }}>
                          {h.description}
                        </div>
                      )}
                    </div>

                    {/* Checkbox — collée au texte */}
                    <button onClick={() => toggleHabit(h.id)}
                      style={{
                        width: 18, height: 18, borderRadius: 5,
                        border: done ? "none" : `2px solid ${T.border2 || "#D4D4D4"}`,
                        background: done ? T.green : T.white,
                        cursor: "pointer",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all .15s ease",
                      }}>
                      {done && <Check size={11} strokeWidth={3} color="#fff" />}
                    </button>

                    {/* Edit (hidden until hover) */}
                    <button data-habit-edit onClick={() => openEditHabit(h)} title="Modifier"
                      style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s ease, color .12s ease, background .12s ease", flexShrink: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.background = T.accentBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; e.currentTarget.style.background = "transparent"; }}>
                      <Pencil size={11} strokeWidth={1.75} />
                    </button>

                    {/* Delete (hidden until hover) */}
                    <button data-habit-del onClick={() => removeHabit(h.id)} title="Supprimer"
                      style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s ease, color .12s ease, background .12s ease", flexShrink: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.background = "#FEF2F2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; e.currentTarget.style.background = "transparent"; }}>
                      <Trash2 size={11} strokeWidth={1.75} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT : Tâches du jour */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1, margin: 0 }}>Tâches du jour</h2>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 11, color: T.textMut, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              {taskDoneCount}/{tasks.length}
            </span>
          </div>

          <div style={{ padding: "0 16px 0 28px", display: "flex", flexDirection: "column", gap: 2 }}>
            {tasks.map(p => {
              const expanded = expandedTaskId === p.id;
              const hasNote = !!(p.note && p.note.trim());
              return (
                <div key={p.id} style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    onMouseEnter={(e) => e.currentTarget.querySelectorAll("[data-task-action]").forEach(b => b.style.opacity = 1)}
                    onMouseLeave={(e) => e.currentTarget.querySelectorAll("[data-task-action]").forEach(b => { if (!(b.dataset.persist === "1")) b.style.opacity = 0; })}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6 }}>
                    <button onClick={() => toggleTask(p.id)} aria-label={p.done ? "Décocher" : "Cocher"}
                      style={{ width: 14, height: 14, borderRadius: 4, border: p.done ? "none" : `1.5px solid ${T.border2 || "#D4D4D4"}`, background: p.done ? T.green : T.white, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, transition: "all .15s ease" }}>
                      {p.done && <Check size={9} strokeWidth={3} color="#fff" />}
                    </button>
                    <input type="text" value={p.text}
                      autoFocus={p.id === newTaskId}
                      placeholder="Sans titre"
                      onChange={(e) => updateTaskText(p.id, e.target.value)}
                      onBlur={() => { if (p.id === newTaskId) setNewTaskId(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); addTask(); } }}
                      style={{ flex: 1, minWidth: 0, padding: "2px 4px", border: "none", outline: "none", background: "transparent", fontSize: 13, color: p.done ? T.textMut : T.text, textDecoration: p.done ? "line-through" : "none", fontFamily: "inherit" }} />
                    <button data-task-action data-persist={hasNote || expanded ? "1" : "0"}
                      onClick={() => setExpandedTaskId(expanded ? null : p.id)}
                      title={hasNote ? "Voir / éditer la note" : "Ajouter une note"}
                      style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: expanded ? T.accentBg : "transparent", color: hasNote ? T.text : T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: hasNote || expanded ? 1 : 0, transition: "opacity .15s ease, color .12s ease, background .12s ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.background = T.accentBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = hasNote ? T.text : T.textMut; e.currentTarget.style.background = expanded ? T.accentBg : "transparent"; }}>
                      <StickyNote size={11} strokeWidth={1.75} />
                    </button>
                    <button data-task-action data-persist="0" onClick={() => removeTask(p.id)} title="Supprimer"
                      style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: 0, transition: "opacity .15s ease, color .12s ease, background .12s ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.background = "#FEF2F2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; e.currentTarget.style.background = "transparent"; }}>
                      <Trash2 size={11} strokeWidth={1.75} />
                    </button>
                  </div>
                  {expanded && (
                    <textarea
                      value={p.note || ""}
                      onChange={(e) => updateTaskNote(p.id, e.target.value)}
                      placeholder="Description, note, sous-étapes…"
                      rows={3}
                      style={{
                        margin: "2px 6px 6px 28px",
                        padding: "8px 10px",
                        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
                        fontSize: 12, color: T.text, outline: "none",
                        fontFamily: "inherit", resize: "vertical", lineHeight: 1.5,
                      }}
                    />
                  )}
                </div>
              );
            })}
            <button type="button" onClick={addTask}
              style={{
                alignSelf: "flex-start",
                display: "inline-flex", alignItems: "center", gap: 4,
                marginTop: 4, padding: "5px 6px",
                border: "none", background: "transparent",
                color: T.textMut, fontSize: 12, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
                borderRadius: 6, transition: "color .12s ease, background .12s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.background = T.accentBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; e.currentTarget.style.background = "transparent"; }}>
              <Plus size={12} strokeWidth={2} /> Ajouter une tâche
            </button>
          </div>
        </div>
      </div>

      {/* Graphique ligne : complétion habitudes (30 derniers jours) — pleine largeur, en bas */}
      <HabitsChart habits={habits} history={habitHistory} />
    </div>
  );
}

function HabitsChart({ habits, history }) {
  const [hoverIdx, setHoverIdx] = React.useState(null);
  const total = habits.length;
  // Trouve la première date où au moins une habitude a été cochée
  let firstIso = null;
  for (const h of habits) {
    const map = history[h.id] || {};
    for (const iso of Object.keys(map)) {
      if (map[iso] && (firstIso === null || iso < firstIso)) firstIso = iso;
    }
  }
  // Fallback : si rien n'est coché, on affiche les 7 derniers jours
  const today = new Date();
  let startDate;
  if (firstIso) {
    const [y, m, d] = firstIso.split("-").map(Number);
    startDate = new Date(y, m - 1, d);
  } else {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);
  }
  // Nombre de jours entre startDate et aujourd'hui (inclus)
  const msPerDay = 86400000;
  const startMs = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const span = Math.max(1, Math.round((todayMs - startMs) / msPerDay) + 1);
  const days = [];
  for (let i = 0; i < span; i++) {
    const d = new Date(startMs + i * msPerDay);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const done = habits.reduce((acc, h) => acc + (history[h.id]?.[iso] ? 1 : 0), 0);
    const pct = total > 0 ? (done / total) * 100 : 0;
    days.push({ iso, day: d.getDate(), date: d, done, pct, isToday: i === span - 1 });
  }
  const avg = total > 0 ? Math.round(days.reduce((s, x) => s + x.pct, 0) / days.length) : 0;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].done > 0) streak++; else break; }

  // Courbe SVG — style harmonisé avec les charts du Dashboard (Y labels à droite, lignes droites)
  const VB_W = 1000;
  const VB_H = 180;
  const padL = 8, padR = 36, padT = 14, padB = 24;
  const chartW = VB_W - padL - padR;
  const chartH = VB_H - padT - padB;
  const points = days.map((d, i) => {
    const x = padL + (i / Math.max(days.length - 1, 1)) * chartW;
    const y = padT + chartH - (d.pct / 100) * chartH;
    return { x, y, ...d };
  });
  // Lignes droites entre points (pas de Bezier)
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  // Aire fermée vers le bas du chart pour le dégradé
  const baselineY = padT + chartH;
  const areaD = points.length === 0
    ? ""
    : `${pathD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  const yTicks = [0, 50, 100];
  const xTicks = points.filter((_, i) => i === 0 || i === points.length - 1 || i % 5 === 0);

  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Complétion des habitudes</div>
          <div style={{ fontSize: 11, color: T.textMut, marginTop: 2 }}>30 derniers jours</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {streak >= 2 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#F59E0B", fontSize: 12, fontWeight: 700 }}>
              <Flame size={12} strokeWidth={2} /> {streak} j
            </span>
          )}
          <span style={{ fontSize: 12, color: avg >= 70 ? T.green : T.textSub, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            Moyenne · {avg}%
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: T.textMut, fontSize: 13 }}>
          Ajoute des habitudes pour voir ton graphique
        </div>
      ) : (
        <div
          style={{ position: "relative", width: "100%" }}
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = rect.width > 0 ? x / rect.width : 0;
            const idx = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
            setHoverIdx(idx);
          }}
        >
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none"
            style={{ width: "100%", height: 240, display: "block", fontFamily: "var(--font-sans)" }}>
            <defs>
              <linearGradient id="habits-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.green} stopOpacity="0.22" />
                <stop offset="100%" stopColor={T.green} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#habits-grad)" stroke="none" />
            <path d={pathD} fill="none" stroke={T.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {hoverIdx !== null && points[hoverIdx] && (
              <line x1={points[hoverIdx].x} y1={padT} x2={points[hoverIdx].x} y2={padT + chartH} stroke={T.textMut} strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            )}
          </svg>


          {/* Point au survol + tooltip listant les habitudes cochées ce jour-là */}
          {hoverIdx !== null && points[hoverIdx] && (() => {
            const p = points[hoverIdx];
            const leftPct = (p.x / VB_W) * 100;
            const topPct = (p.y / VB_H) * 100;
            const checked = habits.filter(h => history[h.id]?.[p.iso]);
            const dateLabel = p.date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
            const onLeftHalf = leftPct > 60;
            return (
              <>
                <div style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: onLeftHalf
                    ? "translate(calc(-100% - 14px), -50%)"
                    : "translate(14px, -50%)",
                  background: "#FFFFFF", color: T.text,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: "10px 12px",
                  fontSize: 11, lineHeight: 1.4,
                  minWidth: 170, maxWidth: 260,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)",
                  pointerEvents: "none", zIndex: 5,
                  fontFamily: "var(--font-sans)",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{dateLabel}</span>
                    <span style={{ color: T.textMut, fontSize: 10, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                      {p.done}/{habits.length} · {Math.round(p.pct)}%
                    </span>
                  </div>
                  {checked.length === 0 ? (
                    <div style={{ color: T.textMut, fontStyle: "italic", fontSize: 10 }}>
                      Aucune habitude cochée
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {checked.slice(0, 6).map(h => (
                        <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Check size={10} strokeWidth={2.5} color={T.green} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                        </div>
                      ))}
                      {checked.length > 6 && (
                        <div style={{ color: T.textMut, fontSize: 10, marginTop: 2 }}>
                          + {checked.length - 6} autre{checked.length - 6 > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: padB, pointerEvents: "none" }}>
            {xTicks.filter(p => !p.isToday).map(p => {
              const label = `${String(p.date.getDate()).padStart(2, "0")}/${String(p.date.getMonth() + 1).padStart(2, "0")}`;
              const isFirst = p === points[0];
              const isLast = p === points[points.length - 1];
              const leftPct = (p.x / VB_W) * 100;
              const transform = isFirst ? "translateX(0)" : isLast ? "translateX(-100%)" : "translateX(-50%)";
              return (
                <div key={`xh-${p.iso}`} style={{
                  position: "absolute", left: `${leftPct}%`, bottom: 4,
                  transform, fontSize: 10,
                  color: "#8E8E8E",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}>
                  {label}
                </div>
              );
            })}
          </div>

          <div style={{ position: "absolute", top: 0, right: 0, width: 36, height: "100%", pointerEvents: "none" }}>
            {yTicks.map(t => {
              const yPx = padT + chartH - (t / 100) * chartH;
              const topPct = (yPx / VB_H) * 100;
              return (
                <div key={`yh-${t}`} style={{ position: "absolute", top: `${topPct}%`, right: 6, transform: "translateY(-50%)", fontSize: 10, color: "#8E8E8E", fontWeight: 500 }}>{t}%</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DailyStatCell({ label, value, subLabel, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || T.text, letterSpacing: -0.3, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subLabel}</div>
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
      <button onClick={onAdd} style={{ padding: "0 12px", height: 28, background: T.text, color: "#fff", border: "none", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
