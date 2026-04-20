/**
 * Obtient la date actuelle au format YYYY-MM-DD en utilisant l'heure locale
 * (pas UTC, ce qui évite le décalage de fuseau horaire)
 */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convertit une Date ou string en format YYYY-MM-DD localement
 */
export function formatDateLocal(date: Date | string | null | undefined): string {
  if (!date) return getLocalDateString();
  
  if (typeof date === 'string') {
    // Si c'est déjà un string au format YYYY-MM-DD ou ISO, le retourner
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    return date;
  }
  
  return getLocalDateString(new Date(date));
}
