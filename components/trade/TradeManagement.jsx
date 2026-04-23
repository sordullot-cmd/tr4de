"use client";

import { useState, useMemo } from "react";
import { getLocalDateString } from "@/lib/dateUtils";

const INITIAL_TRADES = [
  {
    id: 1,
    date: "2026-03-31",
    symbol: "NQ",
    direction: "Long",
    setup: "Break & Retest",
    entry: 19842,
    exit: 19920,
    pnl: 312,
    rr: 2.1,
    hold: "4m 12s",
    emotion: "Calm",
    quantity: 1,
    status: "closed",
  },
  {
    id: 2,
    date: "2026-03-31",
    symbol: "ES",
    direction: "Short",
    setup: "Supply Zone",
    entry: 5290,
    exit: 5268,
    pnl: 440,
    rr: 2.4,
    hold: "6m 30s",
    emotion: "Focused",
    quantity: 1,
    status: "closed",
  },
  {
    id: 3,
    date: "2026-03-31",
    symbol: "NQ",
    direction: "Long",
    setup: "VWAP Reclaim",
    entry: 19760,
    exit: 19742,
    pnl: -180,
    rr: -0.8,
    hold: "2m 05s",
    emotion: "FOMO",
    quantity: 1,
    status: "closed",
  },
];

