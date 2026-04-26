"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof window !== "undefined") {
      // Garder les erreurs visibles en console pour le debug, mais une seule trace.
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
    return (
      <div
        role="alert"
        style={{
          margin: "32px auto",
          maxWidth: 540,
          padding: 20,
          background: "#FFFFFF",
          border: "1px solid #FECACA",
          borderRadius: 12,
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          color: "#0D0D0D",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
          Une erreur est survenue
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          {this.state.error.name || "Error"}
        </div>
        <div style={{ fontSize: 13, color: "#5C5C5C", lineHeight: 1.5, marginBottom: 16 }}>
          {this.state.error.message || "Erreur inconnue"}
        </div>
        <button
          type="button"
          onClick={this.reset}
          style={{
            padding: "8px 16px",
            background: "#0D0D0D",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }
}
