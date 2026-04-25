"use client";

import { useEffect } from "react";

export interface Shortcut {
  /** Touche principale (ex: "k", "1", "Escape"). Comparée case-insensitive. */
  key: string;
  /** ⌘ (mac) ou Ctrl (autres). Default: false */
  ctrlOrCmd?: boolean;
  /** Alt / Option. Default: false */
  alt?: boolean;
  /** Shift. Default: false */
  shift?: boolean;
  /** Action à exécuter. Reçoit l'événement (peut preventDefault). */
  handler: (e: KeyboardEvent) => void;
  /** Si true, ignore l'événement quand la cible est un input/textarea/contenteditable. Default: true. */
  ignoreInInputs?: boolean;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Enregistre une liste de raccourcis clavier globaux pour la durée de vie du
 * composant. Idéal dans le shell principal ou dans une page qui veut ses
 * propres raccourcis.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
      const ctrlOrCmdPressed = isMac ? e.metaKey : e.ctrlKey;

      for (const sc of shortcuts) {
        if (sc.key.toLowerCase() !== e.key.toLowerCase()) continue;
        if (!!sc.ctrlOrCmd !== ctrlOrCmdPressed) continue;
        if (!!sc.alt !== e.altKey) continue;
        if (!!sc.shift !== e.shiftKey) continue;
        if ((sc.ignoreInInputs ?? true) && isEditable(e.target)) continue;
        sc.handler(e);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);
}
