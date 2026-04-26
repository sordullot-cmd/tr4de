"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function Page() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification:", error);
        router.push("/login");
      }
    };

    checkAuthAndRedirect();
  }, [router, supabase.auth]);

  return <LoadingScreen />;
}
