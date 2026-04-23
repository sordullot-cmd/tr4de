"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface WinRateChartProps {
  trades: any[];
}

export function WinRateChart({ trades }: WinRateChartProps) {
  // Calculer le win rate par jour
  const dataByDay = trades.reduce(
    (acc: any, trade: any) => {
      const date = new Date(trade.entry_time).toLocaleDateString("fr-FR");
      if (!acc[date]) {
        acc[date] = { date, wins: 0, total: 0, winRate: 0 };
      }
      acc[date].total++;
      if (trade.pnl > 0) acc[date].wins++;
      acc[date].winRate = ((acc[date].wins / acc[date].total) * 100).toFixed(1);
      return acc;
    },
    {}
  );

  const data = Object.values(dataByDay)
    .slice(-30)
    .map((d: any) => ({
      ...d,
      winRate: parseFloat(d.winRate),
    }));

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          background: "#FAFAFA",
          borderRadius: 12,
          textAlign: "center",
          color: "#8E8E8E",
        }}
      >
        Pas assez de données
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 12 }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>
        📈 Win Rate Évolution (30 derniers jours)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#8E8E8E"
            tickFormatter={(val) => {
              const parts = val.split("/");
              return `${parts[0]}/${parts[1]}`;
            }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            stroke="#8E8E8E"
            label={{ value: "%", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 8,
            }}
            formatter={(value: any) => [`${value.toFixed(1)}%`, "Win Rate"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="winRate"
            stroke="#10A37F"
            strokeWidth={3}
            dot={{ fill: "#10A37F", r: 4 }}
            activeDot={{ r: 6 }}
            name="Win Rate %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
