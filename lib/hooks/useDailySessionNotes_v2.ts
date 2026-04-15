import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { useState, useEffect, useCallback } from "react";

/**
 * Hook pour gérer les notes de session journalières
 * Synchronise avec Supabase et localStorage
 */
export function useDailySessionNotes() {
  const { user } = useAuth();
  const supabase = createClient();
  const [notes, setNotes] = useState<Record<string, string>>({}); // date -> notes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les notes depuis Supabase ET localStorage au startup
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadNotes = async () => {
      try {
        setLoading(true);
        console.log("📔 Chargement notes journalières pour user:", user.id);
        
        // Charger d'abord depuis localStorage (rapide)
        let localNotes: Record<string, string> = {};
        try {
          const stored = localStorage.getItem("tr4de_daily_notes");
          localNotes = stored ? JSON.parse(stored) : {};
          console.log(`✅ Chargé ${Object.keys(localNotes).length} notes depuis localStorage`);
        } catch (parseErr) {
          console.error("Erreur parsing localStorage:", parseErr);
        }
        setNotes(localNotes);

        // Puis essayer de charger depuis Supabase
        try {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 90);
          
          const { data, error: err } = await supabase
            .from("daily_session_notes")
            .select("date, notes")
            .eq("user_id", user.id)
            .gte("date", startDate.toISOString().split('T')[0])
            .order("date", { ascending: false });

          if (err) {
            if (!err.message?.includes("Could not find the table") && err.code !== "PGRST116") {
              throw err;
            }
            console.log("📌 Table daily_session_notes pas encore créée");
            return;
          }

          // Convertir en map date -> notes
          const supabaseNotes: Record<string, string> = {};
          data?.forEach((entry) => {
            if (entry.notes) {
              supabaseNotes[entry.date] = entry.notes;
            }
          });

          // Fusionner: localStorage + Supabase (Supabase prioritaire)
          const merged = { ...localNotes, ...supabaseNotes };
          console.log(`✅ ${Object.keys(supabaseNotes).length} notes chargées depuis Supabase`);
          setNotes(merged);
          setError(null);
        } catch (supabaseErr: unknown) {
          console.log("⚠️ Supabase indisponible, utilisant localStorage uniquement");
          // On garde juste localStorage
        }
      } catch (err: unknown) {
        console.error("❌ Erreur chargement notes:", getErrorMessage(err));
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [user?.id]);

  // Obtenir la note pour une date
  const getNote = useCallback(
    (date: string) => {
      const dateStr = date.split('T')[0]; // normaliser format
      return notes[dateStr] || "";
    },
    [notes]
  );

  // Mettre à jour/créer une note
  const setNote = useCallback(
    async (date: string, noteText: string) => {
      if (!user?.id) {
        console.error("❌ Pas d'utilisateur authentifié");
        return;
      }

      try {
        const dateStr = date.split('T')[0]; // normaliser format
        console.log("💾 Sauvegarde note pour:", dateStr);
        
        // 1. Mettre à jour le state local d'abord
        setNotes(prev => {
          const updated = { ...prev, [dateStr]: noteText };
          return updated;
        });

        // 2. Sauvegarder dans localStorage IMMÉDIATEMENT
        try {
          const allNotes = JSON.parse(localStorage.getItem("tr4de_daily_notes") || "{}");
          allNotes[dateStr] = noteText;
          localStorage.setItem("tr4de_daily_notes", JSON.stringify(allNotes));
          console.log("✅ Sauvegardé dans localStorage");
        } catch (storageErr) {
          console.error("⚠️ Erreur localStorage:", storageErr);
        }

        // 3. Sauvegarder dans Supabase en arrière-plan (async, ne pas bloquer)
        setImmediate(async () => {
          try {
            const { data: existing } = await supabase
              .from("daily_session_notes")
              .select("id")
              .eq("user_id", user.id)
              .eq("date", dateStr)
              .single();

            if (existing) {
              const { error: err } = await supabase
                .from("daily_session_notes")
                .update({ notes: noteText, updated_at: new Date().toISOString() })
                .eq("id", existing.id);

              if (err && !err.message?.includes("Could not find the table")) {
                throw err;
              }
              console.log("✅ Supabase UPDATE");
            } else {
              const { error: err } = await supabase
                .from("daily_session_notes")
                .insert([{
                  user_id: user.id,
                  date: dateStr,
                  notes: noteText,
                }]);

              if (err && !err.message?.includes("Could not find the table")) {
                throw err;
              }
              console.log("✅ Supabase INSERT");
            }
          } catch (supabaseErr) {
            console.log("⚠️ Supabase save failed (will retry):", getErrorMessage(supabaseErr));
          }
        });

        console.log("✅ Note sauvegardée");
      } catch (err) {
        console.error("❌ Erreur sauvegarde note:", getErrorMessage(err));
      }
    },
    [user?.id]
  );

  // Supprimer une note
  const deleteNote = useCallback(
    async (date: string) => {
      if (!user?.id) return;

      try {
        const dateStr = date.split('T')[0];
        console.log("🗑️ Suppression note pour:", dateStr);
        
        // 1. Mettre à jour state
        setNotes(prev => {
          const updated = { ...prev };
          delete updated[dateStr];
          return updated;
        });

        // 2. Supprimer de localStorage
        try {
          const allNotes = JSON.parse(localStorage.getItem("tr4de_daily_notes") || "{}");
          delete allNotes[dateStr];
          localStorage.setItem("tr4de_daily_notes", JSON.stringify(allNotes));
          console.log("✅ Supprimé de localStorage");
        } catch (storageErr) {
          console.error("⚠️ Erreur localStorage:", storageErr);
        }

        // 3. Supprimer de Supabase (async)
        setImmediate(async () => {
          try {
            const { error: err } = await supabase
              .from("daily_session_notes")
              .delete()
              .eq("user_id", user.id)
              .eq("date", dateStr);

            if (err && !err.message?.includes("Could not find the table")) {
              throw err;
            }
            console.log("✅ Supprimé de Supabase");
          } catch (supabaseErr) {
            console.log("⚠️ Supabase delete failed:", getErrorMessage(supabaseErr));
          }
        });

        console.log("✅ Note supprimée");
      } catch (err: unknown) {
        console.error("❌ Erreur suppression:", getErrorMessage(err));
      }
    },
    [user?.id]
  );

  return {
    notes,
    loading,
    error,
    getNote,
    setNote,
    deleteNote,
  };
}
