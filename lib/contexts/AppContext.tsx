"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTrades } from "@/lib/hooks/useTradeData";
import { useStrategies } from "@/lib/hooks/useUserData";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { useTradingAccounts } from "@/lib/hooks/useTradingAccounts";
import { isPlaceholderAccount } from "@/lib/utils/placeholderAccount";

type AccountType = "live" | "eval";

export interface AppContextValue {
  // Auth
  userId: string | null;
  userEmail: string | null;

  // Trades + strategies (already cloud-backed)
  trades: any[];
  /** Trades filtrés par les comptes sélectionnés (sans filtre de date — celui-ci est par-page). */
  tradesByAccount: any[];
  tradesLoading: boolean;
  addTrade: (trade: any) => Promise<void> | void;
  updateTrade: (id: string, patch: any) => Promise<void> | void;
  deleteTrade: (id: string) => Promise<void> | void;
  strategies: any[];
  addStrategy: (s: any) => Promise<void> | void;
  updateStrategy: (id: string, patch: any) => Promise<void> | void;
  deleteStrategy: (id: string) => Promise<void> | void;

  /** Liste des comptes de trading de l'utilisateur. */
  accounts: { id: string; name: string }[];

  // Account selection (UI state — persisted in localStorage)
  selectedAccountIds: string[];
  setSelectedAccountIds: (ids: string[]) => void;

  accountType: AccountType;
  setAccountType: (t: AccountType) => void;

  selectedEvalAccount: string;
  setSelectedEvalAccount: (s: string) => void;

  // Routing
  page: string;
  setPage: (p: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v == null) return fallback;
    if (typeof fallback === "string") return v as unknown as T;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {}
}

interface AppProviderProps {
  children: ReactNode;
  initialPage?: string;
}

export function AppProvider({ children, initialPage = "dashboard" }: AppProviderProps) {
  const { user } = useAuth();
  const tradesApi = useTrades();
  const strategiesApi = useStrategies();
  const { accounts: rawAccounts } = useTradingAccounts(user?.id);

  const [page, setPage] = useState<string>(initialPage);
  const [selectedAccountIds, _setSelectedAccountIds] = useState<string[]>(() =>
    readLS<string[]>("selectedAccountIds", [])
  );
  const [accountType, _setAccountType] = useState<AccountType>(() =>
    readLS<AccountType>("accountType", "live")
  );
  const [selectedEvalAccount, _setSelectedEvalAccount] = useState<string>(() =>
    readLS<string>("selectedEvalAccount", "25k")
  );

  const setSelectedAccountIds = (ids: string[]) => {
    _setSelectedAccountIds(ids);
    writeLS("selectedAccountIds", ids);
  };

  // Trades filtrés par sélection de compte (placeholder filtré). Pas de
  // filtre de date ici — c'est par-page dans App.
  const rawTrades = tradesApi.trades || [];
  const tradesByAccount = useMemo(() => {
    const realSelected = selectedAccountIds.filter(id => !isPlaceholderAccount(id));
    if (realSelected.length === 0) return [];
    return rawTrades.filter((t: { account_id?: string }) => realSelected.includes(t.account_id || ""));
  }, [rawTrades, selectedAccountIds]);
  const setAccountType = (t: AccountType) => {
    _setAccountType(t);
    writeLS("accountType", t);
  };
  const setSelectedEvalAccount = (s: string) => {
    _setSelectedEvalAccount(s);
    writeLS("selectedEvalAccount", s);
  };

  const value: AppContextValue = {
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,

    trades: tradesApi.trades || [],
    tradesByAccount,
    tradesLoading: !!(tradesApi as { loading?: boolean }).loading,
    addTrade: tradesApi.addTrade,
    updateTrade: tradesApi.updateTrade,
    deleteTrade: tradesApi.deleteTrade,

    strategies: strategiesApi.strategies || [],
    addStrategy: strategiesApi.addStrategy,
    updateStrategy: strategiesApi.updateStrategy,
    deleteStrategy: strategiesApi.deleteStrategy,

    accounts: (rawAccounts || []).map(a => ({ id: a.id, name: a.name })),
    selectedAccountIds,
    setSelectedAccountIds,
    accountType,
    setAccountType,
    selectedEvalAccount,
    setSelectedEvalAccount,

    page,
    setPage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * useApp — accède à l'état applicatif global (auth, trades, comptes, page).
 * À utiliser dans les composants pages au lieu de receveur les mêmes valeurs
 * via props. Le composant appelant doit être dans <AppProvider/>.
 */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp() must be used within <AppProvider>");
  return ctx;
}
