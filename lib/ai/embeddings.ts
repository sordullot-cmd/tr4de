import { OpenAI } from "openai";
import { createClient } from "@/lib/supabase/server";

// Lazy init: ne crée le client qu'au premier appel (évite le crash au build sur Vercel
// quand OPENAI_API_KEY n'est pas encore défini).
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}
const openai: any = new Proxy({}, { get: (_t, p) => (getOpenAI() as any)[p] });

export async function serializeTrade(trade: any, details: any): Promise<string> {
  const {
    symbol,
    direction,
    entry_price,
    exit_price,
    quantity,
    pnl,
    risk_reward_ratio,
    duration_seconds,
    setup_name,
    exit_type,
    entry_time,
    exit_time,
  } = trade;

  const { notes, emotion_tags, rule_indices } = details || {};

  const emotionText =
    emotion_tags && emotion_tags.length > 0
      ? `Émotions ressenties: ${emotion_tags.join(", ")}.`
      : "";

  const rulesText =
    rule_indices && rule_indices.length > 0
      ? `Règles suivies: ${rule_indices.map((idx: number) => `Règle #${idx}`).join(", ")}.`
      : "";

  const durationMinutes = duration_seconds
    ? Math.round(duration_seconds / 60)
    : 0;

  const serialized = `
Trade ${direction} sur ${symbol}:
- Entry: ${entry_price} à ${entry_time}, Exit: ${exit_price} ${exit_time ? `à ${exit_time}` : "en cours"}
- Quantité: ${quantity} contrats
- P&L: ${pnl} USD (Ratio R:R ${risk_reward_ratio || "N/A"})
- Durée: ${durationMinutes} minutes
- Setup: ${setup_name || "sans nom"}
- Type de sortie: ${exit_type || "manuel"}
${emotionText}
${rulesText}
Notes du trader: ${notes || "Aucune note"}
  `.trim();

  return serialized;
}

export async function createAndStoreEmbedding(
  userId: string,
  tradeId: string,
  content: string
): Promise<string | null> {
  try {
    // Créer l'embedding avec OpenAI
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: content,
    });

    const embedding = response.data[0].embedding;

    // Sauvegarder dans Supabase
    const supabase = await createClient();

    const { error } = await supabase.from("trade_embeddings").insert({
      trade_id: tradeId,
      user_id: userId,
      content: content,
      embedding: embedding,
    });

    if (error) {
      console.error("Erreur lors du stockage de l'embedding:", error);
      return null;
    }

    return tradeId;
  } catch (err) {
    console.error("Erreur lors de la création de l'embedding:", err);
    return null;
  }
}

export async function searchSimilarTrades(
  userId: string,
  query: string,
  limit: number = 8
): Promise<any[]> {
  try {
    // Vectoriser la requête
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = response.data[0].embedding;

    // Rechercher dans Supabase avec similarité cosinus
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("search_trades_by_embedding", {
      query_embedding: queryEmbedding,
      user_id_param: userId,
      match_count: limit,
    });

    if (error) {
      console.error("Erreur lors de la recherche de trades similaires:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Erreur lors de la recherche sémantique:", err);
    return [];
  }
}
