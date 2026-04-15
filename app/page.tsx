"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Page() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Vérifier la session actuelle
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // ✅ Utilisateur connecté -> aller au dashboard
          console.log("✅ Utilisateur connecté, redirection vers /dashboard");
          router.push("/dashboard");
        } else {
          // ❌ Pas connecté -> aller à la page login
          console.log("❌ Utilisateur non connecté, redirection vers /login");
          router.push("/login");
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification:", error);
        // En cas d'erreur, rediriger vers login par sécurité
        router.push("/login");
      }
    };

    checkAuthAndRedirect();
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
        <p className="mt-2 text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}