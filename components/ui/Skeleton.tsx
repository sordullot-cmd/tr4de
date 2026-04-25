"use client";

import React from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Skeleton — placeholder gris animé pendant le chargement.
 * Utilisation:
 *   <Skeleton width={120} height={16} />
 *   <Skeleton width="100%" height={48} radius={8} />
 *
 * Animations en CSS pure pour éviter les re-renders. Insère son keyframe
 * une seule fois dans <head> au premier rendu côté client.
 */
let injected = false;
function injectKeyframe() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes tr4deSkeleton {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
  `;
  document.head.appendChild(style);
}

export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  style,
  className,
}: SkeletonProps) {
  injectKeyframe();
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(90deg, var(--color-bg-subtle, #F0F0F0) 0%, var(--color-hover-bg, #E5E5E5) 50%, var(--color-bg-subtle, #F0F0F0) 100%)",
        backgroundSize: "200px 100%",
        backgroundRepeat: "no-repeat",
        animation: "tr4deSkeleton 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/**
 * SkeletonText — bloc de plusieurs lignes (ex. 3 lignes de paragraphe).
 */
export function SkeletonText({ lines = 3, lineHeight = 14, gap = 8, lastWidth = "60%" }: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  lastWidth?: string | number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? lastWidth : "100%"}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonRows — table-style stack of bars, useful as table fallback.
 */
export function SkeletonRows({ rows = 5, height = 36, gap = 6 }: {
  rows?: number;
  height?: number;
  gap?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} width="100%" radius={8} />
      ))}
    </div>
  );
}
