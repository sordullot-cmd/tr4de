/**
 * Génère un ID de compte placeholder basé sur l'user_id
 * Ce compte ne sera jamais visible mais sera sélectionné par défaut
 */
export function getPlaceholderAccountId(userId: string): string {
  return `placeholder_${userId}`;
}

/**
 * Vérifie si un ID de compte est un compte placeholder
 */
export function isPlaceholderAccount(accountId: string): boolean {
  return accountId?.startsWith('placeholder_');
}
