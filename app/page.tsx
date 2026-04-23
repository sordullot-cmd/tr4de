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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFFFF",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        {/* Logo F qui respire */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#0D0D0D",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: -0.4,
            animation: "tr4de-pulse 1.6s ease-in-out infinite",
          }}
        >
          F
        </div>

        {/* Trois points qui pulsent en cascade */}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#0D0D0D",
                opacity: 0.2,
                animation: `tr4de-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes tr4de-pulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(13,13,13,0.18); }
          50%      { transform: scale(1.06); box-shadow: 0 0 0 8px rgba(13,13,13,0); }
        }
        @keyframes tr4de-dot {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40%           { opacity: 1;   transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}