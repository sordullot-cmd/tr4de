import React from "react";

interface MetricsCardsProps {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnL: number;
  monthlyPnL: number;
  avgRiskReward: number;
}

export function MetricsCards({
  totalTrades,
  winRate,
  profitFactor,
  totalPnL,
  monthlyPnL,
  avgRiskReward,
}: MetricsCardsProps) {
  const metrics = [
    {
      label: "Total Trades",
      value: totalTrades,
      format: "number",
      color: "#3B82F6",
      icon: "📊",
    },
    {
      label: "Win Rate",
      value: winRate,
      format: "percent",
      color: "#10A37F",
      icon: "🎯",
    },
    {
      label: "Profit Factor",
      value: profitFactor,
      format: "decimal",
      color: "#A855F7",
      icon: "📈",
    },
    {
      label: "Total P&L",
      value: totalPnL,
      format: "currency",
      color: totalPnL > 0 ? "#10A37F" : "#EF4444",
      icon: "💰",
    },
    {
      label: "Monthly P&L",
      value: monthlyPnL,
      format: "currency",
      color: monthlyPnL > 0 ? "#10A37F" : "#EF4444",
      icon: "📅",
    },
    {
      label: "Avg R:R",
      value: avgRiskReward,
      format: "decimal",
      color: "#F97316",
      icon: "⚖️",
    },
  ];

  const formatValue = (val: number, format: string) => {
    switch (format) {
      case "percent":
        return `${val.toFixed(1)}%`;
      case "currency":
        return `${val > 0 ? "+" : ""}${val.toFixed(2)}$`;
      case "decimal":
        return val.toFixed(2);
      default:
        return val.toFixed(0);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}
    >
      {metrics.map((metric, i) => (
        <div
          key={i}
          style={{
            padding: 16,
            background: "#FAFAFA",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#E5E5E5";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FAFAFA";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 20 }}>{metric.icon}</span>
            <span
              style={{
                fontSize: 11,
                color: "#5C5C5C",
                fontWeight: 500,
                letterSpacing: 0.2,
              }}
            >
              {metric.label}
            </span>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: metric.color,
            }}
          >
            {formatValue(metric.value, metric.format)}
          </div>
        </div>
      ))}
    </div>
  );
}
