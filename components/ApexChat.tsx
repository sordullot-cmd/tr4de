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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Log when trades and other data are received
  useEffect(() => {
    if (Array.isArray(trades) && trades.length > 0) {
      console.log("🎯 ApexChat reçu trades:", trades.length, "trades");
      console.log("   Sample trade:", trades[0]);
    } else {
      console.log("⚠️ ApexChat: Pas de trades reçus (trades.length =", trades?.length || 0, ")");
    }
    if (Array.isArray(journalNotes) && journalNotes.length > 0) {
      console.log("📔 ApexChat reçu journal notes:", journalNotes.length, "notes");
      console.log("   Sample note:", journalNotes[0]);
    }
    if (Array.isArray(strategies) && strategies.length > 0) {
      console.log("📊 ApexChat reçu strategies:", strategies.length, "stratégies");
      console.log("   Sample strategy:", strategies[0]);
    }
    if (Array.isArray(strategyStats) && strategyStats.length > 0) {
      console.log("📈 ApexChat reçu strategy stats:", strategyStats.length, "stats");
      console.log("   Sample stat:", strategyStats[0]);
    }
    if (dailyNotes && Object.keys(dailyNotes).length > 0) {
      console.log("📅 ApexChat reçu daily notes:", Object.keys(dailyNotes).length, "notes");
    }
  }, [trades, journalNotes, strategies, strategyStats, dailyNotes]);

  // Envoyer automatiquement le contexte avec toutes les données au chargement
  useEffect(() => {
    const initializeContext = async () => {
      // Attendre que les données soient disponibles
      if ((trades.length > 0 || journalNotes.length > 0 || strategies.length > 0) && messages.length === 0) {
        console.log("📡 Initialisation du contexte complet pour l'IA...");
        
        // Nettoyer rigoureusement toutes les strings
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
          const bodyStr = JSON.stringify(payload, (key, value) => {
            if (typeof value === "string") {
              return cleanString(value);
            }
            return value;
          });

          console.log("📊 Contexte envoyé - Stratégies:", cleanStrategyStats.length, ", Daily Notes:", Object.keys(cleanDailyNotes).length);

          const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: bodyStr,
          });

          if (response.ok) {
            console.log("✅ Contexte complet initialisé - L'IA a accès à toutes les données");
            // Message automatique désactivé - le chat reste vide jusqu'à la première question
          }
        } catch (err) {
          console.error("Erreur lors de l'initialisation:", err);
        }
      }
    };

    initializeContext();
  }, [trades, journalNotes, strategies, strategyStats, dailyNotes, userId]);

  const suggestions = [
    { text: "Donne-moi une analyse de mon trading", badge: "Trades", color: "#10B981" },
    { text: "Qu'est-ce qui m'apporte le plus de succès", badge: "Trades", color: "#10B981" },
    { text: "Où suis-je le plus rentable", badge: "Net P&L", color: "#3B82F6" },
    { text: "Où suis-je le moins rentable", badge: "Net P&L", color: "#3B82F6" },
    { text: "Comment peux-je améliorer mon trading", badge: "Profit", color: "#F59E0B" },
    { text: "Comment peux-je améliorer ma stratégie", badge: "Profit", color: "#F59E0B" },
    { text: "Qu'est-ce qui me manque dans mon trading", badge: "Trades", color: "#10B981" },
    { text: "Qu'est-ce qui m'empêche de gagner plus", badge: "Net P&L", color: "#3B82F6" },
    { text: "Analyse ma dernière session", badge: "Profit", color: "#F59E0B" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Add user message
    const newMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      console.log("📤 Envoi du message:", messageText);
      
      // Nettoyer rigoureusement toutes les strings
      const cleanString = (str: any): string => {
        if (!str) return "";
        const s = String(str);
        // Remplacer les caractères problématiques
        return s
          .replace(/[\n\r\t]/g, " ") // Remplacer les retours à la ligne par des espaces
          .replace(/[\\"]/g, m => m === '"' ? '\\"' : m === '\\' ? '\\\\' : m) // Échapper les guillemets et backslash
          .replace(/[\x00-\x1F\x7F]/g, ""); // Supprimer les caractères de contrôle
      };

      // Construire les messages sans caractères problématiques
      const cleanMessages = messages.concat(newMessage).map((m, i) => {
        console.log(`  Message ${i}: ${m.role} - ${m.content.substring(0, 50)}...`);
        return {
          role: m.role as "user" | "assistant",
          content: cleanString(m.content),
        };
      });

      // Construire les trades avec nettoyage strict
      const cleanTrades = Array.isArray(trades) ? trades.map((t: any) => ({
        id: cleanString(t?.id),
        pnl: Number(t?.pnl) || 0,
        setup_name: cleanString(t?.setup_name || "Unknown"),
        entry_time: cleanString(t?.entry_time || new Date().toISOString()),
        quantity: Number(t?.quantity) || 0,
        symbol: cleanString(t?.symbol || ""),
        direction: cleanString(t?.direction || ""),
      })) : [];

      // Construire les notes du journal avec nettoyage strict
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

      console.log("📊 Données à envoyer:");
      console.log("   - Trades:", cleanTrades.length);
      console.log("   - Journal Notes:", cleanJournalNotes.length);
      console.log("   - Strategies:", cleanStrategies.length);
      console.log("   - Strategy Stats:", cleanStrategyStats.length);
      console.log("   - Daily Notes:", Object.keys(cleanDailyNotes).length);
      if (cleanJournalNotes.length > 0) {
        console.log("   - Première note:", cleanJournalNotes[0]);
      }

      const payload = {
        messages: cleanMessages,
        userId: cleanString(userId || "unknown"),
        trades: cleanTrades,
        journalNotes: cleanJournalNotes,
        strategies: cleanStrategies,
        strategyStats: cleanStrategyStats,
        dailyNotes: cleanDailyNotes,
      };

      console.log("📦 Payload complet:", JSON.stringify(payload).length, "bytes");

      // Sérialiser avec un replacer personnalisé
      let bodyStr: string;
      try {
        bodyStr = JSON.stringify(payload, (key, value) => {
          if (typeof value === "string") {
            return cleanString(value);
          }
          return value;
        });
        
        console.log("✓ JSON généré, size:", bodyStr.length, "bytes");
        console.log("✓ Premiers 200 chars:", bodyStr.substring(0, 200));
        
        // Double-check: essayer de parser
        JSON.parse(bodyStr);
        console.log("✓ JSON valide et parsable");
      } catch (parseErr) {
        console.error("❌ Erreur sérialisation JSON:", parseErr);
        console.error("Payload causant erreur:", payload);
        throw new Error(`Erreur sérialisation: ${(parseErr as Error).message}`);
      }

      console.log("📡 Envoi au serveur...");
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: bodyStr,
      });

      console.log("📥 Réponse status:", response.status);

      if (!response.ok) {
        console.error("❌ Erreur du serveur:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error body:", errorText);
        throw new Error(`Erreur du serveur: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      console.log("Content-Type:", contentType);

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        const content = String(data?.content || data?.error || "Pas de contenu").substring(0, 1000);
        console.log("✓ Réponse reçue:", content);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content || data.error || "Pas de contenu" },
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

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullResponse },
        ]);
      } else {
        const text = await response.text();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: text },
        ]);
      }
    } catch (error) {
      console.error("❌ ERREUR:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("Message d'erreur complet:", errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Erreur: ${errorMsg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setShowSuggestions(false);
    handleSendMessage(suggestion);
  };

  const T = {
    white: "#FFFFFF",
    bg: "#F8FAFB",
    border: "#E3E6EB",
    text: "#1A1F2E",
    textSub: "#5F6B7E",
    textMut: "#8B95AA",
    accent: "#5F7FB4",
    accentBg: "#E3ECFB",
    green: "#4A9D6F",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "transparent",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        style={{
          display: "flex",
          padding: "20px 40px",
          background: "transparent",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "700px",
          }}
        >          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: T.text,
              margin: "40px 0 12px 0",
              textAlign: "center",
            }}
          >
            En quoi puis-je vous aider ?
          </h2>          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(input);
              }
            }}
            placeholder="Pose une question..."
            style={{
              width: "100%",
              padding: "12px 12px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 11,
              outline: "none",
              fontFamily: "inherit",
              minHeight: "120px",
              resize: "none",
              textAlign: "left",
              boxSizing: "border-box",
              background: "transparent",
            }}
            disabled={isLoading}
          />
        </div>
      </form>

      {/* Messages */}
      <div
        style={{
          flex: messages.length > 0 ? 1 : 0,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.map((message, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
              animation: "fadeIn 0.3s ease-in",
            }}
          >
            <div
              style={{
                background:
                  message.role === "user" ? T.accent : T.accentBg,
                color:
                    message.role === "user" ? T.white : T.text,
                  padding: "10px 14px",
                  borderRadius: 8,
                  maxWidth: "70%",
                  fontSize: 13,
                  lineHeight: 1.4,
                  wordWrap: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              >
                {message.content}
              </div>
            </div>
          ))
        }

        {isLoading && (
          <div
            style={{
              display: "flex",
              gap: 4,
              fontSize: 16,
              color: T.textMut,
            }}
          >
            <span>●</span>
            <span style={{ animation: "blink 1s infinite 0.2s" }}>●</span>
            <span style={{ animation: "blink 1s infinite 0.4s" }}>●</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && messages.length === 0 && (
        <div
          style={{
            padding: "20px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              color: "#333",
              marginBottom: 20,
              fontWeight: 600,
              textAlign: "center",
              letterSpacing: 0.5,
            }}
          >
            Questions posées pour vous
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              maxWidth: "700px",
              width: "100%",
            }}
          >
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestion(suggestion.text)}
              style={{
                padding: "16px",
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 8,
                fontSize: 11,
                color: "#333333",
                cursor: "pointer",
                fontWeight: 500,
                transition: "all 0.2s",
                minHeight: "100px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                gap: 12,
                textAlign: "left",
                lineHeight: "1.4",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "#f5f5f5";
                (e.target as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "#ffffff";
                (e.target as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.1)";
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 9,
                      padding: "3px 6px",
                      background: "#f0f0f0",
                      color: "#666",
                      borderRadius: 3,
                      fontWeight: 600,
                      width: "fit-content",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {suggestion.badge}
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 14 }}>→</span>
                </div>
                <span style={{ flex: 1, fontSize: 11, color: "#333" }}>{suggestion.text}</span>
              </div>
            </button>
          ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

