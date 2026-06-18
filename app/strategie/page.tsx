import { redirect } from "next/navigation";

// 🔒 TRADING MASQUÉ TEMPORAIREMENT — la route /strategie (page Stratégies de
// trading) est désactivée et redirige vers le dashboard. Pour réactiver,
// restaurer le contenu d'origine ci-dessous :
//
//   "use client";
//   import StrategyPage from '@/components/StrategyPage';
//   export default function Page() {
//     return <StrategyPage />;
//   }
export default function Page() {
  redirect("/dashboard");
}
