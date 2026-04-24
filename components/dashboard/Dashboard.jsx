"use client";

import React, { useState, useEffect, useRef } from "react";
import { parseCSV, calculateStats } from "@/lib/csvParsers";
import TradeValidator from "@/components/trade/TradeValidator";
import TradingAccountsPage from "@/components/pages/TradingAccountsPage";
import { useTradingAccounts } from "@/lib/hooks/useTradingAccounts";
import AccountSelector from "@/components/AccountSelector";
import AIReportSummaryCard from "@/components/AIReportSummaryCard";
import { getCurrencySymbol } from "@/lib/userPrefs";

/* ─── TOKENS (OpenAI palette) ──────────────────────────────────────── */
const T = {
  white:   "#FFFFFF",
  bg:      "#FAFAFA",
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
  accentBg:"#F0F0F0",
  accentBd:"#D4D4D4",
  amber:   "#F97316",
  amberBg: "#FFF4E6",
  blue:    "#3B82F6",
  blueBg:  "#EFF6FF",
};

const css = ` @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; color: ${T.text}; font-family: var(--font-sans); min-height: 100vh; font-size: 13px; }
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

const fmt = (n, sign=false) => `${sign && n>0?"+":""}${getCurrencySymbol()}${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

function Pill({ children, color="gray", small }) {
  const map = {
    green: { bg:T.greenBg, bd:T.greenBd, txt:T.green },
    red:   { bg:T.redBg,   bd:T.redBd,   txt:T.red   },
    blue:  { bg:T.blueBg,  bd:"#BFDBFE",  txt:T.blue  },
    gray:  { bg:T.bg,      bd:T.border,   txt:T.textSub },
  };
  const s = map[color] || map.gray;
  return <span style={{display:"inline-flex", alignItems:"center", padding: small ? "1px 7px" : "3px 10px", borderRadius: 20, fontSize: small ? 11 : 12, fontWeight: 500, background: s.bg, border: `1px solid ${s.bd}`, color: s.txt,}}>{children}</span>;
}

function TradingViewChart({ trade }) {
  return null; // Removed chart component
}

function Dashboard({ trades = [], setPage }) {
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

  // Calendar heatmap for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
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

  // P&L curve
  const sortedTrades = [...trades].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const pnlCurve = [];
  let cum = 0;
  sortedTrades.forEach((t,i)=>{
    cum += t.pnl;
    pnlCurve.push({cum, pnl:t.pnl});
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
  const dayLabelsFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24,fontFamily:"var(--font-sans)"}} className="anim-fade-up">
      {/* HEADER */}
      <div>
        <h1 style={{fontSize:24,fontWeight:700,color:T.text,margin:0,letterSpacing:-0.2}}>Tableau de bord</h1>
        <p style={{fontSize:13,color:T.textSub,marginTop:4}}>Vue d&apos;ensemble de tes performances de trading</p>
      </div>

      {/* KPI CARDS - 4 COLUMNS (style OpenAI: bordure fine, valeur 28px, label uppercase muted) */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Profit Factor",value:profitFactor,subtext:"Ratio gains / pertes"},
          {label:"Win Rate",value:`${winRate}%`,subtext:`${winCount}W · ${lossCount}L`},
          {label:"Avg Win/Loss",value:(Math.abs(avgWin)/Math.abs(avgLoss||1)).toFixed(2),subtext:`${fmt(avgWin,true)} / ${fmt(avgLoss,true)}`},
          {label:"P&L Total",value:fmt(totalPnL,true),subtext:`${trades.length} trades`,color:totalPnL>=0?T.green:T.red}
        ].map((stat,i)=>(
          <div key={i} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"18px 20px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:11,color:T.textMut,marginBottom:10,fontWeight:500,letterSpacing:"0.4px",textTransform:"uppercase"}}>{stat.label}</div>
            <div style={{fontSize:26,fontWeight:600,color:stat.color||T.text,marginBottom:6,lineHeight:1.1}}>{stat.value}</div>
            <div style={{fontSize:11,color:T.textSub}}>{stat.subtext}</div>
          </div>
        ))}
      </div>

      {/* AI REPORT SUMMARY */}
      <AIReportSummaryCard onOpenReports={setPage ? () => setPage("agent") : undefined} />

      {/* CHARTS SECTION */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
        {/* P&L Curve */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <div style={{marginBottom:20}}>
            <h3 style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:4}}>Cumulative P&L</h3>
            <p style={{fontSize:10,color:T.textSub}}>Evolution of your trading performance</p>
          </div>
          <div style={{height:200,display:"flex",alignItems:"flex-end",gap:"0.5px",background:T.bg,borderRadius:8,padding:"16px 8px"}}>
            {pnlCurve.map((p,i)=>{
              const maxCum = Math.max(...pnlCurve.map(x=>Math.abs(x.cum)), 1);
              const ratio = Math.max(0.02, Math.abs(p.cum) / maxCum);
              return <div key={i} style={{flex:1,height:`${ratio*100}%`,background:p.cum>=0?T.green:T.red,opacity:0.6,borderRadius:"1px 1px 0 0"}}/>;
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <h3 style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:16}}>Key Metrics</h3>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[
              {label:"Expectancy",value:fmt(totalPnL/trades.length,true)},
              {label:"Profit Factor",value:profitFactor},
              {label:"Best Trade",value:fmt(maxWin,true),color:T.green},
              {label:"Worst Trade",value:fmt(maxLoss,true),color:T.red}
            ].map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontSize:11,color:T.textSub}}>{m.label}</span>
                <span style={{fontSize:12,fontWeight:600,color:m.color||T.text}}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* THREE COLUMN SECTION */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        {/* Calendar */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <h3 style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:16}}>{new Date(year,month).toLocaleString('en-US',{month:'long'})}</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {["S","M","T","W","T","F","S"].map(d=>(
              <div key={d} style={{fontSize:9,fontWeight:600,color:T.textMut,textAlign:"center",height:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{d}</div>
            ))}
            {calendarDays.map((day,i)=>{
              if (!day) return <div key={i} style={{aspect:"1"}}/>;
              const pnl = dayPnLMap[day]||0;
              const maxDayPnL = Math.max(...Object.values(dayPnLMap), 1);
              const bgColor = pnl > 0 ? T.green : pnl < 0 ? T.red : T.border;
              const opacity = Math.abs(pnl) / Math.abs(maxDayPnL);
              return <div key={i} style={{aspect:"1",background:bgColor,opacity:Math.max(0.15,opacity*0.7),borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:500,color:T.text}}>{day}</div>;
            })}
          </div>
        </div>

        {/* Recent Trades */}
        <div style={{background:T.white,borderRadius:12,padding:"24px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)",overflow:"hidden"}}>
          <h3 style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:16}}>Recent Trades</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:220,overflowY:"auto"}}>
            {[...trades].reverse().slice(0,5).map((t,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:T.text}}>{t.symbol}</div>
                  <div style={{fontSize:10,color:T.textSub}}>{t.date}</div>
                </div>
                <div style={{fontSize:11,fontWeight:600,color:t.pnl>=0?T.green:T.red}}>{t.pnl>=0?"+":""}${t.pnl.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Profit by Hour */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <h3 style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:16}}>Profit by Hour</h3>
          <div style={{height:140,display:"flex",alignItems:"flex-end",gap:1,background:T.bg,borderRadius:8,padding:"12px 4px"}}>
            {Array.from({length:24},(_, h)=>{
              const p = pnlByHour[h] || 0;
              const maxHourPnL = Math.max(...Object.values(pnlByHour), 1);
              const ratio = Math.max(0.02, Math.abs(p) / Math.abs(maxHourPnL));
              return <div key={h} style={{flex:1,height:`${ratio*100}%`,background:p>0?T.green:p<0?T.red:T.border,opacity:0.6,borderRadius:"1px 1px 0 0"}}/>;
            })}
          </div>
          <div style={{fontSize:9,color:T.textMut,marginTop:8,textAlign:"center"}}>UTC Hours</div>
        </div>
      </div>

      {/* STATISTICS TABLE */}
      <div style={{background:T.white,borderRadius:12,boxShadow:"0 1px 2px rgba(0,0,0,0.04)",overflow:"hidden"}}>
        <div style={{padding:"24px",borderBottom:`1px solid ${T.border}`}}>
          <h3 style={{fontSize:12,fontWeight:600,color:T.text}}>Performance by Day of Week</h3>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${T.border}`,background:T.bg}}>
                {["Day","Trades","Win %","Total P&L","Avg P&L"].map(h=>(
                  <th key={h} style={{padding:"12px 20px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dayLabelsFull.map((day,idx)=>{
                const dayTrades = pnlByDay[idx] || [];
                const dayPnL = dayTrades.reduce((s,t)=>s+t.pnl,0);
                const dayWins = dayTrades.filter(t=>t.pnl>0).length;
                const dayWinRate = dayTrades.length ? ((dayWins/dayTrades.length)*100).toFixed(0) : "-";
                return (
                  <tr key={day} style={{borderBottom:`1px solid ${T.border}`,background:idx%2===0?T.bg:"transparent"}}>
                    <td style={{padding:"12px 20px",fontSize:11,fontWeight:600}}>{day}</td>
                    <td style={{padding:"12px 20px",fontSize:11,color:T.textSub}}>{dayTrades.length}</td>
                    <td style={{padding:"12px 20px",fontSize:11,fontWeight:600,color:dayWinRate>=50?T.green:T.red}}>{dayWinRate}%</td>
                    <td style={{padding:"12px 20px",fontSize:11,fontWeight:600,color:dayPnL>=0?T.green:T.red}}>{dayPnL>=0?"+":""}${dayPnL.toFixed(0)}</td>
                    <td style={{padding:"12px 20px",fontSize:11,color:T.textSub}}>{dayTrades.length>0?fmt(dayPnL/dayTrades.length,true):"-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SYMBOL ANALYSIS */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <h3 style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:16}}>Top Symbols</h3>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {topSymbols.map(([sym,data],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:10,borderBottom:`1px solid ${T.border}`}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:T.text}}>{sym}</div>
                  <div style={{fontSize:11,color:T.textSub}}>{data.trades} trades · {((data.wins/data.trades)*100).toFixed(0)}% win</div>
                </div>
                <div style={{fontSize:12,fontWeight:600,color:data.pnl>=0?T.green:T.red}}>{data.pnl>=0?"+":""}${data.pnl.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <h3 style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:16}}>Win/Loss Summary</h3>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:T.green,marginBottom:8}}>Winning Trades</div>
              <div style={{fontSize:24,fontWeight:700,color:T.green,marginBottom:4}}>{fmt(wins.reduce((s,t)=>s+t.pnl,0),true)}</div>
              <div style={{fontSize:11,color:T.textSub}}>{winCount} trades</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:T.red,marginBottom:8}}>Losing Trades</div>
              <div style={{fontSize:24,fontWeight:700,color:T.red,marginBottom:4}}>{fmt(losses.reduce((s,t)=>s+t.pnl,0),true)}</div>
              <div style={{fontSize:11,color:T.textSub}}>{lossCount} trades</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TradesPage({ trades = [], strategies = [], onImportClick }) {
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState("notes");
  const [tradeNotes, setTradeNotes] = useState(() => {
    // Charger les notes depuis localStorage au démarrage
    try {
      const saved = localStorage.getItem("trade_notes");
      if (saved) {
        const parsed = JSON.parse(saved);
        const obj = {};
        parsed.forEach(item => {
          obj[item.trade_key] = item.notes;
        });
        console.log("✅ Notes chargées depuis localStorage:", Object.keys(obj).length, "notes");
        return obj;
      }
    } catch (err) {
      console.warn("Erreur loading notes from localStorage:", err);
    }
    return {};
  });
  const [tradeStrategies, setTradeStrategies] = useState({});
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [checkedRules, setCheckedRules] = useState({});
  const [emotionState, setEmotionState] = useState({});
  const [expandedStrategyId, setExpandedStrategyId] = useState(null);

  if (!trades || trades.length === 0) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
        <div style={{fontSize:18,fontWeight:700}}>📈 Trades</div>
        <div style={{background:T.white,border:`2px dashed ${T.accent}`,borderRadius:12,padding:"48px 24px",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:600,marginBottom:8,color:T.text}}>📥 Aucun trade importé</div>
          <p style={{color:T.textSub,marginBottom:20}}>Importez vos trades pour commencer à analyser vos performances</p>
          <button onClick={onImportClick} style={{padding:"12px 24px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>📂 Importer des trades</button>
        </div>
      </div>
    );
  }

  // Calculate symbol statistics
  const symbolStats = {};
  trades.forEach(t => {
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

  const totalPnL = trades.reduce((s,t)=>s+t.pnl,0);
  const totalWins = trades.filter(t=>t.pnl>0).length;
  const winRate = ((totalWins/trades.length)*100).toFixed(0);
  const symbolCount = Object.keys(symbolStats).length;

  const topSymbol = Object.entries(symbolStats).sort((a,b)=>b[1].totalPnL-a[1].totalPnL)[0];

  // Helper to create unique trade ID
  const getTradeId = (trade) => `${trade.date}|${trade.symbol}|${trade.entry}|${trade.exit}|${trade.direction}`;

  const emotionTags = [
    {id:"fomo",label:"FOMO",color:"#EF4444"},
    {id:"revenge",label:"Revenge",color:"#EF4444"},
    {id:"overconfident",label:"Overconfident",color:"#F59E0B"},
    {id:"hesitation",label:"Hesitation",color:"#F59E0B"},
    {id:"calm",label:"Calm & focused",color:"#22C55E"},
    {id:"followed",label:"Followed plan",color:"#22C55E"},
    {id:"boredom",label:"Boredom trade",color:"#3B82F6"},
    {id:"early",label:"Early exit",color:"#9333EA"},
  ];

  return (
    <div style={{display:"flex",gap:16}} className="anim-1">
      {/* LEFT - TRADES LIST & STATS */}
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:20,fontWeight:700}}>Trade Log</div>
          <button onClick={onImportClick} style={{padding:"8px 16px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ New Trade</button>
        </div>

        {/* TOP STATS CARDS */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {/* Best Symbol */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:11,color:T.textMut,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Best Symbol</div>
            <div style={{fontSize:24,fontWeight:700,color:T.text,marginBottom:4,fontFamily:"DM Mono"}}>{bestSymbol || "-"}</div>
            <div style={{fontSize:12,fontWeight:700,color:T.green}}>{fmt(bestPnL,true)}</div>
          </div>

          {/* Worst Symbol */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:11,color:T.textMut,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Worst Symbol</div>
            <div style={{fontSize:24,fontWeight:700,color:T.text,marginBottom:4,fontFamily:"DM Mono"}}>{worstSymbol || "-"}</div>
            <div style={{fontSize:12,fontWeight:700,color:T.red}}>{fmt(worstPnL,true)}</div>
          </div>

          {/* Win Rate */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:11,color:T.textMut,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Win Rate</div>
            <div style={{fontSize:24,fontWeight:700,color:T.text,marginBottom:4}}>{winRate}%</div>
            <div style={{fontSize:12,color:T.textMut}}>Wins: {totalWins} | Losses: {trades.length - totalWins}</div>
          </div>

          {/* P&L by Symbol */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:11,color:T.textMut,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Total P&L</div>
            <div style={{fontSize:24,fontWeight:700,color:totalPnL>=0?T.green:T.red,marginBottom:4,fontFamily:"DM Mono"}}>{fmt(totalPnL,true)}</div>
            <div style={{fontSize:12,color:T.textMut}}>{symbolCount} symbols</div>
          </div>
        </div>

        {/* TRADES TABLE */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 400px)"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead style={{position:"sticky",top:0,background:T.bg,zIndex:10}}>
                <tr style={{borderBottom:`1px solid ${T.border}`}}>
                  {["Symbol","Date","Setup","Side","Entry","Exit","P&L","Return%"].map(h=>(
                    <th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:T.textMut,whiteSpace:"nowrap",background:T.bg}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...trades].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((t)=>{
                  const ret = ((t.pnl/(t.entry*100))*100).toFixed(2);
                  const dateObj = new Date(t.date);
                  const openDate = dateObj.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'});
                  const tradeId = getTradeId(t);
                  const selectedId = selectedTrade ? getTradeId(selectedTrade) : null;
                  const isSelected = selectedId === tradeId;
                  
                  return (
                    <tr 
                      key={tradeId} 
                      style={{
                        borderBottom:`1px solid ${T.border}`,
                        background:isSelected?T.accentBg:t.pnl>0?`${T.greenBg}40`:t.pnl<0?`${T.redBg}40`:T.white,
                        cursor:"pointer",
                        transition:"all .2s",
                        borderLeft:isSelected?`3px solid ${T.accent}`:"none",
                        paddingLeft:isSelected?"9px":"12px",
                        userSelect:"none"
                      }}
                      onClick={(e)=>{e.preventDefault();e.stopPropagation();if(isSelected){setSelectedTrade(null)}else{setSelectedTrade(t)}}}
                      onMouseOver={(e)=>{e.preventDefault();e.currentTarget.style.background=isSelected?T.accentBg:(t.pnl>0?`${T.greenBg}60`:t.pnl<0?`${T.redBg}60`:`${T.bg}`)}}
                      onMouseOut={(e)=>{e.preventDefault();e.currentTarget.style.background=isSelected?T.accentBg:(t.pnl>0?`${T.greenBg}40`:t.pnl<0?`${T.redBg}40`:T.white)}}
                    >
                      <td style={{padding:"12px 14px",fontWeight:600,color:T.text,fontFamily:"DM Mono"}}>{t.symbol}</td>
                      <td style={{padding:"12px 14px",color:T.textSub}}>{openDate}</td>
                      <td style={{padding:"12px 14px",color:T.textSub}}>{t.setup || "—"}</td>
                      <td style={{padding:"12px 14px"}}>
                        <Pill color={t.direction==="Long"?"green":"red"} small>{t.direction}</Pill>
                      </td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontFamily:"DM Mono",fontSize:12}}>{t.entry.toFixed(2)}</td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontFamily:"DM Mono",fontSize:12}}>{t.exit.toFixed(2)}</td>
                      <td style={{padding:"12px 14px",fontWeight:600,color:t.pnl>=0?T.green:T.red,fontFamily:"DM Mono"}}>{t.pnl>=0?"+":""}{fmt(t.pnl,false).replace("$","")}</td>
                      <td style={{padding:"12px 14px",fontWeight:600,color:t.pnl>=0?T.green:T.red,fontFamily:"DM Mono"}}>{ret>0?"+":""}{ret}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT - TRADE DETAIL & STRATEGIES */}
      {selectedTrade && (
        <div style={{ flex: "0 0 400px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16, height: "fit-content", position: "sticky", top: 24, overflow: "auto", maxHeight: "calc(100vh - 48px)" }}>
          {/* TRADE DETAIL SECTION */}
          <div>
            <div style={{ fontSize: 11, color: T.textMut, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Trade Detail</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: "DM Mono", marginBottom: 4 }}>{selectedTrade.symbol}</div>
            <div style={{ fontSize: 11, color: T.textSub }}>— {selectedTrade.setup || "Setup"}</div>
          </div>

          {/* MAIN STATS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMut, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Direction</div>
              <Pill color={selectedTrade.direction === "Long" ? "green" : "red"}>{selectedTrade.direction}</Pill>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMut, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Entry</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: "DM Mono" }}>{selectedTrade.entry.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMut, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Exit</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: "DM Mono" }}>{selectedTrade.exit.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMut, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>P&L</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: selectedTrade.pnl >= 0 ? T.green : T.red, fontFamily: "DM Mono" }}>{selectedTrade.pnl >= 0 ? "+" : ""}{fmt(selectedTrade.pnl, true)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMut, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>R:R</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: selectedTrade.pnl >= 0 ? T.green : T.red, fontFamily: "DM Mono" }}>{selectedTrade.pnl >= 0 ? "+" : ""}{(selectedTrade.pnl || 2.1).toFixed(2)}R</div>
            </div>
          </div>

          {/* EMOTION TAGS */}
          <div>
            <div style={{ fontSize: 11, color: T.textMut, marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Emotion Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {emotionTags.map(tag => {
                const key = `${selectedTrade.date}_${selectedTrade.symbol}_emotion_${tag.id}`;
                const isSelected = emotionState[key];
                return (
                  <button
                    key={tag.id}
                    onClick={() => setEmotionState({ ...emotionState, [key]: !isSelected })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      border: `1.5px solid ${tag.color}`,
                      background: isSelected ? tag.color + "20" : "transparent",
                      color: tag.color,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all .2s"
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* NOTES */}
          <div>
            <div style={{ fontSize: 11, color: T.textMut, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Notes</div>
            <textarea
              placeholder="What happened? Why did you take this trade?"
              value={tradeNotes[selectedTrade.date + selectedTrade.symbol] || ""}
              onChange={(e) => {
                const newNotes = { ...tradeNotes, [selectedTrade.date + selectedTrade.symbol]: e.target.value };
                setTradeNotes(newNotes);
                // Auto-save en localStorage
                try {
                  const notesArray = Object.keys(newNotes).map(key => ({
                    trade_key: key,
                    notes: newNotes[key],
                    timestamp: new Date().toISOString()
                  }));
                  localStorage.setItem("trade_notes", JSON.stringify(notesArray));
                  console.log("💾 Notes sauvegardées en localStorage");
                } catch (err) {
                  console.error("Erreur saving notes:", err);
                }
              }}
              style={{
                width: "100%",
                height: 100,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                color: T.text,
                background: T.bg,
                resize: "none",
                outline: "none"
              }}
            />
          </div>

          {/* STRATEGY SECTION */}
          <div style={{ paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.textMut, marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Strategies</div>

            {!expandedStrategyId && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: T.white,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  + Add Strategy ∨
                </button>

                {showStrategyDropdown && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: T.white,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 100,
                    maxHeight: 250,
                    overflowY: "auto"
                  }}>
                    {strategies.length === 0 ? (
                      <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: T.textSub }}>
                        Aucune stratégie créée
                      </div>
                    ) : (
                      strategies.map(strat => (
                        <button
                          key={strat.id}
                          onClick={() => {
                            const tradeId = selectedTrade.date + selectedTrade.symbol;
                            const current = tradeStrategies[tradeId] || [];
                            if (!current.includes(strat.id)) {
                              setTradeStrategies({
                                ...tradeStrategies,
                                [tradeId]: [...current, strat.id]
                              });
                            }
                            setShowStrategyDropdown(false);
                            setExpandedStrategyId(strat.id);
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderBottom: `1px solid ${T.border}`,
                            background: T.white,
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            transition: "all .2s"
                          }}
                        >
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: strat.color }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{strat.name}</div>
                            <div style={{ fontSize: 10, color: T.textSub }}>{strat.groups.length} groupe{strat.groups.length !== 1 ? "s" : ""}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {expandedStrategyId && strategies.find(s => s.id === expandedStrategyId) && (() => {
              const strat = strategies.find(s => s.id === expandedStrategyId);
              const tradeId = selectedTrade.date + selectedTrade.symbol;
              let checkedCount = 0, totalRules = 0;
              strat.groups?.forEach(g => {
                g.rules?.forEach(r => {
                  totalRules++;
                  const ruleKey = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${strat.id}_${r.id}`;
                  if (checkedRules[ruleKey]) checkedCount++;
                });
              });
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: strat.color }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{strat.name}</div>
                    </div>
                    <button
                      onClick={() => {
                        setTradeStrategies({
                          ...tradeStrategies,
                          [tradeId]: tradeStrategies[tradeId].filter(id => id !== strat.id)
                        });
                        setExpandedStrategyId(null);
                      }}
                      style={{
                        padding: "2px 4px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        color: T.textMut
                      }}
                    >
                      ⋯
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.textMut }}>Rules followed</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={() => {
                          const newChecked = { ...checkedRules };
                          strat.groups?.forEach(g => {
                            g.rules?.forEach(r => {
                              const ruleKey = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${strat.id}_${r.id}`;
                              newChecked[ruleKey] = false;
                            });
                          });
                          setCheckedRules(newChecked);
                        }}
                        style={{
                          padding: 0,
                          background: "transparent",
                          border: "none",
                          fontSize: 10,
                          color: T.accent,
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        UNCHECK ALL
                      </button>
                      <div style={{ fontSize: 10, fontWeight: 600, color: T.textSub }}>{checkedCount} / {totalRules}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                    {strat.groups?.map(g => (
                      <div key={g.id}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: T.textSub, marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>{g.name}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {g.rules?.map(r => {
                            const ruleKey = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${strat.id}_${r.id}`;
                            const isChecked = checkedRules[ruleKey] || false;
                            return (
                              <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer", color: T.text }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    setCheckedRules({
                                      ...checkedRules,
                                      [ruleKey]: e.target.checked
                                    });
                                  }}
                                  style={{ cursor: "pointer", width: 14, height: 14, accentColor: T.green }}
                                />
                                <span>{r.text}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {!expandedStrategyId && strategies.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "20px 0" }}>
                <div style={{ fontSize: 28 }}>🎯</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Add a Strategy</div>
                  <div style={{ fontSize: 10, color: T.textSub }}>to your trade</div>
                </div>
              </div>
            )}
          </div>

          {/* CLOSE BUTTON */}
          <button
            onClick={() => setSelectedTrade(null)}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.bg,
              color: T.textSub,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .2s",
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}

