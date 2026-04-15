"use client";

import React, { useState, useRef, useEffect } from "react";

interface ApexChatProps {
  userId: string;
  trades?: any[];
  journalNotes?: any[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ApexChat({ userId, trades = [], journalNotes = [] }: ApexChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Array.isArray(trades) && trades.length > 0) {
      console.log("🎯 ApexChat reçu trades:", trades.length, "trades");
    }
    if (Array.isArray(journalNotes) && journalNotes.length > 0) {
      console.log("📔 ApexChat reçu journal notes:", journalNotes.length, "notes");
    }
  }, [trades, journalNotes]);

  // Envoyer automatiquement le contexte du journal au chargement
  useEffect(() => {
    const initializeContext = async () => {
      // Attendre que les données soient disponibles
      if ((trades.length > 0 || journalNotes.length > 0) && messages.length === 0) {
        console.log("📡 Initialisation du contexte pour l'IA...");
        
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

        const payload = {
          messages: [
            {
              role: "user" as const,
              content: `Contexte initialisé - J'ai ${trades.length} trades et ${journalNotes.length} notes du journal à analyser.`,
            },
          ],
          userId: cleanString(userId || "unknown"),
          trades: cleanTrades,
          journalNotes: cleanJournalNotes,
        };

        try {
          const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            console.log("✅ Contexte initialisé - L'IA a accès aux données");
            setMessages([
              {
                role: "assistant",
                content: `✅ Contexte chargé - J'ai accès à vos ${trades.length} trades et ${journalNotes.length} notes du journal. Prêt à analyser!`,
              },
            ]);
          }
        } catch (err) {
          console.error("Erreur lors de l'initialisation:", err);
        }
      }
    };

    initializeContext();
  }, [trades, journalNotes, userId]);

  const prompts = [
    { category: "Trades", color: "#06B6D4", emoji: "📊", text: "Donne-moi le résumé de mes trades" },
    { category: "Analyse", color: "#8B5CF6", emoji: "📈", text: "Qu'est-ce qui amène le succès dans mon trading?" },
    { category: "Performance", color: "#EC4899", emoji: "🎯", text: "Où suis-je le plus rentable?" },
    { category: "Risque", color: "#F59E0B", emoji: "⚠️", text: "Où suis-je le moins rentable?" },
    { category: "Amélioration", color: "#10B981", emoji: "💡", text: "Comment améliorer mon trading?" },
    { category: "Stratégie", color: "#3B82F6", emoji: "🎲", text: "Comment améliorer ma stratégie?" },
    { category: "Diagnostic", color: "#06B6D4", emoji: "🔍", text: "Où je manque dans mon trading?" },
    { category: "Mindset", color: "#8B5CF6", emoji: "🧠", text: "Qu'est-ce qui me retient de faire plus?" },
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

      const payload = {
        messages: cleanMessages,
        userId: cleanString(userId || "unknown"),
        trades: cleanTrades,
        journalNotes: cleanJournalNotes,
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
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
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
          {/* Hero Section */}
          <div style={{
            textAlign: "center",
            marginBottom: "50px",
            maxWidth: "700px",
          }}>
            {/* Icon */}
            <div style={{
              fontSize: "80px",
              marginBottom: "24px",
              animation: "float 3s ease-in-out infinite",
            }}>
              ✨
            </div>

            {/* Main Title */}
            <h1 style={{
              fontSize: "42px",
              fontWeight: "800",
              marginBottom: "12px",
              background: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              margin: "0 0 12px 0",
            }}>
              Apex AI Coach
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: "18px",
              color: "#64748b",
              fontWeight: "500",
              marginBottom: "8px",
              margin: "0 0 8px 0",
            }}>
              Votre assistant personnel de trading
            </p>

            {/* Description */}
            <div style={{
              background: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(203, 213, 225, 0.8)",
              borderRadius: "12px",
              padding: "16px 20px",
              marginTop: "20px",
              color: "#475569",
              fontSize: "14px",
              lineHeight: "1.6",
            }}>
              📊 Analysez vos trades • 📈 Optimisez votre stratégie • 💡 Obtenez des insights
            </div>
          </div>

          {/* Suggestions Grid */}
          <div style={{
            width: "100%",
            maxWidth: "1100px",
          }}>
            <div style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#94a3b8",
              marginBottom: "24px",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}>
              📌 Questions suggérées
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
              width: "100%",
            }}>
              {prompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.text)}
                  style={{
                    background: "white",
                    border: "2px solid rgba(203, 213, 225, 0.8)",
                    borderRadius: "16px",
                    padding: "20px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    color: "#1e293b",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = prompt.color;
                    e.currentTarget.style.background = `${prompt.color}08`;
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = `0 12px 24px ${prompt.color}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(203, 213, 225, 0.8)";
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Category Badge */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <span style={{
                      fontSize: "16px",
                    }}>
                      {prompt.emoji}
                    </span>
                    <span style={{
                      background: prompt.color,
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      {prompt.category}
                    </span>
                  </div>

                  {/* Question Text */}
                  <div style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}>
                    {prompt.text}
                  </div>

                  {/* Arrow */}
                  <div style={{
                    fontSize: "18px",
                    marginTop: "8px",
                    color: prompt.color,
                    opacity: "0.6",
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
          padding: "20px",
          background: "white",
          borderTop: "1px solid rgba(203, 213, 225, 0.3)",
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
              placeholder="Posez votre question..."
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
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "rgba(226, 232, 240, 1)";
                e.currentTarget.style.borderColor = "#06B6D4";
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
                padding: "12px 32px",
                background: "#06B6D4",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                fontWeight: "700",
                fontSize: "14px",
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
              {isLoading ? "⏳" : "Envoyer"}
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
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        overflow: "hidden",
      }}
    >
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

