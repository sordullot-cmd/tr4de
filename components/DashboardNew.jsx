"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { parseCSV, calculateStats } from "@/lib/csvParsers";
import { createClient } from "@/lib/supabase/client";
import { getLocalDateString } from "@/lib/dateUtils";
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
import GoalsPage from "@/components/pages/GoalsPage";
import DailyPlannerPage from "@/components/pages/DailyPlannerPage";
import FocusTimerPage from "@/components/pages/FocusTimerPage";
import NotesPage from "@/components/pages/NotesPage";
import ReadingListPage from "@/components/pages/ReadingListPage";
import QuickAccountSelector from "@/components/QuickAccountSelector";
import MultiAccountSelector from "@/components/MultiAccountSelector";
import ApexChatNew from "@/components/ApexChatNew";
import AgentPanel from "@/components/AgentPanel";
import AIReportSummaryCard from "@/components/AIReportSummaryCard";
import SettingsPage from "@/components/pages/SettingsPage";
import Sidebar from "@/components/ui/Sidebar";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { getCurrencySymbol, getUserTimezone } from "@/lib/userPrefs";
import { t, useLang } from "@/lib/i18n";
import {
  LayoutDashboard,
  LineChart as LucideLineChart,
  Calendar as LucideCalendar,
  ListChecks,
  NotebookPen,
  ShieldCheck,
  Target as LucideTarget,
  Bot,
  Upload as LucideUpload,
  Settings as LucideSettings,
  FileText as LucideFileText,
  X as LucideX,
  ChevronDown as LucideChevronDown,
  MoreHorizontal as LucideMoreHorizontal,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  ArrowDown as LucideArrowDown,
  SlidersHorizontal as LucideSlidersHorizontal,
  Check as LucideCheck,
  User,
  Moon,
  Sun,
  LogOut,
  Star,
  Pencil,
  Plus,
  GripVertical,
  ListTodo as LucideListTodo,
  Zap as LucideZap,
  CalendarDays as LucideCalendarDays,
  Flame as LucideFlame,
  Timer as LucideTimer,
  StickyNote as LucideStickyNote,
  BookOpen as LucideBookOpen,
} from "lucide-react";

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
  accentBg:"#F0F0F0",
  accentBd:"#D4D4D4",
  amber:   "#F97316",
  amberBg: "#FFF4E6",
  blue:    "#3B82F6",
  blueBg:  "#EFF6FF",
};

const css = `
  body { background: ${T.bg}; color: ${T.text}; font-family: var(--font-sans); min-height: 100vh; font-size: 14px; }
  button { font-family: inherit; cursor: pointer; }
  select { font-family: inherit; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .anim-1 { animation: fadeUp .25s ease both; }
  .anim-2 { animation: fadeUp .25s .05s ease both; }
  .nav-item:hover { background: ${T.accentBg} !important; }
  .card-hover:hover { border-color: ${T.border2} !important; box-shadow: 0 4px 12px rgba(0,0,0,.06) !important; }
`;

