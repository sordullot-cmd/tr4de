import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/ai/reports — liste les rapports de l'user
// Query params: ?type=daily|weekly&limit=30
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

    let query = supabase
      .from("ai_reports")
      .select("id, report_type, period_start, period_end, title, content, stats, is_read, created_at")
      .eq("user_id", user.id)
      .order("period_start", { ascending: false })
      .limit(limit);

    if (type === "daily" || type === "weekly") {
      query = query.eq("report_type", type);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reports: data || [] });
  } catch (err) {
    console.error("GET reports error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/ai/reports?id=xxx&is_read=true
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { id, is_read } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabase
      .from("ai_reports")
      .update({ is_read: !!is_read })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH report error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
