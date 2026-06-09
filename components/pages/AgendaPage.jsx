"use client";

import React from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  LogOut, AlertTriangle, Plug, Trash2, X as IconX, ExternalLink,
  Clock, MapPin, AlignLeft, Bell, ChevronDown,
} from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t, useLang } from "@/lib/i18n";
import { useGoogleCalendar } from "@/lib/hooks/useGoogleCalendar";

/* ─────────────── Helpers date ─────────────── */
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKDAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const WEEKDAYS_MIN = ["L", "M", "M", "J", "V", "S", "D"];
// Style des libellés de jour repris de la page Calendrier : léger, discret,
// sans majuscules ni interlettrage marqué (uniquement le visuel, pas le format).
const dayLabelStyle = { fontSize: 10, fontWeight: 500, textAlign: "center", color: T.textMut };
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a, b) => dateKey(a) === dateKey(b);
const weekdayIdx = (d) => (d.getDay() + 6) % 7; // 0 = lundi

function startOfWeekMonday(d) {
  const x = startOfDay(d);
  return addDays(x, -weekdayIdx(x));
}

function eventDayKey(ev) {
  if (!ev.start) return null;
  if (ev.allDay) return ev.start.slice(0, 10);
  const d = new Date(ev.start);
  return isNaN(d.getTime()) ? null : dateKey(d);
}

