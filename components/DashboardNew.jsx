"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { parseCSV, calculateStats } from "@/lib/csvParsers";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { useTrades } from "@/lib/hooks/useTradeData";
import { useStrategies, useUserPreferences } from "@/lib/hooks/useUserData";
import { useTradeNotes } from "@/lib/hooks/useTradeNotes";
import { useTradeEmotionTags, useTradeErrorTags } from "@/lib/hooks/useTradeEmotionTags";
import { useDailySessionNotes } from "@/lib/hooks/useDailySessionNotes";
import { useDisciplineTracking } from "@/lib/hooks/useDisciplineTracking";
import { useCustomDisciplineRules } from "@/lib/hooks/useCustomDisciplineRules";
import { getPlaceholderAccountId, isPlaceholderAccount } from "@/lib/utils/placeholderAccount";
import StrategyPage from "@/components/StrategyPage";
import StrategyDetailPage from "@/components/StrategyDetailPage";
import QuickAccountSelector from "@/components/QuickAccountSelector";
import MultiAccountSelector from "@/components/MultiAccountSelector";

/* ─── TOKENS ─────────────────────────────────────────────────────── */
const T = {
  white:   "#FFFFFF",
  bg:      "#F8FAFB",
  surface: "#FFFFFF",
  border:  "#E3E6EB",
  border2: "#CED3DB",
  text:    "#1A1F2E",
  textSub: "#5F6B7E",
  textMut: "#8B95AA",
  green:   "#16A34A",
  greenBg: "#DCFCE7",
  greenBd: "#93C5FD",
  red:     "#AD6B6B",
  redBg:   "#F5E6E6",
  redBd:   "#E0BFBF",
  accent:  "#5F7FB4",
  accentBg:"#E3ECFB",
  accentBd:"#B8CCEB",
  amber:   "#9D8555",
  amberBg: "#F5EAE0",
  blue:    "#5F7FB4",
  blueBg:  "#E3ECFB",
};

const css = ` @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #FFFFFF; color: ${T.text}; font-family: 'DM Sans', sans-serif; min-height: 100vh; font-size: 14px; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
  button { font-family: inherit; cursor: pointer; }
  select { font-family: inherit; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .anim-1 { animation: fadeUp .35s ease both; }
  .anim-2 { animation: fadeUp .35s .05s ease both; }
  .nav-item:hover { background: ${T.bg} !important; }
  .card-hover:hover { box-shadow: 0 4px 16px rgba(0,0,0,.07) !important; }
`;

