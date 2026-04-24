"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Battery, Moon, Dumbbell, TrendingUp } from "lucide-react";
import { useTrades } from "@/lib/hooks/useTradeData";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B", purple: "#A855F7",
};

const STORAGE_KEY = "tr4de_energy_sleep";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function EnergySleepPage() {
  const tradesHook = useTrades();
  const trades = tradesHook?.trades || [];

  const [entries, setEntries] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {} }, [entries]);

  const today = todayIso();
  const todayEntry = entries[today] || { energy: 7, sleepHours: 7, sport: false };
  const updateToday = (patch) => setEntries(prev => ({ ...prev, [today]: { ...todayEntry, ...patch } }));

  // Last 14 days
  const days = useMemo(() => {
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      arr.push({ iso, day: d.getDate(), weekday: d.toLocaleDateString("fr-FR", { weekday: "narrow" }).toUpperCase() });
    }
    return arr;
  }, [entries]); // recompute when entries change

  // Correlate with trading P&L
  const correlations = useMemo(() => {
    const rows = []; // { sleepBucket, pnlAvg, count }
    const buckets = {
      low:  { label: "< 6h",    min: 0,    max: 5.99, pnls: [] },
      mid:  { label: "6–7h",    min: 6,    max: 6.99, pnls: [] },
      good: { label: "7–8h",    min: 7,    max: 7.99, pnls: [] },
      best: { label: "> 8h",    min: 8,    max: 99,   pnls: [] },
    };
    Object.entries(entries).forEach(([iso, e]) => {
      const dayTrades = trades.filter(t => {
        const d = new Date(t.date);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return key === iso;
      });
      if (dayTrades.length === 0) return;
      const pnl = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      const h = parseFloat(e.sleepHours) || 0;
      for (const k of Object.keys(buckets)) {
        if (h >= buckets[k].min && h <= buckets[k].max) {
          buckets[k].pnls.push(pnl);
          break;
        }
      }
    });
    for (const k of Object.keys(buckets)) {
      const b = buckets[k];
      const avg = b.pnls.length > 0 ? b.pnls.reduce((s, x) => s + x, 0) / b.pnls.length : null;
      rows.push({ label: b.label, avg, count: b.pnls.length });
    }
    return rows;
  }, [entries, trades]);

  // Energy x P&L insight
  const avgSleepBestPnL = useMemo(() => {
    const arr = correlations.filter(r => r.count > 0 && r.avg !== null);
    if (arr.length === 0) return null;
    return arr.reduce((a, b) => (b.avg > a.avg ? b : a));
  }, [correlations]);

  const energyColor = todayEntry.energy >= 8 ? T.green : todayEntry.energy >= 5 ? T.amber : T.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Énergie & Sommeil</h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>

      {/* Today card */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Aujourd&apos;hui</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          {/* Energy */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Battery size={14} strokeWidth={1.75} color={T.textSub} />
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Énergie</div>
              <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: energyColor }}>{todayEntry.energy}/10</div>
            </div>
            <input type="range" min={1} max={10} step={1} value={todayEntry.energy}
              onChange={(e) => updateToday({ energy: parseInt(e.target.value, 10) })}
              style={{ width: "100%", accentColor: energyColor }} />
          </div>
          {/* Sleep */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Moon size={14} strokeWidth={1.75} color={T.textSub} />
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Sommeil</div>
              <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: T.blue }}>{todayEntry.sleepHours}h</div>
            </div>
            <input type="range" min={0} max={12} step={0.5} value={todayEntry.sleepHours}
              onChange={(e) => updateToday({ sleepHours: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: T.blue }} />
          </div>
          {/* Sport */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Dumbbell size={14} strokeWidth={1.75} color={T.textSub} />
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Sport</div>
            </div>
            <button onClick={() => updateToday({ sport: !todayEntry.sport })}
              style={{
                width: "100%", padding: "10px 14px",
                borderRadius: 8,
                border: `1.5px solid ${todayEntry.sport ? T.green : T.border}`,
                background: todayEntry.sport ? T.green : T.white,
                color: todayEntry.sport ? "#fff" : T.text,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all .15s ease",
              }}>
              {todayEntry.sport ? "✓ Fait" : "Pas encore"}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>14 derniers jours</div>
        <div style={{ display: "grid", gridTemplateColumns: `60px repeat(14, 1fr)`, gap: 4, alignItems: "center" }}>
          <div />
          {days.map(d => <div key={d.iso} style={{ textAlign: "center", fontSize: 9, color: T.textMut }}>{d.weekday}<br /><span style={{ color: d.iso === today ? T.text : T.textSub, fontWeight: 600 }}>{d.day}</span></div>)}

          <div style={{ fontSize: 10, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Énergie</div>
          {days.map(d => {
            const e = entries[d.iso]?.energy;
            const col = e == null ? T.accentBg : e >= 8 ? T.green : e >= 5 ? T.amber : T.red;
            return <div key={"e"+d.iso} title={e ? `${e}/10` : "–"} style={{ height: 22, borderRadius: 4, background: col, opacity: e == null ? 0.6 : (e / 10) * 0.6 + 0.4 }} />;
          })}

          <div style={{ fontSize: 10, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Sommeil</div>
          {days.map(d => {
            const h = entries[d.iso]?.sleepHours;
            const col = h == null ? T.accentBg : h >= 7 ? T.blue : h >= 5 ? T.amber : T.red;
            return <div key={"s"+d.iso} title={h ? `${h}h` : "–"} style={{ height: 22, borderRadius: 4, background: col, opacity: h == null ? 0.6 : Math.min(1, (h / 10) * 0.6 + 0.4) }} />;
          })}

          <div style={{ fontSize: 10, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Sport</div>
          {days.map(d => {
            const s = entries[d.iso]?.sport;
            return <div key={"sp"+d.iso} title={s ? "Fait" : "–"} style={{ height: 22, borderRadius: 4, background: s ? T.green : T.accentBg, opacity: s ? 1 : 0.6 }} />;
          })}
        </div>
      </div>

      {/* Correlation with trading P&L */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <TrendingUp size={14} strokeWidth={1.75} color={T.textSub} />
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Sommeil × P&L trading</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {correlations.map(r => (
            <div key={r.label} style={{ padding: 12, background: T.accentBg, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{r.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: r.avg == null ? T.textMut : r.avg >= 0 ? T.green : T.red, marginTop: 4 }}>
                {r.avg == null ? "—" : `${r.avg >= 0 ? "+" : ""}${r.avg.toFixed(0)}$`}
              </div>
              <div style={{ fontSize: 10, color: T.textMut, fontWeight: 500, marginTop: 2 }}>{r.count} jour{r.count > 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
        {avgSleepBestPnL && (
          <div style={{ marginTop: 12, padding: 10, background: T.green + "14", borderRadius: 8, borderLeft: `3px solid ${T.green}`, fontSize: 12, color: T.text }}>
            💡 Tes meilleures sessions de trading arrivent quand tu dors <strong>{avgSleepBestPnL.label}</strong> (moyenne {avgSleepBestPnL.avg.toFixed(0)}$).
          </div>
        )}
      </div>
    </div>
  );
}
