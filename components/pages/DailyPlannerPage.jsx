"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCloudState } from "@/lib/hooks/useCloudState";
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2,
  Battery, Flame, Clock, MapPin, Target as TargetIcon, X, Pencil,
  StickyNote, ChevronDown,
  // Icônes pour les habitudes
  Dumbbell, BookOpen, Brain, Footprints, Bike, Waves, PenLine, BedDouble, AlarmClock,
  Droplets, Coffee, Apple, Salad, ShoppingCart, GraduationCap, TrendingUp,
  Music, Sparkles as Sparkle, Wallet, Code as CodeIcon, Users, ShowerHead,
  Pill, Dog, Sprout, Wind, Sun, Star, Mic, Utensils,
} from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  bg: "#F5F5F5",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const STORAGE_PLANNER = "tr4de_daily_planner";
const STORAGE_HABITS = "tr4de_habits";
const STORAGE_HABITS_HISTORY = "tr4de_habits_history";
const STORAGE_DAILY_NOTES = "tr4de_dp_notes"; // { [iso]: "note text" }

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
  ];
};

export default function DailyPlannerPage() {
  const [dateKey, setDateKey] = useState(() => todayKey());

  // Planner (tâches, objectifs, énergie) par jour — synchronisé Supabase
  const [plannerStore, setPlannerStore] = useCloudState(STORAGE_PLANNER, "daily_planner", {});
  const day = plannerStore[dateKey] || { tasks: [], goals: [], energy: 7 };
  const updateDay = (patch) => setPlannerStore(prev => ({ ...prev, [dateKey]: { ...day, ...patch } }));

  // Habits — synchronisées Supabase
  const [habits, setHabits] = useCloudState(STORAGE_HABITS, "habits", defaultHabits());
  const [habitHistory, setHabitHistory] = useCloudState(STORAGE_HABITS_HISTORY, "habits_history", {});

  const toggleHabit = (habitId) => {
    setHabitHistory(prev => {
      const h = { ...(prev[habitId] || {}) };
      if (h[dateKey]) delete h[dateKey]; else h[dateKey] = true;
      return { ...prev, [habitId]: h };
    });
  };
  const removeHabit = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setHabitHistory(prev => { const n = { ...prev }; delete n[id]; return n; });
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

  // Tasks & goals (sans limite)
  const [newTask, setNewTask] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const addTask = () => {
    if (!newTask.trim()) return;
    updateDay({ tasks: [...(day.tasks || []), { id: Date.now(), text: newTask.trim(), done: false }] });
    setNewTask("");
  };
  const toggleTask = (id) => updateDay({ tasks: (day.tasks || []).map(p => p.id === id ? { ...p, done: !p.done } : p) });
  const removeTask = (id) => updateDay({ tasks: (day.tasks || []).filter(p => p.id !== id) });
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

  // Migration : anciens planners avec "priorities" mappés sur "tasks"
  useEffect(() => {
    if (day.priorities && !day.tasks) updateDay({ tasks: day.priorities, priorities: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  // --- Notes quotidiennes ---
  const [notesStore, setNotesStore] = useCloudState(STORAGE_DAILY_NOTES, "daily_notes", {});
  const currentNote = notesStore[dateKey] || "";
  const setCurrentNote = (text) => setNotesStore(prev => {
    const next = { ...prev };
    if (!text || !text.trim()) delete next[dateKey]; else next[dateKey] = text;
    return next;
  });
  // Liste des notes passées (hors date courante), triées par date décroissante
  const pastNotes = Object.entries(notesStore)
    .filter(([iso]) => iso !== dateKey)
    .sort((a, b) => b[0].localeCompare(a[0]));
  const [expandedNoteDate, setExpandedNoteDate] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* Header : gros titre */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: 0, letterSpacing: -0.5, fontFamily: "var(--font-sans)" }}>Daily Planner</h1>
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
                <div style={{ fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.5 }}>{parts.month.slice(0, 3)}.</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.8, marginTop: 2 }}>{String(parts.day).padStart(2, "0")}</div>
              </div>
              <div style={{ height: 30, width: 1, background: T.border }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{parts.weekday}</div>
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
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3, margin: 0 }}>Habitudes du jour</h2>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 11, color: T.textMut, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              {habits.filter(h => habitHistory[h.id]?.[dateKey]).length}/{habits.length}
            </span>
            <button onClick={openCreateHabit} title="Ajouter une habitude"
              style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.white; }}>
              <Plus size={13} strokeWidth={2} />
            </button>
          </div>

          {/* Formulaire ajout/edit */}
          {habitFormOpen && (
            <div style={{ background: T.bg, borderRadius: 10, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="text" value={habitDraft.name} onChange={(e) => setHabitDraft({ ...habitDraft, name: e.target.value })}
                placeholder="Nom de l'habitude (l'emoji est choisi automatiquement)" autoFocus
                style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
              <textarea value={habitDraft.description} onChange={(e) => setHabitDraft({ ...habitDraft, description: e.target.value })}
                placeholder="Description (optionnel)"
                rows={2}
                style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white, resize: "vertical", lineHeight: 1.4 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input type="time" value={habitDraft.time} onChange={(e) => setHabitDraft({ ...habitDraft, time: e.target.value })}
                  style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
                <input type="text" value={habitDraft.location} onChange={(e) => setHabitDraft({ ...habitDraft, location: e.target.value })}
                  placeholder="Lieu (optionnel)"
                  style={{ flex: 2, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
                <button onClick={saveHabit} style={{ padding: "0 14px", height: 36, background: T.text, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {editingHabitId ? "Enregistrer" : "Ajouter"}
                </button>
                <button onClick={closeHabitForm} style={{ width: 36, height: 36, background: T.white, color: T.textSub, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} />
                </button>
              </div>
            </div>
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
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px",
                      borderRadius: 8,
                      transition: "background .12s ease",
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
                      {(h.description || h.time || h.location) && (
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
                          {(h.time || h.location) && h.description && <span>·</span>}
                          {h.description && (
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.description}</span>
                          )}
                        </div>
                      )}
                    </div>

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

                    {/* Checkbox */}
                    <button onClick={() => toggleHabit(h.id)}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        border: done ? "none" : `1.5px solid ${T.border}`,
                        background: done ? T.green : T.white,
                        cursor: "pointer",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all .15s ease",
                      }}>
                      {done && <Check size={12} strokeWidth={2.5} color="#fff" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT : Tâches + Notes (sans cartes, style timeline) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Tâches */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "0 16px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3, margin: 0 }}>Tâches du jour</h2>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontSize: 11, color: T.textMut, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {(day.tasks || []).filter(p => p.done).length}/{(day.tasks || []).length}
              </span>
            </div>
            <div style={{ padding: "0 16px" }}>
              {(day.tasks || []).map(p => (
                <Row key={p.id} done={p.done} text={p.text} onToggle={() => toggleTask(p.id)} onDelete={() => removeTask(p.id)} accent={T.amber} />
              ))}
              <AddInput value={newTask} onChange={setNewTask} onAdd={addTask} placeholder="Ajouter une tâche..." />
            </div>
          </div>

          {/* Notes du jour — reset chaque jour, archivées */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "0 16px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3, margin: 0 }}>Notes du jour</h2>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              {pastNotes.length > 0 && (
                <span style={{ fontSize: 11, color: T.textMut, fontWeight: 500 }}>
                  {pastNotes.length} archivée{pastNotes.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ padding: "0 16px" }}>
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Pensées, idées, observations du jour..."
                style={{
                  width: "100%", minHeight: 110, resize: "vertical",
                  padding: 12, border: `1px solid ${T.border}`, borderRadius: 10,
                  fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white,
                  lineHeight: 1.5, boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = T.text; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = T.border; }}
              />

            {/* Archives : liste compacte */}
            {pastNotes.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  Archives
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                  {pastNotes.map(([iso, text]) => {
                    const parts = fmtDateParts(iso);
                    const isExpanded = expandedNoteDate === iso;
                    const preview = text.split("\n").find(l => l.trim()) || "";
                    return (
                      <div key={iso}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 2 }}
                          onMouseEnter={(e) => { const del = e.currentTarget.querySelector("[data-note-del]"); if (del) del.style.opacity = 1; }}
                          onMouseLeave={(e) => { const del = e.currentTarget.querySelector("[data-note-del]"); if (del) del.style.opacity = 0; }}
                        >
                          <button
                            onClick={() => setExpandedNoteDate(isExpanded ? null : iso)}
                            style={{
                              flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 8px", borderRadius: 6, border: "none",
                              background: isExpanded ? T.bg : "transparent",
                              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                              transition: "background .12s ease",
                            }}
                            onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = T.bg; }}
                            onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                          >
                            <ChevronDown size={11} strokeWidth={1.75} color={T.textMut} style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s ease", flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: T.text, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                              {String(parts.day).padStart(2, "0")}/{String(new Date(iso + "T00:00:00").getMonth() + 1).padStart(2, "0")}
                            </span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: T.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {preview}
                            </span>
                          </button>
                          <button
                            onClick={() => setDateKey(iso)}
                            title="Aller à cette date pour éditer"
                            style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "transparent", color: T.blue, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = T.blue + "18"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <Pencil size={11} strokeWidth={1.75} />
                          </button>
                          <button
                            data-note-del
                            onClick={() => {
                              setNotesStore(prev => { const n = { ...prev }; delete n[iso]; return n; });
                              if (expandedNoteDate === iso) setExpandedNoteDate(null);
                            }}
                            title="Supprimer"
                            style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: 0, transition: "opacity .15s ease, color .12s ease, background .12s ease" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.background = "#FEF2F2"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; e.currentTarget.style.background = "transparent"; }}
                          >
                            <Trash2 size={11} strokeWidth={1.75} />
                          </button>
                        </div>
                        {isExpanded && (
                          <div style={{
                            marginLeft: 22, marginTop: 4, marginBottom: 6,
                            padding: "8px 10px", background: T.bg, borderRadius: 6,
                            fontSize: 12, color: T.text, lineHeight: 1.5, whiteSpace: "pre-wrap",
                          }}>
                            {text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          </div>
        </div>
      </div>

      {/* Graphique ligne : complétion habitudes (30 derniers jours) — pleine largeur, en bas */}
      <HabitsChart habits={habits} history={habitHistory} />
    </div>
  );
}

function HabitsChart({ habits, history }) {
  const total = habits.length;
  const RANGE = 30; // 30 derniers jours
  const days = [];
  for (let i = RANGE - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const done = habits.reduce((acc, h) => acc + (history[h.id]?.[iso] ? 1 : 0), 0);
    const pct = total > 0 ? (done / total) * 100 : 0;
    days.push({ iso, day: d.getDate(), date: d, done, pct, isToday: i === 0 });
  }
  const avg = total > 0 ? Math.round(days.reduce((s, x) => s + x.pct, 0) / days.length) : 0;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].done > 0) streak++; else break; }

  // Courbe SVG
  const VB_W = 1000;   // viewBox width (adapte via preserveAspectRatio)
  const VB_H = 180;    // viewBox height
  const padL = 32, padR = 16, padT = 16, padB = 30;
  const chartW = VB_W - padL - padR;
  const chartH = VB_H - padT - padB;
  // Points
  const points = days.map((d, i) => {
    const x = padL + (i / Math.max(days.length - 1, 1)) * chartW;
    const y = padT + chartH - (d.pct / 100) * chartH;
    return { x, y, ...d };
  });
  // Smooth Catmull-Rom path
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const tension = 0.5;
      const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
      const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  }
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`
    : "";

  // Gridlines horizontales : 0 / 50 / 100 %
  const yTicks = [0, 50, 100];
  // Labels X : un repère tous les 5 jours
  const xTicks = points.filter((_, i) => i === 0 || i === points.length - 1 || i % 5 === 0);

  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <TrendingUp size={13} strokeWidth={1.75} color={T.green} />
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Complétion des habitudes</div>
        <span style={{ fontSize: 11, color: T.textMut }}>· 30 derniers jours</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {streak >= 2 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#F59E0B", fontSize: 12, fontWeight: 700 }}>
              <Flame size={12} strokeWidth={2} /> {streak} j
            </span>
          )}
          <span style={{ fontSize: 12, color: avg >= 70 ? T.green : T.textSub, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {avg}% moy.
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: T.textMut, fontSize: 13 }}>
          Ajoute des habitudes pour voir ton graphique
        </div>
      ) : (
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none"
          style={{ width: "100%", height: 180, display: "block", fontFamily: "var(--font-sans)" }}>
          <defs>
            <linearGradient id="habit-area" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={T.green} stopOpacity="0.20" />
              <stop offset="100%" stopColor={T.green} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid + Y ticks */}
          {yTicks.map(t => {
            const y = padT + chartH - (t / 100) * chartH;
            return (
              <g key={t}>
                <line x1={padL} y1={y} x2={VB_W - padR} y2={y} stroke="#F0F0F0" strokeWidth="1" />
                <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#8E8E8E" fontWeight="500">{t}%</text>
              </g>
            );
          })}

          {/* Area + line */}
          <path d={areaD} fill="url(#habit-area)" />
          <path d={pathD} fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

          {/* Dot today */}
          {points.length > 0 && (() => {
            const last = points[points.length - 1];
            return <circle cx={last.x} cy={last.y} r="4" fill="#fff" stroke={T.green} strokeWidth="2" vectorEffect="non-scaling-stroke" />;
          })()}

          {/* X labels */}
          {xTicks.map(p => {
            const label = p.isToday ? "Ajd" : `${String(p.date.getDate()).padStart(2, "0")}/${String(p.date.getMonth() + 1).padStart(2, "0")}`;
            return (
              <text key={`x-${p.iso}`} x={p.x} y={VB_H - 10} textAnchor="middle" fontSize="10" fill={p.isToday ? "#0D0D0D" : "#8E8E8E"} fontWeight={p.isToday ? "600" : "500"}>
                {label}
              </text>
            );
          })}
        </svg>
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
      <button onClick={onAdd} style={{ padding: "0 10px", height: 28, background: T.text, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
