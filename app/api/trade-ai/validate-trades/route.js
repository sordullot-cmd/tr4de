/**
 * Trade Validation & Discipline Analysis API
 * Validates each trade against strategy rules
 * Scores discipline of execution for each trade
 * Identifies psychological impacts
 */

export async function POST(request) {
  try {
    const { trades, strategyRules } = await request.json();

    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return Response.json({
        error: "Trades required",
      }, { status: 400 });
    }

    // Use default rules if not provided
    const rules = strategyRules || getDefaultStrategyRules();

    // Validate each trade
    const validatedTrades = trades.map((trade, idx) => {
      return validateTradeAgainstRules(trade, rules, trades, idx);
    });

    // Generate comparative analysis
    const comparativeAnalysis = generateComparativeAnalysis(validatedTrades);

    return Response.json({
      strategy: {
        totalRules: rules.length,
        rules: rules.map(r => ({ name: r.name, description: r.description })),
      },
      tradeAnalysis: validatedTrades,
      comparativeAnalysis,
      summary: {
        totalTrades: trades.length,
        averageDisciplineScore: (
          validatedTrades.reduce((s, t) => s + t.disciplineScore, 0) / 
          validatedTrades.length
        ).toFixed(1),
        fullyDisciplinedTrades: validatedTrades.filter(t => 
          t.ruleValidation.every(v => v.status === "VALIDÉE")
        ).length,
        majorPsychologicalIssues: validatedTrades.filter(t => 
          t.psychologicalImpact.severity === "CRITICAL"
        ).length,
        disciplineTrend: calculateDisciplineTrend(validatedTrades),
      },
    });
  } catch (error) {
    console.error("Validation error:", error);
    return Response.json({
      error: error.message,
    }, { status: 500 });
  }
}

function getDefaultStrategyRules() {
  return [
    {
      id: "rule_1",
      name: "Risk:Reward Ratio",
      description: "Chaque trade doit avoir un ratio RR minimum de 1:2",
      validate: (trade) => {
        if (!trade.entry || !trade.exit) return null;
        const risk = Math.abs(trade.entry - trade.exit);
        // Assuming typical 50pt target for 25pt stop
        const expectedReward = risk * 2;
        return risk > 0 && expectedReward >= risk * 1.5;
      }
    },
    {
      id: "rule_2",
      name: "Position Sizing",
      description: "La position doit être cohérente avec le plan (±20%)",
      validate: (trade, allTrades) => {
        const avgQty = allTrades.reduce((s, t) => s + t.qty, 0) / allTrades.length;
        return Math.abs(trade.qty - avgQty) <= avgQty * 0.2;
      }
    },
    {
      id: "rule_3",
      name: "Stop-Loss Respecté",
      description: "La sortie ne doit pas dépasser le stop défini (2% max)",
      validate: (trade) => {
        if (trade.pnl < 0) {
          // Loss should not exceed 2% of typical account
          return Math.abs(trade.pnl) <= 500; // Configurable
        }
        return true;
      }
    },
    {
      id: "rule_4",
      name: "Timing de Marché",
      description: "Trader uniquement pendant heures optimales (9h-15h)",
      validate: (trade) => {
        try {
          const d = new Date(trade.date);
          const hour = d.getHours();
          return hour >= 9 && hour <= 15;
        } catch (e) {
          return true;
        }
      }
    },
    {
      id: "rule_5",
      name: "Pas de Revenge Trading",
      description: "Ne pas trader < 15 min après une perte",
      validate: (trade, allTrades, idx) => {
        if (idx === 0) return true;
        const prevTrade = allTrades[idx - 1];
        if (prevTrade.pnl < 0) {
          const timeDiff = getTimeDifference(prevTrade.date, trade.date);
          return timeDiff >= 15;
        }
        return true;
      }
    },
    {
      id: "rule_6",
      name: "Pas de FOMO",
      description: "Ne pas augmenter la taille après un win",
      validate: (trade, allTrades, idx) => {
        if (idx === 0) return true;
        const prevTrade = allTrades[idx - 1];
        if (prevTrade.pnl > 0) {
          return trade.qty <= prevTrade.qty * 1.2;
        }
        return true;
      }
    },
    {
      id: "rule_7",
      name: "Respect du Plan",
      description: "Direction alignée avec analyse de marché mensuelle",
      validate: (trade) => {
        // Assume Long is more frequent = default
        return true;
      }
    },
  ];
}