const fmt = (n, sign=false) => `${sign && n>0?"+":""}${n<0?"-":""}$${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

function Pill({ children, color="gray", small }) {
  const map = {
    green: { bg:T.greenBg, bd:T.greenBd, txt:T.green },
    red:   { bg:T.redBg,   bd:T.redBd,   txt:T.red   },
    blue:  { bg:T.blueBg,  bd:"#DCFCE7",  txt:T.blue  },
    gray:  { bg:T.bg,      bd:T.border,   txt:T.textSub },
  };
  const s = map[color] || map.gray;
  return <span style={{display:"inline-flex", alignItems:"center", padding: small ? "1px 7px" : "3px 10px", borderRadius: 20, fontSize: small ? 11 : 12, fontWeight: 500, background: s.bg, border: `1px solid ${s.bd}`, color: s.txt,}}>{children}</span>;
}

function TradingViewChart({ trade }) {
  return null; // Removed chart component
}

function Dashboard({ trades = [] }) {
  const [emotionTags, setEmotionTags] = React.useState({});
  const [errorTags, setErrorTags] = React.useState({});
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = React.useState(null);
  const [hoveredChart, setHoveredChart] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  const allEmotionTags = [
    { id: "fomo", label: "FOMO", color: "#C94F4F" },
    { id: "revenge", label: "Vengeance", color: "#C94F4F" },
    { id: "overconfident", label: "Trop confiant", color: "#D4A574" },
    { id: "hesitation", label: "Hésitation", color: "#D4A574" },
    { id: "calm", label: "Calme & focus", color: "#4A9D6F" },
    { id: "followed", label: "Plan suivi", color: "#4A9D6F" },
    { id: "boredom", label: "Trade ennui", color: "#5B7EC9" },
    { id: "earlyexit", label: "Sortie anticipée", color: "#8B6BB6" }
  ];

  const allErrorTags = [
    { id: "poorentry", label: "Mauvaise entrée", color: "#C94F4F" },
    { id: "poorexit", label: "Mauvaise sortie", color: "#C94F4F" },
    { id: "nosltp", label: "Pas de SL/TP", color: "#D4A574" },
    { id: "overleveraged", label: "Sur-leveragé", color: "#D4A574" },
    { id: "ignoredsignal", label: "Signaux ignorés", color: "#8B6BB6" },
    { id: "badtiming", label: "Mauvais timing", color: "#C94F4F" },
    { id: "impulsive", label: "Impulsif", color: "#D4A574" },
    { id: "wronganalysis", label: "Mauvaise analyse", color: "#8B6BB6" }
  ];

  // Load emotion tags from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("tr4de_emotion_tags");
      if (saved) {
        const parsed = JSON.parse(saved);
        setEmotionTags(parsed);
      }
    } catch (err) {
      console.error("Error loading emotion tags:", err);
    }
  }, []);

  // Load error tags from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("tr4de_error_tags");
      if (saved) {
        const parsed = JSON.parse(saved);
        setErrorTags(parsed);
      }
    } catch (err) {
      console.error("Error loading error tags:", err);
    }
  }, []);

  if (!trades || trades.length === 0) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
        <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>📊 Tableau de bord</div>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"60px 24px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:600,marginBottom:8,color:T.text}}>Aucun trade à afficher</div>
          <p style={{color:T.textSub}}>Importez votre premier trade pour voir les statistiques et les graphiques de performance.</p>
        </div>
      </div>
    );
  }

  const totalPnL = trades.reduce((s,t)=>s+t.pnl,0);
  const wins = trades.filter(t=>t.pnl>0);
  const losses = trades.filter(t=>t.pnl<0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = ((winCount/(winCount+lossCount))*100).toFixed(1);
  const profitFactor = (wins.reduce((s,t)=>s+t.pnl,0)/Math.abs(losses.reduce((s,t)=>s+t.pnl,0)||1)).toFixed(2);
  const avgWin = wins.length ? wins.reduce((s,t)=>s+t.pnl,0)/wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s,t)=>s+t.pnl,0)/losses.length : 0;
  const maxWin = Math.max(...trades.map(t=>t.pnl));
  const maxLoss = Math.min(...trades.map(t=>t.pnl));

  // P&L by hour
  const pnlByHour = {};
  trades.forEach(t => {
    try {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const hour = d.getHours();
        if (!pnlByHour[hour]) pnlByHour[hour] = 0;
        pnlByHour[hour] += t.pnl;
      }
    } catch (e) {}
  });

  // P&L by day of week
  const pnlByDay = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[]};
  const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  trades.forEach(t => {
    try {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const dayOfWeek = d.getDay();
        if (pnlByDay[dayOfWeek]) pnlByDay[dayOfWeek].push(t);
      }
    } catch (e) {}
  });

  // Calendar heatmap for selected month
  const year = selectedYear;
  const month = selectedMonth;
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;  // Convertir pour calendrier commençant lundi
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [];
  
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const dayPnLMap = {};
  trades.forEach(t => {
    try {
      const d = new Date(t.date);
      if (!isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!dayPnLMap[day]) dayPnLMap[day] = 0;
        dayPnLMap[day] += t.pnl;
      }
    } catch (e) {}
  });

  // For Dashboard context, filteredTrades represents all trades
  // (filtered by month for calendar context, but used for overall stats)
  const filteredTrades = trades.filter(t => {
    try {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === month && d.getFullYear() === year;
    } catch (e) {
      return false;
    }
  });

  // PENTAGON RADAR COMPONENT
  const PentagonRadar = ({ metrics, size = 280 }) => {
    const center = size / 2;
    const radius = (size / 2) - 40;
    const values = [
      parseFloat(metrics.winPercent),
      parseFloat(metrics.profitFactor),
      parseFloat(metrics.winLoss),
      parseFloat(metrics.consistency),
      parseFloat(metrics.ruleAdherence)
    ];
    
    const labels = ["Win %", "Profit Factor", "Win/Loss Ratio", "Consistency", "Rule Adherence"];
    const points = [];
    
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const normalizedValue = values[i] / 100;
      const x = center + radius * normalizedValue * Math.cos(angle);
      const y = center + radius * normalizedValue * Math.sin(angle);
      points.push({ x, y, value: values[i], label: labels[i], angle });
    }

    const bgPoints = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      bgPoints.push(`${x},${y}`);
    }

    return (
      <svg width={size} height={size} style={{display:"block",margin:"0 auto"}}>
        {[20, 40, 60, 80, 100].map((val, i) => {
          const gridPoints = [];
          for (let j = 0; j < 5; j++) {
            const angle = (j * 2 * Math.PI / 5) - Math.PI / 2;
            const normalizedValue = val / 100;
            const x = center + radius * normalizedValue * Math.cos(angle);
            const y = center + radius * normalizedValue * Math.sin(angle);
            gridPoints.push(`${x},${y}`);
          }
          return (
            <polygon
              key={i}
              points={gridPoints.join(" ")}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="1"
              opacity="0.7"
            />
          );
        })}

        {points.map((p, i) => (
          <line key={`axis-${i}`} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1" opacity="0.5" />
        ))}

        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(" ")}
          fill="#5F7FB420"
          stroke="#5F7FB4"
          strokeWidth="2"
        />

        {points.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r="5"
            fill="#5F7FB4"
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {points.map((p, i) => {
          const labelRadius = radius + 35;
          const labelAngle = p.angle;
          const labelX = center + labelRadius * Math.cos(labelAngle);
          const labelY = center + labelRadius * Math.sin(labelAngle);
          
          return (
            <g key={`label-${i}`}>
              <text
                x={labelX}
                y={labelY - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="600"
                fill="#9CA3AF"
                style={{pointerEvents:"none"}}
              >
                {p.label}
              </text>
              <text
                x={labelX}
                y={labelY + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fontWeight="700"
                fill="#1F2937"
                style={{pointerEvents:"none"}}
              >
                {p.value.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // PENTAGON METRICS CALCULATION
  const pentagonMetrics = (() => {
    const winPercent = parseFloat(winRate);
    const pf = parseFloat(profitFactor);
    const profitFactorScore = Math.min(100, (pf / 2) * 100);
    const winLossRatio = winCount > 0 && lossCount > 0 ? winCount / lossCount : (winCount > 0 ? 100 : 0);
    const winLossScore = Math.min(100, (winLossRatio / 3) * 100);
    
    const avgPnL = trades.length > 0 ? trades.reduce((s, t) => s + t.pnl, 0) / trades.length : 0;
    const variance = trades.length > 0 
      ? trades.reduce((s, t) => s + Math.pow(t.pnl - avgPnL, 2), 0) / trades.length 
      : 0;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - (stdDev / Math.max(...trades.map(t => t.pnl), 1000) * 100));
    const ruleAdherenceScore = 75; // Default pour Dashboard basé sur comptes

    const overallScore = ((winPercent + profitFactorScore + winLossScore + consistencyScore + ruleAdherenceScore) / 5).toFixed(2);

    return {
      winPercent: winPercent.toFixed(1),
      profitFactor: profitFactorScore.toFixed(1),
      winLoss: winLossScore.toFixed(1),
      consistency: consistencyScore.toFixed(1),
      ruleAdherence: ruleAdherenceScore.toFixed(1),
      overallScore
    };
  })();

  // P&L curve - grouped by day
  const sortedTrades = [...trades].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const dailyPnL = {};
  sortedTrades.forEach(t=>{
    try {
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      if (!dailyPnL[dateKey]) dailyPnL[dateKey] = 0;
      dailyPnL[dateKey] += t.pnl;
    } catch (e) {}
  });
  
  const pnlCurve = [];
  let cum = 0;
  Object.keys(dailyPnL).sort().forEach(date=>{
    cum += dailyPnL[date];
    pnlCurve.push({cum, pnl:dailyPnL[date], date});
  });

  // Symbol stats
  const symbolStats = {};
  trades.forEach(t => {
    if (!symbolStats[t.symbol]) symbolStats[t.symbol] = {pnl:0,trades:0,wins:0};
    symbolStats[t.symbol].pnl += t.pnl;
    symbolStats[t.symbol].trades++;
    if (t.pnl > 0) symbolStats[t.symbol].wins++;
  });
  const topSymbols = Object.entries(symbolStats).sort((a,b)=>b[1].trades-a[1].trades).slice(0,5);
  
  // Prepare day labels
  const dayLabelsFull = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const dayLabelsFr = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}} className="anim-1">
      {/* TOP STATS - 4 CARDS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {/* NET P&L */}
        <div style={{background:"#FFFFFF",border:"1px solid #E5E7EB",borderRadius:12,padding:20,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:8,right:8,fontSize:9,fontWeight:600,color:"#22C55E"}}>↑ +12.4%</div>
          <div style={{fontSize:10,color:"#9CA3AF",marginBottom:12,fontWeight:500}}>P&L Net</div>
          <div style={{fontSize:18,fontWeight:700,color:"#1F2937"}}>{fmt(totalPnL,true)}</div>
        </div>

        {/* TRADE WIN */}
        <div style={{background:"#FFFFFF",border:"1px solid #E5E7EB",borderRadius:12,padding:20,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:8,right:8,fontSize:9,fontWeight:600,color:"#22C55E"}}>↑ +3.2%</div>
          <div style={{fontSize:10,color:"#9CA3AF",marginBottom:12,fontWeight:500}}>Taux de victoire</div>
          <div style={{fontSize:18,fontWeight:700,color:"#1F2937"}}>{winRate}%</div>
        </div>

        {/* PROFIT FACTOR */}
        <div style={{background:"#FFFFFF",border:"1px solid #E5E7EB",borderRadius:12,padding:20,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:8,right:8,fontSize:9,fontWeight:600,color:"#8B5CF6"}}>↑ +0.3</div>
          <div style={{fontSize:10,color:"#9CA3AF",marginBottom:12,fontWeight:500}}>Profit factor</div>
          <div style={{fontSize:18,fontWeight:700,color:"#1F2937"}}>{profitFactor}</div>
        </div>

        {/* WIN RATE TODAY */}
        <div style={{background:"#FFFFFF",border:"1px solid #E5E7EB",borderRadius:12,padding:20,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:8,right:8,fontSize:9,fontWeight:600,color:"#EA8A2F"}}>↑ +2.1%</div>
          <div style={{fontSize:10,color:"#9CA3AF",marginBottom:12,fontWeight:500}}>WR Today</div>
          <div style={{fontSize:18,fontWeight:700,color:"#1F2937"}}>{winRate}%</div>
        </div>
      </div>

      {/* P&L CHARTS - 2 COLUMN LAYOUT */}
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:8}}>
      {/* DAILY CUMULATIVE P&L */}
      <div style={{background:"#FFFFFF",border:`1px solid #E5E7EB`,borderRadius:12,padding:16,position:"relative",display:"flex",flexDirection:"column",alignItems:"stretch",flex:1}}>
          <div style={{position:"absolute",top:20,right:20,zIndex:10}}>
            <div style={{fontSize:14,fontWeight:600,color:"#22C55E"}}>{totalPnL>=0?"+":""}${Math.abs(totalPnL).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})} $</div>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:"#1F2937",marginBottom:4}}>P&L Cumulatif</div>
          <div style={{fontSize:12,color:"#6B7280",marginBottom:16}}>Évolution du capital — {new Date().toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'})}</div>
          
          {pnlCurve.length > 1 ? (
            <div style={{position:"relative",flex:1}}>
              <svg width="100%" height={200} viewBox="0 0 600 240" preserveAspectRatio="xMinYMid slice" style={{display:"block",flex:1}}>
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor:"#22C55E",stopOpacity:0.4}}/>
                    <stop offset="100%" style={{stopColor:"#22C55E",stopOpacity:0.01}}/>
                  </linearGradient>
                </defs>
                {/* Axe Y labels */}
                {Array.from({length:5},(_, i)=>{
                  const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                  const value = (maxCum * (4-i)) / 4;
                  const y = 20 + (i * 50);
                  return <g key={`y-${i}`}><text x="25" y={y+5} fontSize="7" fill="#6B7280">${value.toFixed(0)}</text></g>;
                })}
                
                {/* Grid lines */}
                {Array.from({length:5},(_, i)=>{
                  const y = 20 + (i * 50);
                  return <line key={`grid-${i}`} x1="35" y1={y} x2="600" y2={y} stroke="#E5E7EB" strokeWidth="1"/>;
                })}
                
                {/* Chart area */}
                <g>
                  {(() => {
                    const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                    const minCum = Math.min(...pnlCurve.map(x=>x.cum), 0);
                    const range = Math.max(Math.abs(maxCum), Math.abs(minCum));
                    const points = pnlCurve.map((p, i) => {
                      const x = 35 + (i / (pnlCurve.length - 1 || 1)) * 565;
                      const y = 130 - ((p.cum / range) * 90);
                      return [x, y];
                    });
                    
                    // Line path
                    let pathD = `M ${points[0][0]} ${points[0][1]}`;
                    for (let i = 1; i < points.length; i++) {
                      const curr = points[i];
                      const prev = points[i - 1];
                      const cpx = (curr[0] + prev[0]) / 2;
                      const cpy = (curr[1] + prev[1]) / 2;
                      pathD += ` Q ${cpx} ${cpy}, ${curr[0]} ${curr[1]}`;
                    }
                    
                    // Fill path
                    let fillD = pathD + ` L ${points[points.length - 1][0]} 200 L ${points[0][0]} 200 Z`;
                    
                    return (
                      <g>
                        <path d={fillD} fill="url(#chartGradient)" stroke="none"/>
                        <path d={pathD} stroke="#22C55E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        {/* Hover areas - invisible rectangles for each point */}
                        {points.map((point, i) => (
                          <rect
                            key={`hover-${i}`}
                            x={point[0] - 25}
                            y="0"
                            width="50"
                            height="240"
                            fill="transparent"
                            style={{cursor:"pointer"}}
                            onMouseEnter={() => {
                              setHoveredChart(i);
                              setTooltipPos({x: point[0], y: point[1]});
                            }}
                            onMouseLeave={() => setHoveredChart(null)}
                          />
                        ))}
                        {/* Hovered point indicator */}
                        {hoveredChart !== null && (
                          <circle
                            cx={(() => {
                              const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                              const minCum = Math.min(...pnlCurve.map(x=>x.cum), 0);
                              const range = Math.max(Math.abs(maxCum), Math.abs(minCum));
                              const p = pnlCurve[hoveredChart];
                              const x = 35 + (hoveredChart / (pnlCurve.length - 1 || 1)) * 565;
                              return x;
                            })()}
                            cy={(() => {
                              const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                              const minCum = Math.min(...pnlCurve.map(x=>x.cum), 0);
                              const range = Math.max(Math.abs(maxCum), Math.abs(minCum));
                              const p = pnlCurve[hoveredChart];
                              const y = 130 - ((p.cum / range) * 90);
                              return y;
                            })()}
                            r="5"
                            fill="#22C55E"
                            stroke="#fff"
                            strokeWidth="2"
                          />
                        )}
                      </g>
                    );
                  })()}
                </g>
                
                {/* Axe X labels */}
                {(() => {
                  const step = Math.max(1, Math.floor(pnlCurve.length / 5));
                  return pnlCurve.map((p, i) => {
                    if (i % step === 0 || i === pnlCurve.length - 1) {
                      const dateStr = p.date || '';
                      const date = new Date(dateStr);
                      const label = isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR',{month:'short',day:'numeric'});
                      const x = 50 + (i / Math.max(pnlCurve.length - 1, 1)) * 530;
                      return <text key={`x-${i}`} x={x} y="235" fontSize="7" fill="#6B7280" textAnchor="middle">{label}</text>;
                    }
                    return null;
                  });
                })()}
              </svg>
              
              {/* Tooltip */}
              {hoveredChart !== null && pnlCurve[hoveredChart] && (
                <div style={{
                  position:"absolute",
                  left:`${(tooltipPos.x / 600) * 100}%`,
                  top:`${(tooltipPos.y / 240) * 100}%`,
                  transform:"translate(-50%, -120%)",
                  background:"#1F2937",
                  color:"#FFF",
                  padding:"8px 12px",
                  borderRadius:"6px",
                  fontSize:"12px",
                  fontWeight:"600",
                  whiteSpace:"nowrap",
                  zIndex:100,
                  pointerEvents:"none",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.15)"
                }}>
                  <div>{new Date(pnlCurve[hoveredChart].date).toLocaleDateString('fr-FR',{weekday:'short',month:'short',day:'numeric'})}</div>
                  <div style={{fontSize:"13px",fontWeight:"700",color:pnlCurve[hoveredChart].pnl>=0?"#22C55E":"#EF4444"}}>
                    {pnlCurve[hoveredChart].pnl>=0?"+":""}${Math.abs(pnlCurve[hoveredChart].pnl).toFixed(0)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:"#F3F4F6",borderRadius:8,color:"#9CA3AF"}}>
              Pas de données
            </div>
          )}
        </div>

      {/* TR4DE SCORE CARD */}
      <div style={{background:"#FFFFFF",border:`1px solid #E5E7EB`,borderRadius:12,padding:24}}>
        <div style={{fontSize:14,fontWeight:700,color:"#1F2937",marginBottom:20}}>tr4de score</div>
        
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {/* PENTAGON CHART - CENTERED */}
          <div style={{display:"flex",justifyContent:"center",width:"100%"}}>
            <PentagonRadar metrics={pentagonMetrics} size={280} />
          </div>

          {/* PROGRESS BAR WITH SCORE ON LEFT */}
          <div style={{paddingTop:12,borderTop:`1px solid #E5E7EB`}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:8}}>
              <div>
                <div style={{fontSize:9,color:"#9CA3AF",fontWeight:600,marginBottom:4,textTransform:"uppercase"}}>Votre tr4de score</div>
                <div style={{fontSize:24,fontWeight:700,color:"#5F7FB4"}}>{pentagonMetrics.overallScore}</div>
              </div>
              <div style={{width:"1px",height:40,background:"#E5E7EB"}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,fontSize:10,color:"#9CA3AF",fontWeight:600}}>
                  <span>Progression du score</span>
                  <span>{pentagonMetrics.overallScore} / 100</span>
                </div>
                <div style={{width:"100%",height:8,background:"#E5E7EB",borderRadius:4,overflow:"hidden"}}>
                  <div 
                    style={{
                      width:`${parseFloat(pentagonMetrics.overallScore)}%`,
                      height:"100%",
                      background:"#5F7FB4",
                      transition:"width 0.6s ease",
                      borderRadius:4
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>  {/* Close P&L CHARTS grid */}

      {/* CALENDAR + RECENT TRADES + EMOTIONAL IMPACT */}
      <div style={{display:"grid",gridTemplateColumns:"1.3fr 1.2fr 1.1fr",gap:8}}>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:12,overflow:"hidden"}}>
          <div style={{marginBottom:8}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2}}>Calendrier P&L</div>
            <div style={{fontSize:12,color:T.textSub,marginBottom:2}}>+{Object.values(dayPnLMap).filter(v=>v>0).reduce((s,v)=>s+v,0).toFixed(0)} $ ce mois</div>
          </div>
          
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <button style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:T.text}} onClick={()=>{
              if (selectedMonth === 0) {
                setSelectedMonth(11);
                setSelectedYear(selectedYear - 1);
              } else {
                setSelectedMonth(selectedMonth - 1);
              }
            }}>‹</button>
            <div style={{fontSize:12,fontWeight:600,color:T.text}}>{new Date(year,month).toLocaleString('en-US',{month:'long',year:'numeric'})}</div>
            <button style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:T.text}} onClick={()=>{
              if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear(selectedYear + 1);
              } else {
                setSelectedMonth(selectedMonth + 1);
              }
            }}>›</button>
          </div>
          
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,aspectRatio:"1.8"}}>
            {["L","M","M","J","V","S","D"].map((d, idx)=>(
              <div key={idx} style={{fontSize:8,fontWeight:600,color:T.textMut,textAlign:"center",aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center"}}>{d}</div>
            ))}
            {calendarDays.map((day,i)=>{
              if (!day) return <div key={i} style={{aspectRatio:"1"}}/>;;
              const pnl = dayPnLMap[day]||0;
              const maxDayPnL = Math.max(...Object.values(dayPnLMap).map(Math.abs), 1);
              const bgColor = pnl > 0 ? T.greenBg : pnl < 0 ? T.redBg : T.bg;
              const textColor = pnl > 0 ? T.green : pnl < 0 ? T.red : T.text;
              const opacity = Math.abs(pnl) / Math.abs(maxDayPnL);
              const borderStyle = day === 31 ? `2px solid ${T.accent}` : `1px solid ${T.border}`;
              
              return (
                <div 
                  key={i} 
                  style={{
                    aspectRatio:"1",
                    background:bgColor,
                    opacity:Math.max(0.35,opacity),
                    borderRadius:3,
                    display:"flex",
                    flexDirection:"column",
                    alignItems:"center",
                    justifyContent:"center",
                    fontSize:8,
                    fontWeight:600,
                    color:T.text,
                    border:borderStyle,
                    cursor:"pointer",
                    transition:"all 0.2s"
                  }}
                  onMouseEnter={(e)=>{e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.1)"}}
                  onMouseLeave={(e)=>{e.currentTarget.style.boxShadow="none"}}
                >
                  <div style={{fontSize:11,fontWeight:700}}>{day}</div>
                  {pnl !== 0 && <div style={{fontSize:10,color:textColor,fontWeight:600}}>{pnl>0?"+":""}{pnl.toFixed(0)}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,overflow:"hidden"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2}}>{selectedDay !== null ? `Trades du ${["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"][selectedDay]}` : "Trades Récents"}</div>
            <div style={{fontSize:12,color:T.textSub,marginBottom:8}}>
              {selectedDay !== null 
                ? `${(pnlByDay[selectedDay] || []).length} trades`
                : `${filteredTrades.length} trades`
              }
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 0.6fr",gap:8,fontSize:10,fontWeight:600,color:T.textMut,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
              <div>Asset</div>
              <div style={{textAlign:"right"}}>P&L</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
            {(() => {
              const dayFilteredTrades = selectedDay !== null ? (pnlByDay[selectedDay] || []) : filteredTrades;
              return [...dayFilteredTrades].reverse().slice(0,6).map((t,i)=>(
                <div key={i} style={{padding:8,background:T.bg,borderRadius:6,display:"grid",gridTemplateColumns:"1fr 0.6fr",gap:8,fontSize:11}}>
                  <div><div style={{fontWeight:600,color:T.text}}>{t.symbol}</div><div style={{fontSize:9,color:(t.direction === 'Short' ? T.red : T.blue)}}>{t.direction || 'Long'}</div></div>
                  <div style={{textAlign:"right",fontWeight:600,color:t.pnl>=0?T.green:T.red}}>{t.pnl>=0?"+":""}${t.pnl.toFixed(0)}</div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* EMOTIONAL IMPACT */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,overflow:"hidden"}}>
        <div style={{marginBottom:4}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text}}>Impact Émotionnel</div>
          <div style={{fontSize:12,color:T.textSub,marginBottom:8}}>Effet des émotions sur le P&L</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
          {allEmotionTags.map(tag => {
            const tradesWithTag = filteredTrades.filter(t => {
              const tradeId = t.date + t.symbol + t.entry;
              return emotionTags[tradeId] && emotionTags[tradeId].includes(tag.id);
            });
            
            if (tradesWithTag.length === 0) return null;
            
            const totalPnL = tradesWithTag.reduce((sum, t) => sum + t.pnl, 0);
            const pnlColor = totalPnL >= 0 ? T.green : T.red;
            
            return (
              <div key={tag.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:tag.color}}/>
                  <div style={{fontSize:12,fontWeight:600,color:T.text}}>{tag.label}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <div style={{fontSize:12,color:T.textSub,textAlign:"right",minWidth:30}}>{tradesWithTag.length}x</div>
                  <div style={{fontSize:12,fontWeight:600,color:pnlColor,textAlign:"right",minWidth:80}}>{totalPnL>=0?"+":""}{fmt(totalPnL,false)}</div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* DAY OF WEEK TABLE */}
      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",height:340}}>
        <div style={{padding:"16px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:8}}>Performance par jour</div>
          <div style={{fontSize:12,color:T.textSub}}>{selectedDay !== null ? `P&L ${dayLabelsFr[selectedDay]}` : "P&L cette semaine"}: <span style={{fontWeight:600,color:(() => {
            if (selectedDay !== null) {
              const dayTrades = pnlByDay[selectedDay] || [];
              const dayPnL = dayTrades.reduce((s,t)=>s+t.pnl,0);
              return dayPnL >= 0 ? T.green : T.red;
            } else {
              const weekStart = new Date();
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              const weekPnL = filteredTrades.filter(t => {
                const d = new Date(t.date);
                return d >= weekStart;
              }).reduce((s,t)=>s+t.pnl,0);
              return weekPnL >= 0 ? T.green : T.red;
            }
          })()}}>
            {(() => {
              if (selectedDay !== null) {
                const dayTrades = pnlByDay[selectedDay] || [];
                const dayPnL = dayTrades.reduce((s,t)=>s+t.pnl,0);
                return (dayPnL >= 0 ? "+" : "") + fmt(dayPnL, true);
              } else {
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekPnL = filteredTrades.filter(t => {
                  const d = new Date(t.date);
                  return d >= weekStart;
                }).reduce((s,t)=>s+t.pnl,0);
                return (weekPnL >= 0 ? "+" : "") + fmt(weekPnL, true);
              }
            })()}
          </span></div>
        </div>
        <div style={{overflowX:"auto",padding:"0 16px 16px 16px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`none`,background:"transparent"}}>
                {["Jour","Trades","% Total","Taux Victoire","Gain Moyen","Perte Moyenne","Espérance"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:T.textMut,borderBottom:`1px solid ${T.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const days = dayLabelsFull.map((day, idx) => idx).filter(idx => idx < 5);
                if (selectedDay !== null) {
                  days.sort((a, b) => a === selectedDay ? -1 : b === selectedDay ? 1 : 0);
                }
                return days.map((idx) => {
                  const day = dayLabelsFull[idx];
                  const dayLabels = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
                  const dayTrades = pnlByDay[idx] || [];
                  const dayPnL = dayTrades.reduce((s,t)=>s+t.pnl,0);
                  const dayWins = dayTrades.filter(t=>t.pnl>0).length;
                  const dayWinRate = dayTrades.length ? ((dayWins/dayTrades.length)*100).toFixed(0) : "0";
                  const dayAvgWin = dayWins ? dayTrades.filter(t=>t.pnl>0).reduce((s,t)=>s+t.pnl,0)/dayWins : 0;
                  const dayAvgLoss = dayTrades.length-dayWins ? dayTrades.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0)/(dayTrades.length-dayWins) : 0;
                  const isSelected = selectedDay === idx;
                  const isHidden = selectedDay !== null && selectedDay !== idx;
                  return <tr key={day} onClick={()=>setSelectedDay(isSelected ? null : idx)} style={{borderBottom:isHidden?`none`:`1px solid ${T.border}`,cursor:"pointer",background:"transparent",display:isHidden?"none":"table-row",transition:"background 0.2s"}}>
                    <td style={{padding:"10px 14px",fontWeight:600,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{dayLabels[idx]}</td>
                    <td style={{padding:"10px 14px",color:T.textSub,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{dayTrades.length}</td>
                    <td style={{padding:"10px 14px",color:T.textSub,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{((dayTrades.length/filteredTrades.length)*100).toFixed(1)}%</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:dayWinRate>=50?T.green:T.red,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{dayWinRate}%</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:T.green,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{fmt(dayAvgWin,true)}</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:T.red,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{fmt(dayAvgLoss,true)}</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:dayPnL>=0?T.green:T.red,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{fmt(dayPnL/Math.max(dayTrades.length,1),true)}</td>
                  </tr>;
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function JournalPage({ trades = [] }) {
  // ✅ Utiliser les hooks Supabase au lieu de localStorage
  const { notes: tradeNotes, setNote: updateTradeNote } = useTradeNotes();
  const { notes: dailyNotes, setNote: updateDailyNote } = useDailySessionNotes();
  
  const [expandedTrades, setExpandedTrades] = useState({});
  const [hoveredPoints, setHoveredPoints] = useState({});
  const [tooltipPositions, setTooltipPositions] = useState({});
  const [filterMode, setFilterMode] = useState("week"); // "week" or "custom"
  
  // Calculate Monday to Sunday of current week
  const getWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
    
    const monday = new Date(today);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + daysToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };
  
  const [filterStartDate, setFilterStartDate] = useState(() => {
    return getWeekRange().start;
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    return getWeekRange().end;
  });
  
  // Update filter every day to check if we crossed into a new week
  React.useEffect(() => {
    if (filterMode !== "week") return;
    
    const checkAndUpdateWeek = () => {
      const range = getWeekRange();
      setFilterStartDate(range.start);
      setFilterEndDate(range.end);
    };
    
    // Check every day at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
      checkAndUpdateWeek();
      setInterval(checkAndUpdateWeek, 24 * 60 * 60 * 1000); // Every 24 hours
    }, timeUntilMidnight);
  }, [filterMode]);

  // Create unique trade ID - includes entry price to make each trade unique
  const getTradeId = (trade) => {
    return trade.date + trade.symbol + trade.entry;
  };

  // ✅ Les notes sont maintenant chargées automatiquement via les hooks Supabase
  // Pas besoin de localStorage anymore!

  // Toggle expanded state
  const toggleExpanded = (tradeId) => {
    setExpandedTrades(prev => ({
      ...prev,
      [tradeId]: !prev[tradeId]
    }));
  };

  // Filter trades by date range
  const filteredTrades = trades.filter(t => {
    try {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      const dateStr = d.toISOString().split('T')[0];
      return dateStr >= filterStartDate && dateStr <= filterEndDate;
    } catch (e) {
      return false;
    }
  });

  // Group trades by date
  const tradesByDate = {};
  filteredTrades.forEach(t => {
    try {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const dateStr = d.toISOString().split('T')[0];
      if (!tradesByDate[dateStr]) {
        tradesByDate[dateStr] = [];
      }
      tradesByDate[dateStr].push(t);
    } catch (e) {}
  });

  // Sort dates in descending order
  const sortedDates = Object.keys(tradesByDate).sort().reverse();

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}} className="anim-1">
      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:18,fontWeight:700}}>📔 Journal de Trading</div>
        {/* DATE FILTER */}
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{fontSize:12,fontWeight:600,color:T.textMut}}>Filtre:</div>
          {/* FILTER MODE BUTTONS */}
          <div style={{display:"flex",gap:6}}>
            <button
              onClick={() => {
                setFilterMode("week");
                const range = getWeekRange();
                setFilterStartDate(range.start);
                setFilterEndDate(range.end);
              }}
              style={{
                padding:"6px 12px",
                fontSize:11,
                fontWeight:600,
                border:`1px solid ${filterMode === "week" ? T.green : T.border}`,
                background:filterMode === "week" ? T.green : "transparent",
                color:filterMode === "week" ? T.white : T.text,
                borderRadius:4,
                cursor:"pointer",
                textTransform:"uppercase"
              }}
            >
              Semaine
            </button>
            <button
              onClick={() => setFilterMode("custom")}
              style={{
                padding:"6px 12px",
                fontSize:11,
                fontWeight:600,
                border:`1px solid ${filterMode === "custom" ? T.green : T.border}`,
                background:filterMode === "custom" ? T.green : "transparent",
                color:filterMode === "custom" ? T.white : T.text,
                borderRadius:4,
                cursor:"pointer",
                textTransform:"uppercase"
              }}
            >
              Custom
            </button>
          </div>
          {filterMode === "custom" && (
            <>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                style={{
                  padding:"8px 12px",
                  fontSize:12,
                  border:`1px solid ${T.border}`,
                  borderRadius:6,
                  background:T.white,
                  color:T.text,
                  cursor:"pointer"
                }}
              />
              <div style={{fontSize:12,color:T.textMut}}>à</div>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
            style={{
              padding:"8px 12px",
              fontSize:12,
              border:`1px solid ${T.border}`,
              borderRadius:6,
              background:T.white,
              color:T.text,
              cursor:"pointer"
            }}
              />
            </>
          )}
        </div>
      </div>

      {/* TRADES BY DATE */}
      {sortedDates.length > 0 ? (
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {sortedDates.map((dateStr) => {
            const dayTrades = tradesByDate[dateStr].sort((a, b) => new Date(a.date) - new Date(b.date));
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dateLabel = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            // Calculate day stats
            const dayVolume = dayTrades.length;
            const dayWins = dayTrades.filter(t => t.pnl > 0).length;
            const dayWinRate = dayVolume > 0 ? ((dayWins / dayVolume) * 100).toFixed(0) : 0;
            const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);

            // Create sparkline data for this day
            let cumulative = 0;
            const sparklineData = dayTrades.map(t => {
              cumulative += t.pnl;
              return cumulative;
            });
            
            // Normaliser pour que 0 soit toujours à la ligne de séparation
            const maxVal = Math.max(...sparklineData, 0);
            const minVal = Math.min(...sparklineData, 0);
            const range = Math.max(Math.abs(maxVal), Math.abs(minVal)) || 1;

            const sparklineWidth = 120;
            const sparklineHeight = 80;
            const padding = 0;
            const chartWidth = sparklineWidth - padding * 2;
            const chartHeight = sparklineHeight - padding * 2;
            
            // Pour les journées perdantes, zéro est en haut
            const lastVal = sparklineData[sparklineData.length - 1] || 0;
            const zeroY = lastVal >= 0 ? sparklineHeight / 2 : 0;

            const points = sparklineData.map((val, i) => {
              const x = (i / (sparklineData.length - 1 || 1)) * chartWidth + padding;
              const y = zeroY - (val / range) * (chartHeight / 2);
              return `${x},${y}`;
            }).join(' ');

            const sparklineColor = lastVal >= 0 ? T.green : T.red;

            return (
              <div key={dateStr} style={{display:"flex",gap:20,alignItems:"flex-start"}}>
                {/* LEFT - STATS & SPARKLINE - SPLIT 50/50 HEIGHT - SQUARE */}
                <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:0,width:200,height:240,position:"relative"}}>
                  {/* TOP HALF - DATE + SPARKLINE */}
                  <div style={{flex:"0 0 auto",display:"flex",flexDirection:"column",justifyContent:"flex-start",marginBottom:"20px",overflow:"hidden",marginLeft:"-16px",marginRight:"-16px",position:"relative"}}>
                    {/* SEPARATOR LINE */}
                    <div style={{position:"absolute",bottom:"-50px",left:"0",right:"0",height:"1px",background:T.border}}></div>
                    <div style={{fontSize:12,fontWeight:700,color:T.text,textAlign:"left",padding:"0 16px",marginBottom:4}}>{dateLabel}</div>
                    {sparklineData.length > 0 && (
                      <div style={{position:"relative",width:"100%",height:"100%",overflow:"visible"}}>
                        <svg 
                          width="100%" 
                          height="100%" 
                          viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`} 
                          preserveAspectRatio="none" 
                          style={{width:"100%",height:"100%",display:"block",overflow:"hidden"}}
                          onMouseMove={(e) => {
                            const svg = e.currentTarget;
                            const rect = svg.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * sparklineWidth;
                            const pointIndex = Math.round((x / sparklineWidth) * (sparklineData.length - 1));
                            if (pointIndex >= 0 && pointIndex < sparklineData.length) {
                              // Calculer la position X exacte du point
                              const pointX = (pointIndex / (sparklineData.length - 1 || 1)) * sparklineWidth;
                              // Convertir en pixels
                              const pixelX = (pointX / sparklineWidth) * rect.width;
                              // Calculer la position Y du point en coordonnées SVG
                              const val = sparklineData[pointIndex];
                              const range = Math.max(Math.abs(Math.max(...sparklineData, 0)), Math.abs(Math.min(...sparklineData, 0))) || 1;
                              const zeroY = lastVal >= 0 ? sparklineHeight / 2 : 0;
                              const svgY = zeroY - (val / range) * (sparklineHeight / 2);
                              // Convertir les coordonnées SVG en pixels du conteneur
                              const pixelY = (svgY / sparklineHeight) * rect.height;
                              setHoveredPoints({...hoveredPoints, [dateStr]: pointIndex});
                              setTooltipPositions({...tooltipPositions, [dateStr]: { x: pixelX, y: pixelY }});
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredPoints({...hoveredPoints, [dateStr]: null});
                          }}
                        >
                          <defs>
                            <linearGradient id={`grad-${dateStr}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={sparklineColor} stopOpacity={lastVal >= 0 ? "0.5" : "0.05"}/>
                              <stop offset="100%" stopColor={sparklineColor} stopOpacity={lastVal >= 0 ? "0.05" : "0.5"}/>
                            </linearGradient>
                          </defs>
                          {/* Area fill */}
                          <path 
                            d={`M ${points.split(' ')[0]} L ${points} L ${sparklineWidth},${zeroY} L 0,${zeroY} Z`}
                            fill={`url(#grad-${dateStr})`}
                          />
                          {/* Line */}
                          <polyline points={points} fill="none" stroke={sparklineColor} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* TOOLTIP - EN DEHORS DU GRAPHIQUE */}
                  {hoveredPoints[dateStr] !== null && hoveredPoints[dateStr] !== undefined && sparklineData[hoveredPoints[dateStr]] !== undefined && (
                    <div style={{
                      position:"absolute",
                      left:`${tooltipPositions[dateStr]?.x}px`,
                      top:`${tooltipPositions[dateStr]?.y - 40}px`,
                      background:"#000000",
                      color: sparklineData[hoveredPoints[dateStr]] >= 0 ? T.green : T.red,
                      padding:"6px 12px",
                      borderRadius:6,
                      fontSize:12,
                      fontWeight:400,
                      whiteSpace:"nowrap",
                      pointerEvents:"none",
                      transform:"translateX(-50%)",
                      fontFamily:"Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                      letterSpacing:"0.3px",
                      zIndex:9999
                    }}>
                      {sparklineData[hoveredPoints[dateStr]] >= 0 ? "+" : ""}{sparklineData[hoveredPoints[dateStr]].toFixed(2)}
                    </div>
                  )}

                  {/* BOTTOM HALF - STATS */}
                  <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"flex-end",transform:"translateY(-50px)"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div>
                        <div style={{fontSize:9,fontWeight:600,color:T.textMut,textTransform:"uppercase",marginBottom:2}}>Trades</div>
                        <div style={{fontSize:12,fontWeight:700,color:T.text}}>{dayVolume}</div>
                      </div>
                      <div>
                        <div style={{fontSize:9,fontWeight:600,color:T.textMut,textTransform:"uppercase",marginBottom:2}}>Total</div>
                        <div style={{fontSize:12,fontWeight:700,color:T.text}}>{trades.length}</div>
                      </div>
                      <div>
                        <div style={{fontSize:9,fontWeight:600,color:T.textMut,textTransform:"uppercase",marginBottom:2}}>Taux victoire</div>
                        <div style={{fontSize:10,fontWeight:700,color:T.green}}>{dayWinRate}%</div>
                      </div>
                      <div>
                        <div style={{fontSize:9,fontWeight:600,color:T.textMut,textTransform:"uppercase",marginBottom:2}}>PnL du jour</div>
                        <div style={{fontSize:10,fontWeight:700,color:dayPnL >= 0 ? T.green : T.red}}>{dayPnL >= 0 ? "+" : ""}{fmt(dayPnL)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT - NOTES + TRADES TABLE */}
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
                  {/* DAILY NOTES */}
                  <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,height:240,display:"flex",flexDirection:"column"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",marginBottom:8}}>Notes du jour</div>
                    <textarea
                      placeholder="Notes pour cette journée..."
                      value={dailyNotes[dateStr] || ""}
                      onChange={(e) => updateDailyNote(dateStr, e.target.value)}
                      style={{
                        width:"100%",
                        flex:1,
                        border:`1px solid ${T.border}`,
                        borderRadius:8,
                        padding:12,
                        fontSize:12,
                        fontFamily:"DM Sans",
                        color:T.text,
                        background:T.white,
                        resize:"none",
                        outline:"none",
                        boxSizing:"border-box"
                      }}
                    />
                  </div>

                  {/* TRADES TABLE */}
                  <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                          <tr>
                            <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Time</th>
                            <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Symbol</th>
                            <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Side</th>
                            <th style={{padding:"8px 12px",textAlign:"right",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Net P&L</th>
                            <th style={{padding:"8px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayTrades.map((trade, i) => {
                            const time = new Date(trade.date).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
                            const tradeId = getTradeId(trade);
                            const isExpanded = expandedTrades[tradeId];
                            const hasNote = tradeNotes[tradeId] && tradeNotes[tradeId].trim().length > 0;

                            return (
                              <React.Fragment key={i}>
                                <tr style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.bg:"transparent"}}>
                                  <td style={{padding:"8px 12px",fontSize:11,color:T.text}}>{time}</td>
                                  <td style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:T.text}}>{trade.symbol}</td>
                                  <td style={{padding:"8px 12px",fontSize:11,color:T.text}}><span style={{color:trade.side==="Long"?T.blue:T.red}}>{trade.side || "Long"}</span></td>
                                  <td style={{padding:"8px 12px",textAlign:"right",fontSize:11,fontWeight:600,color:trade.pnl>=0?T.green:T.red,fontFamily:"DM Mono"}}>{fmt(trade.pnl,true)}</td>
                                  <td style={{padding:"8px 12px",textAlign:"center"}}>
                                    <button
                                      onClick={() => toggleExpanded(tradeId)}
                                      style={{
                                        background:hasNote?T.accentBg:T.bg,
                                        border:`1px solid ${hasNote?T.accentBd:T.border}`,
                                        borderRadius:6,
                                        padding:"4px 10px",
                                        fontSize:10,
                                        fontWeight:600,
                                        color:hasNote?T.accent:T.textMut,
                                        cursor:"pointer",
                                        textTransform:"uppercase"
                                      }}
                                    >
                                      {isExpanded ? "✕" : "✎"}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr style={{borderBottom:`1px solid ${T.border}`,background:T.bg}}>
                                    <td colSpan="5" style={{padding:"12px 12px"}}>
                                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                        <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Notes pour {trade.symbol}</div>
                                        <textarea
                                          placeholder="Ajoutez vos notes sur ce trade..."
                                          value={tradeNotes[tradeId] || ""}
                                          onChange={(e) => updateTradeNote(tradeId, e.target.value)}
                                          style={{
                                            width:"100%",
                                            height:60,
                                            border:`1px solid ${T.border}`,
                                            borderRadius:8,
                                            padding:12,
                                            fontSize:12,
                                            fontFamily:"DM Sans",
                                            color:T.text,
                                            background:T.white,
                                            resize:"none",
                                            outline:"none",
                                            boxSizing:"border-box"
                                          }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
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
        <div style={{background:T.white,border:`2px dashed ${T.border}`,borderRadius:12,padding:"40px 24px",textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:600,marginBottom:8,color:T.text}}>Aucun trade importé</div>
          <p style={{color:T.textSub}}>Vos trades apparaîtront ici avec la possibilité d'ajouter des notes</p>
        </div>
      )}
    </div>
  );
}

function TradesPage({ trades = [], strategies = [], onImportClick, onDeleteTrade, onClearTrades }) {
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState("notes");
  const [dateFilter, setDateFilter] = useState("all"); // "day", "week", "month", "year", "all"
  const [tradeNotes, setTradeNotes] = useState({});
  const [tradeStrategies, setTradeStrategies] = useState({});
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [checkedRules, setCheckedRules] = useState({});
  const [emotionTags, setEmotionTags] = useState({});
  const [errorTags, setErrorTags] = useState({});
  const [loadedStrategies, setLoadedStrategies] = useState([]);

  const allEmotionTags = [
    { id: "fomo", label: "FOMO", color: "#C94F4F" },
    { id: "revenge", label: "Vengeance", color: "#C94F4F" },
    { id: "overconfident", label: "Trop confiant", color: "#D4A574" },
    { id: "hesitation", label: "Hésitation", color: "#D4A574" },
    { id: "calm", label: "Calme & focus", color: "#4A9D6F" },
    { id: "followed", label: "Plan suivi", color: "#4A9D6F" },
    { id: "boredom", label: "Trade ennui", color: "#5B7EC9" },
    { id: "earlyexit", label: "Sortie anticipée", color: "#8B6BB6" }
  ];

  const allErrorTags = [
    { id: "poorentry", label: "Mauvaise entrée", color: "#C94F4F" },
    { id: "poorexit", label: "Mauvaise sortie", color: "#C94F4F" },
    { id: "nosltp", label: "Pas de SL/TP", color: "#D4A574" },
    { id: "overleveraged", label: "Sur-leveragé", color: "#D4A574" },
    { id: "ignoredsignal", label: "Signaux ignorés", color: "#8B6BB6" },
    { id: "badtiming", label: "Mauvais timing", color: "#C94F4F" },
    { id: "impulsive", label: "Impulsif", color: "#D4A574" },
    { id: "wronganalysis", label: "Mauvaise analyse", color: "#8B6BB6" }
  ];

  // Charger l'onglet actif depuis localStorage au démarrage
  React.useEffect(() => {
    const savedTab = localStorage.getItem("tr4de_active_tab");
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Sauvegarder l'onglet actif dans localStorage quand il change
  React.useEffect(() => {
    localStorage.setItem("tr4de_active_tab", activeTab);
  }, [activeTab]);

  // Load trade notes and strategies from localStorage - RUNS EVERY TIME COMPONENT MOUNTS
  React.useEffect(() => {
    console.log("📝 TradesPage mounted - reloading all data from localStorage");
    
    try {
      const savedNotes = localStorage.getItem("tr4de_trade_notes");
      if (savedNotes) {
        setTradeNotes(JSON.parse(savedNotes));
      }
      
      // ✅ CRITICAL: Always reload trade strategies from localStorage
      const savedTradeStrategies = localStorage.getItem("tr4de_trade_strategies");
      if (savedTradeStrategies) {
        const parsed = JSON.parse(savedTradeStrategies);
        console.log("✅ Loaded trade strategies:", Object.keys(parsed).length, "trades with strategies");
        setTradeStrategies(parsed);
      }
      
      // ✅ CRITICAL: Always reload strategies list
      const savedStrategies = localStorage.getItem("apex_strategies");
      if (savedStrategies) {
        const parsed = JSON.parse(savedStrategies);
        console.log("✅ Loaded", parsed.length, "strategies");
        setLoadedStrategies(parsed);
      }

      const savedEmotionTags = localStorage.getItem("tr4de_emotion_tags");
      if (savedEmotionTags) {
        setEmotionTags(JSON.parse(savedEmotionTags));
      }

      const savedErrorTags = localStorage.getItem("tr4de_error_tags");
      if (savedErrorTags) {
        setErrorTags(JSON.parse(savedErrorTags));
      }
      
      // Reload checked rules - ONLY use valid boolean values
      const savedCheckedRules = localStorage.getItem("tr4de_checked_rules");
      if (savedCheckedRules) {
        try {
          const parsed = JSON.parse(savedCheckedRules);
          // ✅ Clean: filter out non-boolean values to prevent corruption
          const cleaned = {};
          Object.keys(parsed).forEach(key => {
            if (typeof parsed[key] === 'boolean') {
              cleaned[key] = parsed[key];
            }
          });
          setCheckedRules(cleaned);
          console.log(`✅ Loaded ${Object.keys(cleaned).length} checked rules`);
        } catch (e) {
          console.warn("⚠️ Corrupt checked rules data, resetting");
          setCheckedRules({});
          localStorage.removeItem("tr4de_checked_rules");
        }
      }
    } catch (err) {
      console.error("Error loading data from localStorage:", err);
    }
  }, []); // Empty dependency - runs ONLY on component mount

  // Auto-save trade strategies to localStorage whenever they change
  React.useEffect(() => {
    if (Object.keys(tradeStrategies).length > 0) {
      console.log("💾 Auto-saving trade strategies:", Object.keys(tradeStrategies).length, "trades");
      localStorage.setItem("tr4de_trade_strategies", JSON.stringify(tradeStrategies));
    }
  }, [tradeStrategies]);

  // Auto-save checked rules to localStorage
  React.useEffect(() => {
    if (Object.keys(checkedRules).length > 0) {
      localStorage.setItem("tr4de_checked_rules", JSON.stringify(checkedRules));
    }
  }, [checkedRules]);

  // Auto-close selected trade panel if trade was deleted
  React.useEffect(() => {
    if (selectedTrade && trades) {
      const tradeExists = trades.some(t => 
        t.id === selectedTrade.id || 
        (t.date === selectedTrade.date && t.symbol === selectedTrade.symbol && t.entry === selectedTrade.entry)
      );
      
      if (!tradeExists) {
        setSelectedTrade(null);
      }
    }
  }, [trades]);

  // Fonction de filtrage par date
  const getFilteredTrades = () => {
    if (dateFilter === "all") return trades;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (dateFilter) {
      case "day":
        startDate.setDate(now.getDate() - 1);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return trades;
    }
    
    return trades.filter(t => {
      const tradeDate = new Date(t.date);
      return tradeDate >= startDate;
    });
  };

  const filteredTrades = getFilteredTrades();

  if (!trades || trades.length === 0) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
        <div style={{fontSize:18,fontWeight:700}}>📈 Journal de trading</div>
        <div style={{background:T.white,border:`2px dashed ${T.accent}`,borderRadius:12,padding:"48px 24px",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:600,marginBottom:8,color:T.text}}>📥 Aucun trade importé</div>
          <p style={{color:T.textSub,marginBottom:20}}>Importez vos trades pour commencer à analyser vos performances</p>
          <button onClick={onImportClick} style={{padding:"12px 24px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>📂 Importer des trades</button>
        </div>
      </div>
    );
  }

  // Calculate symbol statistics
  const symbolStats = {};
  filteredTrades.forEach(t => {
    if (!symbolStats[t.symbol]) {
      symbolStats[t.symbol] = {
        trades: [],
        totalPnL: 0,
        wins: 0,
        losses: 0
      };
    }
    symbolStats[t.symbol].trades.push(t);
    symbolStats[t.symbol].totalPnL += t.pnl;
    if (t.pnl > 0) symbolStats[t.symbol].wins++;
    else if (t.pnl < 0) symbolStats[t.symbol].losses++;
  });

  // Find best and worst symbols
  let bestSymbol = null, worstSymbol = null, bestPnL = -Infinity, worstPnL = Infinity;
  Object.entries(symbolStats).forEach(([sym, stats]) => {
    if (stats.totalPnL > bestPnL) { bestPnL = stats.totalPnL; bestSymbol = sym; }
    if (stats.totalPnL < worstPnL) { worstPnL = stats.totalPnL; worstSymbol = sym; }
  });

  const totalPnL = filteredTrades.reduce((s,t)=>s+t.pnl,0);
  const totalWins = filteredTrades.filter(t=>t.pnl>0).length;
  const winRate = filteredTrades.length > 0 ? ((totalWins/filteredTrades.length)*100).toFixed(0) : 0;
  const symbolCount = Object.keys(symbolStats).length;

  const topSymbol = Object.entries(symbolStats).sort((a,b)=>b[1].totalPnL-a[1].totalPnL)[0];

  // Handle clearing filtered trades
  const handleClearFilteredTrades = async () => {
    if (dateFilter === "all") {
      // Clear all trades
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer tous les ${filteredTrades.length} trades ?`)) {
        onClearTrades();
      }
    } else {
      // Clear filtered trades only
      const filterLabels = { day: "aujourd'hui", week: "cette semaine", month: "ce mois", year: "cette année" };
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer les ${filteredTrades.length} trades de ${filterLabels[dateFilter]} ?`)) {
        for (const trade of filteredTrades) {
          await onDeleteTrade(trade);
        }
      }
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:20,fontWeight:700}}>📈 Trades</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onImportClick} style={{padding:"8px 16px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Importer</button>
          <button onClick={handleClearFilteredTrades} style={{padding:"8px 16px",borderRadius:8,background:T.red,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>× Supprimer {dateFilter === "all" ? "tous" : `(${dateFilter})`}</button>
        </div>
      </div>

      {/* LAYOUT WITH TABLE + SIDE PANEL WITH TABS */}
      <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>

        {/* LEFT - TRADES TABLE */}
        <div style={{flex:selectedTrade?"0 0 calc(100% - 376px)":"1",background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 200px)"}}>
          
          {/* DATE FILTER BUTTONS */}
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:8,flexWrap:"wrap"}}>
            {[
              {id:"all",label:"Tous"},
              {id:"day",label:"Aujourd'hui"},
              {id:"week",label:"Semaine"},
              {id:"month",label:"Mois"},
              {id:"year",label:"Année"}
            ].map(filter => (
              <button 
                key={filter.id}
                onClick={() => setDateFilter(filter.id)}
                style={{
                  padding:"6px 12px",
                  fontSize:12,
                  fontWeight:dateFilter === filter.id ? 600 : 500,
                  border:`1px solid ${dateFilter === filter.id ? T.accent : T.border}`,
                  borderRadius:6,
                  background:dateFilter === filter.id ? T.accentBg : "transparent",
                  color:dateFilter === filter.id ? T.accent : T.textMut,
                  cursor:"pointer",
                  transition:"all .2s"
                }}
              >
                {filter.label}
              </button>
            ))}
            <div style={{marginLeft:"auto",fontSize:11,color:T.textMut,display:"flex",alignItems:"center"}}>
              {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{overflowX:"auto",overflowY:"auto",flex:1}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead style={{position:"sticky",top:0,background:T.bg,zIndex:10}}>
                <tr style={{borderBottom:`1px solid ${T.border}`}}>
                  {["Symbole","Type","Date ouverture","Actif","Direction","Heure ouverture","Entrée","Date fermeture","Heure fermeture","Sortie","Taille lot","Volume","P&L","P&L %","Supprimer"].map(h=>(
                    <th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:T.textMut,whiteSpace:"nowrap",background:T.bg}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...filteredTrades].sort((a,b)=>{
                  const timeA = a.entryTime || "00:00:00";
                  const timeB = b.entryTime || "00:00:00";
                  return timeB.localeCompare(timeA);
                }).map((t,i)=>{
                  const ret = ((t.pnl/(t.entry*100))*100).toFixed(2);
                  const dateObj = new Date(t.date);
                  const openDate = dateObj.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'});
                  const openTime = t.entryTime || '—';
                  const closeDate = openDate;
                  const closeTime = t.exitTime || '—';
                  
                  return (
                    <tr 
                      key={i} 
                      style={{
                        borderBottom:`1px solid ${T.border}`,
                        background:t.pnl>0?`${T.greenBg}40`:t.pnl<0?`${T.redBg}40`:T.white,
                        cursor:"pointer",
                        transition:"all .2s"
                      }}
                      onClick={()=>{
                        const isSelected = selectedTrade && selectedTrade.date === t.date && selectedTrade.symbol === t.symbol && selectedTrade.entry === t.entry;
                        if(isSelected) {
                          setSelectedTrade(null);
                        } else {
                          setSelectedTrade(t);
                          setActiveTab("infos");
                        }
                      }}
                      onMouseOver={(e)=>e.currentTarget.style.background=t.pnl>0?`${T.greenBg}60`:t.pnl<0?`${T.redBg}60`:`${T.bg}`}
                      onMouseOut={(e)=>e.currentTarget.style.background=t.pnl>0?`${T.greenBg}40`:t.pnl<0?`${T.redBg}40`:T.white}
                    >
                      <td style={{padding:"12px 14px",fontWeight:600,color:T.text,fontFamily:"DM Mono"}}>{t.symbol}</td>
                      <td style={{padding:"12px 14px",fontSize:11,fontWeight:600,color:t.contract_type==='micro'?'#FF6B6B':t.contract_type==='mini'?'#4ECDC4':'#95A5A6',textTransform:'uppercase',textAlign:"center"}}>
                        {t.contract_type || 'std'}
                      </td>
                      <td style={{padding:"12px 14px",color:T.textSub}}>{openDate}</td>
                      <td style={{padding:"12px 14px",color:T.textSub}}>Future</td>
                      <td style={{padding:"12px 14px"}}>
                        <Pill color={t.direction==="Long"?"green":"red"} small>{t.direction}</Pill>
                      </td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontSize:12}}>{openTime}</td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontFamily:"DM Mono",fontSize:12}}>${t.entry.toFixed(2)}</td>
                      <td style={{padding:"12px 14px",color:T.textSub}}>{closeDate}</td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontSize:12}}>{closeTime}</td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontFamily:"DM Mono",fontSize:12}}>${t.exit.toFixed(2)}</td>
                      <td style={{padding:"12px 14px",color:T.textSub,textAlign:"center"}}>1</td>
                      <td style={{padding:"12px 14px",color:T.textSub,textAlign:"center"}}>2</td>
                      <td style={{padding:"12px 14px",fontWeight:600,color:t.pnl>=0?T.green:T.red,fontFamily:"DM Mono"}}>{t.pnl>=0?"+":""}{fmt(t.pnl,false)}</td>
                      <td style={{padding:"12px 14px",fontWeight:600,color:t.pnl>=0?T.green:T.red,fontFamily:"DM Mono"}}>{ret>0?"+":""}{ret}%</td>
                      <td style={{padding:"12px 14px",textAlign:"center"}}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteTrade) {
                              onDeleteTrade(t);
                            }
                          }}
                          style={{background:"transparent",border:"none",fontSize:16,cursor:"pointer",color:T.red,transition:"all .2s",opacity:0.6,fontWeight:600}}
                          onMouseOver={(e) => e.currentTarget.style.opacity = "1"}
                          onMouseOut={(e) => e.currentTarget.style.opacity = "0.6"}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT - DETAIL PANEL WITH TABS */}
        {selectedTrade && (
          <div style={{width:360,maxHeight:"100vh",background:T.white,border:`1px solid ${T.border}`,borderRadius:12,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>
            
            {/* HEADER WITH TABS */}
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:16}}>
                {[
                  {id:"infos",label:"Trades",icon:"📝"},
                  {id:"strategies",label:"Strategy",icon:"🎯"}
                ].map(tab=>(
                  <button
                    key={tab.id}
                    onClick={()=>setActiveTab(tab.id)}
                    style={{
                      padding:"6px 0",
                      border:"none",
                      background:"transparent",
                      cursor:"pointer",
                      display:"flex",
                      alignItems:"center",
                      gap:4,
                      fontSize:12,
                      fontWeight:activeTab===tab.id?600:500,
                      color:activeTab===tab.id?T.text:T.textMut,
                      transition:"all .2s",
                      borderBottom:activeTab===tab.id?`2px solid ${T.accent}`:"none",
                      paddingBottom:"6px"
                    }}
                  >
                    <span style={{fontSize:11}}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
              <button onClick={()=>setSelectedTrade(null)} style={{background:"transparent",border:"none",fontSize:16,cursor:"pointer",color:T.textMut}}>✕</button>
            </div>

            {/* TRADE HEADER INFO */}

            {/* SCROLL CONTENT */}
            <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
              
              {/* INFOS TAB (NOTES) */}
              {activeTab === "infos" && (
                <>
                  {/* INFO ROW - DIRECTION */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Direction</div>
                    <div style={{fontSize:14,fontWeight:700,color:selectedTrade.direction==="Long"?T.green:T.red,fontFamily:"DM Mono"}}>{selectedTrade.direction}</div>
                  </div>

                  {/* INFO ROW - ENTRY */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Entrée</div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:"DM Mono"}}>{selectedTrade.entry.toFixed(4)}</div>
                  </div>

                  {/* INFO ROW - EXIT */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Sortie</div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:"DM Mono"}}>{selectedTrade.exit.toFixed(4)}</div>
                  </div>

                  {/* INFO ROW - P&L */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>P&L</div>
                    <div style={{fontSize:14,fontWeight:700,color:selectedTrade.pnl>=0?T.green:T.red,fontFamily:"DM Mono"}}>{selectedTrade.pnl>=0?"+":""}{fmt(selectedTrade.pnl,true)}</div>
                  </div>

                  {/* INFO ROW - P&L % */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>P&L %</div>
                    <div style={{fontSize:14,fontWeight:700,color:selectedTrade.pnl>=0?T.green:T.red,fontFamily:"DM Mono"}}>{(((selectedTrade.pnl/(selectedTrade.entry*100))*100)>=0?"+":"")}{ ((selectedTrade.pnl/(selectedTrade.entry*100))*100).toFixed(2)}%</div>
                  </div>

                  {/* EMOTION TAGS */}
                  <div style={{padding:"16px 16px",borderBottom:`1px solid ${T.border}`}} key={`emotion-${selectedTrade.date}-${selectedTrade.symbol}-${selectedTrade.entry}`}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,marginBottom:10,textTransform:"uppercase"}}>Tags Émotionnels</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {allEmotionTags.map(tag=>{
                        const tradeId = selectedTrade.date + selectedTrade.symbol + selectedTrade.entry;
                        const isSelected = emotionTags[tradeId] && emotionTags[tradeId].includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={()=>{
                              const current = emotionTags[tradeId] || [];
                              let updated;
                              if(isSelected){
                                updated = {...emotionTags,[tradeId]: current.filter(t=>t!==tag.id)};
                              } else {
                                updated = {...emotionTags,[tradeId]: [...current, tag.id]};
                              }
                              setEmotionTags(updated);
                              localStorage.setItem("tr4de_emotion_tags", JSON.stringify(updated));
                            }}
                            style={{
                              padding:"6px 12px",
                              border:`1.5px solid ${isSelected?tag.color:T.border}`,
                              borderRadius:18,
                              background:isSelected?`${tag.color}25`:T.white,
                              color:isSelected?tag.color:T.textMut,
                              fontSize:11,
                              fontWeight:600,
                              cursor:"pointer",
                              transition:"all .2s"
                            }}
                          >
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ERROR TAGS */}
                  <div style={{padding:"16px 16px",borderBottom:`1px solid ${T.border}`}} key={`error-${selectedTrade.date}-${selectedTrade.symbol}-${selectedTrade.entry}`}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,marginBottom:10,textTransform:"uppercase"}}>Erreurs</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {allErrorTags.map(tag=>{
                        const tradeId = selectedTrade.date + selectedTrade.symbol + selectedTrade.entry;
                        const isSelected = errorTags[tradeId] && errorTags[tradeId].includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={()=>{
                              const current = errorTags[tradeId] || [];
                              let updated;
                              if(isSelected){
                                updated = {...errorTags,[tradeId]: current.filter(t=>t!==tag.id)};
                              } else {
                                updated = {...errorTags,[tradeId]: [...current, tag.id]};
                              }
                              setErrorTags(updated);
                              localStorage.setItem("tr4de_error_tags", JSON.stringify(updated));
                            }}
                            style={{
                              padding:"6px 12px",
                              border:`1.5px solid ${isSelected?tag.color:T.border}`,
                              borderRadius:18,
                              background:isSelected?`${tag.color}25`:T.white,
                              color:isSelected?tag.color:T.textMut,
                              fontSize:11,
                              fontWeight:600,
                              cursor:"pointer",
                              transition:"all .2s"
                            }}
                          >
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* NOTES */}
                  <div style={{padding:"16px 16px",flex:1,display:"flex",flexDirection:"column"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,marginBottom:10,textTransform:"uppercase"}}>Notes</div>
                    <textarea
                      placeholder="What happened? Why did you take this trade?"
                      value={tradeNotes[selectedTrade.date + selectedTrade.symbol + selectedTrade.entry] || ""}
                      onChange={(e)=>{
                        const key = selectedTrade.date + selectedTrade.symbol + selectedTrade.entry;
                        const updated = {...tradeNotes, [key]: e.target.value};
                        setTradeNotes(updated);
                        localStorage.setItem("tr4de_trade_notes", JSON.stringify(updated));
                      }}
                      style={{
                        flex:1,
                        minHeight:100,
                        border:`1px solid ${T.border}`,
                        borderRadius:8,
                        padding:12,
                        fontSize:12,
                        fontFamily:"DM Sans",
                        color:T.text,
                        background:T.bg,
                        resize:"none",
                        outline:"none"
                      }}
                    />
                  </div>
                </>
              )}

              {/* STRATEGIES TAB */}
              {activeTab === "strategies" && (() => {
                const tradeId = selectedTrade.date + selectedTrade.symbol + selectedTrade.entry;
                const selectedIds = tradeStrategies[tradeId] || [];
                
                // Calculate total rules checked across all selected strategies
                const allSelectedStrats = loadedStrategies.filter(s => selectedIds.includes(s.id));
                const totalRulesCount = allSelectedStrats.reduce((sum, s) => sum + (s.groups?.flatMap(g => g.rules) || []).length, 0);
                const totalCheckedCount = allSelectedStrats.reduce((sum, s) => {
                  const rulesForStrat = (s.groups?.flatMap(g => g.rules) || []);
                  const checkedInStrat = rulesForStrat.filter(r => {
                    const key = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${s.id}_${r.id}`;
                    return checkedRules[key];
                  }).length;
                  return sum + checkedInStrat;
                }, 0);
                const progressPercent = totalRulesCount > 0 ? (totalCheckedCount / totalRulesCount) * 100 : 0;
                
                return (
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:16,padding:"16px",alignItems:"center",justifyContent:"flex-start",width:"100%",overflow:"auto",minHeight:500}}>
                    {selectedIds.length === 0 ? (
                      <>
                        <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                          <div style={{fontSize:40,opacity:0.6}}>⚙️</div>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:T.textSub,marginBottom:4,textAlign:"center"}}>Ajoute une stratégie à ton trade et suis ce qui fonctionne</div>
                          </div>
                        </div>
                        <div style={{position:"relative",width:"100%",display:"flex",justifyContent:"center"}}>
                          <button 
                            onClick={()=>setShowStrategyDropdown(!showStrategyDropdown)}
                            style={{
                              padding:"8px 16px",
                              borderRadius:6,
                              border:`1px solid ${T.border}`,
                              background:T.white,
                              fontSize:12,
                              fontWeight:600,
                              color:T.text,
                              cursor:"pointer",
                              display:"flex",
                              alignItems:"center",
                              gap:6,
                              transition:"all .2s"
                            }}
                          >
                            Ajouter une stratégie
                            <span style={{fontSize:10}}>∨</span>
                          </button>
                          
                          {/* STRATEGY DROPDOWN */}
                          {showStrategyDropdown && (
                            <div style={{
                              position:"absolute",
                              top:"100%",
                              left:0,
                              right:0,
                              marginTop:8,
                              background:T.white,
                              border:`1px solid ${T.border}`,
                              borderRadius:8,
                              boxShadow:"0 4px 12px rgba(0,0,0,0.1)",
                              zIndex:100,
                              maxHeight:200,
                              overflowY:"auto"
                            }}>
                              {loadedStrategies.length === 0 ? (
                                <div style={{padding:12,textAlign:"center",fontSize:11,color:T.textSub}}>Aucune stratégie créée</div>
                              ) : (
                                loadedStrategies.map(strat=>{
                                  const isSelected = selectedIds.includes(strat.id);
                                  return (
                                    <button key={strat.id} onClick={()=>{
                                      const current = tradeStrategies[tradeId] || [];
                                      let updated;
                                      if(isSelected){
                                        updated = current.filter(id=>id!==strat.id);
                                      }else{
                                        updated = [...current, strat.id];
                                      }
                                      const newTradeStrategies = {...tradeStrategies,[tradeId]: updated};
                                      setTradeStrategies(newTradeStrategies);
                                      console.log(`✓ Strategy link updated for trade ${tradeId}:`, updated);
                                      setShowStrategyDropdown(false);
                                    }} style={{width:"100%",padding:"8px 12px",borderBottom:`1px solid ${T.border}`,background:isSelected?T.accentBg:T.white,border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
                                    <div style={{width:10,height:10,borderRadius:3,background:strat.color}}/>
                                    <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:T.text}}>{strat.name}</div><div style={{fontSize:9,color:T.textSub}}>{strat.groups?.length || 0} groupe</div></div>
                                    {isSelected && <span style={{fontSize:12}}>✓</span>}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}

                    {/* SELECTED STRATEGIES DETAILS */}
                    {(() => {
                      const selectedStrats = loadedStrategies.filter(s => selectedIds.includes(s.id));
                      return selectedStrats.length > 0 ? (
                        <div style={{width:"100%",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                          {selectedStrats.map((strat,idx)=>{
                            const allRules = strat.groups.flatMap(g=>g.rules);
                            const checkedCount = allRules.filter(r=>{
                              const key = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${strat.id}_${r.id}`;
                              return checkedRules[key];
                            }).length;
                            const stratProgressPercent = allRules.length > 0 ? (checkedCount / allRules.length) * 100 : 0;
                            return (
                              <div key={strat.id} style={{display:"flex",flexDirection:"column",overflow:"hidden",flex:1}}>
                                <div style={{borderBottom:`1px solid ${T.border}`,paddingBottom:12}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                                    <div style={{width:12,height:12,borderRadius:3,background:strat.color}}/>
                                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{strat.name}</div>
                                    <button onClick={()=>{
                                      const newIds = selectedIds.filter(id=>id!==strat.id);
                                      const newTradeStrategies = {...tradeStrategies,[tradeId]: newIds};
                                      setTradeStrategies(newTradeStrategies);
                                      // ✅ SAVE TO LOCALSTORAGE!
                                      localStorage.setItem("tr4de_trade_strategies", JSON.stringify(newTradeStrategies));
                                      console.log(`✓ Strategy unlinked for trade ${tradeId}:`, newTradeStrategies);
                                    }} style={{marginLeft:"auto",background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:T.textMut}}>⋯</button>
                                  </div>
                                  {/* PROGRESS BAR */}
                                  <div style={{width:"100%",marginBottom:12}}>
                                    <div style={{fontSize:10,fontWeight:600,color:T.textMut,marginBottom:4}}>Règles suivies: {checkedCount}/{allRules.length}</div>
                                    <div style={{width:"100%",height:6,background:T.bg,borderRadius:3,overflow:"hidden"}}>
                                      <div style={{height:"100%",background:T.accent,width:`${stratProgressPercent}%`,transition:"width 0.3s ease"}}/>
                                    </div>
                                  </div>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                    <div/>
                                    <button style={{background:"transparent",border:"none",cursor:"pointer",fontSize:10,fontWeight:600,color:T.accent}}>TOUT DÉCOCHER</button>
                                  </div>
                                </div>

                                <div style={{flex:1,overflow:"auto",paddingTop:12}}>
                                  {strat.groups.map(group=>(
                                    <div key={group.id} style={{marginBottom:16}}>
                                      <div style={{fontSize:11,fontWeight:600,color:T.text,marginBottom:8,textTransform:"uppercase"}}>{group.name}</div>
                                      {group.rules.map(rule=>{
                                        const ruleKey = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${strat.id}_${rule.id}`;
                                        const isChecked = checkedRules[ruleKey] || false;
                                        return (
                                          <div key={rule.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer"}}>
                                            <input 
                                              type="checkbox" 
                                              checked={isChecked}
                                              onChange={()=>setCheckedRules({...checkedRules,[ruleKey]:!isChecked})}
                                              style={{cursor:"pointer",width:16,height:16}}
                                            />
                                            <label style={{fontSize:11,color:T.text,cursor:"pointer",flex:1}}>{rule.text}</label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null;
                    })()}
                  </div>
                );
              })()}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

function StrategiesPage({ strategies, setStrategies, onCreateClick }) {
  const [showForm, setShowForm] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({top:0, left:0});
  const getDefaultFormData = () => ({name:"",description:"",color:"#22C55E",groups:[{id:Date.now(),name:"",rules:[{id:Date.now()+1,text:""}]}]});
  const [formData, setFormData] = useState(getDefaultFormData());
  
  const colors = ["#9B7D94","#997B5D","#A5956B","#6B9B6F","#4A9D6F","#6B9D68","#5F8BA0","#5F7FB4","#6B8BB4","#8B7BA4","#A07B94","#7F7F7F"];

  const handleCreateStrategy = () => {
    if(formData.name.trim() && formData.groups.length > 0){
      // Check that all groups have at least one rule
      const validGroups = formData.groups.every(g => g.rules && g.rules.length > 0);
      if(validGroups){
        if(editingStrategyId){
          // Update existing strategy
          const updated = strategies.map(s => s.id === editingStrategyId ? {id:s.id,...formData,created:s.created} : s);
          setStrategies(updated);
          localStorage.setItem("apex_strategies", JSON.stringify(updated));
        } else {
          // Create new strategy
          const newStrategy = {id:Date.now(),...formData,created:new Date().toLocaleDateString()};
          const updated = [...strategies, newStrategy];
          setStrategies(updated);
          localStorage.setItem("apex_strategies", JSON.stringify(updated));
        }
        setFormData(getDefaultFormData());
        setShowForm(false);
        setEditingStrategyId(null);
      }
    }
  };

  const handleEditStrategy = (strat) => {
    setFormData(strat);
    setEditingStrategyId(strat.id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingStrategyId(null);
    setFormData(getDefaultFormData());
  };

  const addGroup = () => {
    setFormData({
      ...formData,
      groups:[...formData.groups,{id:Date.now(),name:"",rules:[{id:Date.now(),text:""}]}]
    });
  };

  const removeGroup = (groupId) => {
    setFormData({
      ...formData,
      groups:formData.groups.filter(g=>g.id!==groupId)
    });
  };

  const updateGroup = (groupId,field,value) => {
    setFormData({
      ...formData,
      groups:formData.groups.map(g=>g.id===groupId?{...g,[field]:value}:g)
    });
  };

  const addRule = (groupId) => {
    setFormData({
      ...formData,
      groups:formData.groups.map(g=>g.id===groupId?{...g,rules:[...g.rules,{id:Date.now(),text:""}]}:g)
    });
  };

  const removeRule = (groupId,ruleId) => {
    setFormData({
      ...formData,
      groups:formData.groups.map(g=>g.id===groupId?{...g,rules:g.rules.filter(r=>r.id!==ruleId)}:g)
    });
  };

  const updateRule = (groupId,ruleId,value) => {
    setFormData({
      ...formData,
      groups:formData.groups.map(g=>g.id===groupId?{...g,rules:g.rules.map(r=>r.id===ruleId?{...r,text:value}:r)}:g)
    });
  };

  React.useEffect(() => {
  
    const handleClickOutside = (e) => {
      if(!e.target.closest('button')) {
        setOpenMenuId(null);
      }
    };
    if(openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
      {/* HEADER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:20,fontWeight:700}}>🎯 Stratégies</div>
        <button onClick={()=>setShowForm(true)} style={{padding:"8px 16px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>+ Créer une stratégie</button>
      </div>

      {/* CONTENT */}
      {strategies.length === 0 ? (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"80px 40px",textAlign:"center",minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <div style={{fontSize:64,marginBottom:20}}>🎯</div>
          <div style={{fontSize:24,fontWeight:700,color:T.text,marginBottom:8}}>Pas encore de stratégies</div>
          <div style={{fontSize:14,color:T.textSub,marginBottom:24,maxWidth:400}}>Créez votre première stratégie de trading avec des règles pour suivre comment tout s'agit.</div>
          <button onClick={()=>setShowForm(true)} style={{padding:"12px 24px",borderRadius:8,background:"#000",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",border:"none"}}>+ Créer votre première stratégie</button>
        </div>
      ) : (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 350px)"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                <tr>
                  <th style={{padding:"14px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Strategy</th>
                  <th style={{padding:"14px 16px",textAlign:"center",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Rules</th>
                  <th style={{padding:"14px 16px",textAlign:"center",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Trades</th>
                  <th style={{padding:"14px 16px",textAlign:"center",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Taux victoire</th>
                  <th style={{padding:"14px 16px",textAlign:"right",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>P&L total</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((strat,idx)=>{
                  const totalRules = strat.groups.reduce((sum,g)=>sum+(g.rules?.length||0),0);
                  return (
                    <tr key={strat.id} style={{borderBottom:`1px solid ${T.border}`,background:idx%2===0?T.bg:"transparent",hover:{background:T.border},cursor:"pointer"}} onClick={()=>{handleEditStrategy(strat);setOpenMenuId(null);}}>
                      <td style={{padding:"14px 16px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:12,height:12,borderRadius:4,background:strat.color,flexShrink:0}}/>
                          <div>
                            <div style={{fontSize:12,fontWeight:600,color:T.text}}>{strat.name}</div>
                            <div style={{fontSize:10,color:T.textSub,marginTop:2}}>{strat.created}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{padding:"14px 16px",textAlign:"center",color:T.text,fontWeight:600}}>{totalRules}</td>
                      <td style={{padding:"14px 16px",textAlign:"center",color:T.text,fontWeight:600}}>0</td>
                      <td style={{padding:"14px 16px",textAlign:"center",color:T.text,fontWeight:600}}>—</td>
                      <td style={{padding:"14px 16px",textAlign:"right",color:T.text,fontWeight:600,fontFamily:"DM Mono"}}>—</td>
                      <td style={{padding:"14px 16px",textAlign:"center",position:"relative"}}>
                        <button onClick={(e)=>{e.stopPropagation();const rect = e.currentTarget.getBoundingClientRect();setMenuPos({top: rect.bottom + 4, left: rect.left - 100});setOpenMenuId(openMenuId===strat.id?null:strat.id);}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:T.textMut,padding:"4px 8px"}}>⋯</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DROPDOWN MENU */}
      {openMenuId && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:49}} onClick={()=>setOpenMenuId(null)}/>
      )}
      {openMenuId && (() => {
        const strat = strategies.find(s => s.id === openMenuId);
        return strat ? (
          <div key={`menu-${strat.id}`} style={{position:"fixed",top:menuPos.top,left:menuPos.left,background:T.white,border:`1px solid ${T.border}`,borderRadius:6,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:50,minWidth:130}}>
            <button onClick={(e)=>{e.stopPropagation();handleEditStrategy(strat);setOpenMenuId(null);}} style={{width:"100%",padding:"10px 14px",textAlign:"left",background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:T.text,display:"block"}}>Modifier</button>
            <button onClick={(e)=>{e.stopPropagation();const updated=strategies.filter(s=>s.id!==strat.id);setStrategies(updated);localStorage.setItem("apex_strategies",JSON.stringify(updated));setOpenMenuId(null);}} style={{width:"100%",padding:"10px 14px",textAlign:"left",background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:T.red,display:"block",borderTop:`1px solid ${T.border}`}}>Supprimer</button>
          </div>
        ) : null;
      })()}

      {/* CREATE STRATEGY MODAL */}
      {showForm && ReactDOM.createPortal(
        <>
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:999}} onClick={handleCancelEdit}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%, -50%)",background:T.white,borderRadius:12,width:"90%",maxWidth:600,maxHeight:"80vh",overflow:"auto",display:"flex",flexDirection:"column",border:`1px solid ${T.border}`,zIndex:1000}} onClick={(e)=>e.stopPropagation()}>
            <div style={{padding:20,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.white}}>
              <div style={{fontSize:16,fontWeight:700}}>{editingStrategyId ? "Modifier la stratégie" : "Créer une nouvelle stratégie"}</div>
              <button onClick={handleCancelEdit} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18}}>✕</button>
            </div>
            
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:16,flex:1,overflow:"auto"}}>
              {/* STRATEGY NAME */}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:T.text,display:"block",marginBottom:6}}>Nom de la stratégie</label>
                <input type="text" placeholder="ex., VWAP Breakout" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} style={{width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:12,outline:"none"}}/>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:T.text,display:"block",marginBottom:6}}>Description optionnelle...</label>
                <textarea placeholder="Décrivez votre stratégie..." value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} style={{width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:12,outline:"none",minHeight:60,resize:"none"}}/>
              </div>

              {/* COLOR PICKER */}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:T.text,display:"block",marginBottom:8}}>Couleur</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {colors.map(c=>(
                    <button key={c} onClick={()=>setFormData({...formData,color:c})} style={{width:32,height:32,borderRadius:6,background:c,border:formData.color===c?`2px solid ${T.text}`:`2px solid ${T.border}`,cursor:"pointer",transition:"all .2s"}}/>
                  ))}
                </div>
              </div>

              {/* GROUPS */}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:T.text,display:"block",marginBottom:8}}>Groupes et règles</label>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {formData.groups.map((group,gIdx)=>(
                    <div key={group.id} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{fontSize:16}}>≡</span>
                        <input type="text" placeholder="ex., confluences d'entrées" value={group.name} onChange={(e)=>updateGroup(group.id,"name",e.target.value)} style={{flex:1,padding:"6px 10px",borderRadius:4,border:`1px solid ${T.border}`,fontSize:11,outline:"none"}}/>
                        <button onClick={()=>removeGroup(group.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:T.red}}>✕</button>
                      </div>

                      {/* RULES */}
                      <div style={{display:"flex",flexDirection:"column",gap:6,paddingLeft:20}}>
                        {group.rules.map((rule,rIdx)=>(
                          <div key={rule.id} style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:10,color:T.textMut}}>•</span>
                            <input type="text" placeholder="ex., FVG 5m" value={rule.text} onChange={(e)=>updateRule(group.id,rule.id,e.target.value)} style={{flex:1,padding:"6px 10px",borderRadius:4,border:`1px solid ${T.border}`,fontSize:11,outline:"none"}}/>
                            {group.rules.length > 1 && <button onClick={()=>removeRule(group.id,rule.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:T.red}}>✕</button>}
                          </div>
                        ))}
                        <button onClick={()=>addRule(group.id)} style={{marginTop:4,fontSize:11,color:T.accent,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",padding:0}}>+ Ajouter une règle</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addGroup} style={{marginTop:12,fontSize:12,color:T.accent,background:"transparent",border:`1px dashed ${T.accent}`,cursor:"pointer",padding:"8px 12px",borderRadius:6,width:"100%"}}>+ Ajouter un groupe</button>
              </div>

              {/* BUTTONS */}
              <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${T.border}`,flexShrink:0}}>
                <button onClick={handleCancelEdit} style={{padding:"10px 20px",borderRadius:6,border:`1px solid ${T.border}`,background:T.white,fontSize:12,fontWeight:600,cursor:"pointer"}}>Annuler</button>
                <button onClick={handleCreateStrategy} style={{padding:"10px 20px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>{editingStrategyId ? "✓ Modifier la stratégie" : "✓ Créer une stratégie"}</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button className="nav-item" onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:8,border:"none",background: active ? T.accentBg : "transparent",color: active ? T.accent : T.textSub,fontSize:13,fontWeight: active ? 600 : 400,transition:"all .15s",textAlign:"left",}}>
      <span style={{fontSize:15,opacity: active?1:.7}}>{icon}</span>
      <span>{label}</span>
      {badge && <span style={{marginLeft:"auto",fontSize:10,padding:"1px 6px",borderRadius:20,background:T.red+"20",color:T.red,fontWeight:600}}>{badge}</span>}
    </button>
  );
}

function AddTradePage({ trades, setPage, setAccounts, setSelectedAccountIds, accountType, setAccountType, selectedEvalAccount, setSelectedEvalAccount, accounts = [], selectedAccountIds = [], addTrade, addStrategy, strategies = [], user }) {
  const [accountName, setAccountName] = useState("");
  const [selectedBroker, setSelectedBroker] = useState("tradovate");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedImportStrategy, setSelectedImportStrategy] = useState("");
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [strategyFormData, setStrategyFormData] = useState({ name: "", description: "", color: "#5F7FB4", groups: [{ id: Date.now(), name: "", rules: [{ id: Date.now() + 1, text: "" }] }] });
  const fileInputRef = useRef(null);

  const colors = ["#9B7D94", "#997B5D", "#A5956B", "#6B9B6F", "#4A9D6F", "#6B9D68", "#5F8BA0", "#5F7FB4", "#6B8BB4", "#8B7BA4", "#A07B94", "#7F7F7F"];

  // ✅ Les stratégies viennent maintenant du hook passé en props

  const getDefaultStrategyFormData = () => ({
    name: "",
    description: "",
    color: "#5F7FB4",
    groups: [{ id: Date.now(), name: "", rules: [{ id: Date.now() + 1, text: "" }] }]
  });

  const handleCreateStrategyFromForm = async () => {
    if (strategyFormData.name.trim() && strategyFormData.groups.length > 0) {
      const validGroups = strategyFormData.groups.every(g => g.rules && g.rules.length > 0);
      if (validGroups) {
        const newStrategy = {
          id: Date.now().toString(), // ✅ Convert to string for consistency
          name: strategyFormData.name,
          description: strategyFormData.description,
          color: strategyFormData.color,
          groups: strategyFormData.groups,
          // Don't add 'created' - it's added by addStrategy as 'created_at'
        };
        // ✅ Ajouter la stratégie via le hook avec gestion d'erreur
        try {
          console.log("📝 Creating strategy:", newStrategy);
          const created = await addStrategy(newStrategy);
          console.log("✅ Strategy created successfully:", created);
          setSelectedImportStrategy(newStrategy.id);
          setStrategyFormData(getDefaultStrategyFormData());
          setShowStrategyForm(false);
        } catch (err) {
          const errMsg = err?.message || JSON.stringify(err) || "Unknown error";
          console.error("❌ Failed to create strategy:", errMsg);
          alert(`❌ Erreur lors de la création de la stratégie: ${errMsg}`);
        }
      }
    }
  };

  const addGroup = () => {
    setStrategyFormData({
      ...strategyFormData,
      groups: [...strategyFormData.groups, { id: Date.now(), name: "", rules: [{ id: Date.now(), text: "" }] }]
    });
  };

  const removeGroup = (groupId) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.filter(g => g.id !== groupId)
    });
  };

  const updateGroup = (groupId, field, value) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.map(g => g.id === groupId ? { ...g, [field]: value } : g)
    });
  };

  const addRule = (groupId) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.map(g => g.id === groupId ? { ...g, rules: [...g.rules, { id: Date.now(), text: "" }] } : g)
    });
  };

  const removeRule = (groupId, ruleId) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.map(g => g.id === groupId ? { ...g, rules: g.rules.filter(r => r.id !== ruleId) } : g)
    });
  };

  const updateRule = (groupId, ruleId, value) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.map(g => g.id === groupId ? { ...g, rules: g.rules.map(r => r.id === ruleId ? { ...r, text: value } : r) } : g)
    });
  };

  const brokers = [
    { id: "mt5", name: "MetaTrader 5", format: "html", icon: "🔷", iconPath: "/MetaTrader_5.png" },
    { id: "tradovate", name: "Tradovate", format: "csv", icon: "📊", iconPath: "/trado.png" },
    { id: "wealthcharts", name: "WealthCharts", format: "csv", icon: "💰", iconPath: "/weal.webp" },
  ];

  const getBrokerInstructions = () => {
    if (selectedBroker === "tradovate") {
      return {
        icon: "📊",
        iconPath: "/trado.png",
        name: "Tradovate",
        title: "Tradovate",
        subtext: "Types d'actifs supportés: Contrats à terme",
        steps: [
          "1. Aller dans l'onglet Compte dans Tradovate",
          "2. Cliquer sur les paramètres de votre compte",
          "3. Aller dans l'onglet Ordres",
          "4. Sélectionner votre plage de dates et cliquer Aller",
          "5. Cliquer Télécharger le rapport"
        ]
      };
    }
    if (selectedBroker === "wealthcharts") {
      return {
        icon: "💰",
        iconPath: "/weal.webp",
        name: "WealthCharts",
        title: "WealthCharts",
        subtext: "Types d'actifs supportés: Contrats, Actions, Indices",
        steps: [
          "1. Ouvrir WealthCharts Trading Platform",
          "2. Aller dans Ordres ou Historique",
          "3. Exporter vos ordres en CSV",
          "4. Assurez-vous que le fichier contient: order_id, qty_sent, qty_done, price_done",
          "5. Charger le fichier CSV pour importer"
        ]
      };
    }
    return {
      icon: "🔷",
      iconPath: "/MetaTrader_5.png",
      name: "MetaTrader 5",
      title: "MetaTrader 5",
      subtext: "Types d'actifs supportés: Forex, Actions, Crypto",
      steps: [
        "1. Ouvrir le terminal MetaTrader 5",
        "2. Ouvrir l'Historique depuis le menu Outils",
        "3. Sélectionner votre compte de trading",
        "4. Clic-droit sur les trades et exporter en HTML",
        "5. Charger le fichier HTML pour importer"
      ]
    };
  };

  // Charger les infos du compte quand le nom change
  useEffect(() => {
    if (accountName && accounts.length > 0) {
      const selectedAccount = accounts.find(acc => acc.name === accountName);
      if (selectedAccount) {
        // Remplir le broker
        const brokerMap = {
          "MetaTrader 5": "mt5",
          "WealthCharts": "wealthcharts",
          "Tradovate": "tradovate"
        };
        setSelectedBroker(brokerMap[selectedAccount.broker] || "tradovate");
        
        // Remplir le type et la taille
        setAccountType(selectedAccount.account_type || "live");
        if (selectedAccount.account_type === "eval" && selectedAccount.eval_account_size) {
          setSelectedEvalAccount(selectedAccount.eval_account_size);
        } else {
          setSelectedEvalAccount("25k");
        }
        
        setIsEditingAccount(true);
      }
    } else {
      setIsEditingAccount(false);
    }
  }, [accountName, accounts]);

  // Sauvegarder les changements du compte
  const saveAccountChanges = async () => {
    console.log("🔄 Tentative de sauvegarde...");
    console.log("accountName:", accountName);
    console.log("isEditingAccount:", isEditingAccount);
    console.log("accounts:", accounts);
    
    if (!isEditingAccount || !accountName || accounts.length === 0) {
      console.log("❌ Conditions non remplies - early return");
      return;
    }
    
    setSaveStatus("saving");
    try {
      const supabase = createClient();
      const selectedAccount = accounts.find(acc => acc.name === accountName);
      console.log("selectedAccount trouvé:", selectedAccount);
      
      if (!selectedAccount) {
        console.log("❌ Compte NOT trouvé avec le nom:", accountName);
        setSaveStatus("error");
        return;
      }
      
      const brokerMap = {
        "tradovate": "Tradovate",
        "mt5": "MetaTrader 5",
        "wealthcharts": "WealthCharts"
      };
      
      const updateData = {
        broker: brokerMap[selectedBroker] || "Tradovate",
        account_type: accountType,
        eval_account_size: accountType === "eval" ? selectedEvalAccount : null,
      };
      console.log("Données à sauvegarder:", updateData);
      
      const { error } = await supabase
        .from("trading_accounts")
        .update(updateData)
        .eq("id", selectedAccount.id);
      
      console.log("Réponse DB - error:", error);
        
      if (error) {
        console.error("❌ Erreur DB:", error);
        setSaveStatus("error");
      } else {
        console.log("✅ Compte mis à jour!");
        
        // RECHARGER les comptes depuis la DB
        const userId = user?.id;
        const { data: refreshedAccounts } = await supabase
          .from("trading_accounts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        
        console.log("Comptes rechargés:", refreshedAccounts);
        
        if (setAccounts) {
          setAccounts(refreshedAccounts || []);
        }
        
        setSaveStatus("success");
        setTimeout(() => setSaveStatus(""), 2000);
      }
    } catch (err) {
      console.error("❌ Exception:", err);
      setSaveStatus("error");
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setLoading(true);
    try {
      const content = await file.text();
      setFileContent(content);
      const trades = parseCSV(content, selectedBroker);
      if (trades.length === 0) {
        setError("❌ Aucun trade trouvé dans le fichier. Vérifiez le format.");
        setPreview([]);
        setLoading(false);
        return;
      }
      setPreview(trades.slice(0, 3));
      setError("");
    } catch (err) {
      setError(`❌ Erreur: ${err.message}`);
      setPreview([]);
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!accountName.trim()) {
      setError("❌ Veuillez entrer un nom de compte");
      return;
    }
    if (!fileContent) {
      setError("❌ Aucun fichier sélectionné");
      return;
    }
    
    setLoading(true);
    
    try {
      const supabase = createClient();
      const userId = user?.id;
      const importedTrades = parseCSV(fileContent, selectedBroker);
      if (importedTrades.length === 0) {
        setError("❌ Aucun trade trouvé");
        setLoading(false);
        return;
      }
      
      // Mapper les valeurs de broker à leurs formes correctes
      const brokerMap = {
        "tradovate": "Tradovate",
        "mt5": "MetaTrader 5",
        "wealthcharts": "WealthCharts"
      };
      const brokerFormatted = brokerMap[selectedBroker] || "Tradovate";
      
      // Créer ou obtenir le compte
      let accountId;
      
      // Vérifier si le compte existe déjà
      const { data: existingAccount, error: checkError } = await supabase
        .from("trading_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("name", accountName.trim())
        .single();
      
      if (existingAccount) {
        // Le compte existe, utiliser son ID
        accountId = existingAccount.id;
      } else {
        // Créer un nouveau compte
        const { data: newAccount, error: createError } = await supabase
          .from("trading_accounts")
          .insert([{
            user_id: userId,
            name: accountName.trim(),
            broker: brokerFormatted,
            account_type: accountType,
            eval_account_size: accountType === "eval" ? selectedEvalAccount : null,
          }])
          .select();
        
        if (createError) {
          console.error("Error creating account:", createError);
          setError("❌ Erreur lors de la création du compte: " + createError.message);
          setLoading(false);
          return;
        }
        
        if (!newAccount || newAccount.length === 0) {
          setError("❌ Erreur: compte non créé");
          setLoading(false);
          return;
        }
        
        accountId = newAccount[0].id;
      }
      
      // Insérer les trades
      const tradesToInsert = importedTrades
        .filter(t => Math.abs(t.pnl) >= 50) // Filtrer les trades avec |pnl| < 50$
        .map(t => ({
          user_id: userId,
          account_id: accountId,
          date: t.date,
          symbol: t.symbol,
          direction: t.direction,
          entry: t.entry,
          exit: t.exit,
          pnl: t.pnl,
        }));
      
      if (tradesToInsert.length === 0) {
        setError("❌ Aucun trade avec un P&L >= $50 trouvé");
        setLoading(false);
        return;
      }
      
      const { error: insertError } = await supabase
        .from("apex_trades")
        .insert(tradesToInsert);
      
      if (insertError) {
        console.error("Error inserting trades:", insertError);
        setError("❌ Erreur lors de la sauvegarde des trades: " + insertError.message);
        setLoading(false);
        return;
      }
      
      // ⭐ RECHARGER les trades depuis Supabase pour avoir les IDs UUID corrects
      // (et pas les IDs numériques du CSV qui causent des erreurs lors de la suppression)
      console.log("📥 Rechargement des trades depuis Supabase après import...");
      console.log("  Fetching ALL trades for user:", userId);
      
      // ✅ CRITICAL FIX 1: Fetch ALL trades for the user (not just this account)
      // to update localStorage which feeds the useTrades() hook
      const { data: allUserTrades, error: fetchError } = await supabase
        .from("apex_trades")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      console.log("  Fetch result:", { hasError: !!fetchError, tradesCount: allUserTrades?.length });
      
      let freshTrades = [];
      if (fetchError) {
        console.error("❌ Error fetching fresh trades:", fetchError);
        // Continue anyway - at least trades are saved
      } else if (allUserTrades && allUserTrades.length > 0) {
        freshTrades = allUserTrades;
        console.log(`✅ Loaded ${allUserTrades.length} fresh trades from Supabase`);
        console.log("First trade structure:", allUserTrades[0]);
        
        // ✅ CRITICAL FIX 2: Update localStorage AND dispatch event so useTrades() hook sees new trades
        // This triggers the component to re-render with imported trades WITHOUT needing a refresh
        localStorage.setItem("tr4de_trades", JSON.stringify(allUserTrades));
        console.log("💾 Updated tr4de_trades in localStorage");
        
        // ✅ CRITICAL FIX 2b: Dispatch custom event to notify useTrades hook in this same tab
        // (storage events don't fire in the same tab, only in other tabs)
        window.dispatchEvent(new CustomEvent("trades-refreshed", { detail: { trades: allUserTrades } }));
        console.log("🔔 Dispatched trades-refreshed event");
      } else {
        console.warn("⚠️  No fresh trades returned from Supabase");
      }
      
      // Link imported trades to strategy if selected
      // ⭐ IMPORTANT: Use ONLY freshTrades (the ones actually saved to DB), not importedTrades
      // because importedTrades includes ALL trades but some are filtered out (pnl < $50)
      if (selectedImportStrategy && freshTrades && freshTrades.length > 0) {
        console.log("🔗 LINKING TRADES TO STRATEGY START");
        console.log("  Selected Strategy ID:", selectedImportStrategy);
        console.log("  Fresh trades count (from Supabase):", freshTrades.length);
        
        const tradeStrategiesData = (() => {
          const saved = localStorage.getItem("tr4de_trade_strategies");
          return saved ? JSON.parse(saved) : {};
        })();
        
        console.log("📋 Current trade-strategy mapping BEFORE:", JSON.stringify(tradeStrategiesData, null, 2));
        
        freshTrades.forEach((trade, idx) => {
          // Normalize entry to string with 2 decimals for consistent key
          const normalizedEntry = parseFloat(trade.entry).toFixed(2);
          
          console.log(`\n  Trade ${idx + 1}:`, {
            date: trade.date,
            symbol: trade.symbol,
            entry: trade.entry,
            normalized_entry: normalizedEntry,
            pnl: trade.pnl,
            id: trade.id
          });
          
          // Use multiple key formats to ensure compatibility:
          // 1. date + symbol + entry (for backward compatibility with old format)
          // 2. UUID id (for Supabase trades)
          const keys = [
            `${trade.date}${trade.symbol}${trade.entry}`,           // Original format
            `${trade.date}${trade.symbol}${normalizedEntry}`,       // Normalized format
            trade.id                                                // Supabase UUID - NEW!
          ];
          
          const strategyId = parseInt(selectedImportStrategy);
          let keyUsed = null;
          
          // Try each key format, in case there's a format mismatch
          for (const tradeIdKey of keys) {
            if (!tradeStrategiesData[tradeIdKey]) {
              tradeStrategiesData[tradeIdKey] = [];
            }
            
            if (!tradeStrategiesData[tradeIdKey].includes(strategyId)) {
              tradeStrategiesData[tradeIdKey].push(strategyId);
              if (!keyUsed) keyUsed = tradeIdKey;
              console.log(`    ✓ KEY: "${tradeIdKey}"`);
              console.log(`    ✓ Added strategy ${strategyId}`);
            }
          }
          
          if (!keyUsed) {
            console.log(`    ⚠️  Strategy already linked`);
          }
        });
        
        console.log("\n📝 Updated trade-strategy mapping AFTER:", JSON.stringify(tradeStrategiesData, null, 2));
        localStorage.setItem("tr4de_trade_strategies", JSON.stringify(tradeStrategiesData));
        console.log("✅ Saved to tr4de_trade_strategies");
      } else {
        if (!selectedImportStrategy) {
          console.warn("⚠️  No strategy selected - trades won't be linked");
        }
        if (!freshTrades || freshTrades.length === 0) {
          console.warn("⚠️  No fresh trades found - nothing to link");
        }
      }
      
      // Recharger les comptes en haut
      const { data: updatedAccounts } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (setAccounts) {
        setAccounts(updatedAccounts || []);
        
        // ✅ CRITICAL FIX 3: After successful import, ADD the new account to selected accounts
        // (Don't replace! User should see both old and new account trades)
        const importedAccount = updatedAccounts?.find(acc => acc.id === accountId);
        if (importedAccount) {
          // Append new account to existing selectedAccountIds
          const newSelectedIds = Array.from(new Set([...selectedAccountIds, accountId]));
          setSelectedAccountIds(newSelectedIds);
          localStorage.setItem('selectedAccountIds', JSON.stringify(newSelectedIds));
          console.log("✅ Account added to selection:", newSelectedIds);
        }
      }
      
      setAccountName("");
      setFileName("");
      setFileContent("");
      setPreview([]);
      setSelectedBroker("tradovate");
      setSelectedImportStrategy("");
      setError("");
      setLoading(false);
      
      // Rediriger vers la page des trades après 1.5s
      setTimeout(() => {
        setPage("trades");
      }, 1500);
    } catch (err) {
      setError(`❌ Erreur d'import: ${err.message}`);
      console.error("Import error:", err);
      setLoading(false);
    }
  };

  const brokerInfo = getBrokerInstructions();

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "16px", padding: "16px", background: "#fff", width: "100%", height: "100%", minHeight: "100%" }} className="anim-1">
      {/* LEFT: QUESTIONNAIRE FORM */}
      <div style={{ display: "flex", flexDirection: "column", borderRadius: "12px", border: `1px solid ${T.border}`, padding: "0", background: "#fff", flex: "0.7" }}>
          <div style={{ padding: "24px" }}>
          
          {/* ACCOUNT SELECTOR */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              Compte
            </label>
            <QuickAccountSelector
              selectedAccountName={accountName}
              onAccountNameChange={setAccountName}
              T={T}
            />
          </div>
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>

          {/* BROKER */}
          <div style={{ marginTop: "14px", marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              Courtier
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: "6px", background: T.white, cursor: "pointer" }}>
              <img src={brokers.find(b => b.id === selectedBroker)?.iconPath} alt="broker" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
              <select
                value={selectedBroker}
                onChange={(e) => { setSelectedBroker(e.target.value); setError(""); }}
                style={{
                  flex: 1,
                  border: "none",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  outline: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 14px -24px" }}></div>

          {/* ACCOUNT TYPE */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              Type de Compte
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {["live", "eval"].map((type) => (
                <button
                  key={type}
                  onClick={() => setAccountType(type)}
                  onMouseEnter={(e) => {
                    if (accountType !== type) {
                      e.currentTarget.style.background = "#F3F4F6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (accountType !== type) {
                      e.currentTarget.style.background = T.bg;
                    }
                  }}
                  style={{
                    padding: "8px 12px",
                    border: accountType === type ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                    borderRadius: "6px",
                    background: accountType === type ? T.accentBg : T.bg,
                    color: accountType === type ? T.accent : T.text,
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {type === "live" ? "Compte Live" : "Compte Eval"}
                </button>
              ))}
            </div>
            {accountType === "eval" && (
              <div style={{ marginTop: "12px" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "8px", color: T.textMut, textTransform: "uppercase" }}>
                  Montant du Compte
                </label>
                <select
                  value={selectedEvalAccount}
                  onChange={(e) => setSelectedEvalAccount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: `1px solid ${T.border}`,
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    background: T.white,
                  }}
                >
                  <option value="25k">$25,000</option>
                  <option value="50k">$50,000</option>
                  <option value="100k">$100,000</option>
                  <option value="150k">$150,000</option>
                </select>
              </div>
            )}
            
            {/* BOUTON SAUVEGARDER POUR ÉDITION */}
            {isEditingAccount && (
              <div style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={saveAccountChanges}
                  disabled={saveStatus === "saving"}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: saveStatus === "success" ? T.green : saveStatus === "error" ? T.red : T.accent,
                    color: T.white,
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: saveStatus === "saving" ? "default" : "pointer",
                    opacity: saveStatus === "saving" ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {saveStatus === "saving" ? "Sauvegarde..." : saveStatus === "success" ? "✓ Sauvegardé" : saveStatus === "error" ? "✗ Erreur" : "Mettre à jour"}
                </button>
              </div>
            )}
          </div>
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>

          {/* STRATEGY SELECTOR */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              Stratégie (optionnel)
            </label>
            <select
              value={selectedImportStrategy}
              onChange={(e) => {
                if (e.target.value === "create_new") {
                  setShowStrategyForm(true);
                  setStrategyFormData(getDefaultStrategyFormData());
                } else {
                  setSelectedImportStrategy(e.target.value);
                }
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${T.border}`,
                borderRadius: "6px",
                fontSize: "12px",
                fontFamily: "inherit",
                background: T.white,
              }}
            >
              <option value="">Aucune stratégie sélectionnée</option>
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
              <option value="create_new">
                ➕ Créer une stratégie
              </option>
            </select>
          </div>
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>

          {/* FILE */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              Fichier
            </label>
            <div style={{
              padding: "20px",
              border: `2px dashed ${T.border}`,
              borderRadius: "8px",
              textAlign: "center",
              cursor: "pointer",
              background: T.bg,
            }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file && fileInputRef.current) { const dt = new DataTransfer(); dt.items.add(file); fileInputRef.current.files = dt.files; handleFileSelect({ target: { files: [file] } }); } }}>
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: "none" }} accept=".csv,.html,.txt" />
              <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "100%" }}>
                {!fileName && <div style={{ fontSize: "24px" }}>📁</div>}
                <div style={{ fontSize: "11px", color: T.accent, fontWeight: "600" }}>
                  {fileName ? `✓ ${fileName}` : "Drop your file here or browse"}
                </div>
                {!fileName && <div style={{ fontSize: "10px", color: T.textSub }}>CSV, TXT, or HTML</div>}
              </button>
            </div>
          </div>
          {preview.length > 0 && <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>}

          {/* PREVIEW */}
          {preview.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: T.textMut, marginBottom: "12px", textTransform: "uppercase" }}>
                Aperçu ({preview.length} trades)
              </label>
              <div style={{ overflowX: "auto", background: T.bg, borderRadius: "6px", padding: "12px" }}>
                <table style={{ width: "100%", fontSize: "10px" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: T.textSub }}>Date</th>
                      <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: T.textSub }}>Symbol</th>
                      <th style={{ padding: "8px", textAlign: "right", fontWeight: "600", color: T.textSub }}>Entry</th>
                      <th style={{ padding: "8px", textAlign: "right", fontWeight: "600", color: T.textSub }}>Exit</th>
                      <th style={{ padding: "8px", textAlign: "right", fontWeight: "600", color: T.textSub }}>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((trade, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "8px", color: T.textSub, fontSize: "10px" }}>{trade.date}</td>
                        <td style={{ padding: "8px", color: T.textSub, fontWeight: "600" }}>{trade.symbol}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: T.textSub }}>{trade.entry?.toFixed(2)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: T.textSub }}>{trade.exit?.toFixed(2)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: trade.pnl >= 0 ? T.green : T.red, fontWeight: "600" }}>
                          {trade.pnl >= 0 ? "+" : ""}{trade.pnl?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {(preview.length > 0 || error) && <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>}

          {error && <div style={{ padding: "12px", background: "#FEE2E2", border: `1px solid #FCA5A5`, borderRadius: "6px", fontSize: "12px", color: "#991B1B", marginBottom: "16px" }}>{error}</div>}

          <button
            onClick={handleImport}
            disabled={!fileContent || !accountName.trim() || loading}
            style={{
              width: "100%",
              padding: "12px 24px",
              borderRadius: "8px",
              background: fileContent && accountName.trim() && !loading ? T.green : T.border2,
              color: "#fff",
              border: "none",
              cursor: fileContent && accountName.trim() && !loading ? "pointer" : "not-allowed",
              fontSize: "12px",
              fontWeight: "600",
              opacity: fileContent && accountName.trim() && !loading ? 1 : 0.6,
            }}
          >
            {loading ? "⏳ Traitement..." : "✓ Importer les trades"}
          </button>

          {/* STRATEGY FORM MODAL */}
          {showStrategyForm && ReactDOM.createPortal(
            <div onClick={() => { setShowStrategyForm(false); setStrategyFormData(getDefaultStrategyFormData()); }} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div onClick={(e)=>e.stopPropagation()} style={{background:T.white,borderRadius:12,padding:40,maxWidth:600,width:"90%",maxHeight:"90vh",overflowY:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h2 style={{fontSize:20,fontWeight:700}}>🎯 Créer une stratégie</h2>
                  <button onClick={() => { setShowStrategyForm(false); setStrategyFormData(getDefaultStrategyFormData()); }} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:T.textMut}}>✕</button>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:6,color:T.textMut}}>Nom de la stratégie</label>
                  <input type="text" value={strategyFormData.name} onChange={(e)=>setStrategyFormData({...strategyFormData,name:e.target.value})} placeholder="ex. Scalp 5min FVG" style={{width:"100%",padding:"10px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:14,outline:"none"}}/>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:6,color:T.textMut}}>Description</label>
                  <textarea value={strategyFormData.description} onChange={(e)=>setStrategyFormData({...strategyFormData,description:e.target.value})} placeholder="Décrivez votre stratégie..." style={{width:"100%",padding:"10px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:14,outline:"none",resize:"vertical",minHeight:60}}/>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:8,color:T.textMut}}>Couleur</label>
                  <div style={{display:"flex",gap:8}}>
                    {colors.map(color=>(
                      <button key={color} onClick={()=>setStrategyFormData({...strategyFormData,color})} style={{width:32,height:32,borderRadius:8,background:color,border:strategyFormData.color===color?`3px solid ${T.text}`:"2px solid #ddd",cursor:"pointer"}}/>
                    ))}
                  </div>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:8,color:T.textMut}}>Groupes de règles</label>
                  {strategyFormData.groups && strategyFormData.groups.map((group,gIdx)=>(
                    <div key={group.id} style={{marginBottom:16,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.bg}}>
                      <div style={{display:"flex",gap:8,marginBottom:12}}>
                        <input type="text" placeholder="Nom du groupe" value={group.name} onChange={(e)=>updateGroup(group.id,"name",e.target.value)} style={{flex:1,padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,outline:"none"}}/>
                        {strategyFormData.groups.length > 1 && <button onClick={()=>removeGroup(group.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:T.red}}>✕</button>}
                      </div>

                      <div style={{display:"flex",flexDirection:"column",gap:6,paddingLeft:20}}>
                        {group.rules && group.rules.map((rule,rIdx)=>(
                          <div key={rule.id} style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:10,color:T.textMut}}>•</span>
                            <input type="text" placeholder="ex., FVG 5m" value={rule.text} onChange={(e)=>updateRule(group.id,rule.id,e.target.value)} style={{flex:1,padding:"6px 10px",borderRadius:4,border:`1px solid ${T.border}`,fontSize:11,outline:"none"}}/>
                            {group.rules.length > 1 && <button onClick={()=>removeRule(group.id,rule.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:T.red}}>✕</button>}
                          </div>
                        ))}
                        <button onClick={()=>addRule(group.id)} style={{marginTop:4,fontSize:11,color:T.accent,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",padding:0}}>+ Ajouter une règle</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addGroup} style={{marginTop:12,fontSize:12,color:T.accent,background:"transparent",border:`1px dashed ${T.accent}`,cursor:"pointer",padding:"8px 12px",borderRadius:6,width:"100%"}}>+ Ajouter un groupe</button>
                </div>

                <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                  <button onClick={() => { setShowStrategyForm(false); setStrategyFormData(getDefaultStrategyFormData()); }} style={{padding:"10px 20px",borderRadius:6,border:`1px solid ${T.border}`,background:T.white,fontSize:12,fontWeight:600,cursor:"pointer"}}>Annuler</button>
                  <button onClick={handleCreateStrategyFromForm} style={{padding:"10px 20px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>✓ Créer une stratégie</button>
                </div>
              </div>
            </div>,
            document.body
          )}
          </div>
        </div>

        {/* RIGHT: INSTRUCTIONS */}
        <div style={{ display: "flex", flexDirection: "column", padding: "24px", paddingLeft: "32px", background: T.bg, borderLeft: `1px solid ${T.border}`, flex: 1, marginTop: "-16px", marginBottom: "-16px", paddingTop: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <img src={brokerInfo.iconPath} alt={brokerInfo.name} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: T.text }}>{brokerInfo.name}</h3>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", color: T.textMut, marginBottom: "8px", fontWeight: "600" }}>Types d'actifs supportés:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {brokerInfo.subtext.replace("Types d'actifs supportés: ", "").split(", ").map((asset, idx) => (
                <div key={idx} style={{ display: "inline-block", padding: "4px 10px", background: T.white, borderRadius: "6px", fontSize: "10px", color: T.textSub, fontWeight: "600", border: `1px solid ${T.border}` }}>
                  {asset}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", color: T.textMut, marginBottom: "12px", textTransform: "uppercase" }}>Comment exporter :</p>
            <ol style={{ padding: "0 0 0 16px", margin: 0, listStyleType: "decimal" }}>
              {brokerInfo.steps.map((step, idx) => (
                <li key={idx} style={{ fontSize: "11px", color: T.textSub, marginBottom: "8px", lineHeight: "1.3" }}>
                  {step.replace(/^\d+\. /, "")}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
  );
}

function CalendarPage({ trades = [], accountType = "live", evalAccountSize = "25k" }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState(new Date().getMonth());
  
  // Objetifs par taille de compte
  const evalObjectives = {
    "25k": 1500,
    "50k": 3000,
    "100k": 6000,
    "150k": 9000
  };
  
  const pnlByDate = {};
  const tradesByDate = {};
  
  trades.forEach(t => {
    if (!t.date) return;
    try {
      // Use same parsing as Dashboard - parse YYYY-MM-DD directly without UTC
      const dateStr = String(t.date).trim();
      const parts = dateStr.split('T')[0].split('-');
      
      if (parts.length === 3) {
        let tradeYear = parseInt(parts[0]);
        let tradeMonth = parseInt(parts[1]);
        let tradeDay = parseInt(parts[2]);
        
        // Create key directly from parts
        const key = `${tradeYear}-${String(tradeMonth).padStart(2, '0')}-${String(tradeDay).padStart(2, '0')}`;
        
        if (!pnlByDate[key]) pnlByDate[key] = 0;
        pnlByDate[key] += (t.pnl || 0);
        if (!tradesByDate[key]) tradesByDate[key] = [];
        tradesByDate[key].push(t);
      }
    } catch (e) {
      console.error('Date parse error:', t.date, e);
    }
  });

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const renderMonth = (monthIdx) => {
    const firstDay = new Date(year, monthIdx, 1).getDay();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const cells = [];

    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
      <div key={monthIdx} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,minWidth:320,cursor:"pointer"}} onClick={()=>{
        if (expandedMonth === monthIdx) {
          setExpandedMonth(null);
        } else {
          setExpandedMonth(monthIdx);
          window.scrollTo({top:0,behavior:"smooth"});
        }
      }}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:16,textAlign:"center",color:T.text}}>{months[monthIdx]}</div>
        
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
          {dayLabels.map(d=>(
            <div key={d} style={{fontSize:10,fontWeight:600,textAlign:"center",color:T.textMut,height:24,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {d}
            </div>
          ))}
          
          {cells.map((day,idx)=>{
            if (day === null) return <div key={`empty-${idx}`}/>;
            
            const dateStr = `${year}-${String(monthIdx + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const pnl = pnlByDate[dateStr] || 0;
            
            let bg = T.white;
            let textColor = T.textMut;
            
            if (pnl > 0) {
              bg = T.greenBg;
              textColor = T.green;
            } else if (pnl < 0) {
              bg = T.redBg;
              textColor = T.red;
            }
            
            return (
              <div key={day} style={{
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                justifyContent:"center",
                height:60,
                background:bg,
                borderRadius:8,
                cursor:"pointer",
                transition:"all .2s",
                border: pnl !== 0 ? `2px solid ${textColor}` : `1px solid ${T.border}`
              }}
              onMouseOver={(e)=>{e.currentTarget.style.transform="scale(1.05)"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.1)"}}
              onMouseOut={(e)=>{e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="none"}}>
                <div style={{fontSize:11,fontWeight:600,color:T.text}}>{day}</div>
                {pnl !== 0 && (
                  <div style={{fontSize:10,fontWeight:700,color:textColor,marginTop:2}}>
                    {pnl > 0 ? "+" : ""}{pnl.toFixed(0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthDetail = () => {
    if (expandedMonth === null) return null;

    const monthIdx = expandedMonth;
    const monthName = months[monthIdx];
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const monthStart = new Date(year, monthIdx, 1);

    const monthTrades = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (tradesByDate[dateStr]) {
        monthTrades.push(...tradesByDate[dateStr].map(t => ({...t, date: dateStr})));
      }
    }

    const monthPnL = monthTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    
    // P&L TOTAL du compte (tous les trades, pas juste le mois)
    const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);

    const dayStats = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayTrades = tradesByDate[dateStr] || [];
      const dayPnL = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      dayStats[d] = {
        day: d,
        pnl: dayPnL,
        trades: dayTrades.length
      };
    }

    const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const firstDay = monthStart.getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

    // Get previous month's days that precede the 1st
    const prevMonthDaysInMonth = new Date(year, monthIdx, 0).getDate();
    const prevMonthDays = [];
    for (let i = 1; i <= adjustedFirstDay; i++) {
      prevMonthDays.push(-(prevMonthDaysInMonth - adjustedFirstDay + i)); // Negative = previous month
    }

    const weeks = [];
    let currentWeek = [...prevMonthDays];
    
    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7 || d === daysInMonth) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return (
      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",marginBottom:24}}>
        
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:600,color:T.textMut}}>{monthName}</div>
            <div style={{fontSize:18,fontWeight:700,color:monthPnL>=0?T.green:T.red,marginTop:4}}>
              {monthPnL>=0?"+":""}${monthPnL.toFixed(2)}
            </div>
          </div>
          
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            {accountType === "eval" && (
              <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:160,alignItems:"flex-end"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:T.textMut,marginBottom:4}}>EVAL ${evalAccountSize.toUpperCase()}</div>
                  <div style={{fontSize:14,fontWeight:700,color:totalPnL >= evalObjectives[evalAccountSize] ? T.green : T.text}}>
                    ${totalPnL.toFixed(2)} / ${evalObjectives[evalAccountSize]}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,width:"100%"}}>
                  <div style={{flex:1,height:6,background:T.border,borderRadius:3,overflow:"hidden",minWidth:100}}>
                    <div style={{height:"100%",background:totalPnL >= evalObjectives[evalAccountSize] ? T.green : T.accent,width:`${Math.min(100, (totalPnL / evalObjectives[evalAccountSize]) * 100)}%`,transition:"width 0.3s"}}/>
                  </div>
                  <div style={{fontSize:11,color:T.textMut,minWidth:35,textAlign:"right"}}>{((totalPnL / evalObjectives[evalAccountSize]) * 100).toFixed(0)}%</div>
                </div>
              </div>
            )}
            <button onClick={()=>setExpandedMonth(null)} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:T.textMut,flexShrink:0}}>✕</button>
          </div>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${T.border}`}}>
                {dayLabels.map(day => (
                  <th key={day} style={{padding:"12px 8px",textAlign:"center",fontWeight:600,color:T.textMut,width:"12.5%"}}>
                    {day}
                  </th>
                ))}
                <th style={{padding:"12px 8px",textAlign:"center",fontWeight:600,color:T.textMut,width:"12.5%"}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIdx) => {
                const weekPnL = week.reduce((sum, d) => sum + (d && d > 0 && dayStats[d] ? dayStats[d].pnl : 0), 0);
                const weekTrades = week.reduce((sum, d) => sum + (d && d > 0 && dayStats[d] ? dayStats[d].trades : 0), 0);
                
                return (
                  <React.Fragment key={weekIdx}>
                    {/* Day Numbers and P&L */}
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      {week.map((day, dayIdx) => {
                        if (day === null) {
                          return <td key={`empty-${dayIdx}`} style={{padding:"8px",background:T.bg}}></td>;
                        }
                        
                        // Previous month days (negative values)
                        if (day < 0) {
                          const prevDay = Math.abs(day);
                          return (
                            <td key={`prev-${dayIdx}`} style={{padding:"12px 8px",background:T.white,border:`1px solid ${T.border}`,textAlign:"center",opacity:0.4}}>
                              <div style={{fontWeight:600,color:T.text,marginBottom:4}}>{String(prevDay).padStart(2, '0')}</div>
                              <div style={{color:T.textMut,fontWeight:600,fontSize:11}}>—</div>
                            </td>
                          );
                        }
                        
                        const stats = dayStats[day];
                        const pnl = stats.pnl;
                        let bg = T.white;
                        let textColor = T.textMut;
                        
                        if (pnl > 0) {
                          bg = "#D1FAE5";
                          textColor = T.green;
                        } else if (pnl < 0) {
                          bg = "#FEE2E2";
                          textColor = T.red;
                        }
                        
                        return (
                          <td key={day} style={{padding:"12px 8px",background:bg,border:`1px solid ${T.border}`,textAlign:"center"}}>
                            <div style={{fontWeight:600,color:T.text,marginBottom:4}}>{String(day).padStart(2, '0')}</div>
                            <div style={{color:textColor,fontWeight:600,fontSize:11}}>{pnl>=0?"+":""}${pnl.toFixed(0)}</div>
                          </td>
                        );
                      })}
                      <td style={{padding:"12px 8px",background:T.bg,border:`1px solid ${T.border}`,textAlign:"center",fontWeight:600}}>
                        <div style={{color:T.text}}>Week {weekIdx + 1}</div>
                        <div style={{color:weekPnL>=0?T.green:T.red,marginTop:2,fontSize:11}}>
                          {weekPnL>=0?"+":""}${weekPnL.toFixed(0)}
                          {accountType === "eval" && (
                            <> / ${evalObjectives[evalAccountSize]}</>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Trade Counts */}
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      {week.map((day, dayIdx) => {
                        if (day === null) {
                          return <td key={`trades-empty-${dayIdx}`} style={{padding:"8px",background:T.bg}}></td>;
                        }
                        
                        // Previous month days (negative values)
                        if (day < 0) {
                          return (
                            <td key={`trades-prev-${dayIdx}`} style={{padding:"8px",background:T.white,border:`1px solid ${T.border}`,textAlign:"center",color:T.textSub,fontSize:10,opacity:0.4}}>
                              —
                            </td>
                          );
                        }
                        
                        const trades = dayStats[day].trades;
                        return (
                          <td key={`trades-${day}`} style={{padding:"8px",background:T.white,border:`1px solid ${T.border}`,textAlign:"center",color:T.textSub,fontSize:10}}>
                            {trades} trades
                          </td>
                        );
                      })}
                      <td style={{padding:"8px",background:T.bg,border:`1px solid ${T.border}`,textAlign:"center",color:T.textSub,fontSize:10}}>
                        {weekTrades} trades
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}} className="anim-1">
      {renderMonthDetail()}

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={()=>setYear(year-1)} style={{padding:"6px 12px",borderRadius:8,background:T.bg,border:`1px solid ${T.border}`,fontSize:12,cursor:"pointer",color:T.text,fontWeight:600}}>← {year-1}</button>
          <div style={{fontSize:24,fontWeight:700,color:T.accent,minWidth:60,textAlign:"center"}}>{year}</div>
          <button onClick={()=>setYear(year+1)} style={{padding:"6px 12px",borderRadius:8,background:T.bg,border:`1px solid ${T.border}`,fontSize:12,cursor:"pointer",color:T.text,fontWeight:600}}>{year+1} →</button>
        </div>
      </div>

      {trades.length === 0 && (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:40,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:600,color:T.text,marginBottom:8}}>📥 Aucun trade importé</div>
          <p style={{color:T.textSub}}>Importez vos trades pour voir les statistiques par jour</p>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,background:T.bg,borderRadius:12}}>
        {[...Array(12)].map((_,i)=>renderMonth(i))}
      </div>

      <div style={{display:"flex",gap:24,fontSize:12,padding:16,background:T.white,borderRadius:12,border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:20,height:20,borderRadius:4,background:T.greenBg,border:`2px solid ${T.green}`}}/>
          <span style={{color:T.textSub}}>Profits positifs</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:20,height:20,borderRadius:4,background:T.redBg,border:`2px solid ${T.red}`}}/>
          <span style={{color:T.textSub}}>Pertes négatives</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:20,height:20,borderRadius:4,background:T.border}}/>
          <span style={{color:T.textSub}}>Pas de trades ({trades.length} trades au total)</span>
        </div>
      </div>
    </div>
  );
}

function DisciplinePage({ trades = [] }) {
  // ✅ Utiliser les hooks Supabase
  const { getDayDiscipline, setRuleCompleted, getDayScore, baseRules } = useDisciplineTracking();
  const { customRules, loading: rulesLoading, addRule, deleteRule } = useCustomDisciplineRules();
  
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [heatmapVersion, setHeatmapVersion] = useState(0);
  const [checkedRuleIds, setCheckedRuleIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tr4de_checked_rules") || "{}");
    } catch {
      return {};
    }
  });
  const [newManualRule, setNewManualRule] = useState("");
  const [ruleCategory, setRuleCategory] = useState("texte");
  const [ruleTime, setRuleTime] = useState("09:00");
  const [ruleAmount, setRuleAmount] = useState("");
  const [disciplineRules, setDisciplineRules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tr4de_discipline_rules_config") || "{}");
    } catch {
      return {};
    }
  });
  const [activeDays, setActiveDays] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tr4de_discipline_active_days") || "{}");
    } catch {
      return {};
    }
  });
  const heatmapScrollRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date();
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentMonth = monthNames[todayDate.getMonth()];
  const currentDay = todayDate.getDate();
  const dayLabelsShort = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // ✅ Récupérer les règles d'aujourd'hui depuis Supabase via le hook
  const todayRules = getDayDiscipline(today);
  const todayScore = getDayScore(today);
  
  // ✅ Charger les règles depuis Supabase (dépend de `today` pour éviter boucle infinie)
  React.useEffect(() => {
    console.log("📌 Chargement règles depuis Supabase pour:", today);
    const rules = getDayDiscipline(today);
    if (rules && rules.length > 0) {
      const rulesMap = {};
      rules.forEach(rule => {
        rulesMap[rule.id] = rule.completed;
        console.log(`   ${rule.id}: ${rule.completed ? '✅' : '❌'}`);
      });
      setCheckedRuleIds(rulesMap);
    }
  }, [today, getDayDiscipline]); // Dépend de `today`, pas de `todayRules`

  // Auto-update journal rule when daily notes change
  React.useEffect(() => {
    const handleStorageChange = () => {
      const currentDate = new Date().toISOString().split('T')[0];
      const dailyNotesData = JSON.parse(localStorage.getItem("tr4de_daily_notes") || "{}");
      const todayNote = dailyNotesData[currentDate];
      
      setCheckedRuleIds(prev => {
        const updated = { ...prev };
        if (todayNote && todayNote.trim().length > 0) {
          updated.journal = true;
        } else {
          // Don't auto-uncheck if note is removed - let user decide
          // This preserves manual override
        }
        return updated;
      });
    };

    // Listen for storage changes (when notes are saved from JournalPage)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case save happens in same tab
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (heatmapScrollRef.current) {
      const container = heatmapScrollRef.current;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Find all month labels and scroll to the current month
      const monthLabels = container.querySelectorAll('[data-month]');
      monthLabels.forEach((label) => {
        const monthIndex = parseInt(label.getAttribute('data-month'));
        if (monthIndex === currentMonth) {
          // Scroll this month into view
          setTimeout(() => {
            label.parentElement.scrollLeft = label.offsetLeft - 100;
          }, 0);
        }
      });
    }
  }, [heatmapVersion]);

  const toggleRule = (ruleId, currentAllRules) => {
    setCheckedRuleIds(prev => {
      const updated = { ...prev, [ruleId]: !prev[ruleId] };
      localStorage.setItem(`tr4de_checked_rules_${today}`, JSON.stringify(updated));
      
      // ✅ Sauvegarder dans Supabase via le hook
      const newStatus = !prev[ruleId];
      setRuleCompleted(today, ruleId, newStatus).catch(err => {
        console.error("❌ Erreur sauvegarde discipline Supabase:", err);
      });
      
      return updated;
    });
    setHeatmapVersion(v => v + 1);
  };

  const ruleDescriptions = {
    premarket: "Effectuer votre routine matinale avant l'ouverture du marché pour une meilleure préparation",
    biais: "Identifier et trader selon le biais dominant du marché du jour",
    news: "Consulter les actualités importantes et identifier les niveaux clés du marché",
    followall: "Vérifier que toutes les règles de discipline ont été respectées durant la session",
    journal: "Consigner votre analyse et vos apprentissages après la fermeture du marché"
  };

  const allRules = [
    { id: "premarket", label: "Pre Market Routine", uuid: null },
    { id: "biais", label: "Biais Journalier", uuid: null },
    { id: "news", label: "News et Key Levels", uuid: null },
    { id: "followall", label: "Followed All Rules", uuid: null },
    { id: "journal", label: "Journal d'après session", uuid: null },
    ...customRules.map(r => ({ id: r.rule_id, label: r.text, uuid: r.id })),
  ].map(r => ({ ...r, status: checkedRuleIds[r.id] || false }));

  const completedCount = allRules.filter(r => r.status).length;
  const completeProgress = (completedCount / Math.max(allRules.length, 1)) * 100;
  const currentDate = new Date();

  const saveDisciplineRules = () => {
    localStorage.setItem("tr4de_discipline_rules_config", JSON.stringify(disciplineRules));
    localStorage.setItem("tr4de_discipline_active_days", JSON.stringify(activeDays));
    setShowRulesModal(false);
  };

  const addManualRule = async () => {
    if (ruleCategory === "texte" && !newManualRule.trim()) return;
    if (ruleCategory === "horaire" && !ruleTime) return;
    if (ruleCategory === "argent" && !ruleAmount.trim()) return;
    
    try {
      let displayText = "";
      if (ruleCategory === "texte") {
        displayText = newManualRule;
      } else if (ruleCategory === "horaire") {
        displayText = `Horaire: ${ruleTime}`;
      } else if (ruleCategory === "argent") {
        displayText = `Argent: $${ruleAmount}`;
      }
      
      // Sauvegarder dans Supabase via le hook
      await addRule(ruleCategory, displayText, ruleTime, ruleAmount);
    } catch (err) {
      console.error("❌ Erreur ajout règle:", err);
    }
    
    // Reset form
    setNewManualRule("");
    setRuleTime("09:00");
    setRuleAmount("");
    setRuleCategory("texte");
    setShowRuleForm(false);
  };

  const removeManualRule = async (id) => {
    try {
      await deleteRule(id);
    } catch (err) {
      console.error("❌ Erreur suppression règle:", err);
    }
  };

  const toggleActiveDay = (ruleId, dayIdx) => {
    setActiveDays(prev => ({
      ...prev,
      [ruleId]: prev[ruleId].map((day, idx) => idx === dayIdx ? !day : day)
    }));
  };

  return (
    <>
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
        {/* TOP SECTION - 4 COLUMNS */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:12}}>
          {/* DATE */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between",height:"100%"}}>
            <div style={{fontSize:12,color:T.textMut,fontWeight:600}}>Today's progress</div>
            <div style={{display:"flex",justifyContent:"flex-start",alignItems:"flex-end",gap:12}}>
              <div style={{display:"flex",gap:4,flex:1}}>
                <div style={{fontSize:32,fontWeight:700,color:T.text}}>{currentMonth}</div>
                <div style={{fontSize:28,fontWeight:700,color:T.text}}>{currentDay}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,flex:1,justifyContent:"flex-end"}}>
                <svg width="70" height="70" style={{transform:"rotate(-90deg)"}}>
                  {/* Background circle */}
                  <circle cx="35" cy="35" r="30" fill="none" stroke={T.bg} strokeWidth="4"/>
                  {/* Progress circle */}
                  <circle 
                    cx="35" 
                    cy="35" 
                    r="30" 
                    fill="none" 
                    stroke={T.accent} 
                    strokeWidth="4"
                    strokeDasharray={`${30 * 2 * Math.PI}`}
                    strokeDashoffset={`${30 * 2 * Math.PI * (1 - completeProgress / 100)}`}
                    strokeLinecap="round"
                    style={{transition:"stroke-dashoffset 0.3s"}}
                  />
                  {/* Center text */}
                  <text 
                    x="35" 
                    y="40" 
                    textAnchor="middle" 
                    fontSize="18" 
                    fontWeight="700" 
                    fill={T.text}
                    style={{transform:"rotate(90deg)",transformOrigin:"35px 35px"}}
                  >
                    {Math.round(completeProgress)}%
                  </text>
                </svg>
                <div style={{fontSize:10,fontWeight:500,color:T.textMut}}>{completedCount} des {allRules.length} règles</div>
              </div>
            </div>
          </div>

          {/* TROUVER LE BIAS JOURNALIER */}
          <div style={{background:"linear-gradient(135deg, #F0F9FF 0%, #F9FAFB 100%)",border:`2px solid #93C5FD`,borderRadius:12,padding:16,borderLeft:`4px solid #3B82F6`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{fontSize:16,fontWeight:700,color:"#1E40AF"}}>📊</div>
              <div style={{fontSize:12,fontWeight:700,color:"#1E40AF",textTransform:"uppercase",letterSpacing:"0.5px"}}>Bias Journalier</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#3B82F6",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#1E3A8A",fontWeight:500,lineHeight:1.4}}>Identifier le balayage de liquidité (HTF Liquidity Sweep)</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#3B82F6",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#1E3A8A",fontWeight:500,lineHeight:1.4}}>Définir l'objectif de prix (Draw on Liquidity)</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#3B82F6",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#1E3A8A",fontWeight:500,lineHeight:1.4}}>Vérifier les respects/discrédits (FVG/OB)</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#3B82F6",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#1E3A8A",fontWeight:500,lineHeight:1.4}}>Comparer les divergences SMT (Corrélation d'actifs)</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#3B82F6",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#1E3A8A",fontWeight:500,lineHeight:1.4}}>Appliquer les profils de session (Asie/Londres/New York)</div>
              </div>
            </div>
          </div>

          {/* REGLES A SUIVRE */}
          <div style={{background:"linear-gradient(135deg, #F0FDF4 0%, #FAFBF9 100%)",border:`2px solid #BBF7D0`,borderRadius:12,padding:16,borderLeft:`4px solid #16A34A`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{fontSize:16,fontWeight:700,color:"#15803D"}}>✓</div>
              <div style={{fontSize:12,fontWeight:700,color:"#15803D",textTransform:"uppercase",letterSpacing:"0.5px"}}>Règles à suivre</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#16A34A",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#3F6212",fontWeight:500,lineHeight:1.4}}>Ne pas bouger son SL en BE</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#16A34A",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#3F6212",fontWeight:500,lineHeight:1.4}}>Bien attendre le iFVG</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#16A34A",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#3F6212",fontWeight:500,lineHeight:1.4}}>Être attentif sur le marché</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,background:"#16A34A",borderRadius:"50%",marginTop:6,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#3F6212",fontWeight:500,lineHeight:1.4}}>Ne pas hésiter</div>
              </div>
            </div>
          </div>

          {/* ERREURS A EVITER */}
          <div style={{background:"linear-gradient(135deg, #FEF2F2 0%, #FEF9F9 100%)",border:`2px solid #FECACA`,borderRadius:12,padding:16,borderLeft:`4px solid #EF4444`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{fontSize:16,fontWeight:700,color:"#DC2626"}}>⚠</div>
              <div style={{fontSize:12,fontWeight:700,color:"#DC2626",textTransform:"uppercase",letterSpacing:"0.5px"}}>Erreurs à éviter</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:6,height:6,background:"#EF4444",borderRadius:"50%",marginTop:5,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#7F1D1D",fontWeight:500,lineHeight:1.5}}>FVG au-dessus du SL (sauf si trend forte)</div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:6,height:6,background:"#EF4444",borderRadius:"50%",marginTop:5,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#7F1D1D",fontWeight:500,lineHeight:1.5}}>Zone de liquidité juste au-dessus du SL ( range, plus hauts ect…. )</div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:6,height:6,background:"#EF4444",borderRadius:"50%",marginTop:5,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#7F1D1D",fontWeight:500,lineHeight:1.5}}>Si la majeur sellside a été prise, ne pas prendre le premier setup, attendre un meilleur retracement</div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:6,height:6,background:"#EF4444",borderRadius:"50%",marginTop:5,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#7F1D1D",fontWeight:500,lineHeight:1.5}}>Rentrer sans confirmation</div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION - 2 COLUMNS */}
        <div style={{display:"grid",gridTemplateColumns:"0.8fr 2.2fr",gap:12}}>
          {/* DAILY CHECKLIST */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12}}>
            <div style={{padding:16,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.text}}>Liste quotidienne</div>
                <div style={{fontSize:11,color:T.textMut}}>{currentDay} {currentMonth.toLowerCase()}.</div>
              </div>
              <div style={{fontSize:11,color:T.textMut,background:T.bg,padding:"4px 8px",borderRadius:4}}>{completedCount}/{allRules.length}</div>
            </div>
            <div style={{maxHeight:"none",overflowY:"visible",paddingTop:8}}>
              {allRules.map(rule => (
                <div 
                  key={rule.id} 
                  onClick={() => toggleRule(rule.id, allRules)}
                  style={{
                    padding:"12px 16px",
                    display:"flex",
                    alignItems:"center",
                    gap:12,
                    background:rule.status?T.bg:"transparent",
                    cursor:"pointer",
                    transition:"background 0.15s"
                  }}
                >
                  <div style={{
                    width:18,
                    height:18,
                    borderRadius:3,
                    background:rule.status?T.green:"transparent",
                    border:`2px solid ${rule.status?T.green:T.border2}`,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    color:"white",
                    fontSize:12,
                    fontWeight:600,
                    flexShrink:0,
                    transition:"all 0.15s"
                  }}>
                    {rule.status ? "✓" : ""}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:rule.status?T.textMut:T.text,textDecoration:rule.status?"line-through":"none"}}>{rule.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HEATMAP CALENDAR - DISCIPLINE TRACKER */}
          <div key={heatmapVersion} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:28,minWidth:0,overflow:"hidden"}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text}}>Progress Tracker</div>
              <div style={{fontSize:12,fontWeight:600,color:T.accent,marginTop:4}}>{Object.values(checkedRuleIds).filter(v => v === true).length}/{allRules.length}</div>
              
              {(() => {
                // Calculer la streak de jours consécutifs
                let streak = 0;
                const cursor = new Date();
                while (true) {
                  const dateStr = cursor.toISOString().split('T')[0];
                  const checkedRulesData = localStorage.getItem(`tr4de_checked_rules_${dateStr}`);
                  if (checkedRulesData) {
                    const checked = JSON.parse(checkedRulesData);
                    const hasAnyRule = Object.values(checked).some(v => v === true);
                    if (hasAnyRule) {
                      streak++;
                      cursor.setDate(cursor.getDate() - 1);
                    } else {
                      break;
                    }
                  } else {
                    break;
                  }
                }
                
                return (
                  <div style={{fontSize:12,color:T.textSub,marginTop:6}}>
                    {streak >= 2 ? `${streak} jours de suite` : 'Pas de streak active'}
                  </div>
                );
              })()}
            </div>
            
            <div ref={heatmapScrollRef} style={{overflowX:"auto",paddingBottom:12,cursor:"grab"}}>
              <div style={{minWidth:"max-content"}}>
              {(() => {
                const frMonths = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
                const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                const today = new Date();
                
                // Find the earliest trade date, fallback to Jan 1st of current year
                const earliestTrade = trades && trades.length > 0
                  ? trades.reduce((min, t) => {
                      const d = new Date(t.date || t.open_time || t.closeTime || t.created_at);
                      return d < min ? d : min;
                    }, new Date())
                  : new Date(today.getFullYear(), 0, 1);
                
                const startDate = new Date(earliestTrade.getFullYear(), earliestTrade.getMonth(), 1);
                const endDate = new Date(today.getFullYear(), 11, 31); // End of current year
                
                // Build months array from startDate to endDate
                const monthCount = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
                const months = Array.from({length: monthCount}, (_, i) => frMonths[(startDate.getMonth() + i) % 12]);
                
                /**
                 * Moteur de Couleur - Calcule la couleur basée sur la discipline
                 * Logique - 5 paliers:
                 * - Si pas de trading: Gris Clair
                 * - 1-20%: Vert Très Pâle
                 * - 21-40%: Vert Pâle
                 * - 41-60%: Vert Moyen
                 * - 61-80%: Vert Clair
                 * - 81-100%: Vert Vif
                 */
                const getColorByDiscipline = (percentage) => {
                  if (percentage === 0) return null; // Pas de couleur = gris clair
                  if (percentage <= 20) return '#F0FDF4'; // Vert très très pâle (1-20%)
                  if (percentage <= 40) return '#DCFCE7'; // Vert très pâle (21-40%)
                  if (percentage <= 60) return '#86EFAC'; // Vert moyen (41-60%)
                  if (percentage <= 80) return '#22C55E'; // Vert clair (61-80%)
                  return '#16A34A'; // Vert vif (81-100%)
                };
                
                // Function to get daily completion data by reading checked rules for that day
                const getDailyData = (dateStr) => {
                  try {
                    const checkedRulesData = localStorage.getItem(`tr4de_checked_rules_${dateStr}`);
                    if (checkedRulesData) {
                      const checked = JSON.parse(checkedRulesData);
                      const checkedCount = Object.values(checked).filter(v => v === true).length;
                      const totalRules = 5 + customRules.length; // 5 base rules (premarket, biais, news, followall, journal) + manual rules
                      const percentage = Math.round((checkedCount / Math.max(totalRules, 1)) * 100);
                      return { 
                        percentage, 
                        hadTrading: true, 
                        rulesRespected: checkedCount, 
                        totalRules 
                      };
                    }
                  } catch (e) {}
                  return { percentage: 0, hadTrading: false, rulesRespected: 0, totalRules: 0 };
                };
                
                // Build all weeks across all months
                const allWeeks = [];
                
                // Build calendar continuously across all 6 months
                // (endDate already defined above as Dec 31)
                
                // Find the Monday of the week containing startDate
                const calStart = new Date(startDate);
                const dow = calStart.getDay();
                const offsetToMonday = dow === 0 ? -6 : 1 - dow;
                calStart.setDate(calStart.getDate() + offsetToMonday);
                
                // Find the Sunday of the week containing endDate
                const calEnd = new Date(endDate);
                const dowEnd = calEnd.getDay();
                const offsetToSunday = dowEnd === 0 ? 0 : 7 - dowEnd;
                calEnd.setDate(calEnd.getDate() + offsetToSunday);
                
                let currentWeek = [];
                const cursor = new Date(calStart);
                
                while (cursor <= calEnd) {
                  const dayOfWeek = cursor.getDay();
                  const adjustedDow = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Mon
                  
                  if (adjustedDow === 0) {
                    currentWeek = new Array(7).fill(null);
                  }
                  
                  const inRange = cursor >= startDate && cursor <= endDate;
                  if (inRange) {
                    const dateStr = cursor.toISOString().split('T')[0];
                    const dailyData = getDailyData(dateStr);
                    const color = getColorByDiscipline(dailyData.percentage);
                    currentWeek[adjustedDow] = { dateStr, ...dailyData, color };
                  }
                  
                  if (adjustedDow === 6) {
                    allWeeks.push(currentWeek);
                  }
                  
                  cursor.setDate(cursor.getDate() + 1);
                }
                
                // Close last week if needed
                if (currentWeek.length > 0 && currentWeek.some(d => d !== null)) {
                  allWeeks.push(currentWeek);
                }
                
                // Calculate month positions AFTER building allWeeks (precise alignment)
                const monthPositions = months.map((monthName, mi) => {
                  const targetMonth = (startDate.getMonth() + mi) % 12;
                  const targetYear = startDate.getFullYear() + Math.floor((startDate.getMonth() + mi) / 12);
                  let firstWeek = -1, lastWeek = -1;
                  allWeeks.forEach((week, wi) => {
                    const hasDay = week.some(d => {
                      if (!d) return false;
                      const date = new Date(d.dateStr);
                      return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
                    });
                    if (hasDay) { if (firstWeek === -1) firstWeek = wi; lastWeek = wi; }
                  });
                  return { name: monthName, start: firstWeek, end: lastWeek + 1, monthIndex: targetMonth };
                }).filter(p => p.start !== -1);
                
                return (
                  <div style={{display:"flex"}}>
                    {/* Days of week labels */}
                    <div style={{display:"flex",flexDirection:"column",marginRight:12}}>
                      <div style={{height:24,fontSize:10,fontWeight:400,color:T.textMut,marginBottom:0}}></div>
                      {dayLabels.map(day => (
                        <div 
                          key={day}
                          style={{
                            height:28,
                            marginBottom:3,
                            display:"flex",
                            alignItems:"center",
                            fontSize:12,
                            fontWeight:400,
                            color:T.textMut,
                            width:40
                          }}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar grid */}
                    <div>
                      {/* Month labels */}
                      <div style={{display:"flex",gap:0,marginBottom:8}}>
                        {monthPositions.map((pos, idx) => {
                          const weeksCount = pos.end - pos.start;
                          return (
                            <div
                              key={`month-label-${idx}`}
                              data-month={pos.monthIndex}
                              style={{
                                fontSize:11,
                                fontWeight:400,
                                color:T.textMut,
                                display:"flex",
                                gap:0,
                                width:(weeksCount * 31),
                                alignItems:"center",
                                justifyContent:"center"
                              }}
                            >
                              {pos.name}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Heatmap grid */}
                      <div>
                        {dayLabels.map((dayLabel, dayIdx) => (
                          <div key={`row-${dayIdx}`} style={{display:"flex",gap:3,marginBottom:3}}>
                            {allWeeks.map((week, weekIdx) => {
                              const day = week[dayIdx];
                              if (!day) {
                                return (
                                  <div
                                    key={`empty-${weekIdx}`}
                                    style={{
                                      width:28,
                                      height:28,
                                      background:"transparent",
                                      borderRadius:4,
                                      flexShrink:0
                                    }}
                                  />
                                );
                              }
                              
                              return (
                                <div
                                  key={`${weekIdx}-${dayIdx}`}
                                  onClick={() => {
                                    // TODO: Open daily checklist for this date
                                    console.log('Clicked:', day.dateStr, 'Discipline:', day.percentage + '%');
                                  }}
                                  style={{
                                    width:28,
                                    height:28,
                                    background: day.color || '#F1F5F9',
                                    borderRadius:4,
                                    cursor:"pointer",
                                    flexShrink:0,
                                    transition:"all 0.2s",
                                    border: 'none',
                                    opacity: 1
                                  }}
                                  title={`${day.dateStr}: ${day.percentage}% discipline (${day.rulesRespected}/${day.totalRules} rules)`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>

            {/* Legend */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:20,fontSize:11,color:T.textMut}}>
              <span>Moins</span>
              {[
                '#F0FDF4',
                '#DCFCE7',
                '#86EFAC',
                '#22C55E',
                '#16A34A'
              ].map((color, i) => (
                <div
                  key={i}
                  style={{
                    width:16,
                    height:16,
                    background:color,
                    borderRadius:2,
                    border:'none'
                  }}
                />
              ))}
              <span>Plus</span>
            </div>
          </div>
        </div>

        {/* RULES TABLE */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}>
              <thead>
                <tr style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Rule</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Type</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Condition</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Streak</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Performance moy.</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Follow Rate</th>
                </tr>
              </thead>
              <tbody>
                {allRules.map((rule, i) => {
                  const ruleData = {
                    "journal": { type: "Auto", condition: disciplineRules.journalTime, ruleKey: "journal" },
                    "strategy": { type: "Auto", condition: "—", ruleKey: "strategy" },
                    "stoploss": { type: "Auto", condition: "—", ruleKey: "stoploss" },
                    "maxLossPerTrade": { type: "Auto", condition: `$${disciplineRules.maxLossPerTrade}`, ruleKey: "maxLossPerTrade" },
                    "maxLossPerDay": { type: "Auto", condition: `$${disciplineRules.maxLossPerDay}`, ruleKey: "maxLossPerDay" },
                  };
                  
                  const data = ruleData[rule.id];
                  const days = data ? activeDays[data.ruleKey] : [true,true,true,true,true,true,false];
                  
                  return (
                    <tr key={rule.id} onClick={() => setShowRulesModal(true)} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.white:T.bg,cursor:"pointer",transition:"background 0.2s"}} onMouseEnter={(e) => e.currentTarget.style.background = T.accentBg} onMouseLeave={(e) => e.currentTarget.style.background = (i%2===0?T.white:T.bg)}>
                      <td style={{padding:"10px 12px",fontSize:12,color:rule.status?T.green:T.text,fontWeight:500}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:rule.status?T.green:"#D1D5DB"}}/>
                          {rule.label}
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",fontSize:11}}>
                        <span style={{background:data?.type==="Auto"?T.accentBg:T.bg,color:data?.type==="Auto"?T.accent:T.text,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600}}>
                          {data?.type||"Manual"}
                        </span>
                      </td>
                      <td style={{padding:"10px 12px",fontSize:12,color:T.textMut}}>{data?.condition||"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12,textAlign:"center",fontWeight:600,color:T.text}}>0</td>
                      <td style={{padding:"10px 12px",fontSize:12,textAlign:"center",color:T.textMut}}>—</td>
                      <td style={{padding:"10px 12px",fontSize:12,textAlign:"center",fontWeight:600,color:rule.status?T.green:T.red}}>
                        {rule.status ? "100%" : "0%"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:12,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,color:T.textSub}}>{allRules.length} rules</div>
            <button
              onClick={() => setShowRulesModal(true)}
              style={{
                padding:"6px 12px",
                background:T.bg,
                border:`1px solid ${T.border}`,
                color:T.text,
                borderRadius:6,
                fontSize:11,
                fontWeight:600,
                cursor:"pointer"
              }}
            >
              ✏️ Edit rules
            </button>
          </div>
        </div>
      </div>

      {/* MODAL MODIFIER REGLES */}
      {showRulesModal && (
        <div onClick={() => setShowRulesModal(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div onClick={(e) => e.stopPropagation()} style={{background:T.white,borderRadius:12,paddingTop:40,paddingRight:40,paddingBottom:40,paddingLeft:40,maxWidth:450,width:"90%",maxHeight:"90vh",overflowY:"auto"}}>
            <button 
              onClick={() => setShowRulesModal(false)}
              style={{float:"right",background:"none",border:"none",fontSize:20,cursor:"pointer",color:T.textMut,marginBottom:12}}
            >
              ✕
            </button>

            {/* AUTOMATED RULES WITH ACTIVE DAYS */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Règles journalières</div>

              {allRules.filter(r => ["premarket", "biais", "news", "followall", "journal"].includes(r.id)).map(rule => (
                <div key={rule.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`,marginBottom:12}}>
                  <input 
                    type="checkbox"
                    checked={checkedRuleIds[rule.id] || false}
                    onChange={() => toggleRule(rule.id, allRules)}
                    style={{marginTop:4,width:18,height:18,cursor:"pointer"}}
                  />
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:4}}>{rule.label}</div>
                    <div style={{fontSize:11,color:T.textSub,marginBottom:8}}>{ruleDescriptions[rule.id]}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* MANUAL RULES */}
            {customRules.length > 0 && (
              <div style={{marginBottom:24}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Règles personnalisées</div>
                {allRules.filter(r => !["premarket", "biais", "news", "followall", "journal"].includes(r.id)).map(rule => (
                  <div key={rule.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`,marginBottom:12}}>
                    <input 
                      type="checkbox"
                      checked={checkedRuleIds[rule.id] || false}
                      onChange={() => toggleRule(rule.id, allRules)}
                      style={{marginTop:4,width:18,height:18,cursor:"pointer"}}
                    />
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:4}}>{rule.label}</div>
                      <button
                        onClick={() => removeManualRule(rule.uuid || rule.id)}
                        style={{fontSize:11,color:T.accent,background:"none",border:"none",cursor:"pointer",padding:0,marginTop:4}}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ADD NEW RULE */}
            <div style={{marginBottom:24,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <input
                  type="text"
                  placeholder="Ajouter une règle..."
                  value={newManualRule}
                  onChange={(e) => setNewManualRule(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      if (newManualRule.trim()) {
                        addManualRule();
                      }
                    }
                  }}
                  style={{flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,background:T.bg,color:T.text}}
                />
                <button
                  onClick={() => {
                    if (newManualRule.trim()) {
                      addManualRule();
                    }
                  }}
                  style={{padding:"8px 16px",background:"#1F2937",color:"white",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* BUTTONS */}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button
                onClick={() => setShowRulesModal(false)}
                style={{
                  padding:"10px 20px",
                  background:"#1F2937",
                  color:"white",
                  border:"none",
                  borderRadius:6,
                  fontSize:12,
                  fontWeight:600,
                  cursor:"pointer"
                }}
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [accountType, setAccountType] = useState(() => {
    try {
      const saved = localStorage.getItem('accountType');
      return saved ? saved : "live";
    } catch (e) {
      return "live";
    }
  });
  const [selectedEvalAccount, setSelectedEvalAccount] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedEvalAccount');
      return saved ? saved : "25k";
    } catch (e) {
      return "25k";
    }
  });
  const [page, setPage] = useState("dashboard");
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  // ✅ Utiliser les hooks pour Trades et Stratégies (auto-stockés dans Supabase)
  const { trades, addTrade, updateTrade, deleteTrade } = useTrades();
  const { strategies, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const [userId, setUserId] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIdHeader, setSelectedAccountIdHeader] = useState(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedAccountIds');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [previousSelectedAccountIds, setPreviousSelectedAccountIds] = useState([]);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // Construire l'objet affichage utilisateur à partir de l'utilisateur authentifié
  const displayUser = {
    name: user?.email?.split('@')[0] || "Trader",
    email: user?.email || "trader@apextrader.com",
    initials: (user?.email?.split('@')[0] || "TR").substring(0, 2).toUpperCase()
  };

  // Sauvegarder la sélection de comptes dans localStorage
  useEffect(() => {
    localStorage.setItem('selectedAccountIds', JSON.stringify(selectedAccountIds));
    console.log("💾 Saved selectedAccountIds to localStorage:", selectedAccountIds);
  }, [selectedAccountIds]);

  // ✅ Initialiser avec le compte placeholder si aucun compte n'est sélectionné
  useEffect(() => {
    if (user?.id && selectedAccountIds.length === 0) {
      const placeholderId = getPlaceholderAccountId(user.id);
      setSelectedAccountIds([placeholderId]);
      console.log("🪐 Initialized with placeholder account:", placeholderId);
    }
  }, [user?.id]);

  // ✅ Nettoyer le placeholder quand un vrai compte est sélectionné
  useEffect(() => {
    if (user?.id && selectedAccountIds.length > 0) {
      const placeholderId = getPlaceholderAccountId(user.id);
      const hasPlaceholder = selectedAccountIds.includes(placeholderId);
      const hasRealAccounts = selectedAccountIds.some(id => !isPlaceholderAccount(id));
      
      // Si on a à la fois le placeholder et des vrais comptes, retirer le placeholder
      if (hasPlaceholder && hasRealAccounts) {
        const cleaned = selectedAccountIds.filter(id => !isPlaceholderAccount(id));
        setSelectedAccountIds(cleaned);
        console.log("🧹 Removed placeholder account, keeping real accounts:", cleaned);
      }
    }
  }, [selectedAccountIds, user?.id]);

  // Sauvegarder le type de compte dans localStorage
  useEffect(() => {
    localStorage.setItem('accountType', accountType);
  }, [accountType]);

  // Sauvegarder la taille du compte Eval dans localStorage
  useEffect(() => {
    localStorage.setItem('selectedEvalAccount', selectedEvalAccount);
  }, [selectedEvalAccount]);

  // ✅ Les stratégies sont auto-sauvegardées via le hook useStrategies()

  // Mettre à jour accountType et selectedEvalAccount en fonction du compte sélectionné
  useEffect(() => {
    if (selectedAccountIds.length === 1 && accounts.length > 0) {
      const selectedAccountId = selectedAccountIds[0];
      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
      if (selectedAccount) {
        // Si le compte a des infos de type, les utiliser
        if (selectedAccount.account_type) {
          setAccountType(selectedAccount.account_type);
        }
        if (selectedAccount.eval_account_size && selectedAccount.account_type === "eval") {
          setSelectedEvalAccount(selectedAccount.eval_account_size);
        }
      }
    }
  }, [selectedAccountIds, accounts]);

  // Récupérer l'utilisateur Supabase
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error) {
          console.warn("Not authenticated:", error.message);
          setUserId(null);
        } else if (authUser) {
          setUserId(authUser.id);
        } else {
          console.warn("No authenticated user");
          setUserId(null);
        }
      } catch (err) {
        console.error("Error getting user:", err);
        setUserId(null);
      } finally {
        setLoadingUser(false);
      }
    };

    getUser();
  }, [supabase]);

  // Charger les comptes au démarrage
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const supabase = createClient();
        const userId = user?.id;
        
        const { data, error } = await supabase
          .from("trading_accounts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading accounts:", error);
          setAccounts([]);
          return;
        }

        const loadedAccounts = data || [];
        setAccounts(loadedAccounts);
        
        // ✅ FIX: If no accounts are selected, auto-select all loaded accounts
        // Check localStorage to see if any accounts were previously selected
        try {
          const savedSelection = localStorage.getItem('selectedAccountIds');
          const currentSelection = savedSelection ? JSON.parse(savedSelection) : [];
          
          if (currentSelection.length === 0 && loadedAccounts.length > 0) {
            const allAccountIds = loadedAccounts.map(acc => acc.id);
            setSelectedAccountIds(allAccountIds);
            localStorage.setItem('selectedAccountIds', JSON.stringify(allAccountIds));
            console.log("✅ Auto-selected all accounts:", allAccountIds);
          }
        } catch (e) {
          console.error("Error auto-selecting accounts:", e);
        }
      } catch (err) {
        console.error("Error loading accounts:", err);
        setAccounts([]);
      }
    };

    if (user?.id) {
      loadAccounts();
    }
  }, [user?.id]);

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    try {
      console.log("🔓 Déconnexion...");
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // ⏳ Attendre 500ms pour s'assurer que la session est complètement effacée
      // et que les listeners d'auth ont le temps de se mettre à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Nettoyer localStorage
      localStorage.clear();
      
      // 🚀 Rediriger vers la page d'accueil (qui redirigera vers /login)
      console.log("✅ Déconnexion réussie, redirection vers login...");
      window.location.href = '/login';
    } catch (err) {
      console.error("❌ Erreur lors de la déconnexion:", err);
      // En cas d'erreur, forcer la redirection vers login
      window.location.href = '/login';
    }
  };

  // ✅ Vérifier l'authentification et rediriger si nécessaire
  // ATTENDRE que l'authentification soit complètement chargée avant de rediriger
  useEffect(() => {
    if (authLoading) {
      // Authentification en cours de chargement, ne rien faire
      console.log("⏳ Authentification en cours de chargement...");
      return;
    }

    // Authentification terminée, vérifier si l'utilisateur existe
    if (!user) {
      console.log("🚫 Utilisateur non authentifié, redirection vers connexion...");
      window.location.href = '/login';
    }
  }, [authLoading, user]);

  // ✅ Filtrer les comptes visibles (exclure le placeholder)
  const visibleAccounts = accounts.filter(acc => !isPlaceholderAccount(acc.id));

  // ✅ Filtrer les trades par compte sélectionné
  // Si SEUL le placeholder est sélectionné → aucun trade
  // Sinon → filtrer par account_id
  const filteredTrades = (() => {
    const onlyPlaceholder = selectedAccountIds.length === 1 && 
                           user?.id && 
                           selectedAccountIds[0] === getPlaceholderAccountId(user.id);
    
    if (onlyPlaceholder) {
      console.log("🪐 Only placeholder selected - showing no trades");
      return [];
    }
    
    if (selectedAccountIds.length === 0) {
      console.log("❌ No accounts selected - showing no trades");
      return [];
    }
    
    const filtered = trades.filter(t => selectedAccountIds.includes(t.account_id));
    console.log(`📊 Filtering ${trades.length} trades by ${selectedAccountIds.length} account(s), got ${filtered.length}`);
    return filtered;
  })();

  // ✅ DEBUG: Log when account selection changes
  React.useEffect(() => {
    console.log("📊 DEBUG - Account Selection State:");
    console.log("   accounts:", accounts.map(a => ({ id: a.id, name: a.name })));
    console.log("   selectedAccountIds:", selectedAccountIds);
    console.log("   trades.length:", trades.length);
    console.log("   filteredTrades.length:", filteredTrades.length);
    console.log("   First trade structure:", trades[0]);
    console.log("   Trades with account_id:", trades.filter(t => t.account_id).length);
    console.log("   Filter logic: if selectedAccountIds.length (" + selectedAccountIds.length + ") > 0, filter by account, else show none");
  }, [selectedAccountIds, trades, accounts, filteredTrades]);

  const handleImport = async (data) => {
    const { trades: newTrades } = data;
    // ✅ Ajouter les nouveaux trades directement à Supabase via le hook
    for (const newTrade of newTrades) {
      const exists = trades.some(t => t.date === newTrade.date && t.symbol === newTrade.symbol && t.entry === newTrade.entry);
      if (!exists) {
        await addTrade(newTrade);
      }
    }
  };

  const handleClearTrades = async () => {
    try {
      // ✅ Supprimer tous les trades filtrés via la fonction du hook
      for (const trade of filteredTrades) {
        await deleteTrade(trade.id);
      }
    } catch (err) {
      console.error("Error deleting trades:", err);
    }
  };

  const handleDeleteTrade = async (trade) => {
    if (!trade || !trade.id) {
      console.warn("❌ Trade invalid ou sans ID:", trade);
      return;
    }
    // ✅ Supprimer le trade directement via le hook
    await deleteTrade(trade.id);
  };

  const handleDeleteAccount = async (accountId) => {
    if (!accountId) {
      return;
    }

    const accountToDelete = accounts.find(acc => acc.id === accountId);
    if (!accountToDelete) return;

    try {
      const supabase = createClient();
      const userId = user?.id;

      // Supprimer les trades associés au compte
      const { error: tradesError } = await supabase
        .from("apex_trades")
        .delete()
        .eq("account_id", accountId)
        .eq("user_id", userId);

      if (tradesError) {
        console.error("Error deleting trades:", tradesError);
        return;
      }

      // Supprimer le compte
      const { error: accountError } = await supabase
        .from("trading_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", userId);

      if (accountError) {
        console.error("Error deleting account:", accountError);
        return;
      }

      // Retirer le compte de la sélection
      setSelectedAccountIds(prev => prev.filter(id => id !== accountId));

      // Réinitialiser la sélection d'en-tête si c'était celui-ci
      if (selectedAccountIdHeader === accountId) {
        setSelectedAccountIdHeader("");
      }

      // Recharger les comptes
      const { data: updatedAccounts } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setAccounts(updatedAccounts || []);
      // ✅ Les trades seront auto-reloadés via le hook useTrades
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const NAV = [
    { id:"add-trade",     icon:"📂", label:"Ajouter des Trades" },
    { id:"dashboard",     icon:"📊", label:"Tableau de bord" },
    { id:"calendar",      icon:"📅", label:"Calendrier" },
    { id:"trades",        icon:"📈", label:"Trades", badge: filteredTrades.length > 0 ? filteredTrades.length : 0 },
    { id:"journal",       icon:"📝", label:"Journal de Trading", badge: filteredTrades.filter(t => {try { const d = new Date(t.date); return d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]; } catch (e) { return false; }}).length },
    { id:"discipline",    icon:"✓", label:"Discipline" },
    { id:"strategies",    icon:"🎯", label:"Stratégies" },
  ];

  const pages = {
    dashboard:  <Dashboard trades={filteredTrades} />,
    "add-trade": <AddTradePage trades={filteredTrades} setPage={setPage} setAccounts={setAccounts} setSelectedAccountIds={setSelectedAccountIds} accountType={accountType} setAccountType={setAccountType} selectedEvalAccount={selectedEvalAccount} setSelectedEvalAccount={setSelectedEvalAccount} accounts={accounts} selectedAccountIds={selectedAccountIds} addTrade={addTrade} addStrategy={addStrategy} strategies={strategies} user={user} />,
    trades:     <TradesPage trades={filteredTrades} strategies={strategies} onImportClick={() => setPage("add-trade")} onDeleteTrade={handleDeleteTrade} onClearTrades={handleClearTrades} />,
    calendar:   <CalendarPage trades={filteredTrades} accountType={accountType} evalAccountSize={selectedEvalAccount} />,
    journal: <JournalPage trades={filteredTrades} />,
    discipline: <DisciplinePage trades={filteredTrades} />,
    strategies: <StrategyPage setPage={setPage} setSelectedStrategyId={setSelectedStrategyId} />,
    "strategy-detail": <StrategyDetailPage setPage={setPage} />,
  };

  // ✅ Afficher un écran de chargement pendant que l'authentification se charge
  // Le useEffect redirigera si l'utilisateur n'est pas authentifié
  if (authLoading) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,flexDirection:"column",gap:20}}>
        <div style={{fontSize:16,fontWeight:600,color:T.text}}>⏳ Chargement...</div>
        <div style={{fontSize:12,color:T.textMut}}>Vérification de votre authentification</div>
      </div>
    );
  }

  // Si pas d'utilisateur après le chargement, le useEffect va rediriger vers "/"
  if (!user) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,flexDirection:"column",gap:20}}>
        <div style={{fontSize:16,fontWeight:600,color:T.text}}>⏳ Redirection...</div>
        <div style={{fontSize:12,color:T.textMut}}>Redirection vers la page de connexion</div>
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
        {/* SIDEBAR */}
        <div style={{width:220,flexShrink:0,background:T.white,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
          <div style={{padding:"20px 18px 16px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:30,height:30,borderRadius:8,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:700}}>A</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,letterSpacing:"0px"}}>tr4de</div>
              </div>
            </div>
          </div>
          <div style={{padding:"12px 8px",flex:1}}>
            {NAV.map(n=>(
              <NavItem key={n.id} icon={n.icon} label={n.label} active={page===n.id} onClick={()=>{
                // Si on quitte "add-trade" vers une autre page
                if (page === "add-trade" && n.id !== "add-trade") {
                  // Restaurer l'ancienne sélection
                  setSelectedAccountIds(previousSelectedAccountIds);
                  localStorage.setItem('selectedAccountIds', JSON.stringify(previousSelectedAccountIds));
                }
                
                // Sauvegarder la sélection actuelle avant d'aller sur "add-trade"
                if (n.id === "add-trade") {
                  setPreviousSelectedAccountIds(selectedAccountIds);
                  setSelectedAccountIdHeader("");
                  setSelectedAccountIds([]);
                }
                setPage(n.id);
              }} badge={n.badge}/>
            ))}
          </div>
          <div 
            style={{
              padding:"12px 8px",
              borderTop:`1px solid ${T.border}`,
              cursor:"pointer",
              position:"relative"
            }}
            onClick={() => setShowAccountSettings(!showAccountSettings)}
          >
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:8,transition:"all 0.2s",background:showAccountSettings ? T.accentBg : "transparent",border:showAccountSettings ? `1px solid ${T.accentBd}` : "none"}}>
              <div style={{width:30,height:30,borderRadius:8,background:T.accentBg,border:`1px solid ${T.accentBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:T.accent}}>{displayUser.initials}</div>
              <div style={{overflow:"hidden",flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>{displayUser.name}</div>
                <div style={{fontSize:10,color:T.textMut}}>{displayUser.email}</div>
              </div>
              <div style={{fontSize:12,color:T.textMut,transition:"transform 0.2s",transform:showAccountSettings ? "rotate(180deg)" : "rotate(0deg)"}}>
                ▼
              </div>
            </div>
            
            {/* Menu de paramètres du compte */}
            {showAccountSettings && (
              <div style={{
                position:"absolute",
                bottom:"100%",
                left:8,
                right:8,
                background:T.white,
                border:`1px solid ${T.border}`,
                borderRadius:8,
                boxShadow:`0 10px 25px rgba(0,0,0,0.1)`,
                zIndex:100,
                marginBottom:8,
                overflow:"hidden"
              }}>
                {/* Option Paramètres */}
                <div style={{
                  padding:"12px 14px",
                  borderBottom:`1px solid ${T.border}`,
                  cursor:"pointer",
                  display:"flex",
                  alignItems:"center",
                  gap:10,
                  transition:"all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                onClick={() => {
                  console.log("⚙️ Paramètres du compte");
                  setShowAccountSettings(false);
                }}
                >
                  <span style={{fontSize:14}}>⚙️</span>
                  <span style={{fontSize:12,color:T.text,fontWeight:500}}>Paramètres du compte</span>
                </div>
                
                {/* Option Profil */}
                <div style={{
                  padding:"12px 14px",
                  borderBottom:`1px solid ${T.border}`,
                  cursor:"pointer",
                  display:"flex",
                  alignItems:"center",
                  gap:10,
                  transition:"all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                onClick={() => {
                  console.log("👤 Profil");
                  setShowAccountSettings(false);
                }}
                >
                  <span style={{fontSize:14}}>👤</span>
                  <span style={{fontSize:12,color:T.text,fontWeight:500}}>Profil</span>
                </div>
                
                {/* Option Se déconnecter */}
                <div style={{
                  padding:"12px 14px",
                  cursor:"pointer",
                  display:"flex",
                  alignItems:"center",
                  gap:10,
                  transition:"all 0.2s",
                  color:T.red,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.redBg}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                onClick={() => {
                  handleLogout();
                }}
                >
                  <span style={{fontSize:14}}>🚪</span>
                  <span style={{fontSize:12,fontWeight:500}}>Se déconnecter</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,overflowY:"auto",minWidth:0}}>
          <div style={{position:"sticky",top:0,zIndex:10,background:T.white+"F0",backdropFilter:"blur(8px)",borderBottom:`1px solid ${T.border}`,padding:"8px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              {/* TEMPORARY: Account verification display */}
              {selectedAccountIds.length === 1 && accounts.length > 0 && (() => {
                const selectedAccount = accounts.find(acc => acc.id === selectedAccountIds[0]);
                if (selectedAccount && selectedAccount.account_type) {
                  const objectives = { "25k": 1500, "50k": 3000, "100k": 6000, "150k": 9000 };
                  const objective = selectedAccount.account_type === "eval" ? objectives[selectedAccount.eval_account_size] : null;
                  return (
                    <div style={{ padding: "8px 12px", background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "6px", fontSize: "11px", fontWeight: "600", color: "#92400E" }}>
                      {selectedAccount.account_type === "live" ? "🔴 LIVE" : `🟢 EVAL ${selectedAccount.eval_account_size} - Objectif: $${objective}`}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              {trades.length > 0 && (
                <button onClick={handleClearTrades} style={{padding:"6px 12px",borderRadius:8,background:T.redBg,border:`1px solid ${T.redBd}`,color:T.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>Effacer</button>
              )}
              {/* Sélecteur multi-compte */}
              <MultiAccountSelector
                accounts={visibleAccounts}
                selectedAccountIds={selectedAccountIds}
                onSelectionChange={setSelectedAccountIds}
                onDeleteAccount={handleDeleteAccount}
                T={T}
              />
            </div>
          </div>
          <div style={{padding: page === "add-trade" ? "0" : "16px 28px", display: page === "add-trade" ? "flex" : "block", height: page === "add-trade" ? "100%" : "auto", width: "100%"}}>
            {pages[page] || pages.dashboard}
          </div>
        </div>
      </div>
    </>
  );
}
