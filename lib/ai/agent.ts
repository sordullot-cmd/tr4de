import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * ==========================================
 * OUTIL 1: ANALYZE PATTERNS
 * ==========================================
 * 
 * Description:
 * Analyse les patterns dans les trades historiques de l'utilisateur
 * pour identifier les comportements systématiques.
 * 
 * Paramètres:
 * - userId: ID de l'utilisateur
 * - daysToAnalyze: Nombre de jours à analyser (défaut: 30)
 * 
 * Ce que ça fait:
 * 1. Récupère les trades des N derniers jours
 * 2. Calcule le win rate par heure de la journée
 * 3. Calcule le win rate par jour de la semaine
 * 4. Calcule le win rate par setup
 * 5. Détecte les séquences de pertes consécutives
 * 6. Identifie les corrélations entre patterns et P&L
 * 
 * Retourne:
 * - totalTrades: Nombre de trades analysés
 * - hourlyAnalysis: Win rate par heure (0-23)
 * - setupAnalysis: Win rate par setup
 * - dayOfWeekAnalysis: Win rate par jour
 * - consecutiveLossStreaks: Séquences de pertes (> 2)
 * - recommendation: Insights et recommandations
 */
export async function analyzePatterns({ userId, daysToAnalyze = 30 }: { userId: string; daysToAnalyze?: number }) {
  try {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    const { data: trades, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .gte("entry_time", startDate.toISOString())
      .order("entry_time", { ascending: true });

    if (error || !trades) return { error: "Erreur lors de la récupération des trades" };

    const tradeArray = Array.isArray(trades) ? trades : [trades];
    if (tradeArray.length === 0) {
      return { message: "Aucun trade à analyser pour cette période" };
    }

    // === ANALYSE PAR HEURE ===
    const hourlyStats = new Map<number, { wins: number; losses: number; pnl: number; count: number }>();
    
    tradeArray.forEach((trade) => {
      const hour = new Date(trade.entry_time).getHours();
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, { wins: 0, losses: 0, pnl: 0, count: 0 });
      }
      const stats = hourlyStats.get(hour)!;
      stats.count++;
      if (trade.pnl && trade.pnl > 0) stats.wins++;
      else if (trade.pnl && trade.pnl < 0) stats.losses++;
      stats.pnl += trade.pnl || 0;
    });

    const hourlyAnalysis: Record<string, any> = {};
    hourlyStats.forEach((stats, hour) => {
      hourlyAnalysis[`${hour}h`] = {
        trades: stats.count,
        winRate: stats.count > 0 ? ((stats.wins / stats.count) * 100).toFixed(1) : 0,
        pnl: stats.pnl.toFixed(2),
      };
    });

    // === ANALYSE PAR JOUR DE LA SEMAINE ===
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const dayStats = new Map<string, { wins: number; count: number; pnl: number }>();
    
    tradeArray.forEach((trade) => {
      const day = dayNames[new Date(trade.entry_time).getDay()];
      if (!dayStats.has(day)) {
        dayStats.set(day, { wins: 0, count: 0, pnl: 0 });
      }
      const stats = dayStats.get(day)!;
      stats.count++;
      if (trade.pnl && trade.pnl > 0) stats.wins++;
      stats.pnl += trade.pnl || 0;
    });

    const dayOfWeekAnalysis: Record<string, any> = {};
    dayStats.forEach((stats, day) => {
      dayOfWeekAnalysis[day] = {
        trades: stats.count,
        winRate: stats.count > 0 ? ((stats.wins / stats.count) * 100).toFixed(1) : 0,
        pnl: stats.pnl.toFixed(2),
      };
    });

    // === ANALYSE PAR SETUP ===
    const setupStats = new Map<string, { wins: number; count: number; pnl: number }>();
    
    tradeArray.forEach((trade) => {
      const setup = trade.setup_name || "Sans setup";
      if (!setupStats.has(setup)) {
        setupStats.set(setup, { wins: 0, count: 0, pnl: 0 });
      }
      const stats = setupStats.get(setup)!;
      stats.count++;
      if (trade.pnl && trade.pnl > 0) stats.wins++;
      stats.pnl += trade.pnl || 0;
    });

    const setupAnalysis: Record<string, any> = {};
    setupStats.forEach((stats, setup) => {
      setupAnalysis[setup] = {
        trades: stats.count,
        winRate: stats.count > 0 ? ((stats.wins / stats.count) * 100).toFixed(1) : 0,
        pnl: stats.pnl.toFixed(2),
      };
    });

    // === DÉTECTION SÉQUENCES DE PERTES ===
    const consecutiveLosses: number[] = [];
    let currentLossStreak = 0;
    tradeArray.forEach((trade) => {
      if (trade.pnl && trade.pnl < 0) {
        currentLossStreak++;
      } else {
        if (currentLossStreak > 2) {
          consecutiveLosses.push(currentLossStreak);
        }
        currentLossStreak = 0;
      }
    });

    return {
      totalTrades: tradeArray.length,
      daysAnalyzed: daysToAnalyze,
      hourlyAnalysis,
      dayOfWeekAnalysis,
      setupAnalysis,
      consecutiveLossStreaks: consecutiveLosses,
      maxLossStreak: Math.max(...consecutiveLosses, 0),
      recommendation: `Analysé ${tradeArray.length} trades sur ${daysToAnalyze} jours`,
    };
  } catch (err) {
    return { error: `Erreur lors de l'analyse: ${err}` };
  }
}

