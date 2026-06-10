"use client";

import React from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  LogOut, AlertTriangle, Plug, Trash2, X as IconX, ExternalLink,
  Clock, MapPin, AlignLeft, Bell, ChevronDown, Target, HelpCircle,
} from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t, useLang } from "@/lib/i18n";
import { useGoogleCalendar } from "@/lib/hooks/useGoogleCalendar";
import { useIsMobile } from "@/lib/hooks/useBreakpoint";
import { DateField, TimeField } from "./AgendaDateFields";

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

/** Échéance relative en français : "aujourd'hui", "il y a 3 jours", "il y a 1 semaine"… */
function relativeDue(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  const now = startOfDay(new Date());
  const days = Math.round((now - startOfDay(d)) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return "il y a 1 semaine";
  if (days < 30) return `il y a ${Math.floor(days / 7)} semaines`;
  if (days < 60) return "il y a 1 mois";
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  const y = Math.floor(days / 365);
  return `il y a ${y} an${y > 1 ? "s" : ""}`;
}

function eventTimeLabel(ev) {
  if (ev.allDay) return "Journée";
  const d = new Date(ev.start);
  if (isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Palette officielle Google Agenda (colorId 1–11) — teintes saturées.
// Le fond est tinté via la transparence ; la barre latérale reste pleine.
const GCAL_COLORS = {
  1: "#7B68EE",  // Lavande (violet plus franc, lisible)
  2: "#33B679",  // Sauge
  3: "#8E24AA",  // Raisin
  4: "#E67C73",  // Flamant
  5: "#F6BF26",  // Banane
  6: "#F4511E",  // Tangerine
  7: "#039BE5",  // Paon
  8: "#CCCCCC",  // Graphite (gris clair)
  9: "#3F51B5",  // Myrtille
  10: "#0B8043", // Basilic
  11: "#D50000", // Tomate
};
// Couleur par défaut (évènement sans colorId) : lavande, accordée à la palette.
const DEFAULT_EVENT_COLOR = "#7B68EE";

/** Éclaircit une couleur hex (mélange vers le blanc). */
function lighten(hex, f = 0.2) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (isNaN(n)) return hex;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * f); g = Math.round(g + (255 - g) * f); b = Math.round(b + (255 - b) * f);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
// Toutes les couleurs sont légèrement éclaircies à l'affichage.
const eventColor = (ev) => lighten(GCAL_COLORS[ev.colorId] || DEFAULT_EVENT_COLOR, 0.38);

/** Assombrit une couleur hex (pour le texte lié à la couleur de l'évènement). */
function darken(hex, f = 0.5) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (isNaN(n)) return "#0D0D0D";
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * (1 - f)); g = Math.round(g * (1 - f)); b = Math.round(b * (1 - f));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
// Texte d'un évènement : version foncée de sa couleur (ex. vert → vert foncé).
const eventTextColor = (ev) => darken(eventColor(ev), 0.5);

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
    dueDate: "", // date limite (tâche) : facultative, aucune par défaut
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

/* ─────────────── Tâches Google : heure conservée côté tr4de ─────────────── */
const TASK_TIMES_KEY = "tr4de_task_times";
function readTaskTimes() {
  try { return JSON.parse(localStorage.getItem(TASK_TIMES_KEY) || "{}"); } catch { return {}; }
}
function writeTaskTimes(map) {
  try { localStorage.setItem(TASK_TIMES_KEY, JSON.stringify(map)); } catch {}
}

/** Convertit une Google Task (+ heure locale) en item affiché comme un évènement. */
function taskToItem(tk, times) {
  const t = times[tk.id];
  // Date limite (échéance) : champ `due` de Google Tasks, facultatif.
  const dueDate = tk.due ? tk.due.slice(0, 10) : null;
  // Jour de planification dans l'agenda : conservé côté tr4de. Repli sur la date
  // limite pour les tâches créées hors tr4de (sans jour planifié enregistré).
  const day = (t && t.day) || dueDate;
  if (!day) return null; // ni jour planifié ni échéance → pas placée sur le calendrier
  const hasTime = !!(t && t.startTime);
  const allDay = !hasTime;
  let start, end;
  if (hasTime) {
    start = new Date(`${day}T${t.startTime}:00`).toISOString();
    end = new Date(`${day}T${t.endTime}:00`).toISOString();
  } else { start = day; end = day; }
  return {
    id: tk.id, summary: tk.title || "(Sans titre)", description: tk.notes || "",
    isTask: true, isGTask: true, done: !!tk.completed,
    allDay, start, end, dueDate,
    colorId: t?.colorId || null, location: "", htmlLink: null, guests: [], hangoutLink: null,
    transparency: "opaque", visibility: "default", reminders: null,
  };
}

/** Form pré-rempli depuis un item de tâche Google. */
function formFromTaskItem(item, times) {
  const day = item.allDay ? String(item.start || "").slice(0, 10) : dateKey(new Date(item.start));
  const t = times[item.id];
  return {
    kind: "task", done: !!item.done, id: item.id, htmlLink: null,
    summary: item.summary === "(Sans titre)" ? "" : item.summary,
    allDay: !!item.allDay, date: day, endDate: day,
    dueDate: item.dueDate || "", // date limite (facultative)
    startTime: t?.startTime || "09:00", endTime: t?.endTime || "10:00",
    location: "", description: item.description || "",
    guests: "", addMeet: false, hadMeet: false, colorId: item.colorId || null,
    transparency: "opaque", visibility: "default", reminder: 10,
  };
}

/** Payload Tasks API depuis le form. */
function taskPayloadFromForm(form) {
  return {
    title: form.summary || "(Sans titre)",
    notes: form.description || "",
    // Date limite (facultative) → champ `due` de Google Tasks. Vide = aucune échéance
    // (envoyé à null pour effacer une échéance existante).
    due: form.dueDate ? `${form.dueDate}T00:00:00.000Z` : null,
  };
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

/** Libellé mois + année courant ; "Mois1 – Mois2" si la période chevauche deux mois. */
function monthYearLabel(view, cursor) {
  if (view === "year") return String(cursor.getFullYear());
  if (view === "week") {
    const s = startOfWeekMonday(cursor);
    const e = addDays(s, 6);
    const m1 = s.getMonth(), y1 = s.getFullYear();
    const m2 = e.getMonth(), y2 = e.getFullYear();
    if (m1 === m2 && y1 === y2) return `${MONTHS[m1]} ${y1}`;
    if (y1 === y2) return `${MONTHS[m1]} – ${MONTHS[m2]} ${y1}`;
    return `${MONTHS[m1]} ${y1} – ${MONTHS[m2]} ${y2}`;
  }
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

  // Partage en colonnes (côte à côte) des éléments qui se chevauchent.
  const place = (items) => {
    const clusters = [];
    let cluster = [];
    let clusterEnd = -1;
    for (const ev of items) {
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
  };

  // Évènements et tâches sont disposés séparément : une tâche qui chevauche un
  // évènement ne le pousse pas sur le côté — elle se superpose par-dessus (z-index
  // plus élevé au rendu). Le partage en colonnes ne joue qu'entre éléments de même
  // nature (évènement/évènement ou tâche/tâche).
  const events = place(timed.filter((e) => !e.isTask));
  const tasks = place(timed.filter((e) => e.isTask));
  return [...events, ...tasks];
}

/* ─────────────── Composant ─────────────── */
export default function AgendaPage() {
  useLang();
  // Mobile : interface basée sur 3 jours, header épuré (sans boutons).
  const isMobile = useIsMobile();
  const {
    ready, configured, connected, connect, disconnect,
    fetchEvents, createEvent, updateEvent, deleteEvent, setEventDone,
    fetchTasks, createTask, updateTask, toggleTask, deleteTask,
  } = useGoogleCalendar();

  const [view, setView] = React.useState("week");
  const [cursor, setCursor] = React.useState(() => startOfDay(new Date()));
  // Horloge courante : sert à tracer la ligne « maintenant » et à griser le passé.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const [events, setEvents] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [taskTimes, setTaskTimes] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [modal, setModal] = React.useState(null); // form objet | null
  const [modalError, setModalError] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [overdueOpen, setOverdueOpen] = React.useState(false);
  const [overduePos, setOverduePos] = React.useState(null); // { top, left } du popover
  const [colorOpen, setColorOpen] = React.useState(false);
  const [remindOpen, setRemindOpen] = React.useState(false);
  const [timeEdit, setTimeEdit] = React.useState(false);
  const dragRef = React.useRef(null);
  const [dragBox, setDragBox] = React.useState(null); // { dayKey, a, b } en minutes
  const resizeRef = React.useRef(null);
  const [resizeBox, setResizeBox] = React.useState(null); // { id, dayKey, startMin, endMin }
  const moveRef = React.useRef(null);
  const [moveBox, setMoveBox] = React.useState(null); // { id, ev, dayKey, startMin, endMin }
  const titleRef = React.useRef(null);
  // Position du formulaire (décalage depuis le centre), ajustable en glissant la poignée.
  const [modalPos, setModalPos] = React.useState({ x: 0, y: 0 });
  const [modalDragging, setModalDragging] = React.useState(false);
  const [dragHover, setDragHover] = React.useState(false);
  const modalDragRef = React.useRef(null);

  // Ferme les menus déroulants (couleur / notification) au clic en dehors.
  React.useEffect(() => {
    if (!colorOpen && !remindOpen) return;
    const onDown = (e) => {
      if (e.target.closest?.("[data-menu-root]")) return;
      setColorOpen(false);
      setRemindOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colorOpen, remindOpen]);

  // Focalise le titre à l'ouverture du formulaire SANS faire défiler la page.
  // `autoFocus` natif force un scrollIntoView qui remontait le conteneur en haut ;
  // `preventScroll: true` conserve la position de défilement courante.
  const modalOpen = !!modal;
  React.useEffect(() => {
    if (modalOpen) {
      setModalPos({ x: 0, y: 0 }); // recentre le formulaire à chaque ouverture
      setDragHover(false);         // évite la barre grisée si on avait survolé avant fermeture
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [modalOpen]);

  // Glisser-déposer du formulaire via la poignée du haut.
  const startModalDrag = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = { mx: e.clientX, my: e.clientY, x: modalPos.x, y: modalPos.y };
    modalDragRef.current = start;
    setModalDragging(true);
    const onMove = (ev) => {
      const st = modalDragRef.current;
      if (!st) return;
      setModalPos({ x: st.x + (ev.clientX - st.mx), y: st.y + (ev.clientY - st.my) });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      modalDragRef.current = null;
      setModalDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

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

  // Heures locales des tâches (localStorage).
  React.useEffect(() => { setTaskTimes(readTaskTimes()); }, []);

  // Vraies tâches Google (échec silencieux si scope/API pas encore prêts).
  const loadTasks = React.useCallback(async () => {
    if (!connected) return;
    try { setTasks(await fetchTasks()); } catch { setTasks([]); }
  }, [connected, fetchTasks]);

  React.useEffect(() => { loadTasks(); }, [loadTasks]);

  // Tâches converties en items affichables (mêmes champs qu'un évènement).
  const taskItems = React.useMemo(
    () => tasks.map((tk) => taskToItem(tk, taskTimes)).filter(Boolean),
    [tasks, taskTimes],
  );

  // Évènements + tâches → placés dans la grille horaire / la vue mois.
  // Les tâches avec une heure enregistrée se positionnent ainsi dans le
  // calendrier à leur horaire (layoutDay ne garde que les items horodatés) ;
  // elles restent aussi affichées dans la rangée du haut via `tasksByDay`.
  const eventsByDay = React.useMemo(() => {
    const map = new Map();
    for (const ev of [...events, ...taskItems]) {
      const k = eventDayKey(ev);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.allDay === b.allDay ? String(a.start).localeCompare(String(b.start)) : a.allDay ? -1 : 1));
    }
    return map;
  }, [events, taskItems]);

  const today = startOfDay(new Date());
  const todayKey = dateKey(today);

  // Tâches indexées par jour d'échéance (rangée sous l'en-tête des jours).
  const tasksByDay = React.useMemo(() => {
    const map = new Map();
    for (const it of taskItems) {
      const k = eventDayKey(it);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    }
    return map;
  }, [taskItems]);

  // Évènements « toute la journée » (hors tâches), indexés par jour : ils
  // s'affichent dans la rangée du haut, au-dessus des tâches du jour.
  const allDayByDay = React.useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      if (!ev.allDay || ev.isTask) continue;
      const k = eventDayKey(ev);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    for (const arr of map.values()) arr.sort((a, b) => String(a.summary).localeCompare(String(b.summary)));
    return map;
  }, [events]);

  // Tâches "en attente" : date limite dépassée et non terminées.
  const overdueTasks = React.useMemo(
    () => taskItems
      .filter((it) => !it.done && it.dueDate && it.dueDate < todayKey)
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))),
    [taskItems, todayKey],
  );

  // Bascule l'état "terminé" (tâche Google ou évènement-tâche legacy).
  const onToggleDone = async (item) => {
    if (item.isGTask) {
      setTasks((prev) => prev.map((x) => (x.id === item.id ? { ...x, completed: !item.done } : x)));
      try { await toggleTask(item.id, !item.done); } catch { loadTasks(); }
    } else {
      setEvents((prev) => prev.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)));
      try { await setEventDone(item.id, !item.done); } catch { loadEvents(); }
    }
  };

  const goToday = () => setCursor(startOfDay(new Date()));
  const openDay = (d) => { setCursor(startOfDay(d)); setView("day"); };
  const openCreate = (day, startTime, endTime) => { setModalError(null); setColorOpen(false); setRemindOpen(false); setTimeEdit(false); setModal(blankForm(day || cursor, startTime, endTime)); };
  const openEdit = (item) => {
    setModalError(null); setColorOpen(false); setRemindOpen(false); setTimeEdit(false);
    setModal(item.isGTask ? formFromTaskItem(item, taskTimes) : formFromEvent(item));
  };

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

  // Redimensionnement d'un évènement par ses bords (façon Google Agenda) :
  // on glisse le bord haut (modifie l'heure de début) ou bas (heure de fin),
  // par pas de 15 min, puis on enregistre la nouvelle plage.
  const startResize = (e, ev, d, edge) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const colEl = e.currentTarget.closest("[data-daycol]");
    if (!colEl) return;
    const columnTop = colEl.getBoundingClientRect().top;
    const dk = dateKey(d);
    const snap = (clientY) => {
      const raw = ((clientY - columnTop) / HOUR_H) * 60;
      return Math.max(0, Math.min(24 * 60, Math.round(raw / 15) * 15));
    };
    const init = { startMin: ev.startMin, endMin: ev.endMin };
    resizeRef.current = { id: ev.id, edge, ev, ...init };
    setResizeBox({ id: ev.id, dayKey: dk, ...init });

    const onMove = (m) => {
      const cur = snap(m.clientY);
      const st = resizeRef.current;
      if (!st) return;
      if (edge === "top") st.startMin = Math.min(cur, st.endMin - 15);
      else st.endMin = Math.max(cur, st.startMin + 15);
      setResizeBox({ id: ev.id, dayKey: dk, startMin: st.startMin, endMin: st.endMin });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const st = resizeRef.current;
      resizeRef.current = null;
      setResizeBox(null);
      if (!st) return;
      if (st.startMin === init.startMin && st.endMin === init.endMin) return; // aucun changement
      applyResize(st.ev, d, st.startMin, st.endMin);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Applique la nouvelle plage horaire (MAJ optimiste puis appel API).
  const applyResize = async (ev, d, startMin, endMin) => {
    const toTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    const endM = endMin >= 24 * 60 ? 24 * 60 - 1 : endMin; // 24:00 impossible → 23:59
    const dk = dateKey(d);
    const form = {
      ...formFromEvent(ev),
      allDay: false, date: dk, endDate: dk,
      startTime: toTime(startMin), endTime: toTime(endM),
    };
    const newStart = toISO(dk, form.startTime);
    const newEnd = toISO(dk, form.endTime);
    setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, start: newStart, end: newEnd } : x)));
    try {
      await updateEvent(ev.id, payloadFromForm(form));
      await loadEvents();
    } catch (err) {
      if (err?.message === "insufficient_scope") setError("insufficient_scope");
      loadEvents();
    }
  };

  // Déplacement d'un bloc par glisser-déposer (évènement OU tâche horodatée) : on
  // saisit le bloc et on le glisse vers une autre heure (pas de 15 min) et/ou un
  // autre jour. Un simple clic (sans déplacement) ouvre l'édition.
  const startMove = (e, ev, d) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const colEl = e.currentTarget.closest("[data-daycol]");
    if (!colEl) return;
    const columnTop = colEl.getBoundingClientRect().top;
    const duration = ev.endMin - ev.startMin;
    // Décalage entre le point saisi et le haut du bloc (pour qu'il ne « saute » pas).
    const grabOffset = ((e.clientY - columnTop) / HOUR_H) * 60 - ev.startMin;
    const startDk = dateKey(d);
    const startX = e.clientX, startY = e.clientY;
    let moved = false;
    let last = { dayKey: startDk, startMin: ev.startMin, endMin: ev.endMin };
    moveRef.current = { id: ev.id, ev };

    const onMove = (m) => {
      if (!moved && Math.abs(m.clientY - startY) < 4 && Math.abs(m.clientX - startX) < 4) return;
      moved = true;
      const rawStart = ((m.clientY - columnTop) / HOUR_H) * 60 - grabOffset;
      let startMin = Math.round(rawStart / 15) * 15;
      startMin = Math.max(0, Math.min(24 * 60 - duration, startMin));
      const endMin = startMin + duration;
      // Jour cible : colonne survolée (vue semaine), sinon jour d'origine.
      let dayKey = startDk;
      const target = typeof document !== "undefined" ? document.elementFromPoint(m.clientX, m.clientY) : null;
      const tcol = target && target.closest ? target.closest("[data-daykey]") : null;
      if (tcol && tcol.getAttribute("data-daykey")) dayKey = tcol.getAttribute("data-daykey");
      last = { dayKey, startMin, endMin };
      setMoveBox({ id: ev.id, ev, dayKey, startMin, endMin });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      moveRef.current = null;
      setMoveBox(null);
      if (!moved) { openEdit(ev); return; }                 // simple clic → édition
      if (last.dayKey === startDk && last.startMin === ev.startMin && last.endMin === ev.endMin) return;
      applyMove(ev, last.dayKey, last.startMin, last.endMin);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Applique la nouvelle position (jour + plage horaire) : MAJ optimiste puis API.
  const applyMove = async (ev, targetDayKey, startMin, endMin) => {
    const toTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    const endM = endMin >= 24 * 60 ? 24 * 60 - 1 : endMin; // 24:00 impossible → 23:59
    if (ev.isTask) {
      // Tâche : le jour de planification et l'heure sont conservés côté tr4de
      // (la date limite Google `due` n'est pas affectée par un déplacement).
      const times = readTaskTimes();
      const prev = times[ev.id] || {};
      times[ev.id] = { ...prev, day: targetDayKey, startTime: toTime(startMin), endTime: toTime(endM) };
      writeTaskTimes(times);
      setTaskTimes(times);
      return;
    }
    const form = {
      ...formFromEvent(ev),
      allDay: false, date: targetDayKey, endDate: targetDayKey,
      startTime: toTime(startMin), endTime: toTime(endM),
    };
    const newStart = toISO(targetDayKey, form.startTime);
    const newEnd = toISO(targetDayKey, form.endTime);
    setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, start: newStart, end: newEnd } : x)));
    try {
      await updateEvent(ev.id, payloadFromForm(form));
      await loadEvents();
    } catch (err) {
      if (err?.message === "insufficient_scope") setError("insufficient_scope");
      loadEvents();
    }
  };

  const saveModal = async () => {
    if (!modal) return;
    setSaving(true);
    setModalError(null);
    try {
      if (modal.kind === "task") {
        const payload = taskPayloadFromForm(modal);
        let taskId = modal.id;
        if (taskId) await updateTask(taskId, payload);
        else { const r = await createTask(payload); taskId = r?.task?.id; }
        // Jour de planification + heure conservés côté tr4de : Google Tasks ne
        // stocke que la date limite (`due`), pas le jour où l'on pose la tâche.
        const times = readTaskTimes();
        if (taskId) {
          times[taskId] = modal.allDay
            ? { day: modal.date, colorId: modal.colorId || null }
            : { day: modal.date, startTime: modal.startTime, endTime: modal.endTime, colorId: modal.colorId || null };
          writeTaskTimes(times);
          setTaskTimes(times);
        }
        setModal(null);
        await loadTasks();
      } else {
        const payload = payloadFromForm(modal);
        if (modal.id) await updateEvent(modal.id, payload);
        else await createEvent(payload);
        setModal(null);
        await loadEvents();
      }
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
      if (modal.kind === "task") {
        await deleteTask(modal.id);
        const times = readTaskTimes();
        delete times[modal.id];
        writeTaskTimes(times);
        setTaskTimes(times);
        setModal(null);
        await loadTasks();
      } else {
        await deleteEvent(modal.id);
        setModal(null);
        await loadEvents();
      }
    } catch (e) {
      if (e?.message === "insufficient_scope") { setModal(null); setError("insufficient_scope"); }
      else setModalError(e?.message || "Erreur de suppression");
    } finally {
      setSaving(false);
    }
  };

  // Scroll auto vers 5h du matin à l'ouverture du time-grid (jour / semaine).
  // On réarme l'intention à chaque changement de vue/date…
  const scrollRef = React.useRef(null);
  const didScrollRef = React.useRef(false);
  const animTimerRef = React.useRef(null);
  const animRafRef = React.useRef(0);
  React.useEffect(() => { didScrollRef.current = false; }, [view, cursor, isMobile]);
  // …puis on applique le scroll dès que la grille est effectivement montée.
  // ⚠️ Pas de cleanup ici : un re-rendu (ex. chargement async des évènements)
  // déclencherait sinon le cleanup et annulerait le timer avant l'animation.
  // On annule uniquement au démontage (effet dédié plus bas).
  React.useEffect(() => {
    // Sur mobile la grille (3 jours) est toujours affichée ; sinon seulement
    // en vue jour/semaine.
    if (!isMobile && view !== "day" && view !== "week") return;
    if (didScrollRef.current || !scrollRef.current) return;
    didScrollRef.current = true;
    clearTimeout(animTimerRef.current);
    cancelAnimationFrame(animRafRef.current);
    // Animation maison (le scrollTo natif "smooth" est trop court/saccadé) :
    // la grille s'affiche à 00h, puis défile en douceur jusqu'à 5h avec une
    // courbe easeInOutCubic sur ~900 ms.
    animTimerRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      // Sur mobile : pas d'animation de défilement, on positionne directement à 5h.
      if (isMobile) { el.scrollTop = 5 * HOUR_H; return; }
      const start = el.scrollTop;
      const dist = 5 * HOUR_H - start;
      const duration = 900;
      const t0 = performance.now();
      const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        el.scrollTop = start + dist * ease(p);
        if (p < 1) animRafRef.current = requestAnimationFrame(step);
      };
      animRafRef.current = requestAnimationFrame(step);
    }, 200);
  });
  // Nettoyage uniquement au démontage du composant.
  React.useEffect(() => () => {
    clearTimeout(animTimerRef.current);
    cancelAnimationFrame(animRafRef.current);
  }, []);

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
      {connected && !isMobile && (
        <>
          <button onClick={goToday} style={ghostBtn()}>Aujourd'hui</button>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={() => setCursor(shiftCursor(view, cursor, -1))} aria-label="Précédent" style={{ ...iconBtn(), border: "none", background: "transparent" }}>
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button onClick={() => setCursor(shiftCursor(view, cursor, 1))} aria-label="Suivant" style={{ ...iconBtn(), border: "none", background: "transparent" }}>
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>
            {monthYearLabel(view, cursor)}
          </span>
        </>
      )}
      {/* Mobile : pas de boutons, juste le libellé du mois pour le repère. */}
      {connected && isMobile && (
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>
          {monthYearLabel(view, cursor)}
        </span>
      )}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {connected && !isMobile && (
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
    // Vue jour (1) et vue 3 jours (mobile) : ancrées sur le jour courant.
    // Vue semaine (7+) : ancrée sur le lundi de la semaine.
    const weekStart = daysCount >= 7 ? startOfWeekMonday(cursor) : startOfDay(cursor);
    const days = Array.from({ length: daysCount }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const gutter = 54;
    // Minutes écoulées depuis minuit → position verticale de la ligne « maintenant ».
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowTop = (nowMin / 60) * HOUR_H;
    // Cellule qui héberge le résumé « tâches en attente » : aujourd'hui si visible, sinon la première.
    const overdueAnchor = Math.max(0, days.findIndex((d) => sameDay(d, today)));

    return (
      <div style={{ ...card(), border: "none", overflow: "hidden" }}>
        <div ref={scrollRef} style={{ overflowY: "auto", maxHeight: "calc(100vh - 210px)" }}>
        {/* En-tête jours : nom + numéro + tâches du jour, le tout épinglé en haut */}
        <div style={{ position: "sticky", top: 0, zIndex: 8, background: T.white, display: "flex", borderBottom: `1px solid ${T.border}`, alignItems: "stretch" }}>
          <div style={{ width: gutter, flexShrink: 0 }} />
          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            const isPast = startOfDay(d) < today;
            const list = tasksByDay.get(dateKey(d)) || [];
            const allDay = allDayByDay.get(dateKey(d)) || [];
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 3px 6px", minWidth: 0, borderLeft: daysCount > 1 && i > 0 ? `1px solid ${T.border}` : "none", opacity: isPast ? 0.45 : 1 }}>
                <div style={dayLabelStyle}>{WEEKDAYS[weekdayIdx(d)]}</div>
                <div style={{
                  marginTop: 3, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 26, height: 26, borderRadius: 999, padding: "0 7px",
                  fontSize: 14, fontWeight: isToday ? 700 : 600,
                  background: isToday ? T.text : "transparent", color: isToday ? "#fff" : T.text,
                }}>{d.getDate()}</div>
                {/* Évènements « toute la journée » : au-dessus des tâches du jour */}
                {allDay.length > 0 && (
                  <div style={{ marginTop: 5, width: "100%", display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                    {allDay.map((ev) => <TaskRowChip key={ev.id} item={ev} onToggle={onToggleDone} onOpen={openEdit} />)}
                  </div>
                )}
                {/* Tâches du jour : pleine largeur de la colonne, empilées sous le numéro */}
                {list.length > 0 && (
                  <div style={{ marginTop: allDay.length > 0 ? 2 : 5, width: "100%", display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                    {list.map((it) => <TaskRowChip key={it.id} item={it} onToggle={onToggleDone} onOpen={openEdit} />)}
                  </div>
                )}
                {/* Résumé des tâches en attente : ouvre un popover façon Google Tasks */}
                {i === overdueAnchor && overdueTasks.length > 0 && (
                  <div style={{ marginTop: list.length > 0 ? 4 : 6, width: "100%", textAlign: "left" }}>
                    <button type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
                        const vh = typeof window !== "undefined" ? window.innerHeight : 800;
                        const W = 320;
                        let left = r.left - W - 8;                          // à gauche du jour
                        if (left < 8) left = Math.min(r.right + 8, vw - W - 8); // sinon à droite
                        const top = Math.max(8, Math.min(r.top - 4, vh - 360));
                        setOverduePos({ top, left });
                        setOverdueOpen((o) => !o);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, width: "100%",
                        padding: "3px 9px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                        border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 10.5, fontWeight: 600,
                      }}>
                      <Target size={12} strokeWidth={2.2} color={T.blue} style={{ flexShrink: 0 }} />
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{overdueTasks.length} tâche{overdueTasks.length > 1 ? "s" : ""} en attente</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grille horaire */}
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
              const dk = dateKey(d);
              let layout = layoutDay(eventsByDay.get(dk) || [], d);
              // Aperçu live d'un évènement en cours de déplacement : on le retire de
              // sa colonne d'origine et on l'injecte dans la colonne cible.
              if (moveBox) {
                if (moveBox.dayKey !== dk) {
                  layout = layout.filter((e) => e.id !== moveBox.id);
                } else if (!layout.some((e) => e.id === moveBox.id)) {
                  layout = [...layout, { ...moveBox.ev, startMin: moveBox.startMin, endMin: moveBox.endMin, _col: 0, _cols: 1 }];
                }
              }
              const dragHere = dragBox && dragBox.dayKey === dk;
              const isToday = sameDay(d, today);
              const isPastDay = startOfDay(d) < today;
              return (
                <div key={di} data-daycol="" data-daykey={dk} onMouseDown={(e) => startDrag(e, d)} title="Glisser pour créer un évènement" style={{
                  flex: 1, position: "relative", minWidth: 0, cursor: "pointer", userSelect: "none",
                  borderLeft: daysCount > 1 && di > 0 ? `1px solid ${T.border}` : "none",
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${HOUR_H - 1}px, ${T.border} ${HOUR_H - 1}px, ${T.border} ${HOUR_H}px)`,
                  height: 24 * HOUR_H,
                }}>
                  {/* Ligne « maintenant » (jour courant uniquement) */}
                  {isToday && (
                    <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, height: 0, zIndex: 7, pointerEvents: "none" }}>
                      <div style={{ position: "absolute", left: -3, top: -3, width: 6, height: 6, borderRadius: "50%", background: T.red }} />
                      <div style={{ position: "absolute", left: 1, right: 0, top: -1, height: 2, background: T.red }} />
                    </div>
                  )}
                  {dragHere && (() => {
                    const lo = Math.min(dragBox.a, dragBox.b);
                    const hi = Math.max(dragBox.a, dragBox.b);
                    return (
                      <div style={{
                        position: "absolute", top: (lo / 60) * HOUR_H, height: Math.max(((hi - lo) / 60) * HOUR_H, 3),
                        left: 2, right: 2, background: "rgba(200, 222, 255, 0.45)", border: "none",
                        borderRadius: 5, pointerEvents: "none", zIndex: 5,
                      }} />
                    );
                  })()}
                  {layout.map((ev) => {
                    // Pendant un redimensionnement, on affiche la plage en cours
                    // d'édition (prévisualisation live) au lieu des bornes d'origine.
                    const resizing = resizeBox && resizeBox.id === ev.id && resizeBox.dayKey === dk;
                    const moving = moveBox && moveBox.id === ev.id && moveBox.dayKey === dk;
                    const active = resizing || moving;
                    const sMin = resizing ? resizeBox.startMin : moving ? moveBox.startMin : ev.startMin;
                    const eMin = resizing ? resizeBox.endMin : moving ? moveBox.endMin : ev.endMin;
                    const top = (sMin / 60) * HOUR_H;
                    const height = Math.max(((eMin - sMin) / 60) * HOUR_H, 16);
                    const w = 100 / ev._cols;
                    const left = ev._col * w;
                    // Les tâches reçoivent une teinte plus claire que les évènements
                    // pour les distinguer d'un coup d'œil.
                    const col = ev.isTask ? lighten(eventColor(ev), 0.32) : eventColor(ev);
                    // Évènement déjà passé → estompé (jour révolu, ou fini avant maintenant).
                    const isPastEvent = isPastDay || (isToday && eMin <= nowMin);
                    // Estompage du passé via une teinte éclaircie (et NON via l'opacité du
                    // bloc, qui rendrait le fond blanc translucide et laisserait voir les
                    // lignes d'heures de la grille au travers).
                    const dispCol = isPastEvent ? lighten(col, 0.55) : col;
                    // Teinte semi-transparente posée sur un fond blanc opaque :
                    // évite que les lignes d'heures du fond transparaissent à travers le bloc.
                    const tint = ev.isTask ? `${dispCol}1A` : `${dispCol}33`;
                    const txtCol = (ev.done || isPastEvent) ? T.textMut : eventTextColor(ev);
                    // Évènements courts (≤ 30 min) : titre et heure sur une seule
                    // ligne, l'heure poussée à droite.
                    const compact = (eMin - sMin) <= 30;
                    const minLbl = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
                    const timeLbl = active ? `${minLbl(sMin)} – ${minLbl(eMin >= 1440 ? 1439 : eMin)}` : eventTimeLabel(ev);
                    // Poignées de redimensionnement (évènements horaires uniquement).
                    const resizable = !ev.isTask;
                    const handleStyle = (pos) => ({
                      position: "absolute", left: 0, right: 0, [pos]: 0, height: 8,
                      cursor: "ns-resize", zIndex: 2,
                    });
                    return (
                      <div key={ev.id}
                        onMouseDown={(e) => { e.stopPropagation(); startMove(e, ev, d); }}
                        onClick={(e) => e.stopPropagation()}
                        title={`${timeLbl} ${ev.summary}`}
                        style={{
                          position: "absolute", top, height, cursor: moving ? "grabbing" : "grab",
                          left: `calc(${left}% + 2px)`, width: `calc(${w}% - 4px)`,
                          backgroundColor: T.white, backgroundImage: `linear-gradient(${tint}, ${tint})`, borderLeft: `2px solid ${dispCol}`, borderRadius: 5,
                          padding: "2px 5px", overflow: "hidden", zIndex: active ? 6 : ev.isTask ? 3 : 1,
                          boxShadow: active ? "0 4px 14px rgba(0,0,0,0.16)" : "none",
                          opacity: moving ? 0.92 : 1,
                          display: "flex", flexDirection: compact ? "row" : "column",
                          alignItems: compact ? "baseline" : "stretch", gap: compact ? 5 : 0,
                        }}>
                        {resizable && (
                          <div onMouseDown={(e) => startResize(e, ev, d, "top")} onClick={(e) => e.stopPropagation()} style={handleStyle("top")} />
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: compact ? 1 : "none" }}>
                          {ev.isTask && <TaskCircle done={ev.done} onToggle={(e) => { e.stopPropagation(); onToggleDone(ev); }} />}
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: txtCol, textDecoration: ev.isTask && ev.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.summary}</span>
                        </span>
                        {compact
                          ? <span style={{ fontSize: 9.5, color: txtCol, flexShrink: 0, whiteSpace: "nowrap", opacity: 0.8 }}>{timeLbl}</span>
                          : (height > 28 && <span style={{ fontSize: 9.5, color: txtCol, opacity: 0.8 }}>{timeLbl}</span>)}
                        {resizable && (
                          <div onMouseDown={(e) => startResize(e, ev, d, "bottom")} onClick={(e) => e.stopPropagation()} style={handleStyle("bottom")} />
                        )}
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
                      fontSize: 10.5, color: ev.done ? T.textMut : eventTextColor(ev), background: ev.isTask ? `${lighten(eventColor(ev), 0.32)}26` : `${eventColor(ev)}33`, borderRadius: 4, padding: "1px 5px",
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
        {isMobile ? (
          // Mobile : interface unique basée sur 3 jours.
          renderTimeGrid(3)
        ) : (
          <>
            {view === "day" && renderTimeGrid(1)}
            {view === "week" && renderTimeGrid(7)}
            {view === "month" && renderMonth()}
            {view === "year" && renderYear()}
          </>
        )}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {header}
      {body}
      {modal && (
        <div onClick={() => !saving && setModal(null)} style={{ position: "fixed", inset: 0, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24, overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card(), width: "100%", maxWidth: 540, padding: 0, boxShadow: "0 6px 20px rgba(0,0,0,0.10)", transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }}>
            {/* Barre du haut = poignée de déplacement (grise au survol, invisible sinon).
                Les icônes sont à l'intérieur de cette zone pour ne pas ajouter de marge. */}
            <div onMouseDown={startModalDrag} title="Glisser pour déplacer la fenêtre"
              onMouseEnter={() => setDragHover(true)} onMouseLeave={() => setDragHover(false)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, padding: "4px 10px",
                cursor: modalDragging ? "grabbing" : "grab", userSelect: "none",
                borderTopLeftRadius: 12, borderTopRightRadius: 12,
                background: (dragHover || modalDragging) ? "rgba(0,0,0,0.035)" : "transparent",
                transition: "background-color 120ms ease",
              }}>
              {modal.id && (
                <button onMouseDown={(e) => e.stopPropagation()} onClick={removeModal} disabled={saving} aria-label="Supprimer" title="Supprimer" style={topIconBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; e.currentTarget.style.color = T.red; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
                  <Trash2 size={15} strokeWidth={1.9} />
                </button>
              )}
              <button onMouseDown={(e) => e.stopPropagation()} onClick={() => !saving && setModal(null)} aria-label="Fermer" title="Fermer" style={topIconBtn}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; e.currentTarget.style.color = T.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}>
                <IconX size={16} strokeWidth={1.9} />
              </button>
            </div>

            {/* Titre */}
            <div style={{ padding: "0 24px 0 58px" }}>
              <input ref={titleRef} value={modal.summary} onChange={(e) => setModal({ ...modal, summary: e.target.value })} placeholder="Ajouter un titre"
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
                      <DateField value={modal.date} onChange={(v) => setModal({ ...modal, date: v, endDate: modal.endDate < v ? v : modal.endDate })} />
                      {modal.allDay ? (
                        <>
                          <span style={{ color: T.textMut, fontSize: 13 }}>au</span>
                          <DateField value={modal.endDate} min={modal.date} onChange={(v) => setModal({ ...modal, endDate: v })} />
                        </>
                      ) : (
                        <>
                          <TimeField value={modal.startTime} onChange={(v) => setModal({ ...modal, startTime: v })} />
                          <span style={{ color: T.textMut }}>–</span>
                          <TimeField value={modal.endTime} onChange={(v) => setModal({ ...modal, endTime: v })} />
                        </>
                      )}
                    </div>
                    <button type="button" onClick={() => setModal({ ...modal, allDay: !modal.allDay })}
                      style={{
                        ...pillBtn, alignSelf: "flex-start",
                        background: modal.allDay ? `${T.blue}1A` : T.white,
                        borderColor: modal.allDay ? `${T.blue}55` : T.border,
                        color: modal.allDay ? T.blue : T.text,
                        fontWeight: modal.allDay ? 600 : 500,
                      }}>
                      <span style={{
                        width: 15, height: 15, borderRadius: 5, flexShrink: 0,
                        border: `1.5px solid ${modal.allDay ? T.blue : T.textMut}`,
                        background: modal.allDay ? T.blue : "transparent",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 10, lineHeight: 1,
                      }}>{modal.allDay ? "✓" : ""}</span>
                      Toute la journée
                    </button>
                  </div>
                )}
              </FormRow>

              {/* Lieu (évènement) / Date limite (tâche) */}
              {modal.kind === "task" ? (
                <FormRow icon={Target}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, color: T.textMut }}>Date limite</span>
                    <DateField value={modal.dueDate} onChange={(v) => setModal({ ...modal, dueDate: v })} />
                    {modal.dueDate && (
                      <button type="button" onClick={() => setModal({ ...modal, dueDate: "" })}
                        aria-label="Retirer la date limite" title="Retirer la date limite"
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: T.textMut, display: "inline-flex", alignItems: "center", padding: 2, borderRadius: 6 }}>
                        <IconX size={14} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </FormRow>
              ) : (
                <FormRow icon={MapPin}>
                  <input value={modal.location} onChange={(e) => setModal({ ...modal, location: e.target.value })} placeholder="Ajouter un lieu" style={rowInp} />
                </FormRow>
              )}

              {/* Description */}
              <FormRow icon={AlignLeft} top>
                <textarea value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} placeholder="Ajouter une description" rows={2} style={{ ...rowInp, resize: "vertical", display: "block", lineHeight: 1.4, verticalAlign: "top" }} />
              </FormRow>

              {/* Couleur */}
              <FormRow icon={CalendarIcon}>
                <div data-menu-root style={{ position: "relative" }}>
                  <button type="button" onClick={() => { setColorOpen((o) => !o); setRemindOpen(false); }} style={pillBtn}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: modal.colorId ? GCAL_COLORS[modal.colorId] : DEFAULT_EVENT_COLOR, display: "inline-block" }} />
                    Couleur
                    <ChevronDown size={14} color={T.textMut} style={{ marginLeft: 2 }} />
                  </button>
                  {colorOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 5, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.14)", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                      <button type="button" onClick={() => { setModal({ ...modal, colorId: null }); setColorOpen(false); }} title="Par défaut" style={{ width: 24, height: 24, borderRadius: "50%", background: DEFAULT_EVENT_COLOR, border: modal.colorId == null ? `2px solid ${T.text}` : "1px solid rgba(0,0,0,0.12)", cursor: "pointer", padding: 0 }} />
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
                <div data-menu-root style={{ position: "relative" }}>
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

      {/* Popover « Tâches en attente » façon Google Tasks */}
      {overdueOpen && overduePos && (
        <div onClick={() => setOverdueOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", top: overduePos.top, left: overduePos.left, width: 320,
            ...card(), boxShadow: "0 12px 40px rgba(0,0,0,0.18)", padding: "12px 18px 16px",
            maxHeight: "70vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 2 }}>
              <a href="https://support.google.com/tasks" target="_blank" rel="noopener noreferrer" title="Aide" style={{ color: T.textMut, display: "inline-flex" }}>
                <HelpCircle size={16} strokeWidth={2} />
              </a>
              <button type="button" onClick={() => setOverdueOpen(false)} aria-label="Fermer" style={{ border: "none", background: "transparent", cursor: "pointer", color: T.textMut, display: "inline-flex", padding: 0 }}>
                <IconX size={16} strokeWidth={2} />
              </button>
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: T.text, letterSpacing: -0.2 }}>Tâches en attente</div>
            <div style={{ fontSize: 12, color: T.textMut, marginTop: 2 }}>Au cours des 365 derniers jours</div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {overdueTasks.map((it) => {
                const rel = relativeDue(it.dueDate);
                const relCap = rel.charAt(0).toUpperCase() + rel.slice(1);
                return (
                  <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ paddingTop: 2 }}>
                      <TaskCircle done={it.done} onToggle={(e) => { e.stopPropagation(); onToggleDone(it); }} size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button type="button" onClick={() => { setOverdueOpen(false); openEdit(it); }}
                        style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "block", width: "100%" }}>
                        <div style={{ fontSize: 14, color: T.text, textDecoration: it.done ? "line-through" : "none" }}>{it.summary}</div>
                        {it.description && (
                          <div style={{ fontSize: 12.5, color: T.textMut, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.description}</div>
                        )}
                      </button>
                      {/* Date limite dépassée. */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, fontSize: 12.5, color: T.red }}>
                        <Target size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
                        <span>Arrivée à échéance {rel}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 12.5, color: T.textMut }}>
                        <Clock size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
                        <span>{relCap}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <a href="https://tasks.google.com" target="_blank" rel="noopener noreferrer" style={{ color: T.blue, fontSize: 13, fontWeight: 500 }}>Ouvrir Tasks</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Puce de tâche (rangée sous l'en-tête des jours) ─────────────── */
function TaskRowChip({ item, onToggle, onOpen, overdue = false }) {
  const isTask = !!item.isTask;
  // Évènement « toute la journée » : couleur pleine de l'évènement, sans pastille.
  // Tâche : palette tâche (éclaircie) avec rond de complétion.
  const base = !isTask
    ? eventColor(item)
    : item.colorId ? lighten(GCAL_COLORS[item.colorId] || DEFAULT_EVENT_COLOR, 0.38) : (overdue ? T.textMut : T.blue);
  const txt = item.done ? T.textMut : darken(base, 0.5);
  const timeLbl = item.allDay ? "" : eventTimeLabel(item);
  // En attente : on rappelle la date limite (jj/mm) plutôt que l'heure.
  const overdueLbl = (() => {
    if (!overdue || !item.dueDate) return "";
    const [, mm, dd] = item.dueDate.split("-");
    return `${dd}/${mm}`;
  })();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onOpen(item); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item); } }}
      title={item.summary}
      style={{
        display: "flex", alignItems: "center", gap: 5, width: "100%",
        minWidth: 0, textAlign: "left", boxSizing: "border-box",
        padding: "2px 6px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
        background: `${base}1A`, borderLeft: `2px solid ${base}`,
      }}
    >
      {isTask && <TaskCircle done={item.done} onToggle={(e) => { e.stopPropagation(); onToggle(item); }} size={12} />}
      <span style={{
        fontSize: 10.5, fontWeight: 600, color: txt, minWidth: 0, flex: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        textDecoration: item.done ? "line-through" : "none",
      }}>{item.summary}</span>
      {(overdueLbl || timeLbl) && (
        <span style={{ fontSize: 9, color: txt, opacity: 0.8, flexShrink: 0, whiteSpace: "nowrap" }}>
          {overdueLbl || timeLbl}
        </span>
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
// Bouton icône discret de la barre du haut du modal (fermer / supprimer).
const topIconBtn = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent",
  color: "var(--color-text-muted, #8E8E8E)", cursor: "pointer", fontFamily: "inherit",
  transition: "background-color 120ms ease, color 120ms ease",
};
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
