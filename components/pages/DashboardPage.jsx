"use client";

import React, { useState, useEffect } from "react";
import { T } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n";
import { fmt } from "@/lib/ui/format";
import { getCurrencySymbol } from "@/lib/userPrefs";
import AIReportSummaryCard from "@/components/AIReportSummaryCard";
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";
import { useApp } from "@/lib/contexts/AppContext";

export default function DashboardPage({ trades = [], allTrades = [], accounts = [], selectedAccountIds = [], strategies = [], setPage }) {
  // Vue du graphique : "cumulative" | "byAccount" | "byStrategy"
  const [chartView, setChartView] = React.useState("cumulative");
  const [hoveredDayIdx, setHoveredDayIdx] = React.useState(null);
  const VIEWS = ["cumulative", "byAccount", "byStrategy"];
  const cycleView = (dir) => {
    const idx = VIEWS.indexOf(chartView);
    const next = (idx + dir + VIEWS.length) % VIEWS.length;
    setChartView(VIEWS[next]);
  };
  // Mapping trades → stratégies (depuis localStorage)
  const tradeStrategiesData = React.useMemo(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("tr4de_trade_strategies") || "{}"); }
    catch { return {}; }
  }, []);
  const [emotionTags, setEmotionTags] = React.useState({});
  const [errorTags, setErrorTags] = React.useState({});
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = React.useState(null);
  const [hoveredChart, setHoveredChart] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  const allEmotionTags = [
    { id: "fomo", label: t("tag.fomo"), color: "#C94F4F" },
    { id: "revenge", label: t("tag.revenge"), color: "#C94F4F" },
    { id: "overconfident", label: t("tag.overconfident"), color: "#D4A574" },
    { id: "hesitation", label: t("tag.hesitation"), color: "#D4A574" },
    { id: "calm", label: t("tag.calm"), color: "#4A9D6F" },
    { id: "followed", label: t("tag.followed"), color: "#4A9D6F" },
    { id: "boredom", label: t("tag.boredom"), color: "#5B7EC9" },
    { id: "earlyexit", label: t("tag.earlyexit"), color: "#8B6BB6" }
  ];

  const allErrorTags = [
    { id: "poorentry", label: t("errtag.poorentry"), color: "#C94F4F" },
    { id: "poorexit", label: t("errtag.poorexit"), color: "#C94F4F" },
    { id: "nosltp", label: t("errtag.nosltp"), color: "#D4A574" },
    { id: "overleveraged", label: t("errtag.overleveraged"), color: "#D4A574" },
    { id: "ignoredsignal", label: t("errtag.ignoredsignal"), color: "#8B6BB6" },
    { id: "badtiming", label: t("errtag.badtiming"), color: "#C94F4F" },
    { id: "slttoosmall", label: t("errtag.slttoosmall"), color: "#D4A574" },
    { id: "wronganalysis", label: t("errtag.wronganalysis"), color: "#8B6BB6" }
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

  // Pendant que les trades arrivent depuis Supabase, afficher un skeleton
  // plutôt que l'état vide (évite le flash "Aucun trade" puis re-render).
  const { tradesLoading } = useApp();
  if (tradesLoading && (!trades || trades.length === 0)) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1" aria-busy="true" aria-live="polite">
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("dash.title")}</h1>
          <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
        </div>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:24}}>
          <Skeleton width={140} height={14} />
          <div style={{height:14}} />
          <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12}}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{padding:14,border:`1px solid ${T.border}`,borderRadius:8,display:"flex",flexDirection:"column",gap:8}}>
                <Skeleton width={60} height={11} />
                <Skeleton width={90} height={22} />
              </div>
            ))}
          </div>
          <div style={{height:24}} />
          <SkeletonRows rows={6} height={32} />
        </div>
      </div>
    );
  }
  if (!trades || trades.length === 0) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("dash.title")}</h1>
          <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
        </div>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"60px 24px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:600,marginBottom:8,color:T.text}}>{t("dash.noTrades")}</div>
          <p style={{color:T.textSub}}>{t("dash.noTradesSub")}</p>
        </div>
      </div>
    );
  }

  // P&L par jour de la semaine (sur tous les trades, tous mois confondus).
  // Utilise plus bas par la table "Performance par jour".
  const pnlByDay = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[]};
  trades.forEach(t => {
    try {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const dayOfWeek = d.getDay();
        if (pnlByDay[dayOfWeek]) pnlByDay[dayOfWeek].push(t);
      }
    } catch (e) {}
  });

  // Trades du mois affiche dans le calendrier — servent de base pour toutes
  // les stats du dashboard.
  const monthTrades = trades.filter(t => {
    try {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    } catch (e) {
      return false;
    }
  });

  // Si un jour de la semaine est selectionne dans "Performance par jour",
  // toutes les stats de la page se restreignent a ce jour-la.
  const filteredTrades = selectedDay !== null
    ? (pnlByDay[selectedDay] || [])
    : monthTrades;

  const totalPnL = filteredTrades.reduce((s,t)=>s+t.pnl,0);
  const wins = filteredTrades.filter(t=>t.pnl>0);
  const losses = filteredTrades.filter(t=>t.pnl<0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = ((winCount/(winCount+lossCount||1))*100).toFixed(1);
  const profitFactor = (wins.reduce((s,t)=>s+t.pnl,0)/Math.abs(losses.reduce((s,t)=>s+t.pnl,0)||1)).toFixed(2);
  const avgWin = wins.length ? wins.reduce((s,t)=>s+t.pnl,0)/wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s,t)=>s+t.pnl,0)/losses.length : 0;
  const maxWin = filteredTrades.length ? Math.max(...filteredTrades.map(t=>t.pnl)) : 0;
  const maxLoss = filteredTrades.length ? Math.min(...filteredTrades.map(t=>t.pnl)) : 0;

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

  const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
      <svg width={size} height={size} style={{display:"block",margin:"0 auto",overflow:"visible"}}>
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
              stroke="#E5E5E5"
              strokeWidth="1"
              opacity="0.7"
            />
          );
        })}

        {points.map((p, i) => (
          <line key={`axis-${i}`} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#E5E5E5" strokeWidth="1" opacity="0.5" />
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
                fill="#8E8E8E"
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
                fill="#0D0D0D"
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
    
    const avgPnL = filteredTrades.length > 0 ? filteredTrades.reduce((s, t) => s + t.pnl, 0) / filteredTrades.length : 0;
    const variance = filteredTrades.length > 0
      ? filteredTrades.reduce((s, t) => s + Math.pow(t.pnl - avgPnL, 2), 0) / filteredTrades.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = filteredTrades.length > 0
      ? Math.max(0, 100 - (stdDev / Math.max(...filteredTrades.map(t => t.pnl), 1000) * 100))
      : 0;
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
  const sortedTrades = [...filteredTrades].sort((a,b)=>new Date(a.date)-new Date(b.date));
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
  const sortedDates = Object.keys(dailyPnL).sort();
  // Point de départ à 0, la veille du premier trade
  if (sortedDates.length > 0) {
    const first = new Date(sortedDates[0]);
    first.setDate(first.getDate() - 1);
    pnlCurve.push({ cum: 0, pnl: 0, date: first.toISOString().split('T')[0] });
  }
  sortedDates.forEach(date=>{
    cum += dailyPnL[date];
    pnlCurve.push({cum, pnl:dailyPnL[date], date});
  });

  // Symbol stats
  const symbolStats = {};
  filteredTrades.forEach(t => {
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
    <div style={{display:"flex",flexDirection:"column",gap:12,fontFamily:"var(--font-sans)"}} className="anim-1">
      {/* PAGE TITLE */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
        <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1}}>{t("dash.title")}</h1>
        <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
      </div>

      {/* MERGED CARD: 4 KPIs + P&L Cumulatif (style OpenAI Home) */}
      <div style={{background:"#FFFFFF",border:"1px solid #E5E5E5",borderRadius:12,overflow:"hidden"}}>

        {/* ROW 1: 4 KPIs avec separateurs verticaux */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:"1px solid #E5E5E5"}}>
          {/* NET P&L */}
          <div style={{padding:"14px 18px",borderRight:"1px solid #E5E5E5",position:"relative"}}>
            <div style={{position:"absolute",top:10,right:12,fontSize:10,fontWeight:600,color:"#16A34A"}}>↑ +12.4%</div>
            <div style={{fontSize:12,color:"#5C5C5C",marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>{t("dash.kpi.totalPnL")} <span style={{color:"#8E8E8E"}}>›</span></div>
            <div style={{fontSize:20,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.2}}>{fmt(totalPnL,true)}</div>
          </div>

          {/* TRADE WIN */}
          <div style={{padding:"14px 18px",borderRight:"1px solid #E5E5E5",position:"relative"}}>
            <div style={{position:"absolute",top:10,right:12,fontSize:10,fontWeight:600,color:"#16A34A"}}>↑ +3.2%</div>
            <div style={{fontSize:12,color:"#5C5C5C",marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>{t("dash.kpi.winRate")} <span style={{color:"#8E8E8E"}}>›</span></div>
            <div style={{fontSize:20,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.2}}>{winRate}%</div>
          </div>

          {/* PROFIT FACTOR */}
          <div style={{padding:"14px 18px",borderRight:"1px solid #E5E5E5",position:"relative"}}>
            <div style={{position:"absolute",top:10,right:12,fontSize:10,fontWeight:600,color:"#A855F7"}}>↑ +0.3</div>
            <div style={{fontSize:12,color:"#5C5C5C",marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>{t("dash.kpi.profitFactor")} <span style={{color:"#8E8E8E"}}>›</span></div>
            <div style={{fontSize:20,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.2}}>{profitFactor}</div>
          </div>

          {/* WIN RATE TODAY */}
          <div style={{padding:"14px 18px",position:"relative"}}>
            <div style={{position:"absolute",top:10,right:12,fontSize:10,fontWeight:600,color:"#F97316"}}>↑ +2.1%</div>
            <div style={{fontSize:12,color:"#5C5C5C",marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>WR Today <span style={{color:"#8E8E8E"}}>›</span></div>
            <div style={{fontSize:20,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.2}}>{winRate}%</div>
          </div>
        </div>

        {/* ROW 2: P&L Cumulatif (a l'interieur de la meme carte) */}
        <div style={{padding:"16px 20px",position:"relative",display:"flex",flexDirection:"column"}}>
          {/* Total P&L (uniquement vue cumulative) à droite */}
          {chartView === "cumulative" && (
            <div style={{position:"absolute",top:16,right:20,zIndex:10}}>
              <div style={{fontSize:12,fontWeight:600,color:totalPnL>=0?"#16A34A":"#EF4444"}}>{totalPnL>=0?"+":""}${Math.abs(totalPnL).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}</div>
            </div>
          )}
          {/* Onglets de sélection du graphique — style minimal (pill sur l'actif uniquement) */}
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6,flexWrap:"wrap"}}>
            {(() => {
              const opts = [
                { id: "cumulative", label: t("dash.cumulativePnL") },
                { id: "byAccount",  label: "P&L par compte" },
                { id: "byStrategy", label: "P&L par stratégie" },
              ];
              return opts.map((opt, i) => {
                const active = chartView === opt.id;
                return (
                  <React.Fragment key={opt.id}>
                    {i > 0 && (
                      <span aria-hidden="true" style={{ width: 1, height: 14, background: T.border, margin: "0 2px" }} />
                    )}
                    <button
                      type="button"
                      onClick={() => setChartView(opt.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: "none",
                        background: active ? "#F5F5F5" : "transparent",
                        color: active ? T.text : T.textSub,
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background 140ms ease, color 140ms ease",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = T.text; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = T.textSub; }}
                    >
                      {opt.label}
                    </button>
                  </React.Fragment>
                );
              });
            })()}
          </div>
          <div style={{fontSize:11,color:"#8E8E8E",marginBottom:12}}>
            {chartView === "cumulative"
              ? `Évolution du capital — ${new Date().toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'})}`
              : chartView === "byAccount"
              ? "Comparaison des comptes au fil du temps"
              : "Comparaison des stratégies au fil du temps"}
          </div>

          {chartView === "cumulative" && pnlCurve.length > 1 ? (
            <div
              style={{position:"relative",width:"100%",height:280,paddingLeft:0,paddingBottom:22}}
              onMouseLeave={() => setHoveredChart(null)}
            >
              <svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none" style={{display:"block",position:"absolute",top:0,left:0,right:50,bottom:22,width:"calc(100% - 50px)",height:"calc(100% - 22px)",fontFamily:"inherit"}}>

                {/* Lignes de grille horizontales très claires alignées sur ticks Y */}
                {(() => {
                  const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                  const niceStep = (max) => {
                    const rough = max / 3;
                    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
                    const n = rough / mag;
                    const nice = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
                    return nice * mag;
                  };
                  const step = niceStep(maxCum);
                  const topMax = Math.ceil(maxCum / step) * step;
                  const ticks = [];
                  for (let v = 0; v <= topMax; v += step) ticks.push(v);
                  return ticks.map((value, i) => {
                    const topPct = 91 - ((value / topMax) * 83);
                    const y = (topPct / 100) * 240;
                    return <line key={`grid-${i}`} x1="0" y1={y} x2="600" y2={y} stroke="#F5F5F5" strokeWidth="1"/>;
                  });
                })()}

                {/* Chart area - smooth Catmull-Rom curve, sans gradient (style stats stratégie) */}
                <g>
                  {(() => {
                    const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 0);
                    const minCum = Math.min(...pnlCurve.map(x=>x.cum), 0);
                    const span = (maxCum - minCum) || 1;
                    const padL = 10;
                    const topY = 16;
                    const bottomY = 220;
                    const plotH = bottomY - topY;
                    const points = pnlCurve.map((p, i) => {
                      const x = padL + (i / (pnlCurve.length - 1 || 1)) * (600 - padL);
                      const y = bottomY - ((p.cum - minCum) / span) * plotH;
                      return [x, y];
                    });

                    // Lignes droites entre points (moins lisse)
                    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
                    // Couleur selon le P&L cumulatif final
                    const lastCum = pnlCurve[pnlCurve.length - 1]?.cum ?? 0;
                    const lineColor = lastCum >= 0 ? "#16A34A" : "#EF4444";

                    return (
                      <g>
                        <path d={pathD} stroke={lineColor} strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
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
                            // pas de reset sur mouseleave — on garde le dernier point hover
                          />
                        ))}
                      </g>
                    );
                  })()}
                </g>

                {/* Axe X labels supprimes du SVG (rendus en HTML overlay) */}
              </svg>

              {/* Y-axis labels en HTML overlay (à droite) — pas étirés par preserveAspectRatio */}
              <div style={{position:"absolute",top:0,right:0,width:50,height:"calc(100% - 22px)",pointerEvents:"none"}}>
                {(() => {
                  const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                  const niceStep = (max) => {
                    const rough = max / 3;
                    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
                    const n = rough / mag;
                    const nice = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
                    return nice * mag;
                  };
                  const step = niceStep(maxCum);
                  const topMax = Math.ceil(maxCum / step) * step;
                  const ticks = [];
                  for (let v = 0; v <= topMax; v += step) ticks.push(v);
                  const fmtVal = (v) => {
                    const sign = v >= 0 ? "+" : "-";
                    const abs = Math.abs(v);
                    if (abs >= 10000) return `${sign}${Math.round(abs/10000)*10}k`;
                    if (abs >= 1000)  return `${sign}${Math.round(abs/1000)}k`;
                    return `${sign}${Math.round(abs)}`;
                  };
                  const tickEls = ticks.map((value, i) => {
                    const topPct = 91 - ((value / topMax) * 83);
                    return (
                      <div key={`yh-${i}`} style={{position:"absolute",top:`${topPct}%`,right:6,transform:"translateY(-50%)",fontSize:10,color:"#8E8E8E",fontWeight:500}}>
                        {fmtVal(value)}
                      </div>
                    );
                  });
                  // P&L final au niveau du dernier point (couleur courbe)
                  const minCum2 = Math.min(...pnlCurve.map(x=>x.cum), 0);
                  const maxCum2 = Math.max(...pnlCurve.map(x=>x.cum), 0);
                  const span = (maxCum2 - minCum2) || 1;
                  const last = pnlCurve[pnlCurve.length - 1];
                  const lastTopPct = (220 - ((last.cum - minCum2) / span) * 204) / 240 * 100;
                  const precise = `${last.cum >= 0 ? "+" : "-"}$${Math.abs(last.cum).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
                  const lastColor = last.cum >= 0 ? "#16A34A" : "#EF4444";
                  const lastEl = (
                    <div key="last-pnl" style={{position:"absolute",top:`calc(${lastTopPct}% * (100% - 22px) / 100%)`,right:6,transform:"translateY(-50%)",fontSize:11,fontWeight:600,color:lastColor,whiteSpace:"nowrap",background:"#FFFFFF"}}>
                      {precise}
                    </div>
                  );
                  return [...tickEls, lastEl];
                })()}
              </div>

              {/* Dot au hover (n'apparaît que pendant le survol) */}
              {hoveredChart !== null && (() => {
                const idx = hoveredChart;
                if (!pnlCurve[idx]) return null;
                const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 0);
                const minCum = Math.min(...pnlCurve.map(x=>x.cum), 0);
                const span = (maxCum - minCum) || 1;
                const p = pnlCurve[idx];
                const topPct = (220 - ((p.cum - minCum) / span) * 204) / 240 * 100;
                const svgX = 10 + (idx / Math.max(pnlCurve.length - 1, 1)) * 590;
                const leftPct = (svgX / 600) * 100;
                const lastCum = pnlCurve[pnlCurve.length - 1]?.cum ?? 0;
                const dotColor = lastCum >= 0 ? "#16A34A" : "#EF4444";
                const dotShadow = lastCum >= 0 ? "rgba(16, 163, 127, 0.2)" : "rgba(239, 68, 68, 0.2)";
                return (
                  <div style={{
                    position:"absolute",
                    top:`calc(${topPct}% * (100% - 22px) / 100%)`,
                    left:`calc(${leftPct}% * (100% - 50px) / 100%)`,
                    width:10, height:10, borderRadius:"50%",
                    background:"#FFFFFF",
                    border:`2px solid ${dotColor}`,
                    boxShadow:`0 0 0 1px ${dotShadow}`,
                    transform:"translate(-50%, -50%)",
                    pointerEvents:"none",
                  }} />
                );
              })()}

              {/* X-axis labels en HTML - chaque jour, premier collé à gauche, dernier collé à droite */}
              <div style={{position:"absolute",bottom:2,left:0,right:50,height:18,pointerEvents:"none"}}>
                {(() => {
                  return pnlCurve.map((p, i) => {
                    const dateStr = p.date || '';
                    const date = new Date(dateStr);
                    const label = isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR',{month:'short',day:'numeric'});
                    const svgX = 10 + (i / Math.max(pnlCurve.length - 1, 1)) * 590;
                    const leftPct = (svgX / 600) * 100;
                    // Premier label aligné à gauche, dernier à droite, le reste centré
                    const xfm = i === 0 ? "translateX(0%)"
                              : i === pnlCurve.length - 1 ? "translateX(-100%)"
                              : "translateX(-50%)";
                    return (
                      <div key={`xh-${i}`} style={{position:"absolute",left:`${leftPct}%`,top:0,transform:xfm,fontSize:10,color:"#8E8E8E",fontWeight:500,whiteSpace:"nowrap"}}>
                        {label}
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* Tooltip (n'apparaît que pendant le survol) */}
              {hoveredChart !== null && (() => {
                const idx = hoveredChart;
                const p = pnlCurve[idx];
                if (!p) return null;
                const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 0);
                const minCum = Math.min(...pnlCurve.map(x=>x.cum), 0);
                const span = (maxCum - minCum) || 1;
                const svgX = 10 + (idx / Math.max(pnlCurve.length - 1, 1)) * 590;
                const svgY = 220 - ((p.cum - minCum) / span) * 204;
                const leftPct = (svgX / 600) * 100;
                const topPct = (svgY / 240) * 100;
                return (
                  <div style={{
                    position:"absolute",
                    left:`calc(${leftPct}% * (100% - 50px) / 100%)`,
                    top:`calc(${topPct}% * (100% - 22px) / 100%)`,
                    transform:"translate(-50%, -120%)",
                    background:"#FFFFFF",
                    color:"#0D0D0D",
                    padding:"8px 12px",
                    borderRadius:"6px",
                    fontSize:"12px",
                    fontWeight:"600",
                    whiteSpace:"nowrap",
                    zIndex:100,
                    pointerEvents:"none",
                    border:"1px solid #E5E5E5",
                    boxShadow:"0 4px 12px rgba(0,0,0,0.08)"
                  }}>
                    <div style={{color:"#5C5C5C",fontWeight:500,fontSize:11,marginBottom:2}}>{new Date(p.date).toLocaleDateString('fr-FR',{weekday:'short',month:'short',day:'numeric'})}</div>
                    <div style={{fontSize:"13px",fontWeight:"700",color:p.pnl>=0?"#16A34A":"#EF4444"}}>
                      {p.pnl>=0?"+":""}${Math.abs(p.pnl).toFixed(0)}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : chartView === "byStrategy" ? (
            (() => {
              const STRAT_COLORS = ["#16A34A","#3B82F6","#F97316","#A855F7","#EF4444","#0EA5E9","#EAB308","#EC4899"];
              const getStrategyIdsForTrade = (tr) => {
                let ids = tradeStrategiesData[tr.id] || [];
                if (ids.length === 0 && tr.date && tr.symbol && tr.entry) {
                  const ck = `${tr.date}${tr.symbol}${tr.entry}`;
                  ids = tradeStrategiesData[ck] || [];
                  if (ids.length === 0) {
                    const norm = `${tr.date}${tr.symbol}${parseFloat(tr.entry).toFixed(2)}`;
                    ids = tradeStrategiesData[norm] || [];
                  }
                }
                return ids.map(String);
              };

              const seriesPerStrategy = (strategies || []).map((s, idx) => {
                const sTrades = allTrades.filter(tr => getStrategyIdsForTrade(tr).includes(String(s.id)));
                if (sTrades.length === 0) return null;
                const sorted = [...sTrades].sort((a,b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
                const byDay = {};
                sorted.forEach(tr => {
                  const d = String(tr.date || "").split("T")[0];
                  byDay[d] = (byDay[d] || 0) + (tr.pnl || 0);
                });
                const dates = Object.keys(byDay).sort();
                let cum = 0;
                const points = dates.map(d => { cum += byDay[d]; return { date: d, value: cum }; });
                return { id: s.id, name: s.name, color: s.color || STRAT_COLORS[idx % STRAT_COLORS.length], points };
              }).filter(Boolean);

              if (seriesPerStrategy.length === 0) {
                return (
                  <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:"#F3F4F6",borderRadius:8,color:"#8E8E8E"}}>
                    Pas de stratégies liées
                  </div>
                );
              }

              const allDatesSet = new Set();
              seriesPerStrategy.forEach(s => s.points.forEach(p => allDatesSet.add(p.date)));
              const allDates = Array.from(allDatesSet).sort();

              const seriesFilled = seriesPerStrategy.map(s => {
                const map = Object.fromEntries(s.points.map(p => [p.date, p.value]));
                let lastVal = 0;
                const filled = allDates.map(d => {
                  if (map[d] !== undefined) lastVal = map[d];
                  return { date: d, value: lastVal };
                });
                return { ...s, filled };
              });

              let yMin = 0, yMax = 0;
              seriesFilled.forEach(s => s.filled.forEach(p => { if (p.value < yMin) yMin = p.value; if (p.value > yMax) yMax = p.value; }));
              const yRange = (yMax - yMin) || 1;

              const W = 600, H = 240;
              const padL = 10, padR = 50, padT = 12, padB = 22;
              const plotW = W - padL - padR;
              const plotH = H - padT - padB;
              const xFor = (i) => padL + (allDates.length === 1 ? plotW / 2 : (i / (allDates.length - 1)) * plotW);
              const yFor = (v) => padT + plotH - ((v - yMin) / yRange) * plotH;

              const fmtVal = (v) => {
                const sign = v >= 0 ? "+" : "-";
                const abs = Math.abs(v);
                if (abs >= 10000) return `${sign}${Math.round(abs/10000)*10}k`;
                if (abs >= 1000)  return `${sign}${Math.round(abs/1000)}k`;
                return `${sign}${Math.round(abs)}`;
              };

              const yTicks = [];
              const N = 3;
              for (let i = 0; i <= N; i++) {
                const ratio = i / N;
                yTicks.push({ y: padT + plotH * ratio, value: yMax - ratio * yRange });
              }

              return (
                <div style={{position:"relative",width:"100%",height:280}}>
                  <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:"block",position:"absolute",top:0,left:0,right:0,bottom:0,fontFamily:"inherit"}}>
                    {yTicks.map((tk, i) => (
                      <line key={`gr-${i}`} x1={padL} y1={tk.y} x2={W - padR} y2={tk.y} stroke="#F5F5F5" strokeWidth="1"/>
                    ))}
                    {seriesFilled.map(s => {
                      const path = s.filled.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(" ");
                      return <path key={s.id} d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>;
                    })}

                    {/* Indicateur vertical au hover */}
                    {hoveredDayIdx !== null && allDates[hoveredDayIdx] && (
                      <line x1={xFor(hoveredDayIdx)} y1={padT} x2={xFor(hoveredDayIdx)} y2={padT + plotH} stroke={T.textMut} strokeWidth="0.5" strokeDasharray="2 2"/>
                    )}

                    {/* Capture rects pour le hover */}
                    {allDates.map((d, i) => {
                      const cellW = (allDates.length === 1 ? plotW : plotW / (allDates.length - 1));
                      const x = xFor(i) - cellW / 2;
                      return (
                        <rect key={`hov-${i}`} x={Math.max(0, x)} y={padT} width={cellW} height={plotH + padB} fill="transparent" style={{cursor:"crosshair"}}
                          onMouseEnter={() => setHoveredDayIdx(i)}
                          onMouseLeave={() => setHoveredDayIdx(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Y labels (échelle, gris) + P&L final par stratégie (couleur de la courbe) */}
                  <div style={{position:"absolute",top:0,right:0,width:50,height:"100%",pointerEvents:"none"}}>
                    {yTicks.map((tk, i) => (
                      <div key={`yh-${i}`} style={{position:"absolute",top:`${(tk.y / H) * 100}%`,right:6,transform:"translateY(-50%)",fontSize:10,color:"#8E8E8E",fontWeight:500}}>{fmtVal(tk.value)}</div>
                    ))}
                    {seriesFilled.map(s => {
                      const last = s.filled[s.filled.length - 1].value;
                      const topPct = (yFor(last) / H) * 100;
                      const precise = `${last >= 0 ? "+" : "-"}$${Math.abs(last).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
                      return (
                        <div key={`pnl-${s.id}`} style={{position:"absolute",top:`${topPct}%`,right:6,transform:"translateY(-50%)",fontSize:11,fontWeight:600,color:s.color,whiteSpace:"nowrap",background:"#FFFFFF"}}>{precise}</div>
                      );
                    })}
                  </div>

                  {/* Légende */}
                  <div style={{position:"absolute",bottom:4,left:padL,display:"flex",gap:14,flexWrap:"wrap",fontFamily:"inherit"}}>
                    {seriesFilled.map(s => (
                      <div key={s.id} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,color:T.textSub}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                        <span style={{fontWeight:500}}>{s.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tooltip blanc */}
                  {hoveredDayIdx !== null && allDates[hoveredDayIdx] && (() => {
                    const date = allDates[hoveredDayIdx];
                    const items = [...seriesFilled]
                      .map(s => ({ strategy: s, value: s.filled[hoveredDayIdx]?.value ?? 0 }))
                      .sort((a, b) => b.value - a.value);
                    const leftPct = (xFor(hoveredDayIdx) / W) * 100;
                    const flip = leftPct > 60;
                    const fmtD = (d) => { const [, m, dd] = d.split("-"); const months = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"]; return `${parseInt(dd)} ${months[parseInt(m)-1]}`; };
                    return (
                      <div style={{position:"absolute",left:`${leftPct}%`,top:16,transform: flip ? "translateX(-100%) translateX(-8px)" : "translateX(8px)",background:"#FFFFFF",color:"#0D0D0D",padding:"8px 10px",borderRadius:6,fontSize:11,fontFamily:"var(--font-sans)",border:"1px solid #E5E5E5",boxShadow:"0 4px 12px rgba(0,0,0,0.08)",pointerEvents:"none",zIndex:10,whiteSpace:"nowrap"}}>
                        <div style={{fontWeight:600,marginBottom:6,color:"#5C5C5C"}}>{fmtD(date)}</div>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {items.map(it => (
                            <div key={it.strategy.id} style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{width:6,height:6,borderRadius:"50%",background:it.strategy.color,flexShrink:0}}/>
                              <span style={{fontWeight:600,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{it.strategy.name}</span>
                              <span style={{marginLeft:"auto",fontWeight:600,color:it.value >= 0 ? "#16A34A" : "#EF4444"}}>{fmtVal(it.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()
          ) : chartView === "byAccount" ? (
            (() => {
              // Construire une série cumulative par compte
              const ACCOUNT_COLORS = ["#16A34A", "#3B82F6", "#F97316", "#A855F7", "#EF4444", "#0EA5E9", "#EAB308", "#EC4899"];
              const accountIds = (accounts && accounts.length > 0)
                ? accounts.map(a => a.id)
                : Array.from(new Set(allTrades.map(t => t.account_id).filter(Boolean)));

              const seriesPerAccount = accountIds.map((aid, idx) => {
                const acc = accounts.find(a => a.id === aid);
                const accTrades = allTrades.filter(t => t.account_id === aid);
                if (accTrades.length === 0) return null;
                const sorted = [...accTrades].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
                const byDay = {};
                sorted.forEach(tr => {
                  const d = String(tr.date || "").split("T")[0];
                  byDay[d] = (byDay[d] || 0) + (tr.pnl || 0);
                });
                const dates = Object.keys(byDay).sort();
                let cum = 0;
                const points = dates.map(d => { cum += byDay[d]; return { date: d, value: cum }; });
                return { id: aid, name: acc?.name || "Compte", color: ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length], points };
              }).filter(Boolean);

              if (seriesPerAccount.length === 0) {
                return (
                  <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:"#F3F4F6",borderRadius:8,color:"#8E8E8E"}}>
                    Pas de données
                  </div>
                );
              }

              // X axis : toutes les dates
              const allDatesSet = new Set();
              seriesPerAccount.forEach(s => s.points.forEach(p => allDatesSet.add(p.date)));
              const allDates = Array.from(allDatesSet).sort();

              // Forward-fill chaque compte
              const seriesFilled = seriesPerAccount.map(s => {
                const map = Object.fromEntries(s.points.map(p => [p.date, p.value]));
                let lastVal = 0;
                const filled = allDates.map(d => {
                  if (map[d] !== undefined) lastVal = map[d];
                  return { date: d, value: lastVal };
                });
                return { ...s, filled };
              });

              let yMin = 0, yMax = 0;
              seriesFilled.forEach(s => s.filled.forEach(p => { if (p.value < yMin) yMin = p.value; if (p.value > yMax) yMax = p.value; }));
              const yRange = (yMax - yMin) || 1;

              const W = 600, H = 240;
              const padL = 10, padR = 50, padT = 12, padB = 22;
              const plotW = W - padL - padR;
              const plotH = H - padT - padB;
              const xFor = (i) => padL + (allDates.length === 1 ? plotW / 2 : (i / (allDates.length - 1)) * plotW);
              const yFor = (v) => padT + plotH - ((v - yMin) / yRange) * plotH;

              const fmtVal = (v) => {
                const sign = v >= 0 ? "+" : "-";
                const abs = Math.abs(v);
                if (abs >= 10000) return `${sign}${Math.round(abs/10000)*10}k`;
                if (abs >= 1000)  return `${sign}${Math.round(abs/1000)}k`;
                return `${sign}${Math.round(abs)}`;
              };

              const yTicks = [];
              const N = 3;
              for (let i = 0; i <= N; i++) {
                const ratio = i / N;
                yTicks.push({ y: padT + plotH * ratio, value: yMax - ratio * yRange });
              }

              return (
                <div style={{position:"relative",width:"100%",height:280}}>
                  <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:"block",position:"absolute",top:0,left:0,right:0,bottom:0,fontFamily:"inherit"}}>
                    {/* Lignes de grille */}
                    {yTicks.map((tk, i) => (
                      <line key={`gr-${i}`} x1={padL} y1={tk.y} x2={W - padR} y2={tk.y} stroke="#F5F5F5" strokeWidth="1"/>
                    ))}
                    {/* Courbes — non-sélectionnés en arrière-plan, sélectionnés au-dessus */}
                    {seriesFilled.filter(s => !(selectedAccountIds.length === 0 || selectedAccountIds.includes(s.id))).map(s => {
                      const path = s.filled.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(" ");
                      return <path key={s.id} d={path} fill="none" stroke={s.color} strokeWidth="1" strokeOpacity="0.35" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>;
                    })}
                    {seriesFilled.filter(s => selectedAccountIds.length === 0 || selectedAccountIds.includes(s.id)).map(s => {
                      const path = s.filled.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(" ");
                      return <path key={s.id} d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>;
                    })}

                    {/* Indicateur vertical au hover */}
                    {hoveredDayIdx !== null && allDates[hoveredDayIdx] && (
                      <line x1={xFor(hoveredDayIdx)} y1={padT} x2={xFor(hoveredDayIdx)} y2={padT + plotH} stroke={T.textMut} strokeWidth="0.5" strokeDasharray="2 2"/>
                    )}

                    {/* Capture rects pour le hover */}
                    {allDates.map((d, i) => {
                      const cellW = (allDates.length === 1 ? plotW : plotW / (allDates.length - 1));
                      const x = xFor(i) - cellW / 2;
                      return (
                        <rect key={`hov-${i}`} x={Math.max(0, x)} y={padT} width={cellW} height={plotH + padB} fill="transparent" style={{cursor:"crosshair"}}
                          onMouseEnter={() => setHoveredDayIdx(i)}
                          onMouseLeave={() => setHoveredDayIdx(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Y labels (échelle, gris) + P&L de chaque compte (couleur de la courbe) */}
                  <div style={{position:"absolute",top:0,right:0,width:50,height:"100%",pointerEvents:"none"}}>
                    {/* Échelle (ticks ronds) */}
                    {yTicks.map((tk, i) => (
                      <div key={`yh-${i}`} style={{position:"absolute",top:`${(tk.y / H) * 100}%`,right:6,transform:"translateY(-50%)",fontSize:10,color:"#8E8E8E",fontWeight:500}}>{fmtVal(tk.value)}</div>
                    ))}
                    {/* P&L final par compte (au niveau du dernier point, valeur précise, aligné avec l'ordonnée) */}
                    {seriesFilled.map(s => {
                      const isSelected = selectedAccountIds.length === 0 || selectedAccountIds.includes(s.id);
                      const last = s.filled[s.filled.length - 1].value;
                      const topPct = (yFor(last) / H) * 100;
                      const precise = `${last >= 0 ? "+" : "-"}$${Math.abs(last).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
                      return (
                        <div key={`pnl-${s.id}`} style={{position:"absolute",top:`${topPct}%`,right:6,transform:"translateY(-50%)",fontSize:11,fontWeight:600,color:s.color,whiteSpace:"nowrap",background:"#FFFFFF",opacity:isSelected ? 1 : 0.4}}>{precise}</div>
                      );
                    })}
                  </div>

                  {/* Légende compacte en bas (juste pastille + nom) */}
                  <div style={{position:"absolute",bottom:4,left:padL,display:"flex",gap:14,flexWrap:"wrap",fontFamily:"inherit"}}>
                    {seriesFilled.map(s => {
                      const isSelected = selectedAccountIds.length === 0 || selectedAccountIds.includes(s.id);
                      return (
                        <div key={s.id} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,color:T.textSub,opacity:isSelected ? 1 : 0.5}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                          <span style={{fontWeight:isSelected ? 600 : 500}}>{s.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tooltip blanc */}
                  {hoveredDayIdx !== null && allDates[hoveredDayIdx] && (() => {
                    const date = allDates[hoveredDayIdx];
                    const items = [...seriesFilled]
                      .map(s => ({ strategy: s, value: s.filled[hoveredDayIdx]?.value ?? 0 }))
                      .sort((a, b) => b.value - a.value);
                    const leftPct = (xFor(hoveredDayIdx) / W) * 100;
                    const flip = leftPct > 60;
                    const fmtD = (d) => { const [, m, dd] = d.split("-"); const months = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"]; return `${parseInt(dd)} ${months[parseInt(m)-1]}`; };
                    return (
                      <div style={{position:"absolute",left:`${leftPct}%`,top:16,transform: flip ? "translateX(-100%) translateX(-8px)" : "translateX(8px)",background:"#FFFFFF",color:"#0D0D0D",padding:"8px 10px",borderRadius:6,fontSize:11,fontFamily:"var(--font-sans)",border:"1px solid #E5E5E5",boxShadow:"0 4px 12px rgba(0,0,0,0.08)",pointerEvents:"none",zIndex:10,whiteSpace:"nowrap"}}>
                        <div style={{fontWeight:600,marginBottom:6,color:"#5C5C5C"}}>{fmtD(date)}</div>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {items.map(it => {
                            const isSelected = selectedAccountIds.length === 0 || selectedAccountIds.includes(it.strategy.id);
                            return (
                              <div key={it.strategy.id} style={{display:"flex",alignItems:"center",gap:6,opacity:isSelected ? 1 : 0.55}}>
                                <span style={{width:6,height:6,borderRadius:"50%",background:it.strategy.color,flexShrink:0}}/>
                                <span style={{fontWeight:isSelected ? 600 : 500,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{it.strategy.name}</span>
                                <span style={{marginLeft:"auto",fontWeight:600,color:it.value >= 0 ? "#16A34A" : "#EF4444"}}>{fmtVal(it.value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()
          ) : (
            <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:"#F3F4F6",borderRadius:8,color:"#8E8E8E"}}>
              Pas de données
            </div>
          )}
        </div>

      </div>  {/* fin MERGED CARD (KPIs + P&L Cumulatif) */}

      {/* GRID: Calendrier + Rapport IA */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:20,alignItems:"start"}}>

      {/* CALENDRIER P&L */}
      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:12,overflow:"hidden",marginTop:8,marginBottom:8}}>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2}}>{t("dash.calendar")}</div>
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

      {/* AI REPORT SUMMARY (droite) */}
      <div style={{marginTop:20,marginBottom:20}}>
        <AIReportSummaryCard onOpenReports={setPage ? () => setPage("agent") : undefined} />
      </div>

      </div>  {/* Close Calendrier + Rapport IA grid */}

      {/* TR4DE SCORE + RECENT TRADES + EMOTIONAL IMPACT */}
      <div style={{display:"grid",gridTemplateColumns:"1.3fr 1.2fr 1.1fr",gap:8}}>
        {/* TR4DE SCORE CARD */}
        <div style={{background:"#FFFFFF",border:`1px solid #E5E5E5`,borderRadius:12,padding:"20px 24px",fontFamily:"var(--font-sans)"}}>
          <div style={{marginBottom:16}}>
            <h3 style={{fontSize:15,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1}}>{t("dash.tr4deScore")}</h3>
            <p style={{fontSize:12,color:"#8E8E8E",margin:"2px 0 0"}}>{t("dash.tr4deScoreSub")}</p>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"center",width:"100%",paddingTop:12,overflow:"visible"}}>
              <PentagonRadar metrics={pentagonMetrics} size={280} />
            </div>

            <div>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"baseline",gap:5}}>
                  <span style={{fontSize:20,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.2,lineHeight:1}}>
                    {pentagonMetrics.overallScore}
                  </span>
                  <span style={{fontSize:12,color:"#8E8E8E",fontWeight:500}}>/ 100</span>
                </div>
                <span style={{fontSize:11,color:"#8E8E8E",fontWeight:500}}>{t("dash.globalScore")}</span>
              </div>

              <div style={{position:"relative",height:10,paddingTop:2}}>
                <div style={{position:"relative",height:6,background:"#F0F0F0",borderRadius:3,overflow:"hidden"}}>
                  <div
                    style={{
                      width:`${parseFloat(pentagonMetrics.overallScore)}%`,
                      height:"100%",
                      background:"#5F7FB4",
                      transition:"width 0.6s ease",
                      borderRadius:3,
                    }}
                  />
                  {[20,40,60,80].map(v => (
                    <div key={v} style={{position:"absolute",left:`${v}%`,top:0,bottom:0,width:1,background:"rgba(255,255,255,0.65)",transform:"translateX(-0.5px)",pointerEvents:"none"}} />
                  ))}
                </div>
                <div
                  style={{
                    position:"absolute",
                    left:`${parseFloat(pentagonMetrics.overallScore)}%`,
                    top:"50%",
                    transform:"translate(-50%, -50%)",
                    width:10,
                    height:10,
                    borderRadius:"50%",
                    background:"#5F7FB4",
                    border:"2px solid #FFFFFF",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.15)",
                    transition:"left 0.6s ease",
                    pointerEvents:"none",
                  }}
                />
              </div>
              <div style={{position:"relative",height:12,marginTop:4}}>
                {[0,20,40,60,80,100].map(v => {
                  const tx = v === 0 ? "translateX(0)" : v === 100 ? "translateX(-100%)" : "translateX(-50%)";
                  return (
                    <span key={v} style={{position:"absolute",left:`${v}%`,transform:tx,fontSize:9,color:"#8E8E8E",fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{v}</span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,overflow:"hidden"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2}}>{selectedDay !== null ? t("trades.tradesOfDay").replace("{day}", [t("wd.monday"),t("wd.tuesday"),t("wd.wednesday"),t("wd.thursday"),t("wd.friday"),t("wd.saturday"),t("wd.sunday")][selectedDay]) : t("dash.recentTrades")}</div>
            <div style={{fontSize:12,color:T.textSub,marginBottom:8}}>
              {selectedDay !== null 
                ? `${(pnlByDay[selectedDay] || []).length} trades`
                : `${filteredTrades.length} trades`
              }
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 0.6fr",gap:8,fontSize:10,fontWeight:600,color:T.textMut,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
              <div>{t("dash.asset")}</div>
              <div style={{textAlign:"right"}}>P&L</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",maxHeight:360}}>
            {(() => {
              // Tous les trades de la semaine (lundi 00:00 → dimanche 23:59)
              const now = new Date();
              const dow = now.getDay();
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
              weekStart.setHours(0,0,0,0);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 7);

              const source = selectedDay !== null ? (pnlByDay[selectedDay] || []) : filteredTrades;
              const weekTrades = selectedDay !== null
                ? source
                : source.filter(t => {
                    const d = new Date(t.date);
                    return !isNaN(d.getTime()) && d >= weekStart && d < weekEnd;
                  });
              const list = [...weekTrades].reverse();
              return list.map((t,i)=>(
                <div key={i} style={{padding:"10px 8px",display:"grid",gridTemplateColumns:"1fr 0.6fr",gap:8,fontSize:11,borderBottom:i<list.length-1?`1px solid ${T.border}`:"none"}}>
                  <div><div style={{fontWeight:600,color:T.text}}>{t.symbol}</div><div style={{fontSize:9,color:T.textMut}}>{t.direction || 'Long'}</div></div>
                  <div style={{textAlign:"right",fontWeight:500,color:t.pnl>0?T.green:t.pnl<0?T.red:T.textMut}}>{t.pnl>0?"+":""}{getCurrencySymbol()}{t.pnl.toFixed(0)}</div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* EMOTIONAL IMPACT */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,overflow:"hidden"}}>
        <div style={{marginBottom:4}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text}}>{t("dash.emotionalImpact")}</div>
          <div style={{fontSize:12,color:T.textSub,marginBottom:8}}>{t("dash.emotionalImpactSub")}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
          {allEmotionTags.map(tag => {
            const tradesWithTag = filteredTrades.filter(t => {
              return emotionTags[t.id] && emotionTags[t.id].includes(tag.id);
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
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:8}}>{t("dash.perfByDay")}</div>
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
                {[t("dash.day"),t("common.trades"),"% "+t("common.total"),t("common.winRate"),t("dash.avgGain"),t("dash.avgLossHdr"),t("dash.expectancy")].map(h=>(
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
                    <td style={{padding:"10px 14px",color:T.textSub,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{((dayTrades.length/Math.max(monthTrades.length,1))*100).toFixed(1)}%</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:dayTrades.length===0?T.textMut:(dayWinRate>=50?T.green:T.red),borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{dayWinRate}%</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:dayAvgWin===0?T.textMut:T.green,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{fmt(dayAvgWin,true)}</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:dayAvgLoss===0?T.textMut:T.red,borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{fmt(dayAvgLoss,true)}</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:(()=>{const v=dayPnL/Math.max(dayTrades.length,1);return v>0?T.green:v<0?T.red:T.textMut;})(),borderBottom:isHidden?`none`:`1px solid ${T.border}`}}>{fmt(dayPnL/Math.max(dayTrades.length,1),true)}</td>
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


