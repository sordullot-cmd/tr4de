import React, { useState, useRef, useEffect } from "react";

export default function MultiAccountSelector({ 
  accounts = [],
  selectedAccountIds = [],
  onSelectionChange,
  onDeleteAccount,
  T = {} 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const borderColor = T.border || "#E3E6EB";
  const bgColor = T.bg || "#F8FAFB";
  const textColor = T.text || "#1A1F2E";
  const accentColor = T.accent || "#5F7FB4";

  // Fermer le menu quand on clique ailleurs
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
      updatedIds = selectedAccountIds.filter(id => id !== accountId);
    } else {
      updatedIds = [...selectedAccountIds, accountId];
    }
    console.log("🔄 Account selection changed:", updatedIds);
    onSelectionChange(updatedIds);
  };

  const handleSelectAll = () => {
    if (selectedAccountIds.length === accounts.length) {
      // Décocher tous
      onSelectionChange([]);
    } else {
      // Cocher tous
      onSelectionChange(accounts.map(acc => acc.id));
    }
  };

  const displayText = selectedAccountIds.length === 0 
    ? "No accounts" 
    : selectedAccountIds.length === accounts.length
    ? `All accounts (${accounts.length})`
    : `${selectedAccountIds.length} account${selectedAccountIds.length > 1 ? 's' : ''}`;

  return (
    <div style={{ position: "relative", minWidth: "160px" }} ref={menuRef}>
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: "#fff",
          border: `1px solid ${borderColor}`,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          minWidth: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: textColor,
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => e.target.style.borderColor = accentColor}
        onMouseLeave={(e) => e.target.style.borderColor = borderColor}
      >
        <span suppressHydrationWarning>{displayText}</span>
        <span style={{ fontSize: 10, marginLeft: 4 }}>∨</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 8,
            background: "#fff",
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            zIndex: 100,
            minWidth: "200px",
            maxHeight: "400px",
            overflowY: "auto"
          }}
        >
          {/* All accounts option */}
          {accounts.length > 0 && (
          <div
            style={{
              padding: "8px 12px",
              borderBottom: `1px solid ${borderColor}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              background: selectedAccountIds.length === accounts.length ? "#f0f0f0" : "transparent"
            }}
            onClick={handleSelectAll}
          >
            <input
              type="checkbox"
              checked={selectedAccountIds.length === accounts.length && accounts.length > 0}
              readOnly
              style={{ cursor: "pointer" }}
            />
            <label style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", flex: 1 }}>
              All accounts
            </label>
          </div>
          )}

          {/* My accounts header */}
          {accounts.length > 0 && (
            <div
              style={{
                padding: "8px 12px",
                fontSize: 10,
                fontWeight: 700,
                color: "#999",
                textTransform: "uppercase",
                background: bgColor,
                borderBottom: `1px solid ${borderColor}`
              }}
            >
              My accounts
            </div>
          )}

          {/* Account items */}
          {accounts.map((account) => {
            const isSelected = selectedAccountIds.includes(account.id);
            return (
              <div
                key={account.id}
                style={{
                  padding: "8px 12px",
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: isSelected ? "#f5f5f5" : "transparent",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? "#f5f5f5" : "transparent"}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleAccount(account.id)}
                  style={{ cursor: "pointer" }}
                />
                <label style={{ fontSize: 12, cursor: "pointer", flex: 1 }}>
                  {account.name}
                  {account.broker && (
                    <span style={{ fontSize: 10, color: "#999", marginLeft: 6 }}>
                      ({account.broker})
                    </span>
                  )}
                </label>
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAccount(account.id);
                    }}
                    title="Delete"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      color: "#999",
                      padding: "2px 4px"
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            );
          })}

          {accounts.length === 0 && (
            <div
              style={{
                padding: "12px",
                textAlign: "center",
                fontSize: 12,
                color: "#999"
              }}
            >
              No accounts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
