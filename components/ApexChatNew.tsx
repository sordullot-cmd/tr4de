"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import {
  buildSessionReportPrompt,
  buildWeeklyReviewPrompt,
} from "@/lib/ai/prompts";

interface ApexChatProps {
  userId: string;
  trades?: any[];
  journalNotes?: any[];
  strategies?: any[];
  strategyStats?: any[];
  dailyNotes?: Record<string, string>;
  accountInfo?: {
    type?: string;
    evalSize?: string | null;
    selectedAccountsCount?: number;
    totalAccountsCount?: number;
  };
  weeklyStats?: any[];
  monthlyStats?: any[];
  disciplineSummary?: any[];
  psychEvents?: any[];
  onOpenProfile?: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

const T = {
  bg: "#FFFFFF",
  panel: "#F5F5F5",
  panelHover: "#EEEEEE",
  border: "rgba(0,0,0,0.1)",
  borderHover: "rgba(0,0,0,0.2)",
  text: "#000000",
  textSub: "#666666",
  textMut: "#999999",
  accent: "#22C55E",
  accentDark: "#16A34A",
};

const CATEGORY_COLORS: Record<string, string> = {
  Trades: "#22C55E",
  "Net P&L": "#3B82F6",
  Mind: "#A855F7",
};

const PROMPTS = [
  { category: "Trades", text: "Résumé de ma journée de trading" },
  { category: "Mind", text: "Où suis-je le plus rentable ?" },
  { category: "Trades", text: "Où suis-je le moins rentable ?" },
  { category: "Net P&L", text: "Comment améliorer mon trading ?" },
  { category: "Trades", text: "Où est-ce que je manque dans mon trading ?" },
];

const cleanString = (str: any): string => {
  if (!str) return "";
  return String(str)
    .replace(/[\n\r\t]/g, " ")
    .replace(/[\\"]/g, (m) => (m === '"' ? '\\"' : m === "\\" ? "\\\\" : m))
    .replace(/[\x00-\x1F\x7F]/g, "");
};

export default function ApexChatNew({
  userId,
  trades = [],
  journalNotes = [],
  strategies = [],
  strategyStats = [],
  dailyNotes = {},
  accountInfo,
  weeklyStats = [],
  monthlyStats = [],
  disciplineSummary = [],
  psychEvents = [],
  onOpenProfile,
}: ApexChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextSent, setContextSent] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [lastConversation, setLastConversation] = useState<Conversation | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Compteur de messages non encore distilles dans la memoire IA
  const unsavedRef = useRef<number>(0);
  // Timestamp ms du dernier update declenche (cooldown)
  const lastUpdateAtRef = useRef<number>(0);

  // Seuil min de messages non distilles pour declencher (1 echange = 2 messages)
  const MIN_UNSAVED = 2;
  // Cooldown ms entre deux declenchements
  const UPDATE_COOLDOWN_MS = 2 * 60 * 1000;

  // Au montage : on detecte juste s'il y a une conversation precedente (sans la charger)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listRes = await fetch("/api/ai/conversations", { credentials: "include" });
        if (!listRes.ok) {
          setHistoryLoaded(true);
          return;
        }
        const { conversations } = await listRes.json();
        if (cancelled) return;
        if (conversations && conversations.length > 0) {
          setLastConversation(conversations[0]);
        }
      } catch (err) {
        console.error("Load history error:", err);
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reprendre la derniere conversation a la demande
  const handleContinueConversation = async () => {
    if (!lastConversation) return;
    try {
      const detailRes = await fetch(`/api/ai/conversations/${lastConversation.id}`, { credentials: "include" });
      if (!detailRes.ok) return;
      const { messages: storedMessages } = await detailRes.json();
      setConversationId(lastConversation.id);
      setMessages(
        (storedMessages || []).map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        }))
      );
      setContextSent(true);
    } catch (err) {
      console.error("Continue conversation error:", err);
    }
  };

  const triggerMemoryUpdate = (opts: { useBeacon?: boolean } = {}) => {
    if (unsavedRef.current < MIN_UNSAVED) return;
    const now = Date.now();
    if (now - lastUpdateAtRef.current < UPDATE_COOLDOWN_MS) return;
    lastUpdateAtRef.current = now;

    const payload = JSON.stringify({});
    try {
      if (opts.useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([payload], { type: "application/json" });
        const ok = navigator.sendBeacon("/api/ai/memory/update", blob);
        if (ok) {
          unsavedRef.current = 0;
          return;
        }
      }
      // Fallback fire-and-forget
      fetch("/api/ai/memory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: payload,
        keepalive: true,
      })
        .then(() => { unsavedRef.current = 0; })
        .catch(() => { lastUpdateAtRef.current = 0; }); // Reset cooldown si erreur
    } catch {}
  };

  // Auto-update au depart: changement d'onglet/page, fermeture, demontage
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        triggerMemoryUpdate({ useBeacon: true });
      }
    };
    const onPageHide = () => triggerMemoryUpdate({ useBeacon: true });
    const onBeforeUnload = () => triggerMemoryUpdate({ useBeacon: true });

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Demontage (changement de sous-onglet ou de page interne)
      triggerMemoryUpdate({ useBeacon: true });
    };
  }, []);

  const handleNewChat = async () => {
    if (messages.length >= 2 && unsavedRef.current > 0) triggerMemoryUpdate();
    setMessages([]);
    setConversationId(null);
    setContextSent(false);
    setInput("");
  };

  const buildPayload = (msgs: Message[]) => {
    const cleanTrades = (trades || []).map((t: any) => ({
      id: cleanString(t?.id),
      pnl: Number(t?.pnl) || 0,
      setup_name: cleanString(t?.setup_name || "Unknown"),
      entry_time: cleanString(t?.entry_time || new Date().toISOString()),
      quantity: Number(t?.quantity) || 0,
      symbol: cleanString(t?.symbol || ""),
      direction: cleanString(t?.direction || ""),
    }));

    const cleanJournalNotes = (journalNotes || []).map((n: any) => ({
      id: cleanString(n?.id),
      trade_id: cleanString(n?.trade_id),
      notes: cleanString(n?.notes || ""),
      emotion_tags: Array.isArray(n?.emotion_tags)
        ? n.emotion_tags.map((tag: any) => cleanString(tag))
        : [],
      error_tags: Array.isArray(n?.error_tags)
        ? n.error_tags.map((tag: any) => cleanString(tag))
        : [],
      quality_score: Number(n?.quality_score) || null,
      created_at: cleanString(n?.created_at || new Date().toISOString()),
    }));

    const cleanAccountInfo = accountInfo
      ? {
          type: cleanString(accountInfo.type || ""),
          evalSize: cleanString(accountInfo.evalSize || ""),
          selectedAccountsCount: Number(accountInfo.selectedAccountsCount) || 0,
          totalAccountsCount: Number(accountInfo.totalAccountsCount) || 0,
        }
      : null;

    const cleanPeriods = (arr: any[]) =>
      (arr || []).map((r: any) => ({
        period: cleanString(r?.period),
        trades: Number(r?.trades) || 0,
        wins: Number(r?.wins) || 0,
        losses: Number(r?.losses) || 0,
        winRate: cleanString(r?.winRate),
        pnl: cleanString(r?.pnl),
      }));

    const cleanDiscipline = (disciplineSummary || []).map((d: any) => ({
      date: cleanString(d?.date),
      respected: Number(d?.respected) || 0,
      total: Number(d?.total) || 0,
      score: Number(d?.score) || 0,
      violated: Array.isArray(d?.violated) ? d.violated.map((v: any) => cleanString(v)) : [],
    }));

    const cleanPsychEvents = (psychEvents || []).map((e: any) => ({
      date: cleanString(e?.date),
      type: cleanString(e?.type),
      detail: cleanString(e?.detail),
    }));

    const cleanStrategies = (strategies || []).map((s: any) => ({
      id: cleanString(s?.id),
      name: cleanString(s?.name),
      description: cleanString(s?.description || ""),
      color: cleanString(s?.color),
    }));

    const cleanStrategyStats = (strategyStats || []).map((s: any) => ({
      id: cleanString(s?.id),
      name: cleanString(s?.name),
      tradeCount: Number(s?.tradeCount) || 0,
      wins: Number(s?.wins) || 0,
      losses: Number(s?.losses) || 0,
      winRate: cleanString(s?.winRate),
      totalPnL: cleanString(s?.totalPnL),
      avgPnL: cleanString(s?.avgPnL),
    }));

    const cleanDailyNotes = Object.entries(dailyNotes || {}).reduce(
      (acc, [date, note]) => {
        acc[date] = cleanString(note);
        return acc;
      },
      {} as Record<string, string>
    );

    return {
      messages: msgs.map((m) => ({ role: m.role, content: cleanString(m.content) })),
      userId: cleanString(userId || "unknown"),
      conversationId: conversationId || undefined,
      trades: cleanTrades,
      journalNotes: cleanJournalNotes,
      strategies: cleanStrategies,
      strategyStats: cleanStrategyStats,
      dailyNotes: cleanDailyNotes,
      accountInfo: cleanAccountInfo,
      weeklyStats: cleanPeriods(weeklyStats),
      monthlyStats: cleanPeriods(monthlyStats),
      disciplineSummary: cleanDiscipline,
      psychEvents: cleanPsychEvents,
    };
  };

  useEffect(() => {
    if (contextSent || !historyLoaded) return;
    const hasAny =
      trades.length > 0 ||
      journalNotes.length > 0 ||
      strategies.length > 0 ||
      Object.keys(dailyNotes || {}).length > 0;
    if (!hasAny) return;

    const init = async () => {
      try {
        const payload = {
          ...buildPayload([
            {
              role: "user",
              content: `Contexte: ${trades.length} trades, ${strategies.length} stratégies, ${journalNotes.length} notes de trade, ${Object.keys(dailyNotes).length} notes journalières.`,
            },
          ]),
          persist: false,
        };
        await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
        });
        setContextSent(true);
      } catch (err) {
        console.error("Init context error:", err);
      }
    };
    init();
  }, [trades, journalNotes, strategies, strategyStats, dailyNotes, contextSent, historyLoaded]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    // Déterminer si c'est un prompt spécialisé
    let finalText = text;
    if (text === "Résumé de ma journée de trading") {
      const today = new Date();
      const dateStr = today.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const tradesToday = trades.filter((t: any) => {
        const tradeDate = new Date(t.entry_time).toLocaleDateString("fr-FR");
        return tradeDate === today.toLocaleDateString("fr-FR");
      });
      finalText = buildSessionReportPrompt(dateStr, tradesToday);
    } else if (text === "Revue hebdomadaire - 80/20 analyse") {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + (6 - today.getDay()));
      
      const tradesThisWeek = trades.filter((t: any) => {
        const tradeDate = new Date(t.entry_time);
        return tradeDate >= weekStart && tradeDate <= weekEnd;
      });
      
      const dateRange = `${weekStart.toLocaleDateString("fr-FR")} → ${weekEnd.toLocaleDateString("fr-FR")}`;
      const totalPnL = tradesThisWeek.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
      const winRate = tradesThisWeek.length > 0
        ? ((tradesThisWeek.filter((t: any) => t.pnl > 0).length / tradesThisWeek.length) * 100)
        : 0;
      
      finalText = buildWeeklyReviewPrompt(dateRange, {
        totalTrades: tradesThisWeek.length,
        winRate,
        totalPnL,
        bestSetup: null,
        worstSetup: null,
        trades: tradesThisWeek,
      });
    }

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Créer un payload avec le prompt complet pour l'API
      const payloadMessages: Message[] = [...messages, { role: "user" as const, content: finalText }];
      const payload = buildPayload(payloadMessages);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);

      const returnedConvId = response.headers.get("X-Conversation-Id");
      if (returnedConvId && returnedConvId !== conversationId) {
        setConversationId(returnedConvId);
      }

      const contentType = response.headers.get("content-type") || "";
      let assistantText = "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        assistantText = data.content || data.error || "Pas de contenu";
      } else if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Pas de response body");
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value);
        }
      } else {
        assistantText = await response.text();
      }

      setMessages((prev) => {
        const next = [...prev, { role: "assistant" as const, content: assistantText }];
        unsavedRef.current += 2; // user + assistant
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: T.bg,
        color: T.text,
        fontFamily: "var(--font-sans)",
      }}
    >
      {hasMessages ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <button
              onClick={handleNewChat}
              disabled={isLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.panel,
                color: T.text,
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "inherit",
                opacity: isLoading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = T.panelHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.panel;
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nouveau chat
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "12px 16px",
                      borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                      background: m.role === "user" ? "#DDDDDD" : "#FAFAFA",
                      color: m.role === "user" ? "#333333" : T.text,
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      border: "none",
                      fontWeight: m.role === "user" ? 500 : 400,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ display: "flex", gap: 6, padding: "12px 4px" }}>
                  <span style={dotStyle(0)} />
                  <span style={dotStyle(0.2)} />
                  <span style={dotStyle(0.4)} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <InputBar
            input={input}
            setInput={setInput}
            onSubmit={() => handleSendMessage(input)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            compact
            showPrompts={showPrompts}
            setShowPrompts={setShowPrompts}
            onSelectPrompt={(text) => {
              setShowPrompts(false);
              handleSendMessage(text);
            }}
            prompts={PROMPTS}
          />
        </>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            position: "relative",
          }}
        >
          {/* Icone centrale au-dessus du titre (meme que celle de l'onglet) */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: "#FFFFFF",
            border: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}>
            <MessageCircle size={22} strokeWidth={1.75} style={{color: "var(--color-text, #0D0D0D)"}} />
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              marginBottom: 18,
              letterSpacing: -0.3,
              textAlign: "center",
              color: "var(--color-text, #0D0D0D)",
            }}
          >
            En quoi puis-je vous aider ?
          </h1>

          {/* Bouton Continuer la conversation precedente */}
          {historyLoaded && lastConversation && (
            <button
              onClick={handleContinueConversation}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                marginBottom: 18,
                borderRadius: 999,
                border: `1px solid ${T.border}`,
                background: T.bg,
                color: "var(--color-text, #0D0D0D)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.panelHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.bg; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9z"/><polyline points="12 7 12 12 15 14"/></svg>
              Continuer la conversation précédente
            </button>
          )}

          {/* Input bar centre */}
          <div style={{ width: "100%", maxWidth: 560 }}>
            <InputBar
              input={input}
              setInput={setInput}
              onSubmit={() => handleSendMessage(input)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>

          {/* Pills suggestions : flex-wrap, largeurs naturelles */}
          <div
            style={{
              marginTop: 16,
              maxWidth: 720,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p.text)}
                disabled={isLoading}
                style={{
                  background: "#F0F0F0",
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 14px",
                  color: T.text,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "background 120ms ease",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = "#E5E5E5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#F0F0F0"; }}
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes apex-blink {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        textarea::placeholder { color: ${T.textMut}; }
      `}</style>
    </div>
  );
}

function dotStyle(delay: number): React.CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: T.accent,
    display: "inline-block",
    animation: `apex-blink 1.2s infinite ${delay}s`,
  };
}

function InputBar({
  input,
  setInput,
  onSubmit,
  onKeyDown,
  disabled,
  compact,
  showPrompts,
  setShowPrompts,
  onSelectPrompt,
  prompts,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  compact?: boolean;
  showPrompts?: boolean;
  setShowPrompts?: (v: boolean) => void;
  onSelectPrompt?: (text: string) => void;
  prompts?: typeof PROMPTS;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: compact ? 760 : "100%",
        margin: compact ? "0 auto" : undefined,
        padding: compact ? "16px 24px 20px" : 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          background: "#FFFFFF",
          border: `1px solid ${T.border}`,
          borderRadius: 999,
          padding: "6px 52px 6px 18px",
          display: "flex",
          alignItems: "center",
          minHeight: 40,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Posez votre question, je suis là pour aider !"
          disabled={disabled}
          rows={1}
          style={{
            width: "100%",
            minHeight: 22,
            maxHeight: 100,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: T.text,
            fontSize: 13,
            lineHeight: "22px",
            padding: 0,
            fontFamily: "inherit",
            display: "block",
          }}
        />
        {/* Menu Prompts */}
        {showPrompts && setShowPrompts && onSelectPrompt && prompts && (
          <div
            style={{
              position: "absolute",
              bottom: 50,
              right: 10,
              background: T.panel,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              boxShadow: "0 10px 32px rgba(0,0,0,0.1)",
              maxHeight: 320,
              overflowY: "auto",
              zIndex: 1000,
              width: 240,
            }}
          >
            {prompts.map((p, i) => {
              const color = CATEGORY_COLORS[p.category] || T.accent;
              return (
                <button
                  key={i}
                  onClick={() => onSelectPrompt(p.text)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    textAlign: "left",
                    border: "none",
                    background: i === 0 ? "rgba(34,197,94,0.08)" : "transparent",
                    borderBottom: i < prompts.length - 1 ? `1px solid ${T.border}` : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(34,197,94,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = i === 0 ? "rgba(34,197,94,0.08)" : "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: `1px solid ${color}`,
                        color,
                        background: "transparent",
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    >
                      {p.category}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: T.text, lineHeight: 1.3 }}>{p.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bouton Prompts - Visible seulement après avoir envoyé une question */}
        {setShowPrompts && (
          <button
            onClick={() => setShowPrompts && setShowPrompts(!showPrompts)}
            disabled={disabled}
            aria-label="Suggestions"
            style={{
              position: "absolute",
              right: 42,
              top: "50%",
              transform: "translateY(-50%)",
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: showPrompts ? T.accent : "rgba(0,0,0,0.06)",
              color: showPrompts ? "#fff" : T.textSub,
              cursor: disabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = showPrompts ? T.accentDark : "rgba(0,0,0,0.12)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = showPrompts ? T.accent : "rgba(0,0,0,0.08)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        )}

        {/* Bouton Envoyer */}
        <button
          onClick={onSubmit}
          disabled={disabled || !input.trim()}
          aria-label="Envoyer"
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            background: input.trim() && !disabled ? "#525252" : "#E5E5E5",
            color: "#FFFFFF",
            cursor: input.trim() && !disabled ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 120ms ease",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
