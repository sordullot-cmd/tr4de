/**
 * Trade AI Chat API
 * Enhanced conversational AI agent for trading analysis
 */

export async function POST(request) {
  try {
    const { message, trades, analysis, conversationHistory = [] } = await request.json();

    if (!message || !trades || !Array.isArray(trades)) {
      return Response.json({ 
        error: "Message et trades requis" 
      }, { status: 400 });
    }

    // Build context from conversation history and current state
    const context = buildContext(trades, analysis, conversationHistory);
    
    // Generate intelligent response based on context
    const response = generateIntelligentResponse(message, trades, analysis, context, conversationHistory);

    return Response.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json({ 
      response: `⚠️ Je n'ai pas pu traiter votre demande: ${error.message}` 
    }, { status: 500 });
  }
}

function buildContext(trades, analysis, history) {
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const winRate = ((wins.length / (wins.length + losses.length || 1)) * 100).toFixed(1);
  const profitFactor = (avgWin * wins.length) / (Math.abs(avgLoss) * losses.length || 1);

  // Topics already discussed
  const discussedTopics = history.map(msg => msg.content.toLowerCase()).join(" ");

  return {
    totalTrades: trades.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate: parseFloat(winRate),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    totalPnL: parseFloat(totalPnL.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    bestSymbol: getBestSymbol(wins),
    worstSymbol: getWorstSymbol(losses),
    bestHour: getBestHour(trades),
    worstHour: getWorstHour(trades),
    discussedTopics,
  };
}

function generateIntelligentResponse(message, trades, analysis, context, history) {
  const msg = message.toLowerCase();
  
  // Context-aware responses
  const questions = [
    {
      keywords: ["pattern", "gagnant", "win", "réussi", "successful"],
      handler: () => generateWinningAnalysis(context, trades),
    },
    {
      keywords: ["pertes", "loss", "perdu", "mauvais", "bad", "pourquoi"],
      handler: () => generateLosingAnalysis(context, trades),
    },
    {
      keywords: ["horaire", "heure", "time", "moment", "quand"],
      handler: () => generateTimeAnalysis(context, trades),
    },
    {
      keywords: ["contrat", "symbol", "produit", "market"],
      handler: () => generateSymbolAnalysis(context, trades),
    },
    {
      keywords: ["améliorer", "improve", "mieux", "better", "conseil"],
      handler: () => generateAdvice(context, trades, history),
    },
    {
      keywords: ["long", "buy", "achat", "haussier"],
      handler: () => generateDirectionAnalysis(context, trades, "long"),
    },
    {
      keywords: ["short", "sell", "vente", "baissier"],
      handler: () => generateDirectionAnalysis(context, trades, "short"),
    },
    {
      keywords: ["risque", "risk", "stop", "loss", "exposition"],
      handler: () => generateRiskAdvice(context, trades),
    },
    {
      keywords: ["ratio", "reward", "rapport", "gain"],
      handler: () => generateRatioAnalysis(context),
    },
    {
      keywords: ["statistique", "stat", "résumé", "summary", "overview"],
      handler: () => generateOverview(context),
    },
  ];

  // Find matching question type
  for (const q of questions) {
    if (q.keywords.some(k => msg.includes(k))) {
      return q.handler();
    }
  }

  // Fallback: intelligent creative response
  return generateCreativeResponse(message, context, history);
}

function generateWinningAnalysis(context, trades) {
  if (context.winCount === 0) {
    return "❌ Vous n'avez pas encore de trades gagnants. Continuez vos analyses et étudiez ce qui fonctionne.";
  }

  const wins = trades.filter(t => t.pnl > 0);
  const symbols = {};
  const times = {};
  
  wins.forEach(t => {
    symbols[t.symbol] = (symbols[t.symbol] || 0) + 1;
    const hour = new Date(t.date).getHours();
    times[hour] = (times[hour] || 0) + 1;
  });

  const topSymbol = Object.entries(symbols).sort((a, b) => b[1] - a[1])[0];
  const topTime = Object.entries(times).sort((a, b) => b[1] - a[1])[0];

  return `✅ Excellent! Vos ${context.winCount} trades gagnants révèlent un pattern clair:\n\n📍 Votre meilleur contrat: **${topSymbol[0]}** (${topSymbol[1]} gains)\n⏰ Votre meilleur horaire: **${topTime[0]}h** (${topTime[1]} réussites)\n💰 Gain moyen par victoire: **$${context.avgWin}**\n\n🎯 Stratégie recommandée:\nFocalisez vos trades sur ${topSymbol[0]} autour de ${topTime[0]}h. C'est là que vous êtes le plus performant.`;
}

function generateLosingAnalysis(context, trades) {
  if (context.lossCount === 0) {
    return "🌟 Félicitations! Zéro perte détectée. C'est un excellent contrôle des risques!";
  }

  const losses = trades.filter(t => t.pnl < 0);
  const symbols = {};
  
  losses.forEach(t => {
    symbols[t.symbol] = (symbols[t.symbol] || 0) + 1;
  });

  const worstSymbol = Object.entries(symbols).sort((a, b) => b[1] - a[1])[0];

  return `📊 Analyse des ${context.lossCount} trades perdants:\n\n🔴 Contrat problématique: **${worstSymbol[0]}** (${worstSymbol[1]} pertes)\n💸 Perte moyenne: **$${context.avgLoss}** par trade\n📈 Win Rate: **${context.winRate}%**\n\n⚠️ Actions prioritaires:\n1. Évitez temporairement ${worstSymbol[0]} ou réduisez votre position\n2. Analysez vos points d'entrée - sont-ils trop proches du resistance?\n3. Serrez votre stop-loss à 50% de votre niveau actuel\n4. Revérifiez vos conditions de trading avant d'entrer`;
}

function generateTimeAnalysis(context, trades) {
  const hours = {};
  const hourPnLs = {};
  
  trades.forEach(t => {
    const hour = new Date(t.date).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
    hourPnLs[hour] = (hourPnLs[hour] || 0) + t.pnl;
  });

  const sorted = Object.entries(hourPnLs)
    .map(([h, pnl]) => ({ hour: h, pnl, count: hours[h] }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 3);

  const worst = Object.entries(hourPnLs)
    .map(([h, pnl]) => ({ hour: h, pnl, count: hours[h] }))
    .sort((a, b) => a.pnl - b.pnl)[0];

  return `⏰ Analyse temporelle de votre trading:\n\n🟢 Vos 3 meilleures heures:\n${sorted.map((s, i) => `${i+1}. ${s.hour}h: +$${s.pnl.toFixed(2)} (${s.count} trades)`).join('\n')}\n\n🔴 À éviter: ${worst.hour}h (${worst.count} trades, $${worst.pnl.toFixed(2)})\n\n💡 Notre conseil: Concentrez-vous sur les heures ${sorted.map(s => s.hour).join(", ")}h et restez en dehors pendant ${worst.hour}h.`;
}

function generateSymbolAnalysis(context, trades) {
  const symbols = {};
  
  trades.forEach(t => {
    if (!symbols[t.symbol]) symbols[t.symbol] = { pnl: 0, count: 0, wins: 0, losses: 0 };
    symbols[t.symbol].pnl += t.pnl;
    symbols[t.symbol].count++;
    if (t.pnl > 0) symbols[t.symbol].wins++;
    else symbols[t.symbol].losses++;
  });

  const sorted = Object.entries(symbols)
    .map(([sym, data]) => ({ symbol: sym, ...data }))
    .sort((a, b) => b.pnl - a.pnl);

  return `📊 Performance par contrat:\n\n${sorted.map(s => `${s.pnl >= 0 ? '🟢' : '🔴'} **${s.symbol}**: $${s.pnl.toFixed(2)} (${s.wins}W/${s.losses}L sur ${s.count} trades)`).join('\n')}\n\n💡 Conseil: Concentrez-vous sur ${sorted[0].symbol} qui vous rapporte le plus.`;
}

function generateAdvice(context, trades, history) {
  const advice = [];

  if (context.winRate < 50) {
    advice.push("🎯 Premier point: Votre taux de victoire est inférieur à 50%. Travaillez sur la qualité plutôt que la quantité des trades.");
  }

  if (context.profitFactor < 1.5) {
    advice.push("📈 Améliorez votre ratio gain/perte. Visez à gagner 2x vos pertes.");
  }

  if (context.avgWin < context.avgLoss) {
    advice.push("⚠️ Vos gains moyens sont plus petits que vos pertes. Réversez votre stratégie de sortie.");
  }

  advice.push(`\n✅ Actions concrètes:\n1. Documentez chaque trade (raison d'entrée, conditions du marché)\n2. Revoyez vos 5 meilleures trades et vos 5 pires\n3. Identifiez le pattern commun des gagnants\n4. Appliquez ce pattern exclusivement`);

  return advice.join("\n");
}

function generateDirectionAnalysis(context, trades, direction) {
  const filtered = trades.filter(t => t.direction === direction);
  if (filtered.length === 0) return `Vous n'avez pas encore de trades ${direction}.`;

  const pnl = filtered.reduce((s, t) => s + t.pnl, 0);
  const winCount = filtered.filter(t => t.pnl > 0).length;

  return `📊 Performance en ${direction}:\n\nTotal: ${filtered.length} trades\nGains: $${pnl.toFixed(2)}\nWin Rate: ${((winCount/filtered.length)*100).toFixed(1)}%\nGain moyen: $${(pnl/filtered.length).toFixed(2)}\n\n${pnl > 0 ? "✅ Vous êtes meilleur en " + direction : "❌ Privilégiez la direction opposée"}`;
}

function generateRiskAdvice(context, trades) {
  return `💼 Gestion du risque:\n\n📊 Statistiques actuelles:\n• Perte maximale: $${context.avgLoss}\n• Ratio profit/perte: ${context.profitFactor.toFixed(2)}\n• Volatilité: ${context.winRate}% stable\n\n✅ Recommandations:\n1. Risquez max 2% par trade\n2. Visez un ratio 1:3 (risquer $100 pour gagner $300)\n3. Augmentez vos stops à break-even après 50% de gain`;
}

function generateRatioAnalysis(context) {
  return `📈 Analyse du Ratio Reward/Risk:\n\nGain moyen: $${context.avgWin}\nPerte moyenne: $${context.avgLoss}\nRatio R/R: ${(context.avgWin / context.avgLoss).toFixed(2)}\n\n${context.avgWin / context.avgLoss > 2 ? "✅ Excellent ratio!" : "⚠️ À améliorer - Visez 2:1 minimum"}`;
}

function generateOverview(context) {
  return `📈 Vue d'ensemble:\n\nTotal trades: ${context.totalTrades}\nWin Rate: ${context.winRate}%\nProfit Factor: ${context.profitFactor.toFixed(2)}\nSolde: $${context.totalPnL}\n\nMeilleur: ${context.bestSymbol} (${context.bestHour}h)\nPire: ${context.worstSymbol} (${context.worstHour}h)`;
}

function generateCreativeResponse(message, context, history) {
  const responses = [
    `Intéressant! Votre ${context.winRate}% de taux de réussite me montre que vous avez une base solide. Comment puis-je vous aider davantage sur ce sujet?`,
    `J'analyse votre question par rapport à vos ${context.totalTrades} trades. Avez-vous remarqué un pattern spécifique?`,
    `Basé sur votre performance, je dirais que ${context.bestSymbol} est votre meilleur allié. Voulez-vous que je creuse plus?`,
    `Votre avg de $${context.avgWin} par victoire est encourageant. Quelle partie voulez-vous améliorer?`,
  ];
  
  const random = responses[Math.floor(Math.random() * responses.length)];
  return random + `\n\nDites-moi ce qui vous intéresse:\n• Améliorer vos gains\n• Réduire vos pertes\n• Optimiser vos horaires\n• Analyser un contrat spécifique`;
}

function getBestSymbol(trades) {
  const symbols = {};
  trades.forEach(t => {
    symbols[t.symbol] = (symbols[t.symbol] || 0) + 1;
  });
  return Object.entries(symbols).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
}

function getWorstSymbol(trades) {
  const symbols = {};
  trades.forEach(t => {
    symbols[t.symbol] = (symbols[t.symbol] || 0) + 1;
  });
  return Object.entries(symbols).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
}

function getBestHour(trades) {
  const hours = {};
  const pnls = {};
  trades.forEach(t => {
    const hour = new Date(t.date).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
    pnls[hour] = (pnls[hour] || 0) + t.pnl;
  });
  const best = Object.entries(pnls).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : "N/A";
}

function getWorstHour(trades) {
  const pnls = {};
  trades.forEach(t => {
    const hour = new Date(t.date).getHours();
    pnls[hour] = (pnls[hour] || 0) + t.pnl;
  });
  const worst = Object.entries(pnls).sort((a, b) => a[1] - b[1])[0];
  return worst ? worst[0] : "N/A";
}
