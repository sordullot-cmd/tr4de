"use client";

import { useCallback, useEffect, useState } from "react";

const TOKENS_KEY = "tr4de_gcal_tokens";

interface Tokens {
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
}

export interface GCalEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  htmlLink: string;
  colorId: string | null;
  allDay: boolean;
  start: string | null;
  end: string | null;
  status: string;
}

function readTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token) return null;
    return parsed as Tokens;
  } catch {
    return null;
  }
}

function writeTokens(tokens: Tokens | null) {
  try {
    if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(TOKENS_KEY);
  } catch {}
}

/**
 * Gère la connexion à Google Agenda et la récupération des évènements.
 * Tokens persistés en localStorage (`tr4de_gcal_tokens`), rafraîchis
 * automatiquement quand l'access token expire (si un refresh_token existe).
 */
export function useGoogleCalendar() {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTokens(readTokens());
    setReady(true);
    fetch("/api/google-calendar/config")
      .then((r) => r.json())
      .then((d) => setConfigured(!!d.configured))
      .catch(() => setConfigured(false));
  }, []);

  const connected = !!tokens?.access_token;

  const connect = useCallback(() => {
    // Le callback OAuth réécrit les tokens puis revient sur #agenda.
    window.location.href = "/api/google-calendar/auth";
  }, []);

  const disconnect = useCallback(() => {
    writeTokens(null);
    setTokens(null);
  }, []);

  /** Renvoie un access token valide, en rafraîchissant si nécessaire. */
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    const cur = readTokens();
    if (!cur?.access_token) return null;
    const stillValid =
      !cur.expiry_date || cur.expiry_date - Date.now() > 60_000;
    if (stillValid) return cur.access_token;
    if (!cur.refresh_token) return cur.access_token; // tentera, échouera, déclenchera reconnect

    try {
      const res = await fetch("/api/google-calendar/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: cur.refresh_token }),
      });
      if (!res.ok) return cur.access_token;
      const data = await res.json();
      if (!data.access_token) return cur.access_token;
      const next: Tokens = {
        ...cur,
        access_token: data.access_token,
        expiry_date: data.expiry_date || null,
      };
      writeTokens(next);
      setTokens(next);
      return next.access_token;
    } catch {
      return cur.access_token;
    }
  }, []);

  /** Récupère les évènements entre deux dates ISO. Lève sur erreur réseau/API. */
  const fetchEvents = useCallback(
    async (timeMin: string, timeMax: string): Promise<GCalEvent[]> => {
      const token = await getValidAccessToken();
      if (!token) throw new Error("not_connected");

      const call = (accessToken: string) =>
        fetch("/api/google-calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, timeMin, timeMax }),
        });

      let res = await call(token);

      // Token rejeté → on déconnecte (le refresh a déjà été tenté en amont).
      if (res.status === 401) {
        writeTokens(null);
        setTokens(null);
        throw new Error("token_expired");
      }
      // Token sans permission Calendar → message dédié, on garde la connexion
      // pour proposer une reconnexion explicite.
      if (res.status === 403) {
        throw new Error("insufficient_scope");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[gcal] events error", res.status, body);
        throw new Error(body.error || `http_${res.status}`);
      }
      const data = await res.json();
      console.log(`[gcal] ${data.events?.length ?? 0} évènement(s) reçus`, { timeMin, timeMax });
      return data.events || [];
    },
    [getValidAccessToken],
  );

  /** Crée / modifie / supprime un évènement, puis renvoie la réponse. */
  const mutateEvent = useCallback(
    async (action: "create" | "update" | "delete", payload: { eventId?: string; event?: any }) => {
      const token = await getValidAccessToken();
      if (!token) throw new Error("not_connected");
      const res = await fetch("/api/google-calendar/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, accessToken: token, ...payload }),
      });
      if (res.status === 403) throw new Error("insufficient_scope");
      if (res.status === 401) {
        writeTokens(null);
        setTokens(null);
        throw new Error("token_expired");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `http_${res.status}`);
      }
      return res.json();
    },
    [getValidAccessToken],
  );

  const createEvent = useCallback((event: any) => mutateEvent("create", { event }), [mutateEvent]);
  const updateEvent = useCallback((eventId: string, event: any) => mutateEvent("update", { eventId, event }), [mutateEvent]);
  const deleteEvent = useCallback((eventId: string) => mutateEvent("delete", { eventId }), [mutateEvent]);
  const getEvent = useCallback((eventId: string) => mutateEvent("get", { eventId }), [mutateEvent]);
  const setEventDone = useCallback((eventId: string, done: boolean) => mutateEvent("setDone", { eventId, event: { done } }), [mutateEvent]);

  /** Appels génériques pour les tâches Google. */
  const callTasks = useCallback(
    async (action: string, payload: { task?: any; taskId?: string } = {}) => {
      const token = await getValidAccessToken();
      if (!token) throw new Error("not_connected");
      const res = await fetch("/api/google-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, accessToken: token, ...payload }),
      });
      if (res.status === 403) throw new Error("insufficient_scope");
      if (res.status === 401) {
        writeTokens(null);
        setTokens(null);
        throw new Error("token_expired");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `http_${res.status}`);
      }
      return res.json();
    },
    [getValidAccessToken],
  );

  const fetchTasks = useCallback(async () => {
    const d = await callTasks("list");
    return d.tasks || [];
  }, [callTasks]);
  const createTask = useCallback((task: any) => callTasks("create", { task }), [callTasks]);
  const updateTask = useCallback((taskId: string, task: any) => callTasks("update", { taskId, task }), [callTasks]);
  const toggleTask = useCallback((taskId: string, completed: boolean) => callTasks("toggle", { taskId, task: { completed } }), [callTasks]);
  const deleteTask = useCallback((taskId: string) => callTasks("delete", { taskId }), [callTasks]);

  return {
    ready,
    configured,
    connected,
    connect,
    disconnect,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    setEventDone,
    fetchTasks,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
  };
}
