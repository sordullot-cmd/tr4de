"use client";

import { useCallback, useEffect, useState } from "react";
import { ComplianceRule, RULE_LOCK_MS } from "@/lib/compliance";

const RULES_KEY = "tr4de_compliance_rules";
const WEBHOOK_KEY = "tr4de_compliance_webhook";
const RULES_EVENT = "tr4de:compliance-rules-changed";

function readRules(): ComplianceRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeRules(rules: ComplianceRule[]) {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    // Notifie toutes les instances du hook dans le même onglet (storage event ne fire que cross-tab)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(RULES_EVENT));
    }
  } catch {}
}

export function useComplianceRules() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRules(readRules());
    setLoaded(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === RULES_KEY) setRules(readRules());
    };
    const onLocal = () => setRules(readRules());
    window.addEventListener("storage", onStorage);
    window.addEventListener(RULES_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(RULES_EVENT, onLocal);
    };
  }, []);

  const persist = useCallback((next: ComplianceRule[]) => {
    setRules(next);
    writeRules(next);
  }, []);

  /** Crée une nouvelle règle. effective_at = now + 24h (lock anti-auto-sabotage). */
  const addRule = useCallback((rule: Omit<ComplianceRule, "id" | "created_at" | "effective_at">) => {
    const now = new Date();
    const r: ComplianceRule = {
      ...rule,
      id: `cr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: now.toISOString(),
      effective_at: new Date(now.getTime() + RULE_LOCK_MS).toISOString(),
    };
    persist([...readRules(), r]);
    return r;
  }, [persist]);

  /** Met à jour une règle. Toute modif (sauf désactivation) re-arme le lock 24h. */
  const updateRule = useCallback((id: string, patch: Partial<ComplianceRule>) => {
    const cur = readRules();
    const next = cur.map(r => {
      if (r.id !== id) return r;
      // Si seul `active` change vers false, on n'arme pas le lock (désactiver est immédiat)
      const onlyDeactivating = Object.keys(patch).length === 1 && patch.active === false;
      const merged = { ...r, ...patch };
      if (!onlyDeactivating) {
        merged.effective_at = new Date(Date.now() + RULE_LOCK_MS).toISOString();
      }
      return merged;
    });
    persist(next);
  }, [persist]);

  const deleteRule = useCallback((id: string) => {
    persist(readRules().filter(r => r.id !== id));
  }, [persist]);

  return { rules, loaded, addRule, updateRule, deleteRule };
}

/** Webhook URL (Discord, Telegram ou générique) — stocké en localStorage. */
export function useComplianceWebhook() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    try { setUrl(localStorage.getItem(WEBHOOK_KEY) || ""); } catch {}
  }, []);
  const save = useCallback((next: string) => {
    setUrl(next);
    try { localStorage.setItem(WEBHOOK_KEY, next); } catch {}
  }, []);
  return { url, save };
}