function eventTimeLabel(ev) {
  if (ev.allDay) return "Journée";
  const d = new Date(ev.start);
  if (isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Palette des couleurs Google Agenda (colorId 1–11), version claire / douce / pastel.
// Teintes pastel franches ; encore adoucies à l'affichage via la transparence
// (~45 %) appliquée aux fonds d'évènements.
const GCAL_COLORS = {
  1: "#B7BEEA",  // Lavande
  2: "#A8E0C5",  // Sauge
  3: "#D2B3E2",  // Raisin
  4: "#F6C2BC",  // Flamant
  5: "#FCE7A6",  // Banane
  6: "#F9C3AC",  // Tangerine
  7: "#ABD9F4",  // Paon
  8: "#CFCFCF",  // Graphite
  9: "#B3BAE8",  // Myrtille
  10: "#A6D7BC", // Basilic
  11: "#F4B5B5", // Tomate
};
// Couleur par défaut (évènement sans colorId) : bleu pastel doux.
const DEFAULT_EVENT_COLOR = "#B5D2F2";
const eventColor = (ev) => GCAL_COLORS[ev.colorId] || DEFAULT_EVENT_COLOR;

/* ─────────────── Helpers formulaire évènement ─────────────── */
const localTZ = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } };
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toISO = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00`).toISOString();
function addDayStr(dateStr, n) { const d = new Date(`${dateStr}T00:00:00`); d.setDate(d.getDate() + n); return dateKey(d); }

/** "Dimanche, 14 juin" à partir d'une date "YYYY-MM-DD". */
function formatDateLong(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return `${WEEKDAYS_FULL[weekdayIdx(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`;
}

/** Résumé lisible de la plage (façon Google Agenda). */
function summarizeWhen(form) {
  if (form.allDay) {
    const base = formatDateLong(form.date);
    return form.endDate && form.endDate !== form.date
      ? `${base} – ${formatDateLong(form.endDate)}`
      : `${base} · Toute la journée`;
  }
  return `${formatDateLong(form.date)}  ${form.startTime} – ${form.endTime}`;
}

/** Déduit le champ `reminder` (minutes | "default" | "none") depuis l'évènement. */
function reminderFromEvent(ev) {
  const r = ev.reminders;
  if (!r) return 10;
  if (r.useDefault) return "default";
  if (Array.isArray(r.overrides) && r.overrides.length) return r.overrides[0].minutes;
  return "none";
}

/** Form vierge pour la création. */
function blankForm(day, startTime = "09:00", endTime = "10:00") {
  const dk = typeof day === "string" ? day : dateKey(day);
  return {
    kind: "event", done: false,
    id: null, htmlLink: null, summary: "", allDay: false, date: dk, endDate: dk, startTime, endTime,
    location: "", description: "", guests: "", addMeet: false, hadMeet: false,
    colorId: null, transparency: "opaque", visibility: "default", reminder: 10,
  };
}

/** Form pré-rempli depuis un évènement existant (ou une tâche-évènement). */
function formFromEvent(ev) {
  const summary = ev.summary === "(Sans titre)" ? "" : ev.summary;
  const common = {
    kind: ev.isTask ? "task" : "event", done: !!ev.done,
    id: ev.id, htmlLink: ev.htmlLink,
    location: ev.location || "", description: ev.description || "", colorId: ev.colorId || null,
    guests: (ev.guests || []).join(", "),
    addMeet: !!ev.hangoutLink, hadMeet: !!ev.hangoutLink,
    transparency: ev.transparency || "opaque", visibility: ev.visibility || "default",
    reminder: reminderFromEvent(ev),
  };
  if (ev.allDay) {
    const startD = ev.start.slice(0, 10);
    let endIncl = ev.end ? addDayStr(ev.end.slice(0, 10), -1) : startD; // end exclusif → inclusif
    if (endIncl < startD) endIncl = startD;
    return { ...common, summary, allDay: true, date: startD, endDate: endIncl, startTime: "09:00", endTime: "10:00" };
  }
  const s = new Date(ev.start);
  const e = ev.end ? new Date(ev.end) : new Date(s.getTime() + 3600000);
  const dk = dateKey(s);
  return { ...common, summary, allDay: false, date: dk, endDate: dk, startTime: hhmm(s), endTime: hhmm(e) };
}

/** Construit le payload API à partir du form. */
function payloadFromForm(form) {
  const tz = localTZ();
  const guests = String(form.guests || "").split(/[,;\s]+/).map((g) => g.trim()).filter((g) => /.+@.+\..+/.test(g));
  const extra = {
    colorId: form.colorId || null,
    guests,
    addMeet: !!form.addMeet,
    hadMeet: !!form.hadMeet,
    transparency: form.transparency || "opaque",
    visibility: form.visibility || "default",
    reminder: form.reminder,
    isTask: form.kind === "task",
    done: !!form.done,
  };
  if (form.allDay) {
    return {
      summary: form.summary, location: form.location, description: form.description,
      allDay: true, start: form.date, end: addDayStr(form.endDate || form.date, 1), timeZone: tz,
      ...extra,
    };
  }
  let start = toISO(form.date, form.startTime);
  let end = toISO(form.date, form.endTime);
  if (new Date(end) <= new Date(start)) end = new Date(new Date(start).getTime() + 3600000).toISOString();
  return { summary: form.summary, location: form.location, description: form.description, allDay: false, start, end, timeZone: tz, ...extra };
}

const VIEWS = [
  { id: "day", label: "Jour" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
  { id: "year", label: "Année" },
];

const REMINDER_OPTS = [
  { v: "none", label: "Aucune notification" },
  { v: 0, label: "À l'heure de l'évènement" },
  { v: 5, label: "5 minutes avant" },
  { v: 10, label: "10 minutes avant" },
  { v: 30, label: "30 minutes avant" },
  { v: 60, label: "1 heure avant" },
  { v: 1440, label: "1 jour avant" },
  { v: "default", label: "Notifications par défaut" },
];

const HOUR_H = 68; // hauteur d'une heure (px) dans le time-grid

/* ─────────────── Plage de dates par mode ─────────────── */
function computeRange(view, cursor) {
  if (view === "day") {
    const s = startOfDay(cursor);
    return { start: s, end: addDays(s, 1) };
  }
  if (view === "week") {
    const s = startOfWeekMonday(cursor);
    return { start: s, end: addDays(s, 7) };
  }
  if (view === "year") {
    return { start: new Date(cursor.getFullYear(), 0, 1), end: new Date(cursor.getFullYear() + 1, 0, 1) };
  }
  // month
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeekMonday(monthStart);
  return { start: gridStart, end: addDays(gridStart, 42) };
}

function shiftCursor(view, cursor, dir) {
  if (view === "day") return addDays(cursor, dir);
  if (view === "week") return addDays(cursor, dir * 7);
  if (view === "year") return new Date(cursor.getFullYear() + dir, cursor.getMonth(), cursor.getDate());
  return new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
}

function titleFor(view, cursor) {
  if (view === "day") {
    return `${WEEKDAYS_FULL[weekdayIdx(cursor)]} ${cursor.getDate()} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }
  if (view === "week") {
    const s = startOfWeekMonday(cursor);
    const e = addDays(s, 6);
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
      return `${s.getDate()} – ${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
    return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  }
  if (view === "year") return String(cursor.getFullYear());
  return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
}

/** Positionne les évènements horodatés d'un jour (clusters + colonnes). */
function layoutDay(evts, day) {
  const dayStart = startOfDay(day);
  const timed = (evts || [])
    .filter((e) => !e.allDay && e.start)
    .map((e) => {
      const s = new Date(e.start);
      const en = e.end ? new Date(e.end) : new Date(s.getTime() + 30 * 60000);
      let startMin = Math.max(0, (s - dayStart) / 60000);
      let endMin = Math.min(24 * 60, (en - dayStart) / 60000);
      if (endMin <= startMin) endMin = startMin + 30;
      return { ...e, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  // Clusters d'évènements qui se chevauchent.
  const clusters = [];
  let cluster = [];
  let clusterEnd = -1;
  for (const ev of timed) {
    if (cluster.length && ev.startMin >= clusterEnd) {
      clusters.push(cluster);
      cluster = [];
      clusterEnd = -1;
    }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endMin);
  }
  if (cluster.length) clusters.push(cluster);

  const out = [];
  for (const cl of clusters) {
    const colEnds = [];
    for (const ev of cl) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (ev.startMin >= colEnds[c]) { ev._col = c; colEnds[c] = ev.endMin; placed = true; break; }
      }
      if (!placed) { ev._col = colEnds.length; colEnds.push(ev.endMin); }
    }
    for (const ev of cl) { ev._cols = colEnds.length; out.push(ev); }
  }
  return out;
}

/* ─────────────── Composant ─────────────── */
export default function AgendaPage() {
  useLang();
  const {
    ready, configured, connected, connect, disconnect,
    fetchEvents, createEvent, updateEvent, deleteEvent, setEventDone,
  } = useGoogleCalendar();

  const [view, setView] = React.useState("week");
  const [cursor, setCursor] = React.useState(() => startOfDay(new Date()));
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [modal, setModal] = React.useState(null); // form objet | null
  const [modalError, setModalError] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [colorOpen, setColorOpen] = React.useState(false);
  const [remindOpen, setRemindOpen] = React.useState(false);
  const [timeEdit, setTimeEdit] = React.useState(false);
  const dragRef = React.useRef(null);
  const [dragBox, setDragBox] = React.useState(null); // { dayKey, a, b } en minutes

  const range = React.useMemo(() => computeRange(view, cursor), [view, cursor]);

  const loadEvents = React.useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError(null);
    try {
      const evs = await fetchEvents(range.start.toISOString(), range.end.toISOString());
      setEvents(evs);
    } catch (e) {
      setEvents([]);
      if (e?.message !== "token_expired") setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [connected, range, fetchEvents]);

  React.useEffect(() => { loadEvents(); }, [loadEvents]);

  const eventsByDay = React.useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const k = eventDayKey(ev);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.allDay === b.allDay ? String(a.start).localeCompare(String(b.start)) : a.allDay ? -1 : 1));
    }
    return map;
  }, [events]);

  const today = startOfDay(new Date());

  // Bascule l'état "terminé" d'une tâche-évènement (optimiste).
  const onToggleDone = async (ev) => {
    setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, done: !x.done } : x)));
    try { await setEventDone(ev.id, !ev.done); } catch { loadEvents(); }
  };

  const goToday = () => setCursor(startOfDay(new Date()));
  const openDay = (d) => { setCursor(startOfDay(d)); setView("day"); };
  const openCreate = (day, startTime, endTime) => { setModalError(null); setColorOpen(false); setRemindOpen(false); setTimeEdit(false); setModal(blankForm(day || cursor, startTime, endTime)); };
  const openEdit = (ev) => { setModalError(null); setColorOpen(false); setRemindOpen(false); setTimeEdit(false); setModal(formFromEvent(ev)); };

  // Click & drag dans le time-grid : on dessine une plage horaire puis on ouvre
  // le modal de création pré-rempli. Un simple clic crée un évènement d'1 h.
  const startDrag = (e, d) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const columnTop = e.currentTarget.getBoundingClientRect().top;
    const snap = (clientY) => {
      const raw = ((clientY - columnTop) / HOUR_H) * 60;
      return Math.max(0, Math.min(24 * 60, Math.round(raw / 15) * 15));
    };
    const startMin = snap(e.clientY);
    const dk = dateKey(d);
    dragRef.current = { startMin, endMin: startMin + 15 };
    setDragBox({ dayKey: dk, a: startMin, b: startMin + 15 });

    const onMove = (ev) => {
      const cur = snap(ev.clientY);
      dragRef.current.endMin = cur;
      setDragBox({ dayKey: dk, a: dragRef.current.startMin, b: cur });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const cur = dragRef.current;
      dragRef.current = null;
      setDragBox(null);
      if (!cur) return;
      let lo = Math.min(cur.startMin, cur.endMin);
      let hi = Math.max(cur.startMin, cur.endMin);
      if (hi - lo < 15) hi = Math.min(24 * 60, lo + 60); // simple clic → 1 h
      const st = `${pad(Math.floor(lo / 60))}:${pad(lo % 60)}`;
      const et = `${pad(Math.floor(hi / 60) % 24)}:${pad(hi % 60)}`;
      openCreate(d, st, et);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const saveModal = async () => {
    if (!modal) return;
    setSaving(true);
    setModalError(null);
    try {
      const payload = payloadFromForm(modal);
      if (modal.id) await updateEvent(modal.id, payload);
      else await createEvent(payload);
      setModal(null);
      await loadEvents();
    } catch (e) {
      if (e?.message === "insufficient_scope") { setModal(null); setError("insufficient_scope"); }
      else setModalError(e?.message || "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const removeModal = async () => {
    if (!modal?.id) return;
    setSaving(true);
    setModalError(null);
    try {
      await deleteEvent(modal.id);
      setModal(null);
      await loadEvents();
    } catch (e) {
      if (e?.message === "insufficient_scope") { setModal(null); setError("insufficient_scope"); }
      else setModalError(e?.message || "Erreur de suppression");
    } finally {
      setSaving(false);
    }
  };

  // Scroll auto vers ~7h dans le time-grid (jour / semaine).
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if ((view === "day" || view === "week") && scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_H;
    }
  }, [view, cursor]);

  /* ─────────────── Header ─────────────── */
  const segmented = (
    <div style={{ display: "inline-flex", background: T.accentBg, borderRadius: 999, padding: 3, gap: 2 }}>
      {VIEWS.map((v) => {
        const active = v.id === view;
        return (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: "5px 14px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
              background: active ? T.white : "transparent",
              color: active ? T.text : T.textMut,
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>
        {t("nav.agenda")}
      </h1>
      {connected && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setCursor(shiftCursor(view, cursor, -1))} aria-label="Précédent" style={iconBtn()}>
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <div style={{ minWidth: 180, textAlign: "center", fontSize: 14, fontWeight: 600, color: T.text }}>
              {titleFor(view, cursor)}
            </div>
            <button onClick={() => setCursor(shiftCursor(view, cursor, 1))} aria-label="Suivant" style={iconBtn()}>
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <button onClick={goToday} style={ghostBtn()}>Aujourd'hui</button>
        </>
      )}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {connected && (
          <>
            {segmented}
            <button onClick={disconnect} aria-label="Déconnecter" title="Déconnecter" style={iconBtn()}>
              <LogOut size={15} strokeWidth={2} />
            </button>
          </>
        )}
      </div>
      <div id="tr4de-page-header-slot" />
    </div>
  );

  /* ─────────────── Time-grid (jour / semaine) ─────────────── */
  const renderTimeGrid = (daysCount) => {
    const weekStart = daysCount === 1 ? startOfDay(cursor) : startOfWeekMonday(cursor);
    const days = Array.from({ length: daysCount }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const gutter = 54;

    return (
      <div style={{ ...card(), border: "none", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* En-tête jours */}
        <div style={{ display: "flex" }}>
          <div style={{ width: gutter, flexShrink: 0 }} />
          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            return (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 4px", minWidth: 0, borderLeft: daysCount > 1 && i > 0 ? `1px solid ${T.border}` : "none" }}>
                <div style={dayLabelStyle}>{WEEKDAYS[weekdayIdx(d)]}</div>
                <div style={{
                  marginTop: 3, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 26, height: 26, borderRadius: 999, padding: "0 7px",
                  fontSize: 14, fontWeight: isToday ? 700 : 600,
                  background: isToday ? T.text : "transparent", color: isToday ? "#fff" : T.text,
                }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Bandeau jour entier */}
        <div style={{ display: "flex", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, minHeight: 26 }}>
          <div style={{ width: gutter, flexShrink: 0, fontSize: 9, color: T.textMut, padding: "5px 6px", textAlign: "right" }}>Jour</div>
          {days.map((d, i) => {
            const dk = dateKey(d);
            const allDay = (eventsByDay.get(dk) || []).filter((e) => e.allDay);
            return (
              <div key={i} style={{ flex: 1, borderLeft: daysCount > 1 && i > 0 ? `1px solid ${T.border}` : "none", padding: 3, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                {allDay.map((ev) => (
                  <div key={ev.id} onClick={() => openEdit(ev)} title={ev.summary}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: ev.done ? T.textMut : T.text, background: `${eventColor(ev)}${ev.isTask ? "26" : "73"}`, borderRadius: 4, padding: "1px 6px", minWidth: 0 }}>
                    {ev.isTask && <TaskCircle done={ev.done} onToggle={(e) => { e.stopPropagation(); onToggleDone(ev); }} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: ev.isTask && ev.done ? "line-through" : "none" }}>{ev.summary}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Grille horaire */}
        <div ref={scrollRef} style={{ overflowY: "auto" }}>
          <div style={{ display: "flex", position: "relative" }}>
            {/* Gouttière heures */}
            <div style={{ width: gutter, flexShrink: 0 }}>
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_H, position: "relative" }}>
                  {h !== 0 && <span style={{ position: "absolute", top: -7, right: 8, fontSize: 10, color: T.textMut }}>{pad(h)}:00</span>}
                </div>
              ))}
            </div>
            {/* Colonnes jours */}
            {days.map((d, di) => {
              const layout = layoutDay(eventsByDay.get(dateKey(d)) || [], d);
              const dk = dateKey(d);
              const dragHere = dragBox && dragBox.dayKey === dk;
              return (
                <div key={di} onMouseDown={(e) => startDrag(e, d)} title="Glisser pour créer un évènement" style={{
                  flex: 1, position: "relative", minWidth: 0, cursor: "pointer", userSelect: "none",
                  borderLeft: daysCount > 1 && di > 0 ? `1px solid ${T.border}` : "none",
                  backgroundImage: `repeating-linear-gradient(to bottom, ${T.border}, ${T.border} 1px, transparent 1px, transparent ${HOUR_H}px)`,
                  height: 24 * HOUR_H,
                }}>
                  {dragHere && (() => {
                    const lo = Math.min(dragBox.a, dragBox.b);
                    const hi = Math.max(dragBox.a, dragBox.b);
                    return (
                      <div style={{
                        position: "absolute", top: (lo / 60) * HOUR_H, height: Math.max(((hi - lo) / 60) * HOUR_H, 3),
                        left: 2, right: 2, background: `${T.blue}33`, border: `1px solid ${T.blue}`,
                        borderRadius: 5, pointerEvents: "none", zIndex: 5,
                      }} />
                    );
                  })()}
                  {layout.map((ev) => {
                    const top = (ev.startMin / 60) * HOUR_H;
                    const height = Math.max(((ev.endMin - ev.startMin) / 60) * HOUR_H, 16);
                    const w = 100 / ev._cols;
                    const left = ev._col * w;
                    const col = eventColor(ev);
                    // Évènements courts (≤ 30 min) : titre et heure sur une seule
                    // ligne, l'heure poussée à droite.
                    const compact = (ev.endMin - ev.startMin) <= 30;
                    return (
                      <div key={ev.id} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); openEdit(ev); }} title={`${eventTimeLabel(ev)} ${ev.summary}`}
                        style={{
                          position: "absolute", top, height, cursor: "pointer",
                          left: `calc(${left}% + 2px)`, width: `calc(${w}% - 4px)`,
                          background: ev.isTask ? `${col}26` : `${col}73`, borderLeft: `3px solid ${col}`, borderRadius: 5,
                          padding: "2px 5px", overflow: "hidden",
                          display: "flex", flexDirection: compact ? "row" : "column",
                          alignItems: compact ? "baseline" : "stretch", gap: compact ? 5 : 0,
                        }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: compact ? 1 : "none" }}>
                          {ev.isTask && <TaskCircle done={ev.done} onToggle={(e) => { e.stopPropagation(); onToggleDone(ev); }} />}
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: ev.done ? T.textMut : T.text, textDecoration: ev.isTask && ev.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.summary}</span>
                        </span>
                        {compact
                          ? <span style={{ fontSize: 9.5, color: T.textSub, flexShrink: 0, whiteSpace: "nowrap" }}>{eventTimeLabel(ev)}</span>
                          : (height > 28 && <span style={{ fontSize: 9.5, color: T.textSub }}>{eventTimeLabel(ev)}</span>)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────── Vue Mois ─────────────── */
  const renderMonth = () => {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeekMonday(monthStart);
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    return (
      <div style={{ ...card(), padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${T.border}` }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ ...dayLabelStyle, padding: "10px 8px" }}>{w}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(110px, 1fr)" }}>
          {days.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const dayEvents = eventsByDay.get(dateKey(d)) || [];
            const shown = dayEvents.slice(0, 4);
            const overflow = dayEvents.length - shown.length;
            return (
              <div key={i} onClick={() => openDay(d)}
                style={{
                  cursor: "pointer",
                  borderRight: i % 7 !== 6 ? `1px solid ${T.border}` : "none",
                  borderBottom: i < 35 ? `1px solid ${T.border}` : "none",
                  padding: "6px 6px 8px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0,
                  opacity: inMonth ? 1 : 0.4,
                }}>
                <div style={{
                  alignSelf: "flex-start", fontSize: 12, fontWeight: isToday ? 700 : 500,
                  color: isToday ? "#fff" : T.text, background: isToday ? T.text : "transparent",
                  borderRadius: 999, minWidth: 22, height: 22,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px",
                }}>{d.getDate()}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  {shown.map((ev) => (
                    <div key={ev.id} title={ev.summary} onClick={(e) => { e.stopPropagation(); openEdit(ev); }} style={{
                      display: "flex", alignItems: "center", gap: 4, minWidth: 0, cursor: "pointer",
                      fontSize: 10.5, color: ev.done ? T.textMut : T.text, background: `${eventColor(ev)}${ev.isTask ? "26" : "73"}`, borderRadius: 4, padding: "1px 5px",
                    }}>
                      {ev.isTask && <TaskCircle done={ev.done} onToggle={(e) => { e.stopPropagation(); onToggleDone(ev); }} size={12} />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: ev.isTask && ev.done ? "line-through" : "none" }}>
                        {!ev.allDay && !ev.isTask && <span style={{ color: T.textMut, marginRight: 3 }}>{eventTimeLabel(ev)}</span>}
                        {ev.summary}
                      </span>
                    </div>
                  ))}
                  {overflow > 0 && <div style={{ fontSize: 10, color: T.textMut, paddingLeft: 5 }}>+{overflow} autre{overflow > 1 ? "s" : ""}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ─────────────── Vue Année ─────────────── */
  const renderYear = () => {
    const year = cursor.getFullYear();
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {Array.from({ length: 12 }, (_, m) => {
          const first = new Date(year, m, 1);
          const startPad = weekdayIdx(first);
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          const cells = [];
          for (let i = 0; i < startPad; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));
          return (
            <div key={m} style={{ ...card(), padding: 12 }}>
              <button onClick={() => { setCursor(new Date(year, m, 1)); setView("month"); }}
                style={{ display: "block", width: "100%", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 8, fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1, textAlign: "center" }}>
                {MONTHS[m]}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {WEEKDAYS_MIN.map((w, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 9, color: T.textMut, fontWeight: 500 }}>{w}</div>
                ))}
                {cells.map((c, i) => {
                  if (!c) return <div key={i} />;
                  const isToday = sameDay(c, today);
                  const has = eventsByDay.has(dateKey(c));
                  return (
                    <button key={i} onClick={() => openDay(c)}
                      style={{
                        position: "relative", border: "none", cursor: "pointer", fontFamily: "inherit",
                        aspectRatio: "1 / 1", borderRadius: 6, fontSize: 10.5,
                        background: isToday ? T.text : has ? `${T.blue}1A` : "transparent",
                        color: isToday ? "#fff" : T.text, fontWeight: isToday || has ? 700 : 400,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      {c.getDate()}
                      {has && !isToday && <span style={{ position: "absolute", bottom: 2, width: 3, height: 3, borderRadius: "50%", background: T.blue }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ─────────────── Corps ─────────────── */
  let body = null;
  if (!ready || configured === null) {
    body = <div style={{ ...card(), padding: 48, textAlign: "center", color: T.textMut }}>Chargement…</div>;
  } else if (configured === false) {
    body = (
      <div style={{ ...card(), padding: 32, textAlign: "center" }}>
        <AlertTriangle size={28} strokeWidth={1.5} color={T.amber} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6 }}>Google Agenda non configuré</div>
        <p style={{ fontSize: 13, color: T.textSub, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
          L'administrateur doit renseigner <code style={codeStyle}>GOOGLE_CLIENT_ID</code> et{" "}
          <code style={codeStyle}>GOOGLE_CLIENT_SECRET</code> (variables d'environnement), puis déclarer l'URI de
          redirection <code style={codeStyle}>/api/google-calendar/callback</code> dans la Google Cloud Console.
        </p>
      </div>
    );
  } else if (connected && error === "insufficient_scope") {
    body = (
      <div style={{ ...card(), padding: 32, textAlign: "center" }}>
        <AlertTriangle size={28} strokeWidth={1.5} color={T.amber} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6 }}>Permission Google Calendar manquante</div>
        <p style={{ fontSize: 13, color: T.textSub, maxWidth: 480, margin: "0 auto 16px", lineHeight: 1.6 }}>
          La connexion a réussi, mais l'autorisation d'accès à ton agenda n'a pas été accordée. Reconnecte-toi
          en cochant bien la permission « Voir les évènements de ton agenda ». Si elle n'apparaît pas, le scope
          <code style={codeStyle}> calendar.readonly </code> doit d'abord être ajouté à l'écran de consentement OAuth
          dans la Google Cloud Console (et l'accès existant révoqué sur{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: T.blue }}>myaccount.google.com/permissions</a>).
        </p>
        <button onClick={() => { disconnect(); connect(); }} style={primaryBtn()}>
          <Plug size={15} strokeWidth={2} style={{ marginRight: 8 }} /> Reconnecter avec la permission
        </button>
      </div>
    );
  } else if (!connected) {
    body = (
      <div style={{ ...card(), padding: "48px 32px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: T.accentBg, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <CalendarIcon size={26} strokeWidth={1.5} color={T.text} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6 }}>Connecte ton Google Agenda</div>
        <p style={{ fontSize: 13, color: T.textSub, maxWidth: 380, margin: "0 auto 20px", lineHeight: 1.6 }}>
          Visualise tes évènements directement dans tr4de. L'accès est en lecture seule — rien n'est modifié dans ton agenda.
        </p>
        <button onClick={connect} style={primaryBtn()}>
          <Plug size={15} strokeWidth={2} style={{ marginRight: 8 }} /> Connecter Google Agenda
        </button>
      </div>
    );
  } else {
    body = (
      <>
        {error && error !== "insufficient_scope" && (
          <div style={{ fontSize: 12, color: T.red, background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 8, padding: "8px 12px" }}>
            {error}
          </div>
        )}
        {view === "day" && renderTimeGrid(1)}
        {view === "week" && renderTimeGrid(7)}
        {view === "month" && renderMonth()}
        {view === "year" && renderYear()}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {header}
      {body}
      {modal && (
        <div onClick={() => !saving && setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 24, overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card(), width: "100%", maxWidth: 540, padding: 0, marginTop: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            {/* Barre du haut */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {modal.id && (
                  <button onClick={removeModal} disabled={saving} aria-label="Supprimer" title="Supprimer" style={{ ...iconBtn(), border: "none", background: "transparent", color: T.textMut }}>
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                )}
                <button onClick={() => !saving && setModal(null)} aria-label="Fermer" style={{ ...iconBtn(), border: "none", background: "transparent", color: T.textMut }}>
                  <IconX size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Titre */}
            <div style={{ padding: "0 24px 0 58px" }}>
              <input autoFocus value={modal.summary} onChange={(e) => setModal({ ...modal, summary: e.target.value })} placeholder="Ajouter un titre"
                style={{ width: "100%", border: "none", borderBottom: `2px solid ${T.border}`, outline: "none", fontFamily: "inherit", fontSize: 22, fontWeight: 400, color: T.text, padding: "6px 0", background: "transparent" }} />
            </div>

            {/* Onglets Événement / Tâche (désactivés en édition d'un élément existant) */}
            <div style={{ display: "flex", gap: 6, padding: "12px 24px 4px 58px", alignItems: "center", flexWrap: "wrap" }}>
              {[{ k: "event", label: "Événement" }, { k: "task", label: "Tâche" }].map(({ k, label }) => {
                const active = modal.kind === k;
                const locked = !!modal.id; // on ne convertit pas un élément déjà créé
                return (
                  <button key={k} type="button" disabled={locked && !active}
                    onClick={() => !modal.id && setModal({ ...modal, kind: k })}
                    style={{
                      padding: "6px 14px", borderRadius: 999, border: "none", fontFamily: "inherit",
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      background: active ? `${T.blue}1A` : "transparent",
                      color: active ? T.blue : T.textMut,
                      opacity: locked && !active ? 0.4 : 1,
                      cursor: modal.id ? "default" : "pointer",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Corps */}
            <div style={{ padding: "8px 24px 6px" }}>
              {/* Date / heures — résumé lisible, éditable au clic */}
              <FormRow icon={Clock} top={timeEdit}>
                {!timeEdit ? (
                  <button type="button" onClick={() => setTimeEdit(true)}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "2px 0", width: "100%" }}>
                    <div style={{ fontSize: 15, color: T.text, display: "flex", alignItems: "baseline", gap: 24, flexWrap: "wrap" }}>
                      <span>{formatDateLong(modal.date)}</span>
                      <span>
                        {modal.allDay
                          ? (modal.endDate && modal.endDate !== modal.date ? `→ ${formatDateLong(modal.endDate)}` : "Toute la journée")
                          : `${modal.startTime} – ${modal.endTime}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: T.textMut, marginTop: 2 }}>Fuseau horaire · Une seule fois</div>
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <input type="date" value={modal.date} onChange={(e) => setModal({ ...modal, date: e.target.value })} style={subInp} />
                      {modal.allDay ? (
                        <>
                          <span style={{ color: T.textMut, fontSize: 13 }}>au</span>
                          <input type="date" value={modal.endDate} min={modal.date} onChange={(e) => setModal({ ...modal, endDate: e.target.value })} style={subInp} />
                        </>
                      ) : (
                        <>
                          <input type="time" value={modal.startTime} onChange={(e) => setModal({ ...modal, startTime: e.target.value })} style={subInp} />
                          <span style={{ color: T.textMut }}>–</span>
                          <input type="time" value={modal.endTime} onChange={(e) => setModal({ ...modal, endTime: e.target.value })} style={subInp} />
                        </>
                      )}
                    </div>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: T.textSub, cursor: "pointer" }}>
                      <input type="checkbox" checked={modal.allDay} onChange={(e) => setModal({ ...modal, allDay: e.target.checked })} />
                      Toute la journée
                    </label>
                  </div>
                )}
              </FormRow>

              {/* Lieu */}
              <FormRow icon={MapPin}>
                <input value={modal.location} onChange={(e) => setModal({ ...modal, location: e.target.value })} placeholder="Ajouter un lieu" style={rowInp} />
              </FormRow>

              {/* Description */}
              <FormRow icon={AlignLeft} top>
                <textarea value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} placeholder="Ajouter une description" rows={2} style={{ ...rowInp, resize: "vertical", display: "block", lineHeight: 1.4, verticalAlign: "top" }} />
              </FormRow>

              {/* Couleur */}
              <FormRow icon={CalendarIcon}>
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => { setColorOpen((o) => !o); setRemindOpen(false); }} style={pillBtn}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: modal.colorId ? GCAL_COLORS[modal.colorId] : T.blue, display: "inline-block" }} />
                    Couleur
                    <ChevronDown size={14} color={T.textMut} style={{ marginLeft: 2 }} />
                  </button>
                  {colorOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 5, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.14)", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                      <button type="button" onClick={() => { setModal({ ...modal, colorId: null }); setColorOpen(false); }} title="Par défaut" style={{ width: 24, height: 24, borderRadius: "50%", background: T.blue, border: modal.colorId == null ? `2px solid ${T.text}` : "1px solid rgba(0,0,0,0.12)", cursor: "pointer", padding: 0 }} />
                      {Object.entries(GCAL_COLORS).map(([id, hex]) => (
                        <button key={id} type="button" onClick={() => { setModal({ ...modal, colorId: id }); setColorOpen(false); }} title={`Couleur ${id}`}
                          style={{ width: 24, height: 24, borderRadius: "50%", background: hex, border: String(modal.colorId) === id ? `2px solid ${T.text}` : "1px solid rgba(0,0,0,0.12)", cursor: "pointer", padding: 0 }} />
                      ))}
                    </div>
                  )}
                </div>
              </FormRow>

              {/* Notification — bouton moderne + menu */}
              <FormRow icon={Bell}>
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => { setRemindOpen((o) => !o); setColorOpen(false); }} style={pillBtn}>
                    {REMINDER_OPTS.find((r) => String(r.v) === String(modal.reminder))?.label || "Notification"}
                    <ChevronDown size={14} color={T.textMut} style={{ marginLeft: 2 }} />
                  </button>
                  {remindOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 5, minWidth: 200, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.14)" }}>
                      {REMINDER_OPTS.map((r) => {
                        const selected = String(r.v) === String(modal.reminder);
                        return (
                          <button key={String(r.v)} type="button"
                            onClick={() => { setModal({ ...modal, reminder: r.v }); setRemindOpen(false); }}
                            onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = T.bg; }}
                            onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                            style={{ width: "100%", textAlign: "left", border: "none", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: T.text, background: selected ? T.accentBg : "transparent", fontWeight: selected ? 600 : 400 }}>
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </FormRow>

              {modalError && (
                <div style={{ fontSize: 12, color: T.red, background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 8, padding: "8px 10px", marginTop: 8 }}>{modalError}</div>
              )}
            </div>

            {/* Pied */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: `1px solid ${T.border}` }}>
              {modal.htmlLink && (
                <a href={modal.htmlLink} target="_blank" rel="noopener noreferrer" style={{ marginRight: "auto", fontSize: 12, color: T.blue, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <ExternalLink size={12} strokeWidth={2} /> Ouvrir dans Google
                </a>
              )}
              <button onClick={() => setModal(null)} disabled={saving} style={ghostBtn()}>Annuler</button>
              <button onClick={saveModal} disabled={saving || !modal.summary.trim()} style={{ ...primaryBtn(true), opacity: saving || !modal.summary.trim() ? 0.5 : 1 }}>
                {saving ? "…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Rond de complétion d'une tâche-évènement ─────────────── */
function TaskCircle({ done, onToggle, size = 13 }) {
  return (
    <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={onToggle}
      aria-label={done ? "Marquer non terminée" : "Marquer terminée"} title="Terminer la tâche"
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0, cursor: "pointer", padding: 0,
        border: `1.5px solid ${done ? T.green : T.textMut}`,
        background: done ? T.green : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8, lineHeight: 1,
      }}>
      {done ? "✓" : ""}
    </button>
  );
}

/* ─────────────── Ligne de formulaire (icône + contenu), façon Google Agenda ─────────────── */
function FormRow({ icon: Icon, children, top = false, iconColor }) {
  return (
    <div style={{ display: "flex", gap: 18, alignItems: top ? "flex-start" : "center", padding: "6px 0", minHeight: 42 }}>
      <div style={{ width: 24, flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: top ? 8 : 0 }}>
        <Icon size={20} strokeWidth={1.9} color={iconColor || T.textMut} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/* ─────────────── Styles ─────────────── */
const card = () => ({ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12 });
const subInp = { padding: "5px 4px", fontSize: 14, fontFamily: "inherit", color: T.text, background: "transparent", border: "none", borderRadius: 6, outline: "none", cursor: "pointer" };
const rowInp = { width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, color: T.text, padding: "5px 0", boxSizing: "border-box" };
// Bouton "pilule" moderne (couleur, notification)
const pillBtn = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "8px 14px", borderRadius: 999,
  border: `1px solid ${T.border}`, background: T.white, color: T.text,
  fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
};
const codeStyle = { background: T.accentBg, padding: "1px 5px", borderRadius: 5, fontSize: 12 };
const fieldLbl = { display: "block", fontSize: 11, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 };
const inp = () => ({
  width: "100%", padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
  color: T.text, background: T.white, border: `1px solid ${T.border}`, borderRadius: 8,
  outline: "none", boxSizing: "border-box",
});
const iconBtn = () => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
  background: T.white, color: T.text, cursor: "pointer", fontFamily: "inherit",
});
const ghostBtn = () => ({
  display: "inline-flex", alignItems: "center",
  padding: "7px 14px", height: 34, borderRadius: 999,
  border: `1px solid ${T.border}`, background: T.white, color: T.text,
  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
});
const primaryBtn = (small = false) => ({
  display: "inline-flex", alignItems: "center",
  padding: small ? "7px 14px" : "10px 20px", height: small ? 34 : undefined, borderRadius: 999,
  border: `1px solid ${T.text}`, background: T.text, color: "#fff",
  fontSize: small ? 13 : 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
});
