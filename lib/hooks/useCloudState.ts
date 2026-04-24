"use client";

/**
 * useCloudState — hook générique pour persister un state JSON dans
 * Supabase (table user_productivity) avec fallback localStorage en cache rapide.
 *
 * - Au montage : lit localStorage (instantané) puis synchronise depuis Supabase.
 * - À chaque setValue : écrit localStorage immédiat + upsert Supabase debouncé.
 * - Écoute l'événement "focus" pour refetch après inactivité.
 * - Sans user connecté : fonctionne en localStorage uniquement.
 */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";

export function useCloudState<T>(
  storageKey: string,
  cloudKey: string,
  defaultValue: T
): [T, (updater: T | ((prev: T) => T)) => void] {
  const { user } = useAuth();
  const supabase = createClient();

  const [value, setLocalValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved != null) {
        const parsed = JSON.parse(saved);
        if (parsed !== null && parsed !== undefined) return parsed as T;
      }
    } catch {}
    return defaultValue;
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  // Fetch depuis Supabase au mount + sur focus
  useEffect(() => {
    if (!user?.id) { hydrated.current = true; return; }
    let cancelled = false;
    const fetchCloud = async () => {
      try {
        const { data, error } = await supabase
          .from("user_productivity")
          .select("value")
          .eq("user_id", user.id)
          .eq("key", cloudKey)
          .maybeSingle();
        if (error) {
          if (!error.message?.includes("Could not find the table")) {
            console.warn(`[useCloudState:${cloudKey}] load error:`, error.message);
          }
          return;
        }
        if (cancelled) return;
        if (data && data.value !== null && data.value !== undefined) {
          setLocalValue(data.value as T);
          try { localStorage.setItem(storageKey, JSON.stringify(data.value)); } catch {}
        }
      } catch (e: any) {
        console.warn(`[useCloudState:${cloudKey}] load failed:`, e?.message || e);
      } finally {
        if (!cancelled) hydrated.current = true;
      }
    };
    fetchCloud();
    const onFocus = () => fetchCloud();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, cloudKey]);

  // Persiste les changements (localStorage immédiat + Supabase debouncé 500ms)
  const setValue = (updater: T | ((prev: T) => T)) => {
    setLocalValue(prev => {
      const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      if (user?.id) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          try {
            const { error } = await supabase
              .from("user_productivity")
              .upsert(
                { user_id: user.id, key: cloudKey, value: next, updated_at: new Date().toISOString() },
                { onConflict: "user_id,key" }
              );
            if (error && !error.message?.includes("Could not find the table")) {
              console.warn(`[useCloudState:${cloudKey}] save error:`, error.message);
            }
          } catch (e: any) {
            console.warn(`[useCloudState:${cloudKey}] save failed:`, e?.message || e);
          }
        }, 500);
      }
      return next;
    });
  };

  return [value, setValue];
}
