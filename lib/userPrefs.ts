// Helpers globaux pour les préférences utilisateur (devise / fuseau horaire).
// Lisent depuis localStorage à chaque appel pour refléter les changements
// en temps réel sans avoir à passer par des contextes React.

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  CHF: "CHF",
};

export function getUserCurrency(): string {
  if (typeof window === "undefined") return "USD";
  try { return localStorage.getItem("tr4de_base_currency") || "USD"; }
  catch { return "USD"; }
}

export function getCurrencySymbol(code?: string): string {
  const c = code || getUserCurrency();
  return CURRENCY_SYMBOLS[c] || c + " ";
}

export function getUserTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  try {
    return (
      localStorage.getItem("tr4de_timezone") ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC"
    );
  } catch { return "UTC"; }
}

/** Formate un nombre comme un montant dans la devise utilisateur. */
export function formatAmount(n: number, sign = false): string {
  const sym = getCurrencySymbol();
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = sign && n > 0 ? "+" : n < 0 ? "-" : "";
  return `${prefix}${sym}${abs}`;
}

/**
 * Formate une heure (string "HH:MM" ou ISO timestamp) dans le fuseau utilisateur.
 * Pour les strings "HH:MM" sans date, retourne tel quel (impossible de convertir
 * sans la date+TZ source).
 */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  // string "HH:MM" → on suppose qu'elle est déjà dans le fuseau utilisateur
  if (typeof value === "string" && /^\d{1,2}:\d{2}/.test(value)) {
    return value.match(/^\d{1,2}:\d{2}/)?.[0] || value;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: getUserTimezone(),
    }).format(d);
  } catch {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
}
