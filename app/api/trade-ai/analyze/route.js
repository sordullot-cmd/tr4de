/**
 * Trade AI Analysis API
 * Provides strategy analysis and recommendations for traders
 */

export async function POST(request) {
  try {
    const { trades } = await request.json();
    
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return Response.json({ 
        error: "Aucun trade à analyser" 
      }, { status: 400 });
    }

    // Calculate basic statistics
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
    const winRate = ((wins.length / trades.length) * 100).toFixed(1);
    const profitFactor = (
      wins.reduce((s, t) => s + t.pnl, 0) / 
      Math.abs(losses.reduce((s, t) => s + t.pnl, 0) || 1)
    ).toFixed(2);

    // Analyze by direction
    const longTrades = trades.filter(t => t.direction === 'Long');
    const shortTrades = trades.filter(t => t.direction === 'Short');
    
    const longWinRate = ((longTrades.filter(t => t.pnl > 0).length / longTrades.length) * 100).toFixed(1) || 0;
    const shortWinRate = ((shortTrades.filter(t => t.pnl > 0).length / shortTrades.length) * 100).toFixed(1) || 0;
    
    const longPnL = longTrades.reduce((s, t) => s + t.pnl, 0);
    const shortPnL = shortTrades.reduce((s, t) => s + t.pnl, 0);

    // Analyze by symbol
    const symbolStats = {};
    trades.forEach(t => {
      if (!symbolStats[t.symbol]) {
        symbolStats[t.symbol] = { count: 0, pnl: 0, wins: 0 };
      }
      symbolStats[t.symbol].count++;
      symbolStats[t.symbol].pnl += t.pnl;
      if (t.pnl > 0) symbolStats[t.symbol].wins++;
    });

    const bestSymbol = Object.entries(symbolStats).reduce((a, b) => 
      b[1].pnl > a[1].pnl ? b : a
    );
    const worstSymbol = Object.entries(symbolStats).reduce((a, b) => 
      b[1].pnl < a[1].pnl ? b : a
    );

    // Analyze by time
    const pnlByHour = {};
    trades.forEach(t => {
      try {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          const hour = d.getHours();
          if (!pnlByHour[hour]) pnlByHour[hour] = { pnl: 0, count: 0 };
          pnlByHour[hour].pnl += t.pnl;
          pnlByHour[hour].count++;
        }
      } catch (e) {}
    });

    const bestHour = Object.entries(pnlByHour).reduce((a, b) => 
      b[1].pnl > a[1].pnl ? b : a, ["0", { pnl: 0 }]
    );

    // Generate insights
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    // Build strengths
    if (winRate >= 50) {
      strengths.push(`Excellent taux de réussite de ${winRate}% - Vous prenez les bons trades`);
    }
    if (winRate >= 40 && winRate < 50) {
      strengths.push(`Bon taux de réussite de ${winRate}% - Continuez à affiner votre stratégie`);
    }
    if (profitFactor > 1.5) {
      strengths.push(`Profit factor excellent de ${profitFactor} - Vos gains sont bien supérieurs à vos pertes`);
    }
    if (longWinRate > shortWinRate && longTrades.length > 0) {
      strengths.push(`Vous êtes meilleur en LONGS avec un taux de ${longWinRate}%`);
    }
    if (shortWinRate > longWinRate && shortTrades.length > 0) {
      strengths.push(`Vous êtes meilleur en SHORTS avec un taux de ${shortWinRate}%`);
    }
    if (bestSymbol[1].pnl > 0) {
      strengths.push(`${bestSymbol[0]} est votre meilleur contrat avec ${bestSymbol[1].wins}/${bestSymbol[1].count} trades gagnants`);
    }

    // Build weaknesses
    if (winRate < 40) {
      weaknesses.push(`Taux de réussite bas de ${winRate}% - Revoyez vos critères d'entrée`);
    }
    if (profitFactor < 1.2) {
      weaknesses.push(`Profit factor faible de ${profitFactor} - Vos pertes sont trop grandes`);
    }
    if (worstSymbol[1].pnl < 0 && worstSymbol[1].count >= 3) {
      weaknesses.push(`${worstSymbol[0]} génère des pertes - Évitez ce contrat ou ajustez votre stratégie`);
    }
    if (losses.length > wins.length) {
      const avgWin = wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
      const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length);
      if (avgWin < avgLoss) {
        weaknesses.push(`Vos pertes moyennes (${avgLoss.toFixed(2)}) sont plus grandes que vos gains (${avgWin.toFixed(2)})`);
      }
    }

    // Build recommendations
    if (longPnL > shortPnL) {
      recommendations.push(`Privilégiez les LONGS qui vous rapportent $${longPnL.toFixed(2)} vs $${shortPnL.toFixed(2)} en shorts`);
    } else if (shortPnL > longPnL) {
      recommendations.push(`Privilégiez les SHORTS qui vous rapportent $${shortPnL.toFixed(2)} vs $${longPnL.toFixed(2)} en longs`);
    }

    if (bestHour[0] !== "0") {
      recommendations.push(`Votre meilleur horaire est ${bestHour[0]}h - Concentrez-vous à ce moment`);
    }

    if (profitFactor < 1.5 && losses.length > 0) {
      recommendations.push(`Implémentez un stop-loss serré pour réduire l'impact des mauvais trades`);
    }

    if (trades.length < 20) {
      recommendations.push(`Vous avez ${trades.length} trades - Continuez à trader pour avoir plus de données et valider votre stratégie`);
    }

    // Summary
    const summary = `Vous avez ${trades.length} trades avec un taux de réussite de ${winRate}%. Votre P&L total est de $${totalPnL.toFixed(2)} avec un profit factor de ${profitFactor}.`;

    return Response.json({
      summary,
      stats: {
        totalTrades: trades.length,
        winRate,
        profitFactor,
        totalPnL,
        wins: wins.length,
        losses: losses.length,
        longWinRate,
        shortWinRate,
        bestSymbol: bestSymbol[0],
        bestSymbolPnL: bestSymbol[1].pnl,
      },
      strengths: strengths.length > 0 ? strengths : ["Continuez votre entraînement"],
      weaknesses: weaknesses.length > 0 ? weaknesses : ["Aucune faiblesse majeure détectée"],
      recommendations: recommendations.length > 0 ? recommendations : ["Maintenir votre approche actuelle"],
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
