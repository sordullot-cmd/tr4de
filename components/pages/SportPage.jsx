"use client";

import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { backdropDismiss } from "@/lib/hooks/useBackdropDismiss";
import {
  Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight,
  TrendingUp, Trophy, Flame, Calendar, Clock,
  Dumbbell, BicepsFlexed, Bike, Footprints, Heart,
  Star, EyeOff, Save, BookOpen, GripVertical,
} from "lucide-react";
import { t, useLang } from "@/lib/i18n";

const T = {
  white: "#FFFFFF", border: "#E5E5E5", text: "#0D0D0D",
  textSub: "#5C5C5C", textMut: "#8E8E8E",
  bg: "#FAFAFA", accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#16A34A", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
  purple: "#8B5CF6", cyan: "#06B6D4",
};

/* ─── Constantes ──────────────────────────────────────────────────── */

const DISCIPLINES = [
  { id: "musculation",  label: "Musculation",  Icon: Dumbbell,      color: "#F97316" },
  { id: "calisthenics", label: "Callisthénie", Icon: BicepsFlexed,  color: "#3B82F6" },
  { id: "cardio",       label: "Cardio",       Icon: Bike,       color: "#16A34A" },
];

const CATEGORIES = [
  { id: "push",      label: "Push",      color: "#EF4444" },
  { id: "pull",      label: "Pull",      color: "#3B82F6" },
  { id: "legs",      label: "Legs",      color: "#16A34A" },
  { id: "core",      label: "Core",      color: "#F59E0B" },
  { id: "full_body", label: "Full body", color: "#8B5CF6" },
  { id: "cardio",    label: "Cardio",    color: "#06B6D4" },
];

