import { useAuth } from "./supabaseAuthProvider";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook pour obtenir les informations de l'utilisateur actuel
 */
export function useCurrentUser() {
  const { user, session } = useAuth();
  
  return {
    id: user?.id,
    email: user?.email,
    name: user?.user_metadata?.name,
    avatar: user?.user_metadata?.avatar_url,
    provider: user?.app_metadata?.provider,
  };
}

/**
 * Hook pour gérer la redirection après logout
 */
export function useLogoutRedirect() {
  const { logout } = useAuth();
  const router = useRouter();

  return useCallback(async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [logout, router]);
}

/**
 * Hook pour gérer les données utilisateur
 */
export function useUserData() {
  const { user, session } = useAuth();
  
  const getUserToken = () => session?.access_token;
  
  return {
    user,
    token: session?.access_token,
    isGoogleAccount: user?.app_metadata?.provider === "google",
  };
}
