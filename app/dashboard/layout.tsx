"use client";

import { ProtectedRoute } from "@/lib/auth/ProtectedRoute";
import { AppProvider } from "@/lib/contexts/AppContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppProvider>
        <main className="flex-1">
          {children}
        </main>
      </AppProvider>
    </ProtectedRoute>
  );
}
