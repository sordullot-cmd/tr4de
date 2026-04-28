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
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "var(--color-bg, #FFFFFF)",
        color: "var(--color-text, #0D0D0D)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(239,68,68,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(239,68,68,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 999,
            background: "var(--color-bg-subtle, #F5F5F5)",
            border: "1px solid var(--color-border, #E5E5E5)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "var(--color-text-sub, #5C5C5C)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--color-danger, #EF4444)",
            }}
          />
          Erreur inattendue
        </span>

        <div
          aria-hidden
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "var(--color-bg-subtle, #F5F5F5)",
            border: "1px solid var(--color-border, #E5E5E5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-danger, #EF4444)",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(22px, 3.5vw, 30px)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          Quelque chose s'est mal passé
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: 440,
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--color-text-sub, #5C5C5C)",
          }}
        >
          Une erreur inattendue est survenue pendant le chargement de la page.
          Vous pouvez réessayer ou revenir à l'accueil.
        </p>

        {error?.message ? (
          <code
            style={{
              display: "inline-block",
              maxWidth: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--color-bg-subtle, #F5F5F5)",
              border: "1px solid var(--color-border, #E5E5E5)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-text-sub, #5C5C5C)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {error.message}
            {error.digest ? ` · ${error.digest}` : ""}
          </code>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 18px",
              borderRadius: 10,
              background: "var(--color-btn-primary-bg, #0D0D0D)",
              color: "var(--color-btn-primary-text, #FFFFFF)",
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid var(--color-btn-primary-bg, #0D0D0D)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            Réessayer
          </button>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 18px",
              borderRadius: 10,
              background: "transparent",
              color: "var(--color-text, #0D0D0D)",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid var(--color-border-strong, #D4D4D4)",
            }}
          >
            Retour à l'accueil
          </Link>
        </div>

        <div
          style={{
            marginTop: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "var(--color-text-muted, #8E8E8E)",
          }}
        >
          tao trade · une erreur, ça arrive
        </div>
      </div>
    </main>
  );
}