function StrategiesPage({ strategies, setStrategies, onCreateClick }) {
  const [showForm, setShowForm] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState(null);
  const getDefaultFormData = () => ({name:"",description:"",color:"#3B82F6",groups:[{id:Date.now(),name:"",rules:[{id:Date.now()+1,text:""}]}]});
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

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
      {/* HEADER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:20,fontWeight:700}}>🎯 Stratégies</div>
        <button onClick={()=>setShowForm(true)} style={{padding:"8px 16px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>+ Créer une stratégie</button>
      </div>

      {/* FILTERS */}
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.border}`,background:T.white,fontSize:12,fontWeight:600,color:T.text,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>R-Multiple <span style={{fontSize:10,color:T.textSub}}>∨</span></button>
        <button style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.border}`,background:T.white,fontSize:12,fontWeight:600,color:T.text,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>📅 Mar 27 - Mar 31, 2026</button>
        <button style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.border}`,background:T.white,fontSize:12,fontWeight:600,color:T.text,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>⚙️ Filters</button>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <input type="text" placeholder="Search Symbols..." style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:12,background:T.white,outline:"none",width:200}}/>
          <span style={{fontSize:12,color:T.textSub}}>No accounts</span>
        </div>
      </div>

      {/* CONTENT */}
      {strategies.length === 0 ? (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"80px 40px",textAlign:"center",minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <div style={{fontSize:64,marginBottom:20}}>🎯</div>
          <div style={{fontSize:24,fontWeight:700,color:T.text,marginBottom:8}}>Pas encore de stratégies</div>
          <div style={{fontSize:12,color:T.textSub,marginBottom:24,maxWidth:400}}>Créez votre première stratégie de trading avec des règles pour suivre comment tout s'agit.</div>
          <button onClick={()=>setShowForm(true)} style={{padding:"12px 24px",borderRadius:8,background:"#000",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",border:"none"}}>+ Créer votre première stratégie</button>
        </div>
      ) : (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                <tr>
                  <th style={{padding:"14px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Strategy</th>
                  <th style={{padding:"14px 16px",textAlign:"center",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Rules</th>
                  <th style={{padding:"14px 16px",textAlign:"center",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Trades</th>
                  <th style={{padding:"14px 16px",textAlign:"center",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Win Rate</th>
                  <th style={{padding:"14px 16px",textAlign:"right",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Total P&L</th>
                  <th style={{padding:"14px 16px",textAlign:"center",fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:"0.5px"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((strat,idx)=>{
                  const totalRules = strat.groups.reduce((sum,g)=>sum+(g.rules?.length||0),0);
                  return (
                    <tr key={strat.id} style={{borderBottom:`1px solid ${T.border}`,background:idx%2===0?T.bg:"transparent",hover:{background:T.border}}}>
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
                      <td style={{padding:"14px 16px",textAlign:"center",display:"flex",gap:8,justifyContent:"center"}}>
                        <button onClick={()=>handleEditStrategy(strat)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:T.accent,padding:"4px 8px"}}>✏️</button>
                        <button onClick={()=>{const updated=strategies.filter(s=>s.id!==strat.id);setStrategies(updated);localStorage.setItem("apex_strategies",JSON.stringify(updated));}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:T.red,padding:"4px 8px"}}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE STRATEGY MODAL */}
      {showForm && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={handleCancelEdit}>
          <div style={{background:T.white,borderRadius:12,width:"90%",maxWidth:600,border:`1px solid ${T.border}`,maxHeight:"90vh",overflow:"auto"}} onClick={(e)=>e.stopPropagation()}>
            <div style={{padding:20,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.white}}>
              <div style={{fontSize:16,fontWeight:700}}>{editingStrategyId ? "Modifier la stratégie" : "Créer une nouvelle stratégie"}</div>
              <button onClick={handleCancelEdit} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18}}>✕</button>
            </div>
            
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:16}}>
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
                        <button onClick={()=>removeGroup(group.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:T.red}}>✕</button>
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
              <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                <button onClick={handleCancelEdit} style={{padding:"10px 20px",borderRadius:6,border:`1px solid ${T.border}`,background:T.white,fontSize:12,fontWeight:600,cursor:"pointer"}}>Annuler</button>
                <button onClick={handleCreateStrategy} style={{padding:"10px 20px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>{editingStrategyId ? "✓ Modifier la stratégie" : "✓ Créer une stratégie"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button className="nav-item" onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:8,border:"none",background: active ? T.accentBg : "transparent",color: active ? T.accent : T.textSub,fontSize:12,fontWeight: active ? 600 : 400,transition:"all .15s",textAlign:"left",}}>
      <span style={{fontSize:15,opacity: active?1:.7}}>{icon}</span>
      <span>{label}</span>
      {badge && <span style={{marginLeft:"auto",fontSize:10,padding:"1px 6px",borderRadius:20,background:T.red+"20",color:T.red,fontWeight:600}}>{badge}</span>}
    </button>
  );
}

function AddTradePage({ trades, setTrades, setPage }) {
  const [accountName, setAccountName] = useState("");
  const [selectedBroker, setSelectedBroker] = useState("tradovate");
  const [selectedTimezone, setSelectedTimezone] = useState("UTC+1");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const brokers = [
    { id: "mt5", name: "MetaTrader 5", format: "html", icon: "🔷" },
    { id: "tradovate", name: "Tradovate", format: "csv", icon: "π" },
  ];

  const timezones = [
    "UTC-12", "UTC-11", "UTC-10", "UTC-9", "UTC-8", "UTC-7", "UTC-6", "UTC-5",
    "UTC-4", "UTC-3", "UTC-2", "UTC-1", "UTC+0", "UTC+1", "UTC+2", "UTC+3",
    "UTC+4", "UTC+5", "UTC+6", "UTC+7", "UTC+8", "UTC+9", "UTC+10", "UTC+11", "UTC+12"
  ];

  const getBrokerInstructions = () => {
    if (selectedBroker === "tradovate") {
      return {
        icon: "π",
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
    return {
      icon: "🔷",
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

  const handleImport = () => {
    if (!accountName.trim()) {
      setError("❌ Veuillez entrer un nom de compte");
      return;
    }

    if (!fileContent) {
      setError("❌ Aucun fichier sélectionné");
      return;
    }

    try {
      const trades = parseCSV(fileContent, selectedBroker);
      if (trades.length === 0) {
        setError("❌ Aucun trade trouvé");
        return;
      }

      const stats = calculateStats(trades);
      const merged = [...trades];
      setTrades(prev => {
        const result = [...prev];
        trades.forEach(newT => {
          const exists = result.some(t => t.date === newT.date && t.symbol === newT.symbol && t.entry === newT.entry);
          if (!exists) result.push(newT);
        });
        result.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem("apex_trades", JSON.stringify(result));
        return result;
      });

      setAccountName("");
      setFileName("");
      setFileContent("");
      setPreview([]);
      setSelectedBroker("tradovate");
      setSelectedTimezone("UTC+1");
      setError("");
    } catch (err) {
      setError(`❌ Erreur d'import: ${err.message}`);
    }
  };

  const handleDropZone = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileSelect({ target: { files: [file] } });
      }
    }
  };

  const brokerInfo = getBrokerInstructions();

  return (
    <div
      style={{
        background: T.white,
        borderRadius: "12px",
        border: `2px solid ${T.accent}`,
        overflow: "hidden",
        height: "calc(100vh - 180px)",
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 0,
      }}
      className="anim-1"
    >
      {/* ─── LEFT COLUMN: FORM ─── */}
      <div style={{ padding: "32px", overflowY: "auto", borderRight: `1px solid ${T.border}` }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: T.text, marginBottom: "32px" }}>📥 Importer des trades</h2>

        {/* ACCOUNT */}
        <div style={{ marginBottom: "28px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
            Nom du compte
          </label>
          <div
            style={{
              position: "relative",
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: "8px",
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              height: "44px",
              cursor: "text",
            }}
          >
            <input
              type="text"
              placeholder={accountName ? accountName : "Nom"}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                color: T.text,
                fontSize: "14px",
                outline: "none",
                fontWeight: accountName ? "500" : "400",
              }}
            />
            {accountName && (
              <span style={{ color: T.green, fontSize: "18px", marginLeft: "8px" }}>✓</span>
            )}
          </div>
        </div>

        {/* BROKER */}
        <div style={{ marginBottom: "28px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
            Courtier
          </label>
          <div
            style={{
              position: "relative",
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <select
              value={selectedBroker}
              onChange={(e) => {
                setSelectedBroker(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "none",
                background: "transparent",
                color: T.text,
                fontSize: "14px",
                cursor: "pointer",
                fontWeight: "500",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                paddingRight: "32px",
              }}
            >
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.icon} {b.name}
                </option>
              ))}
            </select>
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: T.textMut,
                fontSize: "12px",
              }}
            >
              ▼
            </div>
          </div>
        </div>

        {/* TIME ZONE */}
        <div style={{ marginBottom: "28px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
            Zone horaire
          </label>
          <div
            style={{
              position: "relative",
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "none",
                background: "transparent",
                color: T.text,
                fontSize: "14px",
                cursor: "pointer",
                fontWeight: "500",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                paddingRight: "32px",
              }}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  (GMT{tz === "UTC+0" ? "±0:00" : tz.replace("UTC", "").padStart(3, " ").replace("+", "+").replace("-", "−") + ":00"}) {tz}
                </option>
              ))}
            </select>
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: T.textMut,
                fontSize: "12px",
              }}
            >
              ▼
            </div>
          </div>
        </div>

        {/* FILE */}
        <div style={{ marginBottom: "28px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
            Fichier
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.html,.xlsx,.xls,.txt"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = T.accent;
              e.currentTarget.style.background = T.accentBg;
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.background = "transparent";
            }}
            onDrop={handleDropZone}
            style={{
              border: `2px dashed ${T.border}`,
              borderRadius: "8px",
              padding: "32px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              background: "transparent",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📁</div>
            <div style={{ fontSize: "14px", fontWeight: "500", color: T.text, marginBottom: "4px" }}>
              Déposez votre fichier ici ou parcourez
            </div>
            <div style={{ fontSize: "12px", color: T.textMut }}>
              CSV, TXT ou HTML jusqu'à 50 MB
            </div>
            {fileName && (
              <div style={{ fontSize: "12px", color: T.green, marginTop: "12px", fontWeight: "500" }}>
                ✓ {fileName}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "12px 14px",
              background: T.redBg,
              border: `1px solid ${T.redBd}`,
              borderRadius: "6px",
              color: T.red,
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "12px", color: T.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Aperçu ({preview.length} trades)
            </h3>
            <div
              style={{
                overflowX: "auto",
                border: `1px solid ${T.border}`,
                borderRadius: "8px",
                background: T.bg,
              }}
            >
              <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Date", "Symbol", "Dir", "Entry", "Exit", "P&L"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600", color: T.textMut }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((trade, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "10px 12px", color: T.textSub }}>{trade.date}</td>
                      <td style={{ padding: "10px 12px", color: T.text, fontWeight: "600" }}>{trade.symbol}</td>
                      <td style={{ padding: "10px 12px", color: trade.direction === "Long" ? T.green : T.red }}>
                        {trade.direction === "Long" ? "L" : "S"}
                      </td>
                      <td style={{ padding: "10px 12px", color: T.textSub }}>{trade.entry.toFixed(2)}</td>
                      <td style={{ padding: "10px 12px", color: T.textSub }}>{trade.exit.toFixed(2)}</td>
                      <td style={{ padding: "10px 12px", color: trade.pnl >= 0 ? T.green : T.red, fontWeight: "600" }}>
                        {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Button */}
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
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s",
            opacity: fileContent && accountName.trim() && !loading ? 1 : 0.6,
          }}
          onMouseOver={(e) => {
            if (fileContent && accountName.trim() && !loading) e.target.style.opacity = "0.9";
          }}
          onMouseOut={(e) => {
            if (fileContent && accountName.trim() && !loading) e.target.style.opacity = "1";
          }}
        >
          {loading ? "Traitement en cours..." : "✓ Importer les trades"}
        </button>
      </div>

      {/* ─── RIGHT COLUMN: INSTRUCTIONS ─── */}
      <div style={{ width: "320px", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", background: T.bg, overflowY: "auto" }}>
        <div style={{ fontSize: "60px", marginBottom: "16px" }}>{brokerInfo.icon}</div>
        <h3 style={{ fontSize: "16px", fontWeight: "700", color: T.text, marginBottom: "4px", textAlign: "center" }}>
          {brokerInfo.name}
        </h3>
        <p style={{ fontSize: "12px", color: T.textMut, marginBottom: "20px", textAlign: "center", lineHeight: "1.4" }}>
          {brokerInfo.subtext}
        </p>

        <div style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.5px", color: T.textMut, marginBottom: "12px", textTransform: "uppercase" }}>
          Pour importer les données de {brokerInfo.name}:
        </div>

        <ol style={{ padding: "0 0 0 16px", margin: 0, listStyleType: "decimal" }}>
          {brokerInfo.steps.map((step, idx) => (
            <li
              key={idx}
              style={{
                fontSize: "12px",
                color: T.textSub,
                marginBottom: "8px",
                lineHeight: "1.4",
              }}
            >
              {step.replace(/^\d+\. /, "")}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function CalendarPage({ trades = [] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState(null);
  
  const pnlByDate = {};
  const tradesByDate = {};
  
  trades.forEach(t => {
    if (!t.date) return;
    try {
      let dateStr = String(t.date).trim();
      let d = new Date(dateStr);
      if (isNaN(d.getTime())) d = new Date(dateStr + 'T00:00:00Z');
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${dy}`;
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
      <div key={monthIdx} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,minWidth:320,cursor:"pointer"}} onClick={()=>setExpandedMonth(monthIdx)}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:16,textAlign:"center",color:T.text}}>{months[monthIdx]}</div>
        
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
            
            let bg = T.border;
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

    const weeks = [];
    let currentWeek = Array(adjustedFirstDay).fill(null);
    
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
            <div style={{fontSize:28,fontWeight:700,color:monthPnL>=0?T.green:T.red,marginTop:4}}>
              {monthPnL>=0?"+":""}${monthPnL.toFixed(2)}
            </div>
          </div>
          <button onClick={()=>setExpandedMonth(null)} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:T.textMut}}>✕</button>
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
                const weekPnL = week.reduce((sum, d) => sum + (d && dayStats[d] ? dayStats[d].pnl : 0), 0);
                const weekTrades = week.reduce((sum, d) => sum + (d && dayStats[d] ? dayStats[d].trades : 0), 0);
                
                return (
                  <React.Fragment key={weekIdx}>
                    {/* Day Numbers and P&L */}
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      {week.map((day, dayIdx) => {
                        if (day === null) {
                          return <td key={`empty-${dayIdx}`} style={{padding:"8px",background:T.bg}}></td>;
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
                        <div style={{color:weekPnL>=0?T.green:T.red,marginTop:2,fontSize:11}}>{weekPnL>=0?"+":""}${weekPnL.toFixed(0)}</div>
                      </td>
                    </tr>
                    
                    {/* Trade Counts */}
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      {week.map((day, dayIdx) => {
                        if (day === null) {
                          return <td key={`trades-empty-${dayIdx}`} style={{padding:"8px",background:T.bg}}></td>;
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

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:20,fontWeight:700}}>📅 Calendrier</div>
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

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
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

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [trades, setTrades] = useState([]);
  const [strategies, setStrategies] = useState([]);

  const user = { name: "Trader", email: "trader@apextrader.com", initials: "TR" };

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("apex_trades");
      if (saved) {
        const parsed = JSON.parse(saved);
        setTrades(parsed);
      }
      const savedStrategies = localStorage.getItem("apex_strategies");
      if (savedStrategies) {
        const parsed = JSON.parse(savedStrategies);
        setStrategies(parsed);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  }, []);

  const handleImport = (data) => {
    const { trades: newTrades } = data;
    const merged = [...trades];
    newTrades.forEach(newT => {
      const exists = merged.some(t => t.date === newT.date && t.symbol === newT.symbol && t.entry === newT.entry);
      if (!exists) merged.push(newT);
    });
    merged.sort((a, b) => new Date(b.date) - new Date(a.date));
    setTrades(merged);
    localStorage.setItem("apex_trades", JSON.stringify(merged));
  };

  const handleClearTrades = () => {
    if (window.confirm("Clear all trades? This cannot be undone.")) {
      setTrades([]);
      localStorage.removeItem("apex_trades");
    }
  };

  const NAV = [
    { id:"add-trade",     icon:"⊕", label:"Ajouter des Trades" },
    { id:"dashboard",     icon:"🏠", label:"Tableau de bord" },
    { id:"calendar",      icon:"📅", label:"Calendrier" },
    { id:"trades",        icon:"⊞", label:"Trades", badge: trades.length > 0 ? trades.length : 0 },
    { id:"validator",     icon:"✅", label:"Discipline" },
    { id:"journal",       icon:"📔", label:"Journal de Trading" },
    { id:"notes",         icon:"📝", label:"Notes" },
    { id:"strategies",    icon:"⚙️", label:"Stratégies" },
  ];

  const pages = {
    dashboard:  <Dashboard trades={trades} />,
    "add-trade": <AddTradePage trades={trades} setTrades={setTrades} setPage={setPage} />,
    trades:     <TradesPage trades={trades} strategies={strategies} onImportClick={() => setPage("add-trade")} />,
    calendar:   <CalendarPage trades={trades} />,
    validator:  <TradeValidator trades={trades} />,
    journal: <div className="anim-1" style={{fontSize:18,fontWeight:700}}>📔 Journal de Trading (À venir)</div>,
    notes: <div className="anim-1" style={{fontSize:18,fontWeight:700}}>📝 Notes (À venir)</div>,
    strategies: <StrategiesPage strategies={strategies} setStrategies={setStrategies} onCreateClick={() => setPage("strategies")} />
  };

  return (
    <>
      <style>{css}</style>
      <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
        {/* SIDEBAR */}
        <div style={{width:220,flexShrink:0,background:T.white,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
          <div style={{padding:"20px 18px 16px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:30,height:30,borderRadius:8,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:700}}>A</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,letterSpacing:"0px"}}>tao trade</div>
              </div>
            </div>
          </div>
          <div style={{padding:"12px 8px",flex:1}}>
            {NAV.map(n=>(
              <NavItem key={n.id} icon={n.icon} label={n.label} active={page===n.id} onClick={()=>setPage(n.id)} badge={n.badge}/>
            ))}
          </div>
          <div style={{padding:"12px 8px",borderTop:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px"}}>
              <div style={{width:30,height:30,borderRadius:8,background:T.accentBg,border:`1px solid ${T.accentBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:T.accent}}>{user.initials}</div>
              <div style={{overflow:"hidden"}}>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>{user.name}</div>
                <div style={{fontSize:10,color:T.textMut}}>{user.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,overflowY:"auto",minWidth:0}}>
          <div style={{position:"sticky",top:0,zIndex:10,background:T.white+"F0",backdropFilter:"blur(8px)",borderBottom:`1px solid ${T.border}`,padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:16,fontWeight:700}} >Welcome, <span style={{color:T.accent}}>{user.name}</span></div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {trades.length > 0 && (
                <button onClick={handleClearTrades} style={{padding:"6px 12px",borderRadius:8,background:T.redBg,border:`1px solid ${T.redBd}`,color:T.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>🗑️ Effacer</button>
              )}
            </div>
          </div>
          <div style={{padding:"24px 28px"}}>
            {pages[page] || pages.dashboard}
          </div>
        </div>
      </div>
    </>
  );
}