/* Bibliothèque d'exercices populaires avec catégorie par défaut. */
const EXERCISE_LIBRARY = [
  // Push
  { name: "Développé couché",           category: "push" },
  { name: "Développé incliné",          category: "push" },
  { name: "Développé décliné",          category: "push" },
  { name: "Développé militaire",        category: "push" },
  { name: "Développé haltères",         category: "push" },
  { name: "Développé Arnold",           category: "push" },
  { name: "Élévations latérales",       category: "push" },
  { name: "Élévations frontales",       category: "push" },
  { name: "Oiseau (rear delt)",         category: "push" },
  { name: "Dips",                       category: "push" },
  { name: "Pompes",                     category: "push" },
  { name: "Pompes diamant",             category: "push" },
  { name: "Pompes inclinées",           category: "push" },
  { name: "Écarté couché (haltères)",   category: "push" },
  { name: "Écarté à la poulie",         category: "push" },
  { name: "Extensions triceps poulie",  category: "push" },
  { name: "Triceps barre EZ",           category: "push" },
  { name: "Triceps haltère nuque",      category: "push" },
  { name: "Pull-over",                  category: "push" },
  // Pull
  { name: "Tractions",                  category: "pull" },
  { name: "Tractions pronation",        category: "pull" },
  { name: "Tractions supination",       category: "pull" },
  { name: "Tractions neutres",          category: "pull" },
  { name: "Australian pull-up",         category: "pull" },
  { name: "Rowing barre",               category: "pull" },
  { name: "Rowing T-bar",               category: "pull" },
  { name: "Rowing haltère",             category: "pull" },
  { name: "Tirage horizontal poulie",   category: "pull" },
  { name: "Tirage vertical poulie",     category: "pull" },
  { name: "Face pull",                  category: "pull" },
  { name: "Soulevé de terre",           category: "pull" },
  { name: "Soulevé de terre roumain",   category: "pull" },
  { name: "Shrugs (haussements)",       category: "pull" },
  { name: "Curl barre",                 category: "pull" },
  { name: "Curl haltères",              category: "pull" },
  { name: "Curl marteau",               category: "pull" },
  { name: "Curl pupitre",               category: "pull" },
  { name: "Curl à la poulie",           category: "pull" },
  // Legs
  { name: "Squat",                      category: "legs" },
  { name: "Squat avant (front squat)",  category: "legs" },
  { name: "Squat bulgare",              category: "legs" },
  { name: "Hack squat",                 category: "legs" },
  { name: "Presse à cuisses",           category: "legs" },
  { name: "Fentes",                     category: "legs" },
  { name: "Fentes marchées",            category: "legs" },
  { name: "Leg extension",              category: "legs" },
  { name: "Leg curl",                   category: "legs" },
  { name: "Soulevé de terre jambes tendues", category: "legs" },
  { name: "Hip thrust",                 category: "legs" },
  { name: "Good morning",               category: "legs" },
  { name: "Mollets debout",             category: "legs" },
  { name: "Mollets assis",              category: "legs" },
  { name: "Step-up",                    category: "legs" },
  { name: "Box jumps",                  category: "legs" },
  // Core
  { name: "Crunchs",                    category: "core" },
  { name: "Sit-ups",                    category: "core" },
  { name: "Relevé de jambes",           category: "core" },
  { name: "Relevé de jambes suspendu",  category: "core" },
  { name: "Planche",                    category: "core" },
  { name: "Planche latérale",           category: "core" },
  { name: "Russian twist",              category: "core" },
  { name: "Mountain climbers",          category: "core" },
  { name: "Hollow body hold",           category: "core" },
  { name: "Roue abdominale",            category: "core" },
  { name: "L-sit",                      category: "core" },
  { name: "Dragon flag",                category: "core" },
  // Full body / functional
  { name: "Burpees",                    category: "full_body" },
  { name: "Clean & jerk",               category: "full_body" },
  { name: "Snatch",                     category: "full_body" },
  { name: "Thruster",                   category: "full_body" },
  { name: "Kettlebell swing",           category: "full_body" },
  { name: "Turkish get-up",             category: "full_body" },
  { name: "Farmer walk",                category: "full_body" },
  { name: "Muscle-up",                  category: "full_body" },
  { name: "Pistol squat",               category: "legs" },
  { name: "Handstand push-up",          category: "push" },
  // Calisthénie / street workout
  { name: "Front lever",                category: "pull" },
  { name: "Front lever raises",         category: "pull" },
  { name: "Back lever",                 category: "pull" },
  { name: "Planche",                    category: "push" },
  { name: "Tuck planche",               category: "push" },
  { name: "Straddle planche",           category: "push" },
  { name: "Pseudo planche push-up",     category: "push" },
  { name: "Planche lean",               category: "push" },
  { name: "Handstand",                  category: "push" },
  { name: "Hand-to-hand",               category: "push" },
  { name: "Archer pull-up",             category: "pull" },
  { name: "Archer push-up",             category: "push" },
  { name: "One arm pull-up",            category: "pull" },
  { name: "One arm push-up",            category: "push" },
  { name: "Typewriter pull-up",         category: "pull" },
  { name: "Wide pull-up",               category: "pull" },
  { name: "Commando pull-up",           category: "pull" },
  { name: "Korean dips",                category: "push" },
  { name: "Ring dips",                  category: "push" },
  { name: "Ring muscle-up",             category: "full_body" },
  { name: "Bar muscle-up",              category: "full_body" },
  { name: "Skin the cat",               category: "full_body" },
  { name: "German hang",                category: "pull" },
  { name: "Tuck front lever",           category: "pull" },
  { name: "Pike push-up",               category: "push" },
  { name: "Hindu push-up",              category: "push" },
  { name: "Spiderman push-up",          category: "push" },
  { name: "Clap push-up",               category: "push" },
  { name: "Explosive pull-up",          category: "pull" },
  { name: "Pull-up négatif",            category: "pull" },
  { name: "Squat sauté",                category: "legs" },
  { name: "Sissy squat",                category: "legs" },
  { name: "Nordic curl",                category: "legs" },
  { name: "Shrimp squat",               category: "legs" },
  // Cardio
  { name: "Course à pied",              category: "cardio" },
  { name: "Sprint",                     category: "cardio" },
  { name: "Vélo",                       category: "cardio" },
  { name: "Vélo elliptique",            category: "cardio" },
  { name: "Rameur",                     category: "cardio" },
  { name: "Corde à sauter",             category: "cardio" },
  { name: "Natation",                   category: "cardio" },
  { name: "Marche rapide",              category: "cardio" },
  { name: "Stairmaster",                category: "cardio" },
  { name: "HIIT",                       category: "cardio" },
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ─── Page ────────────────────────────────────────────────────────── */

export default function SportPage() {
  useLang();
  const [sessions, setSessions] = useCloudState("tr4de_sport_sessions", "sport_sessions", []);
  // Bibliothèque personnalisable :
  // - customExercises : exercices ajoutés par l'utilisateur ({ name, category })
  // - hiddenExercises : noms (de la lib intégrée OU custom) que l'utilisateur a masqués
  // - favoriteExercises : noms en favoris (affichés en haut)
  const [customExercises, setCustomExercises] = useCloudState("tr4de_sport_custom_exercises", "sport_custom_exercises", []);
  const [hiddenExercises, setHiddenExercises] = useCloudState("tr4de_sport_hidden_exercises", "sport_hidden_exercises", []);
  const [favoriteExercises, setFavoriteExercises] = useCloudState("tr4de_sport_favorite_exercises", "sport_favorite_exercises", []);
  const [customPresets, setCustomPresets] = useCloudState("tr4de_sport_custom_presets", "sport_custom_presets", []);

  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = () => ({
    date: todayISO(),
    discipline: "musculation",
    duration: "",
    notes: "",
    exercises: [{
      id: Date.now(), name: "", category: "push",
      sets: [{ id: Date.now() + 1, reps: "", weight: "" }],
    }],
  });
  const [form, setForm] = useState(emptyForm());
  const [chartExerciseName, setChartExerciseName] = useState("");

  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditingId(s.id); setShowForm(true); };
  const close = () => { setShowForm(false); setEditingId(null); };
  const buildData = (f) => ({
    date: f.date,
    discipline: f.discipline,
    duration: parseFloat(f.duration) || 0,
    notes: (f.notes || "").trim(),
    exercises: (f.exercises || [])
      .filter(e => (e.name || "").trim())
      .map(e => ({
        id: e.id,
        name: e.name.trim(),
        category: e.category || "full_body",
        sets: (e.sets || []).filter(set => set.reps !== "" || set.weight !== "" || set.distance !== "" || set.time !== "")
          .map(set => ({
            id: set.id,
            reps: parseFloat(set.reps) || null,
            weight: parseFloat(set.weight) || null,
            distance: parseFloat(set.distance) || null,
            time: parseFloat(set.time) || null,
          })),
      })),
  });
  const save = () => {
    if (!form.date) return;
    const data = buildData(form);
    if (editingId) {
      setSessions(prev => (prev || []).map(s => s.id === editingId ? { ...s, ...data } : s));
    } else {
      const id = Date.now();
      setSessions(prev => [...(prev || []), { id, createdAt: new Date(id).toISOString(), ...data }]);
    }
    close();
  };
  // Autosave en mode édition : applique chaque changement après un court delai
  // (debounce) sans fermer la modale.
  useEffect(() => {
    if (!showForm || !editingId || !form?.date) return;
    const handle = setTimeout(() => {
      const data = buildData(form);
      setSessions(prev => (prev || []).map(s => s.id === editingId ? { ...s, ...data } : s));
    }, 350);
    return () => clearTimeout(handle);
  }, [form, editingId, showForm]);
  const remove = (id) => setSessions(prev => (prev || []).filter(s => s.id !== id));

  /* ─── Stats agrégées ──────────────────────────────────────────── */
  const stats = useMemo(() => {
    const all = (sessions || []);
    const total = all.length;
    const now = new Date();
    const monday = new Date(now);
    const dow = monday.getDay() || 7;
    monday.setDate(monday.getDate() - dow + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const sessionsThisWeek = all.filter(s => {
      const d = new Date(s.date + "T00:00:00");
      return d >= monday && d <= sunday;
    }).length;

    // Streak : durée (en jours) de la période d'entraînement active courante.
    // Les jours de repos comptent dans le streak tant qu'on ne dépasse pas
    // REST_TOLERANCE jours de repos consécutifs entre deux séances.
    const REST_TOLERANCE = 2;
    const sortedDates = [...new Set(all.map(s => s.date))].sort();
    let streak = 0;
    if (sortedDates.length) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const DAY = 86400000;
      const last = new Date(sortedDates[sortedDates.length - 1] + "T00:00:00");
      const daysSinceLast = Math.floor((today - last) / DAY);
      if (daysSinceLast <= REST_TOLERANCE) {
        let startIdx = sortedDates.length - 1;
        for (let i = sortedDates.length - 1; i > 0; i--) {
          const a = new Date(sortedDates[i] + "T00:00:00");
          const b = new Date(sortedDates[i - 1] + "T00:00:00");
          const gap = Math.floor((a - b) / DAY);
          if (gap <= REST_TOLERANCE + 1) startIdx = i - 1;
          else break;
        }
        const start = new Date(sortedDates[startIdx] + "T00:00:00");
        streak = Math.floor((today - start) / DAY) + 1;
      }
    }

    // Volume total cette semaine (kg × reps somme)
    let volumeWeek = 0;
    for (const s of all) {
      const d = new Date(s.date + "T00:00:00");
      if (d < monday || d > sunday) continue;
      for (const ex of (s.exercises || [])) {
        for (const set of (ex.sets || [])) {
          if (set.weight && set.reps) volumeWeek += set.weight * set.reps;
        }
      }
    }

    return { total, sessionsThisWeek, streak, volumeWeek };
  }, [sessions]);

  /* ─── Records personnels ─────────────────────────────────────── */
  const prs = useMemo(() => {
    const map = new Map(); // exerciseName → { weight, reps, date }
    for (const s of (sessions || [])) {
      for (const ex of (s.exercises || [])) {
        const name = ex.name?.trim();
        if (!name) continue;
        for (const set of (ex.sets || [])) {
          if (set.weight && set.reps) {
            const score = set.weight; // PR par charge max
            const cur = map.get(name);
            if (!cur || set.weight > cur.weight || (set.weight === cur.weight && set.reps > cur.reps)) {
              map.set(name, { weight: set.weight, reps: set.reps, date: s.date });
            }
          }
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, pr]) => ({ name, ...pr }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);
  }, [sessions]);

  /* ─── Liste des exercices (pour le sélecteur de graphique) ──── */
  const allExerciseNames = useMemo(() => {
    const set = new Set();
    for (const s of (sessions || [])) {
      for (const ex of (s.exercises || [])) {
        if (ex.name?.trim()) set.add(ex.name.trim());
      }
    }
    return Array.from(set).sort();
  }, [sessions]);

  useEffect(() => {
    if (!chartExerciseName && allExerciseNames.length > 0) setChartExerciseName(allExerciseNames[0]);
  }, [allExerciseNames, chartExerciseName]);

  /* ─── Données du graphique d'évolution ─────────────────────── */
  const chartData = useMemo(() => {
    if (!chartExerciseName) return [];
    const points = [];
    for (const s of (sessions || [])) {
      for (const ex of (s.exercises || [])) {
        if (ex.name?.trim() !== chartExerciseName) continue;
        let bestWeight = 0, bestReps = 0;
        for (const set of (ex.sets || [])) {
          if (set.weight && set.weight > bestWeight) {
            bestWeight = set.weight;
            bestReps = set.reps || 0;
          }
        }
        if (bestWeight > 0) points.push({ date: s.date, weight: bestWeight, reps: bestReps });
      }
    }
    return points.sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions, chartExerciseName]);

  /* ─── Filtrage ──────────────────────────────────────────────── */
  const filteredSessions = useMemo(() => {
    let list = sessions || [];
    if (filterDiscipline !== "all") list = list.filter(s => s.discipline === filterDiscipline);
    if (filterCategory !== "all") {
      list = list.filter(s => (s.exercises || []).some(e => e.category === filterCategory));
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions, filterDiscipline, filterCategory]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>
          {t("sport.pageTitle")}
        </h1>
        <button onClick={openCreate}
          style={{ marginLeft: "auto", padding: "7px 16px", height: 34, borderRadius: 999, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Nouvelle séance
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {/* KPIs — carte fusionnée */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <KpiCell label="Séances cette semaine" value={String(stats.sessionsThisWeek)} sub={`${stats.total} au total`} />
          <KpiCell label="Streak" value={`${stats.streak} j`} sub={stats.streak >= 2 ? "Garde le rythme" : "Lance ta série"} valueColor={stats.streak >= 2 ? T.amber : undefined}
            icon={stats.streak >= 2 ? Flame : undefined} />
          <KpiCell label="Records personnels" value={String(prs.length)} sub={prs[0] ? `${prs[0].name} · ${prs[0].weight} kg` : "Logge des séries"} icon={Trophy} />
          <KpiCell label="Volume semaine" value={`${Math.round(stats.volumeWeek).toLocaleString("fr-FR")} kg`} sub="kg × reps" last />
        </div>
      </div>

      {/* Filtres : discipline et catégorie sur des lignes distinctes,
          précédés d'un libellé pour clarifier ce qu'on filtre. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: T.textMut, minWidth: 80 }}>Discipline</span>
          <FilterPills
            value={filterDiscipline}
            onChange={setFilterDiscipline}
            options={[{ id: "all", label: "Toutes" }, ...DISCIPLINES.map(d => ({ id: d.id, label: d.label }))]}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: T.textMut, minWidth: 80 }}>Catégorie</span>
          <FilterPills
            value={filterCategory}
            onChange={setFilterCategory}
            options={[{ id: "all", label: "Toutes" }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label, color: c.color }))]}
          />
        </div>
      </div>

      {/* Layout en 2 colonnes : sessions à gauche, PR + chart à droite */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 1fr)", gap: 16, alignItems: "start" }}>

        {/* Colonne gauche : historique */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1, margin: 0 }}>Historique des séances</h2>
          {filteredSessions.length === 0 ? (
            <div style={{
              border: `1px dashed ${T.border}`, borderRadius: 16, padding: 28,
              textAlign: "center", background: T.white, color: T.textMut, fontSize: 13,
            }}>
              Aucune séance pour le moment. Crée ta première séance pour commencer à suivre ta progression.
            </div>
          ) : (
            <div className="anim-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredSessions.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onEdit={() => openEdit(s)}
                  onDelete={() => remove(s.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite : PRs + chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1, margin: 0 }}>Records personnels</h2>
            <PRsCard prs={prs} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1, margin: 0 }}>Progression</h2>
              {allExerciseNames.length > 0 && (
                <select
                  value={chartExerciseName}
                  onChange={(e) => setChartExerciseName(e.target.value)}
                  style={{
                    padding: "3px 12px", borderRadius: 999,
                    border: `1px solid ${T.border}`, background: T.white,
                    fontSize: 11, color: T.text, fontFamily: "inherit", cursor: "pointer",
                    maxWidth: 160,
                  }}
                >
                  {allExerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              )}
            </div>
            <ProgressChart
              allExerciseNames={allExerciseNames}
              selected={chartExerciseName}
              onChangeSelected={setChartExerciseName}
              data={chartData}
            />
          </div>
        </div>
      </div>

      {/* Modal de création / édition */}
      {showForm && typeof document !== "undefined" && ReactDOM.createPortal(
        <SessionForm
          form={form} setForm={setForm} editingId={editingId} onClose={close} onSave={save}
          onDelete={() => { if (editingId) { remove(editingId); close(); } }}
          customExercises={customExercises} setCustomExercises={setCustomExercises}
          hiddenExercises={hiddenExercises} setHiddenExercises={setHiddenExercises}
          favoriteExercises={favoriteExercises} setFavoriteExercises={setFavoriteExercises}
          customPresets={customPresets} setCustomPresets={setCustomPresets}
        />,
        document.body
      )}
    </div>
  );
}

/* ─── Helpers de date ─────────────────────────────────────────────── */
function toISOLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── Cellule KPI ────────────────────────────────────────────────── */
function KpiCell({ label, value, sub, valueColor, icon: Icon, last }) {
  return (
    <div style={{
      padding: "16px 18px", minWidth: 0,
      borderRight: last ? "none" : `1px solid ${T.border}`,
    }}>
      <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginBottom: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
        {Icon && <Icon size={11} strokeWidth={1.75} />}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: valueColor || T.text, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textMut, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}

/* ─── Filtres en pills ──────────────────────────────────────────── */
function FilterPills({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} type="button"
            onClick={() => onChange(o.id)}
            style={{
              padding: "5px 12px", borderRadius: 999,
              border: `1px solid ${active ? T.text : T.border}`,
              background: active ? T.text : T.white,
              color: active ? T.white : T.textSub,
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            {o.color && <span style={{ width: 6, height: 6, borderRadius: "50%", background: o.color, flexShrink: 0 }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Carte d'une séance (résumé + dépliage exercices) ──────────── */
function SessionCard({ session: s, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const disc = DISCIPLINES.find(d => d.id === s.discipline) || DISCIPLINES[0];
  const Icon = disc.Icon;
  const totalSets = (s.exercises || []).reduce((sum, e) => sum + (e.sets || []).length, 0);
  const totalVolume = (s.exercises || []).reduce((sum, e) =>
    sum + (e.sets || []).reduce((vs, set) => vs + ((set.weight || 0) * (set.reps || 0)), 0), 0);

  // Catégorie de la séance = moyenne pondérée par le nombre de séries.
  // On somme les sets par catégorie d'exo, puis on prend la catégorie dominante.
  // Tie ou 3+ catégories à poids comparables → "Full body".
  const sessionCategory = (() => {
    const weights = {};
    for (const ex of (s.exercises || [])) {
      if (!ex.category) continue;
      const w = Math.max(1, (ex.sets || []).length);
      weights[ex.category] = (weights[ex.category] || 0) + w;
    }
    const keys = Object.keys(weights);
    if (keys.length === 0) return null;
    keys.sort((a, b) => weights[b] - weights[a]);
    const total = keys.reduce((s, k) => s + weights[k], 0);
    const top = weights[keys[0]];
    // Si la catégorie dominante représente moins de 50%, considère la séance Full body
    if (keys.length >= 3 && top / total < 0.5) return CATEGORIES.find(c => c.id === "full_body");
    return CATEGORIES.find(c => c.id === keys[0]) || null;
  })();

  return (
    <div data-card style={{
      background: T.white, border: `1px solid ${T.border}`, borderRadius: 16,
      overflow: "hidden",
    }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", transition: "background .12s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = T.bg; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: `${disc.color}1F`, color: disc.color,
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={16} strokeWidth={1.75} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
              {fmtDate(s.date)}
            </span>
            {sessionCategory && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: sessionCategory.color, background: `${sessionCategory.color}18`,
                padding: "1px 7px", borderRadius: 999, alignSelf: "center",
              }}>{sessionCategory.label}</span>
            )}
            <span style={{ fontSize: 11, color: T.textSub, textTransform: "capitalize" }}>{disc.label}</span>
            {s.duration > 0 && (
              <span style={{ fontSize: 11, color: T.textMut, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Clock size={10} strokeWidth={1.75} /> {s.duration} min
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: 11, color: T.textMut, flexWrap: "wrap" }}>
            <span>{(s.exercises || []).length} exercice{(s.exercises || []).length > 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{totalSets} série{totalSets > 1 ? "s" : ""}</span>
            {totalVolume > 0 && (
              <>
                <span>·</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(totalVolume).toLocaleString("fr-FR")} kg</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Modifier"
            style={iconBtn()}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; e.currentTarget.style.color = T.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
            <Pencil size={11} strokeWidth={1.75} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Supprimer"
            style={iconBtn()}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
            <Trash2 size={11} strokeWidth={1.75} />
          </button>
          <ChevronRight size={12} strokeWidth={2} color={T.textMut}
            style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s ease", marginLeft: 2 }} />
        </div>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${T.border}` }}>
          {(s.exercises || []).map((ex, i) => {
            return (
              <div key={ex.id || i} style={{ paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{ex.name}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {(ex.sets || []).map((set, si) => (
                    <div key={set.id || si} style={{ fontSize: 11, color: T.textSub, fontVariantNumeric: "tabular-nums" }}>
                      <span style={{ color: T.textMut, marginRight: 8 }}>Série {si + 1}</span>
                      {set.reps != null && <span>{set.reps} reps</span>}
                      {set.weight != null && <span> · {set.weight} kg</span>}
                      {set.distance != null && <span> · {set.distance} km</span>}
                      {set.time != null && <span> · {set.time} min</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {s.notes && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: T.bg, borderRadius: 10, fontSize: 11, color: T.textSub, fontStyle: "italic", lineHeight: 1.45 }}>
              {s.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function iconBtn() {
  return {
    width: 24, height: 24, borderRadius: 6, border: "none",
    background: "transparent", color: T.textMut, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "background .15s ease, color .12s ease",
  };
}

/* ─── Carte des records personnels ──────────────────────────────── */
function PRsCard({ prs }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
      {prs.length === 0 ? (
        <div style={{ padding: "24px 18px", textAlign: "center", color: T.textMut, fontSize: 12 }}>
          Aucun PR. Logge tes séries avec charges pour voir tes records.
        </div>
      ) : (
        <div>
          {prs.map((pr, i) => (
            <div key={pr.name} style={{
              padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
              borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pr.name}
                </div>
                <div style={{ fontSize: 10, color: T.textMut, marginTop: 1 }}>{fmtDate(pr.date)}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {pr.weight} kg <span style={{ fontWeight: 500, color: T.textMut, fontSize: 11 }}>× {pr.reps}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Graphique de progression (simple SVG line) ────────────────── */
function ProgressChart({ allExerciseNames, selected, onChangeSelected, data }) {
  const VB_W = 600, VB_H = 200, padL = 8, padR = 36, padT = 14, padB = 24;
  const chartW = VB_W - padL - padR;
  const chartH = VB_H - padT - padB;

  const maxW = Math.max(...data.map(d => d.weight), 1);
  const minW = 0;
  const span = maxW - minW || 1;

  const points = data.map((d, i) => {
    const x = padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = padT + chartH - ((d.weight - minW) / span) * chartH;
    return { x, y, ...d };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const baselineY = padT + chartH;
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`
    : "";

  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
      {data.length === 0 ? (
        <div style={{ padding: "32px 18px", textAlign: "center", color: T.textMut, fontSize: 12 }}>
          {allExerciseNames.length === 0
            ? "Logge des séances avec charges pour voir l'évolution."
            : "Pas encore assez de points pour cet exercice."}
        </div>
      ) : (
        <div style={{ padding: 12, position: "relative" }}>
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none"
            style={{ width: "100%", height: 180, display: "block", fontFamily: "var(--font-sans)" }}>
            <defs>
              <linearGradient id="sport-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.green} stopOpacity="0.22" />
                <stop offset="100%" stopColor={T.green} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#sport-grad)" stroke="none" />
            <path d={pathD} fill="none" stroke={T.green} strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* Y label max */}
          <div style={{ position: "absolute", top: 8, right: 6, fontSize: 10, color: T.textMut, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(maxW)} kg
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Modal du formulaire de séance ─────────────────────────────── */
function SessionForm({ form, setForm, editingId, onClose, onSave, onDelete, customExercises, setCustomExercises, hiddenExercises, setHiddenExercises, favoriteExercises, setFavoriteExercises, customPresets = [], setCustomPresets }) {
  const [showPresets, setShowPresets] = useState(false);
  const [presetNamePrompt, setPresetNamePrompt] = useState(null); // null | string
  const [draggedExId, setDraggedExId] = useState(null);
  const [dragOverExId, setDragOverExId] = useState(null);

  // Déplacement de la modale : on attrape l'en-tête et on la glisse librement
  // à l'écran (comme une fenêtre), façon agenda.
  const [winPos, setWinPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = React.useRef(null);
  const startWindowDrag = (e) => {
    // Ne pas démarrer si on clique sur un bouton (ex. fermer).
    if (e.target.closest("button")) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: winPos.x, baseY: winPos.y };
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      setWinPos({ x: d.baseX + (ev.clientX - d.startX), y: d.baseY + (ev.clientY - d.startY) });
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const allPresets = useMemo(
    () => (customPresets || []).map(p => ({ ...p, custom: true })),
    [customPresets]
  );

  const applyPreset = (preset) => {
    const baseId = Date.now();
    setForm(prev => ({
      ...prev,
      discipline: preset.discipline || prev.discipline,
      exercises: (preset.exercises || []).map((ex, i) => ({
        id: baseId + i * 1000,
        name: ex.name,
        category: ex.category || "full_body",
        sets: (ex.sets && ex.sets.length > 0)
          ? ex.sets.map((s, j) => ({ id: baseId + i * 1000 + j + 1, reps: s.reps ?? "", weight: s.weight ?? "", distance: s.distance ?? "", time: s.time ?? "" }))
          : [{ id: baseId + i * 1000 + 1, reps: "", weight: "" }],
      })),
    }));
    setShowPresets(false);
  };

  const openSaveAsPreset = () => setPresetNamePrompt("");
  const confirmSaveAsPreset = () => {
    const name = (presetNamePrompt || "").trim();
    if (!name) return;
    const preset = {
      id: `custom-${Date.now()}`,
      name,
      discipline: form.discipline,
      exercises: (form.exercises || [])
        .filter(e => (e.name || "").trim())
        .map(e => ({ name: e.name.trim(), category: e.category || "full_body" })),
    };
    if (preset.exercises.length === 0) { setPresetNamePrompt(null); return; }
    setCustomPresets?.(prev => [...(prev || []), preset]);
    setPresetNamePrompt(null);
  };

  const deleteCustomPreset = (id) => {
    setCustomPresets?.(prev => (prev || []).filter(p => p.id !== id));
  };

  const addExercise = () => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setForm(prev => ({
      ...prev,
      exercises: [...(prev.exercises || []), {
        id, name: "", category: "push",
        sets: [{ id: id + 1, reps: "", weight: "" }],
      }],
    }));
  };
  const removeExercise = (eid) => {
    setForm(prev => ({ ...prev, exercises: (prev.exercises || []).filter(e => e.id !== eid) }));
  };
  const updateExercise = (eid, patch) => {
    setForm(prev => ({
      ...prev,
      exercises: (prev.exercises || []).map(e => e.id === eid ? { ...e, ...patch } : e),
    }));
  };
  const moveExercise = (fromId, toId) => {
    if (fromId === toId) return;
    setForm(prev => {
      const list = [...(prev.exercises || [])];
      const from = list.findIndex(e => e.id === fromId);
      const to = list.findIndex(e => e.id === toId);
      if (from < 0 || to < 0) return prev;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { ...prev, exercises: list };
    });
  };
  const addSet = (eid) => {
    setForm(prev => ({
      ...prev,
      exercises: (prev.exercises || []).map(e => {
        if (e.id !== eid) return e;
        const sets = e.sets || [];
        const last = sets[sets.length - 1];
        // Pré-remplit la nouvelle série avec les valeurs de la précédente
        // (kilos, distance, temps) pour aller plus vite. Reps reste vide.
        const newSet = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          reps: "",
          weight: last?.weight ?? "",
          distance: last?.distance ?? "",
          time: last?.time ?? "",
        };
        return { ...e, sets: [...sets, newSet] };
      }),
    }));
  };
  const updateSet = (eid, sid, patch) => {
    setForm(prev => ({
      ...prev,
      exercises: (prev.exercises || []).map(e => e.id === eid
        ? { ...e, sets: (e.sets || []).map(set => set.id === sid ? { ...set, ...patch } : set) }
        : e),
    }));
  };
  const removeSet = (eid, sid) => {
    setForm(prev => ({
      ...prev,
      exercises: (prev.exercises || []).map(e => e.id === eid
        ? { ...e, sets: (e.sets || []).filter(set => set.id !== sid) }
        : e),
    }));
  };

  const isCardio = form.discipline === "cardio";

  return (
    <div {...backdropDismiss(onClose)}
      style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: "min(640px, 100%)", maxHeight: "min(88vh, 820px)", display: "flex", flexDirection: "column", background: T.white, borderRadius: 18, boxShadow: "0 6px 20px rgba(0,0,0,0.10)", overflow: "hidden", fontFamily: "var(--font-sans)", transform: `translate(${winPos.x}px, ${winPos.y}px)` }}>
        {/* Header — sert aussi de poignée pour déplacer la fenêtre */}
        <div onMouseDown={startWindowDrag}
          style={{ position: "relative", padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "move", userSelect: "none" }}>
          {/* Poignée de déplacement */}
          <div style={{
            position: "absolute", left: "50%", top: 7, transform: "translateX(-50%)",
            width: 40, height: 4, borderRadius: 999,
            background: dragging ? T.textMut : T.border,
            transition: "background-color 120ms ease",
          }} />
          {editingId && (
            <button onMouseDown={(e) => e.stopPropagation()} onClick={onDelete} aria-label="Supprimer" title="Supprimer la séance"
              style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "background-color 120ms ease, color 120ms ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
              <Trash2 size={15} strokeWidth={1.9} />
            </button>
          )}
          <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} aria-label="Fermer"
            style={{ marginLeft: editingId ? 0 : "auto", width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", color: T.textMut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "background-color 120ms ease, color 120ms ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; e.currentTarget.style.color = T.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
            <X size={16} strokeWidth={1.9} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {/* Modèles de séance */}
          {!editingId && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Label>Modèle de séance</Label>
                <button
                  type="button"
                  onClick={() => setShowPresets(v => !v)}
                  style={{
                    marginLeft: "auto", marginBottom: 6,
                    padding: "4px 10px", borderRadius: 999,
                    border: `1px solid ${T.border}`, background: T.white,
                    color: T.textSub, fontSize: 11, fontWeight: 500, cursor: "pointer",
                    fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                  <BookOpen size={11} strokeWidth={1.75} />
                  {showPresets ? "Masquer" : "Choisir un modèle"}
                </button>
              </div>
              {showPresets && (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 6, padding: 10,
                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14,
                  maxHeight: 220, overflowY: "auto",
                }}>
                  {allPresets.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", color: T.textMut, fontSize: 12, padding: "8px 0" }}>
                      Aucun modèle.
                    </div>
                  )}
                  {allPresets.map(p => {
                    const disc = DISCIPLINES.find(d => d.id === p.discipline) || DISCIPLINES[0];
                    return (
                      <div key={p.id} style={{
                        position: "relative",
                        background: T.white, border: `1px solid ${T.border}`, borderRadius: 12,
                        padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4,
                      }}>
                        <button type="button" onClick={() => applyPreset(p)}
                          style={{
                            border: "none", background: "transparent", padding: 0, textAlign: "left",
                            cursor: "pointer", fontFamily: "inherit", color: T.text,
                            display: "flex", flexDirection: "column", gap: 4,
                          }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: disc.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.name}
                            </span>
                            {p.custom && <span style={{ fontSize: 9, color: T.textMut, fontWeight: 500 }}>(perso)</span>}
                          </div>
                          <div style={{ fontSize: 10, color: T.textMut }}>
                            {(p.exercises || []).length} exercice{(p.exercises || []).length > 1 ? "s" : ""}
                          </div>
                        </button>
                        {p.custom && (
                          <button type="button" onClick={() => deleteCustomPreset(p.id)} aria-label="Supprimer le modèle"
                            style={{
                              position: "absolute", top: 4, right: 4,
                              width: 20, height: 20, borderRadius: 4, border: "none",
                              background: "transparent", color: T.textMut, cursor: "pointer",
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
                            <Trash2 size={10} strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Discipline */}
          <div>
            <Label>Discipline</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {DISCIPLINES.map(d => {
                const Icon = d.Icon;
                const active = form.discipline === d.id;
                return (
                  <button key={d.id} type="button"
                    onClick={() => setForm({ ...form, discipline: d.id })}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 13px", borderRadius: 999,
                      border: "1px solid transparent",
                      background: active ? `${d.color}10` : T.white,
                      color: T.text, cursor: "pointer", fontFamily: "inherit",
                      textAlign: "left",
                    }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: `${d.color}1F`, color: d.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={11} strokeWidth={1.75} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + durée */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <Label>Date</Label>
              <DateField value={form.date}
                onChange={(v) => setForm({ ...form, date: v })} />
            </label>
            <label>
              <Label>Durée (min)</Label>
              <input type="number" value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="60"
                style={input()} />
            </label>
          </div>

          {/* Exercices */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Label>Exercices</Label>
              <button type="button" onClick={addExercise}
                style={{
                  marginLeft: "auto", marginBottom: 8,
                  padding: "4px 10px", borderRadius: 999,
                  border: `1px solid ${T.border}`, background: T.white,
                  color: T.textSub, fontSize: 11, fontWeight: 500, cursor: "pointer",
                  fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                <Plus size={11} strokeWidth={2} /> Ajouter
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(form.exercises || []).map((ex) => (
                <div key={ex.id}
                  onDragOver={(e) => { if (draggedExId != null && draggedExId !== ex.id) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverExId !== ex.id) setDragOverExId(ex.id); } }}
                  onDragLeave={() => { if (dragOverExId === ex.id) setDragOverExId(null); }}
                  onDrop={(e) => { e.preventDefault(); if (draggedExId != null) moveExercise(draggedExId, ex.id); setDraggedExId(null); setDragOverExId(null); }}
                  style={{
                    background: T.bg,
                    border: `1px solid ${dragOverExId === ex.id ? T.accent : T.border}`,
                    borderRadius: 14,
                    padding: "10px 12px",
                    opacity: draggedExId === ex.id ? 0.5 : 1,
                    transition: "border-color 120ms, opacity 120ms",
                  }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span
                      draggable
                      onDragStart={(e) => { setDraggedExId(ex.id); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(ex.id)); } catch {} }}
                      onDragEnd={() => { setDraggedExId(null); setDragOverExId(null); }}
                      title="Glisser pour réordonner"
                      aria-label="Réordonner l'exercice"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 18, height: 22, color: T.textMut, cursor: "grab", flexShrink: 0,
                        marginLeft: -4,
                      }}
                      onMouseDown={(e) => { e.currentTarget.style.cursor = "grabbing"; }}
                      onMouseUp={(e) => { e.currentTarget.style.cursor = "grab"; }}>
                      <GripVertical size={13} strokeWidth={1.75} />
                    </span>
                    <ExerciseNameCombobox
                      value={ex.name}
                      onChange={(name) => updateExercise(ex.id, { name })}
                      onPick={(item) => updateExercise(ex.id, { name: item.name, category: item.category })}
                      customExercises={customExercises}
                      setCustomExercises={setCustomExercises}
                      hiddenExercises={hiddenExercises}
                      setHiddenExercises={setHiddenExercises}
                      favoriteExercises={favoriteExercises}
                      setFavoriteExercises={setFavoriteExercises}
                      defaultCategory={isCardio ? "cardio" : (ex.category && ex.category !== "cardio" ? ex.category : "full_body")}
                      isCardio={isCardio}
                    />
                    <button type="button" onClick={() => removeExercise(ex.id)} aria-label="Supprimer l'exercice"
                      style={iconBtn()}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
                      <Trash2 size={11} strokeWidth={1.75} />
                    </button>
                  </div>
                  {/* Sets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(ex.sets || []).map((set, si) => (
                      <div key={set.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 22, fontSize: 10, color: T.textMut, fontWeight: 500 }}>S{si + 1}</span>
                        {isCardio ? (
                          <>
                            <SetInput value={set.distance} onChange={(v) => updateSet(ex.id, set.id, { distance: v })} placeholder="km" />
                            <SetInput value={set.time} onChange={(v) => updateSet(ex.id, set.id, { time: v })} placeholder="min" />
                          </>
                        ) : (
                          <>
                            <SetInput value={set.reps} onChange={(v) => updateSet(ex.id, set.id, { reps: v })} placeholder="reps" />
                            <SetInput value={set.weight} onChange={(v) => updateSet(ex.id, set.id, { weight: v })} placeholder="kg" />
                          </>
                        )}
                        <button type="button" onClick={() => removeSet(ex.id, set.id)} aria-label="Supprimer la série"
                          style={{ ...iconBtn(), width: 22, height: 22 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
                          <X size={10} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addSet(ex.id)}
                    style={{
                      marginTop: 6, padding: "3px 10px", borderRadius: 999,
                      border: `1px dashed ${T.border}`, background: T.white,
                      color: T.textMut, fontSize: 10, fontWeight: 500, cursor: "pointer",
                      fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                    <Plus size={10} strokeWidth={2} /> Ajouter une série
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <label>
            <Label>Notes</Label>
            <textarea value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Sensations, énergie, ce que tu retiens…"
              rows={3}
              style={{ ...input(), borderRadius: 14, resize: "vertical", lineHeight: 1.45 }} />
          </label>
        </div>

        {/* Inline prompt pour nommer un nouveau modèle */}
        {presetNamePrompt !== null && (
          <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.border}`, background: T.bg, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: T.textMut, whiteSpace: "nowrap" }}>Nom du modèle</span>
            <input
              autoFocus
              type="text"
              value={presetNamePrompt}
              onChange={(e) => setPresetNamePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); confirmSaveAsPreset(); }
                else if (e.key === "Escape") { e.preventDefault(); setPresetNamePrompt(null); }
              }}
              placeholder="Ex : Push lourd"
              style={{ ...input(), padding: "6px 10px", fontSize: 12 }}
            />
            <button type="button" onClick={() => setPresetNamePrompt(null)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "transparent", color: T.textSub, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Annuler
            </button>
            <button type="button" onClick={confirmSaveAsPreset}
              disabled={!(presetNamePrompt || "").trim()}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "none",
                background: (presetNamePrompt || "").trim() ? T.text : "#F0F0F0",
                color: (presetNamePrompt || "").trim() ? T.white : T.textMut,
                fontSize: 12, fontWeight: 600,
                cursor: (presetNamePrompt || "").trim() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}>
              Enregistrer
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={openSaveAsPreset}
            disabled={!(form.exercises || []).some(e => (e.name || "").trim())}
            title="Enregistrer la composition de cette séance comme modèle réutilisable"
            style={{
              marginRight: "auto",
              padding: "7px 12px", borderRadius: 999,
              border: `1px solid ${T.border}`, background: T.white,
              color: T.textSub, fontSize: 11, fontWeight: 500,
              cursor: (form.exercises || []).some(e => (e.name || "").trim()) ? "pointer" : "not-allowed",
              opacity: (form.exercises || []).some(e => (e.name || "").trim()) ? 1 : 0.5,
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5,
            }}>
            <Save size={11} strokeWidth={1.75} /> Sauver comme modèle
          </button>
          {editingId ? (
            <>
              <span style={{ fontSize: 11, color: T.textMut, fontFamily: "inherit" }}>
                Modifications enregistrées automatiquement
              </span>
              <button onClick={onClose}
                style={{ padding: "7px 16px", height: 34, borderRadius: 999, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Fermer
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose}
                style={{ padding: "7px 16px", height: 34, borderRadius: 999, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              <button onClick={onSave}
                disabled={!form.date}
                style={{
                  padding: "7px 16px", height: 34, borderRadius: 999,
                  border: `1px solid ${form.date ? T.text : T.border}`,
                  background: form.date ? T.text : "#F0F0F0",
                  color: form.date ? T.white : T.textMut,
                  fontSize: 13, fontWeight: 600,
                  cursor: form.date ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                <Check size={13} strokeWidth={2} /> Créer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, color: T.textMut, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function input() {
  return {
    width: "100%", padding: "8px 14px", borderRadius: 999,
    border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit",
    outline: "none", color: T.text, background: T.white,
  };
}

/* ─── Combobox pour la saisie d'un exercice ───────────────────────
   - Recherche dans la lib intégrée + exercices custom de l'utilisateur
   - Favoris affichés en premier
   - Bouton étoile pour ajouter/retirer des favoris
   - Bouton œil-barré pour masquer un exercice intégré
   - Bouton corbeille pour supprimer un exercice custom
   - Si la recherche ne renvoie rien → bouton "Ajouter <query>" comme nouvel exo */
function ExerciseNameCombobox({
  value, onChange, onPick,
  customExercises = [], setCustomExercises,
  hiddenExercises = [], setHiddenExercises,
  favoriteExercises = [], setFavoriteExercises,
  defaultCategory = "full_body",
  isCardio = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = React.useRef(null);

  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = norm((value || "").trim());

  // Liste fusionnée : custom + intégrés - masqués (les custom remplacent l'intégré
  // s'il y a collision sur le nom).
  const allItems = useMemo(() => {
    const customNames = new Set((customExercises || []).map(c => norm(c.name)));
    const builtin = EXERCISE_LIBRARY.filter(e => !customNames.has(norm(e.name)));
    const merged = [...(customExercises || []).map(c => ({ ...c, custom: true })), ...builtin];
    const hiddenSet = new Set((hiddenExercises || []).map(n => norm(n)));
    return merged
      .filter(e => !hiddenSet.has(norm(e.name)))
      .filter(e => isCardio ? e.category === "cardio" : e.category !== "cardio")
      .sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  }, [customExercises, hiddenExercises, isCardio]);

  const favSet = useMemo(
    () => new Set((favoriteExercises || []).map(n => norm(n))),
    [favoriteExercises]
  );

  const matches = useMemo(() => {
    let list = allItems;
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter(e => {
        const haystack = norm([e.name, ...((e.aliases || []))].join(" "));
        return tokens.every(t => haystack.includes(t));
      });
    }
    // Favoris d'abord, puis ordre original
    return list
      .map((e, idx) => ({ ...e, _fav: favSet.has(norm(e.name)), _idx: idx }))
      .sort((a, b) => (b._fav ? 1 : 0) - (a._fav ? 1 : 0) || a._idx - b._idx)
      .slice(0, 60);
  }, [allItems, favSet, q]);

  // Une suggestion "ajouter" est dispo si la query ne matche aucun item exact
  const exactMatch = useMemo(() => {
    if (!q) return null;
    return allItems.find(e => norm(e.name) === q) || null;
  }, [allItems, q]);

  useEffect(() => { setActiveIdx(0); }, [q]);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (item) => {
    onPick?.(item);
    setOpen(false);
  };

  const toggleFav = (name) => {
    setFavoriteExercises?.(prev => {
      const arr = prev || [];
      const key = norm(name);
      return arr.some(n => norm(n) === key)
        ? arr.filter(n => norm(n) !== key)
        : [...arr, name];
    });
  };

  const hideItem = (name) => {
    setHiddenExercises?.(prev => {
      const arr = prev || [];
      const key = norm(name);
      return arr.some(n => norm(n) === key) ? arr : [...arr, name];
    });
  };

  const deleteCustom = (name) => {
    const key = norm(name);
    setCustomExercises?.(prev => (prev || []).filter(c => norm(c.name) !== key));
  };

  const addCustom = (name, category) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const key = norm(trimmed);
    setCustomExercises?.(prev => {
      const arr = prev || [];
      if (arr.some(c => norm(c.name) === key)) return arr;
      return [...arr, { name: trimmed, category: category || defaultCategory }];
    });
    pick({ name: trimmed, category: category || defaultCategory });
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx(i => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[activeIdx]) pick(matches[activeIdx]);
      else if (q && !exactMatch) addCustom(value, defaultCategory);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showAddRow = !!q && !exactMatch;

  return (
    <div ref={wrapRef} style={{ flex: 1, position: "relative" }}>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Rechercher un exercice…"
        style={{ ...input(), borderRadius: 10, padding: "6px 10px", fontWeight: 500, width: "100%" }}
      />
      {open && (matches.length > 0 || showAddRow) && (
        <div
          role="listbox"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: T.white, border: `1px solid ${T.border}`, borderRadius: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 100,
            maxHeight: 280, overflowY: "auto", padding: 4, fontFamily: "var(--font-sans)",
          }}
        >
          {matches.map((m, i) => {
            const cat = CATEGORIES.find(c => c.id === m.category) || CATEGORIES[4];
            const active = i === activeIdx;
            const isFav = m._fav;
            return (
              <div
                key={m.name}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  width: "100%", padding: "4px 6px 4px 8px", borderRadius: 8,
                  background: active ? T.accentBg : "transparent",
                }}
              >
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pick({ name: m.name, category: m.category }); }}
                  style={{
                    flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8,
                    padding: "4px 4px", border: "none", background: "transparent",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    color: T.text, fontSize: 12,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name}
                    {m.custom && <span style={{ color: T.textMut, fontSize: 10, marginLeft: 6, fontWeight: 400 }}>(perso)</span>}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: cat.color, background: `${cat.color}18`,
                    padding: "1px 7px", borderRadius: 999, flexShrink: 0,
                  }}>{cat.label}</span>
                </button>
                <button
                  type="button"
                  title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                  onMouseDown={(e) => { e.preventDefault(); toggleFav(m.name); }}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 22, height: 22, border: "none", background: "transparent",
                    cursor: "pointer", borderRadius: 4, flexShrink: 0,
                    color: isFav ? "#F59E0B" : T.textMut,
                  }}
                >
                  <Star size={12} strokeWidth={1.75} fill={isFav ? "#F59E0B" : "none"} />
                </button>
                {m.custom ? (
                  <button
                    type="button"
                    title="Supprimer cet exercice"
                    onMouseDown={(e) => { e.preventDefault(); deleteCustom(m.name); }}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 22, height: 22, border: "none", background: "transparent",
                      cursor: "pointer", borderRadius: 4, flexShrink: 0, color: T.textMut,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; }}
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Masquer cet exercice"
                    onMouseDown={(e) => { e.preventDefault(); hideItem(m.name); }}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 22, height: 22, border: "none", background: "transparent",
                      cursor: "pointer", borderRadius: 4, flexShrink: 0, color: T.textMut,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; }}
                  >
                    <EyeOff size={12} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            );
          })}
          {showAddRow && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addCustom(value, defaultCategory); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "6px 10px", marginTop: matches.length > 0 ? 4 : 0,
                borderTop: matches.length > 0 ? `1px solid ${T.border}` : "none",
                border: matches.length > 0 ? "none" : "none",
                background: "transparent", cursor: "pointer", borderRadius: 8,
                color: T.text, fontSize: 12, fontFamily: "inherit", textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Plus size={12} strokeWidth={2} />
              Ajouter « {value} » comme nouvel exercice
            </button>
          )}
          {(hiddenExercises || []).length > 0 && (
            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 4, padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: T.textMut }}>
              <span>{(hiddenExercises || []).length} masqué{(hiddenExercises || []).length > 1 ? "s" : ""}</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setHiddenExercises?.([]); }}
                style={{
                  border: "none", background: "transparent", cursor: "pointer",
                  color: T.textSub, fontSize: 11, fontWeight: 500, fontFamily: "inherit",
                  padding: "2px 6px", borderRadius: 4,
                }}
              >
                Tout réafficher
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DateField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef(null);
  const popRef = React.useRef(null);
  const [rect, setRect] = useState(null);
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  useEffect(() => {
    if (!open) { setRect(null); return; }
    const update = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); };
    update();
    const onDoc = (e) => {
      if ((popRef.current && popRef.current.contains(e.target)) ||
          (btnRef.current && btnRef.current.contains(e.target))) return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const label = value
    ? new Date(value + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "Choisir…";

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...input(),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
          textAlign: "left",
          color: value ? T.text : T.textMut,
          background: open ? T.accentBg : T.white,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <Calendar size={13} strokeWidth={1.75} color={T.textSub} />
      </button>
      {open && rect && typeof document !== "undefined" && ReactDOM.createPortal(
        (() => {
          const POPOVER_H = 320;
          const vh = typeof window !== "undefined" ? window.innerHeight : 800;
          const vw = typeof window !== "undefined" ? window.innerWidth : 0;
          const wouldOverflow = rect.bottom + POPOVER_H + 12 > vh;
          const top = wouldOverflow ? Math.max(4, vh - POPOVER_H - 4) : rect.bottom + 6;
          return (
            <div ref={popRef} style={{ position: "fixed", top, left: Math.max(8, Math.min(rect.left, vw - 296)), zIndex: 10000 }}>
              <MiniCalendar
                value={value}
                viewDate={viewDate}
                setViewDate={setViewDate}
                onPick={(iso) => { onChange(iso); setOpen(false); }}
              />
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}

function MiniCalendar({ value, viewDate, setViewDate, onPick }) {
  const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const WD = ["L", "M", "M", "J", "V", "S", "D"];
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const lead = dow === 0 ? 6 : dow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const selected = value ? new Date(value + "T00:00:00") : null;
  const todayISO = (() => { const d = new Date(); return toISO(d); })();

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div style={{
      width: 280, background: T.white, border: `1px solid ${T.border}`, borderRadius: 16,
      boxShadow: "0 12px 32px rgba(0,0,0,0.10)", padding: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button type="button" onClick={goPrev}
          style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} />
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{MONTHS[month]} {year}</div>
        <button type="button" onClick={goNext}
          style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <ChevronDown size={14} style={{ transform: "rotate(-90deg)" }} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WD.map((w, i) => (
          <div key={i} style={{ fontSize: 10, color: T.textMut, textAlign: "center", padding: "4px 0", fontWeight: 500 }}>{w}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toISO(d);
          const isSel = selected && toISO(selected) === iso;
          const isToday = iso === todayISO;
          return (
            <button key={i} type="button" onClick={() => onPick(iso)}
              style={{
                width: "100%", aspectRatio: "1 / 1",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: isSel ? 600 : 500,
                color: isSel ? "#fff" : T.text,
                background: isSel ? T.text : "transparent",
                border: isToday && !isSel ? `1px solid ${T.border}` : "none",
                borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                transition: "background .1s ease",
              }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = T.accentBg; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SetInput({ value, onChange, placeholder, small }) {
  return (
    <input
      type="number" inputMode="decimal" step="any"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: small ? "0 0 64px" : 1, minWidth: 0,
        padding: "5px 9px", borderRadius: 10,
        border: `1px solid ${T.border}`, fontSize: 12,
        fontFamily: "inherit", outline: "none", color: T.text,
        background: T.white, fontVariantNumeric: "tabular-nums",
      }}
    />
  );
}
