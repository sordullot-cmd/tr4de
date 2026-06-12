// Frais de commission (futures) — barème centralisé pour tout le site.
//
// Le barème est PAR CONTRAT, exprimé en aller-retour (round-trip) ; on multiplie
// par la quantité de contrats du trade (micro ou mini), pas un montant fixe :
//   - Micro (symbole préfixé "M" : MNQ, MES, M2K, MGC…) : 0,91 $/côté → 1,82 $ A/R
//   - Mini / standard (NQ, ES, RTY, YM…)                : 2,88 $/côté → 5,76 $ A/R
// Frais total = barème_par_contrat × quantité (défaut 1 si quantité inconnue).
//
// Le P&L exposé par useTrades() est NET de ces frais (le brut est conservé dans
// `pnlGross`). Tous les consommateurs du site lisent donc directement le net.

export const FEE_MICRO_ROUNDTRIP = 1.82;
export const FEE_MINI_ROUNDTRIP = 5.76;

/** Forme minimale d'un trade utilisée pour le calcul des frais. */
type TradeLike = {
  symbol?: string | null;
  fees?: number | string | null;
  commission?: number | string | null;
  pnl?: number | string | null;
  pnlGross?: number | string | null;
  [key: string]: unknown;
};

/** Un contrat est "micro" si son symbole commence par M (MNQ, MES, M2K…). */
export function isMicroContract(symbol?: string | null): boolean {
  return /^M/i.test(String(symbol || "").trim());
}

/**
 * Frais d'un trade. Une valeur saisie manuellement (`fees`/`commission`) est
 * prioritaire ; sinon on applique le barème automatique selon le symbole.
 */
export function calculateFees(trade: TradeLike | null | undefined): number {
  if (trade == null) return 0;
  const manual = Number(trade.fees ?? trade.commission);
  if (Number.isFinite(manual) && manual > 0) return manual;
  // Quantité de contrats (micro ou mini) ; défaut 1 si inconnue.
  const qty = Number(trade.quantity ?? trade.qty ?? trade.lots ?? trade.lot_size);
  const n = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const perContract = isMicroContract(trade.symbol) ? FEE_MICRO_ROUNDTRIP : FEE_MINI_ROUNDTRIP;
  return perContract * n;
}

/**
 * Renvoie une copie du trade avec `pnl` net de frais et le brut conservé dans
 * `pnlGross`. Idempotent : si `pnlGross` est déjà présent (trade déjà
 * normalisé), on repart toujours du brut, donc ré-appliquer ne double pas la
 * déduction.
 */
export function applyNetPnl<T extends TradeLike>(trade: T): T {
  if (trade == null) return trade;
  const gross = Number(trade.pnlGross != null ? trade.pnlGross : trade.pnl) || 0;
  const fees = calculateFees(trade);
  return { ...trade, pnlGross: gross, pnl: gross - fees };
}

/** Applique `applyNetPnl` à une liste de trades. */
export function withNetPnl<T extends TradeLike>(list: T[]): T[] {
  return Array.isArray(list) ? list.map(applyNetPnl) : list;
}
