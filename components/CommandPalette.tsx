"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, ArrowRight, ChevronUp, ChevronDown, CornerDownLeft } from "lucide-react";
import { useApp } from "@/lib/contexts/AppContext";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

export interface Command {
  id: string;
  label: string;
  group?: string;
  shortcut?: string;
  /** Mots-clés supplémentaires (synonymes). */
  keywords?: string[];
  /** Action exécutée à la sélection. Reçoit le contexte `useApp()`. */
  run: (ctx: ReturnType<typeof useApp>) => void;
}

const DEFAULT_COMMANDS: Command[] = [
  // Navigation
  { id: "nav.dashboard",     group: "Navigation", label: "Aller au dashboard",        shortcut: "Alt+2", keywords: ["accueil", "home"], run: c => c.setPage("dashboard") },
  { id: "nav.add-trade",     group: "Navigation", label: "Ajouter un trade",           shortcut: "Alt+1", keywords: ["new", "import", "csv"], run: c => c.setPage("add-trade") },
  { id: "nav.calendar",      group: "Navigation", label: "Aller au calendrier",        shortcut: "Alt+3", run: c => c.setPage("calendar") },
  { id: "nav.trades",        group: "Navigation", label: "Voir les trades",            shortcut: "Alt+4", keywords: ["liste"], run: c => c.setPage("trades") },
  { id: "nav.strategies",    group: "Navigation", label: "Voir les stratégies",        shortcut: "Alt+5", run: c => c.setPage("strategies") },
  { id: "nav.journal",       group: "Navigation", label: "Ouvrir le journal",          shortcut: "Alt+6", keywords: ["notes"], run: c => c.setPage("journal") },
  { id: "nav.discipline",    group: "Navigation", label: "Discipline",                                        run: c => c.setPage("discipline") },
  { id: "nav.agent",         group: "Navigation", label: "Agent IA",                   keywords: ["coach"], run: c => c.setPage("agent") },
  { id: "nav.daily-planner", group: "Navigation", label: "Planning du jour",           keywords: ["habitudes", "tâches"], run: c => c.setPage("daily-planner") },
  { id: "nav.goals",         group: "Navigation", label: "Objectifs",                  keywords: ["goals"], run: c => c.setPage("goals") },
  { id: "nav.focus",         group: "Navigation", label: "Focus timer",                keywords: ["pomodoro"], run: c => c.setPage("focus") },
  { id: "nav.reading",       group: "Navigation", label: "Lectures",                   keywords: ["livres"], run: c => c.setPage("reading") },
  { id: "nav.settings",      group: "Navigation", label: "Paramètres",                 keywords: ["preferences", "profile"], run: c => c.setPage("settings") },

  // Actions
  { id: "action.toggle-theme", group: "Actions", label: "Basculer mode sombre / clair", keywords: ["dark", "light", "theme"], run: () => {
      if (typeof document === "undefined") return;
      const cur = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("tr4de_theme", next); } catch {}
  }},
  { id: "action.lang-fr", group: "Actions", label: "Passer en français", keywords: ["language"], run: () => {
      try { localStorage.setItem("tr4de_lang", "fr"); window.dispatchEvent(new CustomEvent("tr4de:lang-changed", { detail: { lang: "fr" } })); } catch {}
  }},
  { id: "action.lang-en", group: "Actions", label: "Switch to English", keywords: ["language"], run: () => {
      try { localStorage.setItem("tr4de_lang", "en"); window.dispatchEvent(new CustomEvent("tr4de:lang-changed", { detail: { lang: "en" } })); } catch {}
  }},
];

function matches(cmd: Command, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const haystack = [cmd.label, cmd.group, ...(cmd.keywords || [])].join(" ").toLowerCase();
  // Tokens : tous les mots de la query doivent apparaître quelque part
  return q.split(/\s+/).every(token => haystack.includes(token));
}