function validateTradeAgainstRules(trade, rules, allTrades, tradeIndex) {
  const ruleValidation = [];
  const violatedRules = [];

  rules.forEach(rule => {
    try {
      const isValid = rule.validate(trade, allTrades, tradeIndex);
      if (isValid === null || isValid === undefined) {
        ruleValidation.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleDescription: rule.description,
          status: "N/A",
          reason: "Unable to validate",
        });
      } else {
        const status = isValid ? "VALIDÉE" : "NON-RESPECTÉE";
        ruleValidation.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleDescription: rule.description,
          status,
          reason: status === "VALIDÉE" ? 
            `✓ ${rule.name} respectée` : 
            `✗ ${rule.name} non-respectée`,
        });
        if (!isValid) violatedRules.push(rule);
      }
    } catch (e) {
      ruleValidation.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: "ERROR",
        reason: e.message,
      });
    }
  });

  // Calculate discipline score (0-10)
  const disciplineScore = calculateDisciplineScore(ruleValidation);

  // Determine discipline verdict
  const disciplineVerdict = getDisciplineVerdict(ruleValidation, trade);

  // Analyze psychological impact
  const psychologicalImpact = analyzePsychologicalImpact(violatedRules, trade, allTrades, tradeIndex);

  // Trade validity assessment
  const isValid = violatedRules.length === 0;

  return {
    tradeId: trade.id,
    date: trade.date,
    symbol: trade.symbol,
    direction: trade.direction,
    entry: trade.entry,
    exit: trade.exit,
    pnl: trade.pnl,
    qty: trade.qty,
    ruleValidation,
    disciplineScore,
    disciplineVerdict,
    psychologicalImpact,
    isValid: isValid ? "✓ VALIDE" : "✗ INVALIDE",
    violatedRulesCount: violatedRules.length,
  };
}

function calculateDisciplineScore(ruleValidation) {
  const validatedRules = ruleValidation.filter(r => r.status !== "N/A" && r.status !== "ERROR");
  if (validatedRules.length === 0) return 5;

  const passedRules = validatedRules.filter(r => r.status === "VALIDÉE").length;
  const score = (passedRules / validatedRules.length) * 10;
  
  return Math.round(score * 10) / 10;
}

function getDisciplineVerdict(ruleValidation, trade) {
  const violatedCount = ruleValidation.filter(r => r.status === "NON-RESPECTÉE").length;

  if (violatedCount === 0) {
    return {
      verdict: "✅ PARFAITEMENT DISCIPLINÉ",
      details: "Toutes les règles ont été respectées. Exécution impeccable.",
      rating: "Excellent"
    };
  } else if (violatedCount === 1) {
    return {
      verdict: "⚠️ LÉGÈREMENT DÉVIANT",
      details: "1 règle non-respectée. Petite déviation du plan.",
      rating: "Bon"
    };
  } else if (violatedCount === 2) {
    return {
      verdict: "⚠️ MODÉRÉMENT DÉVIANT",
      details: `${violatedCount} règles non-respectées. Déviation notable du plan.`,
      rating: "Moyen"
    };
  } else {
    return {
      verdict: "🚨 FORTEMENT DÉVIANT",
      details: `${violatedCount} règles non-respectées. Trade basé sur l'émotion plutôt que le plan.`,
      rating: "Faible"
    };
  }
}

function analyzePsychologicalImpact(violatedRules, trade, allTrades, tradeIndex) {
  const impacts = [];
  let severity = "LOW";

  violatedRules.forEach(rule => {
    let impact = {
      rule: rule.name,
      psychologicalFactor: null,
      description: null,
    };

    if (rule.name === "Pas de Revenge Trading") {
      impact.psychologicalFactor = "REVENGE TRADING";
      impact.description = "Réaction émotionnelle à une perte immédiate. Vous cherchez à récupérer vos pertes rapidement.";
      severity = "CRITICAL";
    } else if (rule.name === "Pas de FOMO") {
      impact.psychologicalFactor = "FOMO (Fear Of Missing Out)";
      impact.description = "Vous avez augmenté la position après un gain. Confiance excessive + avidité.";
      severity = "CRITICAL";
    } else if (rule.name === "Position Sizing") {
      impact.psychologicalFactor = "OVERCONFIDENCE / FEAR";
      impact.description = trade.qty > (allTrades.reduce((s, t) => s + t.qty, 0) / allTrades.length) ?
        "Position trop grosse = Overconfidence ou tentative de compenser une perte" :
        "Position trop petite = Peur du marché / manque de confiance";
      severity = severity === "CRITICAL" ? "CRITICAL" : "MEDIUM";
    } else if (rule.name === "Stop-Loss Respecté") {
      impact.psychologicalFactor = "RISK MISMANAGEMENT";
      impact.description = "Vous avez laissé la perte dépasser votre plan. Peut indiquer une perte de contrôle.";
      severity = "CRITICAL";
    } else if (rule.name === "Timing de Marché") {
      impact.psychologicalFactor = "IMPATIENCE / DESPERADO";
      impact.description = "Vous avez tradé en dehors des heures optimales. Impatience ou tentative de compenser.";
      severity = "MEDIUM";
    } else if (rule.name === "Risk:Reward Ratio") {
      impact.psychologicalFactor = "POOR ENTRY LOGIC";
      impact.description = "Ratio RR insuffisant. Vous acceptez trop peu de gain pour le risque pris.";
      severity = "MEDIUM";
    }

    if (impact.psychologicalFactor) {
      impacts.push(impact);
    }
  });

  return {
    hasPsychologicalIssues: impacts.length > 0,
    severity,
    factors: impacts,
    recommendation: generatePsychologicalRecommendation(impacts, trade),
  };
}

