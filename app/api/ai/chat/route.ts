import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { 
      messages, 
      userId, 
      trades = [], 
      journalNotes = [],
      strategies = [],
      strategyStats = [],
      dailyNotes = {}
    } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !userId?.startsWith("demo-user-")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 🆕 Construire le contexte enrichi avec toutes les données
    let contextData = "=== CONTEXTE IA ===\n";
    
    // Données de trades
    if (trades && trades.length > 0) {
      contextData += `\n📊 TRADES (${trades.length}):\n`;
      trades.slice(0, 10).forEach((trade: any) => {
        contextData += `  • ${trade.symbol} ${trade.direction} @ ${trade.entry_time.split('T')[0]}: P&L ${trade.pnl > 0 ? '+' : ''}${trade.pnl}$\n`;
      });
    }

    // 🆕 Données de stratégies
    if (strategies && strategies.length > 0) {
      contextData += `\n🎯 STRATÉGIES (${strategies.length}):\n`;
      strategies.forEach((strat: any) => {
        contextData += `  • ${strat.name}: ${strat.description || 'Pas de description'}\n`;
      });
    }

    // 🆕 Stats de stratégies
    if (strategyStats && strategyStats.length > 0) {
      contextData += `\n📈 PERFORMANCE PAR STRATÉGIE:\n`;
      strategyStats.forEach((stat: any) => {
        contextData += `  • ${stat.name}: ${stat.tradeCount} trades, Win Rate ${stat.winRate}%, P&L ${stat.totalPnL}$ (avg: ${stat.avgPnL}$/trade)\n`;
      });
    }

    // 🆕 Notes journalières
    if (dailyNotes && Object.keys(dailyNotes).length > 0) {
      contextData += `\n📅 NOTES JOURNALIÈRES RÉCENTES:\n`;
      Object.entries(dailyNotes)
        .slice(0, 5)
        .forEach(([date, note]: any) => {
          contextData += `  • ${date}: ${typeof note === 'string' ? note.substring(0, 100) : ''}\n`;
        });
    }

    // Notes de trades
    if (journalNotes && journalNotes.length > 0) {
      contextData += `\n📝 NOTES DE TRADES RÉCENTES:\n`;
      journalNotes.slice(0, 5).forEach((note: any) => {
        contextData += `  • Trade ${note.trade_id}: ${note.notes?.substring(0, 80) || 'Pas de note'} [Émotions: ${note.emotion_tags?.join(', ') || 'Aucune'}]\n`;
      });
    }

    let systemPrompt = `Tu es APEX, le coach IA spécialisé en trading pour la plateforme tr4de.

Tu as accès aux données complètes de l'utilisateur:
${contextData}

🎯 TON RÔLE
• Analyser les TRADES et identifier les patterns
• Évaluer la PERFORMANCE par stratégie
• Lire les NOTES JOURNALIÈRES pour comprendre l'état mental du trader
• Donner des INSIGHTS concrets basés sur les données
• Proposer des AMÉLIORATIONS spécifiques
• Détecter les RED FLAGS (revenge trading, overtrading, etc.)

📊 RÈGLES DE FORMATAGE - IMPORTANT
1. Pas de ### ou #### - utilise UNE SEULE # pour les titres majeurs
2. Pas de gras excessif - utilise * TRÈS rarement pour les points clés
3. Utilise des tirets simples • pour les listes, pas de -
4. Ajoute des ESPACEMENTS entre les sections (lignes blanches)
5. Titre + petite intro, puis détails - pas de rappels du titre
6. Maximum 3-4 sections par réponse
7. Les chiffres au format simple: "10 trades" pas "**10** trades"
8. Évite les tableaux - utilise du texte fluide avec des paragraphes courts

💡 STRUCTURE TYPE D'UNE BONNE RÉPONSE
# Titre Principal
Une phrase de contexte courte

Section 1
Description et données

Section 2  
Description et données

Conclusion/Action`;

    const enrichedMessages = [
      { role: "user" as const, content: contextData },
      ...messages,
    ];

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: enrichedMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
