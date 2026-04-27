import type { MetadataRoute } from "next";

// L'app est privée (auth requise sur toutes les pages utiles). On laisse les
// crawlers visiter la landing/login mais on les exclut du contenu applicatif.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        disallow: ["/dashboard", "/api/", "/strategie", "/_next/", "/font-test"],
      },
    ],
    host: "https://tao-trade.vercel.app",
  };
}
