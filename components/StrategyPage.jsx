"use client";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { parseCSV, calculateStats } from "@/lib/csvParsers";
import { useStrategies } from "@/lib/hooks/useUserData";
import { useTrades } from "@/lib/hooks/useTradeData";

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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #FFFFFF; color: ${T.text}; font-family: 'DM Sans', sans-serif; min-height: 100vh; font-size: 14px; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
  button { font-family: inherit; cursor: pointer; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .anim-1 { animation: fadeUp .35s ease both; }
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

export default function StrategyPage({ setPage = () => {}, setSelectedStrategyId = () => {} }) {
  // ✅ Utiliser les hooks Supabase au lieu de localStorage
  const { strategies, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const { trades } = useTrades();
  
  const [loading, setLoading] = useState(false);
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [formData, setFormData] = useState({name:"",description:"",color:"#22C55E",groups:[{id:Date.now(),name:"",rules:[{id:Date.now()+1,text:""}]}]});
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

  const getDefaultFormData = () => ({name:"",description:"",color:"#22C55E",groups:[{id:Date.now(),name:"",rules:[{id:Date.now()+1,text:""}]}]});

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
            await addStrategy(formData);
          }
          setFormData(getDefaultFormData());
          setShowStrategyForm(false);
          setEditingStrategyId(null);
          console.log("✅ Stratégie sauvegardée");
        } catch (err) {
          console.error("❌ Erreur sauvegarde stratégie:", err);
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:700}}>🎯 Stratégies</h1>
        <button onClick={() => setShowStrategyForm(true)} style={{padding:"10px 20px",borderRadius:8,background:T.accent,border:"none",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>+ Créer une stratégie</button>
      </div>

      {/* STRATEGIES LIST - VERTICAL */}
      {strategies.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {strategies.map(strategy => {
            // ✅ Fonction helper pour obtenir les stratégies assignées à un trade
            const getStrategyIdsForTrade = (trade) => {
              // Chercher d'abord par ID du trade Supabase
              let strategyIds = tradeStrategiesData[trade.id] || [];
              
              // Si pas trouvé, essayer l'ancien format (pour compatibilité)
              if (strategyIds.length === 0 && trade.date && trade.symbol && trade.entry) {
                const compositeId = `${trade.date}_${trade.symbol}_${trade.entry}`;
                strategyIds = tradeStrategiesData[compositeId] || [];
              }
              
              return strategyIds;
            };

            // Compter les trades assignés à cette stratégie
            const strategyTradeCount = trades.filter(t => {
              const strategyIds = getStrategyIdsForTrade(t);
              return strategyIds.includes(strategy.id);
            }).length;

            // Calculer stats rapides (pour l'aperçu)
            const strategyTrades = trades.filter(t => {
              const strategyIds = getStrategyIdsForTrade(t);
              return strategyIds.includes(strategy.id);
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
            
            return (
              <div
                key={strategy.id}
                onClick={() => {
                  setSelectedStrategyId(strategy.id);
                  localStorage.setItem('selectedStrategyId', strategy.id);
                  setPage('strategy-detail');
                }}
                style={{
                  display:"flex",
                  alignItems:"center",
                  gap:32,
                  padding:16,
                  background:T.white,
                  border:`1px solid ${T.border}`,
                  borderRadius:12,
                  transition:"all .2s",
                  cursor:"pointer"
                }}
              >
                {/* COLOR DOT */}
                <div style={{width:12,height:12,borderRadius:"50%",background:strategy.color,flexShrink:0}}/>
                
                {/* STRATEGY INFO */}
                <div style={{minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:4}}>{strategy.name}</div>
                  <div style={{fontSize:12,color:T.textMut,lineHeight:1.4}}>{strategy.description || "Pas de description"}</div>
                </div>

                {/* SPACER */}
                <div style={{flex:1}}/>

                {/* QUICK STATS - TABLE LAYOUT */}
                <div style={{display:"flex",gap:32,alignItems:"center",fontSize:13}}>
                  {/* TRADES */}
                  <div style={{display:"flex",flexDirection:"column",textAlign:"left",minWidth:80}}>
                    <div style={{fontSize:10,color:T.textMut,fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>Trades</div>
                    <div style={{fontWeight:600,color:T.text}}>{strategyTradeCount}</div>
                  </div>
                  
                  {/* RULES */}
                  <div style={{display:"flex",flexDirection:"column",textAlign:"left",minWidth:80}}>
                    <div style={{fontSize:10,color:T.textMut,fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>Règles</div>
                    <div style={{fontWeight:600,color:T.text}}>{totalRulesCount}</div>
                  </div>

                  {/* RULES RESPECTED */}
                  <div style={{display:"flex",flexDirection:"column",textAlign:"left",minWidth:100}}>
                    <div style={{fontSize:10,color:T.textMut,fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>Respectées</div>
                    <div style={{fontWeight:600,color:rulesPercent >= 100 ? T.green : rulesPercent >= 50 ? T.amber : T.red}}>{rulesPercent}% ({rulesRespectedCount}/{strategyTradeCount})</div>
                  </div>
                  
                  {/* WIN RATE */}
                  <div style={{display:"flex",flexDirection:"column",textAlign:"left",minWidth:80}}>
                    <div style={{fontSize:10,color:T.textMut,fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>Win Rate</div>
                    <div style={{fontWeight:600,color:T.text}}>{winRate}%</div>
                  </div>
                  
                  {/* P&L */}
                  <div style={{display:"flex",flexDirection:"column",textAlign:"left",minWidth:100}}>
                    <div style={{fontSize:10,color:T.textMut,fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>P&L</div>
                    <div style={{fontWeight:600,color:totalPnL >= 0 ? T.green : T.red}}>{fmt(totalPnL,true)}</div>
                  </div>
                </div>

                {/* BUTTONS */}
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStrategy(strategy);
                    }}
                    style={{
                      padding:"8px 14px",
                      fontSize:12,
                      borderRadius:6,
                      border:`1px solid ${T.border}`,
                      background:T.white,
                      color:T.textSub,
                      cursor:"pointer",
                      transition:"all .2s"
                    }}
                  >Éditer</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {strategies.length === 0 && (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"80px 40px",textAlign:"center",minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <div style={{fontSize:64,marginBottom:20}}>🎯</div>
          <div style={{fontSize:24,fontWeight:700,color:T.text,marginBottom:8}}>Pas encore de stratégies</div>
          <div style={{fontSize:14,color:T.textSub,marginBottom:24,maxWidth:400}}>Créez votre première stratégie de trading avec des règles pour suivre comment tout s'agit.</div>
          <button onClick={()=>setShowStrategyForm(true)} style={{padding:"12px 24px",borderRadius:8,background:"#000",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",border:"none"}}>+ Créer votre première stratégie</button>
        </div>
      )}

      {/* ─── MODALE DE CRÉATION/ÉDITION ─── */}
      {showStrategyForm && ReactDOM.createPortal(
        <div onClick={handleCancelEdit} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={(e)=>e.stopPropagation()} style={{background:T.white,borderRadius:12,padding:40,maxWidth:600,width:"90%",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:20,fontWeight:700}}>{editingStrategyId ? "✏️ Modifier la stratégie" : "🎯 Créer une stratégie"}</h2>
              <button onClick={handleCancelEdit} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:T.textMut}}>✕</button>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:6,color:T.textMut}}>Nom de la stratégie</label>
              <input type="text" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} placeholder="ex. Scalp 5min FVG" style={{width:"100%",padding:"10px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:14,outline:"none"}}/>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:6,color:T.textMut}}>Description</label>
              <textarea value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} placeholder="Décrivez votre stratégie..." style={{width:"100%",padding:"10px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:14,outline:"none",resize:"vertical",minHeight:60}}/>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:8,color:T.textMut}}>Couleur</label>
              <div style={{display:"flex",gap:8}}>
                {colors.map(color=>(
                  <button key={color} onClick={()=>setFormData({...formData,color})} style={{width:32,height:32,borderRadius:8,background:color,border:formData.color===color?`3px solid ${T.text}`:"2px solid #ddd",cursor:"pointer"}}/>
                ))}
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:8,color:T.textMut}}>Groupes de règles</label>
              {formData.groups && formData.groups.map((group,gIdx)=>(
                <div key={group.id} style={{marginBottom:16,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.bg}}>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <input type="text" placeholder="Nom du groupe" value={group.name} onChange={(e)=>updateGroup(group.id,"name",e.target.value)} style={{flex:1,padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,outline:"none"}}/>
                    {formData.groups.length > 1 && <button onClick={()=>removeGroup(group.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:T.red}}>✕</button>}
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
              <button onClick={handleCancelEdit} style={{padding:"10px 20px",borderRadius:6,border:`1px solid ${T.border}`,background:T.white,fontSize:12,fontWeight:600,cursor:"pointer"}}>Annuler</button>
              <button onClick={handleCreateStrategy} style={{padding:"10px 20px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>{editingStrategyId ? "✓ Modifier la stratégie" : "✓ Créer une stratégie"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
