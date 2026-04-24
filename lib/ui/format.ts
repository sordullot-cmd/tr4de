import { getCurrencySymbol } from "@/lib/userPrefs";

/**
 * Formate un nombre en devise avec signe optionnel.
 * fmt(123.4)       → "$123.40"
 * fmt(-50)         → "-$50.00"
 * fmt(42, true)    → "+$42.00"
 */
export const fmt = (n: number, sign = false): string => {
  const sym = getCurrencySymbol();
  const prefix = sign && n > 0 ? "+" : n < 0 ? "-" : "";
  return `${prefix}${sym}${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
