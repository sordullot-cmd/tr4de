"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./supabaseAuthProvider";
import LoadingScreen from "@/components/ui/LoadingScreen";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
