"use client";

import React, { useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { useDictation, useSpaceHoldDictation } from "@/lib/hooks/useDictation";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  height?: number | string;
  /** Style du textarea (hors padding-right qu'on gère pour réserver la place du bouton) */
  textareaStyle?: React.CSSProperties;
  /** Taille du bouton micro */
  micSize?: number;
  /** Position du bouton (défaut bottom-right) */
  micStyle?: React.CSSProperties;
  /** Classe CSS éventuelle sur le textarea */
  className?: string;
  lang?: string;
};

/**
 * Textarea avec :
 *  - Bouton micro cliquable (toggle) en bas à droite
 *  - Push-to-talk : maintenir la barre espace dans le textarea déclenche
 *    la dictée vocale (style Claude Code). Tap court = insère un espace normal.
 *  - Affichage d'erreur micro si le navigateur refuse / pas de réseau / etc.
 */
export default function DictatableTextarea({
  value,
  onChange,
  placeholder,
  height = 120,
  textareaStyle,
  micSize = 30,
  micStyle,
  className,
  lang = "fr",
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Les deltas Realtime arrivent déjà avec leurs espaces de tête (" mot"). On
  // les concatène brut pour préserver la ponctuation et l'espacement du modèle.
  const append = (chunk: string) => {
    const prev = valueRef.current || "";
    onChange(prev + chunk);
  };

  const dictation = useDictation({ lang, onTranscript: append });
  useSpaceHoldDictation(ref, dictation);

  const tooltip = !dictation.supported
    ? "Dictée vocale non supportée par ce navigateur"
    : dictation.recording
    ? "Enregistrement… cliquez pour arrêter"
    : dictation.transcribing
    ? "Transcription en cours…"
    : "Cliquer pour dicter — ou maintenir la barre espace dans le texte";

  const baseMic: React.CSSProperties = {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: micSize,
    height: micSize,
    borderRadius: "50%",
    border: "1px solid rgba(0,0,0,0.12)",
    background: dictation.recording ? "#EF4444" : "#FFFFFF",
    color: dictation.recording ? "#FFFFFF" : "#0D0D0D",
    cursor: dictation.supported ? "pointer" : "not-allowed",
    opacity: dictation.supported ? 1 : 0.4,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: dictation.recording
      ? "0 0 0 4px rgba(239,68,68,0.18)"
      : "0 1px 2px rgba(0,0,0,0.08)",
    transition: "background 120ms ease, box-shadow 120ms ease",
    fontFamily: "inherit",
    padding: 0,
    ...micStyle,
  };

  const Icon = dictation.supported ? Mic : MicOff;

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={ref}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height,
          paddingRight: micSize + 18,
          resize: "none",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "var(--font-sans)",
          ...textareaStyle,
        }}
      />

      <button
        type="button"
        onClick={dictation.toggle}
        title={tooltip}
        aria-label="Dictée vocale"
        style={baseMic}
      >
        <Icon size={Math.round(micSize * 0.5)} strokeWidth={2} />
        {dictation.recording && (
          <span
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid #EF4444",
              opacity: 0.5,
              animation: "tr4de-mic-pulse 1.2s ease-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
      </button>

      {(dictation.recording || dictation.transcribing) && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 12,
            fontSize: 10,
            fontWeight: 600,
            color: dictation.recording ? "#EF4444" : "#3B82F6",
            letterSpacing: 0.4,
            pointerEvents: "none",
            textTransform: "uppercase",
          }}
        >
          {dictation.recording ? "● écoute…" : "○ transcription…"}
        </div>
      )}

      {dictation.error && !dictation.recording && (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: "#EF4444",
            fontWeight: 500,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 6,
            padding: "6px 8px",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}
        >
          {dictation.error}
        </div>
      )}

      <style>{`
        @keyframes tr4de-mic-pulse {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
