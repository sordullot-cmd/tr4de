"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PnLTrendChartProps {
  trades: any[];
}

export function PnLTrendChart({ trades }: PnLTrendChartProps) {
  // Calculer le P&L par jour
  const dataByDay = trades.reduce(
    (acc: any, trade: any) => {
      const date = new Date(trade.entry_time).toLocaleDateString("fr-FR");
      if (!acc[date]) {
        acc[date] = { date, pnl: 0, wins: 0, losses: 0 };
      }
      acc[date].pnl += trade.pnl || 0;
      if (trade.pnl > 0) acc[date].wins++;
      if (trade.pnl < 0) acc[date].losses++;
      return acc;
    },
    {}
  );

  const data = Object.values(dataByDay)
    .slice(-30)
    .map((d: any) => ({
      ...d,
      pnl: parseFloat(d.pnl.toFixed(2)),
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
        💰 P&L par Jour (30 derniers jours)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
          <YAxis tick={{ fontSize: 12 }} stroke="#8E8E8E" />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 8,
            }}
            formatter={(value: any) => [`${value.toFixed(2)}$`, "P&L"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Bar
            dataKey="pnl"
            fill="#3B82F6"
            radius={[8, 8, 0, 0]}
            name="P&L ($)"
            shape={{
              fill: (props: any) => {
                const { fill, x, y, width, height, payload } = props;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={payload.pnl > 0 ? "#16A34A" : "#EF4444"}
                    rx={4}
                  />
                );
              },
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
