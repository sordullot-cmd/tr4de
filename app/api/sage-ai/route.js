export async function POST(req) {
  try {
    const { question, trades } = await req.json();

    if (!trades || trades.length === 0) {
      return Response.json({
        answer: "Aucun trade trouvé. Importe d'abord tes trades pour que je puisse les analyser.",
        confidence: 0,
        timestamp: new Date(),
      });
    }

    // Analyser les trades
    const analysis = analyzeTradesData(trades);

    // Construire le contexte pour le raisonnement
    const systemPrompt = buildSystemPrompt(analysis);

    // Générer la réponse basée sur les données
    const answer = generateAnswer(question, analysis, systemPrompt);

    return Response.json({
      answer,
      confidence: 0.85,
      timestamp: new Date(),
      analysis: {
        totalTrades: analysis.totalTrades,
        winRate: analysis.winRate.toFixed(2),
        profitFactor: analysis.profitFactor.toFixed(2),
      },
    });
  } catch (error) {
    console.error("SAGE AI Error:", error);
    return Response.json(
      { error: "Une erreur s'est produite." },
      { status: 500 }
    );
  }
}

/**
 * Analyser les données des trades
 */
function analyzeTradesData(trades) {
  const winners = trades.filter(t => t.pnl > 0);
  const losers = trades.filter(t => t.pnl < 0);

  const totalWins = winners.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = losers.reduce((sum, t) => sum + t.pnl, 0);
  const totalPnL = totalWins + totalLosses;

  // Par symbole
  const bySymbol = {};
  trades.forEach(t => {
    if (!bySymbol[t.symbol]) {
      bySymbol[t.symbol] = { trades: [], pnl: 0, wins: 0, losses: 0 };
    }
    bySymbol[t.symbol].trades.push(t);
    bySymbol[t.symbol].pnl += t.pnl;
    if (t.pnl > 0) bySymbol[t.symbol].wins++;
    else if (t.pnl < 0) bySymbol[t.symbol].losses++;
  });

  // Par jour de la semaine
  const byDayOfWeek = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
  trades.forEach(t => {
    const day = new Date(t.date).getDay();
    if (!byDayOfWeek[day].trades) {
      byDayOfWeek[day].trades = [];
      byDayOfWeek[day].pnl = 0;
      byDayOfWeek[day].wins = 0;
    }
    byDayOfWeek[day].trades.push(t);
    byDayOfWeek[day].pnl += t.pnl;
    if (t.pnl > 0) byDayOfWeek[day].wins++;
  });

  // Par heure
  const byHour = {};
  trades.forEach(t => {
    try {
      const hour = parseInt(t.entryTime?.split(':')[0] || new Date(t.date).getHours());
      if (!byHour[hour]) byHour[hour] = { trades: [], pnl: 0, wins: 0 };
      byHour[hour].trades.push(t);
      byHour[hour].pnl += t.pnl;
      if (t.pnl > 0) byHour[hour].wins++;
    } catch (e) {}
  });

  return {
    totalTrades: trades.length,
    winRate: (winners.length / trades.length) * 100,
    avgWin: winners.length ? totalWins / winners.length : 0,
    avgLoss: losers.length ? totalLosses / losers.length : 0,
    profitFactor: Math.abs(totalWins / (totalLosses || 1)),
    totalPnL,
    bySymbol: Object.entries(bySymbol)
      .map(([symbol, data]) => ({
        symbol,
        count: data.trades.length,
        winRate: (data.wins / data.trades.length) * 100,
        pnl: data.pnl,
      }))
      .sort((a, b) => b.pnl - a.pnl),
    byDayOfWeek: byDayOfWeek,
    byHour: byHour,
  };
}

/**
 * Construire le prompt système pour le contexte
 */
function buildSystemPrompt(analysis) {
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  const topSymbols = analysis.bySymbol.slice(0, 3);
  const worstDays = Object.entries(analysis.byDayOfWeek)
    .filter(([_, data]) => data.trades)
    .sort((a, b) => (b[1].pnl || 0) - (a[1].pnl || 0))
    .slice(0, 3);

  return `Tu es SAGE AI, un expert en trading et psychologie des traders. Tu analyses les données réelles du trader et fournis des insights personnalisés et actionnables.

DONNÉES DU TRADER:
- Total trades: ${analysis.totalTrades}
- Win rate: ${analysis.winRate.toFixed(1)}%
- Avg win: $${analysis.avgWin.toFixed(2)}
- Avg loss: $${analysis.avgLoss.toFixed(2)}
- Profit factor: ${analysis.profitFactor.toFixed(2)}
- Total P&L: $${analysis.totalPnL.toFixed(2)}

TOP 3 SYMBOLES:
${topSymbols.map(s => `- ${s.symbol}: ${s.count} trades, ${s.winRate.toFixed(1)}% win rate, $${s.pnl.toFixed(2)} P&L`).join('\n')}

PATTERNS IMPORTANTS:
${worstDays.map(([day, data]) => `- ${dayNames[day]}: ${data.trades?.length} trades, ${((data.wins / (data.trades?.length || 1)) * 100).toFixed(1)}% win rate, $${(data.pnl || 0).toFixed(2)} P&L`).join('\n')}

DIRECTIVES:
1. Sois spécifique avec les données réelles du trader
2. Identifie les patterns (meilleurs/pires jours, symboles, heures)
3. Donne des recommandations concrètes et actionnables
4. Mentionne l'impact psychologique quand pertinent
5. Réponds en français
6. Sois direct: "Tu fais X, ce qui cause Y, je te recommande Z"`;
}

