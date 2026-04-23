"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Search, Check } from "lucide-react";

export interface SearchableOption {
  id: string;
  label: string;
  iconUrl?: string;
  iconNode?: React.ReactNode;
  sublabel?: string;
  isAction?: boolean;
}

interface SearchableSelectProps {
  value: string;
  options: SearchableOption[];
  onChange: (id: string) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  width?: string | number;
  maxMenuHeight?: number;
  renderSelected?: (opt?: SearchableOption) => React.ReactNode;
  onOpen?: () => void;
  separated?: boolean;   // Lignes fines entre items du dropdown
  small?: boolean;       // Typo + icone reduites (trigger + items)
}

export default function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Sélectionner",
  searchable = true,
  searchPlaceholder = "Rechercher...",
  emptyLabel = "Aucun résultat",
  width = "100%",
  maxMenuHeight = 280,
  renderSelected,
  onOpen,
  separated = false,
  small = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    setOpen(v => {
      const next = !v;
      if (next) onOpen?.();
      return next;
    });
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find(o => o.id === value);
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || (o.sublabel || "").toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} style={{ position: "relative", width, fontFamily: "var(--font-sans)" }}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: small ? "6px 10px" : "8px 12px",
          border: `1px solid ${open ? "#D4D4D4" : "#E5E5E5"}`,
          borderRadius: 8,
          background: "#FFFFFF",
          color: selected ? "#0D0D0D" : "#8E8E8E",
          fontSize: small ? 12 : 13,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          transition: "border-color 120ms ease",
        }}
      >
        {renderSelected ? (
          renderSelected(selected)
        ) : selected ? (
          <>
            {selected.iconUrl && <img src={selected.iconUrl} alt="" style={{ width: small ? 14 : 16, height: small ? 14 : 16, objectFit: "contain", flexShrink: 0 }} />}
            {selected.iconNode && <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>{selected.iconNode}</span>}
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.label}
              {selected.sublabel && <span style={{ color: "#8E8E8E", fontSize: small ? 11 : 12, fontWeight: 400, marginLeft: 6 }}>{selected.sublabel}</span>}
            </span>
          </>
        ) : (
          <span style={{ flex: 1 }}>{placeholder}</span>
        )}
        {open ? <ChevronUp size={small ? 12 : 14} strokeWidth={2} color="#8E8E8E" /> : <ChevronDown size={small ? 12 : 14} strokeWidth={2} color="#8E8E8E" />}
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#FFFFFF",
            border: "1px solid #E5E5E5",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {searchable && options.length > 5 && (
            <div style={{ padding: 8, borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                <Search size={13} strokeWidth={1.75} color="#8E8E8E" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: "#0D0D0D",
                    padding: "6px 0",
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ overflowY: "auto", maxHeight: maxMenuHeight, padding: 4 }} className="scroll-thin">
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 12, color: "#8E8E8E", textAlign: "center" }}>{emptyLabel}</div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.id === value;
                return (
                  <React.Fragment key={opt.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: small ? "6px 10px" : "8px 10px",
                        border: "none",
                        background: isSelected ? "#F0F0F0" : "transparent",
                        color: opt.isAction ? "#0D0D0D" : "#0D0D0D",
                        fontSize: small ? 12 : 13,
                        fontWeight: isSelected ? 600 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                        borderRadius: 6,
                        transition: "background 100ms ease",
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#F5F5F5"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      {opt.iconUrl && <img src={opt.iconUrl} alt="" style={{ width: small ? 14 : 16, height: small ? 14 : 16, objectFit: "contain", flexShrink: 0 }} />}
                      {opt.iconNode && <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>{opt.iconNode}</span>}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
                      {opt.sublabel && <span style={{ color: "#8E8E8E", fontSize: small ? 11 : 12 }}>{opt.sublabel}</span>}
                      {isSelected && <Check size={small ? 12 : 14} strokeWidth={2} color="#0D0D0D" />}
                    </button>
                    {separated && idx < filtered.length - 1 && (
                      <div style={{ height: 1, background: "#F0F0F0", margin: "0 8px" }} />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
