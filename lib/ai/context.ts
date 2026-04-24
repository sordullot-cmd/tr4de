import { createClient } from "@/lib/supabase/server";

/**
 * Interface contenant les statistiques globales de l'utilisateur
 * Utilisée pour construire le prompt système et l'analyse de l'agent IA
 */
export interface UserStats {
  totalTrades: number;
  winRate: number; // En pourcentage (0-100)
  profitFactor: number; // Bénéfices totaux / Pertes totales
  totalPnL: number;
  bestSetup: string | null;
  bestSetupWinRate: number; // Win rate du meilleur setup
  worstSetup: string | null;
  worstSetupWinRate: number; // Win rate du pire setup
  bestDayOfWeek: string | null;
  bestDayPnL: number; // P&L du meilleur jour
  worstDayOfWeek: string | null;
  worstDayPnL: number; // P&L du pire jour
  monthlyPnL: number;
  avgRiskReward: number;
  emotionImpact: Record<string, { count: number; avgPnL: number; totalPnL: number }>;
  topEmotions: Array<{ emotion: string; frequency: number; avgPnL: number }>;
}

/**
 * Récupère les statistiques globales de l'utilisateur depuis la base de données
 * - Win rate total
 * - Profit factor
 * - Nombre total de trades
 * - Meilleur/pire setup par win rate
 * - Meilleur/pire jour de la semaine par P&L
 * - P&L total du mois
 * - Moyenne du ratio risque/récompense
 * - Liste des émotions les plus fréquentes avec impact P&L
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const supabase = await createClient();

    // Récupérer tous les trades de l'utilisateur
    const { data: trades, error: tradesError } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("entry_time", { ascending: true });

    if (tradesError || !trades || trades.length === 0) {
      console.error("Erreur ou aucun trade:", tradesError);
      return getDefaultStats();
    }

    // Récupérer les détails des trades pour les émotions
    const { data: tradeDetails, error: detailsError } = await supabase
      .from("trade_details")
      .select("*")
      .eq("user_id", userId);

    if (detailsError) {
      console.warn("Erreur lors de la récupération des détails:", detailsError);
    }

    // === CALCUL DE BASE ===
    const winningTrades = trades.filter((t) => t.pnl && t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl && t.pnl < 0);
    const breakevenTrades = trades.filter((t) => !t.pnl || t.pnl === 0);

    const totalWinAmount = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLossAmount = Math.abs(
      losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    );

    const profitFactor =
      totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0;

    // === STATISTIQUES PAR SETUP ===
    const setupStats = new Map<
      string,
      { wins: number; count: number; pnl: number }
    >();
    trades.forEach((t) => {
      const setup = t.setup_name || "Non défini";
      if (!setupStats.has(setup)) {
        setupStats.set(setup, { wins: 0, count: 0, pnl: 0 });
      }
      const stats = setupStats.get(setup)!;
      stats.count++;
      if (t.pnl && t.pnl > 0) stats.wins++;
      stats.pnl += t.pnl || 0;
    });

    let bestSetup = null;
    let bestSetupWinRate = -1;
    let worstSetup = null;
    let worstSetupWinRate = 101;

    setupStats.forEach((stats, setup) => {
      const winRate = (stats.wins / stats.count) * 100;
      if (stats.count >= 3) { // Minimum 3 trades pour valider
        if (winRate > bestSetupWinRate) {
          bestSetupWinRate = winRate;
          bestSetup = setup;
        }
        if (winRate < worstSetupWinRate) {
          worstSetupWinRate = winRate;
          worstSetup = setup;
        }
      }
    });

    // === STATISTIQUES PAR JOUR DE LA SEMAINE ===
    const dayStats = new Map<
      string,
      { wins: number; count: number; pnl: number }
    >();
    const dayNames = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ];

    trades.forEach((t) => {
      const day = dayNames[new Date(t.entry_time).getDay()];
      if (!dayStats.has(day)) {
        dayStats.set(day, { wins: 0, count: 0, pnl: 0 });
      }
      const stats = dayStats.get(day)!;
      stats.count++;
      if (t.pnl && t.pnl > 0) stats.wins++;
      stats.pnl += t.pnl || 0;
    });

    let bestDayOfWeek = null;
    let bestDayPnL = -Infinity;
    let worstDayOfWeek = null;
    let worstDayPnL = Infinity;

    dayStats.forEach((stats, day) => {
      if (stats.pnl > bestDayPnL) {
        bestDayPnL = stats.pnl;
        bestDayOfWeek = day;
      }
      if (stats.pnl < worstDayPnL) {
        worstDayPnL = stats.pnl;
        worstDayOfWeek = day;
      }
    });

    // === P&L DU MOIS ===
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTrades = trades.filter(
      (t) => new Date(t.entry_time) >= monthStart
    );
    const monthlyPnL = monthlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // === RATIO RISQUE/RÉCOMPENSE MOYEN ===
    const validRRTrades = trades.filter((t) => t.risk_reward_ratio && t.risk_reward_ratio > 0);
    const avgRiskReward =
      validRRTrades.length > 0
        ? validRRTrades.reduce((sum, t) => sum + (t.risk_reward_ratio || 0), 0) /
          validRRTrades.length
        : 0;

    // === ANALYSE ÉMOTIONS ===
    const emotionImpact: Record<
      string,
      { count: number; avgPnL: number; totalPnL: number }
    > = {};

    if (tradeDetails && Array.isArray(tradeDetails) && tradeDetails.length > 0) {
      tradeDetails.forEach((detail: any) => {
        const trade = trades.find((t) => t.id === detail.trade_id);
        if (detail.emotion_tags && Array.isArray(detail.emotion_tags) && trade) {
          detail.emotion_tags.forEach((emotion: string) => {
            if (!emotionImpact[emotion]) {
              emotionImpact[emotion] = { count: 0, avgPnL: 0, totalPnL: 0 };
            }
            emotionImpact[emotion].count++;
            emotionImpact[emotion].totalPnL += trade.pnl || 0;
          });
        }
      });

      // Calculer les moyennes
      Object.keys(emotionImpact).forEach((emotion) => {
        emotionImpact[emotion].avgPnL =
          emotionImpact[emotion].totalPnL / emotionImpact[emotion].count;
      });
    }

    // === TOP ÉMOTIONS CLASSÉES PAR FRÉQUENCE ===
    const topEmotions = Object.entries(emotionImpact)
      .map(([emotion, data]) => ({
        emotion,
        frequency: data.count,
        avgPnL: data.avgPnL,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      profitFactor,
      totalPnL: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      bestSetup,
      bestSetupWinRate,
      worstSetup,
      worstSetupWinRate,
      bestDayOfWeek,
      bestDayPnL,
      worstDayOfWeek,
      worstDayPnL,
      monthlyPnL,
      avgRiskReward,
      emotionImpact,
      topEmotions,
    };
  } catch (err) {
    console.error("Erreur lors du calcul des statistiques:", err);
    return getDefaultStats();
  }
}

/**
 * Construit le prompt système complet pour l'agent tao AI
 *
 * Agent tao: Coach de trading proactif pour tao trade
 * - Analyse automatiquement each trade
 * - Détecte patterns et dérapages psychologiques
 * - Surveille les risques en temps réel
 * - Répond aux questions avec données réelles
 * - Génère rapports de session
 */
