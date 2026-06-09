import type { MetadataRoute } from "next";

// Sitemap soumis à Google Search Console. On n'expose que les pages publiques :
// la racine (redirige côté serveur vers /login) et la page de connexion. Tout
// le contenu applicatif est privé (auth requise) et exclu via robots.ts.
const BASE = "https://tao-trade.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: BASE, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/login`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
