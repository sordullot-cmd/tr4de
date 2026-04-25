"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X as LucideX,
  ChevronDown as LucideChevronDown,
  MoreHorizontal as LucideMoreHorizontal,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  ArrowDown as LucideArrowDown,
  SlidersHorizontal as LucideSlidersHorizontal,
  Target as LucideTarget,
} from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n";
import { fmt } from "@/lib/ui/format";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useTradeNotes } from "@/lib/hooks/useTradeNotes";
import { useTradeEmotionTags, useTradeErrorTags } from "@/lib/hooks/useTradeEmotionTags";

export default function TradesPage({ trades = [], strategies = [], onImportClick, onDeleteTrade, onClearTrades }) {
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
      <div className="tr4de-trades-layout" style={{display:"flex",gap:16,alignItems:"flex-start"}}>

        {/* LEFT - TRADES TABLE */}
        <div className="tr4de-trades-main" style={{flex:selectedTrade?"0 0 calc(100% - 376px)":"1",minWidth:0,background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 200px)"}}>
          

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

