"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  Moon,
  LucideIcon,
} from "lucide-react";
import { t, useLang } from "@/lib/i18n";

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface SidebarSection {
  label?: string; // section label (uppercase small caps)
  items: SidebarItem[];
}

export interface SidebarAccount {
  id: string;
  name: string;
}

export interface SidebarProps {
  brand: string;                       // "tr4de"
  workspace?: SidebarAccount | null;   // current trading account selected
  workspaces?: SidebarAccount[];       // list of accounts
  onSelectWorkspace?: (id: string) => void;
  onCreateWorkspace?: () => void;
  onManageWorkspaces?: () => void;

  sections: SidebarSection[];
  activeId: string;
  onSelect: (id: string) => void;

  user?: {
    name: string;
    email?: string;
    initials: string;
  };
  onUserMenu?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onDarkMode?: () => void;
  onLogout?: () => void;

  collapsed?: boolean;
  onToggleCollapsed?: () => void;

  /** Mobile overlay: quand true, la sidebar est visible en overlay (≤1024px) */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const {
    sections, activeId, onSelect, user, onUserMenu, onProfile, onSettings, onDarkMode, onLogout,
    collapsed = false, onToggleCollapsed,
    mobileOpen = false, onMobileClose,
  } = props;

  useLang(); // re-render sidebar on language change
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
    {mobileOpen && (
      <div className="tr4de-sidebar-backdrop" onClick={onMobileClose} />
    )}
    <aside
      className={`tr4de-sidebar ${mobileOpen ? "is-open" : ""}`}
      style={{
        width: collapsed ? 56 : 220,
        flexShrink: 0,
        background: "#F5F5F5",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        transition: "width 180ms cubic-bezier(0.4, 0, 0.2, 1), transform .22s cubic-bezier(.2,.8,.2,1)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* HEADER : brand */}
      <div style={{ padding: "12px 8px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "6px 0" : "6px 8px",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#0D0D0D",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#FFFFFF", flexShrink: 0,
          }}>
            t
          </div>
          {!collapsed && (
            <div style={{ flex: 1, overflow: "hidden", fontSize: 14, fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              tao trade
            </div>
          )}
        </div>
      </div>

      {/* NAV */}
      <nav aria-label="Navigation principale" style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
        {sections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            {!collapsed && sec.label && (
              <div style={{
                padding: "8px 12px 6px", fontSize: 10, fontWeight: 600,
                color: "var(--color-text-muted)", letterSpacing: 0.5, textTransform: "uppercase",
              }}>
                {sec.label}
              </div>
            )}
            {sec.items.map(item => {
              const Icon = item.icon;
              const active = item.id === activeId;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: collapsed ? 0 : 10, justifyContent: collapsed ? "center" : "flex-start",
                    padding: collapsed ? "8px 0" : "8px 10px",
                    borderRadius: 8, border: "none",
                    background: active ? "var(--color-active-bg)" : "transparent",
                    color: "var(--color-text)", fontSize: 13,
                    fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit",
                    transition: "background 120ms ease",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--color-hover-bg)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span style={{
                          padding: "1px 7px", borderRadius: 999, background: "#0D0D0D",
                          color: "#FFFFFF", fontSize: 10, fontWeight: 600,
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* FOOTER : user + collapse */}
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4, position: "relative" }} ref={userRef}>
        {user && (
          <button
            onClick={() => { setUserMenuOpen(v => !v); onUserMenu?.(); }}
            title={collapsed ? user.name : undefined}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "6px 0" : "6px 8px",
              borderRadius: 8, border: "none",
              background: userMenuOpen ? "var(--color-hover-bg)" : "transparent",
              cursor: "pointer", fontFamily: "inherit", color: "var(--color-text)",
            }}
            onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = "var(--color-hover-bg)"; }}
            onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: "50%", background: "#FFE0B2",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#9D5800", flexShrink: 0,
            }}>
              {user.initials}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, overflow: "hidden", textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.name}
                </div>
                {user.email && (
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </div>
                )}
              </div>
            )}
          </button>
        )}

        {/* User menu popover (opens upward) */}
        {userMenuOpen && user && (
          <div
            role="menu"
            style={{
              position: "absolute",
              bottom: "calc(100% + 4px)",
              left: 8, right: 8,
              background: "#FFFFFF", border: "1px solid var(--color-border)",
              borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              overflow: "hidden", padding: 4, zIndex: 100,
            }}
          >
            {onProfile && (
              <button
                onClick={() => { setUserMenuOpen(false); onProfile(); }}
                style={dropdownItemStyle()}
                role="menuitem"
                onMouseEnter={e => { e.currentTarget.style.background = "var(--color-hover-bg)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <User size={14} strokeWidth={1.75} />
                <span>{t("settings.profile")}</span>
              </button>
            )}
            {onSettings && (
              <button
                onClick={() => { setUserMenuOpen(false); onSettings(); }}
                style={dropdownItemStyle()}
                role="menuitem"
                onMouseEnter={e => { e.currentTarget.style.background = "var(--color-hover-bg)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <Settings size={14} strokeWidth={1.75} />
                <span>{t("nav.settings")}</span>
              </button>
            )}
            {onDarkMode && (
              <button
                onClick={() => { setUserMenuOpen(false); onDarkMode(); }}
                style={dropdownItemStyle()}
                role="menuitem"
                onMouseEnter={e => { e.currentTarget.style.background = "var(--color-hover-bg)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <Moon size={14} strokeWidth={1.75} />
                <span>Mode Sombre</span>
              </button>
            )}
            {(onProfile || onSettings || onDarkMode) && onLogout && (
              <div style={{ height: 1, background: "var(--color-border)", margin: "4px 0" }} />
            )}
            {onLogout && (
              <button
                onClick={() => { setUserMenuOpen(false); onLogout(); }}
                role="menuitem"
                style={{ ...dropdownItemStyle(), color: "#EF4444" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <LogOut size={14} strokeWidth={1.75} />
                <span>{t("nav.logout")}</span>
              </button>
            )}
          </div>
        )}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Étendre" : "Réduire"}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "6px 0" : "6px 8px",
              borderRadius: 8, border: "none", background: "transparent",
              cursor: "pointer", fontFamily: "inherit",
              color: "var(--color-text-sub)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--color-hover-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span style={{ fontSize: 12 }}>Réduire</span>}
          </button>
        )}
      </div>
    </aside>
    </>
  );
}

function dropdownItemStyle(): React.CSSProperties {
  return {
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 6, border: "none",
    background: "transparent", color: "var(--color-text)",
    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
  };
}
