"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2, Tag as TagIcon, Sparkles, X, ImagePlus, Pin, PinOff } from "lucide-react";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { useUndo } from "@/lib/contexts/UndoContext";
import { t, useLang } from "@/lib/i18n";

const T = {
  white: "#FFFFFF", border: "#E5E5E5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#16A34A", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

const STORAGE_KEY = "tr4de_notes";

const TAG_RE = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;

function parseTags(text) {
  const out = [];
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text)) !== null) out.push(m[1].toLowerCase());
  return Array.from(new Set(out));
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Compresse une image (File ou Blob) en data URL JPEG, max 1200px de large.
async function fileToCompressedDataUrl(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const MAX = 1200;
  let { width, height } = img;
  if (width > MAX) { height = Math.round(height * (MAX / width)); width = MAX; }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  // PNG si déjà PNG et petit, sinon JPEG q=0.85
  const isPng = file.type === "image/png" && width <= 800;
  return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.85);
}

function renderHighlighted(text) {
  let html = "";
  let last = 0;
  const re = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    html += escapeHtml(text.slice(last, m.index));
    html += `<span style="color:#3B82F6">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  html += escapeHtml(text.slice(last));
  // ensure trailing newline keeps height
  if (html.endsWith("\n")) html += " ";
  return html;
}

export default function NotesPage() {
  useLang();
  const [notes, setNotes] = useCloudState(STORAGE_KEY, "notes", []);
  const { pushUndo } = useUndo();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");

  const createNote = () => {
    // Flush la note courante AVANT toute autre mise à jour, sinon le batching
    // de React peut déclencher l'update de draftRef avant l'effet sur
    // selectedId, et la note précédente serait sauvegardée vide.
    if (selectedIdRef.current) flushSave(selectedIdRef.current, draftRef.current);
    const note = { id: Date.now() + Math.random(), content: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setNotes(prev => [note, ...prev]);
    setSelectedId(note.id);
  };

  const selected = notes.find(n => n.id === selectedId);

  // Refs to flush pending saves on selection change / unmount
  const draftRef = useRef("");
  const selectedIdRef = useRef(null);
  const highlightRef = useRef(null);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const flushSave = (id, content) => {
    if (!id) return;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content, updatedAt: new Date().toISOString() } : n));
  };

  const fileInputRef = useRef(null);

  const addImagesToSelected = async (files) => {
    if (!selectedId || !files || files.length === 0) return;
    const imgs = [];
    for (const f of files) {
      if (!f.type || !f.type.startsWith("image/")) continue;
      try {
        const url = await fileToCompressedDataUrl(f);
        imgs.push({ id: Date.now() + Math.random(), src: url, addedAt: new Date().toISOString() });
      } catch (e) {
        console.warn("Image upload failed:", e);
      }
    }
    if (imgs.length === 0) return;
    setNotes(prev => prev.map(n => n.id === selectedId
      ? { ...n, images: [...(n.images || []), ...imgs], updatedAt: new Date().toISOString() }
      : n));
  };

  const removeImage = (imgId) => {
    if (!selectedId) return;
    setNotes(prev => prev.map(n => n.id === selectedId
      ? { ...n, images: (n.images || []).filter(im => im.id !== imgId), updatedAt: new Date().toISOString() }
      : n));
  };

  // Sync draft <-> selected (loaded from picked note) + flush previous note
  useEffect(() => {
    const prevId = selectedIdRef.current;
    if (prevId && prevId !== selectedId) {
      // Flush the previous note's draft synchronously before switching
      flushSave(prevId, draftRef.current);
    }
    selectedIdRef.current = selectedId;
    const cur = notes.find(n => n.id === selectedId);
    setDraft(cur ? cur.content : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Auto-save current draft (debounced 400ms)
  useEffect(() => {
    if (!selectedId) return;
    const id = setTimeout(() => flushSave(selectedId, draft), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Flush on unmount (page change / reload close)
  useEffect(() => {
    return () => {
      if (selectedIdRef.current) flushSave(selectedIdRef.current, draftRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePin = (id) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n));
  };

  const removeNote = (id) => {
    const snapshot = notes.find(n => n.id === id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (snapshot) {
      pushUndo({
        label: "Suppression de la note",
        undo: async () => { setNotes(prev => [snapshot, ...prev]); setSelectedId(snapshot.id); },
        redo: async () => { setNotes(prev => prev.filter(n => n.id !== snapshot.id)); if (selectedId === snapshot.id) setSelectedId(null); },
      });
    }
  };

  // Compte le nb d'usage de chaque tag (pour trier les suggestions du plus
  // utilisé au moins utilisé).
  const tagCounts = useMemo(() => {
    const counts = {};
    notes.forEach(n => parseTags(n.content).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }, [notes]);

  const allTags = useMemo(() => {
    return Object.keys(tagCounts).sort((a, b) => (tagCounts[b] - tagCounts[a]) || a.localeCompare(b));
  }, [tagCounts]);

  // Détecte si le curseur est en train d'écrire un tag, et renvoie {prefix, start}
  // ou null. `start` est l'index du `#`, `prefix` le mot tapé après (sans #).
  const detectTagAtCursor = (text, caret) => {
    if (caret == null) return null;
    let i = caret - 1;
    while (i >= 0) {
      const c = text[i];
      if (c === "#") {
        // Vérifie que le # est en début de ligne ou précédé d'un espace.
        const prev = i > 0 ? text[i - 1] : " ";
        if (prev !== " " && prev !== "\n" && prev !== "\t") return null;
        const prefix = text.slice(i + 1, caret);
        if (prefix.length === 0) return { prefix: "", start: i };
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(prefix)) return null;
        return { prefix, start: i };
      }
      if (!/[a-zA-Z0-9_-]/.test(c)) return null;
      i--;
    }
    return null;
  };

  const [tagSuggest, setTagSuggest] = useState(null); // { prefix, start, candidates: [tag] }
  const textareaRef = useRef(null);

  const updateTagSuggest = (text, caret) => {
    const det = detectTagAtCursor(text, caret);
    if (!det) { setTagSuggest(null); return; }
    const lower = det.prefix.toLowerCase();
    // candidates : tags existants commençant par le préfixe (insensible à la casse),
    // triés par nb d'usage desc puis alpha. On exclut le tag exactement égal au
    // préfixe (rien à compléter).
    const cand = allTags
      .filter(t => t.startsWith(lower) && t !== lower)
      .sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0) || a.localeCompare(b))
      .slice(0, 5);
    if (cand.length === 0) { setTagSuggest(null); return; }
    setTagSuggest({ prefix: det.prefix, start: det.start, candidates: cand });
  };

  const acceptTagSuggestion = () => {
    if (!tagSuggest || tagSuggest.candidates.length === 0) return false;
    const ta = textareaRef.current;
    if (!ta) return false;
    const tag = tagSuggest.candidates[0];
    const caret = ta.selectionStart;
    const before = draft.slice(0, tagSuggest.start);
    const after = draft.slice(caret);
    const insertion = `#${tag} `;
    const next = before + insertion + after;
    setDraft(next);
    const pos = (before + insertion).length;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = pos;
        textareaRef.current.selectionEnd = pos;
      }
    });
    setTagSuggest(null);
    return true;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = notes.filter(n => {
      const tags = parseTags(n.content);
      if (activeTag && !tags.includes(activeTag)) return false;
      if (!q) return true;
      return n.content.toLowerCase().includes(q);
    });
    // Les notes épinglées remontent toujours en haut (tri stable : on conserve
    // l'ordre d'origine au sein de chaque groupe).
    return list.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [notes, query, activeTag]);

  const firstLine = (content) => (content || "").split("\n").find(l => l.trim()) || "(Sans titre)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 120px)" }} className="anim-1 tr4de-notes-page">
      {/* Responsive: en dessous de 900px on passe en stack vertical
          (liste au-dessus, éditeur en dessous) ; en dessous de 600px la page
          n'a plus de hauteur fixe pour pouvoir scroller naturellement. */}
      <style>{`
        @media (max-width: 900px) {
          .tr4de-notes-layout {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto 1fr;
          }
          .tr4de-notes-list { max-height: 260px; }
        }
        @media (max-width: 600px) {
          .tr4de-notes-page {
            height: auto !important;
            min-height: calc(100vh - 120px);
          }
          .tr4de-notes-layout { gap: 10px !important; }
          .tr4de-notes-list { max-height: 220px; }
          .tr4de-notes-editor { min-height: 60vh; }
        }
        @media (max-width: 480px) {
          .tr4de-notes-newbtn-label { display: none; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>{t("notes.pageTitle")}</h1>
        <button onClick={createNote}
          style={{ marginLeft: "auto", padding: "7px 16px", height: 34, borderRadius: 999, background: T.text, border: `1px solid ${T.text}`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> <span className="tr4de-notes-newbtn-label">Nouvelle note</span>
        </button>
        <div id="tr4de-page-header-slot" />
      </div>

      <div className="tr4de-notes-layout" style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        {/* Left : list */}
        <div className="tr4de-notes-list" style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                    {n.pinned && <Pin size={11} strokeWidth={2} style={{ flexShrink: 0, color: T.textMut, fill: T.textMut }} />}
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstLine(n.content)}</div>
                  </div>
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
        <div className="tr4de-notes-editor" style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: selected ? 0 : 20, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {selected ? (
            <>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11, color: T.textMut }}>Mis à jour {new Date(selected.updatedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => togglePin(selected.id)}
                    title={selected.pinned ? "Désépingler" : "Épingler en haut"}
                    style={{ width: 28, height: 28, background: selected.pinned ? T.accentBg : "transparent", border: "none", color: selected.pinned ? T.text : T.textMut, cursor: "pointer", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; e.currentTarget.style.color = T.text; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selected.pinned ? T.accentBg : "transparent"; e.currentTarget.style.color = selected.pinned ? T.text : T.textMut; }}
                  >
                    {selected.pinned ? <PinOff size={14} strokeWidth={1.75} /> : <Pin size={14} strokeWidth={1.75} />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => { addImagesToSelected(Array.from(e.target.files || [])); e.target.value = ""; }}
                  />
                  <button onClick={() => fileInputRef.current?.click()}
                    title="Ajouter une image (ou colle-la directement)"
                    style={{ width: 28, height: 28, background: "transparent", border: "none", color: T.textMut, cursor: "pointer", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.accentBg; e.currentTarget.style.color = T.text; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}
                  >
                    <ImagePlus size={14} strokeWidth={1.75} />
                  </button>
                  <button onClick={() => removeNote(selected.id)}
                    style={{ width: 28, height: 28, background: "transparent", border: "none", color: T.textMut, cursor: "pointer", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = T.red; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMut; }}
                    title="Supprimer"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              {(selected.images || []).length > 0 && (
                <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(selected.images || []).map(img => (
                    <div key={img.id} style={{ position: "relative", width: 96, height: 96, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}`, background: "#FAFAFA" }}>
                      <img src={img.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "zoom-in" }}
                        onClick={() => window.open(img.src, "_blank")} />
                      <button onClick={() => removeImage(img.id)}
                        title="Retirer l'image"
                        style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(13,13,13,0.72)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
                <div
                  aria-hidden
                  ref={(el) => { highlightRef.current = el; }}
                  style={{
                    position: "absolute", inset: 0, padding: 20,
                    fontSize: 14, lineHeight: 1.6, fontFamily: "inherit",
                    color: T.text, whiteSpace: "pre-wrap", wordWrap: "break-word",
                    overflow: "auto", pointerEvents: "none",
                  }}
                  dangerouslySetInnerHTML={{ __html: draft ? renderHighlighted(draft) : `<span style="color:${T.textMut}">Commence à écrire... utilise #tag pour catégoriser.</span>` }}
                />
              <textarea
                ref={textareaRef}
                autoFocus
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  // Recalcule les suggestions de tag après cette frappe.
                  // selectionStart de target n'est pas fiable dans onChange selon
                  // le browser ; on utilise requestAnimationFrame pour lire après.
                  const next = e.target.value;
                  requestAnimationFrame(() => {
                    const ta = textareaRef.current;
                    if (ta) updateTagSuggest(next, ta.selectionStart);
                  });
                }}
                onSelect={(e) => updateTagSuggest(e.currentTarget.value, e.currentTarget.selectionStart)}
                onBlur={() => setTimeout(() => setTagSuggest(null), 100)}
                onPaste={(e) => {
                  const items = Array.from(e.clipboardData?.items || []);
                  const imgFiles = items
                    .filter(it => it.kind === "file" && it.type.startsWith("image/"))
                    .map(it => it.getAsFile())
                    .filter(Boolean);
                  if (imgFiles.length > 0) {
                    e.preventDefault();
                    addImagesToSelected(imgFiles);
                  }
                }}
                onScroll={(e) => { if (highlightRef.current) { highlightRef.current.scrollTop = e.currentTarget.scrollTop; highlightRef.current.scrollLeft = e.currentTarget.scrollLeft; } }}
                onKeyDown={(e) => {
                  // Autocomplete de tag : Entrée ou Tab insère la suggestion
                  // courante. Échap masque les suggestions.
                  if (tagSuggest && tagSuggest.candidates.length > 0) {
                    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
                      e.preventDefault();
                      acceptTagSuggestion();
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setTagSuggest(null);
                      return;
                    }
                  }
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const ta = e.currentTarget;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const indent = "        ";
                    if (e.shiftKey) {
                      // Outdent: remove up to 8 leading spaces (or 1 tab) from line start
                      const lineStart = draft.lastIndexOf("\n", start - 1) + 1;
                      const before = draft.slice(0, lineStart);
                      const lineRest = draft.slice(lineStart);
                      let removed = 0;
                      let stripped = lineRest;
                      if (stripped.startsWith("\t")) { stripped = stripped.slice(1); removed = 1; }
                      else {
                        const m = stripped.match(/^ {1,8}/);
                        if (m) { removed = m[0].length; stripped = stripped.slice(removed); }
                      }
                      if (removed > 0) {
                        const next = before + stripped;
                        setDraft(next);
                        const pos = Math.max(lineStart, start - removed);
                        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = pos; });
                      }
                    } else {
                      const next = draft.slice(0, start) + indent + draft.slice(end);
                      setDraft(next);
                      const pos = start + indent.length;
                      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = pos; });
                    }
                  }
                }}
                placeholder=""
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  border: "none", outline: "none",
                  padding: 20, fontSize: 14, lineHeight: 1.6, fontFamily: "inherit",
                  color: "transparent", caretColor: T.text, background: "transparent", resize: "none",
                  WebkitTextFillColor: "transparent",
                }}
              />
              {tagSuggest && tagSuggest.candidates.length > 0 && (
                <div style={{
                  position: "absolute", left: 12, right: 12, bottom: 10,
                  background: T.white, border: `1px solid ${T.border}`, borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  padding: "6px 8px",
                  display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
                  fontSize: 12, fontFamily: "inherit", zIndex: 5,
                }}
                onMouseDown={(e) => e.preventDefault()}>
                  <span style={{ color: T.textMut, fontSize: 11, marginRight: 2 }}>↩ pour compléter</span>
                  {tagSuggest.candidates.map((tag, i) => (
                    <button key={tag} type="button"
                      onClick={() => {
                        // Permet aussi de cliquer une suggestion (pas que la 1ʳᵉ).
                        const ta = textareaRef.current;
                        if (!ta) return;
                        const caret = ta.selectionStart;
                        const before = draft.slice(0, tagSuggest.start);
                        const after = draft.slice(caret);
                        const insertion = `#${tag} `;
                        const next = before + insertion + after;
                        setDraft(next);
                        const pos = (before + insertion).length;
                        requestAnimationFrame(() => {
                          if (textareaRef.current) {
                            textareaRef.current.focus();
                            textareaRef.current.selectionStart = pos;
                            textareaRef.current.selectionEnd = pos;
                          }
                        });
                        setTagSuggest(null);
                      }}
                      style={{
                        padding: "3px 10px", borderRadius: 999,
                        border: `1px solid ${i === 0 ? T.text : T.border}`,
                        background: i === 0 ? T.text : T.white,
                        color: i === 0 ? "#fff" : T.blue,
                        fontWeight: 600, fontSize: 11, cursor: "pointer",
                        fontFamily: "inherit",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                      #{tag}
                      <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 500 }}>
                        {tagCounts[tag] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              </div>
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
