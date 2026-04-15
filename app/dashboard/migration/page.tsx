"use client";

import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import MigrationGuide from "@/components/MigrationGuide";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MigrationPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Redirection...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFB" }}>
      <MigrationGuide />
    </div>
  );
}
