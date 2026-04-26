"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Tag as TagIcon, Sparkles, X } from "lucide-react";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#16A34A", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const STORAGE_KEY = "tr4de_notes";

function parseTags(text) {
  const out = [];
  const re = /#([a-zA-Z0-9_-]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1].toLowerCase());
  return Array.from(new Set(out));
}

export default function NotesPage() {
  const [notes, setNotes] = useState(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {} }, [notes]);

  const createNote = () => {
    const note = { id: Date.now() + Math.random(), content: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setNotes(prev => [note, ...prev]);
    setSelectedId(note.id);
    setDraft("");
  };

  const selected = notes.find(n => n.id === selectedId);

  // Sync draft <-> selected (loaded from picked note)
  useEffect(() => {
    if (selected) setDraft(selected.content);
    else setDraft("");
  }, [selectedId]);

  // Auto-save draft into selected note (debounced 400ms)
  useEffect(() => {
    if (!selectedId) return;
    const id = setTimeout(() => {
      setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, content: draft, updatedAt: new Date().toISOString() } : n));
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const removeNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const allTags = useMemo(() => {
    const set = new Set();
    notes.forEach(n => parseTags(n.content).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(n => {
      const tags = parseTags(n.content);
      if (activeTag && !tags.includes(activeTag)) return false;
      if (!q) return true;
      return n.content.toLowerCase().includes(q);
    });
  }, [notes, query, activeTag]);

  const firstLine = (content) => (content || "").split("\n").find(l => l.trim()) || "(Sans titre)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 120px)" }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Notes & Idées</h1>
        <button onClick={createNote}
          style={{ marginLeft: "auto", padding: "7px 14px", height: 34, borderRadius: 8, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Nouvelle note
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        {/* Left : list */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Search */}
          <div style={{ padding: 10, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ position: "relative" }}>
              <Search size={13} strokeWidth={1.75} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textMut }} />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..."
                style={{ width: "100%", padding: "8px 12px 8px 30px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }} />
            </div>
            {allTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {activeTag && (
                  <button onClick={() => setActiveTag(null)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 999, border: `1px solid ${T.border}`, background: T.white, fontSize: 10, cursor: "pointer", color: T.textSub, fontFamily: "inherit" }}>
                    <X size={9} /> clear
                  </button>
                )}
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                    style={{
                      padding: "3px 8px", borderRadius: 999,
                      border: `1px solid ${activeTag === tag ? T.text : T.border}`,
                      background: activeTag === tag ? T.text : T.white,
                      color: activeTag === tag ? T.white : T.textSub,
                      fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                    }}>
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: T.textSub, fontSize: 12 }}>
                {notes.length === 0 ? "Aucune note encore" : "Rien ne correspond"}
              </div>
            ) : filtered.map((n, i) => {
              const tags = parseTags(n.content);
              return (
                <div key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  style={{
                    padding: "10px 12px", borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                    cursor: "pointer",
                    background: selectedId === n.id ? T.accentBg : "transparent",
                  }}
                  onMouseEnter={(e) => { if (selectedId !== n.id) e.currentTarget.style.background = "#FAFAFA"; }}
                  onMouseLeave={(e) => { if (selectedId !== n.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstLine(n.content)}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: T.textMut }}>{new Date(n.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                    {tags.slice(0, 3).map(t => (
                      <span key={t} style={{ fontSize: 9, color: T.blue, background: T.blue + "15", padding: "1px 6px", borderRadius: 999, fontWeight: 500 }}>#{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right : editor */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: selected ? 0 : 20, display: "flex", flexDirection: "column" }}>
          {selected ? (
            <>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: T.textMut }}>Mis à jour {new Date(selected.updatedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                <button onClick={() => removeNote(selected.id)}
                  style={{ width: 28, height: 28, background: "transparent", border: "none", color: T.textMut, cursor: "pointer", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}
                  title="Supprimer"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={"Commence à écrire... utilise #tag pour catégoriser."}
                style={{
                  flex: 1, width: "100%", border: "none", outline: "none",
                  padding: 20, fontSize: 14, lineHeight: 1.6, fontFamily: "inherit",
                  color: T.text, background: "transparent", resize: "none",
                }}
              />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: T.textSub, gap: 8 }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: T.accentBg }}>
                <Sparkles size={20} strokeWidth={1.75} color={T.textSub} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Capture tes idées</div>
              <div style={{ fontSize: 12, textAlign: "center", maxWidth: 280 }}>Sélectionne une note existante ou crée-en une nouvelle. Utilise <code style={{ background: T.accentBg, padding: "1px 4px", borderRadius: 3 }}>#tag</code> pour trier.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
