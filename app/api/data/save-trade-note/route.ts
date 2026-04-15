import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/data/save-trade-note
 * Sauvegarde une note de journal pour un trade
 * 
 * Body:
 * {
 *   userId: string,
 *   tradeId: string,
 *   notes: string,
 *   emotionTags?: string[],
 *   qualityScore?: number (1-10)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tradeId, notes, emotionTags = [], qualityScore } = body;

    console.log("\n📝 === SAUVEGARDER NOTE DE JOURNAL ===");
    console.log(`   User: ${userId}`);
    console.log(`   Trade: ${tradeId}`);
    console.log(`   Notes: "${notes.substring(0, 50)}..."`);

    // Validation
    if (!userId || !tradeId || !notes) {
      return NextResponse.json(
        { error: "userId, tradeId et notes sont requis" },
        { status: 400 }
      );
    }

    if (qualityScore && (qualityScore < 1 || qualityScore > 10)) {
      return NextResponse.json(
        { error: "qualityScore doit être entre 1 et 10" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier que le trade appartient à l'utilisateur
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .select("id, user_id")
      .eq("id", tradeId)
      .eq("user_id", userId)
      .single();

    if (tradeError || !trade) {
      console.error("❌ Trade non trouvé ou n'appartient pas à l'utilisateur");
      return NextResponse.json(
        { error: "Trade non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si une note existe déjà pour ce trade
    const { data: existingNote } = await supabase
      .from("trade_details")
      .select("id")
      .eq("trade_id", tradeId)
      .eq("user_id", userId)
      .single();

    let result;
    let action = "created";

    if (existingNote) {
      // UPDATE la note existante
      console.log(`♻️ Mise à jour de la note existante: ${existingNote.id}`);
      const { data, error } = await supabase
        .from("trade_details")
        .update({
          notes,
          emotion_tags: emotionTags,
          quality_score: qualityScore || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingNote.id)
        .select();

      if (error) {
        throw error;
      }
      result = data?.[0];
      action = "updated";
    } else {
      // CREATE une nouvelle note
      console.log(`✨ Création d'une nouvelle note`);
      const { data, error } = await supabase
        .from("trade_details")
        .insert({
          trade_id: tradeId,
          user_id: userId,
          notes,
          emotion_tags: emotionTags,
          quality_score: qualityScore || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        throw error;
      }
      result = data?.[0];
    }

    console.log(`✅ Note ${action}: ${result?.id}`);
    console.log(`   Émotions: ${emotionTags.join(", ") || "Aucune"}`);
    console.log(`   Quality: ${qualityScore ? `${qualityScore}/10` : "N/A"}\n`);

    return NextResponse.json(
      {
        message: `Note ${action} avec succès`,
        data: result,
        action,
      },
      { status: action === "created" ? 201 : 200 }
    );
  } catch (err) {
    console.error("❌ Erreur sauvegarde note:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/data/save-trade-note?tradeId=XXX&userId=XXX
 * Récupère la note d'un trade spécifique
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tradeId = searchParams.get("tradeId");
    const userId = searchParams.get("userId");

    if (!tradeId || !userId) {
      return NextResponse.json(
        { error: "tradeId et userId requis" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("trade_details")
      .select("*")
      .eq("trade_id", tradeId)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = pas de résultat
      throw error;
    }

    return NextResponse.json(
      {
        data: data || null,
        exists: !!data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Erreur:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
