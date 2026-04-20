"use client";

import React, { useState, useRef, useEffect } from "react";

interface ApexChatProps {
  userId: string;
  trades?: any[];
  journalNotes?: any[];
  strategies?: any[];
  strategyStats?: any[];
  dailyNotes?: Record<string, string>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ApexChat({ 
  userId, 
  trades = [], 
  journalNotes = [],
  strategies = [],
  strategyStats = [],
  dailyNotes = {}
}: ApexChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Array.isArray(trades) && trades.length > 0) {
      console.log("🎯 ApexChat reçu trades:", trades.length, "trades");
    }
    if (Array.isArray(journalNotes) && journalNotes.length > 0) {
      console.log("📔 ApexChat reçu journal notes:", journalNotes.length, "notes");
    }
    if (Array.isArray(strategies) && strategies.length > 0) {
      console.log("📊 ApexChat reçu strategies:", strategies.length, "stratégies");
    }
    if (Array.isArray(strategyStats) && strategyStats.length > 0) {
      console.log("📈 ApexChat reçu strategy stats:", strategyStats.length, "stats");
    }
    if (dailyNotes && Object.keys(dailyNotes).length > 0) {
      console.log("📅 ApexChat reçu daily notes:", Object.keys(dailyNotes).length, "notes");
    }
  }, [trades, journalNotes, strategies, strategyStats, dailyNotes]);

  // Envoyer automatiquement le contexte complet avec toutes les données au chargement
  useEffect(() => {
    const initializeContext = async () => {
      // Attendre que les données soient disponibles
      if ((trades.length > 0 || journalNotes.length > 0 || strategies.length > 0) && messages.length === 0) {
        console.log("📡 Initialisation du contexte complet pour l'IA...");
        
        // Envoyer automatiquement un message système avec les données
        const cleanString = (str: any): string => {
          if (!str) return "";
          const s = String(str);
          return s
            .replace(/[\n\r\t]/g, " ")
            .replace(/[\\"]/g, m => m === '"' ? '\\"' : m === '\\' ? '\\\\' : m)
            .replace(/[\x00-\x1F\x7F]/g, "");
        };

        const cleanTrades = Array.isArray(trades) ? trades.map((t: any) => ({
          id: cleanString(t?.id),
          pnl: Number(t?.pnl) || 0,
          setup_name: cleanString(t?.setup_name || "Unknown"),
          entry_time: cleanString(t?.entry_time || new Date().toISOString()),
          quantity: Number(t?.quantity) || 0,
          symbol: cleanString(t?.symbol || ""),
          direction: cleanString(t?.direction || ""),
        })) : [];

        const cleanJournalNotes = Array.isArray(journalNotes) ? journalNotes.map((note: any) => ({
          id: cleanString(note?.id),
          trade_id: cleanString(note?.trade_id),
          notes: cleanString(note?.notes || ""),
          emotion_tags: Array.isArray(note?.emotion_tags) ? note.emotion_tags.map((tag: any) => cleanString(tag)) : [],
          quality_score: Number(note?.quality_score) || null,
          created_at: cleanString(note?.created_at || new Date().toISOString()),
        })) : [];

        // 🆕 Nettoyer les stratégies
        const cleanStrategies = Array.isArray(strategies) ? strategies.map((s: any) => ({
          id: cleanString(s?.id),
          name: cleanString(s?.name),
          description: cleanString(s?.description || ""),
          color: cleanString(s?.color),
        })) : [];

        // 🆕 Nettoyer les stats de stratégie
        const cleanStrategyStats = Array.isArray(strategyStats) ? strategyStats.map((stat: any) => ({
          id: cleanString(stat?.id),
          name: cleanString(stat?.name),
          tradeCount: Number(stat?.tradeCount) || 0,
          wins: Number(stat?.wins) || 0,
          losses: Number(stat?.losses) || 0,
          winRate: cleanString(stat?.winRate),
          totalPnL: cleanString(stat?.totalPnL),
          avgPnL: cleanString(stat?.avgPnL),
        })) : [];

        // 🆕 Nettoyer les notes journalières
        const cleanDailyNotes = dailyNotes ? Object.entries(dailyNotes).reduce((acc, [date, note]) => {
          acc[date] = cleanString(note);
          return acc;
        }, {} as Record<string, string>) : {};

        const payload = {
          messages: [],
          userId: cleanString(userId || "unknown"),
          trades: cleanTrades,
          journalNotes: cleanJournalNotes,
          strategies: cleanStrategies,
          strategyStats: cleanStrategyStats,
          dailyNotes: cleanDailyNotes,
        };

        try {
          const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            console.log("✅ Contexte initialisé - L'IA a accès aux données");
            // Message automatique désactivé - le chat reste vide jusqu'à la première question
          }
        } catch (err) {
          console.error("Erreur lors de l'initialisation:", err);
        }
      }
    };

    initializeContext();
  }, [trades, journalNotes, strategies, strategyStats, dailyNotes, userId]);

  const prompts = [
    { category: "Trades", color: "#06B6D4", emoji: "", text: "Résumé de mes trades" },
    { category: "Analyse", color: "#8B5CF6", emoji: "", text: "Facteurs de succès" },
    { category: "Performance", color: "#EC4899", emoji: "", text: "Rentabilité maximale" },
    { category: "Risque", color: "#F59E0B", emoji: "", text: "Zones de faiblesse" },
    { category: "Amélioration", color: "#10B981", emoji: "", text: "Optimisation du trading" },
    { category: "Stratégie", color: "#3B82F6", emoji: "", text: "Raffinement stratégique" },
    { category: "Diagnostic", color: "#06B6D4", emoji: "", text: "Analyse diagnostic" },
    { category: "Discipline", color: "#8B5CF6", emoji: "", text: "Amélioration discipline" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const cleanString = (str: any): string => {
    if (!str) return "";
    const s = String(str);
    return s
      .replace(/[\n\r\t]/g, " ")
      .replace(/[\\"]/g, m => m === '"' ? '\\"' : m === '\\' ? '\\\\' : m)
      .replace(/[\x00-\x1F\x7F]/g, "");
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const newMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const cleanMessages = messages.concat(newMessage).map((m) => ({
        role: m.role as "user" | "assistant",
        content: cleanString(m.content),
      }));

      const cleanTrades = Array.isArray(trades) ? trades.map((t: any) => ({
        id: cleanString(t?.id),
        pnl: Number(t?.pnl) || 0,
        setup_name: cleanString(t?.setup_name || "Unknown"),
        entry_time: cleanString(t?.entry_time || new Date().toISOString()),
        quantity: Number(t?.quantity) || 0,
        symbol: cleanString(t?.symbol || ""),
        direction: cleanString(t?.direction || ""),
      })) : [];

      const cleanJournalNotes = Array.isArray(journalNotes) ? journalNotes.map((note: any) => ({
        id: cleanString(note?.id),
        trade_id: cleanString(note?.trade_id),
        notes: cleanString(note?.notes || ""),
        emotion_tags: Array.isArray(note?.emotion_tags) ? note.emotion_tags.map((tag: any) => cleanString(tag)) : [],
        quality_score: Number(note?.quality_score) || null,
        created_at: cleanString(note?.created_at || new Date().toISOString()),
      })) : [];

      // 🆕 Construire les stratégies avec nettoyage strict
      const cleanStrategies = Array.isArray(strategies) ? strategies.map((s: any) => ({
        id: cleanString(s?.id),
        name: cleanString(s?.name),
        description: cleanString(s?.description || ""),
        color: cleanString(s?.color),
      })) : [];

      // 🆕 Construire les stats de stratégie avec nettoyage strict
      const cleanStrategyStats = Array.isArray(strategyStats) ? strategyStats.map((stat: any) => ({
        id: cleanString(stat?.id),
        name: cleanString(stat?.name),
        tradeCount: Number(stat?.tradeCount) || 0,
        wins: Number(stat?.wins) || 0,
        losses: Number(stat?.losses) || 0,
        winRate: cleanString(stat?.winRate),
        totalPnL: cleanString(stat?.totalPnL),
        avgPnL: cleanString(stat?.avgPnL),
      })) : [];

      // 🆕 Construire les notes journalières avec nettoyage strict
      const cleanDailyNotes = dailyNotes ? Object.entries(dailyNotes).reduce((acc, [date, note]) => {
        acc[date] = cleanString(note);
        return acc;
      }, {} as Record<string, string>) : {};

      const payload = {
        messages: cleanMessages,
        userId: cleanString(userId || "unknown"),
        trades: cleanTrades,
        journalNotes: cleanJournalNotes,
        strategies: cleanStrategies,
        strategyStats: cleanStrategyStats,
        dailyNotes: cleanDailyNotes,
      };

      const bodyStr = JSON.stringify(payload, (key, value) => {
        if (typeof value === "string") {
          return cleanString(value);
        }
        return value;
      });

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: bodyStr,
      });

      if (!response.ok) {
        throw new Error(`Erreur du serveur: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content || "Pas de contenu" },
        ]);
      } else if (contentType?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Pas de response body");

        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += decoder.decode(value);
        }

        setMessages((prev) => [...prev, { role: "assistant", content: fullResponse }]);
      } else {
        const text = await response.text();
        setMessages((prev) => [...prev, { role: "assistant", content: text }]);
      }
    } catch (error) {
      console.error("❌ ERREUR:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Si messages vides, afficher le home screen
  if (messages.length === 0 && showSuggestions) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0a0a0a",
        paddingBottom: "0",
      }}>
        {/* Scrollable Content Area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px",
        }}>
          {/* Input Section - JUSTE AU DESSUS DES SUGGESTIONS */}
          <div style={{
            display: "flex",
            gap: "12px",
            maxWidth: "1100px",
            margin: "0 auto 60px auto",
            width: "100%",
            paddingBottom: "0",
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
              placeholder="Ask me something..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "20px 24px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "16px",
                outline: "none",
                transition: "all 0.3s",
                minHeight: "56px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                e.currentTarget.style.borderColor = "rgba(16,181,145,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
            />
            <button
              onClick={() => handleSendMessage(input)}
              disabled={isLoading || !input.trim()}
              style={{
                padding: "20px 32px",
                background: "#10B981",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                opacity: isLoading || !input.trim() ? 0.5 : 1,
                transition: "all 0.3s",
                minHeight: "56px",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim()) {
                  e.currentTarget.style.background = "#0ea572";
                  e.currentTarget.style.transform = "scale(1.02)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#10B981";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>

          {/* Suggestions Grid */}
          <div style={{
            width: "100%",
            maxWidth: "1100px",
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#666666",
              marginBottom: "32px",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}>
              Tailored prompts for you
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
              width: "100%",
            }}>
              {prompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.text)}
                  style={{
                    background: "rgba(20,20,20,0.8)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "500",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                    e.currentTarget.style.background = "rgba(30,30,30,1)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                    e.currentTarget.style.background = "rgba(20,20,20,0.8)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Category Badge */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                    <span style={{
                      background: prompt.color,
                      color: "#ffffff",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      {prompt.category}
                    </span>
                  </div>

                  {/* Question Text */}
                  <div style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#ffffff",
                    lineHeight: "1.5",
                  }}>
                    {prompt.text}
                  </div>

                  {/* Arrow */}
                  <div style={{
                    fontSize: "20px",
                    marginTop: "12px",
                    color: "#10B981",
                    opacity: "1",
                    transition: "all 0.3s",
                  }}>
                    →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div style={{
          padding: "24px",
          background: "#0a0a0a",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{
            display: "flex",
            gap: "12px",
            maxWidth: "1100px",
            margin: "0 auto",
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
              placeholder="Ask me something..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "14px 18px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "15px",
                outline: "none",
                transition: "all 0.3s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                e.currentTarget.style.borderColor = "rgba(16,181,145,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
            />
            <button
              onClick={() => handleSendMessage(input)}
              disabled={isLoading || !input.trim()}
              style={{
                padding: "14px 24px",
                background: "#10B981",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                opacity: isLoading || !input.trim() ? 0.5 : 1,
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim()) {
                  e.currentTarget.style.background = "#0ea572";
                  e.currentTarget.style.transform = "scale(1.02)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#10B981";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </div>
    );
  }

  // Chat view with messages
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      {/* 🔧 DEBUG BLOCK */}
      <div style={{
        background: "#f0f9ff",
        borderBottom: "2px solid #0284c7",
        padding: "12px 20px",
      }}>
        <div 
          onClick={() => setDebugExpanded(!debugExpanded)}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "600",
            fontSize: "12px",
            color: "#0284c7",
          }}
        >
          <span>{debugExpanded ? "▼" : "▶"}</span>
          🔧 DEBUG - Données envoyées à l'IA
        </div>
        
        {debugExpanded && (
          <div style={{
            marginTop: "12px",
            background: "white",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "11px",
            fontFamily: "monospace",
            border: "1px solid #cbd5e1",
            maxHeight: "300px",
            overflowY: "auto",
          }}>
            <div style={{ marginBottom: "8px", color: "#0284c7", fontWeight: "bold" }}>📊 RÉSUMÉ DES DONNÉES:</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "4px" }}>
                <div style={{ color: "#666" }}>Trades:</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#0284c7" }}>
                  {Array.isArray(trades) ? trades.length : 0}
                </div>
              </div>
              
              <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "4px" }}>
                <div style={{ color: "#666" }}>Strategies:</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#8b5cf6" }}>
                  {Array.isArray(strategies) ? strategies.length : 0}
                </div>
              </div>
              
              <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "4px" }}>
                <div style={{ color: "#666" }}>Strategy Stats:</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#ec4899" }}>
                  {Array.isArray(strategyStats) ? strategyStats.length : 0}
                </div>
              </div>
              
              <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "4px" }}>
                <div style={{ color: "#666" }}>Daily Notes:</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#f59e0b" }}>
                  {dailyNotes ? Object.keys(dailyNotes).length : 0}
                </div>
              </div>
              
              <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "4px" }}>
                <div style={{ color: "#666" }}>Journal Notes:</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#10b981" }}>
                  {Array.isArray(journalNotes) ? journalNotes.length : 0}
                </div>
              </div>
              
              <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "4px" }}>
                <div style={{ color: "#666" }}>User ID:</div>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#6366f1", wordBreak: "break-all" }}>
                  {userId ? (userId.substring(0, 12) + "...") : "N/A"}
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "8px" }}>
              <div style={{ color: "#0284c7", fontWeight: "bold", marginBottom: "4px" }}>📝 DÉTAILS:</div>
              
              {Array.isArray(trades) && trades.length > 0 && (
                <div style={{ marginBottom: "8px", color: "#475569" }}>
                  <strong>Trades (premiers 3):</strong>
                  <div style={{ marginLeft: "8px" }}>
                    {trades.slice(0, 3).map((t: any, i: number) => (
                      <div key={i} style={{ fontSize: "10px" }}>
                        • {t.symbol} {t.direction} @ {t.entry_time?.split('T')[0]}: P&L {t.pnl}$
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {Array.isArray(strategies) && strategies.length > 0 && (
                <div style={{ marginBottom: "8px", color: "#475569" }}>
                  <strong>Strategies:</strong>
                  <div style={{ marginLeft: "8px" }}>
                    {strategies.slice(0, 3).map((s: any, i: number) => (
                      <div key={i} style={{ fontSize: "10px" }}>
                        • {s.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {Array.isArray(strategyStats) && strategyStats.length > 0 && (
                <div style={{ marginBottom: "8px", color: "#475569" }}>
                  <strong>Strategy Stats (premiers 3):</strong>
                  <div style={{ marginLeft: "8px" }}>
                    {strategyStats.slice(0, 3).map((stat: any, i: number) => (
                      <div key={i} style={{ fontSize: "10px" }}>
                        • {stat.name}: {stat.tradeCount} trades, WR {stat.winRate}%, P&L {stat.totalPnL}$
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {dailyNotes && Object.keys(dailyNotes).length > 0 && (
                <div style={{ marginBottom: "8px", color: "#475569" }}>
                  <strong>Daily Notes (premières 3):</strong>
                  <div style={{ marginLeft: "8px" }}>
                    {Object.entries(dailyNotes).slice(0, 3).map(([date, note]: any, i: number) => (
                      <div key={i} style={{ fontSize: "10px" }}>
                        • {date}: {String(note).substring(0, 50)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {Array.isArray(journalNotes) && journalNotes.length > 0 && (
                <div style={{ color: "#475569" }}>
                  <strong>Journal Notes (premiers 2):</strong>
                  <div style={{ marginLeft: "8px" }}>
                    {journalNotes.slice(0, 2).map((note: any, i: number) => (
                      <div key={i} style={{ fontSize: "10px" }}>
                        • Trade {note.trade_id}: {note.notes?.substring(0, 40)}... [Émotions: {note.emotion_tags?.join(', ')}]
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "100%",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "slideIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "14px 18px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)"
                  : "white",
                color: msg.role === "user" ? "#fff" : "#1e293b",
                fontSize: "14px",
                lineHeight: "1.6",
                fontWeight: msg.role === "user" ? "600" : "400",
                boxShadow: msg.role === "user"
                  ? "0 4px 12px rgba(6, 182, 212, 0.3)"
                  : "0 2px 8px rgba(0, 0, 0, 0.08)",
                wordWrap: "break-word",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", paddingLeft: "4px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#06B6D4",
                animation: "loading 1.4s infinite",
              }}
            />
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#06B6D4",
                animation: "loading 1.4s infinite 0.2s",
              }}
            />
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#06B6D4",
                animation: "loading 1.4s infinite 0.4s",
              }}
            />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div style={{
        padding: "16px 20px",
        background: "white",
        borderTop: "1px solid rgba(203, 213, 225, 0.3)",
        borderBottom: "none",
      }}>
        <div style={{ display: "flex", gap: "12px", maxWidth: "100%" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
            placeholder="Votre message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "rgba(226, 232, 240, 0.5)",
              border: "1px solid rgba(203, 213, 225, 0.8)",
              borderRadius: "10px",
              color: "#1e293b",
              fontSize: "14px",
              outline: "none",
              transition: "all 0.2s",
              fontFamily: "inherit",
              opacity: isLoading ? 0.6 : 1,
            }}
            onFocus={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = "rgba(226, 232, 240, 1)";
                e.currentTarget.style.borderColor = "#06B6D4";
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = "rgba(226, 232, 240, 0.5)";
              e.currentTarget.style.borderColor = "rgba(203, 213, 225, 0.8)";
            }}
          />
          <button
            onClick={() => handleSendMessage(input)}
            disabled={isLoading || !input.trim()}
            style={{
              padding: "12px 28px",
              background: "#06B6D4",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              fontWeight: "700",
              fontSize: "13px",
              opacity: isLoading || !input.trim() ? 0.5 : 1,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && input.trim()) {
                e.currentTarget.style.background = "#0891B2";
                e.currentTarget.style.transform = "scale(1.02)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#06B6D4";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {isLoading ? "..." : "Envoyer"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes loading {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

