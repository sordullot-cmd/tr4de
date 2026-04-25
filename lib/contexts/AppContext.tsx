"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTrades } from "@/lib/hooks/useTradeData";
import { useStrategies } from "@/lib/hooks/useUserData";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";

type AccountType = "live" | "eval";

export interface AppContextValue {
  // Auth
  userId: string | null;
  userEmail: string | null;

  // Trades + strategies (already cloud-backed)
  trades: any[];
  tradesLoading: boolean;
  addTrade: (trade: any) => Promise<void> | void;
  updateTrade: (id: string, patch: any) => Promise<void> | void;
  deleteTrade: (id: string) => Promise<void> | void;
  strategies: any[];
  addStrategy: (s: any) => Promise<void> | void;
  updateStrategy: (id: string, patch: any) => Promise<void> | void;
  deleteStrategy: (id: string) => Promise<void> | void;

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
    tradesLoading: !!(tradesApi as { loading?: boolean }).loading,
    addTrade: tradesApi.addTrade,
    updateTrade: tradesApi.updateTrade,
    deleteTrade: tradesApi.deleteTrade,

    strategies: strategiesApi.strategies || [],
    addStrategy: strategiesApi.addStrategy,
    updateStrategy: strategiesApi.updateStrategy,
    deleteStrategy: strategiesApi.deleteStrategy,

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
