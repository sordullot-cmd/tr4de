/**
 * Fonctions pures pour construire les prompts spécialisés
 * Pas de dépendances serveur - utilisable en Client Component
 */

/**
 * Prompt spécialisé pour l'analyse post-trade
 * Analyse rapide d'un trade spécifique en 4 lignes max
 */
export function buildPostTradeAnalysisPrompt(
  trade: any,
  notes: string = "",
  emotions: string[] = []
): string {
  return `🎯 ANALYSE POST-TRADE — BE IA
═════════════════════════════════════════

Analyse ce trade en 4 lignes max.

Trade : ${trade.symbol} ${trade.direction} | Setup: ${trade.setup_name} | P&L: ${trade.pnl > 0 ? "+" : ""}${trade.pnl}$ | R:R: ${trade.risk_reward_ratio}
Notes du trader : ${notes || "Aucune"}
Émotions taguées : ${emotions.length > 0 ? emotions.join(", ") : "Aucune"}

Dis-lui :
1️⃣ Si ce trade respectait son plan
2️⃣ L'erreur principale si il y en a une
3️⃣ Ce qu'il aurait dû faire différemment
4️⃣ Score /10 avec justification en 5 mots

Format strict:
[VERDICT] Ta décision
Erreur: [si applicable]
Alternative: [si applicable]
Score: [X]/10 — [5 mots max]`;
}

/**
 * Prompt spécialisé pour le rapport de session
 * Format strict et brutal
 */
export function buildSessionReportPrompt(date: string, trades: any[]): string {
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winners = trades.filter((t) => t.pnl > 0).length;
  const losers = trades.filter((t) => t.pnl < 0).length;

  const tradesSummary = trades
    .map((t) => `${t.symbol} ${t.direction} | ${t.setup_name} | P&L: ${t.pnl > 0 ? "+" : ""}${t.pnl}$`)
    .join("\n");

  return `📊 RAPPORT DE SESSION — BE IA
═════════════════════════════════════════

Génère le rapport de session du ${date}.
Sois brutal mais juste.

Trades du jour: ${trades.length} (${winners}W / ${losers}L)
P&L Total: ${totalPnL > 0 ? "+" : ""}${totalPnL}$

Détails:
${tradesSummary}

Structure obligatoire:

RÉSUMÉ EN 1 PHRASE
━━━━━━━━━━━━━━━━
✅ CE QUI A MARCHÉ (max 2 points)
❌ CE QUI A ÉCHOUÉ (max 2 points)
🧠 PATTERN DÉTECTÉ (1 seul, le plus important)
→ FOCUS DEMAIN (1 seule chose, pas plus)

Pas de paragraphes. Que des bullets courts.`;
}

/**
 * Prompt spécialisé pour la détection de revenge trading
 * Analyse automatique d'une séquence de trades
 */
export function buildRevengeDetectionPrompt(trades: any[]): string {
  const tradeSequence = trades
    .map((t, i) => {
      const timeSinceLast =
        i > 0
          ? Math.round(
              (new Date(t.entry_time).getTime() - new Date(trades[i - 1].entry_time).getTime()) /
                60000
            )
          : null;
      const prevPnL = i > 0 ? trades[i - 1].pnl : null;
      return `${i + 1}. ${t.symbol} ${t.direction} | Setup: ${t.setup_name} | P&L: ${t.pnl > 0 ? "+" : ""}${t.pnl}$ | Size: ${t.quantity} | ${timeSinceLast ? `${timeSinceLast}min après trade` : "premier trade"} ${prevPnL && prevPnL < 0 ? "(après une PERTE)" : ""}`;
    })
    .join("\n");

  return `⚠️ DÉTECTION REVENGE TRADING — BE IA
═════════════════════════════════════════

Analyse la séquence de trades suivante.

Cherche:
• Trades pris < 5 min après une perte
• Augmentation de taille après une perte
• Même setup répété après un échec
• Agressivité croissante dans la séquence

Séquence:
${tradeSequence}

Si détecté → [WARNING] immédiat avec:
- Ligne exacte du problème
- Impact financier
- Action immédiate recommandée

Si non → confirme brièvement que la session est disciplinée.`;
}

/**
 * Prompt spécialisé pour la revue hebdomadaire
 * Format complet avec analyse détaillée
 */
export function buildWeeklyReviewPrompt(dateRange: string, stats: any): string {
  const totalPnL = stats.totalPnL || 0;
  const winRate = stats.winRate || 0;
  const profitTrades = stats.trades.filter((t: any) => t.pnl > 0).length;
  const lossTrades = stats.trades.filter((t: any) => t.pnl < 0).length;

  const topTrades = stats.trades
    .sort((a: any, b: any) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 5)
    .map((t: any) => `${t.symbol} ${t.setup_name}: ${t.pnl > 0 ? "+" : ""}${t.pnl}$`)
    .join("\n");

  return `📅 REVUE HEBDOMADAIRE — BE IA
═════════════════════════════════════════

Revue complète de la semaine ${dateRange}.

DONNÉES :
• Trades: ${stats.totalTrades} (${profitTrades}W / ${lossTrades}L)
• P&L: ${totalPnL > 0 ? "+" : ""}${totalPnL}$
• Win Rate: ${winRate.toFixed(1)}%
• Best Setup: ${stats.bestSetup || "N/A"}
• Worst Setup: ${stats.worstSetup || "N/A"}

Top Trades:
${topTrades}

Format obligatoire:


CHIFFRES DE LA SEMAINE

P&L Total: ${totalPnL > 0 ? "+" : ""}${totalPnL}$
Trades: ${stats.totalTrades} (${profitTrades} W / ${lossTrades} L)
Win Rate: ${winRate.toFixed(1)}%


LES 3 VÉRITÉS

1️⃣ [Première vérité chiffrée]
2️⃣ [Deuxième vérité chiffrée]
3️⃣ [Troisième vérité chiffrée]


PSYCHOLOGIE

[Analyse émotionnelle basée sur les données]


SETUPS — CLASSEMENT

🟢 MEILLEUR: ${stats.bestSetup || "N/A"}
🔴 PIRE: ${stats.worstSetup || "N/A"}


MEILLEURS CRÉNEAUX

[À déduire des données de temps]


PLAN SEMAINE PROCHAINE

→ [1 seul changement à implémenter]


VERDICT FINAL

[CLASSIFICATION — 1 phrase sans filtre]`;
}
