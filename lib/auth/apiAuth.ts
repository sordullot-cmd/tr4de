import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

type AuthSuccess = {
  error: null;
  status: 200;
  user: User;
};

type AuthError = {
  error: string;
  status: number;
  user: null;
};

export type AuthResult = AuthSuccess | AuthError;

/**
 * Type guard pour vérifier si l'auth a réussi
 */
export function isAuthSuccess(auth: AuthResult): auth is AuthSuccess {
  return auth.error === null && auth.user !== null;
}

/**
 * Middleware pour vérifier l'authentification sur les routes API
 * Utilisation dans les route handlers:
 * 
 * export async function GET(request: NextRequest) {
 *   const auth = await requireAuth(request);
 *   if (!isAuthSuccess(auth)) {
 *     return NextResponse.json({error: auth.error}, {status: auth.status});
 *   }
 *   const user = auth.user; // TypeScript sait que user n'est pas null
 * }
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        error: "Unauthorized",
        status: 401,
        user: null,
      };
    }

    return {
      error: null,
      status: 200,
      user,
    };
  } catch (error) {
    return {
      error: "Unauthorized",
      status: 401,
      user: null,
    };
  }
}

/**
 * Exemple de route API protégée:
 * 
 * export async function GET(request: NextRequest) {
 *   const auth = await requireAuth(request);
 *   
 *   if (auth.error) {
 *     return NextResponse.json(
 *       { error: auth.error },
 *       { status: auth.status }
 *     );
 *   }
 *   
 *   const { user } = auth;
 *   
 *   // Votre logique ici
 *   return NextResponse.json({ message: "Success", user: user.id });
 * }
 */
