import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useTradingAccounts(userId) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const supabase = createClient();

  // Récupérer les comptes
  const fetchAccounts = useCallback(async () => {
    // Vérifier que c'est un UUID valide avant de faire la requête
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      console.log("Skipping fetch - userId is invalid:", userId);
      setAccounts([]);
      setSelectedAccountId(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setAccounts(data || []);

      // Sélectionner le premier compte par défaut
      if (data && data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedAccountId]);

  // Récupérer les comptes au montage
  useEffect(() => {
    if (userId) {
      fetchAccounts();
    }
  }, [userId, fetchAccounts]);

  // Créer un compte
  const createAccount = useCallback(
    async (name, broker) => {
      // Vérifier que c'est un UUID valide
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!userId || !uuidRegex.test(userId) || !name.trim()) {
        setError("Le nom du compte et un utilisateur valide sont requis");
        return null;
      }

      try {
        const { data, error: err } = await supabase
          .from("trading_accounts")
          .insert([
            {
              user_id: userId,
              name: name.trim(),
              broker,
            },
          ])
          .select()
          .single();

        if (err) throw err;

        await fetchAccounts();
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error creating account:", err);
        return null;
      }
    },
    [userId, fetchAccounts]
  );

  // Supprimer un compte
  const deleteAccount = useCallback(
    async (accountId) => {
      try {
        const { error: err } = await supabase
          .from("trading_accounts")
          .delete()
          .eq("id", accountId);

        if (err) throw err;

        if (selectedAccountId === accountId) {
          setSelectedAccountId(null);
        }

        await fetchAccounts();
      } catch (err) {
        setError(err.message);
        console.error("Error deleting account:", err);
      }
    },
    [selectedAccountId, fetchAccounts]
  );

  // Mettre à jour un compte
  const updateAccount = useCallback(
    async (accountId, name, broker) => {
      try {
        const { error: err } = await supabase
          .from("trading_accounts")
          .update({ name, broker })
          .eq("id", accountId);

        if (err) throw err;

        await fetchAccounts();
      } catch (err) {
        setError(err.message);
        console.error("Error updating account:", err);
      }
    },
    [fetchAccounts]
  );

  return {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    loading,
    error,
    createAccount,
    deleteAccount,
    updateAccount,
    fetchAccounts,
  };
}
