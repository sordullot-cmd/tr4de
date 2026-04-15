/**
 * Trade IA Coach API
 * Senior Risk Manager & Performance Trading Coach
 * Analyzes technical and behavioral flaws in trading execution
 */

export async function POST(request) {
  try {
    const { trades } = await request.json();

    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return Response.json({
        error: "Aucun trade à analyser",
      }, { status: 400 });
    }

    // Calculate all metrics
    const analysis = performCoachAnalysis(trades);

    return Response.json(analysis);
  } catch (error) {
    console.error("Coach analysis error:", error);
    return Response.json({
      error: error.message,
    }, { status: 500 });
  }
}

function performCoachAnalysis(trades) {
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = ((wins.length / trades.length) * 100).toFixed(1);
  const profitFactor = (
    wins.reduce((s, t) => s + t.pnl, 0) / 
    Math.abs(losses.reduce((s, t) => s + t.pnl, 0) || 1)
  ).toFixed(2);

  // 1. RISK MANAGEMENT ANALYSIS
  const riskAnalysis = analyzeRiskManagement(trades);

  // 2. BEHAVIORAL BIAS DETECTION
  const behaviorAnalysis = detectBehavioralBiases(trades);

  // 3. AUTOLIQ ANALYSIS
  const autoLiqAnalysis = analyzeAutoLiquidation(trades);

  // 4. MATHEMATICAL OPTIMIZATION
  const mathOptimization = analyzeRiskRewardOptimization(trades);

  // 5. STRENGTHS & WEAKNESSES
  const { strengths, weaknesses } = identifyStrengthsWeaknesses(
    trades, wins, losses, riskAnalysis, behaviorAnalysis
  );

  // 6. ACCOUNT KILLER
  const accountKiller = identifyAccountKiller(trades, behaviorAnalysis);

  // 7. CONCRETE ACTION
  const concreteAction = generateConcreteAction(
    trades, accountKiller, riskAnalysis, behaviorAnalysis
  );

  return {
    diagnosticFlash: {
      strengths,
      weaknesses,
    },
    accountKiller,
    concreteAction,
    detailedAnalysis: {
      riskManagement: riskAnalysis,
      behavioralBiases: behaviorAnalysis,
      autoLiquidation: autoLiqAnalysis,
      mathOptimization: mathOptimization,
    },
    summary: {
      totalTrades: trades.length,
      winRate: `${winRate}%`,
      profitFactor,
      totalPnL: `$${totalPnL.toFixed(2)}`,
    },
  };
}

function analyzeRiskManagement(trades) {
  const quantities = trades.map(t => t.qty);
  const avgQty = quantities.reduce((a, b) => a + b, 0) / quantities.length;
  const maxQty = Math.max(...quantities);
  const minQty = Math.min(...quantities);
  
  const isConsistent = quantities.every(q => Math.abs(q - avgQty) <= avgQty * 0.2);
  
  // Check for over-leverage patterns
  const overleveredTrades = trades.filter(t => t.qty > avgQty * 1.5);
  const overleveredAfterLosses = overleveredTrades.filter((t, idx) => {
    if (idx === 0) return false;
    return trades[idx - 1]?.pnl < 0;
  });

  // Calculate exposure consistency
  let exposureBreaches = 0;
  for (let i = 0; i < trades.length; i++) {
    if (trades[i].qty > avgQty * 1.5) {
      exposureBreaches++;
    }
  }

  return {
    isConsistent,
    avgQty: avgQty.toFixed(2),
    maxQty,
    minQty,
    qtyVariance: ((maxQty / minQty - 1) * 100).toFixed(1),
    overleveredTrades: overleveredTrades.length,
    overleveredAfterLosses: overleveredAfterLosses.length,
    exposureBreaches,
    verdict: isConsistent ? "✅ CONFORME" : "⚠️ INCONSISTENT - Risk management issue detected",
  };
}