/**
 * CommandPalette — ⌘K / Ctrl+K ouvre une palette de recherche.
 * Wired by default into App. Pas besoin de prop ; consomme useApp() pour
 * exécuter les actions de navigation.
 */
export default function CommandPalette() {
  const ctx = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Open on Cmd/Ctrl+K
  useKeyboardShortcuts([
    { key: "k", ctrlOrCmd: true, handler: e => { e.preventDefault(); setOpen(o => !o); }, ignoreInInputs: false },
    { key: "Escape", handler: () => setOpen(false), ignoreInInputs: false },
  ]);

  const filtered = useMemo(() => DEFAULT_COMMANDS.filter(c => matches(c, query)), [query]);

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // focus input on next paint
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keep `active` index in bounds when filter changes
  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered.length, active]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) { cmd.run(ctx); setOpen(false); }
    }
  };

  // Group commands for display
  const groups: Record<string, Command[]> = {};
  filtered.forEach(c => {
    const g = c.group || "Autre";
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });
  // Build flat index map (group items keep their global filtered index)
  const flatIndexById: Record<string, number> = {};
  filtered.forEach((c, i) => { flatIndexById[c.id] = i; });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 9998,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "10vh",
        animation: "fadeIn 120ms ease both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(640px, 92vw)",
          background: "var(--color-bg, #FFFFFF)",
          color: "var(--color-text, #0D0D0D)",
          borderRadius: 12,
          boxShadow: "0 24px 60px rgba(0,0,0,0.30)",
          overflow: "hidden",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--color-border, #E5E5E5)" }}>
          <Search size={16} strokeWidth={1.75} color="#8E8E8E" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Tape pour chercher une page ou une action…"
            aria-label="Recherche"
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 15, fontFamily: "inherit", color: "inherit",
              background: "transparent",
            }}
          />
          <kbd style={kbdStyle()}>Esc</kbd>
        </div>

        {/* Results */}
        <div role="listbox" style={{ maxHeight: "60vh", overflowY: "auto", padding: 4 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "#8E8E8E", fontSize: 13 }}>
              Aucune commande trouvée
            </div>
          )}
          {Object.entries(groups).map(([group, cmds]) => (
            <div key={group} style={{ marginBottom: 4 }}>
              <div style={{ padding: "10px 12px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#8E8E8E" }}>
                {group}
              </div>
              {cmds.map(cmd => {
                const idx = flatIndexById[cmd.id];
                const isActive = idx === active;
                return (
                  <button
                    key={cmd.id}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => { cmd.run(ctx); setOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "10px 12px",
                      borderRadius: 8, border: "none",
                      background: isActive ? "var(--color-hover-bg, #F0F0F0)" : "transparent",
                      cursor: "pointer", textAlign: "left",
                      color: "inherit", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                    }}
                  >
                    <ArrowRight size={14} strokeWidth={1.75} color={isActive ? undefined : "#8E8E8E"} />
                    <span style={{ flex: 1 }}>{cmd.label}</span>
                    {cmd.shortcut && <kbd style={kbdStyle()}>{cmd.shortcut}</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div style={{
          display: "flex", gap: 14, alignItems: "center",
          padding: "8px 14px", borderTop: "1px solid var(--color-border, #E5E5E5)",
          fontSize: 11, color: "#8E8E8E",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ChevronUp size={12} /><ChevronDown size={12} /> naviguer
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <CornerDownLeft size={12} /> sélectionner
          </span>
          <span style={{ marginLeft: "auto" }}>⌘K pour rouvrir</span>
        </div>
      </div>
    </div>
  );
}

function kbdStyle(): React.CSSProperties {
  return {
    fontSize: 10, fontWeight: 600,
    padding: "2px 6px", borderRadius: 4,
    background: "var(--color-bg-subtle, #F5F5F5)",
    border: "1px solid var(--color-border, #E5E5E5)",
    color: "var(--color-text-sub, #5C5C5C)",
    fontFamily: "var(--font-mono, ui-monospace), monospace",
  };
}
