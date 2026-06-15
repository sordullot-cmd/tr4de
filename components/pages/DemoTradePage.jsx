"use client";

import React, { useMemo, useState } from "react";
import { Plus, Trash2, FlaskConical, TrendingUp, ArrowDown, X } from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { fmt } from "@/lib/ui/format";
import { useLang } from "@/lib/i18n";

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
  // Stockage isolé des vrais trades (localStorage dédié).
  const [trades, setTrades] = useState(loadDemoTrades);
  const [draft, setDraft] = useState(emptyDraft);
  const [emotionInput, setEmotionInput] = useState("");
  const [errorInput, setErrorInput] = useState("");

  const persist = (next) => {
    setTrades(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const num = (v) => {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const canAdd = draft.symbol.trim().length > 0 && num(draft.pnl) != null;

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
      timeframe: draft.timeframe || null,
      emotions: draft.emotions,
      errors: draft.errors,
      strategyId: draft.strategyId || null,
      strategyName: strat ? strat.name : null,
      note: draft.note.trim(),
      createdAt: new Date().toISOString(),
    };
    persist([trade, ...trades]);
    setDraft({ ...emptyDraft(), date: trade.date, symbol: trade.symbol });
    setEmotionInput("");
    setErrorInput("");
  };

  const removeTrade = (id) => persist(trades.filter((t) => t.id !== id));

  const stats = useMemo(() => {
    const n = trades.length;
    const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins = trades.filter((t) => (t.pnl || 0) > 0).length;
    const winRate = n > 0 ? Math.round((wins / n) * 100) : 0;
    return { n, totalPnl, winRate };
  }, [trades]);

  const sorted = useMemo(
    () => trades.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt))),
    [trades]
  );

  // ---- styles ----
  const sectionPad = "14px 16px";
  const sep = { borderBottom: `1px solid ${T.border}` };
  const label = { fontSize: 11, fontWeight: 600, color: T.textMut, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 };
  const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white };
  const fieldLabel = { fontSize: 11, color: T.textMut, marginBottom: 5, display: "block" };
  const th = { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.textMut, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.4 };
  const td = { padding: "10px 12px", fontSize: 13, color: T.text, whiteSpace: "nowrap" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Trades démo</h1>
        <span style={{ fontSize: 12, color: T.textMut }}>Trades fictifs (non pris) — pour s’entraîner et en apprendre. Séparés de tes vrais trades.</span>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
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

      {/* FORMULAIRE — visuel proche du panneau "Trade info" (sections séparées) */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, ...sep }}>
          <FlaskConical size={16} strokeWidth={1.75} color={T.text} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Nouveau trade démo</span>
        </div>

        {/* Données de base */}
        <div style={{ padding: sectionPad, ...sep }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            <div>
              <label style={fieldLabel}>Date</label>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabel}>Symbole</label>
              <input type="text" value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} placeholder="ES, NQ, EURUSD…" style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabel}>Sens</label>
              <Pills
                options={[{ v: "Long", color: T.green, Icon: TrendingUp, label: "Long" }, { v: "Short", color: T.red, Icon: ArrowDown, label: "Short" }]}
                value={draft.direction}
                onSelect={(v) => setDraft({ ...draft, direction: v })}
              />
            </div>
            <div>
              <label style={fieldLabel}>Prix d’entrée</label>
              <input type="number" step="any" value={draft.entry} onChange={(e) => setDraft({ ...draft, entry: e.target.value })} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabel}>Prix de sortie</label>
              <input type="number" step="any" value={draft.exit} onChange={(e) => setDraft({ ...draft, exit: e.target.value })} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabel}>Lots / Contrats</label>
              <input type="number" step="any" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabel}>P&amp;L (net)</label>
              <input type="number" step="any" value={draft.pnl} onChange={(e) => setDraft({ ...draft, pnl: e.target.value })} placeholder="ex: 120 ou -45" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Unité de temps */}
        <div style={{ padding: sectionPad, ...sep }}>
          <div style={label}>Unité de temps</div>
          <Pills
            options={TIMEFRAME_OPTIONS.map((tf) => ({ v: tf, label: tf }))}
            value={draft.timeframe}
            onSelect={(v) => setDraft({ ...draft, timeframe: draft.timeframe === v ? "" : v })}
          />
        </div>

        {/* Émotions */}
        <div style={{ padding: sectionPad, ...sep }}>
          <div style={label}>Émotions ressenties</div>
          <TagField tags={draft.emotions} inputValue={emotionInput} setInputValue={setEmotionInput} onAdd={(v) => addTag("emotions", v, setEmotionInput)} onRemove={(v) => removeTag("emotions", v)} placeholder="ex: FOMO, confiance, stress… (Entrée pour ajouter)" color={T.blue} />
        </div>

        {/* Erreurs */}
        <div style={{ padding: sectionPad, ...sep }}>
          <div style={label}>Erreurs commises</div>
          <TagField tags={draft.errors} inputValue={errorInput} setInputValue={setErrorInput} onAdd={(v) => addTag("errors", v, setErrorInput)} onRemove={(v) => removeTag("errors", v)} placeholder="ex: entrée trop tôt, SL trop serré… (Entrée pour ajouter)" color={T.red} />
        </div>

        {/* Stratégie */}
        <div style={{ padding: sectionPad, ...sep }}>
          <div style={label}>Stratégie</div>
          <select value={draft.strategyId} onChange={(e) => setDraft({ ...draft, strategyId: e.target.value })}
            style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
            <option value="">— Aucune —</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div style={{ padding: sectionPad, ...sep }}>
          <div style={label}>Note / ce que j’en apprends</div>
          <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Pourquoi ce trade, ce que tu retiens…" rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
          <button type="button" onClick={addTrade} disabled={!canAdd}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", height: 36, borderRadius: 999, background: canAdd ? T.text : T.bg, border: `1px solid ${canAdd ? T.text : T.border}`, color: canAdd ? "#fff" : T.textMut, fontSize: 13, fontWeight: 600, cursor: canAdd ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            <Plus size={14} strokeWidth={2} /> Ajouter le trade démo
          </button>
        </div>
      </div>

      {/* LISTE DES TRADES DÉMO */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.text }}>Mes trades démo</div>
        {sorted.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: T.textSub, fontSize: 13 }}>
            Aucun trade démo pour le moment — ajoute-en un avec le formulaire ci-dessus.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Symbole</th>
                  <th style={th}>Sens</th>
                  <th style={{ ...th, textAlign: "right" }}>Entrée</th>
                  <th style={{ ...th, textAlign: "right" }}>Sortie</th>
                  <th style={{ ...th, textAlign: "center" }}>Lots</th>
                  <th style={{ ...th, textAlign: "right" }}>P&amp;L</th>
                  <th style={{ ...th, textAlign: "center" }}>TF</th>
                  <th style={th}>Stratégie</th>
                  <th style={th}>Tags</th>
                  <th style={th}>Note</th>
                  <th style={{ ...th, textAlign: "center", width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => {
                  const isLong = String(t.direction).toLowerCase().includes("long");
                  return (
                    <tr key={t.id} style={{ borderBottom: i < sorted.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <td style={{ ...td, color: T.textSub, fontSize: 12 }}>{new Date(t.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{t.symbol}</td>
                      <td style={td}><span style={{ color: isLong ? T.green : T.red, fontWeight: 600 }}>{isLong ? "Long" : "Short"}</span></td>
                      <td style={{ ...td, textAlign: "right", color: T.textSub }}>{t.entry != null ? t.entry : "—"}</td>
                      <td style={{ ...td, textAlign: "right", color: T.textSub }}>{t.exit != null ? t.exit : "—"}</td>
                      <td style={{ ...td, textAlign: "center", color: T.textSub }}>{t.quantity != null ? t.quantity : "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 600, color: (t.pnl || 0) >= 0 ? T.green : T.red, fontFamily: "var(--font-sans)" }}>{(t.pnl || 0) >= 0 ? "+" : ""}{fmt(t.pnl || 0, true)}</td>
                      <td style={{ ...td, textAlign: "center", color: T.textSub }}>{t.timeframe || "—"}</td>
                      <td style={{ ...td, color: T.textSub, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }} title={t.strategyName || ""}>{t.strategyName || "—"}</td>
                      <td style={{ ...td }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 200 }}>
                          {(t.emotions || []).map((e) => <span key={`e-${e}`} style={{ fontSize: 10, fontWeight: 600, color: T.blue, background: `${T.blue}14`, padding: "1px 6px", borderRadius: 999 }}>{e}</span>)}
                          {(t.errors || []).map((e) => <span key={`x-${e}`} style={{ fontSize: 10, fontWeight: 600, color: T.red, background: `${T.red}14`, padding: "1px 6px", borderRadius: 999 }}>{e}</span>)}
                          {(t.emotions || []).length === 0 && (t.errors || []).length === 0 && <span style={{ color: T.textMut }}>—</span>}
                        </div>
                      </td>
                      <td style={{ ...td, color: T.textSub, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={t.note}>{t.note || "—"}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <button type="button" onClick={() => removeTrade(t.id)} aria-label="Supprimer"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textMut, padding: 4, borderRadius: 6, display: "inline-flex", alignItems: "center" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = T.textMut; }}>
                          <Trash2 size={14} strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
