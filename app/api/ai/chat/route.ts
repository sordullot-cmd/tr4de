import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, trades = [], journalNotes = [] } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !userId?.startsWith("demo-user-")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let systemPrompt = `Tu es APEX, le coach IA spécialisé en trading.`;

    const enrichedMessages = [
      { role: "user" as const, content: "Contexte reçu" },
      ...messages,
    ];

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: enrichedMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
