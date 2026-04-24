"use client";

import React, { useState, useEffect } from "react";
import { getCurrencySymbol } from "@/lib/userPrefs";

/* ─── TOKENS (OpenAI palette) ──────────────────────────────────────── */
const T = {
  white:   "#FFFFFF",
  bg:      "#FFFFFF",
  surface: "#FFFFFF",
  border:  "#E5E5E5",
  border2: "#D4D4D4",
  text:    "#0D0D0D",
  textSub: "#5C5C5C",
  textMut: "#8E8E8E",
  green:   "#10A37F",
  greenBg: "#E6F7F1",
  greenBd: "#A7E6CF",
  red:     "#EF4444",
  redBg:   "#FEF2F2",
  redBd:   "#FECACA",
  accent:  "#0D0D0D",
  accentBg: "#F0F0F0",
  accentBd: "#D4D4D4",
  amber:   "#F97316",
  amberBg: "#FFF4E6",
  blue:    "#3B82F6",
  blueBg:  "#EFF6FF",
};

const fmt = (n, sign=false) => `${sign && n>0?"+":""}${n<0?"-":""}${getCurrencySymbol()}${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

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

export default function StrategyDetailPage({ setPage = () => {} }) {
  const [trades, setTrades] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeStrategiesData, setTradeStrategiesData] = useState({});
  const [checkedRules, setCheckedRules] = useState({});

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      // ✅ Load from CORRECT keys (tr4de_trades, not apex_trades)
      const tradesData = localStorage.getItem('tr4de_trades');
      if (tradesData) {
        try {
          setTrades(JSON.parse(tradesData));
        } catch {
          // Fallback to apex_trades for backward compatibility
          const apexTrades = localStorage.getItem('apex_trades');
          if (apexTrades) setTrades(JSON.parse(apexTrades));
        }
      }

      const strategiesData = localStorage.getItem('tr4de_strategies');
      if (strategiesData) {
        try {
          setStrategies(JSON.parse(strategiesData));
        } catch {
          // Fallback to apex_strategies
          const apexStrats = localStorage.getItem('apex_strategies');
          if (apexStrats) setStrategies(JSON.parse(apexStrats));
        }
      }

      // Load trade-strategy mappings
      const mappingsData = localStorage.getItem('tr4de_trade_strategies');
      if (mappingsData) setTradeStrategiesData(JSON.parse(mappingsData));

      const checkedRulesData = localStorage.getItem('tr4de_checked_rules');
      if (checkedRulesData) setCheckedRules(JSON.parse(checkedRulesData));

      // Load selected strategy ID
      const selectedId = localStorage.getItem('selectedStrategyId');
      if (selectedId) {
        // First try tr4de_strategies, then apex_strategies
        let strats = [];
        try {
          const stored = localStorage.getItem('tr4de_strategies');
          strats = stored ? JSON.parse(stored) : [];
        } catch {
          const apexStrats = localStorage.getItem('apex_strategies');
          strats = apexStrats ? JSON.parse(apexStrats) : [];
        }
        
        if (strats.length > 0) {
          const found = strats.find(s => s.id == selectedId);
          if (found) setSelectedStrategy(found);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  }, []);

  // Filter trades by selected strategy
  const filteredTrades = selectedStrategy 
    ? trades.filter(t => {
        // Try multiple key formats for compatibility
        let strategyIds = [];
        
        // Format 1: Direct ID (UUID)
        if (t.id && tradeStrategiesData[t.id]) {
          strategyIds = tradeStrategiesData[t.id];
        }
        
        // Format 2: Composite key (no underscores)
        if (strategyIds.length === 0 && t.date && t.symbol && t.entry) {
          const compositeKey = `${t.date}${t.symbol}${t.entry}`;
          if (tradeStrategiesData[compositeKey]) {
            strategyIds = tradeStrategiesData[compositeKey];
          }
        }
        
        // Format 3: Normalized composite key
        if (strategyIds.length === 0 && t.date && t.symbol && t.entry) {
          const normalizedEntry = parseFloat(t.entry).toFixed(2);
          const normalizedKey = `${t.date}${t.symbol}${normalizedEntry}`;
          if (tradeStrategiesData[normalizedKey]) {
            strategyIds = tradeStrategiesData[normalizedKey];
          }
        }
        
        // Convert to string for reliable comparison
        return strategyIds.map(id => String(id)).includes(String(selectedStrategy.id));
      })
    : [];

  // GROUP TRADES BY RULE ADHERENCE
  // Get all rules from the strategy
  const allStrategyRules = selectedStrategy?.groups 
    ? selectedStrategy.groups.flatMap(g => g.rules || [])
    : [];
  
  // Function to get the count of checked rules for a specific trade
  const getCheckedRulesCount = (trade) => {
    let checkedCount = 0;
    let totalCount = 0;
    
    allStrategyRules.forEach(rule => {
      // Clé unique format: date_symbol_entry_exit_direction_stratId_ruleId
      const ruleKey = `${trade.date}_${trade.symbol}_${trade.entry}_${trade.exit || 'none'}_${trade.direction || 'long'}_${selectedStrategy.id}_${rule.id}`;
      totalCount++;
      if (checkedRules[ruleKey] === true) {
        checkedCount++;
      }
    });
    
    return { checkedCount, totalCount };
  };
  
  // Categorize trades: all rules checked vs without rules (partial or none) 
  const tradesGroupedByRuleState = {
    allChecked: [],      // All rules are checked
    none: []             // Partial or no rules checked
  };
  
  filteredTrades.forEach(trade => {
    const { checkedCount, totalCount } = getCheckedRulesCount(trade);
    
    // TOUTES les règles cochées?
    if (totalCount > 0 && checkedCount === totalCount) {
      tradesGroupedByRuleState.allChecked.push(trade);
    } else {
      // Sinon: partial ou aucune
      tradesGroupedByRuleState.none.push(trade);
    }
  });
  
  // Function to calculate stats for a group
  const getGroupStats = (tradeGroup) => {
    if (tradeGroup.length === 0) {
      return { wins: 0, losses: 0, winRate: 0, totalPnL: 0, avgPnL: 0 };
    }
    
    const wins = tradeGroup.filter(t => t.pnl > 0).length;
    const losses = tradeGroup.filter(t => t.pnl < 0).length;
    const totalPnL = tradeGroup.reduce((s, t) => s + t.pnl, 0);
    const winRate = ((wins / (wins + losses)) * 100).toFixed(1);
    const avgPnL = (totalPnL / tradeGroup.length).toFixed(2);
    
    return { wins, losses, winRate, totalPnL, avgPnL };
  };
  
  const statsAllChecked = getGroupStats(tradesGroupedByRuleState.allChecked);
  const statsNone = getGroupStats(tradesGroupedByRuleState.none);

  // Calculate stats
  const totalPnL = filteredTrades.reduce((s,t)=>s+t.pnl,0);
  const wins = filteredTrades.filter(t=>t.pnl>0);
  const losses = filteredTrades.filter(t=>t.pnl<0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = filteredTrades.length > 0 ? ((winCount/(winCount+lossCount))*100).toFixed(1) : 0;
  
  // IMPACT CALCULATION
  const winRateWithRules = parseFloat(statsAllChecked.winRate || 0);
  const allTradesWins = trades.filter(t => t.pnl > 0).length;
  const allTradesLosses = trades.filter(t => t.pnl < 0).length;
  const winRateWithoutRules = trades.length > 0 
    ? ((allTradesWins / (allTradesWins + allTradesLosses)) * 100).toFixed(1)
    : 0;
  const rulesImpact = (winRateWithRules - winRateWithoutRules).toFixed(1);
  const impactColor = rulesImpact > 0 ? T.green : T.red;

  const profitFactor = filteredTrades.length > 0 ? (wins.reduce((s,t)=>s+t.pnl,0)/Math.abs(losses.reduce((s,t)=>s+t.pnl,0)||1)).toFixed(2) : 0;
  const avgWin = wins.length ? wins.reduce((s,t)=>s+t.pnl,0)/wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s,t)=>s+t.pnl,0)/losses.length : 0;
  const maxWin = filteredTrades.length > 0 ? Math.max(...filteredTrades.map(t=>t.pnl)) : 0;
  const maxLoss = filteredTrades.length > 0 ? Math.min(...filteredTrades.map(t=>t.pnl)) : 0;

  // Calcul des statistiques par jour, heure, et symbole
  // Helper pour extraire l'heure : priorité à entryTime/entry_time (format "HH:MM[:SS]"),
  // fallback sur le timestamp de t.date si une heure y est encodée.
  const getTradeHour = (t) => {
    const timeStr = t.entryTime || t.entry_time;
    if (timeStr && typeof timeStr === "string") {
      const m = timeStr.match(/^(\d{1,2}):/);
      if (m) return parseInt(m[1], 10);
    }
    if (t.date) {
      const d = new Date(t.date);
      if (!isNaN(d.getTime()) && (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0)) {
        return d.getHours();
      }
    }
    return null;
  };
  const dayNameFr = (d) => {
    const days = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
    return days[d.getDay()];
  };

  // Stats agrégées par jour / heure / symbole
  const dayPnLAgg = {};
  const hourPnLAgg = {};
  const symbolPnLAgg = {};
  filteredTrades.forEach(t => {
    if (t.date) {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const day = dayNameFr(d);
        dayPnLAgg[day] = (dayPnLAgg[day] || 0) + (t.pnl || 0);
      }
    }
    const h = getTradeHour(t);
    if (h !== null) {
      const hourStr = `${String(h).padStart(2, '0')}h–${String((h + 1) % 24).padStart(2, '0')}h`;
      hourPnLAgg[hourStr] = (hourPnLAgg[hourStr] || 0) + (t.pnl || 0);
    }
    if (t.symbol) {
      symbolPnLAgg[t.symbol] = (symbolPnLAgg[t.symbol] || 0) + (t.pnl || 0);
    }
  });

  const pickBest = (agg) => {
    const entries = Object.entries(agg);
    if (entries.length === 0) return null;
    return entries.reduce((a, b) => b[1] > a[1] ? b : a);
  };
  const pickWorst = (agg) => {
    const entries = Object.entries(agg);
    if (entries.length === 0) return null;
    return entries.reduce((a, b) => b[1] < a[1] ? b : a);
  };

  const bd = pickBest(dayPnLAgg);
  const wd = pickWorst(dayPnLAgg);
  const bh = pickBest(hourPnLAgg);
  const wh = pickWorst(hourPnLAgg);
  const bs = pickBest(symbolPnLAgg);
  const ws = pickWorst(symbolPnLAgg);

  const bestDay   = { day:    bd ? bd[0] : "—", pnl: bd ? bd[1] : 0 };
  const worstDay  = { day:    wd && wd !== bd ? wd[0] : "—", pnl: wd ? wd[1] : 0 };
  const bestHour  = { hour:   bh ? bh[0] : "—", pnl: bh ? bh[1] : 0 };
  const worstHour = { hour:   wh && wh !== bh ? wh[0] : "—", pnl: wh ? wh[1] : 0 };
  const bestSymbol  = { symbol: bs ? bs[0] : "—", pnl: bs ? bs[1] : 0 };
  const worstSymbol = { symbol: ws && ws !== bs ? ws[0] : "—", pnl: ws ? ws[1] : 0 };

  // Early return if still loading or no strategy selected
  if (loading || !selectedStrategy) {
    return <div style={{padding:24}}>Chargement...</div>;
  }

  // RÈGLES WIN RATE CALCULATION
  const hasRules = selectedStrategy.groups && selectedStrategy.groups.some(g => g.rules && g.rules.length > 0);

  // MOST RELIABLE RULE CALCULATION
  const ruleStats = (() => {
    const stats = {};
    
    if (selectedStrategy.groups) {
      selectedStrategy.groups.forEach(group => {
        if (group.rules) {
          group.rules.forEach(rule => {
            stats[rule.text] = { wins: 0, losses: 0, pnl: 0, trades: [] };
          });
        }
      });
    }

    filteredTrades.forEach(trade => {
      // Simuler l'assignation des rules aux trades (pour demo, tous les trades utilisent les règles)
      Object.keys(stats).forEach(ruleName => {
        stats[ruleName].trades.push(trade);
        stats[ruleName].pnl += trade.pnl;
        if (trade.pnl > 0) {
          stats[ruleName].wins++;
        } else if (trade.pnl < 0) {
          stats[ruleName].losses++;
        }
      });
    });
    
    return stats;
  })();

  // Find most reliable rule
  const mostReliableRule = (() => {
    let best = null;
    let bestWinRate = -1;
    
    Object.entries(ruleStats).forEach(([ruleName, stats]) => {
      if (stats.trades.length > 0) {
        const winRate = stats.wins / (stats.wins + stats.losses) * 100;
        if (winRate > bestWinRate) {
          bestWinRate = winRate;
          best = { name: ruleName, winRate, wins: stats.wins, losses: stats.losses, pnl: stats.pnl, trades: stats.trades.length };
        }
      }
    });
    
    return best || { name: 'N/A', winRate: 0, wins: 0, losses: 0, pnl: 0, trades: 0 };
  })();

  // BEST PERFORMING RR AVG CALCULATION
  const rrStats = (() => {
    let totalRR = 0;
    let validTrades = 0;
    let bestRR = 0;
    let worstRR = Infinity;

    filteredTrades.forEach(trade => {
      const risk = Math.abs(trade.entry - trade.exit);
      const reward = Math.abs(trade.pnl);
      
      if (risk > 0) {
        const rr = reward / risk;
        totalRR += rr;
        validTrades++;
        
        if (rr > bestRR) bestRR = rr;
        if (rr < worstRR) worstRR = rr;
      }
    });

    const avgRR = validTrades > 0 ? (totalRR / validTrades).toFixed(2) : 0;
    
    return { avgRR, bestRR: bestRR.toFixed(2), worstRR: worstRR === Infinity ? 0 : worstRR.toFixed(2), trades: validTrades };
  })();

  // TRADEPATH PENTAGON SCORE CALCULATION
  const pentagonMetrics = (() => {
    // 1. Win % (0-100)
    const winPercent = parseFloat(winRate);

    // 2. Profit Factor (normalize to 0-100: 2.0+ = 100, 1.0 = 50, 0 = 0)
    const pf = parseFloat(profitFactor);
    const profitFactorScore = Math.min(100, (pf / 2) * 100);

    // 3. Win/Loss Ratio (normalize: 3.0+ = 100, 1.0 = 33, 0 = 0)
    const winLossRatio = winCount > 0 && lossCount > 0 ? winCount / lossCount : (winCount > 0 ? 100 : 0);
    const winLossScore = Math.min(100, (winLossRatio / 3) * 100);

    // 4. Consistency (std dev normalization - lower is better, so we invert)
    // Calculate consistency based on PnL variance
    const avgPnL = filteredTrades.length > 0 ? filteredTrades.reduce((s, t) => s + t.pnl, 0) / filteredTrades.length : 0;
    const variance = filteredTrades.length > 0 
      ? filteredTrades.reduce((s, t) => s + Math.pow(t.pnl - avgPnL, 2), 0) / filteredTrades.length 
      : 0;
    const stdDev = Math.sqrt(variance);
    // Consistency score: lower stdDev = higher score (invert and normalize)
    const consistencyScore = Math.max(0, 100 - (stdDev / Math.max(...filteredTrades.map(t => t.pnl), 1000) * 100));

    // 5. Rule Adherence (trades with rules / total trades * 100)
    const ruleAdherenceScore = trades.length > 0 
      ? ((filteredTrades.length / trades.length) * 100)
      : 0;

    // Calculate overall TradePath Score (average of all 5 metrics)
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

  // Pentagon Radar Component
  function PentagonRadar({ metrics, size = 320 }) {
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
    
    // Calculate pentagon points
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const normalizedValue = values[i] / 100;
      const x = center + radius * normalizedValue * Math.cos(angle);
      const y = center + radius * normalizedValue * Math.sin(angle);
      points.push({ x, y, value: values[i], label: labels[i], angle });
    }

    // Background pentagon (100%)
    const bgPoints = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      bgPoints.push(`${x},${y}`);
    }

    return (
      <svg width={size} height={size} style={{display:"block",margin:"0 auto"}}>
        {/* Background grid */}
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
              stroke={T.border2}
              strokeWidth="1"
              opacity="0.7"
            />
          );
        })}

        {/* Axes lines */}
        {points.map((p, i) => (
          <line key={`axis-${i}`} x1={center} y1={center} x2={p.x} y2={p.y} stroke={T.border2} strokeWidth="1" opacity="0.5" />
        ))}

        {/* Data polygon */}
        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(" ")}
          fill={`${selectedStrategy.color}20`}
          stroke={selectedStrategy.color}
          strokeWidth="2"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r="5"
            fill={selectedStrategy.color}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {/* Labels */}
        {points.map((p, i) => {
          const labelRadius = radius + 35;
          const labelAngle = p.angle;
          const labelX = center + labelRadius * Math.cos(labelAngle);
          const labelY = center + labelRadius * Math.sin(labelAngle);
          
          return (
            <g key={`label-${i}`}>
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="600"
                fill={T.textMut}
                style={{pointerEvents:"none"}}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // SemiCircle Component
  function SemiCircle({ percentage, color, size = 200 }) {
    const radius = size / 2 - 10;
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <svg width={size} height={size / 2 + 20} style={{display:"block"}}>
        {/* Background semicircle */}
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          stroke={T.border}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress semicircle */}
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{transition:"stroke-dashoffset 0.6s ease"}}
        />
      </svg>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}} className="anim-1">
      {/* HEADER WITH BACK BUTTON */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
        <button
          onClick={() => setPage('strategies')}
          style={{
            padding:"6px 12px",
            fontSize:13,
            border:`1px solid ${T.border}`,
            background:T.white,
            borderRadius:8,
            cursor:"pointer",
            color:T.textSub,
            fontFamily:"var(--font-sans)",
            fontWeight:500,
          }}
        >← Retour</button>
        <div>
          <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:10,height:10,borderRadius:"50%",background:selectedStrategy.color}}/>
            {selectedStrategy.name}
          </h1>
          {selectedStrategy.description && (
            <p style={{fontSize:12,color:T.textMut,marginTop:2,marginBottom:0,fontFamily:"var(--font-sans)"}}>{selectedStrategy.description}</p>
          )}
        </div>
      </div>

      {/* CARD 1 : 4 KPIs separes */}
      {filteredTrades.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>

            {/* 1. P&L Net */}
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px"}}>
              <div style={{fontSize:12,color:T.textSub,marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>
                P&L Net <span style={{color:T.textMut}}>›</span>
              </div>
              <div style={{fontSize:22,fontWeight:600,color:totalPnL >= 0 ? T.green : T.red,letterSpacing:-0.2,lineHeight:1.1,marginBottom:6}}>
                {fmt(totalPnL,true)}
              </div>
              <div style={{fontSize:11,color:T.textMut}}>{filteredTrades.length} trades</div>
            </div>

            {/* 2. Taux de Victoire */}
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px"}}>
              <div style={{fontSize:12,color:T.textSub,marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>
                Taux de victoire <span style={{color:T.textMut}}>›</span>
              </div>
              <div style={{fontSize:22,fontWeight:600,color:T.text,letterSpacing:-0.2,lineHeight:1.1,marginBottom:6}}>
                {winRate}%
              </div>
              <div style={{fontSize:11,color:T.textMut}}>{winCount}W · {lossCount}L</div>
            </div>

            {/* 3. Meilleur vs Pire (compact) */}
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px"}}>
              <div style={{fontSize:12,color:T.textSub,marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>
                Meilleur vs pire <span style={{color:T.textMut}}>›</span>
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:6,lineHeight:1.1,marginBottom:6}}>
                <span style={{fontSize:18,fontWeight:600,color:T.green,letterSpacing:-0.2}}>{fmt(maxWin)}</span>
                <span style={{fontSize:11,color:T.textMut,fontWeight:500}}>/</span>
                <span style={{fontSize:18,fontWeight:600,color:T.red,letterSpacing:-0.2}}>{fmt(maxLoss)}</span>
              </div>
              <div style={{fontSize:11,color:T.textMut}}>Plus haut / plus bas</div>
            </div>

            {/* 4. Suivi Regles (ou stat de fallback) */}
            {hasRules ? (
              <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:12,color:T.textSub,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>
                    Suivi des règles <span style={{color:T.textMut}}>›</span>
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color:impactColor,padding:"2px 6px",borderRadius:999,background:impactColor+"15"}}>
                    {rulesImpact > 0 ? "+" : ""}{rulesImpact}%
                  </span>
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:6,lineHeight:1.1,marginBottom:6}}>
                  <span style={{fontSize:18,fontWeight:600,color:T.text,letterSpacing:-0.2}}>{statsAllChecked.winRate}%</span>
                  <span style={{fontSize:11,color:T.textMut,fontWeight:500}}>vs</span>
                  <span style={{fontSize:18,fontWeight:600,color:T.textSub,letterSpacing:-0.2}}>{statsNone.winRate}%</span>
                </div>
                <div style={{fontSize:11,color:T.textMut}}>Avec règles / sans règles</div>
              </div>
            ) : (
              <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px"}}>
                <div style={{fontSize:12,color:T.textSub,marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>
                  Volume <span style={{color:T.textMut}}>›</span>
                </div>
                <div style={{fontSize:22,fontWeight:600,color:T.text,letterSpacing:-0.2,lineHeight:1.1,marginBottom:6}}>
                  {filteredTrades.length}
                </div>
                <div style={{fontSize:11,color:T.textMut}}>trades exécutés</div>
              </div>
            )}

        </div>
      )}

      {/* CARDS 2 + 3 : cote a cote avec gap */}
      {filteredTrades.length > 0 && (
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"stretch"}}>
        {/* CARD 2 : Condition probabilite */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:13,fontWeight:600,color:T.text,display:"inline-flex",alignItems:"center",gap:4}}>
              Condition probabilité <span style={{color:T.textMut,fontWeight:500}}>›</span>
            </div>
            <div style={{fontSize:11,color:T.textMut,marginTop:2}}>Meilleurs et pires créneaux pour cette stratégie</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
            {/* BEST */}
            <div style={{padding:16,borderRight:`1px solid ${T.border}`}}>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:500}}>Meilleur jour</div>
                  <div style={{fontSize:15,fontWeight:600,color:T.text}}>{bestDay.day}</div>
                </div>
                <div style={{paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:500}}>Meilleure fenêtre</div>
                  <div style={{fontSize:15,fontWeight:600,color:T.text}}>{bestHour.hour}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:500}}>Meilleur asset</div>
                  <div style={{fontSize:15,fontWeight:600,color:T.text}}>{bestSymbol.symbol}</div>
                </div>
              </div>
            </div>
            {/* WORST */}
            <div style={{padding:16}}>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:500}}>Pire jour</div>
                  <div style={{fontSize:15,fontWeight:600,color:T.text}}>{worstDay.day}</div>
                </div>
                <div style={{paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:500}}>Pire fenêtre</div>
                  <div style={{fontSize:15,fontWeight:600,color:T.text}}>{worstHour.hour}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:500}}>Pire asset</div>
                  <div style={{fontSize:15,fontWeight:600,color:T.text}}>{worstSymbol.symbol}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3 : tr4de score */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:13,fontWeight:600,color:T.text,display:"inline-flex",alignItems:"center",gap:4}}>
              tr4de score <span style={{color:T.textMut,fontWeight:500}}>›</span>
            </div>
            <div style={{fontSize:11,color:T.textMut,marginTop:2}}>Performance globale de la stratégie</div>
          </div>
          <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"center"}}>
              <PentagonRadar metrics={pentagonMetrics} size={280} />
            </div>
            <div>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"baseline",gap:5}}>
                  <span style={{fontSize:20,fontWeight:600,color:T.text,letterSpacing:-0.2,lineHeight:1}}>{pentagonMetrics.overallScore}</span>
                  <span style={{fontSize:12,color:T.textMut,fontWeight:500}}>/ 100</span>
                </div>
                <span style={{fontSize:11,color:T.textMut,fontWeight:500}}>Score global</span>
              </div>
              <div style={{width:"100%",height:4,background:"#F0F0F0",borderRadius:2,overflow:"hidden"}}>
                <div
                  style={{
                    width:`${parseFloat(pentagonMetrics.overallScore)}%`,
                    height:"100%",
                    background:T.green,
                    transition:"width 0.6s ease",
                    borderRadius:2,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* EMPTY STATE */}
      {filteredTrades.length === 0 && (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"80px 40px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:600,marginBottom:8,color:T.text}}>Aucun trade pour cette stratégie</div>
          <p style={{color:T.textSub,marginBottom:20}}>Assignez des trades à cette stratégie depuis la page "Trades" pour voir les statistiques ici.</p>
          <button
            onClick={() => setPage('trades')}
            style={{padding:"10px 20px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}
          >Aller aux trades</button>
        </div>
      )}
    </div>
  );
}
