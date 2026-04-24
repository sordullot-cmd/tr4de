// Ultra-light i18n helper.
// Stocke la langue dans localStorage ("tr4de_lang"), émet "tr4de:lang-changed"
// pour que les composants puissent forcer un re-render.
// Utilisation :
//   import { t, useLang } from "@/lib/i18n";
//   const lang = useLang();       // re-render auto au changement
//   const label = t("common.save");

import { useEffect, useState } from "react";

export type Lang = "fr" | "en";

export function getLang(): Lang {
  if (typeof window === "undefined") return "fr";
  try {
    const v = localStorage.getItem("tr4de_lang");
    return v === "en" ? "en" : "fr";
  } catch { return "fr"; }
}

export function setLang(lang: Lang) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("tr4de_lang", lang);
    window.dispatchEvent(new CustomEvent("tr4de:lang-changed", { detail: { lang } }));
  } catch {}
}

/** Hook : renvoie la langue courante et re-render si elle change. */
export function useLang(): Lang {
  const [lang, setLocal] = useState<Lang>(() => getLang());
  useEffect(() => {
    const onChange = () => setLocal(getLang());
    window.addEventListener("tr4de:lang-changed", onChange);
    window.addEventListener("storage", (e) => {
      if (e.key === "tr4de_lang") onChange();
    });
    return () => window.removeEventListener("tr4de:lang-changed", onChange);
  }, []);
  return lang;
}

type Dict = Record<string, string>;
const FR: Dict = {
  // Navigation / sidebar
  "nav.dashboard": "Tableau de bord",
  "nav.trades": "Trades",
  "nav.journal": "Journal",
  "nav.strategies": "Stratégies",
  "nav.calendar": "Calendrier",
  "nav.discipline": "Discipline",
  "nav.agent": "Agent IA",
  "nav.trading": "Trading",
  "nav.analyse": "Analyse",
  "nav.addTrade": "Ajouter un trade",
  "nav.settings": "Paramètres",
  "nav.logout": "Déconnexion",

  // Common
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.create": "Créer",
  "common.add": "Ajouter",
  "common.close": "Fermer",
  "common.loading": "Chargement...",
  "common.search": "Rechercher",
  "common.empty": "Aucun résultat",
  "common.yes": "Oui",
  "common.no": "Non",
  "common.confirm": "Confirmer",

  // Settings
  "settings.title": "Paramètres",
  "settings.profile": "Profil",
  "settings.firstName": "Prénom",
  "settings.lastName": "Nom",
  "settings.email": "Email",
  "settings.timezone": "Fuseau horaire",
  "settings.currency": "Devise",
  "settings.language": "Langue",
  "settings.theme": "Thème",
  "settings.appearance": "Apparence",
  "settings.account": "Compte",
  "settings.saved": "Modifications enregistrées",
};

const EN: Dict = {
  // Navigation / sidebar
  "nav.dashboard": "Dashboard",
  "nav.trades": "Trades",
  "nav.journal": "Journal",
  "nav.strategies": "Strategies",
  "nav.calendar": "Calendar",
  "nav.discipline": "Discipline",
  "nav.agent": "AI Agent",
  "nav.trading": "Trading",
  "nav.analyse": "Analytics",
  "nav.addTrade": "Add trade",
  "nav.settings": "Settings",
  "nav.logout": "Log out",

  // Common
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.create": "Create",
  "common.add": "Add",
  "common.close": "Close",
  "common.loading": "Loading...",
  "common.search": "Search",
  "common.empty": "No results",
  "common.yes": "Yes",
  "common.no": "No",
  "common.confirm": "Confirm",

  // Settings
  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.firstName": "First name",
  "settings.lastName": "Last name",
  "settings.email": "Email",
  "settings.timezone": "Timezone",
  "settings.currency": "Currency",
  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.appearance": "Appearance",
  "settings.account": "Account",
  "settings.saved": "Changes saved",
};

const DICTS: Record<Lang, Dict> = { fr: FR, en: EN };

/** Renvoie la chaîne traduite pour la langue courante (ou la clé si absente). */
export function t(key: string, lang?: Lang): string {
  const l = lang || getLang();
  return DICTS[l][key] ?? DICTS.fr[key] ?? key;
}
