import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/data/journal-notes
 * Récupère les notes du journal pour l'utilisateur actuel
 * Accepte aussi les UUID directes (utile pour la démo)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId requerais" },
        { status: 400 }
      );
    }

    console.log(`📔 API: Récupération des notes pour userId: ${userId}`);

    // Créer un client Supabase côté serveur (bypasse l'authentification)
    const supabase = await createClient();

    // Logger le call
    console.log(`🔍 Requête SQL: SELECT * FROM trade_details WHERE user_id = '${userId}'`);

    // Récupérer les données DIRECTEMENT sans RLS
    // Utiliser rpc ou une fonction qui bypasse RLS
    const { data, error, count } = await supabase
      .from("trade_details")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    console.log(`📊 Résultat: ${count} notes trouvées | Erreur: ${error?.message || "Aucune"}`);

    if (error) {
      console.error("❌ Erreur Supabase:", error);
      // En mode démo (UUID commence par 550e8400), retourner un array vide plutôt que une erreur
      const isDemoMode = userId.startsWith("550e8400");
      if (isDemoMode) {
        console.log("📱 Mode démo - Retour de données vides");
        return NextResponse.json(
          {
            data: [],
            message: "Pas de notes disponibles en mode démo",
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: data || [],
        count,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Erreur API journal-notes:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