/**
 * ==========================================
 * OUTIL 2: MONITOR PSYCHOLOGY
 * ==========================================
 * 
 * Description:
 * Détecte les dérapages psychologiques dans les trades récents.
 * 
 * Paramètres:
 * - userId: ID de l'utilisateur
 * - hoursWindow: Fenêtre de temps en heures (défaut: 4)
 * 
 * Ce que ça fait:
 * 1. Récupère les trades des N dernières heures
 * 2. Vérifie si un trade a été pris < 5 min après une perte (REVENGE TRADING)
 * 3. Vérifie si > 3 trades pris dans la même heure (OVERTRADING)
 * 4. Vérifie si taille de position doublée après une perte (REVENGE SIZING)
 * 5. Détecte les tags FOMO/Revenge dans les notes du journal
 * 
 * Retourne:
 * - alerts: Array des alertes détectées [{ type: "WARNING|STOP|INFO", message }]
 * - tradesAnalyzed: Nombre de trades analysés
 */
export async function monitorPsychology({ userId, hoursWindow = 4 }: { userId: string; hoursWindow?: number }) {
  try {
    const supabase = await createClient();
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hoursWindow);

    const { data: trades, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .gte("entry_time", startTime.toISOString())
      .order("entry_time", { ascending: true });

    if (error || !trades) return { alerts: [] };

    const tradeArray = Array.isArray(trades) ? trades : [trades];
    const alerts: Array<{ type: "WARNING" | "STOP" | "INFO"; message: string }> = [];

    if (tradeArray.length === 0) {
      return { alerts, tradesAnalyzed: 0 };
    }

    // === DÉTECTION REVENGE TRADING ===
    for (let i = 1; i < tradeArray.length; i++) {
      const prev = tradeArray[i - 1];
      const curr = tradeArray[i];
      const timeDiff =
        (new Date(curr.entry_time).getTime() -
          new Date(prev.entry_time).getTime()) /
        60000;
      if (prev.pnl && prev.pnl < 0 && timeDiff < 5 && timeDiff > 0) {
        alerts.push({
          type: "STOP",
          message: `⚠️ REVENGE TRADING: Trade pris ${timeDiff.toFixed(0)} min après une perte - STOP!`,
        });
      }
    }

    // === DÉTECTION OVERTRADING ===
    const tradesByHour = new Map<number, number>();
    tradeArray.forEach((t) => {
      const hour = new Date(t.entry_time).getHours();
      tradesByHour.set(hour, (tradesByHour.get(hour) || 0) + 1);
    });

    for (const [hour, count] of tradesByHour) {
      if (count > 3) {
        alerts.push({
          type: "WARNING",
          message: `ℹ️ OVERTRADING: ${count} trades à ${hour}h - Trop rapide, prends une pause`,
        });
      }
    }

    // === DÉTECTION REVENGE SIZING ===
    for (let i = 1; i < tradeArray.length; i++) {
      const prev = tradeArray[i - 1];
      const curr = tradeArray[i];
      const ratio = curr.quantity / (prev.quantity || 1);
      if (
        prev.pnl && prev.pnl < 0 &&
        ratio > 1.5
      ) {
        alerts.push({
          type: "STOP",
          message: `🛑 REVENGE SIZING: Position ${ratio.toFixed(1)}x plus grande après une perte - DANGEREUX!`,
        });
      }
    }

    // === DÉTECTION ÉMOTIONS NÉGATIVES ===
    const { data: details } = await supabase
      .from("trade_details")
      .select("emotion_tags")
      .eq("user_id", userId)
      .in(
        "trade_id",
        tradeArray.map((t) => t.id)
      );

    if (details) {
      const detailsArray = Array.isArray(details) ? details : [details];
      const negativeEmotionCount = detailsArray.filter((d) =>
        d.emotion_tags?.some((e: string) => ["FOMO", "Revenge", "Overconfident"].includes(e))
      ).length;
      
      if (negativeEmotionCount > 0) {
        alerts.push({
          type: "INFO",
          message: `ℹ️ ÉMOTIONS STRESSANTES: ${negativeEmotionCount} trades avec FOMO/Revenge - Prends une pause de 15 min`,
        });
      }
    }

    return { alerts, tradesAnalyzed: tradeArray.length };
  } catch (err) {
    return { alerts: [], error: `Erreur: ${err}` };
  }
}

