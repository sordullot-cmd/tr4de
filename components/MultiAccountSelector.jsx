import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

export default function MultiAccountSelector({
  accounts = [],
  selectedAccountIds = [],
  onSelectionChange,
  onDeleteAccount,
  onCreateAccount,
  T = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // account object ou null
  const [deleting, setDeleting] = useState(false);
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
          padding: "7px 14px",
          height: 34,
          borderRadius: 999,
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
            borderRadius: 16,
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
                borderRadius: 10,
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: 10,
                    fontFamily: "inherit",
                    color: "#0D0D0D",
                    fontSize: 13,
                    fontWeight: 500,
                    transition: "background .12s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; const btn = e.currentTarget.querySelector('[data-del-btn]'); if (btn) btn.style.opacity = 1; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; const btn = e.currentTarget.querySelector('[data-del-btn]'); if (btn) btn.style.opacity = 0; }}
                >
                  <label style={{display:"flex",alignItems:"center",gap:10,flex:1,cursor:"pointer",minWidth:0}}>
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
                  {onDeleteAccount && (
                    <button
                      data-del-btn
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(account); }}
                      title="Supprimer ce compte"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 22, height: 22, border: "none", background: "transparent",
                        cursor: "pointer", color: "#8E8E8E", borderRadius: 4, flexShrink: 0,
                        opacity: 0, transition: "opacity .15s ease, background .12s ease, color .12s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.background = "#FEF2F2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#8E8E8E"; e.currentTarget.style.background = "transparent"; }}
                    >
                      <Trash2 size={12} strokeWidth={1.75}/>
                    </button>
                  )}
                </div>
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

          {/* Modale de confirmation suppression compte */}
          {confirmDelete && typeof document !== "undefined" && ReactDOM.createPortal(
            <div onClick={()=>!deleting && setConfirmDelete(null)}
              style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)",padding:"24px"}}>
              <div onClick={(e)=>e.stopPropagation()}
                style={{background:"#FFFFFF",borderRadius:14,maxWidth:420,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,0.22)",border:"1px solid #E5E5E5",overflow:"hidden"}}>
                <div style={{padding:"20px 24px 8px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Trash2 size={16} strokeWidth={1.75} color="#EF4444"/>
                  </div>
                  <h3 style={{fontSize:15,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1}}>
                    Supprimer le compte « {confirmDelete.name} » ?
                  </h3>
                </div>
                <div style={{padding:"4px 24px 20px",fontSize:13,color:"#5C5C5C",lineHeight:1.5}}>
                  Cette action est <strong style={{color:"#0D0D0D"}}>définitive</strong>. Tous les trades associés à ce compte seront aussi supprimés et ne pourront pas être récupérés.
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #F0F0F0",background:"#FAFAFA"}}>
                  <button onClick={()=>setConfirmDelete(null)} disabled={deleting}
                    style={{padding:"0 16px",height:36,borderRadius:8,border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#0D0D0D",fontSize:13,fontWeight:500,cursor: deleting ? "not-allowed" : "pointer",fontFamily:"inherit",opacity: deleting ? 0.5 : 1}}>
                    Annuler
                  </button>
                  <button
                    onClick={async ()=>{
                      if (!onDeleteAccount) return;
                      setDeleting(true);
                      try { await onDeleteAccount(confirmDelete.id); }
                      catch (e) { console.error("delete account failed:", e); }
                      finally { setDeleting(false); setConfirmDelete(null); setIsOpen(false); }
                    }}
                    disabled={deleting}
                    style={{padding:"0 16px",height:36,borderRadius:8,border:"1px solid #EF4444",background:"#EF4444",color:"#FFFFFF",fontSize:13,fontWeight:600,cursor: deleting ? "not-allowed" : "pointer",fontFamily:"inherit",opacity: deleting ? 0.7 : 1}}>
                    {deleting ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
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
                  borderRadius: 10,
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
