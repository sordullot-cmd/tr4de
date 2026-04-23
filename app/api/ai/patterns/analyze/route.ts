import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { detectPatterns } from "@/lib/ai/patternDetection";

// POST /api/ai/patterns/analyze
// body: { trades?: any[] } — si fourni, utilise ces trades, sinon interroge apex_trades en DB
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const clientTrades: any[] | undefined = Array.isArray(body?.trades) ? body.trades : undefined;

    // Fenetre: 60 derniers jours
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 60);

    let rawTrades: any[] = [];
    if (clientTrades && clientTrades.length > 0) {
      rawTrades = clientTrades;
    } else {
      const { data, error: tradesErr } = await supabase
        .from("apex_trades")
        .select("id, symbol, direction, date, entry, exit, pnl, created_at")
        .eq("user_id", user.id)
        .order("date", { ascending: true });
      if (tradesErr) return NextResponse.json({ error: tradesErr.message }, { status: 500 });
      rawTrades = data || [];
    }

    // Normaliser: le champ de date peut etre entry_time | date | created_at
    const normalize = (t: any) => {
      const dateStr = t?.entry_time || t?.date || t?.created_at || null;
      const d = dateStr ? new Date(dateStr) : null;
      return {
        id: String(t?.id || ""),
        symbol: String(t?.symbol || ""),
        direction: String(t?.direction || ""),
        entry_time: d ? d.toISOString() : "",
        pnl: Number(t?.pnl) || 0,
        setup_name: t?.setup_name || t?.setup || null,
        quantity: Number(t?.quantity) || 1,
        risk_reward_ratio: Number(t?.risk_reward_ratio) || null,
        _date: d,
      };
    };

    const normalized = rawTrades
      .map(normalize)
      .filter(t => t._date instanceof Date && !Number.isNaN(t._date.getTime()))
      .filter(t => t._date! >= windowStart);

    if (normalized.length === 0) {
      // Purge quand meme pour rester coherent
      await supabase.from("ai_patterns").delete().eq("user_id", user.id);
      return NextResponse.json({ patterns: [], count: 0, message: "Aucun trade sur les 60 derniers jours" });
    }

    // Recuperer les emotion tags (optionnel)
    const tradeIds = normalized.map(t => t.id).filter(Boolean);
    let details: any[] = [];
    if (tradeIds.length > 0) {
      const { data } = await supabase
        .from("trade_details")
        .select("trade_id, emotion_tags")
        .eq("user_id", user.id)
        .in("trade_id", tradeIds);
      details = data || [];
    }

    const patterns = detectPatterns(normalized as any, details as any);

    // Purge + insert snapshot
    await supabase.from("ai_patterns").delete().eq("user_id", user.id);

    if (patterns.length > 0) {
      const rows = patterns.map(p => ({
        user_id: user.id,
        pattern_type: p.pattern_type,
        pattern_key: p.pattern_key,
        pattern_data: p.pattern_data,
        occurrences: p.occurrences,
        avg_pnl_impact: p.avg_pnl_impact,
        confidence: p.confidence,
        last_detected_at: new Date().toISOString(),
      }));
      const { error: insertErr } = await supabase.from("ai_patterns").insert(rows);
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ patterns, count: patterns.length, message: patterns.length === 0 ? "Aucun pattern detecte dans tes trades" : undefined });
  } catch (err: any) {
    console.error("Analyze patterns error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
