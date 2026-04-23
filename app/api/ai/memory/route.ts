import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/ai/memory — recupere le profil de l'user (cree une ligne vide si absente)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("ai_user_memory")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data) {
      const { data: created, error: insErr } = await supabase
        .from("ai_user_memory")
        .insert({ user_id: user.id })
        .select("*")
        .single();
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      return NextResponse.json({ memory: created });
    }

    return NextResponse.json({ memory: data });
  } catch (err: any) {
    console.error("GET memory error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

// PATCH /api/ai/memory — edition manuelle par l'user
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const allowed = ["trading_style", "recurring_errors", "strengths", "emotional_patterns", "goals", "coach_notes"];
    const patch: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) patch[k] = body[k];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    patch.last_updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("ai_user_memory")
      .update(patch)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ memory: data });
  } catch (err: any) {
    console.error("PATCH memory error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/ai/memory — reset complet du profil (au cas ou)
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { error } = await supabase
      .from("ai_user_memory")
      .update({
        trading_style: null,
        recurring_errors: [],
        strengths: [],
        emotional_patterns: [],
        goals: [],
        coach_notes: null,
        messages_processed: 0,
        last_updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE memory error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
