import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TradingAccountsManager from "@/components/TradingAccountsManager";

export default function TradingAccountsPage({ userId }) {
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const T = {
    white: "#FFFFFF",
    bg: "#F8FAFB",
    border: "#E3E6EB",
    text: "#1A1F2E",
    textSub: "#5F6B7E",
    accent: "#5F7FB4",
    accentBg: "#E3ECFB",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: T.bg,
      }}
    >
      <div
        style={{
          padding: "24px 32px",
          borderBottom: `1px solid ${T.border}`,
          background: T.white,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: T.text,
            margin: 0,
            marginBottom: 4,
          }}
        >
          💼 Comptes de Trading
        </h1>
        <p
          style={{
            fontSize: 13,
            color: T.textSub,
            margin: 0,
          }}
        >
          Gérez vos comptes de trading et organisez vos trades par compte
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: T.white,
        }}
      >
        <TradingAccountsManager
          userId={userId}
          onAccountSelect={setSelectedAccountId}
        />
      </div>
    </div>
  );
}
