"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Image as ImageIcon, Quote, Target as TargetIcon, X } from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B", purple: "#A855F7",
};

const STORAGE_KEY = "tr4de_vision_board";

const TYPES = [
  { id: "goal",   label: "Objectif chiffré", icon: TargetIcon, color: "#10A37F" },
  { id: "quote",  label: "Citation",         icon: Quote,       color: "#A855F7" },
  { id: "image",  label: "Image (URL)",      icon: ImageIcon,   color: "#3B82F6" },
];

function defaultCards() {
  return [
    { id: 1, type: "quote", text: "« La discipline est le pont entre les objectifs et les accomplissements. » — Jim Rohn" },
    { id: 2, type: "goal",  text: "Atteindre 100k$ de profits cette année" },
  ];
}

export default function VisionBoardPage() {
  const [cards, setCards] = useState(() => {
    if (typeof window === "undefined") return defaultCards();
    try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return Array.isArray(s) && s.length ? s : defaultCards(); } catch { return defaultCards(); }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "goal", text: "", url: "" });

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); } catch {} }, [cards]);

  const add = () => {
    if (form.type === "image") {
      if (!form.url.trim()) return;
      setCards(prev => [{ id: Date.now(), type: "image", url: form.url.trim(), text: form.text.trim() }, ...prev]);
    } else {
      if (!form.text.trim()) return;
      setCards(prev => [{ id: Date.now(), type: form.type, text: form.text.trim() }, ...prev]);
    }
    setForm({ type: "goal", text: "", url: "" });
    setShowForm(false);
  };
  const remove = (id) => setCards(prev => prev.filter(c => c.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Vision Board</h1>
        <button onClick={() => setShowForm(true)}
          style={{ marginLeft: "auto", padding: "7px 14px", height: 34, borderRadius: 8, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Ajouter
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {showForm && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setForm({ ...form, type: t.id })}
                  style={{
                    padding: "6px 12px", borderRadius: 999,
                    border: `1px solid ${form.type === t.id ? t.color : T.border}`,
                    background: form.type === t.id ? t.color + "18" : T.white,
                    color: form.type === t.id ? t.color : T.text,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                  <Icon size={12} strokeWidth={1.75} /> {t.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {form.type === "image" ? (
              <>
                <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL de l'image (https://...)"
                  style={{ flex: 2, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
                <input type="text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Légende (optionnel)"
                  style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
              </>
            ) : (
              <input type="text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder={form.type === "quote" ? "Ta citation..." : "Ton objectif chiffré..."}
                style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
            )}
            <button onClick={add} style={{ padding: "0 14px", height: 36, background: T.text, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Ajouter</button>
            <button onClick={() => setShowForm(false)} style={{ width: 36, height: 36, background: T.white, color: T.textSub, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div style={{ background: T.white, border: `1px dashed ${T.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: T.accentBg, marginBottom: 12 }}>
            <ImageIcon size={20} strokeWidth={1.75} color={T.textSub} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Ton vision board est vide</div>
          <div style={{ fontSize: 12, color: T.textSub }}>Ajoute des objectifs, citations ou images qui te représentent</div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gridAutoRows: "180px",
          gap: 14,
        }}>
          {cards.map(c => {
            if (c.type === "image") {
              return (
                <div key={c.id} style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: T.accentBg, border: `1px solid ${T.border}` }}>
                  <img src={c.url} alt={c.text || "Vision"}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {c.text && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 12px 10px", background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.75))", color: "#fff", fontSize: 12, fontWeight: 600 }}>{c.text}</div>
                  )}
                  <button onClick={() => remove(c.id)} style={deleteBtn()}><Trash2 size={12} strokeWidth={1.75} /></button>
                </div>
              );
            }
            if (c.type === "quote") {
              return (
                <div key={c.id} style={{ position: "relative", borderRadius: 14, padding: 18, background: `linear-gradient(135deg, #F5F3FF 0%, #FAF5FF 100%)`, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Quote size={24} strokeWidth={1.5} color={T.purple} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, fontStyle: "italic", fontWeight: 500 }}>{c.text}</div>
                  <button onClick={() => remove(c.id)} style={deleteBtn()}><Trash2 size={12} strokeWidth={1.75} /></button>
                </div>
              );
            }
            return (
              <div key={c.id} style={{ position: "relative", borderRadius: 14, padding: 18, background: `linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)`, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <TargetIcon size={24} strokeWidth={1.5} color={T.green} style={{ opacity: 0.7, marginBottom: 8 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: -0.2, lineHeight: 1.35 }}>{c.text}</div>
                <button onClick={() => remove(c.id)} style={deleteBtn()}><Trash2 size={12} strokeWidth={1.75} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function deleteBtn() {
  return {
    position: "absolute", top: 8, right: 8,
    width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,0.9)", border: `1px solid ${T.border}`,
    color: T.red, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
}
