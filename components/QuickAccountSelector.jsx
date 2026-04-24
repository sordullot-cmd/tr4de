import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { ChevronDown, ChevronUp, Search, Check, Plus, Pencil } from "lucide-react";

// Map id (lowercase) → chemin du logo. Utilisé pour afficher l'icône à gauche
// du compte dans le dropdown.
const BROKER_ICONS = {
  tradovate: "/trado.png",
  mt5: "/MetaTrader_5.png",
  "metatrader 5": "/MetaTrader_5.png",
  wealthcharts: "/weal.webp",
  rithmic: "/brokers/rithmic.png",
  "rithmic r|trader": "/brokers/rithmic.png",
  ninjatrader: "/brokers/ninja%20trader.png",
  topstep: "/brokers/Topstep_Logo.jpg",
  "topstep x": "/brokers/Topstep_Logo.jpg",
  ftmo: "/brokers/ftmo.png",
  tradingview: "/brokers/tradingview.webp",
  mt4: "/brokers/MetaTrader_4.png",
  "metatrader 4": "/brokers/MetaTrader_4.png",
  thinkorswim: "/brokers/thinkorswim.png",
  ibkr: "/brokers/Interactive%20broker.png",
  "interactive brokers": "/brokers/Interactive%20broker.png",
  capitalcom: "/brokers/capital.png",
  "capital.com": "/brokers/capital.png",
  ig: "/brokers/if%20logo.png",
  webull: "/brokers/webull.png",
};

