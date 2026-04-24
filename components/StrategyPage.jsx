"use client";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Pencil, Trash2, Plus, X, Target, TrendingUp, TrendingDown, Percent, Activity } from "lucide-react";
import { getCurrencySymbol } from "@/lib/userPrefs";
import { parseCSV, calculateStats } from "@/lib/csvParsers";
import { t, useLang } from "@/lib/i18n";
import { useStrategies } from "@/lib/hooks/useUserData";
import { useTrades } from "@/lib/hooks/useTradeData";

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

const css = `
  body { background: ${T.bg}; color: ${T.text}; font-family: var(--font-sans); min-height: 100vh; font-size: 14px; }
  button { font-family: inherit; cursor: pointer; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .anim-1 { animation: fadeUp .25s ease both; }
`;

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

export default function StrategyPage({ setPage = () => {}, setSelectedStrategyId = () => {} }) {
  useLang();
  // ✅ Utiliser les hooks Supabase au lieu de localStorage
  const strategiesHook = useStrategies();
  const tradesHook = useTrades();
  
  // ✅ Destructure with safe defaults
  const { strategies = [], addStrategy = async () => {}, updateStrategy = async () => {}, deleteStrategy = async () => {} } = strategiesHook || {};
  const { trades = [] } = tradesHook || {};
  
  // ✅ Debug logs
  React.useEffect(() => {
    console.log("🔍 StrategyPage Hook Status:");
    console.log("   strategiesHook:", strategiesHook ? "✅ returned" : "❌ null/undefined");
    console.log("   strategies array:", Array.isArray(strategies) ? `✅ ${strategies.length} items` : "❌ not array");
    console.log("   tradesHook:", tradesHook ? "✅ returned" : "❌ null/undefined");
    console.log("   trades array:", Array.isArray(trades) ? `✅ ${trades.length} items` : "❌ not array");
  }, [strategies, trades]);
  
  const [loading, setLoading] = useState(false);
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState(null);
  const [formData, setFormData] = useState({name:"",description:"",color:"#10A37F",groups:[{id:Date.now(),name:"",rules:[{id:Date.now()+1,text:""}]}]});
  const [editingStrategyId, setEditingStrategyId] = useState(null);
  
  // ✅ Rendre tradeStrategiesData réactif
  const [tradeStrategiesData, setTradeStrategiesData] = useState({});
  const [checkedRules, setCheckedRules] = useState({});

  // 🔍 DEBUG: Monitor trades and strategy assignments
  React.useEffect(() => {
    const stored = localStorage.getItem("tr4de_trades");
    const tradesFromStorage = stored ? JSON.parse(stored) : [];
    
    const stratAssignments = localStorage.getItem('tr4de_trade_strategies');
    const assignments = stratAssignments ? JSON.parse(stratAssignments) : {};
    
    console.log("🔍 DEBUG StrategyPage:");
    console.log("   Trades from hook:", trades?.length || 0, "trades");
    console.log("   Trades from localStorage (tr4de_trades):", tradesFromStorage?.length || 0, "trades");
    console.log("   Strategy assignments keys:", Object.keys(assignments).length, "keys");
    console.log("   First few trades from hook:", trades?.slice(0, 2));
    console.log("   First few assignment keys:", Object.keys(assignments).slice(0, 3));
  }, [trades, strategies]);

  // ✅ Charger et synchroniser les données de localStorage
  React.useEffect(() => {
    const loadTradeStrategiesData = () => {
      try {
        const saved = localStorage.getItem('tr4de_trade_strategies');
        const data = saved ? JSON.parse(saved) : {};
        setTradeStrategiesData(data);
      } catch (err) {
        console.error("❌ Error loading trade strategies:", err);
        setTradeStrategiesData({});
      }
    };
    
    const loadCheckedRules = () => {
      try {
        const saved = localStorage.getItem('tr4de_checked_rules');
        if (!saved) {
          setCheckedRules({});
          return;
        }
        const parsed = JSON.parse(saved);
        const cleaned = {};
        Object.entries(parsed).forEach(([key, value]) => {
          if (typeof value === 'boolean') {
            cleaned[key] = value;
          }
        });
        setCheckedRules(cleaned);
      } catch (err) {
        console.error("❌ Error loading checked rules:", err);
        setCheckedRules({});
      }
    };
    
    // Charger les données
    loadTradeStrategiesData();
    loadCheckedRules();
    
    // Écouter les changements de localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'tr4de_trade_strategies') {
        console.log("📡 Trade strategies updated in localStorage");
        loadTradeStrategiesData();
      }
      if (e.key === 'tr4de_checked_rules') {
        console.log("📡 Checked rules updated in localStorage");
        loadCheckedRules();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const colors = ["#9B7D94","#997B5D","#A5956B","#6B9B6F","#4A9D6F","#6B9D68","#5F8BA0","#5F7FB4","#6B8BB4","#8B7BA4","#A07B94","#7F7F7F"];

  const getDefaultFormData = () => ({name:"",description:"",color:"#10A37F",groups:[{id:Date.now(),name:"",rules:[{id:Date.now()+1,text:""}]}]});

  // ✅ Synchroniser les stratégies avec localStorage pour que DashboardNew les voit
  React.useEffect(() => {
    if (strategies && strategies.length > 0) {
      console.log("💾 Sync strategies to localStorage:", strategies.length);
      localStorage.setItem("apex_strategies", JSON.stringify(strategies));
      localStorage.setItem("tr4de_strategies", JSON.stringify(strategies));
    }
  }, [strategies]);

  const handleCreateStrategy = async () => {
    if(formData.name.trim() && formData.groups.length > 0){
      // Check that all groups have at least one rule
      const validGroups = formData.groups.every(g => g.rules && g.rules.length > 0);
      if(validGroups){
        try {
          setLoading(true);
          if(editingStrategyId){
            // ✅ Mettre à jour via le hook Supabase
            console.log("📝 Mise à jour stratégie Supabase");
            await updateStrategy(editingStrategyId, formData);
          } else {
            // ✅ Créer via le hook Supabase
            console.log("➕ Création stratégie Supabase");
            const newStrat = await addStrategy(formData);
            console.log("✅ Stratégie créée:", newStrat);
          }
          setFormData(getDefaultFormData());
          setShowStrategyForm(false);
          setEditingStrategyId(null);
          console.log("✅ Stratégie sauvegardée");
        } catch (err) {
          const errMsg = err?.message || JSON.stringify(err) || "Unknown error";
          console.error("❌ Erreur sauvegarde stratégie:", errMsg);
          alert(`❌ Erreur lors de la création de la stratégie: ${errMsg}`);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleEditStrategy = (strat) => {
    setFormData(strat);
    setEditingStrategyId(strat.id);
    setShowStrategyForm(true);
  };

  const handleDeleteStrategy = async (strategyId) => {
    // Open confirmation dialog
    setStrategyToDelete(strategyId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!strategyToDelete) return;
    try {
      setLoading(true);
      await deleteStrategy(strategyToDelete);
      console.log('✅ Stratégie supprimée');
      setShowDeleteConfirm(false);
      setStrategyToDelete(null);
    } catch (err) {
      const errMsg = err?.message || JSON.stringify(err) || 'Unknown error';
      console.error('❌ Erreur suppression stratégie:', errMsg);
      alert(`❌ Erreur lors de la suppression: ${errMsg}`);
      setShowDeleteConfirm(false);
      setStrategyToDelete(null);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setStrategyToDelete(null);
  };

  const handleCancelEdit = () => {
    setShowStrategyForm(false);
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
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
        <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("strat.title")}</h1>
        <button onClick={() => setShowStrategyForm(true)} style={{marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",height:34,borderRadius:8,background:T.text,border:`1px solid ${T.text}`,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
          <Plus size={14} strokeWidth={2}/> {t("strat.createBtn")}
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {/* KPI BLOCKS */}
      {strategies && Array.isArray(strategies) && strategies.length > 0 && (() => {
        const getStrategyIdsForTrade = (trade) => {
          let ids = tradeStrategiesData[trade.id] || [];
          if (ids.length === 0 && trade.date && trade.symbol && trade.entry) {
            const composite = `${trade.date}${trade.symbol}${trade.entry}`;
            ids = tradeStrategiesData[composite] || [];
            if (ids.length === 0) {
              const norm = `${trade.date}${trade.symbol}${parseFloat(trade.entry).toFixed(2)}`;
              ids = tradeStrategiesData[norm] || [];
            }
          }
          return ids.map(String);
        };

        const stats = strategies.map(s => {
          const stratTrades = trades.filter(t => getStrategyIdsForTrade(t).includes(String(s.id)));
          const pnl = stratTrades.reduce((acc, t) => acc + (typeof t.pnl === "number" ? t.pnl : 0), 0);
          const wins = stratTrades.filter(t => (t.pnl || 0) > 0).length;
          const losses = stratTrades.filter(t => (t.pnl || 0) < 0).length;
          const wr = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
          return { strategy: s, count: stratTrades.length, pnl, wr };
        }).filter(x => x.count > 0);

        const best = stats.length ? stats.reduce((a, b) => b.pnl > a.pnl ? b : a) : null;
        const worst = stats.length ? stats.reduce((a, b) => b.pnl < a.pnl ? b : a) : null;
        const bestWr = stats.length ? stats.reduce((a, b) => b.wr > a.wr ? b : a) : null;
        const mostActive = stats.length ? stats.reduce((a, b) => b.count > a.count ? b : a) : null;

        const Block = ({ icon: Icon, label, item, valueFn, valueColor }) => {
          return (
            <div
              style={{
                flex: 1, padding: 16, background: T.white, border: `1px solid ${T.border}`,
                borderRadius: 12, display: "flex", flexDirection: "column", gap: 10, minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, background: T.accentBg,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon size={14} strokeWidth={1.75} color={T.text} />
                </div>
                <div style={{ fontSize: 12, color: T.textMut, fontWeight: 500 }}>{label}</div>
              </div>
              {item ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.strategy.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.strategy.name}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: valueColor || T.text, letterSpacing: -0.2 }}>
                      {valueFn(item)}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500 }}>
                      {item.count} trade{item.count > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: T.textMut }}>—</div>
              )}
            </div>
          );
        };

        return (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Block icon={TrendingUp} label={t("strat.bestPerf")} item={best}
              valueFn={(x) => fmt(x.pnl, true)} valueColor={best && best.pnl >= 0 ? T.green : T.red} />
            <Block icon={TrendingDown} label={t("strat.worstPerf")} item={worst}
              valueFn={(x) => fmt(x.pnl, true)} valueColor={worst && worst.pnl >= 0 ? T.green : T.red} />
            <Block icon={Percent} label={t("strat.bestWr")} item={bestWr}
              valueFn={(x) => `${x.wr.toFixed(1)}%`} />
            <Block icon={Activity} label={t("strat.mostActive")} item={mostActive}
              valueFn={(x) => `${x.count} trades`} />
          </div>
        );
      })()}

      {/* STRATEGIES LIST - VERTICAL */}
      {strategies && Array.isArray(strategies) && strategies.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {trades.length === 0 && (
            <div style={{padding:"20px",background:"#fff3cd",borderRadius:8,borderLeft:"4px solid #ffc107"}}>
              <strong>⚠️ Aucun trade chargé</strong><br/>
              Les trades ne sont pas disponibles. Vérifiez que vous avez importé des trades dans l'onglet Dashboard.
            </div>
          )}
          
          {(() => {
            // ✅ Fonction helper pour obtenir les stratégies assignées à un trade
            const getStrategyIdsForTrade = (trade) => {
              // Chercher d'abord par ID du trade Supabase
              let strategyIds = tradeStrategiesData[trade.id] || [];
              
              // Si pas trouvé, essayer l'ancien format (pour compatibilité)
              if (strategyIds.length === 0 && trade.date && trade.symbol && trade.entry) {
                // ✅ IMPORTANT: Pas de tirets bas! Doit correspondre exactement aux clés créées dans DashboardNew.jsx
                const compositeId = `${trade.date}${trade.symbol}${trade.entry}`;
                strategyIds = tradeStrategiesData[compositeId] || [];
                
                // Aussi essayer avec entry normalisée
                if (strategyIds.length === 0) {
                  const normalizedEntry = parseFloat(trade.entry).toFixed(2);
                  const compositeIdNormalized = `${trade.date}${trade.symbol}${normalizedEntry}`;
                  strategyIds = tradeStrategiesData[compositeIdNormalized] || [];
                }
              }
              
              return strategyIds;
            };

            // 📊 Compter les trades pour chaque stratégie
            const strategyTradeCountMap = {};
            strategies.forEach(s => {
              strategyTradeCountMap[s.id] = 0;
            });
            
            trades.forEach(t => {
              const strategyIds = getStrategyIdsForTrade(t);
              strategyIds.forEach(stratId => {
                if (strategyTradeCountMap.hasOwnProperty(stratId)) {
                  strategyTradeCountMap[stratId]++;
                }
              });
            });

            // 🔄 Trier les stratégies par nombre de trades (décroissant)
            const sortedStrategies = [...strategies].sort((a, b) => {
              return (strategyTradeCountMap[b.id] || 0) - (strategyTradeCountMap[a.id] || 0);
            });

            return sortedStrategies.map(strategy => {
              // 🔍 DEBUG LOG
              console.log(`\n📊 Strategy: "${strategy.name}" (ID: ${strategy.id})`);
              console.log(`  Total trades available: ${trades.length}`);
              console.log(`  Strategy assignments data keys: ${Object.keys(tradeStrategiesData).length}`);
              if (Object.keys(tradeStrategiesData).length > 0) {
                console.log(`  First mapping keys:`, Object.keys(tradeStrategiesData).slice(0, 3));
              }

            // Compter les trades assignés à cette stratégie
            const strategyTradeCount = trades.filter(t => {
              const strategyIds = getStrategyIdsForTrade(t);
              // Convertir tous les IDs en string pour comparaison fiable
              return strategyIds.map(id => String(id)).includes(String(strategy.id));
            }).length;
            
            console.log(`  Matching trades found: ${strategyTradeCount}`);

            // Calculer stats rapides (pour l'aperçu)
            const strategyTrades = trades.filter(t => {
              const strategyIds = getStrategyIdsForTrade(t);
              // Convertir tous les IDs en string pour comparaison fiable
              return strategyIds.map(id => String(id)).includes(String(strategy.id));
            });
            
            const totalPnL = strategyTrades.reduce((s, t) => {
              // Assurer que pnl est un nombre valide
              const pnl = typeof t.pnl === 'number' ? t.pnl : 0;
              return s + pnl;
            }, 0);
            
            const winCount = strategyTrades.filter(t => {
              const pnl = typeof t.pnl === 'number' ? t.pnl : 0;
              return pnl > 0;
            }).length;
            
            const lossCount = strategyTrades.filter(t => {
              const pnl = typeof t.pnl === 'number' ? t.pnl : 0;
              return pnl < 0;
            }).length;
            
            const winRate = strategyTradeCount > 0 ? ((winCount / (winCount + lossCount)) * 100).toFixed(1) : 0;
            
            // Calculate total rules count
            const totalRulesCount = strategy.groups.reduce((sum, group) => sum + (group.rules?.length || 0), 0);

            // Calculer combien de trades ont TOUTES leurs règles cochées
            let rulesRespectedCount = 0;
            if (totalRulesCount > 0) {
              strategyTrades.forEach(trade => {
                // Vérifier si TOUTES les règles de cette stratégie sont cochées pour ce trade
                let allRulesChecked = true;
                strategy.groups.forEach(group => {
                  group.rules?.forEach(rule => {
                    // Clé unique format: date_symbol_entry_exit_direction_stratId_ruleId
                    const ruleKey = `${trade.date}_${trade.symbol}_${trade.entry}_${trade.exit || 'none'}_${trade.direction || 'long'}_${strategy.id}_${rule.id}`;
                    if (!(checkedRules[ruleKey] === true)) {
                      allRulesChecked = false;
                    }
                  });
                });
                if (allRulesChecked) {
                  rulesRespectedCount++;
                }
              });
            }
            const rulesPercent = strategyTradeCount > 0 ? ((rulesRespectedCount / strategyTradeCount) * 100).toFixed(0) : 0;
            
            // ✅ Fonction helper pour créer un graphique en anneau (donut chart)
            const DonutChart = ({ winRate, size = 80 }) => {
              const radius = size / 2 - 8;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference - (winRate / 100) * circumference;
              const color = winRate >= 50 ? T.green : T.red;
              
              return (
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))"}}>
                  {/* Background circle */}
                  <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={T.border} strokeWidth="6"/>
                  {/* Progress circle */}
                  <circle 
                    cx={size/2} cy={size/2} r={radius} 
                    fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size/2} ${size/2})`}
                    style={{transition: "stroke-dashoffset 0.3s ease"}}
                  />
                </svg>
              );
            };
            
            // ✅ Fonction helper pour créer un Area Chart
            const AreaChart = ({ trades, width = 200, height = 100 }) => {
              if (trades.length === 0) {
                return <div style={{width, height, background: T.bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: T.textMut}}>Pas de données</div>;
              }
              
              // Calculer les points cumulatifs
              let cumulative = 0;
              const points = trades.map(t => {
                cumulative += typeof t.pnl === 'number' ? t.pnl : 0;
                return cumulative;
              });
              
              const minVal = Math.min(...points, 0);
              const maxVal = Math.max(...points, 0);
              const range = maxVal - minVal || 1;
              const isPositive = maxVal >= 0;
              
              // Normaliser les points pour le graphique
              const normalized = points.map(p => {
                const normalized = (p - minVal) / range;
                return normalized * height;
              });
              
              // Créer le path
              const startY = isPositive ? height : 0;
              const endY = isPositive ? height : 0;
              let pathData = `M 0 ${startY}`;
              normalized.forEach((y, i) => {
                const x = (i / (normalized.length - 1 || 1)) * width;
                const plotY = isPositive ? height - y : y;
                pathData += ` L ${x} ${plotY}`;
              });
              pathData += ` L ${width} ${endY} Z`;
              
              const gradColor = isPositive ? T.green : T.red;
              
              return (
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{overflow: "visible"}}>
                  <defs>
                    <linearGradient id={`grad-${strategy.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={gradColor} stopOpacity="0.3"/>
                      <stop offset="100%" stopColor={gradColor} stopOpacity="0.05"/>
                    </linearGradient>
                  </defs>
                  <path d={pathData} fill={`url(#grad-${strategy.id})`}/>
                  <path 
                    d={pathData.replace(' Z', '')} 
                    fill="none" 
                    stroke={gradColor} 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              );
            };
            
            return (
              <div
                key={strategy.id}
                style={{
                  display:"grid",
                  gridTemplateColumns:"1.1fr 1.1fr 1fr",
                  gap:24,
                  padding:20,
                  background:T.white,
                  border:`1px solid ${T.border}`,
                  borderRadius:12,
                  transition:"border-color .15s ease, box-shadow .15s ease",
                  cursor:"pointer",
                  minHeight:200,
                  alignItems:"stretch"
                }}
                onMouseEnter={(e)=>{ e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
                onClick={() => {
                  setSelectedStrategyId(strategy.id);
                  localStorage.setItem('selectedStrategyId', strategy.id);
                  setPage('strategy-detail');
                }}
              >
                {/* ========== LEFT SECTION: STATISTICS ========== */}
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",paddingRight:20,borderRight:`1px solid ${T.border}`}}>
                  {/* Strategy Name & Color Dot */}
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:strategy.color,flexShrink:0}}/>
                    <div style={{fontSize:17,fontWeight:600,color:T.text,lineHeight:1.3,letterSpacing:-0.1}}>{strategy.name}</div>
                  </div>

                  {/* PnL */}
                  <div style={{paddingTop:14,paddingBottom:14}}>
                    <div style={{fontSize:11,color:T.textMut,fontWeight:500,marginBottom:6}}>{t("strat.pnlNet")}</div>
                    <div style={{fontSize:24,fontWeight:600,color:totalPnL >= 0 ? T.green : T.red,letterSpacing:-0.3}}>{fmt(totalPnL,true)}</div>
                  </div>

                  {/* W/L bar + Win Rate */}
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:T.textMut,fontWeight:500,marginBottom:8}}>{t("strat.winsLosses")}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{fontSize:11,fontWeight:600,color:T.green,minWidth:18}}>{winCount}</div>
                        <div style={{display:"flex",height:4,borderRadius:2,background:T.border,overflow:"hidden",flex:1}}>
                          <div style={{flex:winCount,background:T.green}}/>
                          <div style={{flex:lossCount,background:T.red}}/>
                        </div>
                        <div style={{fontSize:11,fontWeight:600,color:T.red,minWidth:18,textAlign:"right"}}>{lossCount}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                      <DonutChart winRate={parseInt(winRate)} size={56}/>
                      <div style={{display:"flex",flexDirection:"column"}}>
                        <div style={{fontSize:11,color:T.textMut,fontWeight:500}}>{t("common.winRate")}</div>
                        <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>{winRate}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========== CENTER SECTION: AREA CHART ========== */}
                <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 20px",borderRight:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:11,color:T.textMut,fontWeight:500}}>{t("strat.performance")}</div>
                    <div style={{fontSize:11,color:T.textSub,fontWeight:500}}>{strategyTradeCount} trades</div>
                  </div>
                  <div style={{width:"100%"}}>
                    <AreaChart trades={strategyTrades} width={280} height={110}/>
                  </div>
                </div>

                {/* ========== RIGHT SECTION: RULES ========== */}
                <div style={{display:"flex",flexDirection:"column",gap:10,paddingLeft:4}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:11,color:T.textMut,fontWeight:500}}>{t("strat.rules")}</div>
                    <div style={{display:"flex",gap:4}}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditStrategy(strategy); }}
                        title="Modifier"
                        style={{
                          width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",
                          borderRadius:6,border:`1px solid ${T.border}`,background:T.white,
                          color:T.textSub,cursor:"pointer",transition:"background .15s ease",
                        }}
                        onMouseEnter={(e)=>{ e.currentTarget.style.background = T.accentBg; }}
                        onMouseLeave={(e)=>{ e.currentTarget.style.background = T.white; }}
                      >
                        <Pencil size={13} strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteStrategy(strategy.id); }}
                        title="Supprimer"
                        style={{
                          width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",
                          borderRadius:6,border:`1px solid ${T.border}`,background:T.white,
                          color:T.red,cursor:"pointer",transition:"background .15s ease",
                        }}
                        onMouseEnter={(e)=>{ e.currentTarget.style.background = T.redBg; }}
                        onMouseLeave={(e)=>{ e.currentTarget.style.background = T.white; }}
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  <div style={{display:"flex",flexDirection:"column",gap:10,flex:1,overflowY:"auto",maxHeight:170,paddingRight:4}} className="scroll-thin">
                    {strategy.groups && strategy.groups.length > 0 ? (
                      strategy.groups.map(group => (
                        <div key={group.id} style={{display:"flex",flexDirection:"column",gap:4}}>
                          {group.name && (
                            <div style={{fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:0.4}}>
                              {group.name}
                            </div>
                          )}
                          {group.rules && group.rules.map((rule, idx) => (
                            <div key={rule.id} style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:3,height:3,borderRadius:"50%",background:T.textMut,flexShrink:0}}/>
                              <div style={{fontSize:12,color:T.text,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                {rule.text || `Règle ${idx+1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div style={{fontSize:12,color:T.textMut}}>Aucune règle</div>
                    )}
                  </div>
                </div>
              </div>
            );
            });
          })()}
        </div>
      )}

      {/* EMPTY STATE */}
      {(!strategies || !Array.isArray(strategies) || strategies.length === 0) && (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"64px 40px",textAlign:"center",minHeight:"50vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <div style={{width:48,height:48,borderRadius:12,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
            <Target size={22} strokeWidth={1.75} color={T.text}/>
          </div>
          <div style={{fontSize:17,fontWeight:600,color:T.text,marginBottom:6,letterSpacing:-0.1}}>{t("strat.empty")}</div>
          <div style={{fontSize:13,color:T.textSub,marginBottom:20,maxWidth:380,lineHeight:1.5}}>{t("strat.emptySub")}</div>
          <button onClick={()=>setShowStrategyForm(true)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,background:T.text,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"var(--font-sans)"}}>
            <Plus size={14} strokeWidth={2}/> {t("strat.createBtn")}
          </button>
        </div>
      )}

      {/* ─── MODALE DE CONFIRMATION DE SUPPRESSION ─── */}
      {showDeleteConfirm && ReactDOM.createPortal(
        <div onClick={cancelDelete} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={(e)=>e.stopPropagation()} style={{background:T.white,borderRadius:12,padding:32,maxWidth:400,width:"90%",boxShadow:"0 20px 25px -5px rgba(0,0,0,0.1)"}}>
            <h2 style={{fontSize:18,fontWeight:700,color:T.text,textAlign:"left",marginBottom:12}}>{t("strat.deleteTitle")}</h2>
            <p style={{fontSize:14,color:T.textSub,textAlign:"left",marginBottom:24,lineHeight:1.5}}>{t("strat.deleteWarn")}</p>
            
            <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
              <button
                onClick={cancelDelete}
                style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${T.border}`,background:T.white,fontSize:13,fontWeight:600,cursor:"pointer",color:T.text,transition:"all .2s"}}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                style={{padding:"10px 20px",borderRadius:8,border:"none",background:T.red,fontSize:13,fontWeight:600,cursor:loading?"not-allowed":"pointer",color:"#fff",transition:"all .2s",opacity:loading?0.6:1}}
              >
                {loading ? (t("common.loading")) : t("common.delete")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODALE DE CRÉATION/ÉDITION ─── */}
      {showStrategyForm && ReactDOM.createPortal(
        <div onClick={handleCancelEdit} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)"}}>
          <div onClick={(e)=>e.stopPropagation()} style={{background:T.white,borderRadius:14,maxWidth:560,width:"92%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.18)",border:`1px solid ${T.border}`,overflow:"hidden"}}>

            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px",borderBottom:`1px solid ${T.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:formData.color}}/>
                <h2 style={{fontSize:16,fontWeight:600,color:T.text,margin:0,letterSpacing:-0.1}}>
                  {editingStrategyId ? t("strat.edit") : t("strat.new")}
                </h2>
              </div>
              <button onClick={handleCancelEdit} style={{display:"flex",alignItems:"center",justifyContent:"center",width:28,height:28,background:"transparent",border:"none",cursor:"pointer",color:T.textMut,borderRadius:6}}
                onMouseEnter={(e)=>{e.currentTarget.style.background=T.accentBg}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
                <X size={16} strokeWidth={1.75}/>
              </button>
            </div>

            {/* Body (scroll) */}
            <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:18}}>

              {/* Nom */}
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:500,marginBottom:6,color:T.textSub}}>{t("strat.name")}</label>
                <input type="text" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} placeholder="ex. Scalp 5min FVG"
                  style={{width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:"none",fontFamily:"inherit",color:T.text,background:T.white}}
                  onFocus={(e)=>{e.currentTarget.style.borderColor=T.text}} onBlur={(e)=>{e.currentTarget.style.borderColor=T.border}}/>
              </div>

              {/* Description */}
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:500,marginBottom:6,color:T.textSub}}>{t("strat.description")}</label>
                <textarea value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} placeholder="Décrivez votre stratégie en quelques mots..."
                  style={{width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:"none",resize:"vertical",minHeight:64,fontFamily:"inherit",color:T.text,background:T.white,lineHeight:1.5}}
                  onFocus={(e)=>{e.currentTarget.style.borderColor=T.text}} onBlur={(e)=>{e.currentTarget.style.borderColor=T.border}}/>
              </div>

              {/* Couleur */}
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:500,marginBottom:8,color:T.textSub}}>{t("strat.color")}</label>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%"}}>
                  {colors.map(color=>{
                    const selected = formData.color === color;
                    return (
                      <button key={color} type="button" onClick={()=>setFormData({...formData,color})}
                        style={{width:24,height:24,borderRadius:"50%",background:color,border:"none",cursor:"pointer",padding:0,boxShadow:selected?`0 0 0 2px ${T.white}, 0 0 0 4px ${T.text}`:"none",transition:"box-shadow .15s ease",flexShrink:0}}/>
                    );
                  })}
                </div>
              </div>

              {/* Groupes de règles */}
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <label style={{fontSize:12,fontWeight:500,color:T.textSub}}>Règles</label>
                  <button onClick={addGroup} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,color:T.text,background:"transparent",border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:6,fontFamily:"inherit",fontWeight:500}}
                    onMouseEnter={(e)=>{e.currentTarget.style.background=T.accentBg}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
                    <Plus size={13} strokeWidth={2}/> Ajouter un groupe
                  </button>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {formData.groups && formData.groups.map((group)=>(
                    <div key={group.id} style={{padding:12,border:`1px solid ${T.border}`,borderRadius:10,background:T.white}}>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <input type="text" placeholder="Nom du groupe (ex. Conditions d'entrée)" value={group.name} onChange={(e)=>updateGroup(group.id,"name",e.target.value)}
                          style={{flex:1,padding:"6px 8px",border:"none",fontSize:12,fontWeight:600,outline:"none",color:T.text,background:"transparent",fontFamily:"inherit",letterSpacing:0.2}}/>
                        {formData.groups.length > 1 && (
                          <button onClick={()=>removeGroup(group.id)} title="Supprimer le groupe"
                            style={{display:"flex",alignItems:"center",justifyContent:"center",width:24,height:24,background:"transparent",border:"none",cursor:"pointer",color:T.textMut,borderRadius:6}}
                            onMouseEnter={(e)=>{e.currentTarget.style.background=T.redBg;e.currentTarget.style.color=T.red}}
                            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textMut}}>
                            <X size={13} strokeWidth={2}/>
                          </button>
                        )}
                      </div>
                      <div style={{height:1,background:T.border,margin:"8px 0"}}/>

                      <div style={{display:"flex",flexDirection:"column",gap:4,marginLeft:16}}>
                        {group.rules && group.rules.map((rule)=>(
                          <div key={rule.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 8px",borderRadius:6}}
                            onMouseEnter={(e)=>{e.currentTarget.style.background=T.accentBg}}
                            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
                            <div style={{width:4,height:4,borderRadius:"50%",background:T.textMut,flexShrink:0}}/>
                            <input type="text" placeholder="ex. FVG 5m" value={rule.text} onChange={(e)=>updateRule(group.id,rule.id,e.target.value)}
                              style={{flex:1,padding:"4px 0",border:"none",fontSize:12,outline:"none",color:T.text,background:"transparent",fontFamily:"inherit"}}/>
                            {group.rules.length > 1 && (
                              <button onClick={()=>removeRule(group.id,rule.id)}
                                style={{display:"flex",alignItems:"center",justifyContent:"center",width:20,height:20,background:"transparent",border:"none",cursor:"pointer",color:T.textMut,borderRadius:4}}
                                onMouseEnter={(e)=>{e.currentTarget.style.color=T.red}} onMouseLeave={(e)=>{e.currentTarget.style.color=T.textMut}}>
                                <X size={11} strokeWidth={2}/>
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={()=>addRule(group.id)} style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:4,fontSize:12,color:T.textSub,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",padding:"4px 8px",borderRadius:6,fontFamily:"inherit",alignSelf:"flex-start"}}
                          onMouseEnter={(e)=>{e.currentTarget.style.background=T.accentBg;e.currentTarget.style.color=T.text}}
                          onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textSub}}>
                          <Plus size={11} strokeWidth={2}/> Ajouter une règle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:`1px solid ${T.border}`,background:T.bg}}>
              <button onClick={handleCancelEdit} style={{padding:"8px 16px",height:34,borderRadius:8,border:`1px solid ${T.border}`,background:T.white,fontSize:13,fontWeight:600,cursor:"pointer",color:T.text,fontFamily:"var(--font-sans)"}}>Annuler</button>
              <button onClick={handleCreateStrategy} disabled={!formData.name.trim()}
                style={{padding:"8px 16px",height:34,borderRadius:8,border:`1px solid ${T.text}`,background:T.text,color:"#fff",fontSize:13,fontWeight:600,cursor:formData.name.trim()?"pointer":"not-allowed",opacity:formData.name.trim()?1:0.5,fontFamily:"var(--font-sans)"}}>
                {editingStrategyId ? "Enregistrer" : "Créer la stratégie"}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