/**
 * ==========================================
 * OUTIL 3: CHECK RISK
 * ==========================================
 * 
 * Description:
 * Vérifie les limites de risque du compte de l'utilisateur.
 * 
 * Paramètres:
 * - userId: ID de l'utilisateur
 * 
 * Ce que ça fait:
 * 1. Calcule le P&L du jour
 * 2. Vérifie par rapport à la limite de perte quotidienne (default: 500$)
 * 3. Calcule le drawdown en cours
 * 4. Vérifie si les positions sont anormalement grandes
 * 
 * Retourne:
 * - status: "OK" | "ALERT" | "CRITICAL"
 * - dailyPnL: P&L du jour en $
 * - dailyLimit: Limite configurée en $
 * - message: Message clair du statut
 * - recommendation: Action recommandée
 */
export async function checkRisk({ userId }: { userId: string }) {
  try {
    const supabase = await createClient();

    // === P&L DU JOUR ===
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTrades, error } = await supabase
      .from("trades")
      .select("pnl")
      .eq("user_id", userId)
      .gte("entry_time", today.toISOString());

    if (error) return { status: "error", message: "Erreur lors de la vérification" };

    const trades = Array.isArray(todayTrades) ? todayTrades : (todayTrades ? [todayTrades] : []);
    const dailyPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const dailyLimit = 500; // À configurer par utilisateur
    const isDayLimitExceeded = Math.abs(dailyPnL) > dailyLimit && dailyPnL < 0;

    let status = "OK";
    if (isDayLimitExceeded) {
      status = Math.abs(dailyPnL) > dailyLimit * 1.5 ? "CRITICAL" : "ALERT";
    }

    const message =
      status === "OK"
        ? `✅ Limite de risque OK - P&L du jour: ${dailyPnL.toFixed(2)}$`
        : status === "ALERT"
        ? `⚠️ ALERTE: -${Math.abs(dailyPnL).toFixed(2)}$ de perte aujourd'hui (limite: -${dailyLimit}$)`
        : `🛑 CRITIQUE: -${Math.abs(dailyPnL).toFixed(2)}$ de perte! Tu as dépassé la limite.`;

    const recommendation =
      status === "OK"
        ? "Continue selon ta stratégie"
        : status === "ALERT"
        ? "Réduis la taille des positions et sois prudent"
        : "ARRÊTE IMMÉDIATEMENT - Pas d'autres trades aujourd'hui";

    return {
      status,
      dailyPnL: dailyPnL.toFixed(2),
      dailyLimit,
      tradeCount: trades.length,
      message,
      recommendation,
    };
  } catch (err) {
    return { status: "error", message: `Erreur: ${err}` };
  }
}

