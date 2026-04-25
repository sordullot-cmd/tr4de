"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, BookOpen, Check, Trash2, Pencil, X, BookMarked, FileText, Library } from "lucide-react";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { Stat } from "@/components/ui/Stat";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#10A37F", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B", purple: "#A855F7",
};

const STORAGE_KEY = "tr4de_books";

const STATUSES = [
  { id: "toRead",  label: "À lire",     color: "#8E8E8E" },
  { id: "reading", label: "En cours",   color: "#3B82F6" },
  { id: "done",    label: "Terminé",    color: "#10A37F" },
];
const CATEGORIES = [
  { id: "trading",      label: "Trading" },
  { id: "psychology",   label: "Psychologie" },
  { id: "business",     label: "Business" },
  { id: "personal_dev", label: "Développement perso" },
  { id: "other",        label: "Autre" },
];

function defaultBooks() {
  return [];
}

export default function ReadingListPage() {
  const [books, setBooks] = useCloudState(STORAGE_KEY, "reading_list", defaultBooks());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = { title: "", author: "", category: "trading", status: "toRead", totalPages: "", currentPage: "" };
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [filter, setFilter] = useState("all"); // all | toRead | reading | done


  const save = () => {
    if (!form.title.trim()) return;
    const total = parseInt(form.totalPages) || 0;
    const current = parseInt(form.currentPage) || 0;
    if (editingId) {
      setBooks(prev => prev.map(b => b.id === editingId ? { ...b, title: form.title.trim(), author: form.author.trim(), category: form.category, status: form.status, totalPages: total, currentPage: current } : b));
    } else {
      setBooks(prev => [{ id: Date.now(), title: form.title.trim(), author: form.author.trim(), category: form.category, status: form.status, totalPages: total, currentPage: current, notes: "", createdAt: new Date().toISOString() }, ...prev]);
    }
    setForm(emptyForm); setShowForm(false); setEditingId(null);
  };
  const openEdit = (b) => {
    setForm({ title: b.title, author: b.author || "", category: b.category || "trading", status: b.status || "toRead", totalPages: String(b.totalPages || ""), currentPage: String(b.currentPage || "") });
    setEditingId(b.id); setShowForm(true);
  };
  const cancel = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };
  const remove = (id) => { setBooks(prev => prev.filter(b => b.id !== id)); if (expandedId === id) setExpandedId(null); };
  const updateNote = (id, val) => setBooks(prev => prev.map(b => b.id === id ? { ...b, notes: val } : b));

  const shown = books.filter(b => filter === "all" ? true : (b.status || "toRead") === filter);
  const counts = {
    all: books.length,
    toRead: books.filter(b => (b.status || "toRead") === "toRead").length,
    reading: books.filter(b => b.status === "reading").length,
    done: books.filter(b => b.status === "done").length,
  };
  // Pages lues = somme des currentPage pour les "reading" + totalPages pour les "done"
  const pagesRead = books.reduce((sum, b) => {
    if (b.status === "done") return sum + (b.totalPages || 0);
    if (b.status === "reading") return sum + (b.currentPage || 0);
    return sum;
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>Liste de lecture</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          style={{ marginLeft: "auto", padding: "7px 14px", height: 34, borderRadius: 8, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Ajouter un livre
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {/* Header stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <Stat icon={BookMarked} label="En cours"   value={counts.reading} subtext={counts.reading > 1 ? "livres" : "livre"} size="sm" />
        <Stat icon={Check}      label="Terminés"   value={counts.done}    subtext={counts.done > 1 ? "livres" : "livre"} size="sm" positive={counts.done > 0} />
        <Stat icon={FileText}   label="Pages lues" value={pagesRead}      subtext="cumulées" size="sm" />
        <Stat icon={Library}    label="À lire"     value={counts.toRead}  subtext={counts.toRead > 1 ? "à découvrir" : "à découvrir"} size="sm" />
      </div>

      {showForm && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div className="tr4de-book-form" style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <Field label="Titre"><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle()} placeholder="ex. Trading in the Zone" /></Field>
            <Field label="Auteur"><input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} style={inputStyle()} placeholder="Mark Douglas" /></Field>
            <Field label="Catégorie">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle()}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle()}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Pages total"><input type="number" value={form.totalPages} onChange={(e) => setForm({ ...form, totalPages: e.target.value })} style={inputStyle()} placeholder="320" /></Field>
            <Field label="Page actuelle"><input type="number" value={form.currentPage} onChange={(e) => setForm({ ...form, currentPage: e.target.value })} style={inputStyle()} placeholder="48" /></Field>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={save} style={{ width: 36, height: 36, borderRadius: 8, background: T.green, border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={14} strokeWidth={2.5} /></button>
              <button onClick={cancel} style={{ width: 36, height: 36, borderRadius: 8, background: T.white, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={14} strokeWidth={2.5} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6 }}>
        {[{ id: "all", label: "Tous" }, ...STATUSES].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 12px", borderRadius: 999,
              border: `1px solid ${filter === f.id ? T.text : T.border}`,
              background: filter === f.id ? T.text : T.white,
              color: filter === f.id ? T.white : T.text,
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            {f.label}
            <span style={{ padding: "0 6px", borderRadius: 999, fontSize: 10, background: filter === f.id ? "rgba(255,255,255,0.18)" : T.accentBg, color: filter === f.id ? T.white : T.textSub }}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div style={{ background: T.white, border: `1px dashed ${T.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: T.accentBg, marginBottom: 12 }}>
            <BookOpen size={20} strokeWidth={1.75} color={T.textSub} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Aucun livre pour le moment</div>
          <div style={{ fontSize: 12, color: T.textSub }}>Ajoute ton premier livre pour construire ta bibliothèque</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {shown.map(b => {
            const total = b.totalPages || 0;
            const current = b.currentPage || 0;
            const pct = total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : (b.status === "done" ? 100 : 0);
            const st = STATUSES.find(s => s.id === (b.status || "toRead"));
            const cat = CATEGORIES.find(c => c.id === (b.category || "other"));
            const isOpen = expandedId === b.id;
            return (
              <div key={b.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    {b.author && <div style={{ fontSize: 11, color: T.textMut, marginTop: 2, fontStyle: "italic" }}>{b.author}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: st.color, background: st.color + "18", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4 }}>{st.label}</span>
                      {cat && <span style={{ fontSize: 10, color: T.textSub, background: T.accentBg, padding: "2px 8px", borderRadius: 999 }}>{cat.label}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => openEdit(b)} style={miniBtn()} title="Modifier"><Pencil size={11} strokeWidth={1.75} /></button>
                    <button onClick={() => remove(b.id)} style={{ ...miniBtn(), color: T.red }} title="Supprimer"><Trash2 size={11} strokeWidth={1.75} /></button>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textMut, marginBottom: 4 }}>
                    <span>{total > 0 ? `${current}/${total} pages` : (b.status === "done" ? "Terminé" : "—")}</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ height: 5, background: T.accentBg, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: st.color, borderRadius: 3, transition: "width .4s ease" }} />
                  </div>
                </div>

                <button onClick={() => { setExpandedId(isOpen ? null : b.id); setNoteDraft(b.notes || ""); }}
                  style={{ fontSize: 11, color: T.textSub, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}>
                  {isOpen ? "Masquer notes & citations" : "Notes & citations"}
                </button>
                {isOpen && (
                  <textarea
                    value={noteDraft}
                    onChange={(e) => { setNoteDraft(e.target.value); updateNote(b.id, e.target.value); }}
                    placeholder="Citations clés, idées à retenir..."
                    style={{ width: "100%", minHeight: 90, padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "inherit", color: T.text, background: T.white, resize: "vertical", lineHeight: 1.5 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function Field({ label, children }) { return (<div><label style={{ display: "block", fontSize: 10, color: T.textMut, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>{children}</div>); }
function inputStyle() { return { width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: T.text, background: T.white }; }
function miniBtn() { return { width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }; }