/**
 * Générer la réponse basée sur les données et la question
 */
function generateAnswer(question, analysis, systemPrompt) {
  const questionLower = question.toLowerCase();

  // Déterminer le contexte
  let context = "general";
  if (questionLower.includes("pourquoi") && questionLower.includes("perd")) {
    context = "losses";
  } else if (questionLower.includes("meilleur") || questionLower.includes("rentable")) {
    context = "best_symbol";
  } else if (questionLower.includes("vendredi") || questionLower.includes("jour") || questionLower.includes("lundi")) {
    context = "day_analysis";
  } else if (questionLower.includes("heure") || questionLower.includes("moment")) {
    context = "time_analysis";
  }

  // Générer la réponse adaptée au contexte
  let answer = "";

  switch (context) {
    case "losses":
      answer = generateLossesAnalysis(analysis);
      break;
    case "best_symbol":
      answer = generateBestSymbolAnalysis(analysis);
      break;
    case "day_analysis":
      answer = generateDayAnalysis(analysis, question);
      break;
    case "time_analysis":
      answer = generateTimeAnalysis(analysis);
      break;
    default:
      answer = generateGeneralAnalysis(analysis);
  }

  return answer;
}

/**
 * Analyser les pertes
 */
function generateLossesAnalysis(analysis) {
  if (analysis.winRate > 60) {
    return `✅ Tu as un excellent win rate de ${analysis.winRate.toFixed(1)}%! 

Tes pertes viennent principalement de:
1. **Taille de position** - Tes losses moyennes ($${Math.abs(analysis.avgLoss).toFixed(2)}) sont proches de tes wins ($${analysis.avgWin.toFixed(2)}). C'est bon!
2. **Les mauvais jours** - Identifié jour/setup où tu perds plus
3. **Gestion des risques** - Assure-toi que chaque trade a stop défini

Recommandation: Continue ce setup, pérf déjà très bonne!`;
  }

  const losersCount = analysis.totalTrades * (1 - analysis.winRate / 100);
  const worstSymbol = analysis.bySymbol[analysis.bySymbol.length - 1];

  return `⚠️ Tu as ${analysis.winRate.toFixed(1)}% win rate. Voici comment améliorer:

🔴 PRINCIPALES CAUSES DE PERTES:
1. **Ratio de risque** - Avg loss ($${Math.abs(analysis.avgLoss).toFixed(2)}) vs Avg win ($${analysis.avgWin.toFixed(2)})
   → Implication: Pour chaque win, tu dois gagner ${(analysis.avgWin / Math.abs(analysis.avgLoss)).toFixed(2)}x le montant risqué
   → Action: Élargis tes targets ou resserre tes stops

2. **Symboles problématiques** - "${worstSymbol.symbol}" a ${worstSymbol.winRate.toFixed(1)}% win rate
   → Action: Évite-le ou entraîne-toi plus sur ce symbole

3. **Nombre de trades perdants** - ${Math.round(losersCount)} pertes sur ${analysis.totalTrades} trades
   → Action: Ajoute un filtre supplémentaire avant d'entrer

💡 PROCHAINE ÉTAPE:
Analyse tes 5 meilleures trades pour identifier ce que tu faisais de différent!`;
}

/**
 * Analyser le meilleur symbole
 */
