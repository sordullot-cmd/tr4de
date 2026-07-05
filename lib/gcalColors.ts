// Palette officielle Google Agenda (colorId 1–11) — teintes saturées.
// Source unique partagée par l'Agenda (affichage) et la page Vie RPG (attribution
// de la couleur de catégorie à une tâche lors de sa création).
export const GCAL_COLORS: Record<string, string> = {
  1: "#7B68EE",  // Lavande (violet plus franc, lisible)
  2: "#33B679",  // Sauge
  3: "#8E24AA",  // Raisin
  4: "#E67C73",  // Flamant
  5: "#F6BF26",  // Banane
  6: "#F4511E",  // Tangerine
  7: "#039BE5",  // Paon
  8: "#CCCCCC",  // Graphite (gris clair)
  9: "#3F51B5",  // Myrtille
  10: "#0B8043", // Basilic
  11: "#D50000", // Tomate
};
// Couleur par défaut (évènement sans colorId) : lavande, accordée à la palette.
export const DEFAULT_EVENT_COLOR = "#7B68EE";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Renvoie le colorId Google (1–11) dont la teinte est la plus proche d'une
// couleur hex arbitraire (distance RGB pondérée perceptuellement). Permet de
// donner à une tâche la couleur de sa catégorie Vie RPG dans l'Agenda.
export function nearestGcalColorId(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "1";
  let best = "1", bestD = Infinity;
  for (const [id, h] of Object.entries(GCAL_COLORS)) {
    const c = hexToRgb(h);
    if (!c) continue;
    const d = 0.3 * (rgb.r - c.r) ** 2 + 0.59 * (rgb.g - c.g) ** 2 + 0.11 * (rgb.b - c.b) ** 2;
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}
