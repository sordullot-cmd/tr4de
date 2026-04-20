"use client";

import React, { useState, useRef, useEffect } from "react";

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
}

interface Message {
  role: "user" | "assistant";
  content: string;
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
  { category: "Trades", text: "Donne-moi un résumé de mon trading" },
  { category: "Net P&L", text: "Qu'est-ce qui me donne le plus de succès ?" },
  { category: "Mind", text: "Où suis-je le plus rentable ?" },
  { category: "Trades", text: "Où suis-je le moins rentable ?" },
  { category: "Net P&L", text: "Comment améliorer mon trading ?" },
  { category: "Mind", text: "Comment améliorer ma stratégie ?" },
  { category: "Trades", text: "Où est-ce que je manque dans mon trading ?" },
  { category: "Net P&L", text: "Qu'est-ce qui m'empêche de gagner plus ?" },
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
}: ApexChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextSent, setContextSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (contextSent) return;
    const hasAny =
      trades.length > 0 ||
      journalNotes.length > 0 ||
      strategies.length > 0 ||
      Object.keys(dailyNotes || {}).length > 0;
    if (!hasAny) return;

    const init = async () => {
      try {
        const payload = buildPayload([
          {
            role: "user",
            content: `Contexte: ${trades.length} trades, ${strategies.length} stratégies, ${journalNotes.length} notes de trade, ${Object.keys(dailyNotes).length} notes journalières.`,
          },
        ]);
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
  }, [trades, journalNotes, strategies, strategyStats, dailyNotes, contextSent]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const payload = buildPayload(nextMessages);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);

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

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
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
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {hasMessages ? (
        <>
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
                      background: m.role === "user" ? "#DDDDDD" : T.panel,
                      color: m.role === "user" ? "#333333" : T.text,
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      border: m.role === "user" ? "none" : `1px solid ${T.border}`,
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
            padding: "48px 24px 32px",
          }}
        >
          <h1
            style={{
              fontSize: 36,
              fontWeight: 600,
              margin: 0,
              marginBottom: 28,
              letterSpacing: -0.5,
              textAlign: "center",
            }}
          >
            En quoi puis-je vous aider ?
          </h1>

          <div style={{ width: "100%", maxWidth: 760 }}>
            <InputBar
              input={input}
              setInput={setInput}
              onSubmit={() => handleSendMessage(input)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>

          <div
            style={{
              marginTop: 40,
              fontSize: 13,
              color: T.textSub,
              fontWeight: 500,
              letterSpacing: 0.2,
            }}
          >
            Suggestions pour vous
          </div>

          <div
            style={{
              marginTop: 18,
              width: "100%",
              maxWidth: 960,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {PROMPTS.map((p, i) => {
              const color = CATEGORY_COLORS[p.category] || T.accent;
              return (
                <button
                  key={i}
                  onClick={() => handleSendMessage(p.text)}
                  disabled={isLoading}
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    textAlign: "left",
                    color: T.text,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    minHeight: 104,
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.borderHover;
                    e.currentTarget.style.background = T.panelHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.background = T.panel;
                  }}
                >
                  <span
                    style={{
                      alignSelf: "flex-start",
                      padding: "3px 10px",
                      borderRadius: 999,
                      border: `1px solid ${color}`,
                      color,
                      background: "transparent",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {p.category}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1.35, color: T.text }}>
                      {p.text}
                    </span>
                    <span style={{ color: T.textMut, fontSize: 16, flexShrink: 0 }}>→</span>
                  </div>
                </button>
              );
            })}
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
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  compact?: boolean;
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
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: "14px 56px 14px 18px",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Posez votre question, je suis là pour aider !"
          disabled={disabled}
          rows={compact ? 1 : 3}
          style={{
            width: "100%",
            minHeight: compact ? 24 : 64,
            maxHeight: 180,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: T.text,
            fontSize: 14,
            lineHeight: 1.5,
            padding: 0,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !input.trim()}
          aria-label="Envoyer"
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "none",
            background: input.trim() && !disabled ? T.accent : "rgba(34,197,94,0.25)",
            color: "#000",
            cursor: input.trim() && !disabled ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
            fontWeight: 700,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