function generatePsychologicalRecommendation(impacts, trade) {
  if (impacts.length === 0) {
    return "✓ Aucun problème psychologique détecté. Continuez cette discipline.";
  }

  let recommendation = "Actions recommandées:\n";

  const factors = impacts.map(i => i.psychologicalFactor);
  
  if (factors.includes("REVENGE TRADING")) {
    recommendation += "• Attendre 30 min après une perte avant le prochain trade\n";
  }
  if (factors.includes("FOMO (Fear Of Missing Out)")) {
    recommendation += "• Maintenir une position sizing FIXE, peu importe les résultats précédents\n";
  }
  if (factors.includes("OVERCONFIDENCE / FEAR")) {
    recommendation += "• Utiliser une position taille définie à l'avance, modifiée seulement selon le plan\n";
  }
  if (factors.includes("IMPATIENCE / DESPERADO")) {
    recommendation += "• Respecter strictement vos heures de trading optimales\n";
  }

  return recommendation;
}

function generateComparativeAnalysis(validatedTrades) {
  // Compare trades to find patterns
  const highDisciplineScore = validatedTrades.filter(t => t.disciplineScore >= 8);
  const lowDisciplineScore = validatedTrades.filter(t => t.disciplineScore <= 4);

  const avgPnLHighDiscipline = highDisciplineScore.length > 0 ?
    highDisciplineScore.reduce((s, t) => s + t.pnl, 0) / highDisciplineScore.length :
    0;

  const avgPnLLowDiscipline = lowDisciplineScore.length > 0 ?
    lowDisciplineScore.reduce((s, t) => s + t.pnl, 0) / lowDisciplineScore.length :
    0;

  const winRateHighDiscipline = highDisciplineScore.length > 0 ?
    (highDisciplineScore.filter(t => t.pnl > 0).length / highDisciplineScore.length * 100).toFixed(1) :
    "N/A";

  const winRateLowDiscipline = lowDisciplineScore.length > 0 ?
    (lowDisciplineScore.filter(t => t.pnl > 0).length / lowDisciplineScore.length * 100).toFixed(1) :
    "N/A";

  return {
    highdisciplineTradesCount: highDisciplineScore.length,
    lowDisciplineTradesCount: lowDisciplineScore.length,
    disciplineComparison: {
      highDiscipline: {
        avgPnL: avgPnLHighDiscipline.toFixed(2),
        winRate: `${winRateHighDiscipline}%`,
        trades: highDisciplineScore.length,
      },
      lowDiscipline: {
        avgPnL: avgPnLLowDiscipline.toFixed(2),
        winRate: `${winRateLowDiscipline}%`,
        trades: lowDisciplineScore.length,
      },
    },
    keyInsight: generateKeyInsight(avgPnLHighDiscipline, avgPnLLowDiscipline),
  };
}

function generateKeyInsight(avgHigh, avgLow) {
  if (avgHigh > avgLow + 50) {
    return `🔑 INSIGHT: Trades avec haute discipline rapportent en moyenne $${(avgHigh - avgLow).toFixed(2)} de plus. La discipline PAIE.`;
  } else if (avgLow > avgHigh + 50) {
    return `⚠️ INSIGHT: Trades avec basse discipline rapportent paradoxalement plus. À investiguer - possible survivorship bias.`;
  } else {
    return `📊 INSIGHT: Peu de différence entre discipline haute et basse. Stratégie doit être révisée.`;
  }
}

function calculateDisciplineTrend(validatedTrades) {
  if (validatedTrades.length < 3) return "INSUFFICIENT_DATA";

  const recent = validatedTrades.slice(-5);
  const avgRecentDiscipline = recent.reduce((s, t) => s + t.disciplineScore, 0) / recent.length;
  
  const previous = validatedTrades.slice(Math.max(0, validatedTrades.length - 10), validatedTrades.length - 5);
  const avgPreviousDiscipline = previous.length > 0 ?
    previous.reduce((s, t) => s + t.disciplineScore, 0) / previous.length :
    avgRecentDiscipline;

  const trend = avgRecentDiscipline - avgPreviousDiscipline;

  if (trend > 1) return "📈 IMPROVING";
  if (trend < -1) return "📉 DECLINING";
  return "➡️ STABLE";
}

function getTimeDifference(date1, date2) {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 999;
    return Math.abs((d2 - d1) / (1000 * 60)); // minutes
  } catch (e) {
    return 999;
  }
}
