/**
 * Gère les sessions anonymes pour Supabase
 * Crée un ID utilisateur unique par device/navigateur
 */

export function getOrCreateAnonymousUserId() {
  const STORAGE_KEY = "apex_anonymous_user_id";
  
  let userId = localStorage.getItem(STORAGE_KEY);
  
  if (!userId) {
    // Générer un UUID v4
    userId = `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    localStorage.setItem(STORAGE_KEY, userId);
  }
  
  return userId;
}

export function clearAnonymousUserId() {
  localStorage.removeItem("apex_anonymous_user_id");
}
