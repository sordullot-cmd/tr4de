import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";

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

  // Charger les comptes existants depuis Supabase
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from("trading_accounts")
          .select("*")
          .eq("user_id", user?.id)
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

    if (user?.id) {
      loadAccounts();
    }
  }, [user?.id]);

  const handleSelectChange = (e) => {
    const value = e.target.value;
    if (value === "CREATE_NEW") {
      setShowCreateForm(true);
      setNewAccountName("");
      onAccountNameChange(""); // Vider le compte sélectionné
    } else if (value === "") {
      onAccountNameChange("");
      setShowCreateForm(false);
    } else {
      onAccountNameChange(value);
      setShowCreateForm(false);
    }
  };

  const borderColor = T.border || "#E3E6EB";
  const bgColor = T.bg || "#F8FAFB";
  const textColor = T.text || "#1A1F2E";
  const accentColor = T.accent || "#5F7FB4";

  return (
    <div>
      {/* Sélecteur de compte */}
      <select
        value={selectedAccountName || ""}
        onChange={handleSelectChange}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: `1px solid ${borderColor}`,
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "inherit",
          backgroundColor: "white",
        }}
      >
        <option value="">{showCreateForm ? "Ajouter un nouveau compte" : "-- Sélectionnez un compte --"}</option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.name}>
            📊 {acc.name}
          </option>
        ))}
        {!showCreateForm && <option value="CREATE_NEW">➕ Créer un nouveau compte</option>}
      </select>

      {/* Formulaire de création */}
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
              // Mettre à jour le parent seulement quand on quitte l'input
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
              padding: "6px 8px",
              border: `1px solid ${borderColor}`,
              borderRadius: 4,
              fontSize: 12,
              marginTop: 12,
              boxSizing: "border-box",
            }}
          />
        </div>
      )}
    </div>
  );
}
