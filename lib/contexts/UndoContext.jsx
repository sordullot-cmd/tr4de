"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Stack d'undo/redo global.
 *
 * pushUndo({ label, undo, redo? })
 *   - undo : fonction qui annule l'action
 *   - redo : (optionnel) fonction qui ré-applique l'action ; si fournie,
 *            l'entrée est ré-empilable via Ctrl+Y / Ctrl+Shift+Z
 *
 * Raccourcis :
 *   - Ctrl+Z (ou Cmd+Z, sans Shift) → undo dernière action
 *   - Ctrl+Y, ou Ctrl+Shift+Z (Cmd+Shift+Z) → redo
 *
 * Toast minimaliste affiché à chaque action.
 */

const UndoContext = createContext({
  pushUndo: () => {},
});

const MAX_STACK = 20;

export function UndoProvider({ children }) {
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const [toast, setToast] = useState(null);

  const pushUndo = useCallback((entry) => {
    if (!entry || typeof entry.undo !== "function") return;
    undoRef.current.push({ label: entry.label || "Action", undo: entry.undo, redo: typeof entry.redo === "function" ? entry.redo : null });
    if (undoRef.current.length > MAX_STACK) undoRef.current.shift();
    // Toute nouvelle action invalide la pile redo
    redoRef.current = [];
  }, []);

  const showToast = (label, kind) => setToast({ label, kind, ts: Date.now() });

  const popUndo = useCallback(async () => {
    const entry = undoRef.current.pop();
    if (!entry) return false;
    try { await entry.undo(); } catch (e) { console.error("[undo] failed:", e); }
    if (entry.redo) {
      redoRef.current.push(entry);
      if (redoRef.current.length > MAX_STACK) redoRef.current.shift();
    }
    showToast(entry.label, "undo");
    return true;
  }, []);

  const popRedo = useCallback(async () => {
    const entry = redoRef.current.pop();
    if (!entry) return false;
    try { await entry.redo(); } catch (e) { console.error("[redo] failed:", e); }
    undoRef.current.push(entry);
    if (undoRef.current.length > MAX_STACK) undoRef.current.shift();
    showToast(entry.label, "redo");
    return true;
  }, []);

  useEffect(() => {
    const isEditable = (el) => {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKey = (e) => {
      const ctrlLike = e.ctrlKey || e.metaKey;
      if (!ctrlLike) return;
      if (isEditable(document.activeElement)) return;
      const key = (e.key || "").toLowerCase();
      const isUndo = !e.shiftKey && key === "z";
      const isRedo = (key === "y") || (e.shiftKey && key === "z");
      if (isUndo) { e.preventDefault(); popUndo(); return; }
      if (isRedo) { e.preventDefault(); popRedo(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popUndo, popRedo]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <UndoContext.Provider value={{ pushUndo }}>
      {children}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            background: "#0D0D0D",
            color: "#FFFFFF",
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 99999,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          <span style={{ opacity: 0.7 }}>{toast.kind === "redo" ? "↷" : "↶"}</span>
          <span>{toast.label} {toast.kind === "redo" ? "rétabli" : "annulé"}</span>
        </div>
      )}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  return useContext(UndoContext);
}
