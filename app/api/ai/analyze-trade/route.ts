import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import {
  serializeTrade,
  createAndStoreEmbedding,
} from "@/lib/ai/embeddings";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tradeId, userId } = body;

    if (!tradeId || !userId) {
      return new Response(JSON.stringify({ error: "Requête invalide" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Vérifier l'authentification
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Récupérer le trade complet
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .select("*")
      .eq("id", tradeId)
      .eq("user_id", userId)
      .single();

    if (tradeError || !trade) {
      return new Response(JSON.stringify({ error: "Trade non trouvé" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Récupérer les détails du trade
    const { data: tradeDetails } = await supabase
      .from("trade_details")
      .select("*")
      .eq("trade_id", tradeId)
      .eq("user_id", userId)
      .single();

    // Sérialiser et stocker l'embedding
    const serialized = await serializeTrade(trade, tradeDetails);
    await createAndStoreEmbedding(userId, tradeId, serialized);

    // Monitorer la psych (logique simple)
    const psychAlert = { alerts: [] };

    // Vérifier le risque (logique simple)
    const riskCheck = { status: "OK" };

    // Si des alertes, générer une notification personnalisée
    let notification = null;
    if (
      psychAlert?.alerts?.length > 0 ||
      riskCheck?.status === "ALERT"
    ) {
      const alerts = [
        ...(psychAlert?.alerts || []),
        riskCheck?.status === "ALERT" ? riskCheck : null,
      ].filter(Boolean);

      const alertText = alerts
        .map((a: any) => a?.message || a?.title || "")
        .join("\n");

      const response = await generateText({
        model: openai("gpt-4o"),
        system: "Tu es un coach de trading. Génère une notification courte et actionnelle basée sur ces alertes.",
        prompt: `Crée une notification pour l'utilisateur suite à ces alertes:\n${alertText}`,
        
      });

      // Sauvegarder la notification
      const alertType = psychAlert?.alerts?.some((a: any) => a.type === "STOP")
        ? "stop"
        : "warning";

      await supabase.from("agent_notifications").insert({
        user_id: userId,
        trade_id: tradeId,
        agent_name: "APEX AI",
        notification_type: alertType,
        title: "Analyse automatique du trade",
        message: response.text,
      });

      notification = {
        type: alertType,
        message: response.text,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        tradeId,
        embedded: true,
        notification,
        alerts: psychAlert?.alerts,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur de l'analyse:", error);
    return new Response(
      JSON.stringify({ error: "Erreur du serveur" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
