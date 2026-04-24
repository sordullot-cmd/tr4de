/**
 * Design tokens (OpenAI-style palette). Centralisé pour éviter la duplication
 * dans chaque composant. Les composants peuvent aussi utiliser les CSS vars
 * directement pour supporter le dark mode (var(--color-text), etc.).
 */
export const T = {
  white:    "#FFFFFF",
  bg:       "#FFFFFF",
  surface:  "#FFFFFF",
  border:   "#E5E5E5",
  border2:  "#D4D4D4",
  text:     "#0D0D0D",
  textSub:  "#5C5C5C",
  textMut:  "#8E8E8E",
  green:    "#10A37F",
  greenBg:  "#E6F7F1",
  greenBd:  "#A7E6CF",
  red:      "#EF4444",
  redBg:    "#FEF2F2",
  redBd:    "#FECACA",
  accent:   "#0D0D0D",
  accentBg: "#F0F0F0",
  accentBd: "#D4D4D4",
  amber:    "#F97316",
  amberBg:  "#FFF4E6",
  blue:     "#3B82F6",
  blueBg:   "#EFF6FF",
} as const;

export type Tokens = typeof T;
