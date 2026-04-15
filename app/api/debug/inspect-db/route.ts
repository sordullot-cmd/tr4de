import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/debug/inspect-db
 * Inspect la base de données et montre ce qu'il y a
 * Route de DEBUG SEULEMENT - à supprimer en production!
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    console.log("\n🔍 === INSPECTION BASE DE DONNÉES ===\n");

    // 1. Compter les trades
    const { count: tradesCount, error: tradesCountError } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true });

    console.log(`📊 TABLE trades: ${tradesCount || 0} trades`);
    if (tradesCountError) console.error("   ❌ Erreur:", tradesCountError.message);

    // 2. Compter les trade_details
    const { count: notesCount, error: notesCountError } = await supabase
      .from("trade_details")
      .select("*", { count: "exact", head: true });

    console.log(`📔 TABLE trade_details: ${notesCount || 0} notes`);
    if (notesCountError) console.error("   ❌ Erreur:", notesCountError.message);

    // 3. Récupérer des exemples de données
    let tradeExamples: any[] = [];
    let noteExamples: any[] = [];

    if ((tradesCount ?? 0) > 0) {
      const { data } = await supabase
        .from("trades")
        .select("id, user_id, symbol, pnl, entry_time")
        .limit(3);
      tradeExamples = data || [];
      console.log(`\n📋 Exemples de trades:`);
      tradeExamples.forEach((t, i) => {
        console.log(`   ${i + 1}. ID: ${t.id} | User: ${t.user_id} | ${t.symbol} | PnL: $${t.pnl}`);
      });
    }

    if ((notesCount ?? 0) > 0) {
      const { data } = await supabase
        .from("trade_details")
        .select("id, user_id, trade_id, notes, quality_score")
        .limit(3);
      noteExamples = data || [];
      console.log(`\n📋 Exemples de notes:`);
      noteExamples.forEach((n, i) => {
        console.log(`   ${i + 1}. ID: ${n.id} | User: ${n.user_id} | Trade: ${n.trade_id} | Quality: ${n.quality_score}/10`);
        console.log(`      Notes: "${n.notes?.substring(0, 50)}..."`);
      });
    } else {
      console.log(`\n⚠️ ATTENTION: Table trade_details est VIDE!`);
    }

    // 4. Récupérer les UUIDs uniques des utilisateurs
    const { data: uniqueUsers } = await supabase
      .from("trades")
      .select("user_id", { head: false })
      .limit(5);

    const userIds = [...new Set((uniqueUsers || []).map(t => t.user_id))];
    console.log(`\n👤 Utilisateurs avec trades: ${userIds.length}`);
    userIds.forEach(uid => {
      console.log(`   - ${uid}`);
    });

    // 5. Retourner un résumé
    const summary = {
      trades_count: tradesCount || 0,
      trade_details_count: notesCount || 0,
      trade_examples: tradeExamples,
      note_examples: noteExamples,
      user_ids: userIds,
      status: (notesCount ?? 0) > 0 ? "✅ OK - Data exists" : "❌ ERREUR - Pas de notes!",
    };

    console.log(`\n🎯 RÉSUMÉ: ${summary.status}\n`);

    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error("❌ Erreur inspect:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