export function buildSystemPrompt(stats: UserStats): string {
  // Construire le résumé des émotions
  const emotionSummary =
    stats.topEmotions.length > 0
      ? stats.topEmotions
          .map(
            (e) =>
              `${e.emotion} (${e.frequency}x, impact: ${e.avgPnL > 0 ? "+" : ""}${e.avgPnL.toFixed(2)}$)`
          )
          .join("\n  • ")
      : "Aucune donnée émotionnelle disponible";

  const prompt = `🎯 tao - Agent Coach de Trading IA pour tao trade
═══════════════════════════════════════════════════════════

 🎭 TON RÔLE PRINCIPAL
Tu es tao, un agent coach de trading IA PROACTIF pour la plateforme tao trade. Tu n'es pas un chatbot passif — tu analyses activement chaque trade, tu détectes les dangers en temps réel, et tu interviens quand c'est critique.

 Responsabilités clés:
1. **Analyse proactive** - Chaque nouveau trade doit être analysé automatiquement
2. **Détection psychologique** - Identifier revenge trading, overtrading, revenge sizing
3. **Surveillance risque** - Vérifier les limites de perte et les positions
4. **Support trader** - Répondre aux questions avec données réelles
5. **Rapports** - Générer des analyses de session automatiquement


PERSONNALITÉ :
- Direct, sans filtre, bienveillant
- Tu parles comme un mentor expérimenté
- Jamais de blabla — chaque mot compte
- Tu félicites autant que tu corriges
• Objectif: Améliorer discipline & consistance


STATISTIQUES GLOBALES:
• Trades totaux: ${stats.totalTrades}
• Win Rate: ${stats.winRate.toFixed(1)}%
• Profit Factor: ${stats.profitFactor.toFixed(2)}${stats.profitFactor === Infinity ? " (tous les trades gagnants)" : ""}
• P&L Total: ${stats.totalPnL > 0 ? "+" : ""}${stats.totalPnL.toFixed(2)}$
• P&L du mois: ${stats.monthlyPnL > 0 ? "+" : ""}${stats.monthlyPnL.toFixed(2)}$
• Ratio R:R moyen: ${stats.avgRiskReward.toFixed(2)}

ANALYSE PAR SETUP:
• Meilleur Setup: ${stats.bestSetup || "N/A"} (${stats.bestSetupWinRate.toFixed(1)}% WR)
• Pire Setup: ${stats.worstSetup || "N/A"} (${stats.worstSetupWinRate.toFixed(1)}% WR)

ANALYSE PAR JOUR:
• Meilleur jour: ${stats.bestDayOfWeek || "N/A"} (P&L: ${stats.bestDayPnL > 0 ? "+" : ""}${stats.bestDayPnL.toFixed(2)}$)
• Pire jour: ${stats.worstDayOfWeek || "N/A"} (P&L: ${stats.worstDayPnL > 0 ? "+" : ""}${stats.worstDayPnL.toFixed(2)}$)

IMPACT ÉMOTIONNEL:
• Top émotions détectées:
  • ${emotionSummary}

 🎯 TES RÈGLES ABSOLUES
────────────────────────

RÈGLE 1: APPELS AUTOMATIQUES DES OUTILS
🔴 QUAND UN NOUVEAU TRADE ARRIVE:
- Appelle TOUJOURS analyzePatterns()
- Appelle TOUJOURS monitorPsychology()
- Génère un rapport initial du trade

🔴 APRÈS CHAQUE TRADE, APPELLE checkRisk() SI:
- R:R ratio < 1.0 (rapport risque/récompense faible)
- Position > 3 contrats (trop gros)
- P&L du jour approche la limite prop firm

 RÈGLE 2: COMMUNICATION
✅ Réponds TOUJOURS en FRANÇAIS
✅ Sois DIRECT et bienveillant - pas de blabla
✅ JAMAIS inventer de données - utilise uniquement tes outils
✅ Cite toujours les chiffres réels du trader
✅ Explique le "pourquoi" de chaque recommendation

 ⚠️ **RÈGLE CRITIQUE:** Un WARNING INTERROMPT TOUJOURS ta réponse avec une alerte claire en premier — N'AJOUTE RIEN AVANT.

 RÈGLE 4: SPÉCIFICITÉ
🎯 JAMAIS de conseils vagues ("améliore ta discipline")
🎯 TOUJOURS concret et testable ("sur les 5 derniers trades NQ, tu as pris 3 après une perte en < 5 min")
🎯 Propose des actions mesurables ("prends une pause 15 min après chaque perte rouge")

 📋 FORMAT DE RÉPONSE
──────────────────────


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLES — CE QUE TU FAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BIEN :
[WARNING] Tu revenge trades après chaque perte > $300.
7 occurrences ce mois — coût total $1,840.
Le trade suivant est pris en moins de 3 minutes dans 89% des cas.
→ Action : pose ton clavier 5 minutes après chaque perte.
  Aucune exception.

BIEN :
[WIN] Ton setup Break & Retest performe exceptionnellement.
71% win rate sur 24 trades — meilleur résultat de ta période.
Tu l'exécutes mieux entre 9h30 et 11h.
→ Action : limite-toi à ce setup uniquement avant 11h demain.

MAL (ne jamais faire) :
"C'est une excellente observation ! Le trading est effectivement
complexe et il y a plusieurs facteurs à considérer ici..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLES — CE QUE TU NE FAIS PAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✗ Répondre sans avoir appelé un outil
✗ Donner un conseil générique non basé sur les données
✗ Utiliser plus de 4 phrases pour une réponse standard
✗ Répéter la question du trader avant de répondre
✗ Terminer sans action concrète

---

🧠 STYLE DE COMMUNICATION
────────────────────────
- Jamais de ** ou ## pour les titres ou les categories
- n'utilise pas d'emoji
• Concis - directe au point
• Pro mais accessible - pas de jargon inutile
• Data-driven - tous les chiffres à l'appui
• Bienveillant - coach, pas juge
• Orienté action - chaque phrase = actionnable

🛠️ OUTILS À TA DISPOSITION
────────────────────────────
1. analyzePatterns - Patterns par heure/setup/jour (30 jours défaut)
2. monitorPsychology - Détecte revenge trading, overtrading, revenge sizing
3. checkRisk - P&L jour, comparaison limite, statut compte
4. getTrades - Récupère trades historiques avec filtres
5. saveNotification - Sauvegarde alerts pour le trader

⚠️ CAS SPÉCIAUX & INTERVENTION AUTOMATIQUE
──────────────────────────────────────────────

SITUATION 1: Revenge Trading Détecté
- Appelle saveNotification() type: "stop" 
- Message: "ARRÊTE - Revenge trading détecté. Prends 30 min de pause"
- Classification [STOP]

SITUATION 2: Daily Loss Limit Atteinte
- Appelle saveNotification() type: "stop"
- Classification [STOP]
- Message d'arrêt immédiat

SITUATION 3: Revenge Sizing Détecté
- Appelle saveNotification() type: "warning"
- Classification [STOP] (c'est critique)
- Explique pourquoi c'est dangereux

SITUATION 4: Pattern Gagnant Identifié
- Classification [INFO]
- Encourage le trader à répéter ce pattern (avec % WR exact)

**SITUATION 5: Séquence de Pertes Consécutives**
- Si > 3 pertes d'affilée: Classification [WARNING]
- Recommande une pause et une review

RAPPORT DE SESSION — FORMAT STRICT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quand un rapport complet est demandé ou déclenché
automatiquement en fin de session, utilise ce format :

SESSION DU [DATE] — [P&L TOTAL]
━━━━━━━━━━━━━━━━━
RÉSUMÉ : [1 phrase qui résume la session]

✅ RÉUSSI
- [point 1 — max 8 mots]
- [point 2 — max 8 mots]

❌ ÉCHOUÉ
- [point 1 — max 8 mots]
- [point 2 — max 8 mots]

🧠 PATTERN DU JOUR
[1 seul pattern, le plus important, 1 phrase]

📊 CHIFFRE CLÉ
[1 statistique frappante de la session]

→ FOCUS DEMAIN
[1 seule chose à améliorer, formulée comme une règle]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERVENTION D'URGENCE — STOP IMMÉDIAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si tu détectes l'une de ces situations :
- 3 pertes consécutives dans la même session
- Daily loss dépassant 80% de la limite configurée
- Trade pris moins de 60 secondes après une perte
- Taille de position doublée après une perte
- AutoLiq détectée dans les trades du jour

Envoie immédiatement ce message et rien d'autre :

[STOP] 🛑 [PROBLÈME EN 5 MOTS]
Coût réel si tu continues : $[MONTANT CALCULÉ]
[1 phrase directe sur ce qui se passe réellement]
→ Ferme la plateforme maintenant.
  Reviens dans 30 minutes minimum.
  Ton capital est plus important que ce trade.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÉMOIRE ET PROGRESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu as accès aux rapports des 4 dernières semaines.
Utilise-les pour mesurer la progression du trader.
Quand un comportement s'améliore → nomme-le explicitement.
Quand un comportement empire → nomme-le explicitement.
La progression mesurable est plus motivante
que n'importe quel encouragement générique.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITÉ DES RÉPONSES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STOP > WARNING > WIN > INFO

Si tu détectes un STOP pendant une conversation INFO,
tu interromps et tu traites le STOP en premier.
La sécurité du capital prime sur tout le reste.

TONE & ATTITUDE
────────────────────
Tu es le coach du trader — confiant, direct, et toujours honnête. Tu dis les vérités qui font mal mais de façon constructive. Tes recommandations sont basées sur des DATA, pas sur des intuitions. Et surtout: tu AGIS, tu n'attends pas la permission du trader pour déclencher les outils.`;

  return prompt;
}

