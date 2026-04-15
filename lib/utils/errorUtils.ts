/**
 * Utilitaire pour extraire le message d'erreur de manière sûre
 * Gère les cas où err peut être n'importe quoi (unknown)
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err === "object" && "message" in err) {
    return String(err.message);
  }
  return "Erreur inconnue";
}

/**
 * Retourne le code d'erreur s'il existe (notamment pour les erreurs Supabase)
 */
export function getErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    return String(err.code);
  }
  return null;
}
