"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  trend?: { value: number; period?: string };
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg";
  positive?: boolean;
  negative?: boolean;
  onClick?: () => void;
}

export function Stat({ label, value, subtext, trend, icon: Icon, size = "md", positive, negative, onClick }: StatProps) {
  const valueSize = size === "sm" ? 18 : size === "md" ? 24 : 32;
  const labelSize = 11;

  const valueColor = positive ? "#10A37F" : negative ? "#EF4444" : "#0D0D0D";

  const content = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {Icon && <Icon size={13} strokeWidth={1.75} color="#8E8E8E" />}
        <span style={{ fontSize: labelSize, fontWeight: 500, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: valueSize, fontWeight: 600, color: valueColor, lineHeight: 1.1, fontFamily: "var(--font-sans)" }}>
        {value}
      </div>
      {(subtext || trend) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11, color: "#5C5C5C" }}>
          {trend && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: trend.value >= 0 ? "#10A37F" : "#EF4444", fontWeight: 600 }}>
              {trend.value >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {trend.value >= 0 ? "+" : ""}{trend.value.toFixed(1)}%
              {trend.period && <span style={{ color: "#8E8E8E", fontWeight: 400 }}>{trend.period}</span>}
            </span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E5E5",
          borderRadius: 12,
          padding: 20,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#D4D4D4";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#E5E5E5";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E5E5",
      borderRadius: 12,
      padding: 20,
    }}>
      {content}
    </div>
  );
}