export default function QuickAccountSelector({
  selectedAccountName,
  onAccountNameChange,
  T = {},
}) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const supabase = createClient();
  const containerRef = useRef(null);

  const loadAccounts = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) { console.error("Error loading accounts:", error); setAccounts([]); return; }
      setAccounts(data || []);
    } catch (err) { console.error(err); setAccounts([]); }
  };
  useEffect(() => {
    loadAccounts();
    // Réagit aux mises à jour de comptes (ex: changement de broker dans AddTradePage)
    const onAccountsChanged = () => loadAccounts();
    window.addEventListener("tr4de:accounts-changed", onAccountsChanged);
    return () => window.removeEventListener("tr4de:accounts-changed", onAccountsChanged);
  }, [user?.id]);

  // Click outside
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const resolveBrokerIcon = (broker) => {
    if (!broker) return null;
    const key = String(broker).toLowerCase().trim();
    if (BROKER_ICONS[key]) return BROKER_ICONS[key];
    // Heuristiques de fallback
    if (key.includes("trado"))   return BROKER_ICONS.tradovate;
    if (key.includes("mt5"))     return BROKER_ICONS.mt5;
    if (key.includes("mt4"))     return BROKER_ICONS.mt4;
    if (key.includes("meta"))    return BROKER_ICONS.mt5;
    if (key.includes("wealth"))  return BROKER_ICONS.wealthcharts;
    if (key.includes("rithmic")) return BROKER_ICONS.rithmic;
    if (key.includes("ninja"))   return BROKER_ICONS.ninjatrader;
    if (key.includes("topstep")) return BROKER_ICONS.topstep;
    if (key.includes("ftmo"))    return BROKER_ICONS.ftmo;
    if (key.includes("trading view") || key.includes("tradingview")) return BROKER_ICONS.tradingview;
    if (key.includes("think"))   return BROKER_ICONS.thinkorswim;
    if (key.includes("interactive") || key === "ibkr") return BROKER_ICONS.ibkr;
    if (key.includes("capital")) return BROKER_ICONS.capitalcom;
    if (key === "ig" || key.startsWith("ig "))  return BROKER_ICONS.ig;
    if (key.includes("webull"))  return BROKER_ICONS.webull;
    return null;
  };

  const filtered = query
    ? accounts.filter(a => (a.name || "").toLowerCase().includes(query.toLowerCase()))
    : accounts;

  const queryTrim = query.trim();
  const exactMatch = accounts.some(a => (a.name || "").toLowerCase() === queryTrim.toLowerCase());
  const showCreate = queryTrim.length > 0 && !exactMatch;

  const selected = accounts.find(a => a.name === selectedAccountName);

  const commitCreate = () => {
    if (!queryTrim) return;
    onAccountNameChange(queryTrim);
    setOpen(false);
    setQuery("");
  };

  const commitEdit = async (acc) => {
    const newName = editDraft.trim();
    if (!newName || newName === acc.name) { setEditingId(null); return; }
    try {
      const { error } = await supabase
        .from("trading_accounts")
        .update({ name: newName })
        .eq("id", acc.id)
        .eq("user_id", user?.id);
      if (error) { console.error("rename failed:", error.message); return; }
      // Si le compte renommé est le compte sélectionné, mettre à jour le nom sélectionné
      if (selectedAccountName === acc.name) onAccountNameChange(newName);
      await loadAccounts();
    } catch (e) { console.error(e); }
    setEditingId(null);
  };

  const borderColor = T.border || "#E5E5E5";

  return (
    <div ref={containerRef} style={{ position: "relative", fontFamily: "var(--font-sans)" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", border: `1px solid ${open ? "#D4D4D4" : borderColor}`,
          borderRadius: 8, background: "#FFFFFF",
          color: selected ? "#0D0D0D" : "#8E8E8E",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          fontFamily: "inherit", textAlign: "left",
          transition: "border-color 120ms ease",
        }}
      >
        {selected ? (
          <>
            {resolveBrokerIcon(selected.broker) && (
              <img src={resolveBrokerIcon(selected.broker)} alt="" style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.name}
            </span>
          </>
        ) : (
          <span style={{ flex: 1 }}>{selectedAccountName || "Sélectionner un compte"}</span>
        )}
        {open ? <ChevronUp size={14} color="#8E8E8E"/> : <ChevronDown size={14} color="#8E8E8E"/>}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 100,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* Search / Create input */}
          <div style={{ padding: 8, borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
              <Search size={13} color="#8E8E8E" />
              <input
                type="text" autoFocus value={query}
                onChange={(e)=>setQuery(e.target.value)}
                onKeyDown={(e)=>{ if (e.key === "Enter" && showCreate) { e.preventDefault(); commitCreate(); } }}
                placeholder="Rechercher ou taper le nom d'un nouveau compte..."
                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, padding: "6px 0", color: "#0D0D0D", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Liste */}
          <div className="scroll-thin" style={{ overflowY: "auto", maxHeight: 280, padding: 4 }}>
            {/* Option Créer (apparaît dynamiquement quand la requête ne matche aucun compte) */}
            {showCreate && (
              <button
                type="button"
                onClick={commitCreate}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", border: "none", background: "transparent",
                  color: "#0D0D0D", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  fontFamily: "inherit", textAlign: "left", borderRadius: 6,
                }}
                onMouseEnter={(e)=>{e.currentTarget.style.background = "#F5F5F5"}}
                onMouseLeave={(e)=>{e.currentTarget.style.background = "transparent"}}
              >
                <Plus size={14} strokeWidth={2}/>
                <span>Créer « <strong>{queryTrim}</strong> »</span>
              </button>
            )}

            {filtered.length === 0 && !showCreate && (
              <div style={{ padding: "12px 14px", fontSize: 12, color: "#8E8E8E", textAlign: "center" }}>
                Aucun compte
              </div>
            )}

            {filtered.map((acc) => {
              const isSelected = acc.name === selectedAccountName;
              const isEditing = editingId === acc.id;
              const icon = resolveBrokerIcon(acc.broker);
              return (
                <div
                  key={acc.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px", borderRadius: 6,
                    background: isSelected ? "#F0F0F0" : "transparent",
                    transition: "background 100ms ease",
                  }}
                  onMouseEnter={(e)=>{ if (!isSelected) e.currentTarget.style.background = "#F5F5F5"; const btn = e.currentTarget.querySelector('[data-edit]'); if (btn) btn.style.opacity = 1; }}
                  onMouseLeave={(e)=>{ if (!isSelected) e.currentTarget.style.background = "transparent"; const btn = e.currentTarget.querySelector('[data-edit]'); if (btn) btn.style.opacity = 0; }}
                >
                  <button
                    type="button"
                    onClick={()=>{
                      if (isEditing) return;
                      onAccountNameChange(acc.name);
                      setOpen(false);
                      setQuery("");
                    }}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 8,
                      padding: 0, border: "none", background: "transparent",
                      cursor: isEditing ? "text" : "pointer",
                      color: "#0D0D0D", fontSize: 13, fontWeight: isSelected ? 600 : 500,
                      fontFamily: "inherit", textAlign: "left", minWidth: 0,
                    }}
                  >
                    {icon && <img src={icon} alt="" style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }}/>}
                    {isEditing ? (
                      <input
                        type="text" autoFocus value={editDraft}
                        onChange={(e)=>setEditDraft(e.target.value)}
                        onClick={(e)=>e.stopPropagation()}
                        onBlur={()=>commitEdit(acc)}
                        onKeyDown={(e)=>{ if (e.key === "Enter") commitEdit(acc); if (e.key === "Escape") setEditingId(null); }}
                        style={{ flex: 1, padding: "2px 6px", fontSize: 13, border: "1px solid #0D0D0D", borderRadius: 4, outline: "none", fontFamily: "inherit", color: "#0D0D0D", background: "#FFFFFF", minWidth: 0 }}
                      />
                    ) : (
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {acc.name}
                      </span>
                    )}
                    {acc.broker && !isEditing && (
                      <span style={{ color: "#8E8E8E", fontSize: 12, fontWeight: 400 }}>
                        ({String(acc.broker).charAt(0).toUpperCase() + String(acc.broker).slice(1)})
                      </span>
                    )}
                  </button>
                  {!isEditing && (
                    <span
                      data-edit
                      role="button"
                      title="Renommer"
                      onClick={(e)=>{ e.stopPropagation(); setEditingId(acc.id); setEditDraft(acc.name); }}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 22, height: 22, borderRadius: 4, cursor: "pointer",
                        color: "#8E8E8E", opacity: 0, transition: "opacity .15s ease, background .12s ease, color .12s ease",
                      }}
                      onMouseEnter={(e)=>{e.currentTarget.style.background = "#E5E5E5"; e.currentTarget.style.color = "#0D0D0D"}}
                      onMouseLeave={(e)=>{e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8E8E8E"}}
                    >
                      <Pencil size={12} strokeWidth={1.75}/>
                    </span>
                  )}
                  {isSelected && !isEditing && <Check size={14} color="#0D0D0D"/>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
