import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { useState, useEffect, useCallback } from "react";

/**
 * Hook pour gérer les tags d'émotion des trades
 */
export function useTradeEmotionTags() {
  const { user } = useAuth();
  const supabase = createClient();
  const [emotionTags, setEmotionTags] = useState<Record<string, string[]>>({}); // tradeId -> [emotions]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les emotion tags depuis Supabase
  useEffect(() => {
    if (!user?.id) return;

    const fetchEmotions = async () => {
      try {
        setLoading(true);
        console.log("😊 Chargement des emotion tags pour user:", user.id);
        const { data, error: err } = await supabase
          .from("trade_emotion_tags")
          .select("trade_id, emotion_tag")
          .eq("user_id", user.id);

        if (err) throw err;

        // Convertir en map tradeId -> [emotions]
        const tagsMap: Record<string, string[]> = {};
        data?.forEach((tag) => {
          if (!tagsMap[tag.trade_id]) {
            tagsMap[tag.trade_id] = [];
          }
          tagsMap[tag.trade_id].push(tag.emotion_tag);
        });

        console.log(`✅ ${Object.keys(tagsMap).length} trades avec emotion tags chargés`);
        setEmotionTags(tagsMap);
      } catch (err: unknown) {
        console.error("❌ Erreur récupération emotion tags:", getErrorMessage(err));
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchEmotions();
  }, [user?.id]);

  // Obtenir les emotions d'un trade
  const getEmotions = useCallback(
    (tradeId: string) => {
      return emotionTags[tradeId] || [];
    },
    [emotionTags]
  );

  // Ajouter une emotion à un trade
  const addEmotion = useCallback(
    async (tradeId: string, emotion: string) => {
      if (!user?.id) return;

      try {
        console.log("➕ Ajout emotion:", emotion, "pour trade:", tradeId);
        const { error: err } = await supabase
          .from("trade_emotion_tags")
          .insert([{
            trade_id: tradeId,
            user_id: user.id,
            emotion_tag: emotion,
          }]);

        if (err) throw err;

        // Mettre à jour le state
        setEmotionTags(prev => ({
          ...prev,
          [tradeId]: [...(prev[tradeId] || []), emotion]
        }));

        console.log("✅ Emotion ajoutée");
      } catch (err: unknown) {
        console.error("❌ Erreur ajout emotion:", getErrorMessage(err));
        throw err;
      }
    },
    [user?.id]
  );

  // Supprimer une emotion d'un trade
  const removeEmotion = useCallback(
    async (tradeId: string, emotion: string) => {
      if (!user?.id) return;

      try {
        console.log("🗑 Suppression emotion:", emotion, "pour trade:", tradeId);
        const { error: err } = await supabase
          .from("trade_emotion_tags")
          .delete()
          .eq("trade_id", tradeId)
          .eq("emotion_tag", emotion)
          .eq("user_id", user.id);

        if (err) throw err;

        // Mettre à jour le state
        setEmotionTags(prev => ({
          ...prev,
          [tradeId]: (prev[tradeId] || []).filter(e => e !== emotion)
        }));

        console.log("✅ Emotion supprimée");
      } catch (err: unknown) {
        console.error("❌ Erreur suppression emotion:", getErrorMessage(err));
        throw err;
      }
    },
    [user?.id]
  );

  return {
    emotionTags,
    loading,
    error,
    getEmotions,
    addEmotion,
    removeEmotion,
  };
}

/**
 * Hook pour gérer les tags d'erreur des trades
 */
export function useTradeErrorTags() {
  const { user } = useAuth();
  const supabase = createClient();
  const [errorTags, setErrorTags] = useState<Record<string, string[]>>({}); // tradeId -> [errors]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les error tags depuis Supabase
  useEffect(() => {
    if (!user?.id) return;

    const fetchErrors = async () => {
      try {
        setLoading(true);
        console.log("⚠️ Chargement des error tags pour user:", user.id);
        const { data, error: err } = await supabase
          .from("trade_error_tags")
          .select("trade_id, error_tag")
          .eq("user_id", user.id);

        if (err) throw err;

        // Convertir en map tradeId -> [errors]
        const tagsMap: Record<string, string[]> = {};
        data?.forEach((tag) => {
          if (!tagsMap[tag.trade_id]) {
            tagsMap[tag.trade_id] = [];
          }
          tagsMap[tag.trade_id].push(tag.error_tag);
        });

        console.log(`✅ ${Object.keys(tagsMap).length} trades avec error tags chargés`);
        setErrorTags(tagsMap);
      } catch (err: unknown) {
        console.error("❌ Erreur récupération error tags:", getErrorMessage(err));
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
  }, [user?.id]);

  // Obtenir les erreurs d'un trade
  const getErrors = useCallback(
    (tradeId: string) => {
      return errorTags[tradeId] || [];
    },
    [errorTags]
  );

  // Ajouter une erreur à un trade
  const addError = useCallback(
    async (tradeId: string, errorTag: string) => {
      if (!user?.id) return;

      try {
        console.log("➕ Ajout erreur:", errorTag, "pour trade:", tradeId);
        const { error: err } = await supabase
          .from("trade_error_tags")
          .insert([{
            trade_id: tradeId,
            user_id: user.id,
            error_tag: errorTag,
          }]);

        if (err) throw err;

        // Mettre à jour le state
        setErrorTags(prev => ({
          ...prev,
          [tradeId]: [...(prev[tradeId] || []), errorTag]
        }));

        console.log("✅ Erreur ajoutée");
      } catch (err: unknown) {
        console.error("❌ Erreur ajout error tag:", getErrorMessage(err));
        throw err;
      }
    },
    [user?.id]
  );

  // Supprimer une erreur d'un trade
  const removeError = useCallback(
    async (tradeId: string, errorTag: string) => {
      if (!user?.id) return;

      try {
        console.log("🗑 Suppression erreur:", errorTag, "pour trade:", tradeId);
        const { error: err } = await supabase
          .from("trade_error_tags")
          .delete()
          .eq("trade_id", tradeId)
          .eq("error_tag", errorTag)
          .eq("user_id", user.id);

        if (err) throw err;

        // Mettre à jour le state
        setErrorTags(prev => ({
          ...prev,
          [tradeId]: (prev[tradeId] || []).filter(e => e !== errorTag)
        }));

        console.log("✅ Erreur supprimée");
      } catch (err: unknown) {
        console.error("❌ Erreur suppression error tag:", getErrorMessage(err));
        throw err;
      }
    },
    [user?.id]
  );

  return {
    errorTags,
    loading,
    error,
    getErrors,
    addError,
    removeError,
  };
}