const fmt = (n, sign=false) => `${sign && n>0?"+":""}${n<0?"-":""}${getCurrencySymbol()}${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// Bouton compte utilisateur dans la barre du haut (à droite du gris)
function TopBarUserMenu({ user, onProfile, onSettings, onDarkMode, onLogout }) {
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  // Synchronise l'état visuel du toggle avec l'attribut sur <html>
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.dataset.theme === "dark");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const firstName = (user.name || "").split(" ")[0];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "4px 12px 4px 4px", borderRadius: 999,
          background: open ? "#EDEDED" : "transparent", border: "none",
          cursor: "pointer", fontFamily: "var(--font-sans)", color: "#0D0D0D",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "#EDEDED"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#F7F7F7",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#0D0D0D", flexShrink: 0,
          border: "1px solid #ECECEC",
        }}>{user.initials}</div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{firstName}</span>
      </button>
      {open && (
        <div role="menu" style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 200,
          background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: 4, zIndex: 100,
          fontFamily: "var(--font-sans)",
        }}>
          {onProfile && (
            <button onClick={() => { setOpen(false); onProfile(); }} style={menuItemStyle()}>
              <User size={14} strokeWidth={1.75} /><span>Profil</span>
            </button>
          )}
          {onSettings && (
            <button onClick={() => { setOpen(false); onSettings(); }} style={menuItemStyle()}>
              <LucideSettings size={14} strokeWidth={1.75} /><span>Paramètres</span>
            </button>
          )}
          {onDarkMode && (
            <button onClick={() => onDarkMode()} style={{ ...menuItemStyle(), justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {isDark
                  ? <Sun size={14} strokeWidth={1.75} />
                  : <Moon size={14} strokeWidth={1.75} />}
                <span>Mode Sombre</span>
              </span>
              {/* Mini toggle visuel */}
              <span
                aria-hidden
                style={{
                  position: "relative",
                  width: 28, height: 16, borderRadius: 999,
                  background: isDark ? "#10A37F" : "#D4D4D4",
                  transition: "background 150ms ease",
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 2,
                  left: isDark ? 14 : 2,
                  width: 12, height: 12, borderRadius: "50%",
                  background: "#FFFFFF",
                  transition: "left 150ms ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
                }}/>
              </span>
            </button>
          )}
          {onLogout && (onProfile || onSettings || onDarkMode) && (
            <div style={{ height: 1, background: "#E5E5E5", margin: "4px 0" }} />
          )}
          {onLogout && (
            <button onClick={() => { setOpen(false); onLogout(); }} style={{ ...menuItemStyle(), color: "#EF4444" }}>
              <LogOut size={14} strokeWidth={1.75} /><span>Se déconnecter</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
function menuItemStyle() {
  return {
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    textAlign: "left", padding: "8px 10px", borderRadius: 6, border: "none",
    background: "transparent", color: "#0D0D0D",
    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
  };
}

// Portal: rend ses enfants dans le slot d'en-tête de page (id="tr4de-page-header-slot")
// si présent. Permet aux pages d'inclure des éléments contrôlés depuis le layout.
function HeaderSlotPortal({ children }) {
  const [target, setTarget] = useState(null);
  useEffect(() => {
    const find = () => setTarget(document.getElementById("tr4de-page-header-slot"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  if (!target) return null;
  return ReactDOM.createPortal(children, target);
}

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

function Dashboard({ trades = [], setPage }) {
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
    { id: "impulsive", label: t("errtag.impulsive"), color: "#D4A574" },
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
  Object.keys(dailyPnL).sort().forEach(date=>{
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
            <div style={{position:"absolute",top:10,right:12,fontSize:10,fontWeight:600,color:"#10A37F"}}>↑ +12.4%</div>
            <div style={{fontSize:12,color:"#5C5C5C",marginBottom:8,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}>{t("dash.kpi.totalPnL")} <span style={{color:"#8E8E8E"}}>›</span></div>
            <div style={{fontSize:20,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.2}}>{fmt(totalPnL,true)}</div>
          </div>

          {/* TRADE WIN */}
          <div style={{padding:"14px 18px",borderRight:"1px solid #E5E5E5",position:"relative"}}>
            <div style={{position:"absolute",top:10,right:12,fontSize:10,fontWeight:600,color:"#10A37F"}}>↑ +3.2%</div>
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
          <div style={{position:"absolute",top:16,right:20,zIndex:10}}>
            <div style={{fontSize:12,fontWeight:600,color:"#10A37F"}}>{totalPnL>=0?"+":""}${Math.abs(totalPnL).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}</div>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:"#0D0D0D",marginBottom:2,display:"inline-flex",alignItems:"center",gap:4}}>{t("dash.cumulativePnL")} <span style={{color:"#8E8E8E",fontWeight:500}}>›</span></div>
          <div style={{fontSize:11,color:"#8E8E8E",marginBottom:12}}>Évolution du capital — {new Date().toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'})}</div>

          {pnlCurve.length > 1 ? (
            <div style={{position:"relative",width:"100%",height:280,paddingLeft:44,paddingBottom:22}}>
              <svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none" style={{display:"block",position:"absolute",top:0,left:44,right:8,bottom:22,width:"calc(100% - 52px)",height:"calc(100% - 22px)",fontFamily:"inherit"}}>
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor:"#10A37F",stopOpacity:0.18}}/>
                    <stop offset="100%" style={{stopColor:"#10A37F",stopOpacity:0.01}}/>
                  </linearGradient>
                </defs>
                {/* Axe Y labels supprimes du SVG (rendus en HTML overlay) */}
                
                {/* Grid lines horizontales alignees sur chaque tick Y */}
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
                    // topPct va de 91% (v=0) a 8% (v=topMax), en coord viewBox [0,240]
                    const topPct = 91 - ((value / topMax) * 83);
                    const y = (topPct / 100) * 240;
                    return <line key={`grid-${i}`} x1="35" y1={y} x2="600" y2={y} stroke="#F0F0F0" strokeWidth="1"/>;
                  });
                })()}

                {/* Chart area - smooth Catmull-Rom curve */}
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

                    // Catmull-Rom -> Cubic Bezier (courbe lisse)
                    let pathD = `M ${points[0][0]} ${points[0][1]}`;
                    for (let i = 0; i < points.length - 1; i++) {
                      const p0 = points[i - 1] || points[i];
                      const p1 = points[i];
                      const p2 = points[i + 1];
                      const p3 = points[i + 2] || p2;
                      const tension = 0.5;
                      const cp1x = p1[0] + (p2[0] - p0[0]) / 6 * tension;
                      const cp1y = p1[1] + (p2[1] - p0[1]) / 6 * tension;
                      const cp2x = p2[0] - (p3[0] - p1[0]) / 6 * tension;
                      const cp2y = p2[1] - (p3[1] - p1[1]) / 6 * tension;
                      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
                    }

                    // Fill path
                    const fillD = pathD + ` L ${points[points.length - 1][0]} 200 L ${points[0][0]} 200 Z`;

                    return (
                      <g>
                        <path d={fillD} fill="url(#chartGradient)" stroke="none"/>
                        <path d={pathD} stroke="#10A37F" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
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
                      </g>
                    );
                  })()}
                </g>

                {/* Axe X labels supprimes du SVG (rendus en HTML overlay) */}
              </svg>

              {/* Y-axis labels (chiffres ronds) */}
              <div style={{position:"absolute",top:0,left:0,width:40,height:"calc(100% - 22px)",pointerEvents:"none"}}>
                {(() => {
                  const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                  // Algo "nice number": trouver un step rond (100, 250, 500, 1000, 2500, 5000...)
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
                    // Map 0 -> 91%, topMax -> 8% (inverted)
                    const topPct = 91 - ((value / topMax) * 83);
                    return (
                      <div key={`yh-${i}`} style={{position:"absolute",top:`${topPct}%`,right:6,transform:"translateY(-50%)",fontSize:10,color:"#8E8E8E",fontWeight:500,textAlign:"right"}}>
                        ${value.toLocaleString("en-US")}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Dot final persistant (style OpenAI) */}
              {(() => {
                const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                const minCum = Math.min(...pnlCurve.map(x=>x.cum), 0);
                const range = Math.max(Math.abs(maxCum), Math.abs(minCum));
                const last = pnlCurve[pnlCurve.length - 1];
                const topPct = (130 - ((last.cum / range) * 90)) / 240 * 100;
                return (
                  <div style={{
                    position:"absolute",
                    top:`calc(${topPct}% * (100% - 22px) / 100%)`,
                    right:8,
                    width:8, height:8, borderRadius:"50%",
                    background:"#FFFFFF",
                    border:"2px solid #10A37F",
                    transform:"translate(50%, -50%)",
                    pointerEvents:"none",
                  }} />
                );
              })()}

              {/* Dot au hover - render en HTML pour eviter l'ecrasement */}
              {hoveredChart !== null && pnlCurve[hoveredChart] && (() => {
                const maxCum = Math.max(...pnlCurve.map(x=>x.cum), 1);
                const minCum = Math.min(...pnlCurve.map(x=>x.cum), 0);
                const range = Math.max(Math.abs(maxCum), Math.abs(minCum));
                const p = pnlCurve[hoveredChart];
                const topPct = (130 - ((p.cum / range) * 90)) / 240 * 100;
                // Les points de donnees vont de x=35 a x=600 dans un viewBox 600
                // (le x=0..35 est reserve pour l'axe Y). Il faut donc remapper.
                const svgX = 35 + (hoveredChart / Math.max(pnlCurve.length - 1, 1)) * 565;
                const leftPct = (svgX / 600) * 100;
                return (
                  <div style={{
                    position:"absolute",
                    top:`calc(${topPct}% * (100% - 22px) / 100%)`,
                    left:`calc(44px + ${leftPct}% * (100% - 52px) / 100%)`,
                    width:10, height:10, borderRadius:"50%",
                    background:"#10A37F",
                    border:"2px solid #FFFFFF",
                    boxShadow:"0 0 0 1px rgba(16, 163, 127, 0.2)",
                    transform:"translate(-50%, -50%)",
                    pointerEvents:"none",
                  }} />
                );
              })()}

              {/* X-axis labels en HTML - sous le graphique */}
              <div style={{position:"absolute",bottom:2,left:44,right:8,height:18,pointerEvents:"none"}}>
                {(() => {
                  const step = Math.max(1, Math.floor(pnlCurve.length / 5));
                  return pnlCurve.map((p, i) => {
                    if (i % step === 0 || i === pnlCurve.length - 1) {
                      const dateStr = p.date || '';
                      const date = new Date(dateStr);
                      const label = isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR',{month:'short',day:'numeric'});
                      const leftPct = (i / Math.max(pnlCurve.length - 1, 1)) * 100;
                      return (
                        <div key={`xh-${i}`} style={{position:"absolute",left:`${leftPct}%`,top:0,transform:"translateX(-50%)",fontSize:10,color:"#8E8E8E",fontWeight:500,whiteSpace:"nowrap"}}>
                          {label}
                        </div>
                      );
                    }
                    return null;
                  });
                })()}
              </div>
              
              {/* Tooltip */}
              {hoveredChart !== null && pnlCurve[hoveredChart] && (
                <div style={{
                  position:"absolute",
                  left:`${(tooltipPos.x / 600) * 100}%`,
                  top:`${(tooltipPos.y / 240) * 100}%`,
                  transform:"translate(-50%, -120%)",
                  background:"#0D0D0D",
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
                  <div style={{fontSize:"13px",fontWeight:"700",color:pnlCurve[hoveredChart].pnl>=0?"#10A37F":"#EF4444"}}>
                    {pnlCurve[hoveredChart].pnl>=0?"+":""}${Math.abs(pnlCurve[hoveredChart].pnl).toFixed(0)}
                  </div>
                </div>
              )}
            </div>
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

              <div style={{width:"100%",height:4,background:"#F0F0F0",borderRadius:2,overflow:"hidden"}}>
                <div
                  style={{
                    width:`${parseFloat(pentagonMetrics.overallScore)}%`,
                    height:"100%",
                    background:"#10A37F",
                    transition:"width 0.6s ease",
                    borderRadius:2,
                  }}
                />
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

function JournalPage({ trades = [] }) {
  // ✅ Utiliser les hooks Supabase au lieu de localStorage
  const { notes: tradeNotes, setNote: updateTradeNote } = useTradeNotes();
  const { notes: dailyNotes, setNote: updateDailyNote } = useDailySessionNotes();
  
  const [expandedTrades, setExpandedTrades] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
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

  // Date filtering géré globalement par le layout
  const filteredTrades = trades;

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
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("journal.title")}</h1>
        <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
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
                  {/* DAILY NOTES (sans contour ni label) */}
                  <textarea
                    placeholder={t("journal.dailyNotes")}
                    value={dailyNotes[dateStr] || ""}
                    onChange={(e) => updateDailyNote(dateStr, e.target.value)}
                    style={{
                      width:"100%",
                      height:200,
                      border:`1px solid ${T.border}`,
                      borderRadius:12,
                      padding:14,
                      fontSize:12,
                      fontFamily:"var(--font-sans)",
                      color:T.text,
                      background:T.white,
                      resize:"none",
                      outline:"none",
                      boxSizing:"border-box",
                    }}
                  />

                  {/* TRADES TABLE */}
                  <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                          <tr>
                            <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Entry Time</th>
                            <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Exit Time</th>
                            <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Symbol</th>
                            <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Side</th>
                            <th style={{padding:"8px 12px",textAlign:"right",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Net P&L</th>
                            <th style={{padding:"8px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Notes</th>
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
                                const entryTime = new Date(trade.entry_time || trade.date).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
                                const exitTime = trade.exit_time ? new Date(trade.exit_time).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : "—";
                                const rowKey = `${dateStr}_${i}`;
                                const tradeId = getTradeId(trade);
                                const isExpanded = !!expandedTrades[rowKey];
                                const hasNote = tradeNotes[tradeId] && tradeNotes[tradeId].trim().length > 0;

                                return (
                                  <React.Fragment key={rowKey}>
                                    <tr style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.bg:"transparent"}}>
                                      <td style={{padding:"8px 12px",fontSize:11,color:T.text}}>{entryTime}</td>
                                      <td style={{padding:"8px 12px",fontSize:11,color:T.text}}>{exitTime}</td>
                                      <td style={{padding:"8px 12px",fontSize:11,color:T.text}}>{trade.symbol}</td>
                                      <td style={{padding:"8px 12px",fontSize:11,color:T.text}}><span style={{color:trade.side==="Long"?T.blue:T.red}}>{trade.side || "Long"}</span></td>
                                      <td style={{padding:"8px 12px",textAlign:"right",fontSize:11,color:trade.pnl>=0?T.green:T.red,fontFamily:"var(--font-sans)"}}>{fmt(trade.pnl,true)}</td>
                                      <td style={{padding:"8px 12px",textAlign:"center"}}>
                                        <button
                                          onClick={() => setExpandedTrades(prev => ({...prev, [rowKey]: !prev[rowKey]}))}
                                          style={{
                                            background:hasNote?T.accentBg:T.bg,
                                            border:`1px solid ${hasNote?T.accentBd:T.border}`,
                                            borderRadius:6,
                                            padding:"4px 10px",
                                            fontSize:10,
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
                                        <td colSpan="6" style={{padding:"12px 12px"}}>
                                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                            <div style={{fontSize:11,color:T.textMut,textTransform:"uppercase"}}>Notes pour {trade.symbol}</div>
                                            <textarea
                                              placeholder={t("journal.tradeNote")}
                                              value={tradeNotes[tradeId] || ""}
                                              onChange={(e) => updateTradeNote(tradeId, e.target.value)}
                                              style={{
                                                width:"100%",
                                                height:60,
                                                border:`1px solid ${T.border}`,
                                                borderRadius:8,
                                                padding:12,
                                                fontSize:12,
                                                fontFamily:"var(--font-sans)",
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
                              {dayTrades.length > 3 && (
                                <tr>
                                  <td colSpan="6" style={{padding:0}}>
                                    <button
                                      onClick={() => setExpandedDays(prev => ({...prev, [dateStr]: !prev[dateStr]}))}
                                      style={{
                                        width:"100%",
                                        padding:"10px 12px",
                                        background:"transparent",
                                        border:"none",
                                        borderTop:`1px solid ${T.border}`,
                                        cursor:"pointer",
                                        fontSize:11,
                                        color:T.textSub,
                                        fontFamily:"var(--font-sans)",
                                        transition:"background 0.15s",
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
        <div style={{background:T.white,border:`2px dashed ${T.border}`,borderRadius:12,padding:"40px 24px",textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:600,marginBottom:8,color:T.text}}>{t("journal.empty")}</div>
          <p style={{color:T.textSub}}>{t("journal.emptySub")}</p>
        </div>
      )}
    </div>
  );
}

function TradesPage({ trades = [], strategies = [], onImportClick, onDeleteTrade, onClearTrades }) {
  const { user } = useAuth();
  const { notes: notesFromHook, setNote: setNoteHook } = useTradeNotes();
  const { emotionTags: emotionsFromHook, addEmotion, removeEmotion } = useTradeEmotionTags();
  const { errorTags: errorsFromHook, addError, removeError } = useTradeErrorTags();
  const [selectedTrade, setSelectedTrade] = useState(null);
  // Date range filter (default = current week)
  const getInitWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] };
  };
  const [filterStartDate, setFilterStartDate] = useState(() => getInitWeekRange().start);
  const [filterEndDate, setFilterEndDate] = useState(() => getInitWeekRange().end);
  // Selection multiple via checkbox
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeletingTrades, setIsDeletingTrades] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [showBulkStrategyDropdown, setShowBulkStrategyDropdown] = useState(false);
  const [openStratMenuId, setOpenStratMenuId] = useState(null);

  // Fermer le menu strategie au clic exterieur
  React.useEffect(() => {
    if (!openStratMenuId) return;
    const handler = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('[data-strat-menu]')) setOpenStratMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openStratMenuId]);
  const [tradeNotes, setTradeNotes] = useState({});
  const [tradeStrategies, setTradeStrategies] = useState({});
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [checkedRules, setCheckedRules] = useState({});
  const [emotionTags, setEmotionTags] = useState({});
  const [errorTags, setErrorTags] = useState({});
  const [loadedStrategies, setLoadedStrategies] = useState([]);
  const [activeTab, setActiveTab] = useState("infos");

  // Helper pour identifier un trade de maniere unique
  const tradeKey = (t) => `${t.date}_${t.symbol}_${t.entry}_${t.entryTime || ''}`;

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

  // ✅ Sync depuis Supabase (notes/emotions/errors): hook = source de vérité.
  React.useEffect(() => {
    if (notesFromHook && Object.keys(notesFromHook).length > 0) {
      setTradeNotes(notesFromHook);
      try { localStorage.setItem("tr4de_trade_notes", JSON.stringify(notesFromHook)); } catch {}
    }
  }, [notesFromHook]);
  React.useEffect(() => {
    if (emotionsFromHook && Object.keys(emotionsFromHook).length > 0) {
      setEmotionTags(emotionsFromHook);
      try { localStorage.setItem("tr4de_emotion_tags", JSON.stringify(emotionsFromHook)); } catch {}
    }
  }, [emotionsFromHook]);
  React.useEffect(() => {
    if (errorsFromHook && Object.keys(errorsFromHook).length > 0) {
      setErrorTags(errorsFromHook);
      try { localStorage.setItem("tr4de_error_tags", JSON.stringify(errorsFromHook)); } catch {}
    }
  }, [errorsFromHook]);

  // Debounce notes Supabase save (textarea fires per keystroke)
  const noteSaveTimers = React.useRef({});
  const persistNote = React.useCallback((tradeId, text) => {
    if (!tradeId) { console.warn("⚠️ persistNote: tradeId manquant — note non sauvegardée en ligne"); return; }
    if (noteSaveTimers.current[tradeId]) clearTimeout(noteSaveTimers.current[tradeId]);
    noteSaveTimers.current[tradeId] = setTimeout(() => {
      console.log("📤 Sauvegarde note (Supabase) trade:", tradeId);
      setNoteHook(tradeId, text)
        .then(() => console.log("✅ Note sauvée"))
        .catch(err => console.error("❌ Save note failed:", err?.message || err));
    }, 600);
  }, [setNoteHook]);

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
      
      // ✅ Fast path: localStorage. Sync depuis Supabase juste après (voir useEffect dédié).
      const savedTradeStrategies = localStorage.getItem("tr4de_trade_strategies");
      if (savedTradeStrategies) {
        const parsed = JSON.parse(savedTradeStrategies);
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

  // Charger les assignments trade↔strategy depuis Supabase (source de vérité).
  // Refetch sur focus pour synchroniser entre navigateurs.
  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    let cancelled = false;

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("trade_strategies")
          .select("trade_id, strategy_id")
          .eq("user_id", user.id);
        if (error) {
          if (error.message?.includes("Could not find the table") || error.code === "PGRST116") return;
          throw error;
        }
        if (cancelled) return;
        const map = {};
        (data || []).forEach((row) => {
          if (!map[row.trade_id]) map[row.trade_id] = [];
          map[row.trade_id].push(row.strategy_id);
        });
        setTradeStrategies(map);
        try { localStorage.setItem("tr4de_trade_strategies", JSON.stringify(map)); } catch {}
      } catch (err) {
        console.error("❌ Erreur chargement trade_strategies:", err?.message || err);
      }
    };

    loadFromSupabase();
    const onFocus = () => loadFromSupabase();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user?.id]);

  // Auto-save trade strategies: localStorage immédiat + Supabase (debounced full sync)
  const lastSyncedRef = React.useRef(null);
  React.useEffect(() => {
    if (Object.keys(tradeStrategies).length > 0) {
      try { localStorage.setItem("tr4de_trade_strategies", JSON.stringify(tradeStrategies)); } catch {}
    }

    if (!user?.id) return;
    const snapshot = JSON.stringify(tradeStrategies);
    if (snapshot === lastSyncedRef.current) return;

    const handle = setTimeout(async () => {
      const supabase = createClient();
      try {
        // Fetch existant pour diff
        const { data: existing, error: fetchErr } = await supabase
          .from("trade_strategies")
          .select("trade_id, strategy_id")
          .eq("user_id", user.id);
        if (fetchErr) {
          if (fetchErr.message?.includes("Could not find the table") || fetchErr.code === "PGRST116") return;
          throw fetchErr;
        }
        const existingSet = new Set((existing || []).map(r => `${r.trade_id}::${r.strategy_id}`));
        const desiredSet = new Set();
        const desiredRows = [];
        Object.entries(tradeStrategies).forEach(([tradeId, stratIds]) => {
          (stratIds || []).forEach(sid => {
            const key = `${tradeId}::${sid}`;
            desiredSet.add(key);
            desiredRows.push({ user_id: user.id, trade_id: String(tradeId), strategy_id: String(sid) });
          });
        });

        const toDelete = (existing || []).filter(r => !desiredSet.has(`${r.trade_id}::${r.strategy_id}`));
        const toInsert = desiredRows.filter(r => !existingSet.has(`${r.trade_id}::${r.strategy_id}`));

        // Delete supprimés
        for (const row of toDelete) {
          await supabase.from("trade_strategies")
            .delete()
            .eq("user_id", user.id)
            .eq("trade_id", row.trade_id)
            .eq("strategy_id", row.strategy_id);
        }
        // Insert ajoutés
        if (toInsert.length > 0) {
          await supabase.from("trade_strategies").insert(toInsert);
        }
        lastSyncedRef.current = snapshot;
      } catch (err) {
        console.error("❌ Erreur sync trade_strategies:", err?.message || err);
      }
    }, 600);

    return () => clearTimeout(handle);
  }, [tradeStrategies, user?.id]);

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

  // Filtrage par plage de dates (debut + fin)
  const getFilteredTrades = () => {
    if (!filterStartDate || !filterEndDate) return trades;
    const start = new Date(filterStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filterEndDate);
    end.setHours(23, 59, 59, 999);
    return trades.filter(t => {
      const tradeDate = new Date(t.date);
      return tradeDate >= start && tradeDate <= end;
    });
  };

  // Le filtrage par date est désormais géré globalement dans le layout.
  const filteredTrades = trades;

  if (!trades || trades.length === 0) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("journal.title")}</h1>
          <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
        </div>
        <div style={{background:T.white,border:`2px dashed ${T.accent}`,borderRadius:12,padding:"48px 24px",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:600,marginBottom:8,color:T.text}}>📥 Aucun trade importé</div>
          <p style={{color:T.textSub,marginBottom:20}}>Importez vos trades pour commencer à analyser vos performances</p>
          <button onClick={onImportClick} style={{padding:"12px 24px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>{t("addTrade.importError")}</button>
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
      <div style={{display:"flex",alignItems:"center",marginBottom:8,gap:12,flexWrap:"wrap"}}>
        <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("trades.title")}</h1>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center",fontFamily:"var(--font-sans)"}}>
          <button onClick={onImportClick} style={{padding:"7px 14px",height:34,borderRadius:8,background:"#0D0D0D",border:"1px solid #0D0D0D",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>{t("trades.importBtn")}</button>
        </div>
        <div id="tr4de-page-header-slot" />
      </div>

      {/* LAYOUT WITH TABLE + SIDE PANEL WITH TABS */}
      <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>

        {/* LEFT - TRADES TABLE */}
        <div style={{flex:selectedTrade?"0 0 calc(100% - 376px)":"1",minWidth:0,background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 200px)"}}>
          

          <div style={{overflowX:"auto",overflowY:"auto",flex:1}}>
            <table style={{width:"max-content",minWidth:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"var(--font-sans)"}}>
              <thead style={{position:"sticky",top:0,background:T.bg,zIndex:10}}>
                <tr style={{borderBottom:`1px solid ${T.border}`}}>
                  {/* Symbol : master checkbox quand >= 1 selectionne */}
                  <th style={{padding:"12px 14px",textAlign:"left",fontSize:11,fontWeight:500,color:T.textMut,whiteSpace:"nowrap",background:T.bg,height:42,minWidth:130,width:130}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:8,height:18,verticalAlign:"middle"}}>
                      {selectedIds.size > 0 && (
                        <input
                          type="checkbox"
                          checked={filteredTrades.length > 0 && filteredTrades.every(t => selectedIds.has(tradeKey(t)))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const next = new Set(selectedIds);
                              filteredTrades.forEach(t => next.add(tradeKey(t)));
                              setSelectedIds(next);
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          style={{cursor:"pointer",width:14,height:14,accentColor:"#0D0D0D",margin:0,display:"block",verticalAlign:"middle"}}
                          onClick={(e)=>e.stopPropagation()}
                        />
                      )}
                      <span>{t("common.symbol")}</span>
                    </span>
                  </th>
                  {[
                    {label:t("trades.colAsset")},
                    {label:t("trades.colSide")},
                    {label:t("trades.colEntryDate"),sorted:true},
                    {label:t("trades.colEntryTime")},
                    {label:t("trades.colEntry")},
                    {label:t("trades.colExitDate")},
                    {label:t("trades.colExitTime")},
                    {label:t("trades.colExit")},
                    {label:t("trades.colLots")},
                    {label:t("trades.colVolume")},
                    {label:t("trades.colPnL")},
                    {label:t("trades.colPnLPct")},
                    {label:t("trades.colDuration")},
                  ].map(h=>(
                    <th key={h.label} style={{padding:"12px 14px",textAlign:"left",fontSize:11,fontWeight:500,color:T.textMut,whiteSpace:"nowrap",background:T.bg}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                        {h.label}
                        {h.sorted && <LucideArrowDown size={11} strokeWidth={1.75} />}
                      </span>
                    </th>
                  ))}
                  {/* Settings column header */}
                  <th style={{padding:"12px 8px",textAlign:"right",background:T.bg,width:32}}>
                    <button
                      aria-label="Configurer colonnes"
                      style={{background:"transparent",border:"none",padding:4,cursor:"pointer",color:T.textMut,display:"inline-flex",alignItems:"center",borderRadius:6,transition:"background .12s ease"}}
                      onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}}
                      onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
                    >
                      <LucideSlidersHorizontal size={14} strokeWidth={1.75} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const fmtTime = (v) => {
                    if (!v) return '—';
                    // Si c'est déjà une heure formatée "HH:MM" ou "HH:MM:SS"
                    if (/^\d{1,2}:\d{2}/.test(String(v))) return String(v);
                    // Sinon parser comme date
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return '—';
                    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  };
                  return [...filteredTrades].sort((a,b)=>{
                    // Tri decroissant par date + heure de sortie (trades les plus
                    // recemment fermes en haut).
                    const dateA = String(a.date || "").slice(0,10);
                    const dateB = String(b.date || "").slice(0,10);
                    if (dateA !== dateB) return dateB.localeCompare(dateA);
                    const timeA = a.exitTime || a.exit_time || "00:00:00";
                    const timeB = b.exitTime || b.exit_time || "00:00:00";
                    return String(timeB).localeCompare(String(timeA));
                  }).map((t,i)=>{
                  const ret = ((t.pnl/(t.entry*100))*100).toFixed(2);
                  const dateObj = new Date(t.date);
                  const openDate = dateObj.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'2-digit'});
                  const openTime = fmtTime(t.entryTime || t.entry_time);
                  const closeDate = openDate;
                  const closeTime = fmtTime(t.exitTime || t.exit_time);
                  const tKey = tradeKey(t);
                  const isChecked = selectedIds.has(tKey);
                  const isHovered = hoveredRowId === tKey;
                  const showCheckbox = isChecked || isHovered;
                  const selectedBg = "#F0F0F0";
                  const hoverBg = "#FAFAFA";

                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom:`1px solid ${T.border}`,
                        background: isChecked ? selectedBg : (isHovered ? hoverBg : T.white),
                        cursor:"pointer",
                        transition:"background .12s ease",
                      }}
                      onClick={()=>{
                        const isSelectedDetail = selectedTrade && selectedTrade.date === t.date && selectedTrade.symbol === t.symbol && selectedTrade.entry === t.entry;
                        if(isSelectedDetail) {
                          setSelectedTrade(null);
                        } else {
                          setSelectedTrade(t);
                          setActiveTab("infos");
                        }
                      }}
                      onMouseEnter={()=>setHoveredRowId(tKey)}
                      onMouseLeave={()=>setHoveredRowId(null)}
                    >
                      {/* Symbol + checkbox conditionnelle + icone trending */}
                      <td style={{padding:"12px 14px",fontWeight:600,color:T.text,fontFamily:"var(--font-sans)",height:42,minWidth:130,width:130}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:8,height:18,verticalAlign:"middle"}}>
                          {showCheckbox ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(selectedIds);
                                if (e.target.checked) next.add(tKey); else next.delete(tKey);
                                setSelectedIds(next);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{cursor:"pointer",width:14,height:14,accentColor:"#0D0D0D",margin:0,display:"block",verticalAlign:"middle",flexShrink:0}}
                            />
                          ) : (
                            <span style={{width:22,height:22,borderRadius:6,background:T.bg,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <LucideTrendingUp size={13} strokeWidth={1.75} color={T.textMut} />
                            </span>
                          )}
                          <span>{t.symbol}</span>
                        </span>
                      </td>
                      <td style={{padding:"12px 14px",color:T.textSub}}>Future</td>
                      <td style={{padding:"12px 14px",fontWeight:500,color:T.text,fontSize:13}}>
                        {t.direction}
                      </td>
                      <td style={{padding:"12px 14px",color:T.textSub}}>{openDate}</td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontSize:12}}>{openTime}</td>
                      <td style={{padding:"12px 14px",color:T.text,fontFamily:"var(--font-sans)",fontSize:13}}>${t.entry.toFixed(2)}</td>
                      <td style={{padding:"12px 14px",color:T.textSub}}>{closeDate}</td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontSize:12}}>{closeTime}</td>
                      <td style={{padding:"12px 14px",color:T.text,fontFamily:"var(--font-sans)",fontSize:13}}>${t.exit.toFixed(2)}</td>
                      <td style={{padding:"12px 14px",color:T.textSub,textAlign:"center"}}>1</td>
                      <td style={{padding:"12px 14px",color:T.textSub,textAlign:"center"}}>2</td>
                      <td style={{padding:"12px 14px",fontWeight:600,color:t.pnl>=0?T.green:T.red,fontFamily:"var(--font-sans)"}}>{t.pnl>=0?"+":""}{fmt(t.pnl,false)}</td>
                      <td style={{padding:"12px 14px",fontWeight:600,color:t.pnl>=0?T.green:T.red,fontFamily:"var(--font-sans)"}}>{ret>0?"+":""}{ret}%</td>
                      <td style={{padding:"12px 14px",color:T.textSub,fontSize:12}}>
                        {(() => {
                          const entry = t.entryTime || t.entry_time;
                          const exit = t.exitTime || t.exit_time;
                          if (!entry || !exit) return "—";
                          const toSec = (v) => {
                            const m = String(v).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                            if (!m) return null;
                            return (+m[1])*3600 + (+m[2])*60 + (+(m[3]||0));
                          };
                          const s1 = toSec(entry);
                          const s2 = toSec(exit);
                          if (s1 === null || s2 === null) return "—";
                          let sec = s2 - s1;
                          // Si l'heure de sortie est le lendemain (entree 23:50, sortie 00:30)
                          if (sec < 0) sec += 24*3600;
                          if (Number.isNaN(sec)) return "—";
                          if (sec < 60) return `${sec}s`;
                          if (sec < 3600) return `${Math.floor(sec/60)}m`;
                          const h = Math.floor(sec/3600);
                          const m = Math.floor((sec%3600)/60);
                          return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,"0")}`;
                        })()}
                      </td>
                      {/* Cellule vide pour aligner avec le header settings */}
                      <td style={{padding:"12px 8px",width:32}} />
                    </tr>
                  );
                });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT - DETAIL PANEL WITH TABS */}
        {selectedTrade && (
          <div style={{width:360,maxHeight:"calc(100vh - 200px)",background:T.white,border:`1px solid ${T.border}`,borderRadius:12,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>
            
            {/* HEADER WITH TABS */}
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:16}}>
                {[
                  {id:"infos",label:t("trades.tab.infos"),Icon:LucideFileText},
                  {id:"strategies",label:t("trades.tab.strategies"),Icon:LucideTarget}
                ].map(tab=>{
                  const Icon = tab.Icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={()=>setActiveTab(tab.id)}
                      style={{
                        padding:"6px 0",
                        border:"none",
                        background:"transparent",
                        cursor:"pointer",
                        display:"inline-flex",
                        alignItems:"center",
                        gap:6,
                        fontSize:13,
                        fontWeight:activeTab===tab.id?600:500,
                        color:activeTab===tab.id?T.text:T.textMut,
                        transition:"color .12s ease, border-color .12s ease",
                        borderBottom:activeTab===tab.id?`2px solid #0D0D0D`:"2px solid transparent",
                        paddingBottom:"6px",
                        fontFamily:"var(--font-sans)",
                      }}
                    >
                      <Icon size={14} strokeWidth={1.75} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <button onClick={()=>setSelectedTrade(null)} aria-label="Fermer" style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMut,padding:4,display:"inline-flex",alignItems:"center"}}>
                <LucideX size={16} strokeWidth={2} />
              </button>
            </div>

            {/* TRADE HEADER INFO */}

            {/* SCROLL CONTENT */}
            <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
              
              {/* INFOS TAB (NOTES) */}
              {activeTab === "infos" && (
                <>
                  {/* INFO ROW - DIRECTION */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"var(--font-sans)"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Direction</div>
                    <div style={{fontSize:13,fontWeight:700,color:selectedTrade.direction==="Long"?T.green:T.red}}>{selectedTrade.direction}</div>
                  </div>

                  {/* INFO ROW - HEURE D'OUVERTURE */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"var(--font-sans)"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Heure d'ouverture</div>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{selectedTrade.entryTime || "—"}</div>
                  </div>

                  {/* INFO ROW - HEURE DE FERMETURE */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"var(--font-sans)"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Heure de fermeture</div>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{selectedTrade.exitTime || "—"}</div>
                  </div>

                  {/* INFO ROW - ENTRY */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"var(--font-sans)"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Entrée</div>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{selectedTrade.entry.toFixed(4)}</div>
                  </div>

                  {/* INFO ROW - EXIT */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"var(--font-sans)"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>Sortie</div>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{selectedTrade.exit.toFixed(4)}</div>
                  </div>

                  {/* INFO ROW - P&L */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"var(--font-sans)"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>P&L</div>
                    <div style={{fontSize:13,fontWeight:700,color:selectedTrade.pnl>=0?T.green:T.red}}>{selectedTrade.pnl>=0?"+":""}{fmt(selectedTrade.pnl,true)}</div>
                  </div>

                  {/* INFO ROW - P&L % */}
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"var(--font-sans)"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>P&L %</div>
                    <div style={{fontSize:13,fontWeight:700,color:selectedTrade.pnl>=0?T.green:T.red}}>{(((selectedTrade.pnl/(selectedTrade.entry*100))*100)>=0?"+":"")}{ ((selectedTrade.pnl/(selectedTrade.entry*100))*100).toFixed(2)}%</div>
                  </div>

                  {/* EMOTION TAGS */}
                  <div style={{padding:"16px 16px",borderBottom:`1px solid ${T.border}`}} key={`emotion-${selectedTrade.date}-${selectedTrade.symbol}-${selectedTrade.entry}`}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,marginBottom:10,textTransform:"uppercase"}}>Tags Émotionnels</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {allEmotionTags.map(tag=>{
                        const tradeId = selectedTrade.id;
                        const isSelected = emotionTags[tradeId] && emotionTags[tradeId].includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={()=>{
                              if (!tradeId) return;
                              const current = emotionTags[tradeId] || [];
                              let updated;
                              if(isSelected){
                                updated = {...emotionTags,[tradeId]: current.filter(t=>t!==tag.id)};
                                removeEmotion(tradeId, tag.id).catch(err => console.error("❌ Remove emotion failed:", err?.message));
                              } else {
                                updated = {...emotionTags,[tradeId]: [...current, tag.id]};
                                addEmotion(tradeId, tag.id).catch(err => console.error("❌ Add emotion failed:", err?.message));
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
                        const tradeId = selectedTrade.id;
                        const isSelected = errorTags[tradeId] && errorTags[tradeId].includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={()=>{
                              if (!tradeId) return;
                              const current = errorTags[tradeId] || [];
                              let updated;
                              if(isSelected){
                                updated = {...errorTags,[tradeId]: current.filter(t=>t!==tag.id)};
                                removeError(tradeId, tag.id).catch(err => console.error("❌ Remove error failed:", err?.message));
                              } else {
                                updated = {...errorTags,[tradeId]: [...current, tag.id]};
                                addError(tradeId, tag.id).catch(err => console.error("❌ Add error failed:", err?.message));
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
                      placeholder={t("trades.notePlaceholder")}
                      value={tradeNotes[selectedTrade.id] || ""}
                      onChange={(e)=>{
                        const key = selectedTrade.id;
                        if (!key) return;
                        const updated = {...tradeNotes, [key]: e.target.value};
                        setTradeNotes(updated);
                        localStorage.setItem("tr4de_trade_notes", JSON.stringify(updated));
                        persistNote(key, e.target.value);
                      }}
                      style={{
                        flex:1,
                        minHeight:100,
                        border:`1px solid ${T.border}`,
                        borderRadius:8,
                        padding:12,
                        fontSize:12,
                        fontFamily:"var(--font-sans)",
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
                        <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:14,paddingTop:48,fontFamily:"var(--font-sans)"}}>
                          <div style={{
                            width:44,height:44,borderRadius:"50%",
                            background:"#F5F5F5",
                            display:"flex",alignItems:"center",justifyContent:"center",
                          }}>
                            <LucideTarget size={20} strokeWidth={1.5} color="#5C5C5C" />
                          </div>
                          <div style={{fontSize:13,color:"#5C5C5C",textAlign:"center",maxWidth:240,lineHeight:1.4}}>
                            Ajoute une stratégie à ton trade et suis ce qui fonctionne
                          </div>
                        </div>
                        <div style={{position:"relative",width:"100%",display:"flex",justifyContent:"center",marginTop:4}}>
                          <button
                            onClick={()=>setShowStrategyDropdown(!showStrategyDropdown)}
                            style={{
                              padding:"8px 16px",
                              borderRadius:8,
                              border:`1px solid #E5E5E5`,
                              background:"#FFFFFF",
                              fontSize:13,
                              fontWeight:500,
                              color:"#0D0D0D",
                              cursor:"pointer",
                              display:"inline-flex",
                              alignItems:"center",
                              gap:8,
                              transition:"background .12s ease",
                              fontFamily:"var(--font-sans)",
                              boxShadow:"0 1px 2px rgba(0,0,0,0.03)",
                            }}
                            onMouseEnter={(e)=>{e.currentTarget.style.background="#FAFAFA"}}
                            onMouseLeave={(e)=>{e.currentTarget.style.background="#FFFFFF"}}
                          >
                            Ajouter une stratégie
                            <LucideChevronDown size={14} strokeWidth={1.75} />
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
                                    <div data-strat-menu style={{marginLeft:"auto",position:"relative"}}>
                                      <button
                                        onClick={(e)=>{e.stopPropagation();setOpenStratMenuId(openStratMenuId===strat.id?null:strat.id);}}
                                        aria-label="Options stratégie"
                                        style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMut,padding:4,display:"inline-flex",alignItems:"center",borderRadius:6,transition:"background .12s ease"}}
                                        onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}}
                                        onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
                                      >
                                        <LucideMoreHorizontal size={16} strokeWidth={2} />
                                      </button>
                                      {openStratMenuId === strat.id && (
                                        <div
                                          role="menu"
                                          style={{
                                            position:"absolute",
                                            top:"calc(100% + 4px)",
                                            right:0,
                                            background:"#FFFFFF",
                                            border:"1px solid #E5E5E5",
                                            borderRadius:8,
                                            boxShadow:"0 8px 24px rgba(0,0,0,0.10)",
                                            minWidth:180,
                                            padding:4,
                                            zIndex:50,
                                            fontFamily:"var(--font-sans)",
                                          }}
                                        >
                                          <button
                                            onClick={(e)=>{
                                              e.stopPropagation();
                                              const newIds = selectedIds.filter(id=>id!==strat.id);
                                              const newTradeStrategies = {...tradeStrategies,[tradeId]: newIds};
                                              setTradeStrategies(newTradeStrategies);
                                              localStorage.setItem("tr4de_trade_strategies", JSON.stringify(newTradeStrategies));
                                              setOpenStratMenuId(null);
                                            }}
                                            style={{
                                              display:"flex",alignItems:"center",gap:8,width:"100%",
                                              padding:"8px 10px",borderRadius:6,border:"none",
                                              background:"transparent",color:"#EF4444",
                                              fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                                            }}
                                            onMouseEnter={(e)=>{e.currentTarget.style.background="#FEF2F2"}}
                                            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
                                          >
                                            <LucideTrash2 size={14} strokeWidth={1.75} />
                                            Enlever la stratégie
                                          </button>
                                        </div>
                                      )}
                                    </div>
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

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteOpen && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          onClick={() => !isDeletingTrades && setConfirmDeleteOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)",padding:"24px"}}
        >
          <div
            onClick={(e)=>e.stopPropagation()}
            style={{background:"#FFFFFF",borderRadius:14,maxWidth:420,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,0.22)",border:"1px solid #E5E5E5",overflow:"hidden"}}
          >
            <div style={{padding:"20px 24px 8px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <LucideTrash2 size={16} strokeWidth={1.75} color="#EF4444"/>
              </div>
              <h3 style={{fontSize:15,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1}}>
                {t("trades.deleteConfirm").replace("{n}", String(selectedIds.size)).replace("{s}", selectedIds.size > 1 ? "s" : "")}
              </h3>
            </div>
            <div style={{padding:"4px 24px 20px",fontSize:13,color:"#5C5C5C",lineHeight:1.5}}>
              {t("trades.deleteWarning")}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #F0F0F0",background:"#FAFAFA"}}>
              <button
                onClick={()=>setConfirmDeleteOpen(false)}
                disabled={isDeletingTrades}
                style={{padding:"0 16px",height:36,borderRadius:8,border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#0D0D0D",fontSize:13,fontWeight:500,cursor:isDeletingTrades?"not-allowed":"pointer",fontFamily:"inherit",opacity:isDeletingTrades?0.5:1}}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async ()=>{
                  setIsDeletingTrades(true);
                  try {
                    const tradesToDelete = filteredTrades.filter(t => selectedIds.has(tradeKey(t)));
                    for (const t of tradesToDelete) {
                      if (onDeleteTrade) await onDeleteTrade(t);
                    }
                    setSelectedIds(new Set());
                  } catch (e) { console.error("delete trades failed:", e); }
                  finally {
                    setIsDeletingTrades(false);
                    setConfirmDeleteOpen(false);
                  }
                }}
                disabled={isDeletingTrades}
                style={{padding:"0 16px",height:36,borderRadius:8,border:"1px solid #EF4444",background:"#EF4444",color:"#FFFFFF",fontSize:13,fontWeight:600,cursor:isDeletingTrades?"not-allowed":"pointer",fontFamily:"inherit",opacity:isDeletingTrades?0.7:1}}
              >
                {isDeletingTrades ? t("trades.deleting") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* BOTTOM ACTION BAR (visible quand au moins 1 trade selectionne) */}
      {selectedIds.size > 0 && (
        <div style={{
          position:"fixed",
          bottom:24,
          left:"50%",
          transform:"translateX(-50%)",
          background:"#FFFFFF",
          color:"#0D0D0D",
          borderRadius:12,
          padding:"10px 14px",
          display:"flex",
          alignItems:"center",
          gap:14,
          fontFamily:"var(--font-sans)",
          fontSize:13,
          border:"1px solid #E5E5E5",
          boxShadow:"0 12px 32px rgba(0,0,0,0.14)",
          zIndex:100,
        }}>
          <span style={{fontWeight:600}}>
            {t("trades.selected").replace("{n}", String(selectedIds.size)).replace(/\{s\}/g, selectedIds.size > 1 ? "s" : "")}
          </span>

          <span style={{width:1,height:18,background:"#E5E5E5"}} />

          {/* Ajouter une strategie */}
          <div style={{position:"relative"}}>
            <button
              onClick={() => setShowBulkStrategyDropdown(v => !v)}
              style={{background:"transparent",border:"none",color:"#0D0D0D",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",borderRadius:6,display:"inline-flex",alignItems:"center",gap:4}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
            >
              {t("trades.addStrategy")}
            </button>
            {showBulkStrategyDropdown && (
              <div style={{
                position:"absolute",
                bottom:"calc(100% + 6px)",
                left:0,
                background:"#FFFFFF",
                color:"#0D0D0D",
                border:"1px solid #E5E5E5",
                borderRadius:10,
                boxShadow:"0 8px 24px rgba(0,0,0,0.10)",
                minWidth:200,
                maxHeight:240,
                overflowY:"auto",
                padding:4,
              }}>
                {(loadedStrategies && loadedStrategies.length > 0) ? loadedStrategies.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const next = {...tradeStrategies};
                      selectedIds.forEach(id => { next[id] = s.id; });
                      setTradeStrategies(next);
                      localStorage.setItem("tr4de_trade_strategies", JSON.stringify(next));
                      setShowBulkStrategyDropdown(false);
                    }}
                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,color:"#0D0D0D",borderRadius:6,textAlign:"left"}}
                    onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}}
                    onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
                  >
                    <span style={{width:8,height:8,borderRadius:"50%",background:s.color||"#10A37F"}}/>
                    {s.name}
                  </button>
                )) : (
                  <div style={{padding:"10px 10px",fontSize:12,color:"#8E8E8E"}}>Aucune stratégie disponible</div>
                )}
              </div>
            )}
          </div>

          <span style={{width:1,height:18,background:"#E5E5E5"}} />

          <button
            onClick={() => setConfirmDeleteOpen(true)}
            style={{background:"transparent",border:"none",color:"#EF4444",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",borderRadius:6}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="#FEF2F2"}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
          >
            Supprimer
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            aria-label="Tout désélectionner"
            style={{background:"transparent",border:"none",color:"#8E8E8E",fontSize:16,cursor:"pointer",fontFamily:"inherit",padding:"2px 6px",lineHeight:1}}
            onMouseEnter={(e)=>{e.currentTarget.style.color="#0D0D0D"}}
            onMouseLeave={(e)=>{e.currentTarget.style.color="#8E8E8E"}}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function StrategiesPage({ strategies, setStrategies, onCreateClick }) {
  const [showForm, setShowForm] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({top:0, left:0});
  const getDefaultFormData = () => ({name:"",description:"",color:"#10A37F",groups:[{id:Date.now(),name:"",rules:[{id:Date.now()+1,text:""}]}]});
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
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
        <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("strat.title")}</h1>
        <button onClick={()=>setShowForm(true)} style={{marginLeft:"auto",padding:"7px 14px",height:34,borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>+ Créer une stratégie</button>
        <div id="tr4de-page-header-slot" />
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
                      <td style={{padding:"14px 16px",textAlign:"right",color:T.text,fontWeight:600,fontFamily:"var(--font-sans)"}}>—</td>
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

  // Favoris brokers : localStorage = cache rapide, Supabase = source de vérité.
  const [favoriteBrokers, setFavoriteBrokers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tr4de_favorite_brokers") || "[]"); }
    catch { return []; }
  });

  // Charger depuis Supabase au montage + au focus
  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("favorite_brokers")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) {
          if (error.message?.includes("Could not find the table") || error.code === "PGRST116") return;
          throw error;
        }
        if (cancelled) return;
        const list = Array.isArray(data?.favorite_brokers) ? data.favorite_brokers : [];
        setFavoriteBrokers(list);
        try { localStorage.setItem("tr4de_favorite_brokers", JSON.stringify(list)); } catch {}
      } catch (e) { console.error("⚠️ load favorite_brokers failed:", e?.message || e); }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user?.id]);

  const toggleFavoriteBroker = (id) => {
    setFavoriteBrokers(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem("tr4de_favorite_brokers", JSON.stringify(next)); } catch {}
      // Push vers Supabase (upsert sur user_id UNIQUE)
      if (user?.id) {
        const supabase = createClient();
        supabase.from("user_preferences")
          .upsert([{ user_id: user.id, favorite_brokers: next }], { onConflict: "user_id" })
          .then(({ error }) => {
            if (error) console.error("⚠️ save favorite_brokers failed:", error.message);
          });
      }
      return next;
    });
  };
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
        // ✅ Generate a proper UUID instead of timestamp
        const newId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newStrategy = {
          id: newId,
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
          setSelectedImportStrategy(newId);
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
    // Futures / Prop firms
    { id: "tradovate",     name: "Tradovate",            format: "csv",  iconPath: "/trado.png" },
    { id: "rithmic",       name: "Rithmic R|Trader",     format: "csv",  iconPath: "/brokers/rithmic.png" },
    { id: "ninjatrader",   name: "NinjaTrader",          format: "csv",  iconPath: "/brokers/ninja%20trader.png" },
    { id: "topstep",       name: "Topstep X",            format: "csv",  iconPath: "/brokers/Topstep_Logo.jpg" },
    { id: "ftmo",          name: "FTMO",                 format: "csv",  iconPath: "/brokers/ftmo.png" },
    // Plateformes
    { id: "tradingview",   name: "TradingView",          format: "csv",  iconPath: "/brokers/tradingview.webp" },
    { id: "mt5",           name: "MetaTrader 5",         format: "html", iconPath: "/MetaTrader_5.png" },
    { id: "mt4",           name: "MetaTrader 4",         format: "html", iconPath: "/brokers/MetaTrader_4.png" },
    { id: "thinkorswim",   name: "thinkorswim",          format: "csv",  iconPath: "/brokers/thinkorswim.png" },
    { id: "wealthcharts",  name: "WealthCharts",         format: "csv",  iconPath: "/weal.webp" },
    // Brokers actions / CFD
    { id: "ibkr",          name: "Interactive Brokers",  format: "csv",  iconPath: "/brokers/Interactive%20broker.png" },
    { id: "capitalcom",    name: "Capital.com",          format: "csv",  iconPath: "/brokers/capital.png" },
    { id: "ig",            name: "IG",                   format: "csv",  iconPath: "/brokers/if%20logo.png" },
    { id: "webull",        name: "Webull",               format: "csv",  iconPath: "/brokers/webull.png" },
  ];

  const getBrokerInstructions = () => {
    const broker = brokers.find(b => b.id === selectedBroker);
    const iconPath = broker?.iconPath || "/trado.png";
    const name = broker?.name || "Broker";

    const map = {
      tradovate: {
        subtext: "Actifs : Futures (CME, ICE, Eurex)",
        steps: [
          "1. Ouvrir l'onglet Account de Tradovate",
          "2. Aller dans Settings → Orders",
          "3. Sélectionner la plage de dates et cliquer Go",
          "4. Cliquer Download Report (export CSV)",
          "5. Charger le fichier CSV ici"
        ]
      },
      rithmic: {
        subtext: "Actifs : Futures (multi-bourses)",
        steps: [
          "1. Ouvrir Rithmic R|Trader Pro",
          "2. Menu Reports → Order History (ou Trade History)",
          "3. Choisir la plage de dates puis Run Report",
          "4. Bouton Save / Export → format CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      ninjatrader: {
        subtext: "Actifs : Futures, Forex, Actions",
        steps: [
          "1. Ouvrir NinjaTrader Control Center",
          "2. Menu Account → Account Performance (ou Trade Performance)",
          "3. Filtrer par compte et période",
          "4. Clic-droit sur le tableau des Trades → Export → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      topstep: {
        subtext: "Prop firm Futures – plateforme TopstepX",
        steps: [
          "1. Se connecter au dashboard TopstepX",
          "2. Onglet Performance / Trade History",
          "3. Filtrer par compte et plage de dates",
          "4. Bouton Export → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      ftmo: {
        subtext: "Prop firm Forex / CFD – via MetaTrader",
        steps: [
          "1. Ouvrir MetaTrader 4/5 connecté au compte FTMO",
          "2. Onglet Toolbox → History",
          "3. Clic-droit → Custom Period et choisir la plage",
          "4. Clic-droit à nouveau → Save as Report (HTML)",
          "5. Charger le fichier HTML ici"
        ]
      },
      tradingview: {
        subtext: "Charts + brokers connectés",
        steps: [
          "1. Ouvrir le panneau Trading en bas de TradingView",
          "2. Onglet History des ordres ou trades",
          "3. Bouton Export ou ⋯ → Download CSV",
          "4. Charger le fichier CSV ici"
        ]
      },
      mt5: {
        subtext: "Forex, Actions, Indices, Crypto",
        steps: [
          "1. Ouvrir le terminal MetaTrader 5",
          "2. Onglet Toolbox → History",
          "3. Clic-droit → Custom Period et choisir la plage",
          "4. Clic-droit à nouveau → Report → Open XML (HTML)",
          "5. Charger le fichier HTML ici"
        ]
      },
      mt4: {
        subtext: "Forex, CFD",
        steps: [
          "1. Ouvrir le terminal MetaTrader 4",
          "2. Onglet Terminal → Account History",
          "3. Clic-droit → All History (ou période personnalisée)",
          "4. Clic-droit à nouveau → Save as Detailed Report (HTML)",
          "5. Charger le fichier HTML ici"
        ]
      },
      thinkorswim: {
        subtext: "Charles Schwab – Actions, Options, Futures",
        steps: [
          "1. Ouvrir thinkorswim Desktop",
          "2. Onglet Monitor → Account Statement",
          "3. Sélectionner la plage de dates",
          "4. Bouton menu (icône ⚙) → Export to File → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      wealthcharts: {
        subtext: "Plateforme charts – Futures, Actions, Indices",
        steps: [
          "1. Ouvrir WealthCharts Trading Platform",
          "2. Aller dans Orders ou History",
          "3. Exporter en CSV",
          "4. Vérifier que le fichier contient : order_id, qty_sent, qty_done, price_done",
          "5. Charger le fichier CSV ici"
        ]
      },
      ibkr: {
        subtext: "Actions, Options, Futures, Forex (multi-marchés)",
        steps: [
          "1. Se connecter au Client Portal IBKR",
          "2. Performance & Reports → Statements ou Flex Queries",
          "3. Configurer une Flex Query Trades / Executions",
          "4. Lancer la requête et télécharger le CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      capitalcom: {
        subtext: "CFD sur Forex, Actions, Indices, Crypto",
        steps: [
          "1. Se connecter au compte Capital.com (web)",
          "2. Menu My Account → Statements / Reports",
          "3. Filtrer par période → onglet Trades / Closed positions",
          "4. Bouton Export → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      ig: {
        subtext: "CFD, Spread Betting, Actions",
        steps: [
          "1. Se connecter à My IG (Web)",
          "2. Menu History (Live Account)",
          "3. Sélectionner la plage de dates",
          "4. Bouton Download → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      webull: {
        subtext: "Actions, Options, Crypto (US)",
        steps: [
          "1. Ouvrir l'app Webull Desktop ou Web",
          "2. Menu Account → Statements (Activity Statements)",
          "3. Choisir la période et type Trade Activity",
          "4. Export en CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
    };

    const cfg = map[selectedBroker] || map.tradovate;
    return {
      iconPath,
      name,
      title: name,
      subtext: cfg.subtext,
      steps: cfg.steps,
    };
  };

  const lastSavedRef = useRef({ broker: null, type: null, size: null });

  // Charger les infos du compte quand le nom change
  useEffect(() => {
    if (accountName && accounts.length > 0) {
      const selectedAccount = accounts.find(acc => acc.name === accountName);
      if (selectedAccount) {
        const brokerMatch = brokers.find(b =>
          b.name.toLowerCase() === String(selectedAccount.broker || "").toLowerCase() ||
          b.id.toLowerCase() === String(selectedAccount.broker || "").toLowerCase()
        );
        const bId = brokerMatch?.id || "tradovate";
        const aType = selectedAccount.account_type || "live";
        const aSize = (aType === "eval" && selectedAccount.eval_account_size)
          ? selectedAccount.eval_account_size
          : "25k";

        lastSavedRef.current = { broker: bId, type: aType, size: aSize };
        setSelectedBroker(bId);
        setAccountType(aType);
        setSelectedEvalAccount(aSize);
        setIsEditingAccount(true);
      }
    } else {
      setIsEditingAccount(false);
    }
  }, [accountName, accounts]);

  // Auto-sauvegarde : ne fire que si la valeur diffère de ce qui est en DB
  useEffect(() => {
    if (!isEditingAccount) return;
    const saved = lastSavedRef.current;
    if (
      saved.broker === selectedBroker &&
      saved.type === accountType &&
      saved.size === selectedEvalAccount
    ) return;
    const t = setTimeout(() => {
      lastSavedRef.current = {
        broker: selectedBroker,
        type: accountType,
        size: selectedEvalAccount,
      };
      saveAccountChanges();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBroker, accountType, selectedEvalAccount, isEditingAccount]);

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
      
      const brokerObj = brokers.find(b => b.id === selectedBroker);
      const updateData = {
        broker: brokerObj?.name || "Tradovate",
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

        // Notifier les autres composants (sidebar, selecteurs) pour rafraichir le logo
        try {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("tr4de:accounts-changed"));
          }
        } catch {}

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
      
      // Nom officiel du broker pour enregistrement DB
      const brokerObj = brokers.find(b => b.id === selectedBroker);
      const brokerFormatted = brokerObj?.name || "Tradovate";
      
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
        .map(t => ({
          user_id: userId,
          account_id: accountId,
          date: t.date,
          symbol: t.symbol,
          direction: t.direction,
          entry: t.entry,
          exit: t.exit,
          pnl: t.pnl,
          entry_time: t.entryTime || t.entry_time || null,
          exit_time: t.exitTime || t.exit_time || null,
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
          
          const strategyId = String(selectedImportStrategy);
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
              {t("addTrade.account")}
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
              {t("addTrade.broker")}
            </label>
            <SearchableSelect
              value={selectedBroker}
              onChange={(id) => { setSelectedBroker(id); setError(""); }}
              options={(() => {
                const isFav = (id) => favoriteBrokers.includes(id);
                const sorted = [...brokers].sort((a, b) => {
                  const fa = isFav(a.id), fb = isFav(b.id);
                  if (fa !== fb) return fa ? -1 : 1;          // favoris en haut
                  return a.name.localeCompare(b.name);        // puis alphabétique
                });
                return sorted.map(b => ({
                  id: b.id,
                  label: b.name,
                  iconUrl: b.iconPath,
                  accessory: (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={isFav(b.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                      title={isFav(b.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                      onClick={() => toggleFavoriteBroker(b.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFavoriteBroker(b.id); } }}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 22, height: 22, borderRadius: 4,
                        background: "transparent", cursor: "pointer", padding: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F0F0F0"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <Star
                        size={13}
                        strokeWidth={1.75}
                        color={isFav(b.id) ? "#F59E0B" : "#8E8E8E"}
                        fill={isFav(b.id) ? "#F59E0B" : "none"}
                      />
                    </span>
                  ),
                }));
              })()}
              searchPlaceholder="Rechercher un courtier..."
              emptyLabel="Aucun courtier"
              small
            />
          </div>
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 14px -24px" }}></div>

          {/* ACCOUNT TYPE */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              {t("addTrade.accountType")}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {["live", "eval"].map((type) => (
                <button
                  key={type}
                  onClick={() => setAccountType(type)}
                  onMouseEnter={(e) => {
                    if (accountType !== type) {
                      e.currentTarget.style.background = "#F5F5F5";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (accountType !== type) {
                      e.currentTarget.style.background = T.white;
                    }
                  }}
                  style={{
                    padding: "8px 12px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    background: accountType === type ? "#F0F0F0" : T.white,
                    color: T.text,
                    fontSize: 13,
                    fontWeight: accountType === type ? 600 : 500,
                    cursor: "pointer",
                    transition: "background 120ms ease, font-weight 0ms",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {type === "live" ? t("addTrade.live") : t("addTrade.eval")}
                </button>
              ))}
            </div>
            {accountType === "eval" && (
              <div style={{ marginTop: "12px" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "8px", color: T.textMut, textTransform: "uppercase" }}>
                  {t("addTrade.accountSize")}
                </label>
                <SearchableSelect
                  value={selectedEvalAccount}
                  onChange={setSelectedEvalAccount}
                  options={[
                    { id: "25k", label: "$25,000" },
                    { id: "50k", label: "$50,000" },
                    { id: "100k", label: "$100,000" },
                    { id: "150k", label: "$150,000" },
                  ]}
                  searchable={false}
                />
              </div>
            )}
          </div>
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>

          {/* STRATEGY SELECTOR */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              {t("addTrade.strategy")}
            </label>
            <SearchableSelect
              value={selectedImportStrategy}
              onChange={(id) => {
                if (id === "create_new") {
                  setShowStrategyForm(true);
                  setStrategyFormData(getDefaultStrategyFormData());
                } else {
                  setSelectedImportStrategy(id);
                }
              }}
              options={[
                { id: "", label: "Aucune stratégie" },
                ...strategies.map((s) => ({
                  id: s.id,
                  label: s.name,
                  iconNode: <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color || "#10A37F", display: "inline-block" }} />,
                })),
                { id: "create_new", label: "+ Créer une stratégie", isAction: true },
              ]}
              searchPlaceholder="Rechercher une stratégie..."
              emptyLabel="Aucune stratégie"
              placeholder="Sélectionner une stratégie"
            />
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
              <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%", fontFamily: "var(--font-sans)" }}>
                {!fileName ? (
                  <LucideUpload size={22} strokeWidth={1.5} color={T.textMut} />
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#10A37F" }}>
                    <LucideCheck size={16} strokeWidth={2} />
                  </span>
                )}
                <div style={{ fontSize: 12, color: fileName ? "#0D0D0D" : T.textSub, fontWeight: 500 }}>
                  {fileName || "Glissez votre fichier ici ou parcourir"}
                </div>
                {!fileName && <div style={{ fontSize: 11, color: T.textMut }}>CSV, TXT, ou HTML</div>}
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
            {loading ? t("addTrade.processing") : t("addTrade.importTrades")}
          </button>

          {/* STRATEGY FORM MODAL */}
          {showStrategyForm && ReactDOM.createPortal(
            <div onClick={() => { setShowStrategyForm(false); setStrategyFormData(getDefaultStrategyFormData()); }} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div onClick={(e)=>e.stopPropagation()} style={{background:T.white,borderRadius:12,padding:40,maxWidth:600,width:"90%",maxHeight:"90vh",overflowY:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h2 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>Créer une stratégie</h2>
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
    // Padding : on force toujours 6 semaines (42 cellules) pour que tous les mois
    // aient la même hauteur et que le fond de sélection couvre toute la cellule.
    while (cells.length < 42) cells.push(null);

    return (
      <div key={monthIdx} style={{background: expandedMonth === monthIdx ? "var(--color-hover-bg, #FAFAFA)" : T.white,padding:"16px 18px",cursor:"pointer",fontFamily:"var(--font-sans)",transition:"background .12s ease",height:"100%",boxSizing:"border-box"}} onClick={()=>{
        if (expandedMonth === monthIdx) {
          setExpandedMonth(null);
        } else {
          setExpandedMonth(monthIdx);
          window.scrollTo({top:0,behavior:"smooth"});
        }
      }}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:12,color:T.text,letterSpacing:-0.1,textAlign:"center"}}>{months[monthIdx]}</div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {dayLabels.map(d=>(
            <div key={d} style={{fontSize:10,fontWeight:500,textAlign:"center",color:T.textMut,paddingBottom:4}}>
              {d}
            </div>
          ))}

          {cells.map((day,idx)=>{
            if (day === null) return <div key={`empty-${idx}`} style={{aspectRatio:"1 / 1"}}/>;

            const dateStr = `${year}-${String(monthIdx + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const pnl = pnlByDate[dateStr] || 0;

            let bg = "transparent";
            let textColor = T.textMut;

            if (pnl > 0) {
              bg = "rgba(16, 163, 127, 0.18)";
              textColor = T.green;
            } else if (pnl < 0) {
              bg = "rgba(239, 68, 68, 0.18)";
              textColor = T.red;
            }

            return (
              <div key={day} style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                aspectRatio:"1 / 1",
                background:bg,
                borderRadius:6,
                fontSize:11,
                fontWeight: pnl !== 0 ? 600 : 400,
                color: pnl !== 0 ? textColor : T.textMut,
                transition:"background .12s ease",
              }}>
                {String(day).padStart(2,'0')}
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
            <div style={{fontSize:16,fontWeight:500,color:T.textMut}}>{monthName}</div>
            <div style={{fontSize:18,fontWeight:500,color:monthPnL>=0?T.green:T.red,marginTop:4}}>
              {monthPnL>=0?"+":""}{getCurrencySymbol()}{monthPnL.toFixed(2)}
            </div>
          </div>
          
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            {accountType === "eval" && (
              <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:160,alignItems:"flex-end"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:500,color:T.textMut,marginBottom:4}}>EVAL {getCurrencySymbol()}{evalAccountSize.toUpperCase()}</div>
                  <div style={{fontSize:14,fontWeight:500,color:totalPnL >= evalObjectives[evalAccountSize] ? T.green : T.text}}>
                    {getCurrencySymbol()}{totalPnL.toFixed(2)} / {getCurrencySymbol()}{evalObjectives[evalAccountSize]}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,width:"100%"}}>
                  <div style={{flex:1,height:6,background:T.border,borderRadius:3,overflow:"hidden",minWidth:100}}>
                    <div style={{height:"100%",background:totalPnL >= evalObjectives[evalAccountSize] ? T.green : "#8E8E8E",width:`${Math.min(100, (totalPnL / evalObjectives[evalAccountSize]) * 100)}%`,transition:"width 0.3s"}}/>
                  </div>
                  <div style={{fontSize:11,color:T.textMut,minWidth:35,textAlign:"right"}}>{((totalPnL / evalObjectives[evalAccountSize]) * 100).toFixed(0)}%</div>
                </div>
              </div>
            )}
            <button onClick={()=>setExpandedMonth(null)} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:T.textMut,flexShrink:0}}>✕</button>
          </div>
        </div>

        <div style={{overflowX:"auto",fontFamily:"var(--font-sans)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900,tableLayout:"fixed"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${T.border}`}}>
                {dayLabels.map((day) => (
                  <th key={day} style={{padding:"10px 12px",textAlign:"center",fontWeight:500,color:T.textMut,width:"12.5%",fontSize:11}}>
                    {day}
                  </th>
                ))}
                <th style={{padding:"10px 12px",textAlign:"center",fontWeight:500,color:T.textMut,width:"12.5%",fontSize:11}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIdx) => {
                const weekPnL = week.reduce((sum, d) => sum + (d && d > 0 && dayStats[d] ? dayStats[d].pnl : 0), 0);
                const weekTrades = week.reduce((sum, d) => sum + (d && d > 0 && dayStats[d] ? dayStats[d].trades : 0), 0);

                return (
                  <tr key={weekIdx} style={{borderBottom:`1px solid ${T.border}`,height:88}}>
                    {week.map((day, dayIdx) => {
                      const cellBorder = `1px solid ${T.border}`;
                      if (day === null) {
                        return <td key={`empty-${dayIdx}`} style={{padding:"10px 12px",background:"transparent",verticalAlign:"top",borderRight:cellBorder}} />;
                      }

                      // Previous month days (negative values)
                      if (day < 0) {
                        const prevDay = Math.abs(day);
                        return (
                          <td key={`prev-${dayIdx}`} style={{padding:"10px 12px",background:T.white,verticalAlign:"top",opacity:0.35,borderRight:cellBorder}}>
                            <div style={{fontWeight:500,color:T.textMut,fontSize:13}}>{String(prevDay).padStart(2, '0')}</div>
                          </td>
                        );
                      }

                      const stats = dayStats[day];
                      const pnl = stats.pnl;
                      const tradesCount = stats.trades;
                      let bg = T.white;
                      let textColor = T.text;
                      let valueColor = T.textMut;

                      if (pnl > 0) {
                        bg = "rgba(16, 163, 127, 0.02)";
                        valueColor = T.green;
                      } else if (pnl < 0) {
                        bg = "rgba(239, 68, 68, 0.02)";
                        valueColor = T.red;
                      }

                      return (
                        <td key={day} style={{padding:"10px 12px",background:bg,verticalAlign:"top",textAlign:"left",borderRight:cellBorder}}>
                          <div style={{fontWeight:500,color:textColor,fontSize:13,marginBottom:6}}>{String(day).padStart(2, '0')}</div>
                          <div style={{color:tradesCount > 0 ? valueColor : T.textMut,fontWeight:400,fontSize:12,marginBottom:2}}>
                            {tradesCount > 0 ? `${pnl>=0?"+":""}${getCurrencySymbol()}${pnl.toFixed(0)}` : `${getCurrencySymbol()}0`}
                          </div>
                          <div style={{color:T.textMut,fontSize:10,fontWeight:500}}>{tradesCount} trade{tradesCount !== 1 ? "s" : ""}</div>
                        </td>
                      );
                    })}
                    <td style={{padding:"10px 12px",background:T.white,verticalAlign:"top",textAlign:"left",borderLeft:`1px solid ${T.border}`}}>
                      <div style={{fontWeight:400,color:T.text,fontSize:13,marginBottom:6}}>Semaine {weekIdx + 1}</div>
                      <div style={{color:weekPnL>=0?T.green:weekPnL<0?T.red:T.textMut,fontWeight:400,fontSize:12,marginBottom:2}}>
                        {weekPnL>=0?"+":""}{getCurrencySymbol()}{weekPnL.toFixed(0)}
                      </div>
                      <div style={{color:T.textMut,fontSize:10,fontWeight:500}}>{weekTrades} trade{weekTrades !== 1 ? "s" : ""}</div>
                    </td>
                  </tr>
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
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("cal.title")}</h1>
        <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
      </div>
      {renderMonthDetail()}

      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12,fontFamily:"var(--font-sans)"}}>
        <button onClick={()=>setYear(year-1)} aria-label="Année précédente" style={{padding:6,borderRadius:8,background:"transparent",border:"none",cursor:"pointer",color:T.textSub,display:"inline-flex",alignItems:"center",transition:"background .12s ease"}} onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
          <span style={{fontSize:14,fontWeight:600,lineHeight:1}}>‹</span>
        </button>
        <div style={{fontSize:15,fontWeight:600,color:T.text,minWidth:48,textAlign:"center"}}>{year}</div>
        <button onClick={()=>setYear(year+1)} aria-label="Année suivante" style={{padding:6,borderRadius:8,background:"transparent",border:"none",cursor:"pointer",color:T.textSub,display:"inline-flex",alignItems:"center",transition:"background .12s ease"}} onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
          <span style={{fontSize:14,fontWeight:600,lineHeight:1}}>›</span>
        </button>
      </div>

      {trades.length === 0 && (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:40,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:600,color:T.text,marginBottom:8}}>{t("cal.noTradesImported")}</div>
          <p style={{color:T.textSub}}>{t("cal.noTradesImportedSub")}</p>
        </div>
      )}

      {/* Year grid : 12 mois colles, separes par des lignes */}
      <div style={{
        background:T.white,
        border:`1px solid ${T.border}`,
        borderRadius:12,
        overflow:"hidden",
        display:"grid",
        gridTemplateColumns:"repeat(3,1fr)",
        gap:0,
      }}>
        {[...Array(12)].map((_,i)=>{
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <div key={i} style={{
              borderRight: col < 2 ? `1px solid ${T.border}` : "none",
              borderBottom: row < 3 ? `1px solid ${T.border}` : "none",
            }}>
              {renderMonth(i)}
            </div>
          );
        })}
      </div>

      <div style={{display:"flex",gap:24,fontSize:12,padding:16,background:T.white,borderRadius:12,border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:20,height:20,borderRadius:4,background:T.greenBg,border:`2px solid ${T.green}`}}/>
          <span style={{color:T.textSub}}>{t("cal.legendPositive")}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:20,height:20,borderRadius:4,background:T.redBg,border:`2px solid ${T.red}`}}/>
          <span style={{color:T.textSub}}>{t("cal.legendNegative")}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:20,height:20,borderRadius:4,background:T.border}}/>
          <span style={{color:T.textSub}}>{t("cal.legendEmpty").replace("{n}", String(trades.length))}</span>
        </div>
      </div>
    </div>
  );
}

// === Sous-composants pour les blocs Bias / Règles / Erreurs ===
function reorder(arr, from, to) {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Édition inline : le bloc lui-même devient éditable (pas de modale ni de drawer).
// On affiche les items en cards éditables avec poignée + champ + corbeille.
function EditListModal({ open, title, accent, items, isCheckList, onClose, onSave }) {
  const [draft, setDraft] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  useEffect(() => {
    if (open) setDraft(items.map(it => isCheckList ? { ...it } : { label: it }));
  }, [open, items, isCheckList]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const update = (i, val) => setDraft(d => d.map((x, idx) => idx === i ? { ...x, label: val } : x));
  const remove = (i) => setDraft(d => d.filter((_, idx) => idx !== i));
  const add = () => setDraft(d => [...d, isCheckList ? { id: `personal_${Date.now()}_${d.length}`, label: "" } : { label: "" }]);
  const move = (from, to) => setDraft(d => reorder(d, from, to));
  const save = () => {
    const cleaned = draft.map(x => ({ ...x, label: (x.label || "").trim() })).filter(x => x.label);
    if (isCheckList) onSave(cleaned);
    else onSave(cleaned.map(x => x.label));
    onClose();
  };
  return ReactDOM.createPortal(
    <>
      {/* Backdrop avec slide-in fade */}
      <div onClick={onClose} style={{
        position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:9998,
        animation:"tr4de-drawer-fade 180ms ease both",
      }}/>

      {/* Drawer latéral */}
      <aside style={{
        position:"fixed",top:0,right:0,bottom:0,width:"min(440px, 92vw)",
        background:"#FFFFFF",borderLeft:"1px solid #E5E5E5",
        zIndex:9999,display:"flex",flexDirection:"column",
        boxShadow:"-12px 0 40px rgba(0,0,0,0.10)",
        fontFamily:"var(--font-sans)",
        animation:"tr4de-drawer-slide 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}>

        {/* Header avec accent à gauche */}
        <div style={{display:"flex",alignItems:"stretch",borderBottom:"1px solid #F0F0F0"}}>
          <div style={{width:3,background:accent,flexShrink:0}}/>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:"18px 20px"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,color:"#8E8E8E",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Édition</div>
              <h2 style={{fontSize:16,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</h2>
            </div>
            <button onClick={onClose} aria-label="Fermer"
              style={{display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,background:"transparent",border:"none",cursor:"pointer",color:"#8E8E8E",borderRadius:8,flexShrink:0}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5";e.currentTarget.style.color="#0D0D0D"}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#8E8E8E"}}>
              <LucideX size={18} strokeWidth={1.75}/>
            </button>
          </div>
        </div>

        {/* Liste éditable */}
        <div className="scroll-thin" style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          {draft.length === 0 ? (
            <div style={{padding:"48px 16px",textAlign:"center",color:"#8E8E8E",fontSize:13}}>
              Aucune règle pour l'instant.<br/>
              <span style={{fontSize:12,color:"#B4B4B4"}}>Ajoute-en une avec le bouton ci-dessous.</span>
            </div>
          ) : (
            <ol style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:8}}>
              {draft.map((it, i) => (
                <li key={i}
                  draggable
                  onDragStart={()=>setDragIdx(i)}
                  onDragOver={(e)=>{e.preventDefault();setOverIdx(i)}}
                  onDragLeave={()=>setOverIdx(null)}
                  onDrop={()=>{ if (dragIdx!==null && dragIdx!==i) move(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
                  onDragEnd={()=>{setDragIdx(null);setOverIdx(null)}}
                  style={{
                    display:"flex",alignItems:"center",gap:6,
                    background: overIdx===i && dragIdx!==i ? "#F5F5F5" : "#FFFFFF",
                    border:`1px solid ${overIdx===i && dragIdx!==i ? accent : "#E5E5E5"}`,
                    borderRadius:10,
                    padding:"4px 8px 4px 4px",
                    opacity: dragIdx===i ? 0.4 : 1,
                    transition:"border-color .12s ease, background .12s ease, opacity .12s ease",
                  }}>
                  <span style={{cursor:"grab",color:"#C8C8C8",display:"inline-flex",padding:"6px 4px",flexShrink:0}} title="Glisser pour réordonner">
                    <GripVertical size={14} strokeWidth={1.75}/>
                  </span>
                  <input
                    type="text" value={it.label} placeholder={`Règle ${i+1}`}
                    onChange={(e)=>update(i, e.target.value)}
                    style={{flex:1,padding:"8px 0",border:"none",outline:"none",fontSize:13,fontFamily:"inherit",color:"#0D0D0D",background:"transparent"}}
                  />
                  <button type="button" onClick={()=>remove(i)} title="Supprimer"
                    style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",cursor:"pointer",color:"#B4B4B4",borderRadius:6,flexShrink:0,transition:"color .12s ease, background .12s ease"}}
                    onMouseEnter={(e)=>{e.currentTarget.style.color="#EF4444";e.currentTarget.style.background="#FEF2F2"}}
                    onMouseLeave={(e)=>{e.currentTarget.style.color="#B4B4B4";e.currentTarget.style.background="transparent"}}>
                    <LucideTrash2 size={14} strokeWidth={1.75}/>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {/* Bouton ajouter */}
          <button type="button" onClick={add}
            style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:6,
              padding:"10px",fontSize:13,fontWeight:500,
              color:"#0D0D0D",background:"transparent",
              border:"1px dashed #D4D4D4",cursor:"pointer",borderRadius:10,
              fontFamily:"inherit",width:"100%",marginTop:draft.length === 0 ? 0 : 8,
              transition:"background .12s ease, border-color .12s ease",
            }}
            onMouseEnter={(e)=>{e.currentTarget.style.background=accent+"14";e.currentTarget.style.borderColor=accent}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="#D4D4D4"}}>
            <Plus size={14} strokeWidth={2}/> Ajouter une règle
          </button>
        </div>

        {/* Footer */}
        <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderTop:"1px solid #F0F0F0",background:"#FAFAFA"}}>
          <span style={{fontSize:11,color:"#8E8E8E",fontVariantNumeric:"tabular-nums"}}>
            {draft.filter(d => (d.label || "").trim()).length} règle{draft.length > 1 ? "s" : ""}
          </span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"0 16px",height:34,borderRadius:8,border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#0D0D0D",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
            <button onClick={save} style={{padding:"0 16px",height:34,borderRadius:8,border:"1px solid #0D0D0D",background:"#0D0D0D",color:"#FFFFFF",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Enregistrer</button>
          </div>
        </div>

      </aside>

      <style>{`
        @keyframes tr4de-drawer-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tr4de-drawer-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>,
    document.body
  );
}
function EditableTextList({ title, iconBg, icon, items, onSave, renderPrefix, accent }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const enterEdit = () => { setDraft(items.map(it => ({ label: it }))); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraft([]); };
  const saveEdit = () => {
    const cleaned = draft.map(x => (x.label || "").trim()).filter(Boolean);
    onSave(cleaned);
    setEditing(false); setDraft([]);
  };
  const update = (i, val) => setDraft(d => d.map((x, idx) => idx === i ? { ...x, label: val } : x));
  const removeRow = (i) => setDraft(d => d.filter((_, idx) => idx !== i));
  const addRow = () => setDraft(d => [...d, { label: "" }]);
  const move = (from, to) => setDraft(d => reorder(d, from, to));
  return (
    <div
      style={{background:"#FFFFFF",border:`1px solid ${editing ? accent : "#E5E5E5"}`,borderRadius:12,overflow:"hidden",transition:"border-color .15s ease"}}
      onMouseEnter={(e)=>{ if (!editing) { const btn = e.currentTarget.querySelector('[data-edit-btn]'); if (btn) btn.style.opacity = 1; } }}
      onMouseLeave={(e)=>{ if (!editing) { const btn = e.currentTarget.querySelector('[data-edit-btn]'); if (btn) btn.style.opacity = 0; } }}>
      {/* Header */}
      <div style={{padding:"14px 16px 12px",borderBottom:`1px solid ${editing ? accent + "30" : "#E5E5E5"}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:24,height:24,borderRadius:6,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div>
        <div style={{fontSize:13,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.1,flex:1}}>{title}</div>
        {editing ? (
          <div style={{display:"flex",gap:6}}>
            <button onClick={cancelEdit} style={{height:26,padding:"0 10px",border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#5C5C5C",fontSize:12,fontWeight:500,cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}>Annuler</button>
            <button onClick={saveEdit} style={{height:26,padding:"0 10px",border:`1px solid ${accent}`,background:accent,color:"#FFFFFF",fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}>OK</button>
          </div>
        ) : (
          <button data-edit-btn type="button" onClick={enterEdit} title="Modifier"
            style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,border:"none",background:"transparent",cursor:"pointer",color:"#8E8E8E",borderRadius:6,opacity:0,transition:"opacity .15s ease"}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0";e.currentTarget.style.color="#0D0D0D"}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#8E8E8E"}}>
            <Pencil size={13} strokeWidth={1.75}/>
          </button>
        )}
      </div>

      {/* Corps */}
      {editing ? (
        <div style={{padding:"8px 10px 12px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {draft.map((it,i)=>(
              <div key={i}
                draggable
                onDragStart={()=>setDragIdx(i)}
                onDragOver={(e)=>{e.preventDefault();setOverIdx(i)}}
                onDragLeave={()=>setOverIdx(null)}
                onDrop={()=>{ if (dragIdx!==null && dragIdx!==i) move(dragIdx,i); setDragIdx(null); setOverIdx(null); }}
                onDragEnd={()=>{setDragIdx(null);setOverIdx(null)}}
                style={{display:"flex",alignItems:"center",gap:4,padding:"2px 4px",borderRadius:6,
                  background: overIdx===i && dragIdx!==i ? "#F5F5F5" : "transparent",
                  opacity: dragIdx===i ? 0.4 : 1,
                  transition:"background .12s ease",
                }}>
                <span style={{cursor:"grab",color:"#C8C8C8",display:"inline-flex",padding:4,flexShrink:0}}><GripVertical size={12} strokeWidth={1.75}/></span>
                <input
                  type="text" value={it.label} placeholder={`Règle ${i+1}`}
                  onChange={(e)=>update(i, e.target.value)}
                  onKeyDown={(e)=>{ if (e.key==="Enter"){ e.preventDefault(); addRow(); } }}
                  style={{flex:1,fontSize:12,padding:"6px 8px",border:"1px solid transparent",borderRadius:6,outline:"none",fontFamily:"inherit",color:"#0D0D0D",background:"#FAFAFA"}}
                  onFocus={(e)=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.background="#FFFFFF"}}
                  onBlur={(e)=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.background="#FAFAFA"}}
                />
                <button type="button" onClick={()=>removeRow(i)} title="Supprimer"
                  style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",cursor:"pointer",color:"#B4B4B4",borderRadius:4,flexShrink:0}}
                  onMouseEnter={(e)=>{e.currentTarget.style.color="#EF4444"}} onMouseLeave={(e)=>{e.currentTarget.style.color="#B4B4B4"}}>
                  <LucideTrash2 size={12} strokeWidth={1.75}/>
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow}
            style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6,padding:"6px 8px",fontSize:12,color:"#5C5C5C",background:"transparent",border:"none",cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5";e.currentTarget.style.color="#0D0D0D"}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#5C5C5C"}}>
            <Plus size={12} strokeWidth={2}/> Ajouter
          </button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",padding:"8px 6px"}}>
          {items.length === 0 && (
            <div style={{padding:"12px",fontSize:12,color:"#8E8E8E",textAlign:"center"}}>Aucun élément. Survolez et cliquez ✎ pour ajouter.</div>
          )}
          {items.map((txt,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"6px 10px",borderRadius:6,transition:"background .12s ease"}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5"}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
              {renderPrefix?.(i)}
              <div style={{fontSize:12,color:"#0D0D0D",fontWeight:400,lineHeight:1.5,flex:1}}>{txt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableCheckList({ title, iconBg, icon, items, checkedRuleIds, onToggleCheck, onSave, accent }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const checkedCount = items.filter(r => !!checkedRuleIds[r.id]).length;
  const enterEdit = () => { setDraft(items.map(it => ({...it}))); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraft([]); };
  const saveEdit = () => {
    const cleaned = draft.map(x => ({...x, label: (x.label||"").trim()})).filter(x => x.label);
    onSave(cleaned);
    setEditing(false); setDraft([]);
  };
  const update = (i, val) => setDraft(d => d.map((x,idx) => idx===i ? {...x, label: val} : x));
  const removeRow = (i) => setDraft(d => d.filter((_,idx) => idx!==i));
  const addRow = () => setDraft(d => [...d, { id: `personal_${Date.now()}_${d.length}`, label: "" }]);
  const move = (from, to) => setDraft(d => reorder(d, from, to));
  return (
    <div style={{background:"#FFFFFF",border:`1px solid ${editing ? accent : "#E5E5E5"}`,borderRadius:12,overflow:"hidden",transition:"border-color .15s ease"}}
      onMouseEnter={(e)=>{ if (!editing) { const btn = e.currentTarget.querySelector('[data-edit-btn]'); if (btn) btn.style.opacity = 1; } }}
      onMouseLeave={(e)=>{ if (!editing) { const btn = e.currentTarget.querySelector('[data-edit-btn]'); if (btn) btn.style.opacity = 0; } }}>
      <div style={{padding:"14px 16px 12px",borderBottom:`1px solid ${editing ? accent + "30" : "#E5E5E5"}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:24,height:24,borderRadius:6,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div>
        <div style={{fontSize:13,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.1,flex:1}}>{title}</div>
        {editing ? (
          <div style={{display:"flex",gap:6}}>
            <button onClick={cancelEdit} style={{height:26,padding:"0 10px",border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#5C5C5C",fontSize:12,fontWeight:500,cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}>Annuler</button>
            <button onClick={saveEdit} style={{height:26,padding:"0 10px",border:`1px solid ${accent}`,background:accent,color:"#FFFFFF",fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}>OK</button>
          </div>
        ) : (
          <>
            <div style={{fontSize:11,color:"#8E8E8E",fontVariantNumeric:"tabular-nums"}}>{checkedCount}/{items.length}</div>
            <button data-edit-btn type="button" onClick={enterEdit} title="Modifier"
              style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,border:"none",background:"transparent",cursor:"pointer",color:"#8E8E8E",borderRadius:6,opacity:0,transition:"opacity .15s ease"}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0";e.currentTarget.style.color="#0D0D0D"}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#8E8E8E"}}>
              <Pencil size={13} strokeWidth={1.75}/>
            </button>
          </>
        )}
      </div>

      {editing ? (
        <div style={{padding:"8px 10px 12px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {draft.map((it,i)=>(
              <div key={i}
                draggable
                onDragStart={()=>setDragIdx(i)}
                onDragOver={(e)=>{e.preventDefault();setOverIdx(i)}}
                onDragLeave={()=>setOverIdx(null)}
                onDrop={()=>{ if (dragIdx!==null && dragIdx!==i) move(dragIdx,i); setDragIdx(null); setOverIdx(null); }}
                onDragEnd={()=>{setDragIdx(null);setOverIdx(null)}}
                style={{display:"flex",alignItems:"center",gap:4,padding:"2px 4px",borderRadius:6,
                  background: overIdx===i && dragIdx!==i ? "#F5F5F5" : "transparent",
                  opacity: dragIdx===i ? 0.4 : 1,
                  transition:"background .12s ease",
                }}>
                <span style={{cursor:"grab",color:"#C8C8C8",display:"inline-flex",padding:4,flexShrink:0}}><GripVertical size={12} strokeWidth={1.75}/></span>
                <input
                  type="text" value={it.label} placeholder={`Règle ${i+1}`}
                  onChange={(e)=>update(i, e.target.value)}
                  onKeyDown={(e)=>{ if (e.key==="Enter"){ e.preventDefault(); addRow(); } }}
                  style={{flex:1,fontSize:12,padding:"6px 8px",border:"1px solid transparent",borderRadius:6,outline:"none",fontFamily:"inherit",color:"#0D0D0D",background:"#FAFAFA"}}
                  onFocus={(e)=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.background="#FFFFFF"}}
                  onBlur={(e)=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.background="#FAFAFA"}}
                />
                <button type="button" onClick={()=>removeRow(i)} title="Supprimer"
                  style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",cursor:"pointer",color:"#B4B4B4",borderRadius:4,flexShrink:0}}
                  onMouseEnter={(e)=>{e.currentTarget.style.color="#EF4444"}} onMouseLeave={(e)=>{e.currentTarget.style.color="#B4B4B4"}}>
                  <LucideTrash2 size={12} strokeWidth={1.75}/>
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow}
            style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6,padding:"6px 8px",fontSize:12,color:"#5C5C5C",background:"transparent",border:"none",cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5";e.currentTarget.style.color="#0D0D0D"}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#5C5C5C"}}>
            <Plus size={12} strokeWidth={2}/> Ajouter
          </button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",padding:"8px 6px"}}>
          {items.length === 0 && (
            <div style={{padding:"12px",fontSize:12,color:"#8E8E8E",textAlign:"center"}}>Aucune règle. Survolez et cliquez ✎ pour en ajouter.</div>
          )}
          {items.map(r => {
            const checked = !!checkedRuleIds[r.id];
            return (
              <label key={r.id}
                style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:6,cursor:"pointer",background:"transparent",transition:"background .12s ease"}}
                onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5"}}
                onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
                <input type="checkbox" checked={checked} onChange={()=>onToggleCheck(r.id)}
                  style={{width:14,height:14,accentColor:"#10A37F",cursor:"pointer",margin:0,flexShrink:0}}/>
                <span style={{fontSize:12, color: checked ? "#8E8E8E" : "#0D0D0D", fontWeight:400, lineHeight:1.5, textDecoration: checked ? "line-through" : "none"}}>
                  {r.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DisciplinePage({ trades = [] }) {
  // ✅ Utiliser les hooks Supabase
  const { user } = useAuth();
  const { getDayDiscipline, setRuleCompleted, getDayScore, baseRules, disciplineData } = useDisciplineTracking();
  const { customRules, loading: rulesLoading, addRule, deleteRule } = useCustomDisciplineRules();
  
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [heatmapVersion, setHeatmapVersion] = useState(0);
  const [checkedRuleIds, setCheckedRuleIds] = useState(() => {
    try {
      const todayKey = getLocalDateString();
      return JSON.parse(localStorage.getItem(`tr4de_checked_rules_${todayKey}`) || "{}");
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

  // Listes éditables pour Bias / Règles à suivre / Erreurs à éviter
  const DEFAULT_BIAS = [
    "Identifier le balayage de liquidité (HTF Liquidity Sweep)",
    "Définir l'objectif de prix (Draw on Liquidity)",
    "Vérifier les respects/discrédits (FVG/OB)",
    "Comparer les divergences SMT (Corrélation d'actifs)",
    "Appliquer les profils de session (Asie/Londres/New York)",
  ];
  const DEFAULT_PERSONAL = [
    { id: "personal_sl_be",       label: "Ne pas bouger son SL en BE" },
    { id: "personal_ifvg",        label: "Bien attendre le iFVG" },
    { id: "personal_focus",       label: "Être attentif sur le marché" },
    { id: "personal_no_hesitate", label: "Ne pas hésiter" },
  ];
  const DEFAULT_ERRORS = [
    "FVG au-dessus du SL (sauf si trend forte)",
    "Zone de liquidité juste au-dessus du SL (range, plus hauts, etc.)",
    "Si la majeure sellside a été prise, ne pas prendre le premier setup, attendre un meilleur retracement",
    "Rentrer sans confirmation",
  ];
  const [biasItems, setBiasItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tr4de_bias_items") || "null");
      return Array.isArray(saved) ? saved : DEFAULT_BIAS;
    } catch { return DEFAULT_BIAS; }
  });
  const [personalRules, setPersonalRules] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tr4de_personal_rules") || "null");
      return Array.isArray(saved) ? saved : DEFAULT_PERSONAL;
    } catch { return DEFAULT_PERSONAL; }
  });
  const [errorItems, setErrorItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tr4de_error_items") || "null");
      return Array.isArray(saved) ? saved : DEFAULT_ERRORS;
    } catch { return DEFAULT_ERRORS; }
  });
  React.useEffect(() => { try { localStorage.setItem("tr4de_bias_items", JSON.stringify(biasItems)); } catch {} }, [biasItems]);
  React.useEffect(() => { try { localStorage.setItem("tr4de_personal_rules", JSON.stringify(personalRules)); } catch {} }, [personalRules]);
  React.useEffect(() => { try { localStorage.setItem("tr4de_error_items", JSON.stringify(errorItems)); } catch {} }, [errorItems]);

  // === Sync online (Supabase user_preferences) des 3 listes Discipline ===
  const [listsLoadedFromCloud, setListsLoadedFromCloud] = useState(false);
  React.useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = createClient();
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("bias_items, error_items, personal_rules")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) {
          console.warn("⚠️ load discipline lists:", error.code, error.message);
        } else if (!cancelled && data) {
          if (Array.isArray(data.bias_items))     setBiasItems(data.bias_items);
          if (Array.isArray(data.error_items))    setErrorItems(data.error_items);
          if (Array.isArray(data.personal_rules)) setPersonalRules(data.personal_rules);
        }
      } catch (e) { console.error("⚠️ load discipline lists failed:", e?.message || e); }
      finally { if (!cancelled) setListsLoadedFromCloud(true); }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user?.id]);

  // Auto-save (debounced) à chaque modification d'une des 3 listes
  React.useEffect(() => {
    if (!user?.id || !listsLoadedFromCloud) return;
    const supabase = createClient();
    const handle = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("user_preferences")
          .upsert([{
            user_id: user.id,
            bias_items: biasItems,
            error_items: errorItems,
            personal_rules: personalRules,
            updated_at: new Date().toISOString(),
          }], { onConflict: "user_id" });
        if (error) console.error("⚠️ save discipline lists failed:", error.message);
      } catch (e) { console.error("⚠️ save discipline lists error:", e); }
    }, 600);
    return () => clearTimeout(handle);
  }, [biasItems, errorItems, personalRules, user?.id, listsLoadedFromCloud]);

  const heatmapScrollRef = useRef(null);
  const today = getLocalDateString();
  const todayDate = new Date();
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentMonth = monthNames[todayDate.getMonth()];
  const currentDay = todayDate.getDate();
  const dayLabelsShort = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // ✅ Récupérer les règles d'aujourd'hui depuis Supabase via le hook
  const todayRules = getDayDiscipline(today);
  const todayScore = getDayScore(today);
  
  // ✅ disciplineData (depuis Supabase) est la source de vérité.
  //    setRuleCompleted fait un optimistic update synchrone, donc cet effet
  //    reflète toujours soit Supabase, soit la dernière action utilisateur.
  React.useEffect(() => {
    const fromSupabase = (disciplineData && disciplineData[today]) || {};
    setCheckedRuleIds(fromSupabase);
  }, [today, disciplineData]);

  // Auto-update journal rule when daily notes change
  React.useEffect(() => {
    const handleStorageChange = () => {
      const currentDate = getLocalDateString();
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
    setHeatmapVersion(v => v + 1);
  }, [disciplineData]);

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

  // Liste quotidienne uniquement (base + custom Supabase). Affichée dans la
  // section "Liste quotidienne".
  const dailyRules = [
    { id: "premarket", label: "Routine pré-marché", uuid: null },
    { id: "biais", label: "Biais journalier", uuid: null },
    { id: "news", label: "News et niveaux clés", uuid: null },
    { id: "followall", label: "Toutes les règles respectées", uuid: null },
    { id: "journal", label: "Journal d'après-session", uuid: null },
    ...customRules.map(r => ({ id: r.rule_id, label: r.text, uuid: r.id })),
  ].map(r => ({ ...r, status: checkedRuleIds[r.id] || false }));

  // Le progress tracker / la heatmap ne comptent QUE la liste quotidienne.
  // Les règles perso "Règles à suivre" sont indépendantes.
  const allRules = dailyRules;

  const completedCount = allRules.filter(r => r.status).length;
  const completeProgress = (completedCount / Math.max(allRules.length, 1)) * 100;
  const currentDate = new Date();

  // Auto-toggle "Followed All Rules" quand toutes les règles perso sont cochées.
  // (Les règles perso ne comptent toujours PAS dans le progress tracker, mais elles
  // pilotent cette case-là, qui elle est dans la liste quotidienne.)
  React.useEffect(() => {
    if (!personalRules.length) return;
    const allChecked = personalRules.every(r => !!checkedRuleIds[r.id]);
    const followAllCurrent = !!checkedRuleIds["followall"];
    if (allChecked && !followAllCurrent) {
      toggleRule("followall", allRules);
    } else if (!allChecked && followAllCurrent) {
      toggleRule("followall", allRules);
    }
  }, [checkedRuleIds, personalRules]);

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
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("disc.title")}</h1>
          <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
        </div>
        {/* TOP SECTION - 4 COLUMNS */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:12}}>
          {/* DATE */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between",height:"100%"}}>
            <div style={{fontSize:12,color:T.textMut,fontWeight:600}}>{t("disc.todayProgress")}</div>
            <div style={{display:"flex",justifyContent:"flex-start",alignItems:"flex-end",gap:12}}>
              <div style={{display:"flex",gap:4,flex:1}}>
                <div style={{fontSize:32,fontWeight:700,color:T.text}}>{currentMonth}</div>
                <div style={{fontSize:28,fontWeight:700,color:T.text}}>{currentDay}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,flex:1,justifyContent:"flex-end"}}>
                <svg width="70" height="70" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="35" cy="35" r="30" fill="none" stroke={T.bg} strokeWidth="4"/>
                  <circle
                    cx="35" cy="35" r="30"
                    fill="none"
                    stroke={T.green}
                    strokeWidth="4"
                    strokeDasharray={`${30 * 2 * Math.PI}`}
                    strokeDashoffset={`${30 * 2 * Math.PI * (1 - completeProgress / 100)}`}
                    strokeLinecap="round"
                    style={{transition:"stroke-dashoffset 0.3s"}}
                  />
                  <text
                    x="35" y="40"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="700"
                    fill={T.text}
                    style={{transform:"rotate(90deg)",transformOrigin:"35px 35px"}}
                  >
                    {Math.round(completeProgress)}%
                  </text>
                </svg>
                <div style={{fontSize:10,fontWeight:500,color:T.textMut}}>{completedCount} sur {allRules.length} règles</div>
              </div>
            </div>
          </div>

          {/* BIAS JOURNALIER */}
          <EditableTextList
            title={t("disc.biasDaily")}
            iconBg="#EFF6FF"
            accent="#3B82F6"
            icon={<LucideTrendingUp size={13} strokeWidth={1.75} color="#3B82F6"/>}
            items={biasItems}
            onSave={setBiasItems}
            renderPrefix={(i)=>(
              <div style={{minWidth:18,fontSize:11,color:T.textMut,fontVariantNumeric:"tabular-nums",marginTop:1}}>{i+1}.</div>
            )}
          />

          {/* REGLES A SUIVRE */}
          <EditableCheckList
            title={t("disc.rulesToFollow")}
            iconBg="#E6F7F1"
            accent={T.green}
            icon={<LucideCheck size={13} strokeWidth={2} color={T.green}/>}
            items={personalRules}
            checkedRuleIds={checkedRuleIds}
            onToggleCheck={(id)=>toggleRule(id, allRules)}
            onSave={setPersonalRules}
          />

          {/* ERREURS A EVITER */}
          <EditableTextList
            title={t("disc.errorsToAvoid")}
            iconBg="#FEF2F2"
            accent={T.red}
            icon={<LucideX size={13} strokeWidth={2} color={T.red}/>}
            items={errorItems}
            onSave={setErrorItems}
            renderPrefix={()=>(
              <div style={{minWidth:18,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <LucideX size={11} strokeWidth={2.25} color={T.red}/>
              </div>
            )}
          />
        </div>

        {/* MIDDLE SECTION - 2 COLUMNS */}
        <div style={{display:"grid",gridTemplateColumns:"0.8fr 2.2fr",gap:12}}>
          {/* DAILY CHECKLIST */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12}}>
            <div style={{padding:16,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.text}}>{t("disc.checklist")}</div>
                <div style={{fontSize:11,color:T.textMut}}>{currentDay} {currentMonth.toLowerCase()}.</div>
              </div>
              <div style={{fontSize:11,color:T.textMut,background:T.bg,padding:"4px 8px",borderRadius:4}}>{dailyRules.filter(r=>r.status).length}/{dailyRules.length}</div>
            </div>
            <div style={{maxHeight:"none",overflowY:"visible",paddingTop:8}}>
              {dailyRules.map(rule => (
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
              <div style={{fontSize:13,fontWeight:600,color:T.text}}>{t("disc.progressTracker")}</div>
              <div style={{fontSize:12,fontWeight:600,color:T.accent,marginTop:4}}>{dailyRules.filter(r => r.status).length}/{dailyRules.length}</div>
              
              {(() => {
                // Calculer la streak de jours consécutifs (Supabase d'abord, localStorage en fallback)
                let streak = 0;
                const cursor = new Date();
                while (true) {
                  const dateStr = getLocalDateString(cursor);
                  let checked = null;
                  if (disciplineData && disciplineData[dateStr]) {
                    checked = disciplineData[dateStr];
                  } else {
                    const stored = localStorage.getItem(`tr4de_checked_rules_${dateStr}`);
                    if (stored) {
                      try { checked = JSON.parse(stored); } catch {}
                    }
                  }
                  if (checked) {
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
                  if (percentage <= 20) return '#DCFCE7'; // Vert très pâle (1-20%)
                  if (percentage <= 40) return '#86EFAC'; // Vert pâle (21-40%)
                  if (percentage <= 60) return '#4ADE80'; // Vert moyen (41-60%)
                  if (percentage <= 80) return '#22C55E'; // Vert clair (61-80%)
                  return '#10A37F';                       // Vert vif (81-100%)
                };
                
                // Function to get daily completion data: prioritize Supabase (disciplineData), fallback to localStorage
                const getDailyData = (dateStr) => {
                  try {
                    let checked = null;
                    if (disciplineData && disciplineData[dateStr]) {
                      checked = disciplineData[dateStr];
                    } else {
                      const stored = localStorage.getItem(`tr4de_checked_rules_${dateStr}`);
                      if (stored) checked = JSON.parse(stored);
                    }
                    if (checked) {
                      // On ne compte QUE les règles de la liste quotidienne
                      // (les règles perso "Règles à suivre" sont exclues).
                      const dailyIds = new Set([
                        "premarket","biais","news","followall","journal",
                        ...customRules.map(r => r.rule_id),
                      ]);
                      const checkedCount = Object.entries(checked)
                        .filter(([id, v]) => v === true && dailyIds.has(id))
                        .length;
                      const totalRules = 5 + customRules.length;
                      const percentage = Math.round((checkedCount / Math.max(totalRules, 1)) * 100);
                      return { percentage, hadTrading: true, rulesRespected: checkedCount, totalRules };
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
                    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
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
                '#DCFCE7',
                '#86EFAC',
                '#4ADE80',
                '#22C55E',
                '#10A37F'
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
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colRule")}</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colType")}</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colCondition")}</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colStreak")}</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colAvgPerf")}</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colFollowRate")}</th>
                </tr>
              </thead>
              <tbody>
                {allRules.map((rule, i) => {
                  const ruleData = {
                    "journal": { type: "Auto", condition: disciplineRules.journalTime, ruleKey: "journal" },
                    "strategy": { type: "Auto", condition: "—", ruleKey: "strategy" },
                    "stoploss": { type: "Auto", condition: "—", ruleKey: "stoploss" },
                    "maxLossPerTrade": { type: "Auto", condition: `${getCurrencySymbol()}${disciplineRules.maxLossPerTrade}`, ruleKey: "maxLossPerTrade" },
                    "maxLossPerDay": { type: "Auto", condition: `${getCurrencySymbol()}${disciplineRules.maxLossPerDay}`, ruleKey: "maxLossPerDay" },
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
                          {data?.type||"Manuel"}
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
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>{t("disc.personalRules")}</div>
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
                  style={{padding:"8px 16px",background:"#0D0D0D",color:"white",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}
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
                  background:"#0D0D0D",
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
  useLang(); // re-render app on language change

  // Re-render quand l'utilisateur change la devise / le fuseau horaire dans Settings.
  const [, forcePrefRefresh] = useState(0);
  useEffect(() => {
    const onPrefs = () => forcePrefRefresh(v => v + 1);
    window.addEventListener("tr4de:prefs-changed", onPrefs);
    return () => window.removeEventListener("tr4de:prefs-changed", onPrefs);
  }, []);
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
  const [aiReportsUnread, setAiReportsUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/ai/reports?limit=30", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const unread = (data.reports || []).filter((r) => !r.is_read).length;
        setAiReportsUnread(unread);
      } catch (e) {
        // silent
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [page]);
  // ✅ Utiliser les hooks pour Trades et Stratégies (auto-stockés dans Supabase)
  const { trades, addTrade, updateTrade, deleteTrade } = useTrades();
  const { strategies, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const { notes: agentTradeNotes } = useTradeNotes();
  const { notes: agentDailyNotes } = useDailySessionNotes();
  const { emotionTags: agentEmotionTags } = useTradeEmotionTags();
  const { errorTags: agentErrorTags } = useTradeErrorTags();
  const { disciplineData: agentDisciplineData, baseRules: agentBaseRules } = useDisciplineTracking();
  const { customRules: agentCustomRules } = useCustomDisciplineRules();
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

  // (On ne ré-injecte plus le placeholder : aucune sélection = 0 trades)

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

        // À chaque chargement de la page : si rien n'est sélectionné (premier visit
        // OU sélection vide sauvegardée), on coche tous les comptes par défaut.
        try {
          const saved = localStorage.getItem("selectedAccountIds");
          let current = [];
          try { current = saved ? JSON.parse(saved) : []; } catch {}
          if ((!Array.isArray(current) || current.length === 0) && loadedAccounts.length > 0) {
            const allIds = loadedAccounts.map(a => a.id);
            setSelectedAccountIds(allIds);
            localStorage.setItem("selectedAccountIds", JSON.stringify(allIds));
          }
        } catch {}
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

  // Plage de dates par page (chaque page garde sa propre sélection).
  const iso = (d) => d.toISOString().split("T")[0];
  const defaultDateRange = (pageId) => {
    const today = new Date();
    // Dashboard / Stratégies : tout depuis le premier trade
    if (pageId === "dashboard" || pageId === "strategies" || pageId === "calendar" || pageId === "discipline") {
      const earliest = (trades || []).reduce((min, t) => {
        try {
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return min;
          return !min || d < min ? d : min;
        } catch { return min; }
      }, null);
      const start = earliest || new Date(today.getFullYear(), 0, 1);
      return { start: iso(start), end: iso(today) };
    }
    // Trades / Journal : semaine en cours
    const dow = today.getDay();
    const monday = new Date(today); monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { start: iso(monday), end: iso(sunday) };
  };
  const [dateRangesByPage, setDateRangesByPage] = useState(() => {
    try {
      const saved = localStorage.getItem("tr4de_date_ranges_by_page");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  React.useEffect(() => {
    try { localStorage.setItem("tr4de_date_ranges_by_page", JSON.stringify(dateRangesByPage)); } catch {}
  }, [dateRangesByPage]);
  const globalDateRange = dateRangesByPage[page] || defaultDateRange(page);
  const setGlobalDateRange = (r) => setDateRangesByPage(prev => ({ ...prev, [page]: r }));

  const filteredTrades = (() => {
    const realSelected = selectedAccountIds.filter(id => !isPlaceholderAccount(id));
    if (realSelected.length === 0) return [];
    const byAccount = trades.filter(t => realSelected.includes(t.account_id));
    const { start, end } = globalDateRange || {};
    if (!start || !end) return byAccount;
    return byAccount.filter(t => {
      try {
        const d = (t.date || "").split("T")[0];
        return d >= start && d <= end;
      } catch { return true; }
    });
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
    for (const newTrade of newTrades) {
      const existing = trades.find(t => t.date === newTrade.date && t.symbol === newTrade.symbol && t.entry === newTrade.entry);
      if (!existing) {
        await addTrade(newTrade);
      } else {
        // Backfill des champs manquants (ex: entry_time / exit_time après ajout du parser)
        const patch = {};
        if (newTrade.entryTime && !existing.entry_time && !existing.entryTime) patch.entry_time = newTrade.entryTime;
        if (newTrade.exitTime && !existing.exit_time && !existing.exitTime) patch.exit_time = newTrade.exitTime;
        if (Object.keys(patch).length > 0) {
          try { await updateTrade(existing.id, patch); } catch (err) { console.error("⚠️ updateTrade failed:", err); }
        }
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

  const SIDEBAR_SECTIONS = [
    {
      label: t("nav.trading"),
      items: [
        { id: "add-trade",  icon: LucideUpload,       label: t("nav.addTrade") },
        { id: "dashboard",  icon: LayoutDashboard,    label: t("nav.dashboard") },
        { id: "calendar",   icon: LucideCalendar,     label: t("nav.calendar") },
        { id: "trades",     icon: ListChecks,         label: t("nav.trades"), badge: filteredTrades.length > 0 ? filteredTrades.length : 0 },
        { id: "strategies", icon: LucideTarget,       label: t("nav.strategies") },
      ],
    },
    {
      label: t("nav.analyse"),
      items: [
        { id: "journal",    icon: NotebookPen,        label: t("nav.journal"), badge: filteredTrades.filter(tr => {try { const d = new Date(tr.date); return getLocalDateString(d) === getLocalDateString(); } catch (e) { return false; }}).length },
        { id: "discipline", icon: ShieldCheck,        label: t("nav.discipline") },
        { id: "agent",      icon: Bot,                label: t("nav.agent"), badge: aiReportsUnread > 0 ? aiReportsUnread : 0 },
      ],
    },
    {
      label: t("nav.productivity"),
      items: [
        { id: "daily-planner", icon: LucideCalendarDays, label: t("nav.dailyPlanner") },
        { id: "goals",         icon: LucideZap,          label: t("nav.goals") },
        { id: "focus",         icon: LucideTimer,        label: t("nav.focus") },
        { id: "notes",         icon: LucideStickyNote,   label: t("nav.notes") },
        { id: "reading",       icon: LucideBookOpen,     label: t("nav.reading") },
      ],
    },
  ];

  const pages = {
    dashboard:  <Dashboard trades={filteredTrades} setPage={setPage} />,
    "add-trade": <AddTradePage trades={filteredTrades} setPage={setPage} setAccounts={setAccounts} setSelectedAccountIds={setSelectedAccountIds} accountType={accountType} setAccountType={setAccountType} selectedEvalAccount={selectedEvalAccount} setSelectedEvalAccount={setSelectedEvalAccount} accounts={accounts} selectedAccountIds={selectedAccountIds} addTrade={addTrade} addStrategy={addStrategy} strategies={strategies} user={user} />,
    trades:     <TradesPage trades={filteredTrades} strategies={strategies} onImportClick={() => setPage("add-trade")} onDeleteTrade={handleDeleteTrade} onClearTrades={handleClearTrades} />,
    calendar:   <CalendarPage trades={filteredTrades} accountType={accountType} evalAccountSize={selectedEvalAccount} />,
    journal: <JournalPage trades={filteredTrades} />,
    discipline: <DisciplinePage trades={filteredTrades} />,
    strategies: <StrategyPage setPage={setPage} setSelectedStrategyId={setSelectedStrategyId} />,
    "strategy-detail": <StrategyDetailPage setPage={setPage} />,
    goals: <GoalsPage />,
    "daily-planner": <DailyPlannerPage />,
    focus: <FocusTimerPage />,
    notes: <NotesPage />,
    reading: <ReadingListPage />,
    agent: (() => {
      // Convertir la map { [tradeId]: "note" } en tableau pour l'API
      const journalNotesArr = Object.entries(agentTradeNotes || {})
        .filter(([, n]) => n && String(n).trim())
        .map(([trade_id, notes]) => {
          const emotions = (agentEmotionTags || {})[trade_id] || [];
          const errors = (agentErrorTags || {})[trade_id] || [];
          return { trade_id, notes: String(notes), emotion_tags: emotions, error_tags: errors };
        });

      // Calculer les stats par stratégie en utilisant le mapping localStorage
      let assignments = {};
      try {
        const raw = localStorage.getItem("tr4de_trade_strategies");
        assignments = raw ? JSON.parse(raw) : {};
      } catch {}

      const strategyStats = (strategies || []).map((strategy) => {
        const stratTrades = filteredTrades.filter((t) => {
          const byId = assignments[t.id] || [];
          const byComposite = assignments[`${t.date}${t.symbol}${t.entry}`] || [];
          return byId.includes(strategy.id) || byComposite.includes(strategy.id);
        });
        if (!stratTrades.length) return null;
        const wins = stratTrades.filter((t) => (t.pnl || 0) > 0).length;
        const losses = stratTrades.filter((t) => (t.pnl || 0) < 0).length;
        const totalPnL = stratTrades.reduce((s, t) => s + (t.pnl || 0), 0);
        return {
          id: strategy.id,
          name: strategy.name,
          tradeCount: stratTrades.length,
          wins,
          losses,
          winRate: stratTrades.length ? ((wins / stratTrades.length) * 100).toFixed(1) : "0",
          totalPnL: totalPnL.toFixed(2),
          avgPnL: (totalPnL / stratTrades.length).toFixed(2),
        };
      }).filter(Boolean);

      // Infos compte
      const accountInfo = {
        type: accountType,
        evalSize: accountType === "eval" ? selectedEvalAccount : null,
        selectedAccountsCount: (selectedAccountIds || []).length,
        totalAccountsCount: (accounts || []).length,
      };

      // Helpers dates
      const dayKey = (d) => {
        try { return getLocalDateString(new Date(d)); } catch { return null; }
      };
      const weekKey = (d) => {
        try {
          const dt = new Date(d);
          const day = (dt.getDay() + 6) % 7; // Monday = 0
          const monday = new Date(dt);
          monday.setDate(dt.getDate() - day);
          return getLocalDateString(monday);
        } catch { return null; }
      };
      const monthKey = (d) => {
        try { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; } catch { return null; }
      };

      const aggregate = (list, keyFn) => {
        const map = {};
        (list || []).forEach((t) => {
          const k = keyFn(t.entry_time || t.date);
          if (!k) return;
          if (!map[k]) map[k] = { key: k, trades: 0, wins: 0, losses: 0, pnl: 0 };
          map[k].trades += 1;
          const p = Number(t.pnl) || 0;
          if (p > 0) map[k].wins += 1;
          else if (p < 0) map[k].losses += 1;
          map[k].pnl += p;
        });
        return Object.values(map)
          .sort((a, b) => (a.key < b.key ? 1 : -1))
          .slice(0, 12)
          .map((r) => ({
            period: r.key,
            trades: r.trades,
            wins: r.wins,
            losses: r.losses,
            winRate: r.trades ? ((r.wins / r.trades) * 100).toFixed(1) : "0",
            pnl: r.pnl.toFixed(2),
          }));
      };

      const weeklyStats = aggregate(filteredTrades, weekKey);
      const monthlyStats = aggregate(filteredTrades, monthKey);

      // Discipline: synthèse par jour (% de règles respectées)
      const allRuleIds = [
        ...(agentBaseRules || []).map((r) => ({ id: r.id, label: r.label })),
        ...(agentCustomRules || []).map((r) => ({ id: r.rule_id || r.id, label: r.text })),
      ];
      const disciplineSummary = Object.entries(agentDisciplineData || {})
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, 14)
        .map(([date, rules]) => {
          const total = allRuleIds.length || Object.keys(rules || {}).length;
          const respected = Object.values(rules || {}).filter(Boolean).length;
          const violated = allRuleIds
            .filter((r) => rules && rules[r.id] === false)
            .map((r) => r.label);
          return {
            date,
            respected,
            total,
            score: total ? Math.round((respected / total) * 100) : 0,
            violated,
          };
        });

      // Événements psychologiques (heuristiques simples)
      const psychEvents = [];
      const tradesByDay = {};
      (filteredTrades || []).forEach((t) => {
        const k = dayKey(t.entry_time || t.date);
        if (!k) return;
        (tradesByDay[k] = tradesByDay[k] || []).push(t);
      });
      Object.entries(tradesByDay).forEach(([date, dayTrades]) => {
        dayTrades.sort((a, b) => new Date(a.entry_time || a.date) - new Date(b.entry_time || b.date));
        // Overtrading
        if (dayTrades.length >= 6) {
          psychEvents.push({ date, type: "overtrading", detail: `${dayTrades.length} trades dans la journée` });
        }
        // Revenge trading: trade <15min après une perte
        for (let i = 1; i < dayTrades.length; i++) {
          const prev = dayTrades[i - 1];
          const cur = dayTrades[i];
          if ((Number(prev.pnl) || 0) < 0) {
            const dt = (new Date(cur.entry_time || cur.date) - new Date(prev.entry_time || prev.date)) / 60000;
            if (dt > 0 && dt < 15) {
              psychEvents.push({ date, type: "revenge_trading", detail: `Trade ${dt.toFixed(0)}min après une perte de ${prev.pnl}$` });
              break;
            }
          }
        }
        // Tilted: 3 pertes consécutives
        let streak = 0, maxStreak = 0;
        dayTrades.forEach((t) => {
          if ((Number(t.pnl) || 0) < 0) { streak += 1; maxStreak = Math.max(maxStreak, streak); }
          else streak = 0;
        });
        if (maxStreak >= 3) {
          psychEvents.push({ date, type: "losing_streak", detail: `${maxStreak} pertes consécutives` });
        }
      });
      // Émotions négatives répétées
      const negativeEmotions = ["angry", "colère", "fear", "peur", "fomo", "frustré", "revenge", "tilt"];
      const emotionCount = {};
      Object.values(agentEmotionTags || {}).forEach((tags) => {
        (tags || []).forEach((tag) => {
          const low = String(tag).toLowerCase();
          if (negativeEmotions.some((n) => low.includes(n))) {
            emotionCount[tag] = (emotionCount[tag] || 0) + 1;
          }
        });
      });
      Object.entries(emotionCount).forEach(([tag, count]) => {
        if (count >= 2) psychEvents.push({ date: "", type: "emotional_pattern", detail: `"${tag}" signalé sur ${count} trades` });
      });

      return (
        <AgentPanel
          userId={user?.id}
          trades={filteredTrades}
          strategies={strategies || []}
          strategyStats={strategyStats}
          journalNotes={journalNotesArr}
          dailyNotes={agentDailyNotes || {}}
          accountInfo={accountInfo}
          weeklyStats={weeklyStats}
          monthlyStats={monthlyStats}
          disciplineSummary={disciplineSummary}
          psychEvents={psychEvents.slice(0, 20)}
        />
      );
    })(),
    settings: <SettingsPage user={user} onBack={() => setPage("dashboard")} />,
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
      <div style={{display:"flex",minHeight:"100vh",background:"#F5F5F5"}}>
        {/* SIDEBAR (OpenAI-style) */}
        <Sidebar
          brand="tr4de"
          workspace={(() => {
            if (selectedAccountIds.length === 1) {
              const acc = accounts.find(a => a.id === selectedAccountIds[0]);
              if (acc) return { id: acc.id, name: acc.name || "Compte" };
            }
            if (selectedAccountIds.length > 1) return { id: "multi", name: `${selectedAccountIds.length} comptes` };
            return null;
          })()}
          workspaces={visibleAccounts.map(a => ({ id: a.id, name: a.name || "Compte" }))}
          onSelectWorkspace={(id) => setSelectedAccountIds([id])}
          onCreateWorkspace={() => setPage("add-trade")}
          sections={SIDEBAR_SECTIONS}
          activeId={page}
          onSelect={(id) => {
            if (page === "add-trade" && id !== "add-trade") {
              setSelectedAccountIds(previousSelectedAccountIds);
              localStorage.setItem('selectedAccountIds', JSON.stringify(previousSelectedAccountIds));
            }
            if (id === "add-trade") {
              setPreviousSelectedAccountIds(selectedAccountIds);
              setSelectedAccountIdHeader("");
              setSelectedAccountIds([]);
            }
            setPage(id);
          }}
        />


        {/* MAIN */}
        <div style={{flex:1,minWidth:0,height:"100vh",display:"flex",flexDirection:"column",background:"transparent"}}>
          <div style={{flexShrink:0,zIndex:10,background:"#F5F5F5",padding:"10px 28px",display:"flex",alignItems:"center",gap:12,fontFamily:"var(--font-sans)"}}>
            <div style={{marginLeft:"auto"}}>
              <TopBarUserMenu
                user={{ name: displayUser.name, initials: displayUser.initials }}
                onLogout={handleLogout}
                onSettings={() => setPage("settings")}
                onProfile={() => setPage("settings")}
                onDarkMode={() => {
                  const cur = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
                  const next = cur === "dark" ? "light" : "dark";
                  document.documentElement.dataset.theme = next;
                  try { localStorage.setItem("tr4de_theme", next); } catch {}
                }}
              />
            </div>
          </div>
          <div style={{flex:1,minHeight:0,padding: "0 8px 8px 0",display:"flex"}}>
            <div className="scroll-thin" style={{
              background: "#FFFFFF",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: 10,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
              padding: page === "add-trade" ? "0" : "20px 24px",
              display: page === "add-trade" ? "flex" : "block",
              width: "100%",
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              position: "relative",
            }}>
              {page !== "add-trade" && (
                <HeaderSlotPortal>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {["dashboard","strategies","journal","trades","discipline","goals"].includes(page) && (
                      <DateRangePicker
                        value={globalDateRange}
                        onChange={(r) => setGlobalDateRange(r)}
                      />
                    )}
                    <MultiAccountSelector
                      accounts={visibleAccounts}
                      selectedAccountIds={selectedAccountIds}
                      onSelectionChange={setSelectedAccountIds}
                      onDeleteAccount={handleDeleteAccount}
                      onCreateAccount={() => setPage("add-trade")}
                      T={T}
                    />
                  </div>
                </HeaderSlotPortal>
              )}
              {pages[page] || pages.dashboard}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
