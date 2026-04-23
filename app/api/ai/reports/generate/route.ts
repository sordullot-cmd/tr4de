import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { buildSessionReportPrompt, buildWeeklyReviewPrompt } from "@/lib/ai/prompts";

// POST /api/ai/reports/generate
// body: { type: 'daily'|'weekly', date?: 'YYYY-MM-DD', force?: boolean, trades?: any[] }
//   - date: pour 'daily' = le jour, pour 'weekly' = n'importe quel jour de la semaine cible
//   - force: regenere meme si un rapport existe deja
//   - trades: si fourni, utilise en priorite (sinon interroge apex_trades en DB)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const type = body?.type;
    const force = !!body?.force;
    const clientTrades: any[] | undefined = Array.isArray(body?.trades) ? body.trades : undefined;
    if (type !== "daily" && type !== "weekly") {
      return NextResponse.json({ error: "Invalid type (daily|weekly)" }, { status: 400 });
    }

    const refDate = body?.date ? new Date(body.date) : new Date();
    if (Number.isNaN(refDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // === Calcul de la periode ===
    let periodStart: Date;
    let periodEnd: Date;

    if (type === "daily") {
      periodStart = new Date(refDate); periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(refDate); periodEnd.setHours(23, 59, 59, 999);
    } else {
      const d = new Date(refDate);
      const day = d.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      periodStart = new Date(d);
      periodStart.setDate(d.getDate() + diffToMonday);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
    }

    const periodStartISO = periodStart.toISOString().split("T")[0];
    const periodEndISO = periodEnd.toISOString().split("T")[0];

    // === Verifier si deja genere ===
    if (!force) {
      const { data: existing } = await supabase
        .from("ai_reports")
        .select("id, content, stats, title, period_start, period_end, created_at, report_type, is_read")
        .eq("user_id", user.id)
        .eq("report_type", type)
        .eq("period_start", periodStartISO)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ report: existing, cached: true });
      }
    }

    // === Recuperer les trades ===
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

    // Normaliser + filtrer par periode (le champ date peut etre TEXT, entry_time, created_at...)
    const normalize = (t: any) => {
      const pnl = Number(t?.pnl) || 0;
      const dateStr = t?.entry_time || t?.date || t?.created_at || null;
      const d = dateStr ? new Date(dateStr) : null;
      return {
        id: String(t?.id || ""),
        symbol: String(t?.symbol || ""),
        direction: String(t?.direction || ""),
        setup_name: String(t?.setup_name || t?.setup || "Non defini"),
        pnl,
        quantity: Number(t?.quantity) || 1,
        risk_reward_ratio: Number(t?.risk_reward_ratio) || 0,
        entry_time: d ? d.toISOString() : null,
        _date: d,
      };
    };

    const normalized = rawTrades.map(normalize).filter(t => t._date instanceof Date && !Number.isNaN(t._date.getTime()));
    const trades = normalized.filter(t => t._date! >= periodStart && t._date! <= periodEnd);

    if (trades.length === 0) {
      return NextResponse.json({ error: "no_trades", message: "Aucun trade sur la periode" }, { status: 200 });
    }

    // === Stats ===
    const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const winRate = (wins.length / trades.length) * 100;

    const setupStats = new Map<string, { count: number; wins: number; pnl: number }>();
    trades.forEach(t => {
      const s = t.setup_name;
      if (!setupStats.has(s)) setupStats.set(s, { count: 0, wins: 0, pnl: 0 });
      const st = setupStats.get(s)!;
      st.count++;
      if (t.pnl > 0) st.wins++;
      st.pnl += t.pnl;
    });
    let bestSetup: string | null = null, worstSetup: string | null = null;
    let bestPnL = -Infinity, worstPnL = Infinity;
    setupStats.forEach((s, name) => {
      if (s.pnl > bestPnL) { bestPnL = s.pnl; bestSetup = name; }
      if (s.pnl < worstPnL) { worstPnL = s.pnl; worstSetup = name; }
    });

    let userPrompt: string;
    let title: string;
    if (type === "daily") {
      const dateStr = periodStart.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      userPrompt = buildSessionReportPrompt(dateStr, trades);
      title = `Rapport du ${periodStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
    } else {
      const dateRange = `${periodStart.toLocaleDateString("fr-FR")} → ${periodEnd.toLocaleDateString("fr-FR")}`;
      userPrompt = buildWeeklyReviewPrompt(dateRange, {
        totalTrades: trades.length,
        winRate,
        totalPnL,
        bestSetup,
        worstSetup,
        trades,
      });
      title = `Semaine du ${periodStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: "Tu es un coach de trading direct, concis, sans blabla. Reponds en francais.",
      prompt: userPrompt,
    });

    const stats = {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Number(winRate.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      bestSetup,
      worstSetup,
    };

    const { data: saved, error: saveErr } = await supabase
      .from("ai_reports")
      .upsert({
        user_id: user.id,
        report_type: type,
        period_start: periodStartISO,
        period_end: periodEndISO,
        title,
        content: text,
        stats,
        is_read: false,
      }, { onConflict: "user_id,report_type,period_start" })
      .select("id, report_type, period_start, period_end, title, content, stats, is_read, created_at")
      .single();

    if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });
    return NextResponse.json({ report: saved, cached: false });
  } catch (err: any) {
    console.error("Generate report error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
