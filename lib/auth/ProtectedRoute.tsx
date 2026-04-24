"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./supabaseAuthProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
