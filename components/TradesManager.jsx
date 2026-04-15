"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/trades";

export default function TradesManager() {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ status: "all", symbol: "" });
  const [formData, setFormData] = useState({
    symbol: "",
    entry_price: "",
    exit_price: "",
    quantity: "",
    entry_date: "",
    exit_date: "",
    trade_type: "long",
    status: "open",
    notes: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  useEffect(() => {
    if (token) {
      fetchTrades();
      fetchStats();
    }
  }, [token, filters]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.symbol) params.append("symbol", filters.symbol);

      const response = await axios.get(`${API_URL}?${params}`, { headers });
      setTrades(response.data.trades);
    } catch (error) {
      setMessage("❌ Failed to load trades");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats/summary`, { headers });
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!formData.symbol || !formData.entry_date) {
        setMessage("❌ Symbol and entry date are required");
        return;
      }

      const payload = {
        ...formData,
        entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
      };

      await axios.post(API_URL, payload, { headers });
      setMessage("✅ Trade saved successfully");
      resetForm();
      fetchTrades();
      fetchStats();
    } catch (error) {
      setMessage("❌ Failed to save trade");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrade = async (id) => {
    if (!window.confirm("Delete this trade?")) return;

    try {
      await axios.delete(`${API_URL}/${id}`, { headers });
      setMessage("✅ Trade deleted");
      fetchTrades();
      fetchStats();
    } catch (error) {
      setMessage("❌ Failed to delete trade");
    }
  };

  const resetForm = () => {
    setFormData({
      symbol: "",
      entry_price: "",
      exit_price: "",
      quantity: "",
      entry_date: "",
      exit_date: "",
      trade_type: "long",
      status: "open",
      notes: "",
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-gray-600 text-sm">Total Trades</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_trades}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-gray-600 text-sm">Total P&L</p>
            <p
              className={`text-2xl font-bold ${
                stats.total_profit_loss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ${stats.total_profit_loss?.toFixed(2) || "0.00"}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-gray-600 text-sm">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_trades > 0
                ? (
                    ((stats.max_profit > 0 ? 1 : 0) / stats.total_trades) *
                    100
                  ).toFixed(1)
                : "0"}
              %
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.includes("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Add Trade Form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
        >
          + Add New Trade
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Add New Trade</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Symbol *</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="e.g., AAPL, ES"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Entry Price */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Entry Price</label>
              <input
                type="number"
                name="entry_price"
                value={formData.entry_price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Exit Price */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Exit Price</label>
              <input
                type="number"
                name="exit_price"
                value={formData.exit_price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Entry Date */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Entry Date *</label>
              <input
                type="date"
                name="entry_date"
                value={formData.entry_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Exit Date */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Exit Date</label>
              <input
                type="date"
                name="exit_date"
                value={formData.exit_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Trade Type */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Type</label>
              <select
                name="trade_type"
                value={formData.trade_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Trade notes..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition-colors"
              >
                {loading ? "Saving..." : "Save Trade"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <input
          type="text"
          placeholder="Search symbol..."
          value={filters.symbol}
          onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {trades.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p>No trades yet. Start by adding your first trade!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Entry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Exit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">P&L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{trade.symbol}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.trade_type === "long"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {trade.trade_type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">${trade.entry_price?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-700">${trade.exit_price?.toFixed(2) || "—"}</td>
                    <td className={`px-6 py-4 font-semibold ${
                      trade.profit_loss > 0 ? "text-green-600" : trade.profit_loss < 0 ? "text-red-600" : "text-gray-700"
                    }`}>
                      ${trade.profit_loss?.toFixed(2) || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.status === "open"
                          ? "bg-yellow-100 text-yellow-700"
                          : trade.status === "closed"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {trade.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
