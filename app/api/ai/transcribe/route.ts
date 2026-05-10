import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured on server." },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }
    // Whisper exige ISO-639-1 (2 lettres) — on tronque les variantes type "fr-FR" → "fr"
    const rawLang = (form.get("lang") as string) || "fr";
    const lang = rawLang.toLowerCase().split(/[-_]/)[0];

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const out = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: lang,
    });

    return NextResponse.json({ text: out.text || "" });
  } catch (err: any) {
    console.error("Transcribe error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