function detectBehavioralBiases(trades) {
  const biases = {
    revengeTrades: [],
    fomorTrades: [],
    prematureExits: [],
    chainedLosses: [],
  };

  // 1. Revenge Trading: Quick trades after losses
  for (let i = 1; i < trades.length; i++) {
    if (trades[i - 1].pnl < 0) {
      const timeDiff = getTimeDifference(trades[i - 1].date, trades[i].date);
      
      if (timeDiff < 15) { // Less than 15 minutes apart
        biases.revengeTrades.push({
          afterLoss: trades[i - 1].pnl,
          revenge: {
            ...trades[i],
            pnl: trades[i].pnl,
          },
          timeDiff: `${timeDiff} min`,
          severity: timeDiff < 5 ? "CRITICAL" : "HIGH",
        });
      }
    }
  }

  // 2. FOMO: Larger size after wins, trying to capitalize
  for (let i = 1; i < trades.length; i++) {
    if (trades[i - 1].pnl > 0 && trades[i].qty > trades[i - 1].qty * 1.3) {
      biases.fomorTrades.push({
        afterWin: trades[i - 1].pnl,
        fomo: {
          ...trades[i],
          qtyIncrease: ((trades[i].qty / trades[i - 1].qty - 1) * 100).toFixed(1),
        },
      });
    }
  }

  // 3. Premature Exits: Taking profits too early
  const wins = trades.filter(t => t.pnl > 0);
  const avgWin = wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
  biases.prematureExits = wins.filter(w => w.pnl < avgWin * 0.5).length;

  // 4. Chained Losses: Multiple sequential losses
  let currentChain = 0;
  let maxChain = 0;
  let chainCount = 0;

  trades.forEach((t, idx) => {
    if (t.pnl < 0) {
      currentChain++;
      maxChain = Math.max(maxChain, currentChain);
    } else {
      if (currentChain >= 3) {
        biases.chainedLosses.push({
          size: currentChain,
          totalPnL: trades
            .slice(idx - currentChain, idx)
            .reduce((s, tr) => s + tr.pnl, 0),
        });
        chainCount++;
      }
      currentChain = 0;
    }
  });

  const hasMajorBiases = 
    biases.revengeTrades.length > 0 || 
    biases.fomorTrades.length > 0 || 
    biases.chainedLosses.length > 0;

  return {
    hasBehavioralIssues: hasMajorBiases,
    revengeTradingInstances: biases.revengeTrades.length,
    revengeTrades: biases.revengeTrades,
    fomorInstances: biases.fomorTrades.length,
    fomorTrades: biases.fomorTrades,
    prematureExits: biases.prematureExits,
    chainedLosses: biases.chainedLosses,
    maxLossChain: maxChain,
    verdict: hasMajorBiases ? 
      "🚨 BEHAVIORAL ISSUES DETECTED - Emotional trading patterns found" :
      "✅ DISCIPLINED - Good emotional control detected",
  };
}

function analyzeAutoLiquidation(trades) {
  const autoLiqTrades = trades.filter(t => 
    t.broker === 'tradovate' && 
    (t.text?.toLowerCase?.().includes('autoliq') || t.notes?.toLowerCase?.().includes('autoliq'))
  );

  if (autoLiqTrades.length === 0) {
    return {
      instances: 0,
      verdict: "✅ NO AUTOLIQ - Account protection working correctly",
      explanation: "No automatic liquidations detected.",
    };
  }

  const totalAutoLiqPnL = autoLiqTrades.reduce((s, t) => s + t.pnl, 0);
  const drawdownLevel = Math.abs(totalAutoLiqPnL);

  return {
    instances: autoLiqTrades.length,
    totalPnL: totalAutoLiqPnL,
    trades: autoLiqTrades,
    verdict: "🚨 CRITICAL - Account liquidation triggered",
    explanation: `Your account was closed due to reaching maximum loss threshold. This indicates:
      1. Position sizing was too aggressive
      2. Risk management rules were not followed
      3. A losing streak exceeded your account's tolerance
      
      IMPACT: Lost $${Math.abs(totalAutoLiqPnL).toFixed(2)} due to forced liquidation.`,
    preventionStrategy: `
      1. Implement daily loss limit: If you lose 2% of account in a day, STOP TRADING
      2. Reduce position size by 50% after 3 consecutive losses
      3. Set maximum single trade loss: Never risk more than 1% per trade
      4. Monitor equity drawdown in real-time`,
  };
}

