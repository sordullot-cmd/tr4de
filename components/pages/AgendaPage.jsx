"use client";

import React from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw,
  LogOut, AlertTriangle, Plug, Plus, Trash2, X as IconX, ExternalLink,
} from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t, useLang } from "@/lib/i18n";
import { useGoogleCalendar } from "@/lib/hooks/useGoogleCalendar";

/* ─────────────── Helpers date ─────────────── */
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKDAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const WEEKDAYS_MIN = ["L", "M", "M", "J", "V", "S", "D"];
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

// Palette approximative des couleurs Google Agenda (colorId 1–11).
const GCAL_COLORS = {
  1: "#7986CB", 2: "#33B679", 3: "#8E24AA", 4: "#E67C73",
  5: "#F6BF26", 6: "#F4511E", 7: "#039BE5", 8: "#616161",
  9: "#3F51B5", 10: "#0B8043", 11: "#D50000",
};
const eventColor = (ev) => GCAL_COLORS[ev.colorId] || T.blue;

/* ─────────────── Helpers formulaire évènement ─────────────── */
const localTZ = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } };
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toISO = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00`).toISOString();
function addDayStr(dateStr, n) { const d = new Date(`${dateStr}T00:00:00`); d.setDate(d.getDate() + n); return dateKey(d); }

/** Form vierge pour la création. */
function blankForm(day, startTime = "09:00", endTime = "10:00") {
  const dk = typeof day === "string" ? day : dateKey(day);
  return { id: null, htmlLink: null, summary: "", allDay: false, date: dk, endDate: dk, startTime, endTime, location: "", description: "" };
}

/** Form pré-rempli depuis un évènement existant. */
function formFromEvent(ev) {
  const summary = ev.summary === "(Sans titre)" ? "" : ev.summary;
  if (ev.allDay) {
    const startD = ev.start.slice(0, 10);
    let endIncl = ev.end ? addDayStr(ev.end.slice(0, 10), -1) : startD; // end exclusif → inclusif
    if (endIncl < startD) endIncl = startD;
    return { id: ev.id, htmlLink: ev.htmlLink, summary, allDay: true, date: startD, endDate: endIncl, startTime: "09:00", endTime: "10:00", location: ev.location || "", description: ev.description || "" };
  }
  const s = new Date(ev.start);
  const e = ev.end ? new Date(ev.end) : new Date(s.getTime() + 3600000);
  const dk = dateKey(s);
  return { id: ev.id, htmlLink: ev.htmlLink, summary, allDay: false, date: dk, endDate: dk, startTime: hhmm(s), endTime: hhmm(e), location: ev.location || "", description: ev.description || "" };
}

/** Construit le payload API à partir du form. */
function payloadFromForm(form) {
  const tz = localTZ();
  if (form.allDay) {
    return {
      summary: form.summary, location: form.location, description: form.description,
      allDay: true, start: form.date, end: addDayStr(form.endDate || form.date, 1), timeZone: tz,
    };
  }
  let start = toISO(form.date, form.startTime);
  let end = toISO(form.date, form.endTime);
  if (new Date(end) <= new Date(start)) end = new Date(new Date(start).getTime() + 3600000).toISOString();
  return { summary: form.summary, location: form.location, description: form.description, allDay: false, start, end, timeZone: tz };
}

const VIEWS = [
  { id: "day", label: "Jour" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
  { id: "year", label: "Année" },
];

const HOUR_H = 44; // hauteur d'une heure (px) dans le time-grid

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
  const { ready, configured, connected, connect, disconnect, fetchEvents, createEvent, updateEvent, deleteEvent } = useGoogleCalendar();

  const [view, setView] = React.useState("week");
  const [cursor, setCursor] = React.useState(() => startOfDay(new Date()));
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [modal, setModal] = React.useState(null); // form objet | null
  const [modalError, setModalError] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

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

  const goToday = () => setCursor(startOfDay(new Date()));
  const openDay = (d) => { setCursor(startOfDay(d)); setView("day"); };
  const openCreate = (day, startTime, endTime) => { setModalError(null); setModal(blankForm(day || cursor, startTime, endTime)); };
  const openEdit = (ev) => { setModalError(null); setModal(formFromEvent(ev)); };

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
          {segmented}
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
            <button onClick={() => openCreate()} style={primaryBtn(true)}>
              <Plus size={15} strokeWidth={2.2} style={{ marginRight: 6 }} /> Nouvel évènement
            </button>
            <button onClick={loadEvents} aria-label="Rafraîchir" title="Rafraîchir" style={iconBtn()}>
              <RefreshCw size={15} strokeWidth={2} className={loading ? "anim-spin" : ""} />
            </button>
            <button onClick={disconnect} style={ghostBtn()}>
              <LogOut size={13} strokeWidth={2} style={{ marginRight: 6 }} /> Déconnecter
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
      <div style={{ ...card(), overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* En-tête jours */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: gutter, flexShrink: 0 }} />
          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            return (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderLeft: `1px solid ${T.border}`, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4 }}>{WEEKDAYS[weekdayIdx(d)]}</div>
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

        {/* Bandeau "journée" (all-day) */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, minHeight: 26, background: T.bg }}>
          <div style={{ width: gutter, flexShrink: 0, fontSize: 9, color: T.textMut, padding: "5px 6px", textAlign: "right" }}>Journée</div>
          {days.map((d, i) => {
            const allDay = (eventsByDay.get(dateKey(d)) || []).filter((e) => e.allDay);
            return (
              <div key={i} style={{ flex: 1, borderLeft: `1px solid ${T.border}`, padding: 3, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                {allDay.map((ev) => (
                  <div key={ev.id} onClick={() => openEdit(ev)} title={ev.summary}
                    style={{ cursor: "pointer", fontSize: 10.5, color: "#fff", background: eventColor(ev), borderRadius: 4, padding: "1px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.summary}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Grille horaire scrollable */}
        <div ref={scrollRef} style={{ overflowY: "auto", maxHeight: 560 }}>
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
              const onColumnClick = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const raw = ((e.clientY - rect.top) / HOUR_H) * 60;
                const min = Math.max(0, Math.min(24 * 60 - 30, Math.round(raw / 30) * 30));
                const startTime = `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
                const endMin = Math.min(24 * 60, min + 60);
                const endTime = `${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}`;
                openCreate(d, startTime, endTime);
              };
              return (
                <div key={di} onClick={onColumnClick} title="Cliquer pour créer un évènement" style={{
                  flex: 1, position: "relative", minWidth: 0, cursor: "pointer",
                  borderLeft: `1px solid ${T.border}`,
                  backgroundImage: `repeating-linear-gradient(to bottom, ${T.border}, ${T.border} 1px, transparent 1px, transparent ${HOUR_H}px)`,
                  height: 24 * HOUR_H,
                }}>
                  {layout.map((ev) => {
                    const top = (ev.startMin / 60) * HOUR_H;
                    const height = Math.max(((ev.endMin - ev.startMin) / 60) * HOUR_H, 16);
                    const w = 100 / ev._cols;
                    const left = ev._col * w;
                    const col = eventColor(ev);
                    return (
                      <div key={ev.id} onClick={(e) => { e.stopPropagation(); openEdit(ev); }} title={`${eventTimeLabel(ev)} ${ev.summary}`}
                        style={{
                          position: "absolute", top, height, cursor: "pointer",
                          left: `calc(${left}% + 2px)`, width: `calc(${w}% - 4px)`,
                          background: `${col}26`, borderLeft: `3px solid ${col}`, borderRadius: 5,
                          padding: "2px 5px", overflow: "hidden",
                          display: "flex", flexDirection: "column",
                        }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.summary}</span>
                        {height > 28 && <span style={{ fontSize: 9.5, color: T.textSub }}>{eventTimeLabel(ev)}</span>}
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
            <div key={w} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4 }}>{w}</div>
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
                      fontSize: 10.5, color: T.text, background: `${eventColor(ev)}1A`, borderRadius: 4, padding: "1px 5px",
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: eventColor(ev), flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {!ev.allDay && <span style={{ color: T.textMut, marginRight: 3 }}>{eventTimeLabel(ev)}</span>}
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
                style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 8, fontSize: 13, fontWeight: 600, color: T.text }}>
                {MONTHS[m]}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {WEEKDAYS_MIN.map((w, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 9, color: T.textMut, fontWeight: 600 }}>{w}</div>
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
        <div onClick={() => !saving && setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card(), width: "100%", maxWidth: 440, padding: 0, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{modal.id ? "Modifier l'évènement" : "Nouvel évènement"}</div>
              <button onClick={() => !saving && setModal(null)} aria-label="Fermer" style={{ ...iconBtn(), width: 30, height: 30, border: "none", background: "transparent" }}>
                <IconX size={16} strokeWidth={2} />
              </button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={fieldLbl}>Titre</label>
                <input autoFocus value={modal.summary} onChange={(e) => setModal({ ...modal, summary: e.target.value })} placeholder="Titre de l'évènement" style={inp()} />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text, cursor: "pointer" }}>
                <input type="checkbox" checked={modal.allDay} onChange={(e) => setModal({ ...modal, allDay: e.target.checked })} />
                Toute la journée
              </label>

              {modal.allDay ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={fieldLbl}>Début</label>
                    <input type="date" value={modal.date} onChange={(e) => setModal({ ...modal, date: e.target.value })} style={inp()} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={fieldLbl}>Fin</label>
                    <input type="date" value={modal.endDate} min={modal.date} onChange={(e) => setModal({ ...modal, endDate: e.target.value })} style={inp()} />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label style={fieldLbl}>Date</label>
                    <input type="date" value={modal.date} onChange={(e) => setModal({ ...modal, date: e.target.value })} style={inp()} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={fieldLbl}>Début</label>
                      <input type="time" value={modal.startTime} onChange={(e) => setModal({ ...modal, startTime: e.target.value })} style={inp()} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={fieldLbl}>Fin</label>
                      <input type="time" value={modal.endTime} onChange={(e) => setModal({ ...modal, endTime: e.target.value })} style={inp()} />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={fieldLbl}>Lieu</label>
                <input value={modal.location} onChange={(e) => setModal({ ...modal, location: e.target.value })} placeholder="Optionnel" style={inp()} />
              </div>
              <div>
                <label style={fieldLbl}>Description</label>
                <textarea value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} placeholder="Optionnel" rows={3} style={{ ...inp(), resize: "vertical" }} />
              </div>

              {modalError && (
                <div style={{ fontSize: 12, color: T.red, background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 8, padding: "8px 10px" }}>{modalError}</div>
              )}
              {modal.htmlLink && (
                <a href={modal.htmlLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: T.blue, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <ExternalLink size={12} strokeWidth={2} /> Ouvrir dans Google Agenda
                </a>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
              {modal.id && (
                <button onClick={removeModal} disabled={saving} style={{ ...ghostBtn(), color: T.red, borderColor: T.redBd }}>
                  <Trash2 size={13} strokeWidth={2} style={{ marginRight: 6 }} /> Supprimer
                </button>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => setModal(null)} disabled={saving} style={ghostBtn()}>Annuler</button>
                <button onClick={saveModal} disabled={saving || !modal.summary.trim()} style={{ ...primaryBtn(true), opacity: saving || !modal.summary.trim() ? 0.5 : 1 }}>
                  {saving ? "…" : modal.id ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Styles ─────────────── */
const card = () => ({ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12 });
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
