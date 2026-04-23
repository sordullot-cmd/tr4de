import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

export default function MultiAccountSelector({
  accounts = [],
  selectedAccountIds = [],
  onSelectionChange,
  onDeleteAccount,
  onCreateAccount,
  T = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleAccount = (accountId) => {
    let updatedIds;
    if (selectedAccountIds.includes(accountId)) {
      updatedIds = selectedAccountIds.filter((id) => id !== accountId);
    } else {
      updatedIds = [...selectedAccountIds, accountId];
    }
    onSelectionChange(updatedIds);
  };

  const handleSelectAll = () => {
    if (selectedAccountIds.length === accounts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(accounts.map((acc) => acc.id));
    }
  };

  const allSelected = accounts.length > 0 && selectedAccountIds.length === accounts.length;
  const displayText =
    selectedAccountIds.length === 0
      ? "Aucun compte"
      : allSelected
      ? `Tous les comptes (${accounts.length})`
      : selectedAccountIds.length === 1
      ? accounts.find((a) => a.id === selectedAccountIds[0])?.name || "1 compte"
      : `${selectedAccountIds.length} comptes`;

  return (
    <div style={{ position: "relative", minWidth: 180, fontFamily: "var(--font-sans)" }} ref={menuRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: "100%",
          padding: "7px 12px",
          height: 34,
          borderRadius: 8,
          background: "#FFFFFF",
          border: `1px solid ${isOpen ? "#D4D4D4" : "#E5E5E5"}`,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          color: "#0D0D0D",
          fontFamily: "inherit",
          transition: "border-color 120ms ease",
        }}
      >
        <span suppressHydrationWarning style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayText}
        </span>
        {isOpen ? <ChevronUp size={14} strokeWidth={2} color="#8E8E8E" /> : <ChevronDown size={14} strokeWidth={2} color="#8E8E8E" />}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#FFFFFF",
            border: "1px solid #E5E5E5",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            padding: 4,
          }}
        >
          {/* Tous les comptes */}
          {accounts.length > 0 && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
                color: "#0D0D0D",
                fontSize: 13,
                fontWeight: 500,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                style={{ width: 14, height: 14, accentColor: "#0D0D0D", cursor: "pointer", margin: 0, flexShrink: 0 }}
              />
              <span style={{ flex: 1 }}>Tous les comptes</span>
            </label>
          )}

          {/* Separateur */}
          {accounts.length > 0 && (
            <div style={{ height: 1, background: "#E5E5E5", margin: "4px 0" }} />
          )}

          {/* Section label */}
          {accounts.length > 0 && (
            <div
              style={{
                padding: "4px 10px 4px",
                fontSize: 11,
                color: "#8E8E8E",
                fontWeight: 500,
              }}
            >
              Mes comptes
            </div>
          )}

          {/* Items des comptes */}
          {accounts.map((account, idx) => {
            const isSelected = selectedAccountIds.includes(account.id);
            return (
              <React.Fragment key={account.id}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "#0D0D0D",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleAccount(account.id)}
                    style={{ width: 14, height: 14, accentColor: "#0D0D0D", cursor: "pointer", margin: 0, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {account.name}
                  </span>
                </label>
                {idx < accounts.length - 1 && (
                  <div style={{ height: 1, background: "#F0F0F0", margin: "0 8px" }} />
                )}
              </React.Fragment>
            );
          })}

          {accounts.length === 0 && (
            <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#8E8E8E" }}>
              Aucun compte
            </div>
          )}

          {/* Footer : Creation de compte */}
          {onCreateAccount && (
            <>
              {accounts.length > 0 && <div style={{ height: 1, background: "#E5E5E5", margin: "4px 0" }} />}
              <button
                onClick={() => { setIsOpen(false); onCreateAccount(); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  background: "transparent",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  color: "#0D0D0D",
                  fontSize: 13,
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <Plus size={14} strokeWidth={2} />
                Créer un compte
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