function analyzeRiskRewardOptimization(trades) {
  // Calculate current actual RR ratio
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);

  if (wins.length === 0 || losses.length === 0) {
    return {
      currentRR: "N/A",
      optimization: "Insufficient data for RR optimization",
    };
  }

  const avgWin = wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
  const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length);
  const currentRR = (avgWin / avgLoss).toFixed(2);

  // Simulate 1:2 RR strategy
  const simulated1to2PnL = trades.map(t => {
    if (t.pnl > 0) {
      // Take profit was at avgWin, so simulate 2x risk
      const riskAmount = t.pnl / 2;
      return riskAmount * 2; // 1:2 ratio means 2x the risk
    } else {
      // Losses stay the same (1x risk)
      return t.pnl;
    }
  }).reduce((s, pnl) => s + pnl, 0);

  const actualPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const improvement = simulated1to2PnL - actualPnL;
  const improvementPercent = ((improvement / Math.abs(actualPnL)) * 100).toFixed(1);

  return {
    currentRR,
    currentAvgWin: avgWin.toFixed(2),
    currentAvgLoss: avgLoss.toFixed(2),
    actualPnL: actualPnL.toFixed(2),
    simulated1to2PnL: simulated1to2PnL.toFixed(2),
    potentialImprovement: improvement.toFixed(2),
    improvementPercent: `${improvementPercent}%`,
    recommendation: currentRR < 1.5 ? 
      "⚠️ Your RR is below optimal. Implement 1:2 RR minimum." :
      currentRR > 2 ?
      "✅ Excellent RR ratio. Maintain current exit strategy." :
      "✅ Good RR ratio. Consider tightening entries.",
  };
}

function identifyStrengthsWeaknesses(trades, wins, losses, riskAnalysis, behaviorAnalysis) {
  const strengths = [];
  const weaknesses = [];

  const winRate = ((wins.length / trades.length) * 100).toFixed(1);

  // STRENGTHS
  if (winRate >= 55) {
    strengths.push(`Excellent win rate of ${winRate}% - Your entries are precise`);
  }
  if (riskAnalysis.isConsistent) {
    strengths.push(`Consistent position sizing - Strong risk discipline`);
  }
  if (!behaviorAnalysis.hasBehavioralIssues) {
    strengths.push(`Disciplined execution - No emotional trading patterns detected`);
  }
  if (trades.length >= 50) {
    strengths.push(`Statistical significance - ${trades.length} trades provide reliable data`);
  }

  // WEAKNESSES
  if (winRate < 50) {
    weaknesses.push(`Low win rate of ${winRate}% - Review entry criteria`);
  }
  if (!riskAnalysis.isConsistent) {
    weaknesses.push(`Inconsistent position sizing - Qty variance of ${riskAnalysis.qtyVariance}%`);
  }
  if (behaviorAnalysis.revengeTradingInstances > 0) {
    weaknesses.push(`${behaviorAnalysis.revengeTradingInstances} revenge trades detected - Emotional reaction to losses`);
  }
  if (behaviorAnalysis.chainedLosses.length > 0) {
    weaknesses.push(`Loss chains up to ${behaviorAnalysis.maxLossChain} trades - Need tighter stop-losses`);
  }
  if (behaviorAnalysis.fomorInstances > 0) {
    weaknesses.push(`FOMO behavior detected - Increasing size after wins is dangerous`);
  }

  return { strengths, weaknesses };
}

