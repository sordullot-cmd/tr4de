import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  broker?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export function useTradingAccounts(userId: string | null | undefined) {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAccounts = useCallback(async () => {
    if (!isUuid(userId)) {
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
      const list = (data || []) as TradingAccount[];
      setAccounts(list);

      if (list.length > 0 && !selectedAccountId) {
        setSelectedAccountId(list[0].id);
      }
      setError(null);
    } catch (err) {
      setError(errMsg(err));
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedAccountId]);

  useEffect(() => {
    if (userId) {
      fetchAccounts();
    }
  }, [userId, fetchAccounts]);

  const createAccount = useCallback(
    async (name: string, broker?: string): Promise<TradingAccount | null> => {
      if (!isUuid(userId) || !name.trim()) {
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
        return data as TradingAccount;
      } catch (err) {
        setError(errMsg(err));
        console.error("Error creating account:", err);
        return null;
      }
    },
    [userId, fetchAccounts]
  );

  const deleteAccount = useCallback(
    async (accountId: string): Promise<void> => {
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
        setError(errMsg(err));
        console.error("Error deleting account:", err);
      }
    },
    [selectedAccountId, fetchAccounts]
  );

  const updateAccount = useCallback(
    async (accountId: string, name: string, broker?: string): Promise<void> => {
      try {
        const { error: err } = await supabase
          .from("trading_accounts")
          .update({ name, broker })
          .eq("id", accountId);

        if (err) throw err;

        await fetchAccounts();
      } catch (err) {
        setError(errMsg(err));
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