function generateBestSymbolAnalysis(analysis) {
  const best = analysis.bySymbol[0];
  const others = analysis.bySymbol.slice(1, 3);

  return `🏆 TON SETUP LE PLUS RENTABLE:

**${best.symbol}** - ${best.count} trades
• Win rate: ${best.winRate.toFixed(1)}%
• P&L total: $${best.pnl.toFixed(2)}
• Moyenne par trade: $${(best.pnl / best.count).toFixed(2)}

📊 COMPARAISON:
${others.map(s => `- ${s.symbol}: ${s.winRate.toFixed(1)}% win rate (${best.winRate - s.winRate > 0 ? '+' : ''}${(best.winRate - s.winRate).toFixed(1)}% mieux)`).join('\n')}

💡 CE QUI MARCHE SUR ${best.symbol}:
1. Continue à tracker exactement ce que tu fais sur ${best.symbol}
2. Essaie d'appliquer la même logique aux autres symboles
3. Augmente légèrement ta position sur ${best.symbol} puisque c'est reproductible

🎯 RECOMMANDATION:
Concentre-toi sur ${best.symbol}, ignore les autres pour maintenant. Deviens expert du champion!`;
}

/**
 * Analyser par jour
 */
function generateDayAnalysis(analysis, question) {
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const dayStats = Object.entries(analysis.byDayOfWeek)
    .filter(([_, data]) => data.trades)
    .map(([day, data]) => ({
      name: dayNames[day],
      trades: data.trades?.length || 0,
      wins: data.wins || 0,
      pnl: data.pnl || 0,
      winRate: ((data.wins || 0) / (data.trades?.length || 1)) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const best = dayStats[0];
  const worst = dayStats[dayStats.length - 1];

  return `📅 ANALYSE PAR JOUR DE LA SEMAINE:

🏆 MEILLEUR JOUR: ${best.name}
• ${best.trades} trades
• Win rate: ${best.winRate.toFixed(1)}%
• P&L: $${best.pnl.toFixed(2)}

🔴 PIRE JOUR: ${worst.name}
• ${worst.trades} trades
• Win rate: ${worst.winRate.toFixed(1)}%
• P&L: $${worst.pnl.toFixed(2)}
• Différence: ${(best.winRate - worst.winRate).toFixed(1)}% de win rate

🎯 PATTERNS DÉTECTÉS:
${dayStats.map(d => `• ${d.name}: ${d.winRate.toFixed(0)}% win rate (${d.trades} trades)`).join('\n')}

💡 RECOMMANDATIONS:
1. **Réduis ta taille le ${worst.name}** - Ton psychologie est différente ce jour
2. **Maximise le ${best.name}** - C'est ta meilleure journée
3. **Analyse pourquoi** - Émotions? Volatilité? Fatigue?

Veux-tu que j'approfondisse les raisons?`;
}

/**
 * Analyser par heure
 */
function generateTimeAnalysis(analysis) {
  const hourStats = Object.entries(analysis.byHour)
    .filter(([_, data]) => data.trades && data.trades.length > 0)
    .map(([hour, data]) => ({
      hour: `${hour}:00 - ${hour}:59`,
      trades: data.trades.length,
      wins: data.wins,
      pnl: data.pnl,
      winRate: (data.wins / data.trades.length) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const best = hourStats[0];
  const worst = hourStats[hourStats.length - 1];

  return `⏰ ANALYSE PAR HEURE:

🏆 MEILLEURE HEURE: ${best.hour}
• ${best.trades} trades, ${best.winRate.toFixed(1)}% win rate
• P&L: $${best.pnl.toFixed(2)}

🔴 PIRE HEURE: ${worst.hour}
• ${worst.trades} trades, ${worst.winRate.toFixed(1)}% win rate
• P&L: $${worst.pnl.toFixed(2)}

💡 STRATÉGIE RECOMMANDÉE:
1. **Gold hours**: ${best.hour} - Maximise ta position ici
2. **Avoid**: ${worst.hour} - Réduis ta taille ou n'échange pas
3. **Pattern**: ta volatilité varie par heure, adapte ta taille de position`;
}

/**
 * Analyse générale
 */
function generateGeneralAnalysis(analysis) {
  const best = analysis.bySymbol[0];

  return `📊 RÉSUMÉ DE TON TRADING:

✅ KPIs:
• Win rate: ${analysis.winRate.toFixed(1)}%
• Profit factor: ${analysis.profitFactor.toFixed(2)}x
• Total P&L: $${analysis.totalPnL.toFixed(2)}
• ${analysis.totalTrades} trades analysés

🏆 TON MEILLEUR SYMBOLE: ${best.symbol}
→ Focus sur ce symbole pour améliorer la constance

🎯 MES QUESTIONS POUR TOI:
1. Pourquoi tu perds le ${Object.entries(analysis.byDayOfWeek).sort((a, b) => (b[1].pnl || 0) - (a[1].pnl || 0))[1]?.[0] || 'jour'}?
2. Quel est ton setup le plus rentable?
3. À quelle heure tu trades le mieux?
4. Quelles règles tu ignores le plus?

Pose-moi une de ces questions pour l'analyse détaillée!`;
}
