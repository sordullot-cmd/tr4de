"use client";

import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import DataMigrationTest from "@/components/DataMigrationTest";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TestPage() {
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

  return <DataMigrationTest />;
}
