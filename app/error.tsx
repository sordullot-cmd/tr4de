"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        height: "100vh",
        width: "100vw",
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#FFFFFF",
          border: "1px solid #E5E5E5",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <img
          src="/favicon.svg"
          alt=""
          width={96}
          height={96}
          style={{ display: "block", transform: "scale(1.05)", transformOrigin: "center" }}
        />
      </div>

      <div style={{ fontSize: 13, color: "#0D0D0D" }}>
        Une erreur est survenue
      </div>

      <div style={{ display: "inline-flex", gap: 14, fontSize: 12 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            color: "#0D0D0D",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12,
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Réessayer
        </button>
        <Link
          href="/"
          style={{
            color: "#8E8E8E",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