function identifyAccountKiller(trades, behavioralBiases) {
  const losses = trades.filter(t => t.pnl < 0);
  const biggestLoss = Math.min(...losses.map(t => t.pnl));
  const biggestLoseTrade = losses.find(t => t.pnl === biggestLoss);
  
  const totalRevengeLosses = behavioralBiases.revengeTrades.reduce((s, rt) => 
    s + rt.revenge.pnl, 0
  );

  const avgTradePnL = trades.reduce((s, t) => s + t.pnl, 0) / trades.length;
  const profitPerWin = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / 
                       trades.filter(t => t.pnl > 0).length;

  let killer = {
    issue: "Unknown",
    cost: 0,
    percentage: 0,
  };

  const lossRatio = Math.abs(biggestLoss) / Math.abs(profitPerWin);
  
  if (lossRatio > 3) {
    killer = {
      issue: `Single catastrophic loss - 1 trade wipes out ${lossRatio.toFixed(1)} wins (~$${Math.abs(biggestLoss).toFixed(2)})`,
      cost: biggestLoss,
      percentage: (Math.abs(biggestLoss) / Math.abs(trades.reduce((s, t) => s + t.pnl, 0) || 1) * 100).toFixed(1),
      trade: biggestLoseTrade,
    };
  } else if (totalRevengeLosses < -100) {
    killer = {
      issue: `Revenge trading spiral - Lost $${Math.abs(totalRevengeLosses).toFixed(2)} on revenge trades`,
      cost: totalRevengeLosses,
      percentage: (Math.abs(totalRevengeLosses) / Math.abs(trades.reduce((s, t) => s + t.pnl, 0) || 1) * 100).toFixed(1),
    };
  } else if (behavioralBiases.chainedLosses.length > 0) {
    const worstChain = behavioralBiases.chainedLosses.sort((a, b) => a.totalPnL - b.totalPnL)[0];
    killer = {
      issue: `Loss chain of ${worstChain.size} trades - Lost $${Math.abs(worstChain.totalPnL).toFixed(2)}`,
      cost: worstChain.totalPnL,
      percentage: (Math.abs(worstChain.totalPnL) / Math.abs(trades.reduce((s, t) => s + t.pnl, 0) || 1) * 100).toFixed(1),
    };
  }

  return {
    ...killer,
    fix: `This single issue costs you ${killer.percentage}% of your total P&L. Fix this ONE thing and your profitability increases significantly.`,
  };
}

function generateConcreteAction(trades, accountKiller, riskAnalysis, behavioralAnalysis) {
  let rule = "";
  let priority = "IMMEDIATE";

  if (accountKiller.issue.includes("revenge")) {
    rule = `
ANTI-REVENGE TRADING RULE (Effective immediately):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After ANY LOSS:
1. WAIT 30 minutes before taking the next trade
2. Take a 5-minute walk away from screen
3. Review the losing trade: What went wrong?
4. If still emotional, SKIP the day - Protect capital

This SINGLE RULE will eliminate ${behavioralAnalysis.revengeTradingInstances} revenge trades 
that cost you $${Math.abs(
      behavioralAnalysis.revengeTrades.reduce((s, rt) => s + rt.revenge.pnl, 0)
    ).toFixed(2)}.
    `;
  } else if (accountKiller.issue.includes("catastrophic")) {
    rule = `
HARD STOP-LOSS RULE (Effective tomorrow):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SET HARD STOPS on EVERY trade:
1. Maximum loss per trade = 1% of account
2. Maximum daily losses = 2% of account
3. If daily loss = 2%, STOP trading for the day

NO EXCEPTIONS. NO ADJUSTMENTS.

This prevents a repeat of your $${Math.abs(
      accountKiller.cost
    ).toFixed(2)} loss that wiped out ${accountKiller.percentage}% of your P&L.
    `;
  } else if (!riskAnalysis.isConsistent) {
    rule = `
FIXED POSITION SIZING RULE (Starting tomorrow):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALWAYS trade with qty = ${Math.round(parseFloat(riskAnalysis.avgQty))}
- No more, no less
- Applies to EVERY single trade
- Exception: After 3 losses, reduce to ${Math.round(parseFloat(riskAnalysis.avgQty) * 0.5)}

Your qty variance of ${riskAnalysis.qtyVariance}% indicates undisciplined sizing.
This rule brings consistency and removes emotional sizing.
    `;
  } else {
    rule = `
EXECUTION EXCELLENCE RULE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Keep a trading log: Entry reason, exit logic, bias check
2. Review 5 biggest losses weekly: What pattern repeats?
3. Implement 1:2 Risk:Reward minimum on all entries
4. Back-test any strategy changes on 50 historical trades first

Your discipline is good. Now optimize your execution.
    `;
  }

  return {
    priority,
    rule,
    implementation: `
✅ TOMORROW'S CHECKLIST:
1. Print this rule and put it on your desk
2. Screenshot it and set as phone wallpaper
3. Set phone reminder for pre-market: "Execute the rule"
4. After market close: Did I follow the rule 100%?

🎯 30-DAY CHALLENGE:
Follow this ONE rule for 30 consecutive days without exception.
Your trading will transform.
    `,
  };
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
