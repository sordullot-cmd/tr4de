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
            padding: "7px 14px", height: 34, borderRadius: 8,
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
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 12, width: 220, flexShrink: 0, position: "relative" }}>
                  {/* Header : date + P&L du jour */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1.3 }}>{dateLabel}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: dayPnL >= 0 ? T.green : T.red, letterSpacing: -0.2, lineHeight: 1, whiteSpace: "nowrap" }}>
                      {dayPnL >= 0 ? "+" : ""}{fmt(dayPnL)}
                    </div>
                  </div>

                  {/* Sparkline */}
                  <div style={{ position: "relative", width: "100%", height: 70, marginLeft: -14, marginRight: -14, paddingLeft: 0, paddingRight: 0, width: "calc(100% + 28px)", overflow: "visible" }}>
                    {sparklineData.length > 0 ? (
                      <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
                        preserveAspectRatio="none"
                        style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
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
                            <stop offset="0%" stopColor={sparklineColor} stopOpacity={lastVal >= 0 ? "0.35" : "0.05"} />
                            <stop offset="100%" stopColor={sparklineColor} stopOpacity={lastVal >= 0 ? "0.05" : "0.35"} />
                          </linearGradient>
                        </defs>
                        <line x1="0" y1={sparklineHeight / 2} x2={sparklineWidth} y2={sparklineHeight / 2} stroke={T.border} strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
                        <path
                          d={`M ${points.split(' ')[0]} L ${points} L ${sparklineWidth},${zeroY} L 0,${zeroY} Z`}
                          fill={`url(#grad-${dateStr})`}
                        />
                        <polyline points={points} fill="none" stroke={sparklineColor} strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.textMut }}>—</div>
                    )}

                    {hoveredPoints[dateStr] !== null && hoveredPoints[dateStr] !== undefined && sparklineData[hoveredPoints[dateStr]] !== undefined && (
                      <div style={{
                        position: "absolute",
                        left: `${tooltipPositions[dateStr]?.x}px`,
                        top: `${tooltipPositions[dateStr]?.y - 32}px`,
                        background: "#0D0D0D",
                        color: "#FFFFFF",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        transform: "translateX(-50%)",
                        fontFamily: "var(--font-sans)",
                        zIndex: 9999,
                      }}>
                        {sparklineData[hoveredPoints[dateStr]] >= 0 ? "+" : ""}{sparklineData[hoveredPoints[dateStr]].toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Footer : KPIs sur une ligne */}
                  <div style={{ display: "flex", alignItems: "stretch", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${T.border}`, gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.3 }}>Trades</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1 }}>{dayVolume}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.3 }}>Win rate</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: dayWinRate >= 50 ? T.green : T.text, lineHeight: 1 }}>{dayWinRate}%</div>
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
