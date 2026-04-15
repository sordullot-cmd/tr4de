"use client";

import React, { useState, useEffect } from "react";

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

export default function StrategyDetailPage({ setPage = () => {} }) {
  const [trades, setTrades] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedRules, setCheckedRules] = useState({});

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const tradesData = localStorage.getItem('apex_trades');
      if (tradesData) setTrades(JSON.parse(tradesData));

      const strategiesData = localStorage.getItem('apex_strategies');
      if (strategiesData) setStrategies(JSON.parse(strategiesData));

      const checkedRulesData = localStorage.getItem('tr4de_checked_rules');
      if (checkedRulesData) setCheckedRules(JSON.parse(checkedRulesData));

      // Load selected strategy ID
      const selectedId = localStorage.getItem('selectedStrategyId');
      if (selectedId && strategiesData) {
        const strats = JSON.parse(strategiesData);
        const found = strats.find(s => s.id == selectedId);
        if (found) setSelectedStrategy(found);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  }, []);

  // Load trade-strategy mappings
  const tradeStrategiesData = (() => {
    try {
      const saved = localStorage.getItem('tr4de_trade_strategies');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  })();

  // Filter trades by selected strategy
  const filteredTrades = selectedStrategy 
    ? trades.filter(t => {
        const tradeId = t.date + t.symbol + t.entry;
        const strategyIds = tradeStrategiesData[tradeId] || [];
        return strategyIds.includes(selectedStrategy.id);
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
  const bestDay = (() => {
    const dayPnL = {};
    filteredTrades.forEach(t => {
      const day = t.date ? new Date(t.date).toLocaleDateString('en-US', {weekday:'long'}) : 'Unknown';
      dayPnL[day] = (dayPnL[day] || 0) + t.pnl;
    });
    const best = Object.entries(dayPnL).reduce((a, b) => a[1] > b[1] ? a : b, ['N/A', 0]);
    return { day: best[0], pnl: best[1] };
  })();

  const worstDay = (() => {
    const dayPnL = {};
    filteredTrades.forEach(t => {
      const day = t.date ? new Date(t.date).toLocaleDateString('en-US', {weekday:'long'}) : 'Unknown';
      dayPnL[day] = (dayPnL[day] || 0) + t.pnl;
    });
    const worst = Object.entries(dayPnL).reduce((a, b) => a[1] < b[1] ? a : b, ['N/A', 0]);
    return { day: worst[0], pnl: worst[1] };
  })();

  const bestHour = (() => {
    const hourPnL = {};
    filteredTrades.forEach(t => {
      const hour = t.date ? new Date(t.date).getHours() : -1;
      const hourStr = hour >= 0 ? `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00` : 'Unknown';
      hourPnL[hourStr] = (hourPnL[hourStr] || 0) + t.pnl;
    });
    const best = Object.entries(hourPnL).reduce((a, b) => a[1] > b[1] ? a : b, ['N/A', 0]);
    return { hour: best[0], pnl: best[1] };
  })();

  const worstHour = (() => {
    const hourPnL = {};
    filteredTrades.forEach(t => {
      const hour = t.date ? new Date(t.date).getHours() : -1;
      const hourStr = hour >= 0 ? `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00` : 'Unknown';
      hourPnL[hourStr] = (hourPnL[hourStr] || 0) + t.pnl;
    });
    const worst = Object.entries(hourPnL).reduce((a, b) => a[1] < b[1] ? a : b, ['N/A', 0]);
    return { hour: worst[0], pnl: worst[1] };
  })();

  const bestSymbol = (() => {
    const symbolPnL = {};
    filteredTrades.forEach(t => {
      symbolPnL[t.symbol] = (symbolPnL[t.symbol] || 0) + t.pnl;
    });
    const best = Object.entries(symbolPnL).reduce((a, b) => a[1] > b[1] ? a : b, ['N/A', 0]);
    return { symbol: best[0], pnl: best[1] };
  })();

  const worstSymbol = (() => {
    const symbolPnL = {};
    filteredTrades.forEach(t => {
      symbolPnL[t.symbol] = (symbolPnL[t.symbol] || 0) + t.pnl;
    });
    const worst = Object.entries(symbolPnL).reduce((a, b) => a[1] < b[1] ? a : b, ['N/A', 0]);
    return { symbol: worst[0], pnl: worst[1] };
  })();

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
            padding:"8px 12px",
            fontSize:14,
            border:`1px solid ${T.border}`,
            background:T.white,
            borderRadius:6,
            cursor:"pointer",
            color:T.textSub
          }}
        >← Retour</button>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:16,height:16,borderRadius:"50%",background:selectedStrategy.color}}/>
            {selectedStrategy.name}
          </h1>
          <p style={{fontSize:13,color:T.textMut,marginTop:4}}>{selectedStrategy.description}</p>
        </div>
      </div>

      {/* MAIN 4-COLUMN METRICS */}
      {filteredTrades.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          
          {/* 1. NET P&L */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:10,color:T.textMut,marginBottom:10,fontWeight:600,textTransform:"uppercase"}}>P&L Net</div>
            <div style={{fontSize:26,fontWeight:700,color:totalPnL >= 0 ? T.green : T.red,marginBottom:8}}>{fmt(totalPnL,true)}</div>
            <div style={{fontSize:11,color:T.textMut}}>Total: {filteredTrades.length} trades</div>
          </div>

          {/* 2. SUIVI RÈGLES - 2 GROUPS (WITH vs WITHOUT RULES) */}
          {hasRules && (
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:10,color:T.textMut,fontWeight:600,textTransform:"uppercase"}}>Suivi Règles</div>
                <div style={{display:"flex",alignItems:"center",gap:6,background:impactColor+"20",border:`1px solid ${impactColor}`,borderRadius:6,padding:"4px 8px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:impactColor}}>
                    {rulesImpact > 0 ? "+" : ""}{rulesImpact}%
                  </div>
                </div>
              </div>
              
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {/* WITH RULES */}
                <div style={{borderRight:`1px solid ${T.border}`,paddingRight:12}}>
                  <div style={{fontSize:8,fontWeight:600,color:T.textMut,textTransform:"uppercase",marginBottom:8}}>Avec Règles</div>
                  <div style={{fontSize:20,fontWeight:700,color:statsAllChecked.totalPnL >= 0 ? T.green : T.red,marginBottom:4}}>
                    {statsAllChecked.winRate}%
                  </div>
                  <div style={{fontSize:9,color:T.textMut}}>
                    {statsAllChecked.wins}W / {statsAllChecked.losses}L
                  </div>
                </div>

                {/* WITHOUT RULES */}
                <div style={{paddingLeft:12}}>
                  <div style={{fontSize:8,fontWeight:600,color:T.textMut,textTransform:"uppercase",marginBottom:8}}>Sans Règles</div>
                  <div style={{fontSize:20,fontWeight:700,color:statsNone.totalPnL >= 0 ? T.green : T.red,marginBottom:4}}>
                    {statsNone.winRate}%
                  </div>
                  <div style={{fontSize:9,color:T.textMut}}>
                    {statsNone.wins}W / {statsNone.losses}L
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. MEILLEUR VS PIRE */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:10,color:T.textMut,marginBottom:12,fontWeight:600,textTransform:"uppercase"}}>Meilleur vs Pire Trade</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {/* BEST TRADE */}
              <div style={{background:`${T.green}15`,border:`1px solid ${T.green}30`,borderRadius:8,padding:14,textAlign:"center"}}>
                <div style={{fontSize:9,color:T.green,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Meilleur Trade</div>
                <div style={{fontSize:20,fontWeight:700,color:T.green}}>{fmt(maxWin)}</div>
              </div>
              {/* WORST TRADE */}
              <div style={{background:`${T.red}15`,border:`1px solid ${T.red}30`,borderRadius:8,padding:14,textAlign:"center"}}>
                <div style={{fontSize:9,color:T.red,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Pire Trade</div>
                <div style={{fontSize:20,fontWeight:700,color:T.red}}>{fmt(maxLoss)}</div>
              </div>
            </div>
          </div>

          {/* 4. WIN RATE */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:10,color:T.textMut,marginBottom:10,fontWeight:600,textTransform:"uppercase"}}>Taux de Victoire</div>
            <div style={{fontSize:26,fontWeight:700,color:T.text,marginBottom:8}}>{winRate}%</div>
            <div style={{fontSize:11,color:T.textMut}}>
              {winCount} gains / {lossCount} pertes
            </div>
          </div>

        </div>
      )}



      {/* TRADEPATH SCORE + CONDITIONS SIDE BY SIDE */}
      {filteredTrades.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {/* CONDITION PROBABILITÉ */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:16,borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>Condition probabilité</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              {/* BEST CONDITIONS - LEFT SIDE (GREEN) */}
              <div style={{padding:16}}>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {/* BEST DAY */}
                <div style={{paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:600,textTransform:"uppercase"}}>Meilleur jour</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{bestDay.day}</div>
                </div>
                {/* BEST HOUR */}
                <div style={{paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:600,textTransform:"uppercase"}}>Meilleure fenêtre</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{bestHour.hour}</div>
                </div>
                {/* BEST SYMBOL */}
                <div>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:600,textTransform:"uppercase"}}>Meilleur asset</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{bestSymbol.symbol}</div>
                </div>
              </div>
            </div>

            {/* WORST CONDITIONS - RIGHT SIDE (RED) */}
            <div style={{padding:16}}>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {/* WORST DAY */}
                <div style={{paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:600,textTransform:"uppercase"}}>Pire jour</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{worstDay.day}</div>
                </div>
                {/* WORST HOUR */}
                <div style={{paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:600,textTransform:"uppercase"}}>Pire fenêtre</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{worstHour.hour}</div>
                </div>
                {/* WORST SYMBOL */}
                <div>
                  <div style={{fontSize:11,color:T.textMut,marginBottom:6,fontWeight:600,textTransform:"uppercase"}}>Pire asset</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{worstSymbol.symbol}</div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* TRADEPATH PENTAGON SCORE */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:24}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"flex-start",alignItems:"center",marginBottom:24}}>
              <h3 style={{fontSize:14,fontWeight:700,color:T.text}}>tr4de score</h3>
            </div>

            {/* Pentagon Chart - Centered */}
            <div style={{marginBottom:32}}>
              <PentagonRadar metrics={pentagonMetrics} size={320} />
            </div>

            {/* Divider Line */}
            <div style={{borderTop:`1px solid ${T.border}`,marginBottom:16}}/>

            {/* Overall Score Bar */}
            <div style={{display:"flex",flexDirection:"row",gap:16,alignItems:"center"}}>
              {/* Score Block */}
              <div style={{display:"flex",flexDirection:"column",gap:4,paddingRight:16,borderRight:`1px solid ${T.border}`}}>
                <div style={{fontSize:11,color:T.textMut,fontWeight:600,textTransform:"uppercase"}}>Votre tr4de score</div>
                <div style={{fontSize:28,fontWeight:700,color:selectedStrategy.color}}>{pentagonMetrics.overallScore}</div>
              </div>

              {/* Progress Bar */}
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{width:"100%",height:12,background:T.border,borderRadius:6,overflow:"hidden"}}>
                  <div 
                    style={{
                      width:`${parseFloat(pentagonMetrics.overallScore)}%`,
                      height:"100%",
                      background:selectedStrategy.color,
                      transition:"width 0.6s ease",
                      borderRadius:6
                    }}
                  />
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.textMut}}>
                  <span>0</span>
                  <span>20</span>
                  <span>40</span>
                  <span>60</span>
                  <span>80</span>
                  <span>100</span>
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
