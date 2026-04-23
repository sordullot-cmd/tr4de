import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import SearchableSelect from "@/components/ui/SearchableSelect";

const BROKER_ICONS = {
  tradovate: "/trado.png",
  mt5: "/MetaTrader_5.png",
  wealthcharts: "/weal.webp",
};

export default function QuickAccountSelector({
  selectedAccountName,
  onAccountNameChange,
  T = {}
}) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const supabase = createClient();

  const loadAccounts = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading accounts:", error);
        setAccounts([]);
        return;
      }

      setAccounts(data || []);
    } catch (err) {
      console.error("Error:", err);
      setAccounts([]);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [user?.id]);

  const handleChange = (id) => {
    if (id === "CREATE_NEW") {
      setShowCreateForm(true);
      setNewAccountName("");
      onAccountNameChange("");
    } else if (id === "") {
      onAccountNameChange("");
      setShowCreateForm(false);
    } else {
      onAccountNameChange(id);
      setShowCreateForm(false);
    }
  };

  const borderColor = T.border || "#E5E5E5";

  // Construit les options pour SearchableSelect
  const resolveBrokerIcon = (broker) => {
    if (!broker) return null;
    const key = String(broker).toLowerCase().trim();
    if (BROKER_ICONS[key]) return BROKER_ICONS[key];
    // Fallback heuristique
    if (key.includes("trado")) return BROKER_ICONS.tradovate;
    if (key.includes("mt5") || key.includes("meta")) return BROKER_ICONS.mt5;
    if (key.includes("wealth")) return BROKER_ICONS.wealthcharts;
    return null;
  };

  const options = [
    { id: "CREATE_NEW", label: "+ Ajouter un nouveau compte", isAction: true },
    ...accounts.map((acc) => {
      const brokerIcon = resolveBrokerIcon(acc.broker);
      const brokerName = acc.broker ? acc.broker.charAt(0).toUpperCase() + acc.broker.slice(1) : null;
      return {
        id: acc.name,
        label: acc.name,
        sublabel: brokerName ? `(${brokerName})` : undefined,
        iconUrl: brokerIcon,
      };
    }),
  ];

  return (
    <div>
      <SearchableSelect
        value={selectedAccountName || ""}
        onChange={handleChange}
        onOpen={loadAccounts}
        options={options}
        placeholder="Sélectionner un compte"
        searchPlaceholder="Rechercher un compte..."
        emptyLabel="Aucun compte"
        separated
      />

      {showCreateForm && (
        <div>
          <input
            type="text"
            placeholder="Nom du compte"
            value={newAccountName}
            onChange={(e) => {
              setNewAccountName(e.target.value);
            }}
            onBlur={() => {
              if (newAccountName.trim()) {
                onAccountNameChange(newAccountName.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowCreateForm(false);
                setNewAccountName("");
                onAccountNameChange("");
              }
              if (e.key === "Enter" && newAccountName.trim()) {
                onAccountNameChange(newAccountName.trim());
              }
            }}
            autoFocus
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              fontSize: 13,
              marginTop: 8,
              boxSizing: "border-box",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
