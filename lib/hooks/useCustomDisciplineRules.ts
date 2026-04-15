import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { useState, useEffect, useCallback } from "react";

interface CustomRule {
  id: string;
  rule_id: string;
  type: "texte" | "horaire" | "argent";
  text: string;
  time?: string;
  amount?: string;
}

/**
 * Hook pour gérer les règles de discipline personnalisées (Supabase)
 */
export function useCustomDisciplineRules() {
  const { user } = useAuth();
  const supabase = createClient();
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les règles depuis Supabase
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchRules = async () => {
      try {
        setLoading(true);
        console.log("📋 Chargement règles personnalisées pour user:", user.id);

        const { data, error: err } = await supabase
          .from("custom_discipline_rules")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (err) {
          if (err.message?.includes("Could not find the table") || err.code === "PGRST116") {
            console.log("📌 Table custom_discipline_rules pas encore créée - continue sans règles perso");
            setCustomRules([]);
            setError(null);
            return;
          }
          throw err;
        }

        const rules: CustomRule[] = data?.map(r => ({
          id: r.id,
          rule_id: r.rule_id,
          type: r.type,
          text: r.text,
          time: r.time,
          amount: r.amount,
        })) || [];

        console.log(`✅ ${rules.length} règles personnalisées chargées`);
        setCustomRules(rules);
        setError(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
        console.error("❌ Erreur chargement règles:", errorMessage);
        setCustomRules([]);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [user?.id]);

  // Ajouter une nouvelle règle
  const addRule = useCallback(
    async (type: "texte" | "horaire" | "argent", text: string, time?: string, amount?: string) => {
      if (!user?.id) return;

      try {
        const rule_id = `rule_${Date.now()}`;
        console.log(`➕ Ajout règle personnalisée: ${text}`);
        console.log(`   User ID: ${user.id}, Rule ID: ${rule_id}`);

        // Sauvegarder directement dans Supabase
        console.log("📤 Envoi à Supabase...");
        const { data, error: supabaseErr } = await supabase
          .from("custom_discipline_rules")
          .insert({
            user_id: user.id,
            rule_id,
            type,
            text,
            time: time || null,
            amount: amount || null,
          })
          .select()
          .single();

        if (supabaseErr) {
          console.error("❌ Erreur Supabase INSERT:", supabaseErr);
          if (supabaseErr.message?.includes("Could not find the table") || supabaseErr.code === "PGRST116") {
            console.log("⚠️ Table n'existe pas encore");
          } else if (supabaseErr.message?.includes("permission denied")) {
            console.log("⚠️ RLS permission denied - vérifiez l'authentification");
          } else {
            throw supabaseErr;
          }
        }

        if (data) {
          console.log("✅ Règle insérée dans Supabase:", data);
          // Mettre à jour le state avec les vraies données
          const newRule: CustomRule = {
            id: data.id,
            rule_id: data.rule_id,
            type: data.type,
            text: data.text,
            time: data.time,
            amount: data.amount,
          };
          setCustomRules(prev => [...prev, newRule]);
        } else {
          // Fallback: ajouter en local en attendant
          const newRule: CustomRule = {
            id: rule_id,
            rule_id,
            type,
            text,
            time,
            amount,
          };
          setCustomRules(prev => [...prev, newRule]);
          console.log("⚠️ Pas de data retounée, ajout local seulement");
        }

        console.log("✅ Règle ajoutée");
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        console.error("❌ Erreur ajout règle:", errorMessage);
        throw err;
      }
    },
    [user?.id, supabase]
  );

  // Supprimer une règle
  const deleteRule = useCallback(
    async (ruleId: string) => {
      if (!user?.id) return;

      try {
        console.log(`🗑 Suppression règle: ${ruleId}`);

        // Supprimer du state local d'abord
        setCustomRules(prev => prev.filter(r => r.id !== ruleId));

        // Supprimer de Supabase
        console.log("📤 Suppression Supabase...");
        const { error: err } = await supabase
          .from("custom_discipline_rules")
          .delete()
          .eq("id", ruleId)
          .eq("user_id", user.id);

        if (err) {
          console.error("❌ Erreur Supabase DELETE:", err);
          if (err.message?.includes("Could not find the table") || err.code === "PGRST116") {
            console.log("⚠️ Table n'existe pas");
          } else {
            throw err;
          }
        } else {
          console.log("✅ Règle supprimée de Supabase");
        }

        console.log("✅ Règle supprimée");
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        console.error("❌ Erreur suppression règle:", errorMessage);
        throw err;
      }
    },
    [user?.id, supabase]
  );

  return {
    customRules,
    loading,
    error,
    addRule,
    deleteRule,
  };
}
