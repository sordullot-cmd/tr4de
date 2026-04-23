"use client";

import React from "react";

interface HourlyHeatmapProps {
  trades: any[];
}

export function HourlyHeatmap({ trades }: HourlyHeatmapProps) {
  // Créer une heatmap jour × heure
  const heatmapData: Record<number, Record<number, { count: number; pnl: number }>> = {};

  trades.forEach((trade: any) => {
    const date = new Date(trade.entry_time);
    const dayOfWeek = date.getDay(); // 0-6
    const hour = date.getHours(); // 0-23

    if (!heatmapData[dayOfWeek]) {
      heatmapData[dayOfWeek] = {};
    }
    if (!heatmapData[dayOfWeek][hour]) {
      heatmapData[dayOfWeek][hour] = { count: 0, pnl: 0 };
    }

    heatmapData[dayOfWeek][hour].count++;
    heatmapData[dayOfWeek][hour].pnl += trade.pnl || 0;
  });

  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getColor = (pnl: number, count: number) => {
    if (count === 0) return "#f0f0f0";
    const avgPnL = pnl / count;
    if (avgPnL > 50) return "#065f46"; // Dark green
    if (avgPnL > 20) return "#10b981"; // Green
    if (avgPnL > 0) return "#a7f3d0"; // Light green
    if (avgPnL > -20) return "#fee2e2"; // Light red
    if (avgPnL > -50) return "#fca5a5"; // Red
    return "#dc2626"; // Dark red
  };

  return (
    <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 12 }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>
        🔥 Heatmap Jour × Heure (P&L Moyen)
      </h3>

      <div
        style={{
          overflowX: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Header avec heures */}
        <div style={{ display: "flex", gap: 2, marginLeft: 80 }}>
          {hours.map((h) => (
            <div
              key={h}
              style={{
                width: 30,
                textAlign: "center",
                fontSize: 10,
                fontWeight: 500,
                color: "#5C5C5C",
              }}
            >
              {h}h
            </div>
          ))}
        </div>

        {/* Rows par jour */}
        {dayNames.map((day, dayIndex) => (
          <div key={dayIndex} style={{ display: "flex", gap: 2, alignItems: "center" }}>
            <div
              style={{
                width: 80,
                fontSize: 12,
                fontWeight: 500,
                color: "#0D0D0D",
              }}
            >
              {day}
            </div>
            {hours.map((hour) => {
              const data = heatmapData[dayIndex]?.[hour];
              const count = data?.count || 0;
              const pnl = data?.pnl || 0;
              const avgPnL = count > 0 ? pnl / count : 0;

              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  style={{
                    width: 30,
                    height: 30,
                    background: getColor(pnl, count),
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    fontWeight: 600,
                    color: avgPnL > 15 || avgPnL < -15 ? "#fff" : "#000",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  title={`${day} ${hour}h: ${count} trades, ${avgPnL > 0 ? "+" : ""}${avgPnL.toFixed(0)}$`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {count > 0 ? count : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Légende */}
      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 20, background: "#dc2626", borderRadius: 4 }} />
          <span>&lt; -50$</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 20, background: "#fca5a5", borderRadius: 4 }} />
          <span>-50$ à -20$</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 20, background: "#fee2e2", borderRadius: 4 }} />
          <span>-20$ à 0$</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 20, background: "#a7f3d0", borderRadius: 4 }} />
          <span>0$ à 20$</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 20, background: "#10b981", borderRadius: 4 }} />
          <span>20$ à 50$</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 20, background: "#065f46", borderRadius: 4 }} />
          <span>&gt; 50$</span>
        </div>
      </div>
    </div>
  );
}
