"use client";

import React, { useMemo, useState, useRef } from "react";
import { Plus, FlaskConical, TrendingUp, ArrowDown, X, ImagePlus } from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { fmt } from "@/lib/ui/format";
import { useLang } from "@/lib/i18n";
import TradesPage from "@/components/pages/TradesPage";

const STORAGE_KEY = "tr4de_demo_trades";
const TIMEFRAME_OPTIONS = ["M1", "M5", "M15", "H1", "H4"];

const loadDemoTrades = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyDraft = () => ({
  date: todayIso(),
  symbol: "",
  direction: "Long",
  entry: "",
  exit: "",
  quantity: "",
  pnl: "",
  rr: "",
  description: "",
  image: null,
  timeframe: "",
  emotions: [],
  errors: [],
  strategyId: "",
  note: "",
});

// Sélecteur en pastilles (sens, unité de temps).
function Pills({ options, value, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 2, padding: 3, background: T.accentBg, borderRadius: 999 }}>
      {options.map((opt) => {
        const active = value === opt.v;
        return (
          <button key={opt.v} type="button" onClick={() => onSelect(opt.v)}
            style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "6px 10px", borderRadius: 999, border: "none", background: active ? T.white : "transparent", color: active ? (opt.color || T.text) : T.textMut, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>
            {opt.Icon && <opt.Icon size={12} strokeWidth={2.25} />} {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Champ de tags (émotions / erreurs) : chips + saisie libre.
function TagField({ tags, inputValue, setInputValue, onAdd, onRemove, placeholder, color }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 8px", background: T.white }}>
      {tags.map((tag) => (
        <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 999, background: `${color}14`, color, fontSize: 11, fontWeight: 600 }}>
          {tag}
          <button type="button" onClick={() => onRemove(tag)} aria-label="Retirer" style={{ background: "transparent", border: "none", cursor: "pointer", color, padding: 0, display: "inline-flex", alignItems: "center" }}>
            <X size={11} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(inputValue); } }}
        onBlur={() => onAdd(inputValue)}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={{ flex: 1, minWidth: 80, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", color: T.text }}
      />
    </div>
  );
}

export default function DemoTradePage({ strategies = [] }) {
  useLang();
  // Stockage isolé des trades démo (localStorage dédié).
  const [trades, setTrades] = useState(loadDemoTrades);
  const [draft, setDraft] = useState(emptyDraft);
  const [emotionInput, setEmotionInput] = useState("");
  const [errorInput, setErrorInput] = useState("");
  // Le formulaire s'ouvre désormais dans une modale via le bouton "Ajouter un trade".
  const [formOpen, setFormOpen] = useState(false);
  // Dropdown du sélecteur de stratégie (style panneau Trade info).
  const [stratOpen, setStratOpen] = useState(false);
  const imageInputRef = useRef(null);

  // Lit une image, la redimensionne (max 1200px, JPEG) puis la stocke en base64.
  // Le redimensionnement évite de saturer le localStorage des trades démo.
  const handleImageFile = (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        setDraft((d) => ({ ...d, image: canvas.toDataURL("image/jpeg", 0.8) }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const persist = (next) => {
    setTrades(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const num = (v) => {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const canAdd = draft.symbol.trim().length > 0 && num(draft.pnl) != null;

  const openForm = () => {
    setDraft(emptyDraft());
    setEmotionInput("");
    setErrorInput("");
    setStratOpen(false);
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);

  const addTag = (field, value, clear) => {
    const v = String(value).trim();
    if (!v) return;
    if (draft[field].includes(v)) { clear(""); return; }
    setDraft({ ...draft, [field]: [...draft[field], v] });
    clear("");
  };
  const removeTag = (field, value) => setDraft({ ...draft, [field]: draft[field].filter((x) => x !== value) });

  const addTrade = () => {
    if (!canAdd) return;
    const strat = strategies.find((s) => String(s.id) === String(draft.strategyId));
    const trade = {
      id: `${Date.now()}_${Math.round(Math.random() * 1e6)}`,
      date: draft.date || todayIso(),
      symbol: draft.symbol.trim().toUpperCase(),
      direction: draft.direction,
      entry: num(draft.entry),
      exit: num(draft.exit),
      quantity: num(draft.quantity),
      pnl: num(draft.pnl),
      rr: num(draft.rr),
      description: draft.description.trim(),
      image: draft.image || null,
      timeframe: draft.timeframe || null,
      emotions: draft.emotions,
      errors: draft.errors,
      strategyId: draft.strategyId || null,
      strategyName: strat ? strat.name : null,
      note: draft.note.trim(),
      createdAt: new Date().toISOString(),
    };
    persist([trade, ...trades]);
    setDraft(emptyDraft());
    setEmotionInput("");
    setErrorInput("");
    setFormOpen(false);
  };

  // TradesPage appelle onDeleteTrade(trade) ; on retrouve la ligne par son id.
  const removeTrade = (t) => {
    const id = t && typeof t === "object" ? t.id : t;
    persist(trades.filter((x) => x.id !== id));
  };

  const stats = useMemo(() => {
    const n = trades.length;
    const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins = trades.filter((t) => (t.pnl || 0) > 0).length;
    const winRate = n > 0 ? Math.round((wins / n) * 100) : 0;
    return { n, totalPnl, winRate };
  }, [trades]);

  // ---- styles formulaire (épuré) ----
  const inputStyle = { width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", color: T.text, background: T.white };
  const fieldLabel = { fontSize: 12, fontWeight: 600, color: T.textMut, marginBottom: 7, display: "block" };

  // Bouton "Ajouter un trade" (réutilisé dans le header et l'empty state).
  const addButton = (
    <button type="button" onClick={openForm}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", height: 34, borderRadius: 999, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
      <Plus size={14} strokeWidth={2} /> Ajouter un trade
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Trades démo</h1>
        <span style={{ fontSize: 12, color: T.textMut }}>Trades fictifs (non pris) — pour s’entraîner et en apprendre. Séparés de tes vrais trades.</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {addButton}
          <div id="tr4de-page-header-slot" />
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, background: T.border, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        {[
          { label: "Trades démo", value: String(stats.n) },
          { label: "P&L cumulé", value: `${stats.totalPnl >= 0 ? "+" : ""}${fmt(stats.totalPnl, true)}`, color: stats.totalPnl >= 0 ? T.green : T.red },
          { label: "Taux de réussite", value: `${stats.winRate}%` },
        ].map((s) => (
          <div key={s.label} style={{ background: T.white, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, color: s.color || T.text, fontFamily: "var(--font-sans)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* LAYOUT : tableau à gauche · panneau formulaire à droite (même emplacement
          que le panneau "Trade info" de la page Trades). */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {trades.length === 0 ? (
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "48px 40px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <FlaskConical size={22} strokeWidth={1.75} color={T.text} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6, letterSpacing: -0.1 }}>Aucun trade démo</div>
              <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20, maxWidth: 380, lineHeight: 1.5 }}>Ajoute un trade fictif pour t’entraîner — il n’apparaît pas dans tes vrais trades.</div>
              {addButton}
            </div>
          ) : (
            <TradesPage trades={trades} strategies={strategies} embedded onDeleteTrade={removeTrade} />
          )}
        </div>

        {/* PANNEAU FORMULAIRE — visuel calqué sur le bloc "Trade info" */}
        {formOpen && (() => {
          const isLong = draft.direction === "Long";
          const pnlNum = num(draft.pnl);
          const pnlColor = draft.pnl === "" || pnlNum == null ? T.text : (pnlNum >= 0 ? T.green : T.red);
          const sectionSep = { padding: "14px 16px", borderBottom: `1px solid ${T.border}` };
          const miniLabel = { fontSize: 11, color: T.textMut, marginBottom: 4, display: "block" };
          const heroNumInput = { width: "100%", padding: "4px 0", border: "none", borderBottom: `1px solid ${T.border}`, borderRadius: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.4, outline: "none", fontFamily: "var(--font-sans)", color: pnlColor, background: "transparent" };
          return (
          <div className="tr4de-trade-side" style={{ flex: "0 0 360px", width: 360, alignSelf: "flex-start", maxHeight: "calc(100vh - 200px)", background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* HEADER (identique au panneau Trade info) */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "var(--font-sans)" }}>Nouveau trade démo</span>
              <button type="button" onClick={closeForm} aria-label="Fermer" style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textMut, padding: 4, display: "inline-flex", alignItems: "center" }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* CONTENU SCROLLABLE */}
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

              {/* HERO ÉDITABLE — même mise en page que le hero du panneau Trade info */}
              <div style={{ padding: "16px 16px 18px", borderBottom: `1px solid ${T.border}` }}>
                {/* Symbole · sens · date */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <input type="text" autoFocus value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} placeholder="Symbole"
                    style={{ width: 120, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: 0.2, fontFamily: "var(--font-sans)", padding: 0 }} />
                  <button type="button" onClick={() => setDraft({ ...draft, direction: isLong ? "Short" : "Long" })}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: isLong ? `${T.green}14` : `${T.red}14`, color: isLong ? T.green : T.red, fontFamily: "inherit" }}>
                    {isLong ? <TrendingUp size={11} strokeWidth={2.25} /> : <ArrowDown size={11} strokeWidth={2.25} />}
                    {isLong ? "Long" : "Short"}
                  </button>
                  <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    style={{ marginLeft: "auto", border: "none", outline: "none", background: "transparent", fontSize: 12, color: T.textMut, fontFamily: "inherit", textAlign: "right" }} />
                </div>
                {/* P&L (héro) + RR */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 14, alignItems: "flex-end" }}>
                  <div>
                    <label style={miniLabel}>P&amp;L net</label>
                    <input type="number" step="any" value={draft.pnl} onChange={(e) => setDraft({ ...draft, pnl: e.target.value })} placeholder="0" style={heroNumInput} />
                  </div>
                  <div>
                    <label style={miniLabel}>RR</label>
                    <input type="number" step="any" value={draft.rr} onChange={(e) => setDraft({ ...draft, rr: e.target.value })} placeholder="—"
                      style={{ width: "100%", padding: "4px 0", border: "none", borderBottom: `1px solid ${T.border}`, borderRadius: 0, fontSize: 16, fontWeight: 600, outline: "none", fontFamily: "var(--font-sans)", color: T.text, background: "transparent" }} />
                  </div>
                </div>
              </div>

              {/* Capture d'écran — juste sous le hero */}
              <div style={sectionSep}>
                <label style={fieldLabel}>Capture d’écran</label>
                <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { handleImageFile(e.target.files?.[0]); e.target.value = ""; }} />
                {draft.image ? (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img src={draft.image} alt="Aperçu de la capture" style={{ display: "block", maxWidth: "100%", maxHeight: 180, borderRadius: 10, border: `1px solid ${T.border}` }} />
                    <button type="button" onClick={() => setDraft({ ...draft, image: null })} aria-label="Retirer l’image"
                      style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 999, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = T.text; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = T.border; handleImageFile(e.dataTransfer.files?.[0]); }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "20px 16px", border: `1px dashed ${T.border}`, borderRadius: 10, background: T.bg, cursor: "pointer", color: T.textSub, transition: "border-color .12s ease" }}>
                    <ImagePlus size={20} strokeWidth={1.75} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>Glisser une image ou cliquer pour ajouter</span>
                  </div>
                )}
              </div>

              {/* Stratégie — bouton + dropdown identiques au panneau Trade info */}
              <div style={{ ...sectionSep, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.5 }}>Stratégie</div>
                {(() => {
                  const selected = strategies.find((s) => String(s.id) === String(draft.strategyId));
                  if (selected) {
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: selected.color || T.accent, flexShrink: 0 }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</div>
                        <button type="button" onClick={() => setDraft({ ...draft, strategyId: "" })} aria-label="Enlever la stratégie"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textMut, padding: 4, display: "inline-flex", alignItems: "center", borderRadius: 6 }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; }}>
                          <X size={14} strokeWidth={2} />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div style={{ position: "relative", width: "100%", display: "flex" }}>
                      <button type="button" onClick={() => setStratOpen((v) => !v)}
                        style={{ width: "100%", padding: "8px 16px", borderRadius: 999, border: `1px solid ${T.border}`, background: T.white, fontSize: 13, fontWeight: 500, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background .12s ease", fontFamily: "var(--font-sans)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = T.white; }}>
                        <Plus size={14} strokeWidth={2.25} /> Ajouter une stratégie
                      </button>
                      {stratOpen && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 8, background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
                          {strategies.length === 0 ? (
                            <div style={{ padding: 12, textAlign: "center", fontSize: 11, color: T.textSub }}>Aucune stratégie</div>
                          ) : (
                            strategies.map((strat) => (
                              <button key={strat.id} type="button" onClick={() => { setDraft({ ...draft, strategyId: strat.id }); setStratOpen(false); }}
                                style={{ width: "100%", padding: "8px 12px", borderBottom: `1px solid ${T.border}`, background: T.white, border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6, transition: "all .2s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = T.white; }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: strat.color || T.accent }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{strat.name}</div>
                                  <div style={{ fontSize: 9, color: T.textSub }}>{strat.groups?.length || 0} groupe(s)</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Description */}
              <div style={sectionSep}>
                <label style={fieldLabel}>Description</label>
                <input type="text" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="ex: cassure du range d’ouverture" style={inputStyle} />
              </div>

              {/* Note */}
              <div style={sectionSep}>
                <label style={fieldLabel}>Note / ce que j’en apprends</label>
                <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Pourquoi ce trade, ce que tu retiens…" rows={3}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
              </div>
            </div>

            {/* ACTIONS (pied du panneau) */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
              <button type="button" onClick={closeForm}
                style={{ padding: "0 14px", height: 36, borderRadius: 999, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              <button type="button" onClick={addTrade} disabled={!canAdd}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 16px", height: 36, borderRadius: 999, background: canAdd ? T.text : T.bg, border: `1px solid ${canAdd ? T.text : T.border}`, color: canAdd ? "#fff" : T.textMut, fontSize: 13, fontWeight: 600, cursor: canAdd ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                <Plus size={14} strokeWidth={2} /> Ajouter
              </button>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
