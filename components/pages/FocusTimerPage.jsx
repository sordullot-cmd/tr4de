"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, Coffee, Focus } from "lucide-react";
import { useCloudState } from "@/lib/hooks/useCloudState";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const LOG_KEY = "tr4de_focus_sessions";

const MODES = {
  work:       { id: "work",       label: "Focus",    color: "#10A37F", duration: 25 * 60 },
  shortBreak: { id: "shortBreak", label: "Pause",    color: "#3B82F6", duration: 5 * 60 },
  longBreak:  { id: "longBreak",  label: "Longue pause", color: "#6366F1", duration: 15 * 60 },
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtMMSS = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function FocusTimerPage() {
  const [mode, setMode] = useState("work");
  const [remaining, setRemaining] = useState(MODES.work.duration);
  const [running, setRunning] = useState(false);
  const [taskLabel, setTaskLabel] = useState("");
  const [sessions, setSessions] = useCloudState(LOG_KEY, "focus_sessions", []);
  const intervalRef = useRef(null);
  const modeConf = MODES[mode];

  // Start/stop timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            onSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Switch mode -> reset remaining
  useEffect(() => { setRemaining(MODES[mode].duration); }, [mode]);

  const onSessionComplete = () => {
    setRunning(false);
    if (mode === "work") {
      setSessions(prev => [{ id: Date.now(), date: todayIso(), label: taskLabel.trim() || "Session de focus", duration: MODES.work.duration, completedAt: new Date().toISOString() }, ...prev]);
    }
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("tao trade — Timer", { body: mode === "work" ? "Session terminée, fais une pause !" : "Pause terminée, retour au focus.", icon: "/web-app-manifest-192x192.png" });
      }
    } catch {}
  };

  const toggleRun = () => {
    if (!running && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch {}
    }
    setRunning(r => !r);
  };
  const reset = () => { setRunning(false); setRemaining(modeConf.duration); };
  const skip = () => { setRunning(false); onSessionComplete(); setRemaining(modeConf.duration); };

  const pct = 100 - (remaining / modeConf.duration) * 100;
  const radius = 120;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  // Aggregates
  const todaysSessions = sessions.filter(s => s.date === todayIso());
  const todayMinutes = Math.round(todaysSessions.reduce((s, x) => s + x.duration, 0) / 60);
  const weekSessions = sessions.filter(s => {
    const d = new Date(s.date + "T00:00:00");
    const diff = (new Date() - d) / (1000 * 60 * 60 * 24);
    return diff < 7;
  });
  const weekMinutes = Math.round(weekSessions.reduce((s, x) => s + x.duration, 0) / 60);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Focus Timer</h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        {/* Timer card */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 6, padding: 4, background: T.accentBg, borderRadius: 999, marginBottom: 24 }}>
            {Object.values(MODES).map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{
                  padding: "6px 14px", borderRadius: 999, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: mode === m.id ? T.white : "transparent",
                  color: mode === m.id ? T.text : T.textSub,
                  boxShadow: mode === m.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  fontFamily: "inherit",
                }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Donut */}
          <div style={{ position: "relative", width: 280, height: 280 }}>
            <svg width="280" height="280" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="140" cy="140" r={radius} fill="none" stroke={T.accentBg} strokeWidth="8" />
              <circle cx="140" cy="140" r={radius} fill="none" stroke={modeConf.color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.6s linear" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: T.text, letterSpacing: -1, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmtMMSS(remaining)}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>{modeConf.label}</div>
            </div>
          </div>

          {/* Task label */}
          <input
            type="text" value={taskLabel} onChange={(e) => setTaskLabel(e.target.value)}
            placeholder="Sur quoi tu travailles ?"
            style={{ marginTop: 24, width: "100%", maxWidth: 360, padding: "8px 14px", border: `1px solid ${T.border}`, borderRadius: 999, fontSize: 13, outline: "none", fontFamily: "inherit", textAlign: "center", color: T.text, background: T.white }}
          />

          {/* Controls */}
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button onClick={reset} style={ctrlBtn(false)} title="Reset"><RotateCcw size={16} strokeWidth={1.75} /></button>
            <button onClick={toggleRun} style={{ ...ctrlBtn(true, modeConf.color), width: 56, height: 56 }} title={running ? "Pause" : "Start"}>
              {running ? <Pause size={20} strokeWidth={2} /> : <Play size={20} strokeWidth={2} style={{ marginLeft: 3 }} />}
            </button>
            <button onClick={skip} style={ctrlBtn(false)} title="Skip"><SkipForward size={16} strokeWidth={1.75} /></button>
          </div>
        </div>

        {/* Stats + log */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard icon={Focus} label="Aujourd'hui" value={`${todayMinutes}m`} sub={`${todaysSessions.length} session${todaysSessions.length > 1 ? "s" : ""}`} />
            <StatCard icon={Coffee} label="Cette semaine" value={`${weekMinutes}m`} sub={`${weekSessions.length} session${weekSessions.length > 1 ? "s" : ""}`} />
          </div>

          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Historique</div>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {sessions.length === 0 ? (
                <div style={{ padding: "24px 14px", textAlign: "center", color: T.textSub, fontSize: 12 }}>Aucune session terminée pour le moment</div>
              ) : sessions.slice(0, 20).map((s, i) => (
                <div key={s.id} style={{ padding: "10px 14px", borderBottom: i < Math.min(sessions.length, 20) - 1 ? `1px solid ${T.border}` : "none", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: T.textMut, marginTop: 1 }}>{new Date(s.completedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.green, flexShrink: 0 }}>{Math.round(s.duration / 60)}m</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ctrlBtn(primary, color) {
  return {
    width: 44, height: 44, borderRadius: "50%",
    border: primary ? "none" : `1px solid ${T.border}`,
    background: primary ? (color || T.text) : T.white,
    color: primary ? "#fff" : T.textSub,
    cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
}
function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
        <Icon size={12} strokeWidth={1.75} /> {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.3, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginTop: 4 }}>{sub}</div>
    </div>
  );
}
