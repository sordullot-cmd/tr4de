/**
 * Design tokens (OpenAI-style palette). Centralisé pour éviter la duplication
 * dans chaque composant. Les composants peuvent aussi utiliser les CSS vars
 * directement pour supporter le dark mode (var(--color-text), etc.).
 */
// Tokens passés en CSS vars : ainsi les composants qui font
// `style={{ background: T.white, border: \`1px solid ${T.border}\` }}`
// suivent automatiquement le thème sombre via les overrides définis dans
// app/globals.css (`:root[data-theme="dark"] { --color-bg: …; }`).
// Les fallbacks après la virgule conservent le comportement clair par défaut.
export const T = {
  white:    "var(--color-card-bg, #FFFFFF)",
  bg:       "var(--color-bg, #FFFFFF)",
  surface:  "var(--color-card-bg, #FFFFFF)",
  border:   "var(--color-border, #E5E5E5)",
  border2:  "var(--color-border-strong, #D4D4D4)",
  text:     "var(--color-text, #0D0D0D)",
  textSub:  "var(--color-text-sub, #5C5C5C)",
  textMut:  "var(--color-text-muted, #8E8E8E)",
  green:    "#16A34A",
  greenBg:  "var(--color-green-bg, #F0FDF4)",
  greenBd:  "var(--color-green-bd, #86EFAC)",
  red:      "#EF4444",
  redBg:    "var(--color-red-bg, #FEF2F2)",
  redBd:    "var(--color-red-bd, #FECACA)",
  accent:   "var(--color-text, #0D0D0D)",
  accentBg: "var(--color-hover-bg, #F0F0F0)",
  accentBd: "var(--color-border-strong, #D4D4D4)",
  amber:    "#F97316",
  amberBg:  "var(--color-amber-bg, #FFF4E6)",
  blue:     "#3B82F6",
  blueBg:   "var(--color-blue-bg, #EFF6FF)",
} as const;

export type Tokens = typeof T;