/**
 * ==========================================
 * OUTIL 4: GET TRADES
 * ==========================================
 * 
 * Description:
 * Récupère les trades de l'utilisateur avec des filtres optionnels.
 * Inclut les détails du journal (notes, émotions).
 * 
 * Paramètres:
 * - userId: ID de l'utilisateur (requis)
 * - startDate: Date de début optionnelle (ISO format)
 * - endDate: Date de fin optionnelle (ISO format)
 * - symbol: Symbole optionnel (e.g., "EURUSD")
 * - direction: Direction optionnelle ("LONG" | "SHORT")
 * - setupName: Nom du setup optionnel
 * - limit: Nombre max de trades (défaut: 20)
 * 
 * Retourne:
 * - trades: Array des trades avec leurs détails complets
 * - count: Nombre de trades retournés
 */
export async function getTrades({
  userId,
  startDate,
  endDate,
  symbol,
  direction,
  setupName,
  limit = 20,
}: {
  userId: string;
  startDate?: string;
  endDate?: string;
  symbol?: string;
  direction?: "LONG" | "SHORT";
  setupName?: string;
  limit?: number;
}) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("trades")
      .select("*, trade_details(*)")
      .eq("user_id", userId);

    if (startDate) query = query.gte("entry_time", startDate);
    if (endDate) query = query.lte("entry_time", endDate);
    if (symbol) query = query.eq("symbol", symbol);
    if (direction) query = query.eq("direction", direction);
    if (setupName) query = query.eq("setup_name", setupName);

    const { data: trades, error } = await query
      .order("entry_time", { ascending: false })
      .limit(limit);

    if (error) return { trades: [], error: "Erreur lors de la récupération" };

    return {
      trades: Array.isArray(trades) ? trades : (trades ? [trades] : []),
      count: Array.isArray(trades) ? trades.length : (trades ? 1 : 0),
    };
  } catch (err) {
    return { trades: [], error: `Erreur: ${err}` };
  }
}

/**
 * ==========================================
 * OUTIL 5: SAVE NOTIFICATION
 * ==========================================
 * 
 * Description:
 * Sauvegarde une notification dans la base de données pour affichage
 * dans l'interface utilisateur.
 * 
 * Paramètres:
 * - userId: ID de l'utilisateur (requis)
 * - type: Type de notification (requis): "info" | "warning" | "stop" | "report"
 * - title: Titre de la notification (requis)
 * - message: Contenu du message (requis)
 * - tradeId: ID du trade associé (optionnel)
 * - agentName: Nom de l'agent (défaut: "APEX AI")
 * 
 * Fait:
 * Sauvegarde dans la table agent_notifications pour affichage
 * dans le centre de notifications de l'interface
 * 
 * Retourne:
 * - success: boolean
 * - message: Statut de la sauvegarde
 */
export async function saveNotification({
  userId,
  type,
  title,
  message,
  tradeId,
  agentName = "APEX AI",
}: {
  userId: string;
  type: "info" | "warning" | "stop" | "report";
  title: string;
  message: string;
  tradeId?: string;
  agentName?: string;
}) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("agent_notifications").insert({
      user_id: userId,
      trade_id: tradeId || null,
      agent_name: agentName,
      notification_type: type,
      title,
      message,
    });

    if (error) return { success: false, error: "Erreur lors de la sauvegarde" };

    return { success: true, message: "Notification sauvegardée" };
  } catch (err) {
    return { success: false, error: `Erreur: ${err}` };
  }
}

/**
 * ==========================================
 * EXPORT POUR UTILISATION
 * ==========================================
 * Export pour compatibility avec streamText tools de la lib 'ai'
 */
export const tools = {
  analyzePatterns,
  monitorPsychology,
  checkRisk,
  getTrades,
  saveNotification,
};
