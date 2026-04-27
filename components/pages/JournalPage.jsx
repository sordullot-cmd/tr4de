"use client";

import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n";
import { fmt } from "@/lib/ui/format";
import { useTradeNotes } from "@/lib/hooks/useTradeNotes";
import { useDailySessionNotes } from "@/lib/hooks/useDailySessionNotes";
import { exportJournalPdf } from "@/lib/export/journalPdf";
import { getCurrencySymbol } from "@/lib/userPrefs";

export default function JournalPage({ trades = [] }) {
  const { notes: tradeNotes, setNote: updateTradeNote } = useTradeNotes();
  const { notes: dailyNotes, setNote: updateDailyNote } = useDailySessionNotes();

  const [expandedTrades, setExpandedTrades] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [hoveredPoints, setHoveredPoints] = useState({});
  const [tooltipPositions, setTooltipPositions] = useState({});
  const [filterMode, setFilterMode] = useState("week");

  const getWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + daysToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  };

  const [filterStartDate, setFilterStartDate] = useState(() => getWeekRange().start);
  const [filterEndDate, setFilterEndDate] = useState(() => getWeekRange().end);

  useEffect(() => {
    if (filterMode !== "week") return;
    const checkAndUpdateWeek = () => {
      const range = getWeekRange();
      setFilterStartDate(range.start);
      setFilterEndDate(range.end);
    };
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
      checkAndUpdateWeek();
      setInterval(checkAndUpdateWeek, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  }, [filterMode]);

  const getTradeId = (trade) => trade.date + trade.symbol + trade.entry;

  const filteredTrades = trades;
  const tradesByDate = {};
  filteredTrades.forEach(tr => {
    try {
      const d = new Date(tr.date);
      if (isNaN(d.getTime())) return;
      const dateStr = d.toISOString().split('T')[0];
      if (!tradesByDate[dateStr]) tradesByDate[dateStr] = [];
      tradesByDate[dateStr].push(tr);
    } catch (e) {}
  });

  const sortedDates = Object.keys(tradesByDate).sort().reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: "#0D0D0D", margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>{t("journal.title")}</h1>
        <button
          type="button"
          aria-label="Exporter le journal en PDF"
          disabled={trades.length === 0}
          onClick={() => exportJournalPdf({
            trades,
            dailyNotes,
            tradeNotes,
            currencySymbol: getCurrencySymbol(),
            title: t("journal.title"),
          })}
          style={{
            marginLeft: "auto",
            padding: "7px 16px", height: 34, borderRadius: 999,
            background: trades.length === 0 ? T.bg : T.text,
            border: `1px solid ${trades.length === 0 ? T.border : T.text}`,
            color: trades.length === 0 ? T.textMut : "#fff",
            fontSize: 13, fontWeight: 600,
            cursor: trades.length === 0 ? "not-allowed" : "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "inherit",
          }}
        >
          <Download size={14} strokeWidth={1.75} /> Exporter PDF
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {sortedDates.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {sortedDates.map((dateStr) => {
            const dayTrades = tradesByDate[dateStr].sort((a, b) => new Date(a.date) - new Date(b.date));
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dateLabel = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const dayVolume = dayTrades.length;
            const dayWins = dayTrades.filter(tr => tr.pnl > 0).length;
            const dayWinRate = dayVolume > 0 ? ((dayWins / dayVolume) * 100).toFixed(0) : 0;
            const dayPnL = dayTrades.reduce((sum, tr) => sum + tr.pnl, 0);

            let cumulative = 0;
            const sparklineData = dayTrades.map(tr => {
              cumulative += tr.pnl;
              return cumulative;
            });

            const maxVal = Math.max(...sparklineData, 0);
            const minVal = Math.min(...sparklineData, 0);
            const range = Math.max(Math.abs(maxVal), Math.abs(minVal)) || 1;

            const sparklineWidth = 120;
            const sparklineHeight = 80;
            const padding = 0;
            const chartWidth = sparklineWidth - padding * 2;
            const chartHeight = sparklineHeight - padding * 2;

            const lastVal = sparklineData[sparklineData.length - 1] || 0;
            const zeroY = lastVal >= 0 ? sparklineHeight / 2 : 0;

            const points = sparklineData.map((val, i) => {
              const x = (i / (sparklineData.length - 1 || 1)) * chartWidth + padding;
              const y = zeroY - (val / range) * (chartHeight / 2);
              return `${x},${y}`;
            }).join(' ');

            const sparklineColor = lastVal >= 0 ? T.green : T.red;

            return (
              <div key={dateStr} className="tr4de-journal-row" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 0, width: 220, aspectRatio: "1 / 1", flexShrink: 0, position: "relative" }}>
                  <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", justifyContent: "flex-start", marginBottom: "20px", overflow: "hidden", marginLeft: "-16px", marginRight: "-16px", position: "relative" }}>
                    <div style={{ position: "absolute", bottom: "-50px", left: "0", right: "0", height: "1px", background: T.border }}></div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text, textAlign: "left", padding: "0 16px", marginBottom: 4 }}>{dateLabel}</div>
                    {sparklineData.length > 0 && (
                      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "visible" }}>
                        <svg
                          width="100%"
                          height="100%"
                          viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
                          preserveAspectRatio="none"
                          style={{ width: "100%", height: "100%", display: "block", overflow: "hidden" }}
                          onMouseMove={(e) => {
                            const svg = e.currentTarget;
                            const rect = svg.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * sparklineWidth;
                            const pointIndex = Math.round((x / sparklineWidth) * (sparklineData.length - 1));
                            if (pointIndex >= 0 && pointIndex < sparklineData.length) {
                              const pointX = (pointIndex / (sparklineData.length - 1 || 1)) * sparklineWidth;
                              const pixelX = (pointX / sparklineWidth) * rect.width;
                              const val = sparklineData[pointIndex];
                              const rangeLocal = Math.max(Math.abs(Math.max(...sparklineData, 0)), Math.abs(Math.min(...sparklineData, 0))) || 1;
                              const zeroYLocal = lastVal >= 0 ? sparklineHeight / 2 : 0;
                              const svgY = zeroYLocal - (val / rangeLocal) * (sparklineHeight / 2);
                              const pixelY = (svgY / sparklineHeight) * rect.height;
                              setHoveredPoints({ ...hoveredPoints, [dateStr]: pointIndex });
                              setTooltipPositions({ ...tooltipPositions, [dateStr]: { x: pixelX, y: pixelY } });
                            }
                          }}
                          onMouseLeave={() => { setHoveredPoints({ ...hoveredPoints, [dateStr]: null }); }}
                        >
                          <defs>
                            <linearGradient id={`grad-${dateStr}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.5" />
                              <stop offset="100%" stopColor={sparklineColor} stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          {(() => {
                            const fillBaseY = lastVal >= 0 ? zeroY : sparklineHeight;
                            return (
                              <path
                                d={`M ${points.split(' ')[0]} L ${points} L ${sparklineWidth},${fillBaseY} L 0,${fillBaseY} Z`}
                                fill={`url(#grad-${dateStr})`}
                              />
                            );
                          })()}
                          <polyline points={points} fill="none" stroke={sparklineColor} strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {hoveredPoints[dateStr] !== null && hoveredPoints[dateStr] !== undefined && sparklineData[hoveredPoints[dateStr]] !== undefined && (
                    <div style={{
                      position: "absolute",
                      left: `${tooltipPositions[dateStr]?.x}px`,
                      top: `${tooltipPositions[dateStr]?.y - 40}px`,
                      background: "#000000",
                      color: sparklineData[hoveredPoints[dateStr]] >= 0 ? T.green : T.red,
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 400,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      transform: "translateX(-50%)",
                      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                      letterSpacing: "0.3px",
                      zIndex: 9999,
                    }}>
                      {sparklineData[hoveredPoints[dateStr]] >= 0 ? "+" : ""}{sparklineData[hoveredPoints[dateStr]].toFixed(2)}
                    </div>
                  )}

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div className="tr4de-journal-kpis" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: T.textMut, textTransform: "uppercase", marginBottom: 2 }}>Trades</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{dayVolume}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: T.textMut, textTransform: "uppercase", marginBottom: 2 }}>Total</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{trades.length}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: T.textMut, textTransform: "uppercase", marginBottom: 2 }}>Taux victoire</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.green }}>{dayWinRate}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: T.textMut, textTransform: "uppercase", marginBottom: 2 }}>PnL du jour</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: dayPnL >= 0 ? T.green : T.red }}>{dayPnL >= 0 ? "+" : ""}{fmt(dayPnL)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  <textarea
                    placeholder={t("journal.dailyNotes")}
                    value={dailyNotes[dateStr] || ""}
                    onChange={(e) => updateDailyNote(dateStr, e.target.value)}
                    style={{
                      width: "100%",
                      height: 200,
                      border: `1px solid ${T.border}`,
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 12,
                      fontFamily: "var(--font-sans)",
                      color: T.text,
                      background: T.white,
                      resize: "none",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />

                  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                    <div className="tr4de-table-wrap" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                          <tr>
                            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase" }}>Entry Time</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase" }}>Exit Time</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase" }}>Symbol</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase" }}>Side</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase" }}>Net P&L</th>
                            <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase" }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const isDayExpanded = !!expandedDays[dateStr];
                            const visibleTrades = isDayExpanded ? dayTrades : dayTrades.slice(0, 3);
                            const hiddenCount = dayTrades.length - visibleTrades.length;
                            return (
                              <>
                                {visibleTrades.map((trade, i) => {
                                  const fmtTime = (v) => {
                                    if (!v) return "—";
                                    if (/^\d{1,2}:\d{2}/.test(String(v))) return String(v).slice(0, 5);
                                    const d = new Date(v);
                                    if (isNaN(d.getTime())) return "—";
                                    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                                  };
                                  const entryTime = fmtTime(trade.entryTime || trade.entry_time);
                                  const exitTime = fmtTime(trade.exitTime || trade.exit_time);
                                  const rowKey = `${dateStr}_${i}`;
                                  const tradeId = getTradeId(trade);
                                  const isExpanded = !!expandedTrades[rowKey];
                                  const hasNote = tradeNotes[tradeId] && tradeNotes[tradeId].trim().length > 0;

                                  return (
                                    <React.Fragment key={rowKey}>
                                      <tr style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.bg : "transparent" }}>
                                        <td style={{ padding: "8px 12px", fontSize: 11, color: T.text }}>{entryTime}</td>
                                        <td style={{ padding: "8px 12px", fontSize: 11, color: T.text }}>{exitTime}</td>
                                        <td style={{ padding: "8px 12px", fontSize: 11, color: T.text }}>{trade.symbol}</td>
                                        <td style={{ padding: "8px 12px", fontSize: 11, color: T.text }}><span style={{ color: trade.side === "Long" ? T.blue : T.red }}>{trade.side || "Long"}</span></td>
                                        <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, color: trade.pnl >= 0 ? T.green : T.red, fontFamily: "var(--font-sans)" }}>{fmt(trade.pnl, true)}</td>
                                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                          <button
                                            onClick={() => setExpandedTrades(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                                            style={{
                                              background: hasNote ? T.accentBg : T.bg,
                                              border: `1px solid ${hasNote ? T.accentBd : T.border}`,
                                              borderRadius: 6,
                                              padding: "4px 10px",
                                              fontSize: 10,
                                              color: hasNote ? T.accent : T.textMut,
                                              cursor: "pointer",
                                              textTransform: "uppercase",
                                            }}
                                          >
                                            {isExpanded ? "✕" : "✎"}
                                          </button>
                                        </td>
                                      </tr>
                                      {isExpanded && (
                                        <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                                          <td colSpan="6" style={{ padding: "12px 12px" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                              <div style={{ fontSize: 11, color: T.textMut, textTransform: "uppercase" }}>Notes pour {trade.symbol}</div>
                                              <textarea
                                                placeholder={t("journal.tradeNote")}
                                                value={tradeNotes[tradeId] || ""}
                                                onChange={(e) => updateTradeNote(tradeId, e.target.value)}
                                                style={{
                                                  width: "100%",
                                                  height: 60,
                                                  border: `1px solid ${T.border}`,
                                                  borderRadius: 8,
                                                  padding: 12,
                                                  fontSize: 12,
                                                  fontFamily: "var(--font-sans)",
                                                  color: T.text,
                                                  background: T.white,
                                                  resize: "none",
                                                  outline: "none",
                                                  boxSizing: "border-box",
                                                }}
                                              />
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                                {dayTrades.length > 3 && (
                                  <tr>
                                    <td colSpan="6" style={{ padding: 0 }}>
                                      <button
                                        onClick={() => setExpandedDays(prev => ({ ...prev, [dateStr]: !prev[dateStr] }))}
                                        style={{
                                          width: "100%",
                                          padding: "10px 12px",
                                          background: "transparent",
                                          border: "none",
                                          borderTop: `1px solid ${T.border}`,
                                          cursor: "pointer",
                                          fontSize: 11,
                                          color: T.textSub,
                                          fontFamily: "var(--font-sans)",
                                          transition: "background 0.15s",
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                      >
                                        {isDayExpanded ? t("trades.voirMoins") : t("trades.voirPlus").replace("{n}", String(hiddenCount))}
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: T.white, border: `2px dashed ${T.border}`, borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: T.text }}>{t("journal.empty")}</div>
          <p style={{ color: T.textSub }}>{t("journal.emptySub")}</p>
        </div>
      )}
    </div>
  );
}