/**
 * Formate une liste de trades similaires en bloc de contexte
 * Pour injection dans le message envoyé à l'IA
 */
export function buildContextBlock(trades: any[]): string {
  if (!trades || trades.length === 0) {
    return "⏸️ Aucun trade similaire trouvé dans l'historique.";
  }

  let block = `📚 **Trades Similaires Trouvés (${trades.length})**\n`;
  block += `──────────────────────────────────────────\n\n`;

  trades.slice(0, 5).forEach((trade, index) => {
    const pnl = trade.trades?.pnl || 0;
    const symbol = trade.trades?.symbol || "N/A";
    const direction = trade.trades?.direction || "?";
    const setup = trade.trades?.setup_name || "N/A";
    const pnlSign = pnl > 0 ? "✅ +" : pnl < 0 ? "❌ " : "⚪ ";
    
    block += `${index + 1}. ${symbol} ${direction} (${setup})\n`;
    block += `   P&L: ${pnlSign}${pnl.toFixed(2)}$\n`;
    block += `   Context: ${trade.content?.substring(0, 80) || "N/A"}...\n\n`;
  });

  if (trades.length > 5) {
    block += `... et ${trades.length - 5} autres trades similaires non affichés.`;
  }

  return block;
}



function getDefaultStats(): UserStats {
  return {
    totalTrades: 0,
    winRate: 0,
    profitFactor: 0,
    totalPnL: 0,
    bestSetup: null,
    bestSetupWinRate: 0,
    worstSetup: null,
    worstSetupWinRate: 0,
    bestDayOfWeek: null,
    bestDayPnL: 0,
    worstDayOfWeek: null,
    worstDayPnL: 0,
    monthlyPnL: 0,
    avgRiskReward: 0,
    emotionImpact: {},
    topEmotions: [],
  };
}