export default function TradeManagement() {
  const [trades, setTrades] = useState(INITIAL_TRADES);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    symbol: "",
    direction: "Long",
    setup: "",
    entry: "",
    exit: "",
    quantity: 1,
    emotion: "Neutral",
  });

  const filteredTrades = useMemo(() => {
    let result = [...trades];

    if (filter !== "all") {
      result = result.filter((t) => t.status === filter);
    }

    result.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date) - new Date(a.date);
      }
      if (sortBy === "pnl") {
        return b.pnl - a.pnl;
      }
      if (sortBy === "rr") {
        return b.rr - a.rr;
      }
      return 0;
    });

    return result;
  }, [trades, filter, sortBy]);

  const stats = useMemo(() => {
    const validTrades = trades.filter((t) => t.status === "closed");
    const winners = validTrades.filter((t) => t.pnl > 0);
    const losers = validTrades.filter((t) => t.pnl < 0);
    const totalPnL = validTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnL = (totalPnL / (validTrades.length || 1)).toFixed(2);
    const winRate = (
      (winners.length / (validTrades.length || 1)) *
      100
    ).toFixed(1);

    return {
      total: validTrades.length,
      winners: winners.length,
      losers: losers.length,
      winRate,
      totalPnL,
      avgPnL,
    };
  }, [trades]);

  const handleAddTrade = () => {
    if (!formData.symbol || !formData.entry || !formData.exit) return;

    const entry = parseFloat(formData.entry);
    const exit = parseFloat(formData.exit);
    const pnl = formData.direction === "Long" 
      ? ((exit - entry) * formData.quantity).toFixed(2)
      : ((entry - exit) * formData.quantity).toFixed(2);

    const newTrade = {
      id: Math.max(...trades.map((t) => t.id), 0) + 1,
      date: getLocalDateString(),
      ...formData,
      entry: parseFloat(entry),
      exit: parseFloat(exit),
      pnl: parseFloat(pnl),
      rr: 1.5,
      hold: "0m 0s",
      quantity: parseInt(formData.quantity),
      status: "closed",
    };

    if (editingId) {
      setTrades(
        trades.map((t) => (t.id === editingId ? newTrade : t))
      );
      setEditingId(null);
    } else {
      setTrades([...trades, newTrade]);
    }

    setFormData({
      symbol: "",
      direction: "Long",
      setup: "",
      entry: "",
      exit: "",
      quantity: 1,
      emotion: "Neutral",
    });
    setShowForm(false);
  };

  const handleDeleteTrade = (id) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce trade?")) {
      setTrades(trades.filter((t) => t.id !== id));
    }
  };

  const handleEditTrade = (trade) => {
    setFormData({
      symbol: trade.symbol,
      direction: trade.direction,
      setup: trade.setup,
      entry: trade.entry.toString(),
      exit: trade.exit.toString(),
      quantity: trade.quantity,
      emotion: trade.emotion,
    });
    setEditingId(trade.id);
    setShowForm(true);
  };

  return (
    <div className="trade-management">
      <style>{`
        .trade-management {
          padding: 24px;
          background: #F7F8FA;
          min-height: 100vh;
          font-family: var(--font-sans);
        }

        .management-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .management-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0F0F1A;
          margin: 0;
        }

        .btn-primary {
          background: #6366F1;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          background: #4F46E5;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .management-content {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
        }

        .management-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stats-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #E8E9EF;
        }

        .stats-card h3 {
          font-size: 13px;
          font-weight: 700;
          color: #A0A1B0;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          last:margin-bottom: 0;
        }

        .stat-item:last-child {
          margin-bottom: 0;
        }

        .stat-item-label {
          font-size: 13px;
          color: #6B6C80;
        }

        .stat-item-value {
          font-size: 16px;
          font-weight: 700;
          color: #0F0F1A;
        }

        .stat-item-value.positive {
          color: #22C55E;
        }

        .stat-item-value.negative {
          color: #EF4444;
        }

        .filter-group {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #E8E9EF;
        }

        .filter-title {
          font-size: 13px;
          font-weight: 700;
          color: #A0A1B0;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .filter-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-btn {
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #D4D6DF;
          background: white;
          color: #6B6C80;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          text-align: left;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          background: #F7F8FA;
          border-color: #B4B6C0;
        }

        .filter-btn.active {
          background: #6366F1;
          color: white;
          border-color: #6366F1;
        }

        .trades-panel {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #E8E9EF;
        }

        .trades-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .trades-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: #0F0F1A;
          margin: 0;
        }

        .sort-select {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #D4D6DF;
          background: white;
          color: #0F0F1A;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
        }

        .trades-table {
          width: 100%;
          border-collapse: collapse;
          overflow-x: auto;
        }

        .trades-table th {
          text-align: left;
          padding: 12px;
          font-size: 12px;
          font-weight: 700;
          color: #A0A1B0;
          border-bottom: 1px solid #E8E9EF;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          background: #F7F8FA;
        }

        .trades-table td {
          padding: 12px;
          border-bottom: 1px solid #E8E9EF;
          font-size: 13px;
          color: #0F0F1A;
        }

        .trades-table tr:hover {
          background: #F7F8FA;
        }

        .trade-symbol {
          font-weight: 700;
          color: #6366F1;
        }

        .trade-direction {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .trade-direction.long {
          background: #DBEAFE;
          color: #0369A1;
        }

        .trade-direction.short {
          background: #FEE2E2;
          color: #991B1B;
        }

        .trade-pnl {
          font-weight: 700;
        }

        .trade-pnl.positive {
          color: #22C55E;
        }

        .trade-pnl.negative {
          color: #EF4444;
        }

        .trade-actions {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: none;
          background: #EEF2FF;
          color: #6366F1;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-action:hover {
          background: #6366F1;
          color: white;
        }

        .btn-action.delete:hover {
          background: #EF4444;
          color: white;
        }

        .form-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .form-modal {
          background: white;
          border-radius: 12px;
          padding: 24px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .form-modal h2 {
          font-size: 20px;
          font-weight: 700;
          color: #0F0F1A;
          margin: 0 0 16px 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #0F0F1A;
          margin-bottom: 6px;
        }

        .form-input,
        .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #D4D6DF;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          color: #0F0F1A;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #6366F1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .btn-cancel {
          background: #E8E9EF;
          color: #0F0F1A;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover {
          background: #D4D6DF;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #A0A1B0;
        }

        .empty-state-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        @media (max-width: 1024px) {
          .management-content {
            grid-template-columns: 1fr;
          }

          .management-sidebar {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .management-sidebar > * {
            grid-column: auto !important;
          }
        }
      `}</style>

      <div className="management-header">
        <h1>💼 Gestion des Trades</h1>
        <button className="btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({
            symbol: "",
            direction: "Long",
            setup: "",
            entry: "",
            exit: "",
            quantity: 1,
            emotion: "Neutral",
          });
          setShowForm(true);
        }}>
          + Nouveau Trade
        </button>
      </div>

      <div className="management-content">
        <div className="management-sidebar">
          <div className="stats-card">
            <h3>📊 Statistiques</h3>
            <div className="stat-item">
              <span className="stat-item-label">Total Trades</span>
              <span className="stat-item-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">Win Rate</span>
              <span className="stat-item-value positive">{stats.winRate}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">Gagnants</span>
              <span className="stat-item-value positive">{stats.winners}</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">Perdants</span>
              <span className="stat-item-value negative">{stats.losers}</span>
            </div>
            <div className="stat-item" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #E8E9EF" }}>
              <span className="stat-item-label">Total P&L</span>
              <span className={`stat-item-value ${stats.totalPnL >= 0 ? "positive" : "negative"}`}>
                ${stats.totalPnL >= 0 ? "+" : ""}{stats.totalPnL}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">Moyen P&L</span>
              <span className={`stat-item-value ${stats.avgPnL >= 0 ? "positive" : "negative"}`}>
                ${stats.avgPnL >= 0 ? "+" : ""}{stats.avgPnL}
              </span>
            </div>
          </div>

          <div className="filter-group">
            <h3 className="filter-title">📋 Filtrer</h3>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                Tous Les Trades
              </button>
              <button
                className={`filter-btn ${filter === "closed" ? "active" : ""}`}
                onClick={() => setFilter("closed")}
              >
                Fermés
              </button>
              <button
                className={`filter-btn ${filter === "open" ? "active" : ""}`}
                onClick={() => setFilter("open")}
              >
                Ouverts
              </button>
            </div>
          </div>
        </div>

        <div className="trades-panel">
          <div className="trades-header">
            <h2>
              {filter === "all" && "Tous Les Trades"}
              {filter === "closed" && "Trades Fermés"}
              {filter === "open" && "Trades Ouverts"}
            </h2>
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Trier par Date</option>
              <option value="pnl">Trier par P&L</option>
              <option value="rr">Trier par R/R</option>
            </select>
          </div>

          {filteredTrades.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="trades-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbole</th>
                    <th>Direction</th>
                    <th>Setup</th>
                    <th>Entrée</th>
                    <th>Sortie</th>
                    <th>P&L</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id}>
                      <td>{trade.date}</td>
                      <td className="trade-symbol">{trade.symbol}</td>
                      <td>
                        <span className={`trade-direction ${trade.direction.toLowerCase()}`}>
                          {trade.direction === "Long" ? "📈 Long" : "📉 Short"}
                        </span>
                      </td>
                      <td>{trade.setup}</td>
                      <td>{trade.entry}</td>
                      <td>{trade.exit}</td>
                      <td className={`trade-pnl ${trade.pnl >= 0 ? "positive" : "negative"}`}>
                        ${trade.pnl >= 0 ? "+" : ""}{trade.pnl}
                      </td>
                      <td>
                        <div className="trade-actions">
                          <button
                            className="btn-action"
                            onClick={() => handleEditTrade(trade)}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-action delete"
                            onClick={() => handleDeleteTrade(trade.id)}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>Aucun trade trouvé</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="form-overlay" onClick={() => setShowForm(false)}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Modifier Trade" : "Nouveau Trade"}</h2>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Symbole *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ex: NQ, ES"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Direction *</label>
                <select
                  className="form-select"
                  value={formData.direction}
                  onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                >
                  <option>Long</option>
                  <option>Short</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Entrée *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="1000"
                  step="0.01"
                  value={formData.entry}
                  onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sortie *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="1010"
                  step="0.01"
                  value={formData.exit}
                  onChange={(e) => setFormData({ ...formData, exit: e.target.value })}
                />
              </div>

              <div className="form-group full">
                <label className="form-label">Setup</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ex: Break & Retest"
                  value={formData.setup}
                  onChange={(e) => setFormData({ ...formData, setup: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantité</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Émotion</label>
                <select
                  className="form-select"
                  value={formData.emotion}
                  onChange={(e) => setFormData({ ...formData, emotion: e.target.value })}
                >
                  <option>Calm</option>
                  <option>Focused</option>
                  <option>FOMO</option>
                  <option>Revenge</option>
                  <option>Neutral</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    symbol: "",
                    direction: "Long",
                    setup: "",
                    entry: "",
                    exit: "",
                    quantity: 1,
                    emotion: "Neutral",
                  });
                }}
              >
                Annuler
              </button>
              <button className="btn-primary" onClick={handleAddTrade}>
                {editingId ? "Mettre à Jour" : "Créer"} Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
