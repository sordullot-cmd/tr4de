"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import ApexChat from "@/components/ApexChat";
import AgentNotifications from "@/components/AgentNotifications";
import TradeForm from "@/components/TradeForm";

export default function Agentia({ trades: initialTrades = [] }) {
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState(initialTrades);
  const [journalNotes, setJournalNotes] = useState([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id || "demo-" + Math.random().toString(36).substr(2, 9));
      } catch (err) {
        setUserId("demo-" + Math.random().toString(36).substr(2, 9));
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [supabase]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || userId.startsWith("demo-")) return;

      try {
        const { data: tradesData } = await supabase
          .from("trades").select("*").eq("user_id", userId).order("entry_time", { ascending: false });
        if (tradesData) setTrades(tradesData);

        const { data: notesData } = await supabase
          .from("trade_details").select("*").eq("user_id", userId);
        if (notesData) setJournalNotes(notesData);
      } catch (err) {
        console.error("Error:", err);
      }
    };
    fetchData();
  }, [userId, supabase]);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) setAuthError(error.message);
      else setShowAuth(false);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const renderTrade = (trade) => (
    <div key={trade.id} className="p-4 bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-lg hover:border-cyan-500 transition-all">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-400">Symbole</p>
          <p className="text-lg font-bold text-cyan-400">{trade.symbol}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">P&L</p>
          <p className={`text-lg font-bold ${trade.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            ${trade.pnl?.toFixed(2) || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Entrée</p>
          <p className="text-sm text-white">{trade.entry_price}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Heure</p>
          <p className="text-sm text-slate-300">{new Date(trade.entry_time).toLocaleString("fr-FR")}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400 text-lg">Initialisation APEX...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">⚡</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              APEX TRADING AI
            </h1>
          </div>
          <button
            onClick={() => setShowAuth(!showAuth)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all"
          >
            {userId?.startsWith("demo-") ? "Mode Démo" : "Profil"}
          </button>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold text-cyan-400 mb-4">Connexion</h2>
            <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded mb-3 text-white" />
            <input type="password" placeholder="Mot de passe" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded mb-3 text-white" />
            {authError && <p className="text-red-400 text-sm mb-3">{authError}</p>}
            <div className="flex gap-2">
              <button onClick={handleLogin} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-medium">Se connecter</button>
              <button onClick={() => setShowAuth(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white font-medium">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-0">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-6 py-3 font-medium transition-all border-b-2 ${
              activeTab === "chat"
                ? "text-cyan-400 border-cyan-400"
                : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
          >
            💬 Agent IA
          </button>
          <button
            onClick={() => setActiveTab("trades")}
            className={`px-6 py-3 font-medium transition-all border-b-2 ${
              activeTab === "trades"
                ? "text-cyan-400 border-cyan-400"
                : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
          >
            📊 Mes Trades ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab("addtrade")}
            className={`px-6 py-3 font-medium transition-all border-b-2 ${
              activeTab === "addtrade"
                ? "text-cyan-400 border-cyan-400"
                : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
          >
            ➕ Ajouter Trade
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "chat" && (
          <div className="animate-fadeIn">
            <ApexChat userId={userId} trades={trades} journalNotes={journalNotes} />
          </div>
        )}

        {activeTab === "trades" && (
          <div className="animate-fadeIn">
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Total Trades</p>
                <p className="text-3xl font-bold text-cyan-400">{trades.length}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Win Rate</p>
                <p className="text-3xl font-bold text-green-400">
                  {trades.length > 0
                    ? ((trades.filter((t) => t.pnl > 0).length / trades.length) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Total P&L</p>
                <p className={`text-3xl font-bold ${
                  trades.reduce((sum, t) => sum + (t.pnl || 0), 0) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}>
                  ${trades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {trades.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Aucun trade enregistré</p>
              ) : (
                trades.map((trade) => renderTrade(trade))
              )}
            </div>
          </div>
        )}

        {activeTab === "addtrade" && (
          <div className="animate-fadeIn">
            <TradeForm userId={userId} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>APEX Trading AI © 2026 | Coach IA Spécialisé en Trading</p>
        </div>
      </footer>

      <AgentNotifications />
    </div>
  );
}
