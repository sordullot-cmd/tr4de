"use client";

import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import { useCloudState } from "@/lib/hooks/useCloudState";
import {
  Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight,
  TrendingUp, Trophy, Flame, Calendar, Clock,
  Dumbbell, Activity, Bike, Footprints, Heart,
} from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5", text: "#0D0D0D",
  textSub: "#5C5C5C", textMut: "#8E8E8E",
  bg: "#FAFAFA", accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#16A34A", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
  purple: "#8B5CF6", cyan: "#06B6D4",
};

/* ─── Constantes ──────────────────────────────────────────────────── */

const DISCIPLINES = [
  { id: "musculation",  label: "Musculation",  Icon: Dumbbell,   color: "#0D0D0D" },
  { id: "calisthenics", label: "Callisthénie", Icon: Activity,   color: "#3B82F6" },
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
  const [sessions, setSessions] = useCloudState("tr4de_sport_sessions", "sport_sessions", []);

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
  const save = () => {
    if (!form.date) return;
    const data = {
      date: form.date,
      discipline: form.discipline,
      duration: parseFloat(form.duration) || 0,
      notes: (form.notes || "").trim(),
      exercises: (form.exercises || [])
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
              rpe: parseFloat(set.rpe) || null,
            })),
        })),
    };
    if (editingId) {
      setSessions(prev => (prev || []).map(s => s.id === editingId ? { ...s, ...data } : s));
    } else {
      const id = Date.now();
      setSessions(prev => [...(prev || []), { id, createdAt: new Date(id).toISOString(), ...data }]);
    }
    close();
  };
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

    // Streak : jours consécutifs avec au moins 1 séance, en remontant depuis aujourd'hui
    const dateSet = new Set(all.map(s => s.date));
    let streak = 0;
    const cur = new Date();
    cur.setHours(0, 0, 0, 0);
    // Si pas de séance aujourd'hui, on tolère 1 jour de pause sans casser le streak.
    let toleranceUsed = !dateSet.has(toISOLocal(cur));
    while (true) {
      const iso = toISOLocal(cur);
      if (dateSet.has(iso)) {
        streak++;
        cur.setDate(cur.getDate() - 1);
        toleranceUsed = false;
      } else if (!toleranceUsed && streak > 0) {
        toleranceUsed = true;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
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
          Suivi sportif
        </h1>
        <button onClick={openCreate}
          style={{ marginLeft: "auto", padding: "7px 16px", height: 34, borderRadius: 999, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Nouvelle séance
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {/* KPIs — carte fusionnée */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <KpiCell label="Séances cette semaine" value={String(stats.sessionsThisWeek)} sub={`${stats.total} au total`} />
          <KpiCell label="Streak" value={`${stats.streak} j`} sub={stats.streak >= 2 ? "Garde le rythme" : "Lance ta série"} valueColor={stats.streak >= 2 ? T.amber : undefined}
            icon={stats.streak >= 2 ? Flame : undefined} />
          <KpiCell label="Records personnels" value={String(prs.length)} sub={prs[0] ? `${prs[0].name} · ${prs[0].weight} kg` : "Logge des séries"} icon={Trophy} />
          <KpiCell label="Volume semaine" value={`${Math.round(stats.volumeWeek).toLocaleString("fr-FR")} kg`} sub="kg × reps" last />
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <FilterPills
          value={filterDiscipline}
          onChange={setFilterDiscipline}
          options={[{ id: "all", label: "Toutes" }, ...DISCIPLINES.map(d => ({ id: d.id, label: d.label }))]}
        />
        <FilterPills
          value={filterCategory}
          onChange={setFilterCategory}
          options={[{ id: "all", label: "Toutes catégories" }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label, color: c.color }))]}
        />
      </div>

      {/* Layout en 2 colonnes : sessions à gauche, PR + chart à droite */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 1fr)", gap: 16, alignItems: "start" }}>

        {/* Colonne gauche : historique */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textSub, paddingLeft: 4 }}>Historique des séances</div>
          {filteredSessions.length === 0 ? (
            <div style={{
              border: `1px dashed ${T.border}`, borderRadius: 12, padding: 28,
              textAlign: "center", background: T.white, color: T.textMut, fontSize: 13,
            }}>
              Aucune séance pour le moment. Crée ta première séance pour commencer à suivre ta progression.
            </div>
          ) : (
            filteredSessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                onEdit={() => openEdit(s)}
                onDelete={() => remove(s.id)}
              />
            ))
          )}
        </div>

        {/* Colonne droite : PRs + chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PRsCard prs={prs} />
          <ProgressChart
            allExerciseNames={allExerciseNames}
            selected={chartExerciseName}
            onChangeSelected={setChartExerciseName}
            data={chartData}
          />
        </div>
      </div>

      {/* Modal de création / édition */}
      {showForm && typeof document !== "undefined" && ReactDOM.createPortal(
        <SessionForm form={form} setForm={setForm} editingId={editingId} onClose={close} onSave={save} />,
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

  return (
    <div style={{
      background: T.white, border: `1px solid ${T.border}`, borderRadius: 12,
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
            const cat = CATEGORIES.find(c => c.id === ex.category) || CATEGORIES[4];
            return (
              <div key={ex.id || i} style={{ paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{ex.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: cat.color, background: `${cat.color}18`,
                    padding: "1px 7px", borderRadius: 999,
                  }}>{cat.label}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {(ex.sets || []).map((set, si) => (
                    <div key={set.id || si} style={{ fontSize: 11, color: T.textSub, fontVariantNumeric: "tabular-nums" }}>
                      <span style={{ color: T.textMut, marginRight: 8 }}>Série {si + 1}</span>
                      {set.reps != null && <span>{set.reps} reps</span>}
                      {set.weight != null && <span> · {set.weight} kg</span>}
                      {set.distance != null && <span> · {set.distance} km</span>}
                      {set.time != null && <span> · {set.time} min</span>}
                      {set.rpe != null && <span style={{ color: T.textMut }}> · RPE {set.rpe}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {s.notes && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: T.bg, borderRadius: 6, fontSize: 11, color: T.textSub, fontStyle: "italic", lineHeight: 1.45 }}>
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
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <Trophy size={13} strokeWidth={1.75} color={T.amber} />
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, letterSpacing: -0.05 }}>Records personnels</div>
      </div>
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
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <TrendingUp size={13} strokeWidth={1.75} color={T.green} />
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, letterSpacing: -0.05 }}>Progression</div>
        {allExerciseNames.length > 0 && (
          <select
            value={selected}
            onChange={(e) => onChangeSelected(e.target.value)}
            style={{
              marginLeft: "auto",
              padding: "3px 8px", borderRadius: 6,
              border: `1px solid ${T.border}`, background: T.white,
              fontSize: 11, color: T.text, fontFamily: "inherit", cursor: "pointer",
              maxWidth: 160,
            }}
          >
            {allExerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>
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
function SessionForm({ form, setForm, editingId, onClose, onSave }) {
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
  const addSet = (eid) => {
    setForm(prev => ({
      ...prev,
      exercises: (prev.exercises || []).map(e => e.id === eid
        ? { ...e, sets: [...(e.sets || []), { id: Date.now() + Math.floor(Math.random() * 1000), reps: "", weight: "" }] }
        : e),
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
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: "min(640px, 100%)", maxHeight: "min(88vh, 820px)", display: "flex", flexDirection: "column", background: T.white, borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden", fontFamily: "var(--font-sans)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
            {editingId ? "Modifier la séance" : "Nouvelle séance"}
          </div>
          <button onClick={onClose} aria-label="Fermer"
            style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.bg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
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
                      padding: "9px 11px", borderRadius: 8,
                      border: `1px solid ${active ? d.color : T.border}`,
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
              <input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={input()} />
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
                <div key={ex.id} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <input
                      type="text" value={ex.name}
                      onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                      placeholder="Ex. Développé couché"
                      style={{ flex: 1, ...input(), padding: "6px 10px", fontWeight: 500 }}
                    />
                    <select
                      value={ex.category}
                      onChange={(e) => updateExercise(ex.id, { category: e.target.value })}
                      style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
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
                        <SetInput value={set.rpe} onChange={(v) => updateSet(ex.id, set.id, { rpe: v })} placeholder="RPE" small />
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
              style={{ ...input(), resize: "vertical", lineHeight: 1.45 }} />
          </label>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "transparent", color: T.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={onSave}
            disabled={!form.date}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: form.date ? T.text : "#F0F0F0",
              color: form.date ? T.white : T.textMut,
              fontSize: 13, fontWeight: 600,
              cursor: form.date ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            <Check size={13} strokeWidth={2} /> {editingId ? "Enregistrer" : "Créer"}
          </button>
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
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit",
    outline: "none", color: T.text, background: T.white,
  };
}

function SetInput({ value, onChange, placeholder, small }) {
  return (
    <input
      type="number" inputMode="decimal" step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: small ? "0 0 64px" : 1, minWidth: 0,
        padding: "5px 9px", borderRadius: 6,
        border: `1px solid ${T.border}`, fontSize: 12,
        fontFamily: "inherit", outline: "none", color: T.text,
        background: T.white, fontVariantNumeric: "tabular-nums",
      }}
    />
  );
}
