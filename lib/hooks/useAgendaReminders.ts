"use client";

import { useEffect, useRef } from "react";
import { useGoogleCalendar } from "@/lib/hooks/useGoogleCalendar";
import { notify, ensureNotifyPermission } from "@/lib/notify";

/**
 * useAgendaReminders — planifie de vraies notifications système (natives sur
 * desktop via Tauri) pour les évènements Google Agenda à venir.
 *
 * Pourquoi ce hook : les rappels configurés sur un évènement ne sont, côté
 * Google, envoyés que par Google (mail / notif mobile). Sur le poste (macOS
 * notamment) l'utilisateur ne recevait donc rien. Ici on déclenche localement,
 * à l'heure du rappel, une notification OS.
 *
 * À monter une seule fois, au niveau du shell applicatif, pour que les rappels
 * fonctionnent quelle que soit la page ouverte (et même fenêtre masquée dans le
 * tray tant que l'app tourne).
 */

// Fenêtre d'anticipation : on ne regarde que les évènements des prochaines 13 h.
const LOOKAHEAD_MS = 13 * 60 * 60 * 1000;
// Fréquence de rafraîchissement de la liste des évènements.
const POLL_MS = 5 * 60 * 1000;
// Minutes de rappel utilisées quand l'évènement suit « les rappels par défaut ».
const DEFAULT_REMINDER_MIN = 10;

interface CalEventLike {
  id?: string;
  summary?: string;
  allDay?: boolean;
  start?: string | null;
  status?: string;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ minutes?: number }>;
  } | null;
}

/** Minutes avant l'évènement, ou `null` si aucun rappel n'est demandé. */
function reminderMinutes(ev: CalEventLike): number | null {
  const r = ev.reminders;
  if (!r) return null;
  if (Array.isArray(r.overrides) && r.overrides.length) {
    const m = r.overrides[0].minutes;
    return typeof m === "number" ? m : null;
  }
  if (r.useDefault) return DEFAULT_REMINDER_MIN;
  return null;
}

function fmtHour(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function useAgendaReminders(): void {
  const { ready, connected, fetchEvents } = useGoogleCalendar();

  // Timers en attente, indexés par clé de rappel (id|start|minutes).
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Rappels déjà déclenchés (évite un doublon après un re-poll / reload).
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ready || !connected) return;

    let cancelled = false;
    const timers = timersRef.current;

    void ensureNotifyPermission();

    const schedule = (ev: CalEventLike) => {
      if (cancelled) return;
      if (ev.status === "cancelled" || ev.allDay === undefined) return;
      if (!ev.id || !ev.start) return;
      const min = reminderMinutes(ev);
      if (min === null) return;

      const startMs = new Date(ev.start).getTime();
      if (Number.isNaN(startMs)) return;

      const triggerMs = startMs - min * 60 * 1000;
      const delay = triggerMs - Date.now();
      // Rappel déjà passé ou trop lointain → on ignore (les lointains seront
      // repris à un prochain poll, quand ils entreront dans la fenêtre).
      if (delay <= 0 || delay > LOOKAHEAD_MS) return;

      const key = `${ev.id}|${ev.start}|${min}`;
      if (firedRef.current.has(key) || timers.has(key)) return;

      const id = setTimeout(() => {
        timers.delete(key);
        firedRef.current.add(key);
        const at = fmtHour(new Date(startMs));
        const summary = ev.summary || "Évènement";
        const body =
          min === 0 ? `C'est maintenant (${at})` : `Commence à ${at} (dans ${min} min)`;
        void notify(`📅 ${summary}`, { body });
      }, delay);

      timers.set(key, id);
    };

    const poll = async () => {
      try {
        const now = new Date();
        const evs = await fetchEvents(
          now.toISOString(),
          new Date(now.getTime() + LOOKAHEAD_MS).toISOString(),
        );
        if (cancelled) return;
        for (const ev of evs as CalEventLike[]) schedule(ev);
      } catch {
        /* réseau / token : on réessaiera au prochain tick */
      }
    };

    void poll();
    const interval = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      for (const id of timers.values()) clearTimeout(id);
      timers.clear();
    };
  }, [ready, connected, fetchEvents]);
}
