import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/ai/patterns — liste les patterns detectes
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("ai_patterns")
      .select("id, pattern_type, pattern_key, pattern_data, occurrences, avg_pnl_impact, confidence, first_detected_at, last_detected_at")
      .eq("user_id", user.id)
      .order("occurrences", { ascending: false })
      .limit(30);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ patterns: data || [] });
  } catch (err) {
    console.error("GET patterns error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
