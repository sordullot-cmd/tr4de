"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, BookOpen, Check, Trash2, Pencil, X, BookMarked, FileText, Library, ChevronDown } from "lucide-react";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { Stat } from "@/components/ui/Stat";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#16A34A", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B", purple: "#A855F7",
};

const STORAGE_KEY = "tr4de_books";

const STATUSES = [
  { id: "toRead",  label: "À lire",     color: "#8E8E8E" },
  { id: "reading", label: "En cours",   color: "#3B82F6" },
  { id: "done",    label: "Terminé",    color: "#16A34A" },
];
const PRIORITIES = [
  { id: "must_read", label: "À lire absolument", short: "Absolu",   color: "#EF4444" },
  { id: "important", label: "Important",         short: "Important",color: "#F59E0B" },
  { id: "normal",    label: "Normal",            short: "Normal",   color: "#3B82F6" },
  { id: "can_wait",  label: "Peut attendre",     short: "Attend",   color: "#8E8E8E" },
];
const CATEGORIES = [
  { id: "trading",      label: "Trading" },
  { id: "psychology",   label: "Psychologie" },
  { id: "philosophy",   label: "Philosophie" },
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
  const emptyForm = { title: "", author: "", category: "trading", status: "toRead", priority: "normal", totalPages: "", currentPage: "" };
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [filter, setFilter] = useState("all"); // all | toRead | reading | done
  const [showIntro, setShowIntro] = useState(true);


  const save = () => {
    if (!form.title.trim()) return;
    const total = parseInt(form.totalPages) || 0;
    const current = parseInt(form.currentPage) || 0;
    if (editingId) {
      setBooks(prev => prev.map(b => b.id === editingId ? { ...b, title: form.title.trim(), author: form.author.trim(), category: form.category, status: form.status, priority: form.priority, totalPages: total, currentPage: current } : b));
    } else {
      setBooks(prev => [{ id: Date.now(), title: form.title.trim(), author: form.author.trim(), category: form.category, status: form.status, priority: form.priority, totalPages: total, currentPage: current, notes: "", createdAt: new Date().toISOString() }, ...prev]);
    }
    setForm(emptyForm); setShowForm(false); setEditingId(null);
  };
  const openEdit = (b) => {
    setForm({ title: b.title, author: b.author || "", category: b.category || "trading", status: b.status || "toRead", priority: b.priority || "normal", totalPages: String(b.totalPages || ""), currentPage: String(b.currentPage || "") });
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
          style={{ marginLeft: "auto", padding: "7px 16px", height: 34, borderRadius: 999, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Ajouter un livre
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      {/* Importance de la lecture */}
      {showIntro ? (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, display: "flex", gap: 14, alignItems: "flex-start", position: "relative" }}>
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: T.accentBg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={18} strokeWidth={1.75} color={T.text} />
          </div>
          <div style={{ minWidth: 0, flex: 1, paddingRight: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4, letterSpacing: -0.1 }}>Pourquoi lire est essentiel pour un trader</div>
            <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.55 }}>
              La lecture est le raccourci le plus court entre l’expérience des autres et la tienne. Les meilleurs traders consacrent du temps chaque jour à lire — sur les marchés, la psychologie, le risque et la prise de décision. Un livre bien choisi peut t’éviter des années d’erreurs coûteuses, affiner ton edge et solidifier ta discipline mentale. Construis ta bibliothèque, prends des notes, retiens les idées clés : c’est un investissement à rendement composé.
            </div>
          </div>
          <button onClick={() => setShowIntro(false)} title="Masquer"
            style={{ position: "absolute", top: 10, right: 10, width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button onClick={() => setShowIntro(true)}
          style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: 999, border: `1px dashed ${T.border}`, background: T.white, color: T.textSub, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <BookOpen size={12} strokeWidth={1.75} /> Afficher l’importance de la lecture
        </button>
      )}

      {/* Header stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <Stat icon={BookMarked} label="En cours"   value={counts.reading} subtext={counts.reading > 1 ? "livres" : "livre"} size="sm" />
        <Stat icon={Check}      label="Terminés"   value={counts.done}    subtext={counts.done > 1 ? "livres" : "livre"} size="sm" positive={counts.done > 0} />
        <Stat icon={FileText}   label="Pages lues" value={pagesRead}      subtext="cumulées" size="sm" />
        <Stat icon={Library}    label="À lire"     value={counts.toRead}  subtext={counts.toRead > 1 ? "à découvrir" : "à découvrir"} size="sm" />
      </div>

      {showForm && typeof document !== "undefined" && createPortal(
        <div onClick={cancel}
          style={{ position: "fixed", inset: 0, background: "rgba(13,13,13,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
            <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>{editingId ? "Modifier le livre" : "Nouveau livre"}</div>
              <button onClick={cancel} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            <div style={{ padding: "4px 20px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              <input type="text" autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre du livre"
                style={{ width: "100%", padding: "6px 0", border: "none", borderBottom: `1px solid ${T.border}`, borderRadius: 0, fontSize: 18, fontWeight: 600, outline: "none", fontFamily: "inherit", color: T.text, background: "transparent", letterSpacing: -0.2 }} />

              <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Auteur"
                style={{ width: "100%", padding: "4px 0", border: "none", fontSize: 13, outline: "none", fontFamily: "inherit", color: T.textSub, background: "transparent", fontStyle: "italic" }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Catégorie">
                  <PrettySelect
                    value={form.category}
                    onChange={(v) => setForm({ ...form, category: v })}
                    options={CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
                  />
                </Field>
                <Field label="Statut">
                  <PrettySelect
                    value={form.status}
                    onChange={(v) => setForm({ ...form, status: v })}
                    options={STATUSES.map(s => ({ value: s.id, label: s.label, color: s.color }))}
                  />
                </Field>
              </div>

              <Field label="Importance">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PRIORITIES.map(p => {
                    const active = form.priority === p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => setForm({ ...form, priority: p.id })}
                        style={{
                          padding: "6px 12px", borderRadius: 999,
                          border: `1px solid ${active ? p.color : T.border}`,
                          background: active ? p.color + "14" : T.white,
                          color: active ? p.color : T.textSub,
                          fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit",
                          display: "inline-flex", alignItems: "center", gap: 6,
                          transition: "all .12s ease",
                        }}>
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: p.color }} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Pages totales">
                  <input type="number" value={form.totalPages} onChange={(e) => setForm({ ...form, totalPages: e.target.value })} style={inputStyleLg()} placeholder="320" />
                </Field>
                <Field label="Page actuelle">
                  <input type="number" value={form.currentPage} onChange={(e) => setForm({ ...form, currentPage: e.target.value })} style={inputStyleLg()} placeholder="48" />
                </Field>
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={cancel}
                style={{ padding: "7px 14px", height: 34, borderRadius: 8, background: "transparent", border: "none", color: T.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              <button onClick={save} disabled={!form.title.trim()}
                style={{ padding: "7px 16px", height: 34, borderRadius: 8, background: form.title.trim() ? T.text : T.accentBg, border: "none", color: form.title.trim() ? "#fff" : T.textMut, fontSize: 13, fontWeight: 600, cursor: form.title.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {editingId ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
            const pri = PRIORITIES.find(p => p.id === (b.priority || "normal"));
            const isOpen = expandedId === b.id;
            return (
              <div key={b.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    {b.author && <div style={{ fontSize: 11, color: T.textMut, marginTop: 2, fontStyle: "italic" }}>{b.author}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: st.color, background: st.color + "18", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4 }}>{st.label}</span>
                      {pri && (
                        <span title={pri.label} style={{ fontSize: 10, fontWeight: 600, color: pri.color, background: pri.color + "18", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: pri.color }} />
                          {pri.short}
                        </span>
                      )}
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
function inputStyleLg() { return { width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", color: T.text, background: T.white, transition: "border-color .15s ease" }; }
function miniBtn() { return { width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, color: T.textSub, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }; }

function PrettySelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const current = options.find(o => o.value === value) || options[0];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "8px 12px", border: `1px solid ${open ? T.text : T.border}`,
          borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit",
          color: T.text, background: T.white, cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          transition: "border-color .15s ease",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {current?.color && <span style={{ width: 8, height: 8, borderRadius: 999, background: current.color, flexShrink: 0 }} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current?.label}</span>
        </span>
        <ChevronDown size={14} strokeWidth={2} style={{ color: T.textSub, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: T.white, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
          padding: 4, maxHeight: 260, overflowY: "auto",
        }}>
          {options.map(o => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = selected ? T.accentBg : "transparent"; }}
                style={{
                  width: "100%", padding: "8px 10px", border: "none", borderRadius: 6,
                  background: selected ? T.accentBg : "transparent", color: T.text,
                  fontSize: 13, fontFamily: "inherit", cursor: "pointer", textAlign: "left",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontWeight: selected ? 600 : 400,
                }}
              >
                {o.color && <span style={{ width: 8, height: 8, borderRadius: 999, background: o.color, flexShrink: 0 }} />}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
                {selected && <Check size={13} strokeWidth={2.5} style={{ color: T.text }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
