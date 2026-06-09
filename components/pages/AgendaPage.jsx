"use client";

import React from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw,
  LogOut, MapPin, Clock, ExternalLink, AlertTriangle, Plug,
} from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t, useLang } from "@/lib/i18n";
import { useGoogleCalendar } from "@/lib/hooks/useGoogleCalendar";

/* ─────────────── Helpers date ─────────────── */
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a, b) => dateKey(a) === dateKey(b);

/** Lundi de la semaine contenant `d`. */
function startOfWeekMonday(d) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0 = lundi
  return addDays(x, -day);
}

/** Clé locale (YYYY-MM-DD) du début d'un évènement Google (timed ou all-day). */
function eventDayKey(ev) {
  if (!ev.start) return null;
  if (ev.allDay) return ev.start.slice(0, 10); // déjà YYYY-MM-DD
  const d = new Date(ev.start);
  if (isNaN(d.getTime())) return null;
  return dateKey(d);
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

/* ─────────────── Composant ─────────────── */
export default function AgendaPage() {
  useLang();
  const { ready, configured, connected, connect, disconnect, fetchEvents } = useGoogleCalendar();

  const [cursor, setCursor] = React.useState(() => startOfDay(new Date())); // mois affiché
  const [selected, setSelected] = React.useState(() => startOfDay(new Date()));
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Matrice de 6 semaines (42 jours) à partir du lundi avant le 1er du mois.
  const monthStart = React.useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor],
  );
  const gridStart = React.useMemo(() => startOfWeekMonday(monthStart), [monthStart]);
  const days = React.useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart],
  );

  const loadEvents = React.useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError(null);
    try {
      const timeMin = gridStart.toISOString();
      const timeMax = addDays(gridStart, 42).toISOString();
      const evs = await fetchEvents(timeMin, timeMax);
      setEvents(evs);
    } catch (e) {
      setEvents([]);
      if (e?.message !== "token_expired") setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [connected, gridStart, fetchEvents]);

  React.useEffect(() => { loadEvents(); }, [loadEvents]);

  // Regroupe les évènements par jour.
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
  const selectedEvents = eventsByDay.get(dateKey(selected)) || [];

  const goToday = () => { const n = startOfDay(new Date()); setCursor(n); setSelected(n); };
  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  /* ─────────────── Header ─────────────── */
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>
        {t("nav.agenda")}
      </h1>
      {connected && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
            <button onClick={prevMonth} aria-label="Mois précédent" style={iconBtn()}>
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <div style={{ minWidth: 150, textAlign: "center", fontSize: 14, fontWeight: 600, color: T.text }}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </div>
            <button onClick={nextMonth} aria-label="Mois suivant" style={iconBtn()}>
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <button onClick={goToday} style={ghostBtn()}>Aujourd'hui</button>
        </>
      )}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {connected && (
          <>
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

  /* ─────────────── États non-connecté / non-configuré ─────────────── */
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
  } else if (!connected) {
    body = (
      <div style={{ ...card(), padding: "48px 32px", textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: T.accentBg,
          display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
        }}>
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
      <div className="tr4de-agenda-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        {/* Calendrier */}
        <div style={{ ...card(), padding: 0, overflow: "hidden" }}>
          {/* En-têtes jours */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${T.border}` }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {w}
              </div>
            ))}
          </div>
          {/* Cellules */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(96px, 1fr)" }}>
            {days.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selected);
              const dayEvents = eventsByDay.get(dateKey(d)) || [];
              const shown = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - shown.length;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(startOfDay(d))}
                  style={{
                    textAlign: "left", border: "none", cursor: "pointer", fontFamily: "inherit",
                    borderRight: (i % 7 !== 6) ? `1px solid ${T.border}` : "none",
                    borderBottom: i < 35 ? `1px solid ${T.border}` : "none",
                    background: isSelected ? T.accentBg : "transparent",
                    padding: "6px 6px 8px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0,
                    opacity: inMonth ? 1 : 0.4,
                  }}
                >
                  <div style={{
                    alignSelf: "flex-start",
                    fontSize: 12, fontWeight: isToday ? 700 : 500,
                    color: isToday ? "#fff" : T.text,
                    background: isToday ? T.text : "transparent",
                    borderRadius: 999, minWidth: 22, height: 22,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px",
                  }}>
                    {d.getDate()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    {shown.map((ev) => (
                      <div key={ev.id} title={ev.summary} style={{
                        display: "flex", alignItems: "center", gap: 4, minWidth: 0,
                        fontSize: 10.5, color: T.text,
                        background: `${eventColor(ev)}1A`, borderRadius: 4, padding: "1px 5px",
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: eventColor(ev), flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {!ev.allDay && <span style={{ color: T.textMut, marginRight: 3 }}>{eventTimeLabel(ev)}</span>}
                          {ev.summary}
                        </span>
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div style={{ fontSize: 10, color: T.textMut, paddingLeft: 5 }}>+{overflow} autre{overflow > 1 ? "s" : ""}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panneau du jour sélectionné */}
        <div style={{ ...card(), padding: 16, position: "sticky", top: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            {WEEKDAYS[(selected.getDay() + 6) % 7]} {selected.getDate()} {MONTHS[selected.getMonth()]}
          </div>
          <div style={{ fontSize: 11, color: T.textMut, marginTop: 2, marginBottom: 14 }}>
            {selectedEvents.length === 0 ? "Aucun évènement" : `${selectedEvents.length} évènement${selectedEvents.length > 1 ? "s" : ""}`}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: T.red, background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
              {error}
            </div>
          )}

          {selectedEvents.length === 0 ? (
            <div style={{ padding: "24px 8px", textAlign: "center", color: T.textMut, fontSize: 12 }}>
              Rien de prévu ce jour.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedEvents.map((ev) => (
                <a
                  key={ev.id}
                  href={ev.htmlLink || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block", textDecoration: "none",
                    borderLeft: `3px solid ${eventColor(ev)}`,
                    background: T.bg, border: `1px solid ${T.border}`, borderLeftWidth: 3, borderLeftColor: eventColor(ev),
                    borderRadius: 8, padding: "8px 10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.summary}
                    </span>
                    {ev.htmlLink && <ExternalLink size={12} strokeWidth={2} color={T.textMut} style={{ flexShrink: 0 }} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 11, color: T.textSub }}>
                    <Clock size={11} strokeWidth={2} /> {eventTimeLabel(ev)}
                  </div>
                  {ev.location && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 11, color: T.textMut, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <MapPin size={11} strokeWidth={2} /> {ev.location}
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="anim-1">
      {header}
      {body}
    </div>
  );
}

/* ─────────────── Styles ─────────────── */
const card = () => ({ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12 });
const codeStyle = { background: T.accentBg, padding: "1px 5px", borderRadius: 5, fontSize: 12 };
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
const primaryBtn = () => ({
  display: "inline-flex", alignItems: "center",
  padding: "10px 20px", borderRadius: 999,
  border: `1px solid ${T.text}`, background: T.text, color: "#fff",
  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
});
