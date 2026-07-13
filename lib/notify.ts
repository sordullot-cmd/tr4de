"use client";

/**
 * notify — envoi de notifications système unifié.
 *
 * Dans l'app desktop (Tauri), on passe par le plugin natif
 * `@tauri-apps/plugin-notification` : c'est la SEULE voie fiable pour obtenir de
 * vraies notifications OS, notamment sur macOS où la WebView (WKWebView) ne
 * supporte pas l'API Web `Notification` (l'utilisateur ne voyait donc rien).
 *
 * Dans un navigateur classique, on retombe sur l'API Web `Notification`.
 */

/** Vrai si on tourne dans la WebView Tauri (desktop). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// Import paresseux du plugin : évite de charger le bundle Tauri dans le
// navigateur et de casser le SSR.
async function tauriPlugin() {
  return import("@tauri-apps/plugin-notification");
}

/**
 * Demande (si besoin) l'autorisation d'émettre des notifications.
 * Retourne `true` si l'autorisation est accordée.
 */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission } = await tauriPlugin();
      if (await isPermissionGranted()) return true;
      const perm = await requestPermission();
      return perm === "granted";
    } catch {
      return false;
    }
  }

  if (!("Notification" in window)) return false;
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch {
    return false;
  }
}

/** Vrai si l'autorisation est déjà accordée (sans la demander). */
export async function isNotifyGranted(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isTauri()) {
    try {
      const { isPermissionGranted } = await tauriPlugin();
      return await isPermissionGranted();
    } catch {
      return false;
    }
  }
  return "Notification" in window && Notification.permission === "granted";
}

export interface NotifyOptions {
  /** Corps du message. */
  body?: string;
  /** Icône (chemin web) — utilisée uniquement par le repli navigateur. */
  icon?: string;
}

/**
 * Émet une notification système native. No-op silencieux si l'autorisation
 * n'est pas accordée ou en cas d'erreur.
 */
export async function notify(title: string, options: NotifyOptions = {}): Promise<void> {
  if (typeof window === "undefined") return;
  const { body, icon = "/web-app-manifest-192x192.png" } = options;

  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await tauriPlugin();
      let granted = await isPermissionGranted();
      if (!granted) granted = (await requestPermission()) === "granted";
      if (!granted) return;
      sendNotification({ title, body });
    } catch {
      /* ignore */
    }
    return;
  }

  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon });
  } catch {
    /* ignore */
  }
}
