import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/apiAuth";
import { createClient } from "@/lib/supabase/server";

/**
 * Exemple: GET /api/user/profile
 * Route API protégée pour récupérer le profil utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;
    const supabase = await createClient();

    // Récupérer le profil utilisateur depuis la table profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      throw profileError;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error("Profile route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Exemple: PUT /api/user/profile
 * Route API protégée pour mettre à jour le profil
 */
export async function PUT(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;
    const body = await request.json();
    const supabase = await createClient();

    // Mettre à jour le profil
    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(body)
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
