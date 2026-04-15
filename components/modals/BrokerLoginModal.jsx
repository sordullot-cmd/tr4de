"use client";

import { useState } from "react";

export default function BrokerLoginModal({ onConnected, onClose }) {
  const [broker, setBroker] = useState("tradovate");
  const [credentials, setCredentials] = useState({
    apiKey: "",
    apiSecret: "",
    accountId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let endpoint = "";
      let body = {};
      
      if (broker === "tradovate") {
        endpoint = `/brokers/tradovate/connect`;
        body = credentials;
      } else if (broker === "vantage") {
        endpoint = `/brokers/vantage/connect`;
        body = {}; // MT5 n'a pas besoin de credentials
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Connection failed");
      }

      onConnected(broker);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const T = {
    white: "#FFFFFF",
    bg: "#F8FAFB",
    border: "#E3E6EB",
    text: "#1A1F2E",
    textMut: "#8B95AA",
    accent: "#5F7FB4",
    accentBg: "#E3ECFB",
    accentBd: "#B8CCEB",
    red: "#AD6B6B",
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: T.white,
        borderRadius: 16,
        padding: 32,
        maxWidth: 420,
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Connect Broker
        </h2>
        <p style={{ fontSize: 14, color: T.textMut, marginBottom: 24 }}>
          Enter your broker credentials to sync real trades
        </p>

        <form onSubmit={handleConnect}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: T.textMut, fontWeight: 500 }}>
              Broker
            </label>
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                fontSize: 13,
                marginTop: 6,
              }}
            >
              <option value="tradovate">Tradovate (Futures)</option>
              <option value="vantage">Vantage MT5 (Forex/CFD)</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: T.textMut, fontWeight: 500 }}>
              API Key
            </label>
            <input
              type="password"
              value={credentials.apiKey}
              onChange={(e) =>
                setCredentials({ ...credentials, apiKey: e.target.value })
              }
              placeholder="Your Tradovate API Key"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                fontSize: 13,
                marginTop: 6,
                boxSizing: "border-box",
                display: broker === "tradovate" ? "block" : "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: T.textMut, fontWeight: 500 }}>
              API Secret
            </label>
            <input
              type="password"
              value={credentials.apiSecret}
              onChange={(e) =>
                setCredentials({ ...credentials, apiSecret: e.target.value })
              }
              placeholder="Your Tradovate API Secret"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                fontSize: 13,
                marginTop: 6,
                boxSizing: "border-box",
                display: broker === "tradovate" ? "block" : "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: T.textMut, fontWeight: 500 }}>
              Account ID
            </label>
            <input
              type="text"
              value={credentials.accountId}
              onChange={(e) =>
                setCredentials({ ...credentials, accountId: e.target.value })
              }
              placeholder="Your Tradovate Account ID"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                fontSize: 13,
                marginTop: 6,
                boxSizing: "border-box",
                display: broker === "tradovate" ? "block" : "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: 12,
              borderRadius: 8,
              background: "#FEE2E2",
              border: `1px solid #FECDD3`,
              color: T.red,
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.white,
                fontSize: 13,
                fontWeight: 600,
                color: T.text,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: T.accent,
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Connecting..." : "Connect"}
            </button>
          </div>
        </form>

        <div style={{
          marginTop: 20,
          paddingTop: 20,
          borderTop: `1px solid ${T.border}`,
          fontSize: 11,
          color: T.textMut,
          lineHeight: 1.6,
        }}>
          {broker === "tradovate" ? (
            <>
              <strong>How to get Tradovate API keys:</strong>
              <ol style={{ marginTop: 8, paddingLeft: 16 }}>
                <li>Log in to Tradovate</li>
                <li>Go to Account → API Settings</li>
                <li>Generate new API credentials</li>
                <li>Copy API Key, Secret, and Account ID here</li>
              </ol>
            </>
          ) : (
            <>
              <strong>How to connect MetaTrader 5:</strong>
              <ol style={{ marginTop: 8, paddingLeft: 16 }}>
                <li>Open MetaTrader 5 on your computer</li>
                <li>Connect your Vantage account via MT5</li>
                <li>Keep MT5 running in the background</li>
                <li>Click Connect - API will auto-detect your account</li>
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
