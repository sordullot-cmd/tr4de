import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Crée une session de transcription Realtime OpenAI et renvoie un client_secret
 * éphémère que le navigateur peut utiliser directement pour ouvrir une
 * connexion WebRTC vers `api.openai.com/v1/realtime`. Le secret expire vite,
 * la clé OpenAI principale ne quitte jamais le serveur.
 */
export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured on server." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const res = await fetch(
      "https://api.openai.com/v1/realtime/transcription_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "realtime=v1",
        },
        body: JSON.stringify({
          input_audio_format: "pcm16",
          input_audio_transcription: {
            // whisper-1 = plus robuste sur le français que gpt-4o-mini-transcribe
            // (qui a tendance à basculer en anglais sur audio bruité)
            model: "whisper-1",
            language: "fr",
            prompt: "Transcription en français. Trading, futures, P&L, win rate, trade.",
          },
          turn_detection: {
            type: "server_vad",
            // Seuils plus souples : on capture mieux les voix calmes et on ne
            // coupe pas la phrase au moindre micro-silence.
            threshold: 0.4,
            prefix_padding_ms: 500,
            silence_duration_ms: 900,
          },
        }),
      }
    );

    const text = await res.text();
    if (!res.ok) {
      console.error("[realtime-token] OpenAI error", res.status, text);
      // On propage le message exact d'OpenAI pour qu'on puisse diagnostiquer.
      return NextResponse.json(
        { error: `OpenAI ${res.status}: ${text.slice(0, 500)}` },
        { status: res.status }
      );
    }
    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    console.error("realtime-token error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
