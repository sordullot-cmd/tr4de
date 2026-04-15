"use client";

import { useState, useRef, useEffect } from "react";

const T = {
  white:   "#FFFFFF",
  bg:      "#F8FAFB",
  surface: "#FFFFFF",
  border:  "#E3E6EB",
  border2: "#CED3DB",
  text:    "#1A1F2E",
  textSub: "#5F6B7E",
  textMut: "#8B95AA",
  green:   "#4A9D6F",
  greenBg: "#E6F3EB",
  greenBd: "#BFDCCF",
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

function TradeValidator({ trades = [] }) {
  const [validationResults, setValidationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [strategyRules, setStrategyRules] = useState(null);

  const validateTrades = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/trade-ai/validate-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          trades,
          strategyRules 
        }),
      });
      const data = await response.json();
      setValidationResults(data);
      setStrategyRules(data.strategy);
    } catch (err) {
      console.error("Validation error:", err);
    }
    setLoading(false);
  };

  if (trades.length === 0) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:20,fontWeight:700}}>📋 Trade Validator</div>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"60px 24px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:600,marginBottom:8,color:T.text}}>Aucun trade à valider</div>
          <p style={{color:T.textSub}}>Importez des trades pour analyser la discipline d'exécution.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:20,fontWeight:700}}>📋 Trade Validator - Analyse de Discipline</div>
        <button 
          onClick={validateTrades}
          disabled={loading}
          style={{
            background: T.accent,
            color: T.white,
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "⏳ Validation..." : "🔍 Valider les Trades"}
        </button>
      </div>

      {validationResults && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Summary Section */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>📊 Résumé Général</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              <div style={{padding:12,background:T.accentBg,borderRadius:8,border:`1px solid ${T.accentBd}`}}>
                <div style={{fontSize:11,color:T.textSub}}>Discipline Moyenne</div>
                <div style={{fontSize:18,fontWeight:700,color:T.accent}}>{validationResults.summary.averageDisciplineScore}/10</div>
              </div>
              <div style={{padding:12,background:T.greenBg,borderRadius:8,border:`1px solid ${T.greenBd}`}}>
                <div style={{fontSize:11,color:T.textSub}}>Trades Disciplinés</div>
                <div style={{fontSize:18,fontWeight:700,color:T.green}}>{validationResults.summary.fullyDisciplinedTrades}/{trades.length}</div>
              </div>
              <div style={{padding:12,background:T.redBg,borderRadius:8,border:`1px solid ${T.redBd}`}}>
                <div style={{fontSize:11,color:T.textSub}}>Problèmes Psycho</div>
                <div style={{fontSize:18,fontWeight:700,color:T.red}}>{validationResults.summary.majorPsychologicalIssues}</div>
              </div>
              <div style={{padding:12,background:T.blueBg,borderRadius:8,border:`1px solid #BFDBFE`}}>
                <div style={{fontSize:11,color:T.textSub}}>Tendance</div>
                <div style={{fontSize:14,fontWeight:700,color:T.blue}}>{validationResults.summary.disciplineTrend}</div>
              </div>
            </div>
          </div>

          {/* Comparative Analysis */}
          {validationResults.comparativeAnalysis && (
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>🔗 Comparaison Discipline vs Performance</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div style={{padding:12,background:T.greenBg,borderRadius:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.green,marginBottom:8}}>✅ Trades Haute Discipline (≥8/10)</div>
                  <div style={{fontSize:12,color:T.textSub}}>
                    • Nombre: {validationResults.comparativeAnalysis.disciplineComparison.highDiscipline.trades} trades<br/>
                    • Avg P&L: ${validationResults.comparativeAnalysis.disciplineComparison.highDiscipline.avgPnL}<br/>
                    • Win Rate: {validationResults.comparativeAnalysis.disciplineComparison.highDiscipline.winRate}
                  </div>
                </div>
                <div style={{padding:12,background:T.redBg,borderRadius:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.red,marginBottom:8}}>❌ Trades Basse Discipline (≤4/10)</div>
                  <div style={{fontSize:12,color:T.textSub}}>
                    • Nombre: {validationResults.comparativeAnalysis.disciplineComparison.lowDiscipline.trades} trades<br/>
                    • Avg P&L: ${validationResults.comparativeAnalysis.disciplineComparison.lowDiscipline.avgPnL}<br/>
                    • Win Rate: {validationResults.comparativeAnalysis.disciplineComparison.lowDiscipline.winRate}
                  </div>
                </div>
              </div>
              <div style={{marginTop:12,padding:12,background:T.amberBg,borderRadius:8,border:`1px solid #FCD34D`,fontSize:13,fontWeight:600}}>
                🔑 {validationResults.comparativeAnalysis.keyInsight}
              </div>
            </div>
          )}

          {/* Trades List */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>📝 Analyse Détaillée par Trade</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:"600px",overflowY:"auto"}}>
              {validationResults.tradeAnalysis.map((trade, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedTrade(selectedTrade?.tradeId === trade.tradeId ? null : trade)}
                  style={{
                    padding:12,
                    background: trade.disciplineScore >= 8 ? T.greenBg : 
                                trade.disciplineScore >= 5 ? T.accentBg : T.redBg,
                    border: `1px solid ${selectedTrade?.tradeId === trade.tradeId ? T.accent : "transparent"}`,
                    borderRadius:8,
                    cursor:"pointer",
                    transition:"all 0.2s"
                  }}
                >
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:600}}>{trade.date}</span>
                      <span style={{fontSize:12,color:T.textSub}}>{trade.symbol}</span>
                      <span style={{fontSize:12,fontWeight:600,color:trade.direction === "Long" ? T.green : T.red}}>
                        {trade.direction}
                      </span>
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:600,color:T.textSub}}>
                        Score: <span style={{color:T.accent,fontSize:13}}>{trade.disciplineScore}/10</span>
                      </span>
                      <span style={{fontSize:11,fontWeight:600,color:trade.pnl > 0 ? T.green : T.red}}>
                        P&L: ${trade.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div style={{fontSize:12,fontWeight:600,color:trade.violatedRulesCount === 0 ? T.green : T.red}}>
                    {trade.isValid}
                  </div>

                  {selectedTrade?.tradeId === trade.tradeId && (
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border2}`}}>
                      {/* Rule Validation */}
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>Validation des Règles:</div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {trade.ruleValidation.map((rule, rIdx) => (
                            <div key={rIdx} style={{fontSize:11,padding:8,background:T.bg,borderRadius:4,borderLeft:`3px solid ${rule.status === "VALIDÉE" ? T.green : rule.status === "NON-RESPECTÉE" ? T.red : T.amber}`}}>
                              <div style={{fontWeight:600,marginBottom:2}}>
                                {rule.status === "VALIDÉE" ? "✅" : rule.status === "NON-RESPECTÉE" ? "❌" : "⚠️"} {rule.ruleName}
                              </div>
                              <div style={{fontSize:10,color:T.textSub}}>{rule.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Discipline Verdict */}
                      <div style={{marginBottom:12,padding:10,background:T.accentBg,borderRadius:6,borderLeft:`3px solid ${T.accent}`}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.accent,marginBottom:4}}>Verdict Discipline:</div>
                        <div style={{fontSize:11,fontWeight:600}}>{trade.disciplineVerdict.verdict}</div>
                        <div style={{fontSize:10,color:T.textSub,marginTop:4}}>{trade.disciplineVerdict.details}</div>
                      </div>

                      {/* Psychological Impact */}
                      {trade.psychologicalImpact.hasPsychologicalIssues && (
                        <div style={{padding:10,background:T.redBg,borderRadius:6,borderLeft:`3px solid ${T.red}`}}>
                          <div style={{fontSize:11,fontWeight:700,color:T.red,marginBottom:4}}>
                            🧠 Facteurs Psychologiques ({trade.psychologicalImpact.severity}):
                          </div>
                          {trade.psychologicalImpact.factors.map((factor, fIdx) => (
                            <div key={fIdx} style={{fontSize:10,marginBottom:6,color:T.text}}>
                              <div style={{fontWeight:600}}>{factor.psychologicalFactor}</div>
                              <div style={{color:T.textSub,marginTop:2}}>{factor.description}</div>
                            </div>
                          ))}
                          <div style={{fontSize:10,marginTop:8,padding:8,background:T.white,borderRadius:4,color:T.text}}>
                            <strong>Recommandation:</strong> {trade.psychologicalImpact.recommendation}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradeValidator;
