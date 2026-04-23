import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/ai/memory/update
// Distille les N dernieres conversations + memoire actuelle en une nouvelle memoire enrichie
// body: { conversationLimit?: number, force?: boolean }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const conversationLimit = Math.min(Number(body?.conversationLimit) || 3, 20);
    const force = !!body?.force;

    // Memoire actuelle
    const { data: currentMemory } = await supabase
      .from("ai_user_memory")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const messagesProcessedBefore = currentMemory?.messages_processed || 0;

    // Conversations recentes
    const { data: convs } = await supabase
      .from("ai_conversations")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(conversationLimit);

    if (!convs || convs.length === 0) {
      return NextResponse.json({ error: "no_conversations", message: "Aucune conversation a analyser" }, { status: 200 });
    }

    const convIds = convs.map(c => c.id);
    const { data: allMessages } = await supabase
      .from("ai_messages")
      .select("conversation_id, role, content, created_at")
      .in("conversation_id", convIds)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const messages = allMessages || [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "no_messages", message: "Aucun message a analyser" }, { status: 200 });
    }

    // Si rien de nouveau et pas force => skip
    if (!force && messages.length <= messagesProcessedBefore) {
      return NextResponse.json({ skipped: true, reason: "no_new_messages", memory: currentMemory });
    }

    // Construire le bloc conversations
    const byConv = new Map<string, Array<{ role: string; content: string }>>();
    messages.forEach(m => {
      if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
      byConv.get(m.conversation_id)!.push({ role: m.role, content: m.content });
    });

    let convBlock = "";
    convs.forEach(c => {
      const msgs = byConv.get(c.id) || [];
      if (msgs.length === 0) return;
      convBlock += `\n--- CONVERSATION "${c.title || "Sans titre"}" (${new Date(c.created_at).toLocaleDateString("fr-FR")}) ---\n`;
      msgs.slice(0, 20).forEach(m => {
        convBlock += `[${m.role === "user" ? "TRADER" : "COACH"}] ${m.content.slice(0, 400)}\n`;
      });
    });

    const currentMemoryBlock = currentMemory ? JSON.stringify({
      trading_style: currentMemory.trading_style || null,
      recurring_errors: currentMemory.recurring_errors || [],
      strengths: currentMemory.strengths || [],
      emotional_patterns: currentMemory.emotional_patterns || [],
      goals: currentMemory.goals || [],
      coach_notes: currentMemory.coach_notes || null,
    }, null, 2) : "{ /* aucune memoire pour l'instant */ }";

    const prompt = `Tu es l'analyste qui maintient le profil d'un trader pour son coach IA.
Ton job: extraire et mettre a jour ce que l'on sait du trader a partir de ses conversations recentes.

== MEMOIRE ACTUELLE ==
${currentMemoryBlock}

== CONVERSATIONS RECENTES (${convs.length}) ==
${convBlock}

== TA TACHE ==
Produit un JSON STRICT (pas de markdown, pas de texte autour) avec EXACTEMENT cette structure:

{
  "trading_style": "1-2 phrases qui resument son style (instruments, timeframe, approche). Garde ce qui etait deja connu et complete si nouveau.",
  "recurring_errors": ["erreur 1 courte (max 12 mots)", "erreur 2", ...],
  "strengths": ["force 1 courte (max 12 mots)", "force 2", ...],
  "emotional_patterns": ["pattern emotionnel court (max 12 mots)", ...],
  "goals": ["goal court (max 12 mots)", ...],
  "coach_notes": "1-3 phrases d'observations libres du coach pour mieux comprendre la personne (ce qui l'aide, ses sensibilites, son etat d'esprit recurrent)."
}

REGLES:
- Mets a jour la memoire existante - ne perds JAMAIS d'infos importantes deja la, sauf si une nouvelle info la contredit clairement.
- Limites: max 8 elements par tableau, garde les plus pertinents.
- Sois concret et specifique (cite des chiffres/setups si mentionnes).
- Si rien de nouveau a dire sur un champ, garde la valeur actuelle.
- Ecris en francais.
- AUCUN texte avant ou apres le JSON.`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    });

    // Parse JSON
    let parsed: any = null;
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse memory JSON:", text);
      return NextResponse.json({ error: "Failed to parse AI response", raw: text.slice(0, 500) }, { status: 500 });
    }

    const trim = (arr: any) => Array.isArray(arr) ? arr.slice(0, 8).map((s: any) => String(s).slice(0, 200)) : [];

    const update = {
      trading_style: parsed?.trading_style ? String(parsed.trading_style).slice(0, 1000) : currentMemory?.trading_style || null,
      recurring_errors: trim(parsed?.recurring_errors),
      strengths: trim(parsed?.strengths),
      emotional_patterns: trim(parsed?.emotional_patterns),
      goals: trim(parsed?.goals),
      coach_notes: parsed?.coach_notes ? String(parsed.coach_notes).slice(0, 2000) : currentMemory?.coach_notes || null,
      messages_processed: messages.length,
      last_conversation_id: convs[0]?.id || null,
      last_updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveErr } = await supabase
      .from("ai_user_memory")
      .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });

    return NextResponse.json({ memory: saved, processed_messages: messages.length });
  } catch (err: any) {
    console.error("Update memory error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
