import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/debug/insert-test-data
 * Insère des données de test complètes (trades + notes)
 * Route de DEBUG SEULEMENT - à supprimer en production!
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    console.log("\n📝 === INSERTION DONNÉES DE TEST ===\n");

    // 1. Vérifier s'il y a déjà des données
    const { count: existingTrades } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true });

    if ((existingTrades ?? 0) > 0) {
      console.log(`⚠️ Table trades déjà remplie avec ${existingTrades} trades`);
      return NextResponse.json(
        { message: `Table non-vide (${existingTrades ?? 0} trades)`, status: "skip" },
        { status: 400 }
      );
    }

    // 2. Créer une UUID de test pour l'utilisateur démo
    const testUserId = "550e8400-e29b-41d4-a716-446655440000";
    console.log(`✅ Utilisateur test: ${testUserId}`);

    // 3. Créer des trades de test
    const testTrades = [
      {
        user_id: testUserId,
        symbol: "NQ",
        direction: "LONG",
        entry_price: 19500.00,
        exit_price: 19550.00,
        quantity: 1,
        pnl: 2000,
        setup_name: "Breakout",
        entry_time: new Date(Date.now() - 86400000 * 5).toISOString(),
        exit_time: new Date(Date.now() - 86400000 * 5).toISOString(),
        exit_type: "Take Profit",
      },
      {
        user_id: testUserId,
        symbol: "ES",
        direction: "SHORT",
        entry_price: 5450.00,
        exit_price: 5445.00,
        quantity: 2,
        pnl: 1000,
        setup_name: "Pullback",
        entry_time: new Date(Date.now() - 86400000 * 4).toISOString(),
        exit_time: new Date(Date.now() - 86400000 * 4).toISOString(),
        exit_type: "Take Profit",
      },
      {
        user_id: testUserId,
        symbol: "NQ",
        direction: "LONG",
        entry_price: 19480.00,
        exit_price: 19460.00,
        quantity: 1,
        pnl: -400,
        setup_name: "Support",
        entry_time: new Date(Date.now() - 86400000 * 3).toISOString(),
        exit_time: new Date(Date.now() - 86400000 * 3).toISOString(),
        exit_type: "Stop Loss",
      },
      {
        user_id: testUserId,
        symbol: "CL",
        direction: "SHORT",
        entry_price: 85.50,
        exit_price: 84.80,
        quantity: 10,
        pnl: 700,
        setup_name: "Resistance",
        entry_time: new Date(Date.now() - 86400000 * 2).toISOString(),
        exit_time: new Date(Date.now() - 86400000 * 2).toISOString(),
        exit_type: "Take Profit",
      },
      {
        user_id: testUserId,
        symbol: "ES",
        direction: "LONG",
        entry_price: 5430.00,
        exit_price: 5435.00,
        quantity: 2,
        pnl: 500,
        setup_name: "Breakout",
        entry_time: new Date(Date.now() - 86400000).toISOString(),
        exit_time: new Date(Date.now() - 86400000).toISOString(),
        exit_type: "Manual",
      },
    ];

    console.log(`📊 Insertion de ${testTrades.length} trades...`);
    const { data: insertedTrades, error: tradesError } = await supabase
      .from("trades")
      .insert(testTrades)
      .select();

    if (tradesError) {
      console.error("❌ Erreur insertion trades:", tradesError.message);
      return NextResponse.json(
        { error: tradesError.message },
        { status: 500 }
      );
    }

    console.log(`✅ ${insertedTrades?.length || 0} trades insérés`);

    // 4. Créer des notes pour les trades
    const testNotes = (insertedTrades || []).map((trade, idx) => {
      const notesTexts = [
        "Trade réussi, bon setup. Entry clean, exit à profit rapide. J'ai respecté mon plan.",
        "J'aurais dû prendre profit plus tôt. Greed m'a coûté 20% du gain. Next time cut partiel à +2R.",
        "Loss petit mais frustrant. Je me suis précipité après un mauvais trade précédent. Revenge trading.",
        "Excellente journée! Stratégie RR 1:3 a payé. Discipline au top.",
        "Break even après un SL serré. Pas vraiment une perte, pas vraiment un gain. Neutral.",
      ];

      const emotionSets = [
        ["FOCUS", "CONFIANCE", "DISCIPLINÉ"],
        ["GREED", "REGRET", "LEÇON"],
        ["FRUSTRATION", "REVENGE", "IMPULSIF"],
        ["JOIE", "CONFIANCE", "VICTOIRE"],
        ["NEUTRE", "ACCEPTATION"],
      ];

      const qualityScores = [9, 6, 3, 10, 5];

      return {
        trade_id: trade.id,
        user_id: testUserId,
        notes: notesTexts[idx % notesTexts.length],
        emotion_tags: emotionSets[idx % emotionSets.length],
        quality_score: qualityScores[idx % qualityScores.length],
      };
    });

    console.log(`📔 Insertion de ${testNotes.length} notes...`);
    const { data: insertedNotes, error: notesError } = await supabase
      .from("trade_details")
      .insert(testNotes)
      .select();

    if (notesError) {
      console.error("❌ Erreur insertion notes:", notesError.message);
      return NextResponse.json(
        { error: notesError.message },
        { status: 500 }
      );
    }

    console.log(`✅ ${insertedNotes?.length || 0} notes insérées`);
    insertedNotes?.forEach((note, i) => {
      console.log(`   ${i + 1}. "${note.notes.substring(0, 40)}..." | Quality: ${note.quality_score}/10 | Émotions: ${note.emotion_tags.join(", ")}`);
    });

    console.log(`\n✨ SUCCÈS! Données de test créées!\n`);

    return NextResponse.json(
      {
        message: `✅ ${insertedTrades?.length || 0} trades et ${insertedNotes?.length || 0} notes créés`,
        trades_inserted: insertedTrades?.length || 0,
        notes_inserted: insertedNotes?.length || 0,
        test_user_id: testUserId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Erreur:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
