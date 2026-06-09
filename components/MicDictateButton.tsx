"use client";

import React, { useRef } from "react";
// Dictée vocale désactivée temporairement : le push-to-talk sur la barre espace
// (useSpaceHoldDictation) interceptait chaque espace et le retardait, rendant la
// saisie de texte trop lente. On garde les imports en commentaire pour pouvoir
// réactiver la fonctionnalité plus tard.
// import { Mic, MicOff } from "lucide-react";
// import { useDictation, useSpaceHoldDictation } from "@/lib/hooks/useDictation";

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

  // Dictée vocale désactivée : on rend un simple textarea natif pour que la
  // saisie (et notamment la barre espace) fonctionne sans latence. Les props
  // liées au micro (micSize, micStyle, lang) sont conservées dans la signature
  // pour ne pas casser les appelants, mais ne sont plus utilisées ici.
  void micSize;
  void micStyle;
  void lang;

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
          resize: "none",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "var(--font-sans)",
          ...textareaStyle,
        }}
      />
    </div>
  );
}
