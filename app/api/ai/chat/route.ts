import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, getUserStats } from "@/lib/ai/context";

export async function POST(request: NextRequest) {
  try {
    const {
      messages,
      userId,
      conversationId: providedConversationId,
      persist = true,
      trades = [],
      journalNotes = [],
      strategies = [],
      strategyStats = [],
      dailyNotes = {},
      accountInfo = null,
      weeklyStats = [],
      monthlyStats = [],
      disciplineSummary = [],
      psychEvents = []
    } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !userId?.startsWith("demo-user-")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // === PERSISTANCE: trouver ou creer la conversation ===
    let conversationId: string | null = null;
    const shouldPersist = persist && !!user;

    if (shouldPersist) {
      if (providedConversationId) {
        const { data: existing } = await supabase
          .from("ai_conversations")
          .select("id")
          .eq("id", providedConversationId)
          .eq("user_id", user!.id)
          .maybeSingle();
        if (existing) conversationId = existing.id;
      }

      if (!conversationId) {
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
        const title = lastUserMsg?.content ? String(lastUserMsg.content).slice(0, 80) : "Nouvelle conversation";
        const { data: created } = await supabase
          .from("ai_conversations")
          .insert({ user_id: user!.id, title })
          .select("id")
          .single();
        if (created) conversationId = created.id;
      }

      // Sauver uniquement le dernier message user (les precedents sont deja en DB)
      const lastMessage = messages[messages.length - 1];
      if (conversationId && lastMessage?.role === "user" && lastMessage?.content) {
        await supabase.from("ai_messages").insert({
          conversation_id: conversationId,
          user_id: user!.id,
          role: "user",
          content: String(lastMessage.content),
        });
      }
    }

    // === CONTEXTE ENRICHI ===
    let contextData = "=== CONTEXTE IA ===\n";

    if (trades && trades.length > 0) {
      contextData += `\n📊 TRADES (${trades.length}):\n`;
      trades.slice(0, 10).forEach((trade: any) => {
        contextData += `  • ${trade.symbol} ${trade.direction} @ ${trade.entry_time.split('T')[0]}: P&L ${trade.pnl > 0 ? '+' : ''}${trade.pnl}$\n`;
      });
    }

    if (strategies && strategies.length > 0) {
      contextData += `\n🎯 STRATÉGIES (${strategies.length}):\n`;
      strategies.forEach((strat: any) => {
        contextData += `  • ${strat.name}: ${strat.description || 'Pas de description'}\n`;
      });
    }

    if (strategyStats && strategyStats.length > 0) {
      contextData += `\n📈 PERFORMANCE PAR STRATÉGIE:\n`;
      strategyStats.forEach((stat: any) => {
        contextData += `  • ${stat.name}: ${stat.tradeCount} trades, Win Rate ${stat.winRate}%, P&L ${stat.totalPnL}$ (avg: ${stat.avgPnL}$/trade)\n`;
      });
    }

    if (dailyNotes && Object.keys(dailyNotes).length > 0) {
      contextData += `\n📅 NOTES JOURNALIÈRES RÉCENTES:\n`;
      Object.entries(dailyNotes)
        .slice(0, 5)
        .forEach(([date, note]: any) => {
          contextData += `  • ${date}: ${typeof note === 'string' ? note.substring(0, 100) : ''}\n`;
        });
    }

    if (journalNotes && journalNotes.length > 0) {
      contextData += `\n📝 NOTES DE TRADES RÉCENTES:\n`;
      journalNotes.slice(0, 5).forEach((note: any) => {
        const emotions = note.emotion_tags?.join(', ') || 'Aucune';
        const errors = note.error_tags?.length ? ` [Erreurs: ${note.error_tags.join(', ')}]` : '';
        contextData += `  • Trade ${note.trade_id}: ${note.notes?.substring(0, 80) || 'Pas de note'} [Émotions: ${emotions}]${errors}\n`;
      });
    }

    if (accountInfo) {
      contextData += `\n💼 COMPTE DE TRADING:\n`;
      contextData += `  • Type: ${accountInfo.type || 'N/A'}${accountInfo.evalSize ? ` (${accountInfo.evalSize})` : ''}\n`;
      contextData += `  • Comptes actifs: ${accountInfo.selectedAccountsCount || 0}/${accountInfo.totalAccountsCount || 0}\n`;
    }

    if (weeklyStats && weeklyStats.length > 0) {
      contextData += `\n📅 STATS HEBDOMADAIRES (semaine du lundi):\n`;
      weeklyStats.slice(0, 6).forEach((w: any) => {
        contextData += `  • ${w.period}: ${w.trades} trades, WR ${w.winRate}%, P&L ${w.pnl}$\n`;
      });
    }

    if (monthlyStats && monthlyStats.length > 0) {
      contextData += `\n🗓️ STATS MENSUELLES:\n`;
      monthlyStats.slice(0, 6).forEach((m: any) => {
        contextData += `  • ${m.period}: ${m.trades} trades, WR ${m.winRate}%, P&L ${m.pnl}$\n`;
      });
    }

    if (disciplineSummary && disciplineSummary.length > 0) {
      contextData += `\n✅ DISCIPLINE (14 derniers jours):\n`;
      disciplineSummary.slice(0, 10).forEach((d: any) => {
        const violated = d.violated?.length ? ` — violé: ${d.violated.join(', ')}` : '';
        contextData += `  • ${d.date}: ${d.respected}/${d.total} règles (${d.score}%)${violated}\n`;
      });
    }

    if (psychEvents && psychEvents.length > 0) {
      contextData += `\n🧠 ÉVÉNEMENTS PSYCHOLOGIQUES DÉTECTÉS:\n`;
      psychEvents.slice(0, 12).forEach((e: any) => {
        const date = e.date ? `${e.date} ` : '';
        contextData += `  • ${date}[${e.type}] ${e.detail}\n`;
      });
    }

    // Stats utilisateur + patterns persistés pour le system prompt
    const effectiveUserId = user?.id || userId;
    const userStats = await getUserStats(effectiveUserId);

    let patternsBlock = "";
    let memoryBlock = "";
    if (user) {
      const { data: patterns } = await supabase
        .from("ai_patterns")
        .select("pattern_type, pattern_data, occurrences, avg_pnl_impact, last_detected_at")
        .eq("user_id", user.id)
        .order("occurrences", { ascending: false })
        .limit(5);

      if (patterns && patterns.length > 0) {
        patternsBlock = "\n\n🧠 PATTERNS PERSONNALISÉS DÉTECTÉS:\n";
        patterns.forEach((p: any) => {
          const impact = p.avg_pnl_impact != null ? ` (impact moyen: ${p.avg_pnl_impact > 0 ? "+" : ""}${Number(p.avg_pnl_impact).toFixed(2)}$)` : "";
          const detail = p.pattern_data?.detail || p.pattern_data?.description || "";
          patternsBlock += `  • [${p.pattern_type}] ${detail} — ${p.occurrences} occurrences${impact}\n`;
        });
        patternsBlock += "Utilise ces patterns dans tes reponses quand pertinent. Cite les chiffres exacts.\n";
      }

      // Memoire long-terme du trader
      const { data: memory } = await supabase
        .from("ai_user_memory")
        .select("trading_style, recurring_errors, strengths, emotional_patterns, goals, coach_notes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memory) {
        const hasContent =
          memory.trading_style ||
          (Array.isArray(memory.recurring_errors) && memory.recurring_errors.length > 0) ||
          (Array.isArray(memory.strengths) && memory.strengths.length > 0) ||
          (Array.isArray(memory.emotional_patterns) && memory.emotional_patterns.length > 0) ||
          (Array.isArray(memory.goals) && memory.goals.length > 0) ||
          memory.coach_notes;

        if (hasContent) {
          memoryBlock = "\n\n🧬 CE QUE TU SAIS DE CE TRADER (memoire long-terme construite a partir de vos echanges precedents):\n";
          if (memory.trading_style) memoryBlock += `• Style: ${memory.trading_style}\n`;
          if (Array.isArray(memory.recurring_errors) && memory.recurring_errors.length > 0) {
            memoryBlock += `• Erreurs recurrentes:\n  - ${memory.recurring_errors.join("\n  - ")}\n`;
          }
          if (Array.isArray(memory.strengths) && memory.strengths.length > 0) {
            memoryBlock += `• Forces:\n  - ${memory.strengths.join("\n  - ")}\n`;
          }
          if (Array.isArray(memory.emotional_patterns) && memory.emotional_patterns.length > 0) {
            memoryBlock += `• Patterns emotionnels:\n  - ${memory.emotional_patterns.join("\n  - ")}\n`;
          }
          if (Array.isArray(memory.goals) && memory.goals.length > 0) {
            memoryBlock += `• Objectifs:\n  - ${memory.goals.join("\n  - ")}\n`;
          }
          if (memory.coach_notes) memoryBlock += `• Notes coach: ${memory.coach_notes}\n`;
          memoryBlock += "Exploite cette memoire: rappelle-lui ses erreurs passees, valorise ses forces, suis ses goals. Tu n'as PAS a re-decouvrir ce trader a chaque echange.\n";
        }
      }
    }

    const systemPrompt = buildSystemPrompt(userStats) + patternsBlock + memoryBlock;

    const enrichedMessages = [
      { role: "user" as const, content: contextData },
      ...messages,
    ];

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: enrichedMessages,
      onFinish: async ({ text }) => {
        if (shouldPersist && conversationId && text) {
          try {
            await supabase.from("ai_messages").insert({
              conversation_id: conversationId,
              user_id: user!.id,
              role: "assistant",
              content: text,
            });
          } catch (e) {
            console.error("Failed to persist assistant message:", e);
          }
        }
      },
    });

    const response = result.toTextStreamResponse();
    if (conversationId) response.headers.set("X-Conversation-Id", conversationId);
    return response;
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
