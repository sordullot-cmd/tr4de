import type { ParsedTrade } from "@/lib/types/trade";

/**
 * Clé de déduplication pour un trade.
 * Identique à `tradeKey` utilisé ailleurs dans l'app, mais robuste aux
 * variations mineures (espaces, case du symbole, format de date).
 */
export function dedupKey(tr: Pick<ParsedTrade, "date" | "symbol" | "entry">): string {
  const date = String(tr.date || "").split("T")[0].trim();
  const symbol = String(tr.symbol || "").trim().toUpperCase();
  const entry = Number(tr.entry || 0).toFixed(4);
  return `${date}__${symbol}__${entry}`;
}

export interface DedupReport<T> {
  /** Trades ajoutés (nouveaux). */
  added: T[];
  /** Trades ignorés car déjà présents. */
  skipped: T[];
  /** Set des clés présentes après merge (pour debug). */
  totalKeys: Set<string>;
}

/**
 * Fusionne `incoming` dans `existing` en ignorant les doublons.
 * Renvoie un rapport et la nouvelle liste à persister.
 */
export function mergeUnique<T extends Pick<ParsedTrade, "date" | "symbol" | "entry">>(
  existing: T[],
  incoming: T[]
): { merged: T[]; report: DedupReport<T> } {
  const existingKeys = new Set(existing.map(dedupKey));
  const added: T[] = [];
  const skipped: T[] = [];
  for (const tr of incoming) {
    const k = dedupKey(tr);
    if (existingKeys.has(k)) {
      skipped.push(tr);
    } else {
      existingKeys.add(k);
      added.push(tr);
    }
  }
  return {
    merged: [...existing, ...added],
    report: { added, skipped, totalKeys: existingKeys },
  };
}
