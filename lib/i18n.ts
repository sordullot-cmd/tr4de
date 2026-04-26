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
  "nav.addTrade": "Ajouter des trades",
  "nav.accounts": "Comptes",
  "nav.settings": "Paramètres",
  "nav.logout": "Déconnexion",
  "nav.productivity": "Productivité",
  "nav.tasks": "Tâches",
  "nav.goals": "Objectifs",
  "nav.dailyPlanner": "Planning du jour",
  "nav.habits": "Habitudes",
  "nav.focus": "Minuteur Focus",
  "nav.notes": "Notes",
  "nav.reading": "Liste de lecture",

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
  "common.back": "Retour",
  "common.next": "Suivant",
  "common.import": "Importer",
  "common.notes": "Notes",
  "common.rules": "Règles",
  "common.total": "Total",
  "common.trades": "Trades",
  "common.symbol": "Symbole",
  "common.date": "Date",
  "common.time": "Heure",
  "common.entry": "Entrée",
  "common.exit": "Sortie",
  "common.pnl": "P&L",
  "common.winRate": "Taux de victoire",
  "common.long": "Long",
  "common.short": "Short",
  "common.duration": "Durée",
  "common.week": "Semaine",
  "common.month": "Mois",
  "common.day": "Jour",

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

  // Dashboard
  "dash.title": "Tableau de bord",
  "dash.totalPnL": "P&L Total",
  "dash.winRate": "Taux de victoire",
  "dash.profitFactor": "Facteur de profit",
  "dash.avgWin": "Gain moyen",
  "dash.avgLoss": "Perte moyenne",
  "dash.cumulativePnL": "P&L Cumulatif",
  "dash.calendar": "Calendrier P&L",
  "dash.recentTrades": "Trades Récents",
  "dash.emotionalImpact": "Impact Émotionnel",
  "dash.emotionalImpactSub": "Effet des émotions sur le P&L",
  "dash.tr4deScore": "tao score",
  "dash.tr4deScoreSub": "Évaluation globale de ta performance",
  "dash.globalScore": "Score global",
  "dash.perfByDay": "Performance par jour",
  "dash.noTrades": "Aucun trade à afficher",
  "dash.noTradesSub": "Importez votre premier trade pour voir les statistiques et les graphiques de performance.",
  "dash.asset": "Actif",
  "dash.day": "Jour",
  "dash.avgGain": "Gain Moyen",
  "dash.avgLossHdr": "Perte Moyenne",
  "dash.expectancy": "Espérance",

  // Trades page
  "trades.title": "Trades",
  "trades.importBtn": "+ Importer",
  "trades.colAsset": "Actif",
  "trades.colSide": "Sens",
  "trades.colEntryDate": "Date entrée",
  "trades.colEntryTime": "Heure entrée",
  "trades.colEntry": "Entrée",
  "trades.colExitDate": "Date sortie",
  "trades.colExitTime": "Heure sortie",
  "trades.colExit": "Sortie",
  "trades.colLots": "Contrats",
  "trades.colVolume": "Volume",
  "trades.colPnL": "P&L net",
  "trades.colPnLPct": "P&L %",
  "trades.colDuration": "Durée",
  "trades.deleteConfirm": "Supprimer {n} trade{s} ?",
  "trades.deleteWarning": "Cette action est définitive. Les trades sélectionnés seront supprimés et ne pourront pas être récupérés.",
  "trades.selected": "{n} trade{s} sélectionné{s}",
  "trades.addStrategy": "+ Ajouter une stratégie",

  // Journal page
  "journal.title": "Journal de Trading",
  "journal.empty": "Aucun trade importé",
  "journal.emptySub": "Vos trades apparaîtront ici avec la possibilité d'ajouter des notes",
  "journal.dailyNotes": "Notes pour cette journée...",
  "journal.tradeNote": "Ajoutez vos notes sur ce trade...",

  // Strategies page
  "strat.title": "Stratégies",
  "strat.createBtn": "Créer une stratégie",
  "strat.createFirst": "Créer votre première stratégie",
  "strat.empty": "Aucune stratégie",
  "strat.emptySub": "Créez votre première stratégie avec des règles pour suivre vos performances.",
  "strat.bestPerf": "Meilleure performance",
  "strat.worstPerf": "Moins performante",
  "strat.bestWr": "Meilleur win rate",
  "strat.mostActive": "Plus active",
  "strat.rules": "Règles",
  "strat.performance": "Performance",
  "strat.winsLosses": "Wins / Losses",
  "strat.pnlNet": "P&L Net",
  "strat.deleteTitle": "Supprimer cette stratégie ?",
  "strat.deleteWarn": "Cette action est irréversible. Toutes les données associées à cette stratégie seront supprimées.",
  "strat.new": "Nouvelle stratégie",
  "strat.edit": "Modifier la stratégie",
  "strat.name": "Nom",
  "strat.description": "Description",
  "strat.color": "Couleur",
  "strat.rulesCount": "règles validées",

  // Discipline page
  "disc.title": "Discipline",
  "disc.todayProgress": "Progression du jour",
  "disc.dailyRules": "Règles quotidiennes",
  "disc.personalRules": "Règles perso",
  "disc.rules": "règles",
  "disc.rulesOn": "sur",
  "disc.biasDaily": "Bias Journalier",
  "disc.rulesToFollow": "Règles à suivre",
  "disc.errorsToAvoid": "Erreurs à éviter",
  "disc.checklist": "Checklist quotidienne",
  "disc.progressTracker": "Suivi de progression",
  "disc.streakActive": "jours de suite",
  "disc.noStreak": "Pas de streak active",
  "disc.colRule": "Règle",
  "disc.colType": "Type",
  "disc.colCondition": "Condition",
  "disc.colStreak": "Série",
  "disc.colAvgPerf": "Performance moy.",
  "disc.colFollowRate": "Taux de respect",

  // Calendar page
  "cal.title": "Calendrier",

  // Add Trade page
  "addTrade.title": "Ajouter des trades",
  "addTrade.accountName": "Nom du compte",
  "addTrade.accountType": "Type de Compte",
  "addTrade.live": "Compte Live",
  "addTrade.eval": "Compte Eval",
  "addTrade.funded": "Compte Funded",
  "addTrade.accountSize": "Montant du Compte",
  "addTrade.broker": "Courtier",
  "addTrade.strategy": "Stratégie (optionnel)",
  "addTrade.uploadCSV": "Télécharger le fichier CSV",

  // Agent
  "agent.title": "Agent IA",

  // Emotion tags (visible labels)
  "tag.fomo": "FOMO",
  "tag.revenge": "Vengeance",
  "tag.overconfident": "Trop confiant",
  "tag.hesitation": "Hésitation",
  "tag.calm": "Calme & focus",
  "tag.followed": "Plan suivi",
  "tag.boredom": "Trade ennui",
  "tag.earlyexit": "Sortie anticipée",
  // Error tags
  "errtag.poorentry": "Mauvaise entrée",
  "errtag.poorexit": "Mauvaise sortie",
  "errtag.nosltp": "Pas de SL/TP",
  "errtag.overleveraged": "Sur-leveragé",
  "errtag.ignoredsignal": "Signaux ignorés",
  "errtag.badtiming": "Mauvais timing",
  "errtag.slttoosmall": "SL trop court",
  "errtag.wronganalysis": "Mauvaise analyse",

  // Weekdays
  "wd.monday": "lundi",
  "wd.tuesday": "mardi",
  "wd.wednesday": "mercredi",
  "wd.thursday": "jeudi",
  "wd.friday": "vendredi",
  "wd.saturday": "samedi",
  "wd.sunday": "dimanche",

  // Trades page detail panel
  "trades.tab.infos": "Trade",
  "trades.tab.strategies": "Stratégie",
  "trades.notePlaceholder": "Qu'est-ce qui s'est passé ? Pourquoi avoir pris ce trade ?",
  "trades.tradesOfDay": "Trades du {day}",
  "trades.voirPlus": "Voir plus ({n})",
  "trades.voirMoins": "Voir moins",
  "trades.deleting": "Suppression...",

  // Add trade page
  "addTrade.subtitle": "Importez un export CSV de votre courtier",
  "addTrade.accountSection": "Sélectionne ou crée un compte",
  "addTrade.newAccount": "Nouveau compte",
  "addTrade.existingAccount": "Compte existant",
  "addTrade.chooseAccount": "Choisis un compte",
  "addTrade.accountPlaceholder": "ex. FTMO Eval, Rithmic Live...",
  "addTrade.brokerSection": "Courtier",
  "addTrade.chooseBroker": "Choisis ton courtier",
  "addTrade.csvSection": "Fichier CSV",
  "addTrade.dragDrop": "Glisse ton fichier CSV ici",
  "addTrade.orBrowse": "ou clique pour parcourir",
  "addTrade.importBtn": "Importer",
  "addTrade.importing": "Importation...",
  "addTrade.instructions": "Instructions d'export",
  "addTrade.account": "Compte",
  "addTrade.importTrades": "Importer les trades",
  "addTrade.processing": "Traitement…",
  "addTrade.importError": "📂 Importer des trades",

  "cal.title": "Calendrier",
  "cal.noTrades": "Aucun trade ce mois-ci",
  "cal.noTradesImported": "📥 Aucun trade importé",
  "cal.noTradesImportedSub": "Importez vos trades pour voir les statistiques par jour",
  "cal.monthlyPnL": "P&L mensuel",
  "cal.monthlyTrades": "Trades du mois",
  "cal.maxDrawdown": "Drawdown max",
  "cal.profitDays": "Jours gagnants",
  "cal.lossDays": "Jours perdants",
  "cal.legendPositive": "Profits positifs",
  "cal.legendNegative": "Pertes négatives",
  "cal.legendEmpty": "Pas de trades ({n} trades au total)",

  // Dashboard KPIs
  "dash.kpi.totalPnL": "P&L Total",
  "dash.kpi.winRate": "Taux de victoire",
  "dash.kpi.profitFactor": "Facteur de profit",
  "dash.kpi.totalTrades": "Trades Total",
  "dash.kpi.avgWin": "Gain moyen",
  "dash.kpi.avgLoss": "Perte moyenne",
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
  "nav.addTrade": "Add trades",
  "nav.accounts": "Accounts",
  "nav.settings": "Settings",
  "nav.logout": "Log out",
  "nav.productivity": "Productivity",
  "nav.tasks": "Tasks",
  "nav.goals": "Goals",
  "nav.dailyPlanner": "Daily planner",
  "nav.habits": "Habits",
  "nav.focus": "Focus Timer",
  "nav.notes": "Notes",
  "nav.reading": "Reading List",

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
  "common.back": "Back",
  "common.next": "Next",
  "common.import": "Import",
  "common.notes": "Notes",
  "common.rules": "Rules",
  "common.total": "Total",
  "common.trades": "Trades",
  "common.symbol": "Symbol",
  "common.date": "Date",
  "common.time": "Time",
  "common.entry": "Entry",
  "common.exit": "Exit",
  "common.pnl": "P&L",
  "common.winRate": "Win rate",
  "common.long": "Long",
  "common.short": "Short",
  "common.duration": "Duration",
  "common.week": "Week",
  "common.month": "Month",
  "common.day": "Day",

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

  // Dashboard
  "dash.title": "Dashboard",
  "dash.totalPnL": "Total P&L",
  "dash.winRate": "Win rate",
  "dash.profitFactor": "Profit factor",
  "dash.avgWin": "Average win",
  "dash.avgLoss": "Average loss",
  "dash.cumulativePnL": "Cumulative P&L",
  "dash.calendar": "P&L Calendar",
  "dash.recentTrades": "Recent Trades",
  "dash.emotionalImpact": "Emotional Impact",
  "dash.emotionalImpactSub": "Effect of emotions on P&L",
  "dash.tr4deScore": "tao score",
  "dash.tr4deScoreSub": "Overall performance rating",
  "dash.globalScore": "Overall score",
  "dash.perfByDay": "Performance by day",
  "dash.noTrades": "No trades to display",
  "dash.noTradesSub": "Import your first trade to see performance stats and charts.",
  "dash.asset": "Asset",
  "dash.day": "Day",
  "dash.avgGain": "Avg Gain",
  "dash.avgLossHdr": "Avg Loss",
  "dash.expectancy": "Expectancy",

  // Trades page
  "trades.title": "Trades",
  "trades.importBtn": "+ Import",
  "trades.colAsset": "Asset",
  "trades.colSide": "Side",
  "trades.colEntryDate": "Entry date",
  "trades.colEntryTime": "Entry time",
  "trades.colEntry": "Entry",
  "trades.colExitDate": "Exit date",
  "trades.colExitTime": "Exit time",
  "trades.colExit": "Exit",
  "trades.colLots": "Lots",
  "trades.colVolume": "Volume",
  "trades.colPnL": "Net P&L",
  "trades.colPnLPct": "P&L %",
  "trades.colDuration": "Duration",
  "trades.deleteConfirm": "Delete {n} trade{s}?",
  "trades.deleteWarning": "This action is permanent. Selected trades will be deleted and cannot be recovered.",
  "trades.selected": "{n} trade{s} selected",
  "trades.addStrategy": "+ Add a strategy",

  // Journal page
  "journal.title": "Trading Journal",
  "journal.empty": "No trades imported",
  "journal.emptySub": "Your trades will appear here with the option to add notes",
  "journal.dailyNotes": "Notes for this day...",
  "journal.tradeNote": "Add your notes about this trade...",

  // Strategies page
  "strat.title": "Strategies",
  "strat.createBtn": "Create a strategy",
  "strat.createFirst": "Create your first strategy",
  "strat.empty": "No strategies",
  "strat.emptySub": "Create your first strategy with rules to track your performance.",
  "strat.bestPerf": "Best performer",
  "strat.worstPerf": "Worst performer",
  "strat.bestWr": "Best win rate",
  "strat.mostActive": "Most active",
  "strat.rules": "Rules",
  "strat.performance": "Performance",
  "strat.winsLosses": "Wins / Losses",
  "strat.pnlNet": "Net P&L",
  "strat.deleteTitle": "Delete this strategy?",
  "strat.deleteWarn": "This action is irreversible. All data associated with this strategy will be deleted.",
  "strat.new": "New strategy",
  "strat.edit": "Edit strategy",
  "strat.name": "Name",
  "strat.description": "Description",
  "strat.color": "Color",
  "strat.rulesCount": "rules checked",

  // Discipline page
  "disc.title": "Discipline",
  "disc.todayProgress": "Today's progress",
  "disc.dailyRules": "Daily rules",
  "disc.personalRules": "Personal rules",
  "disc.rules": "rules",
  "disc.rulesOn": "of",
  "disc.biasDaily": "Daily Bias",
  "disc.rulesToFollow": "Rules to follow",
  "disc.errorsToAvoid": "Mistakes to avoid",
  "disc.checklist": "Daily checklist",
  "disc.progressTracker": "Progress Tracker",
  "disc.streakActive": "day streak",
  "disc.noStreak": "No active streak",
  "disc.colRule": "Rule",
  "disc.colType": "Type",
  "disc.colCondition": "Condition",
  "disc.colStreak": "Streak",
  "disc.colAvgPerf": "Avg Performance",
  "disc.colFollowRate": "Follow Rate",

  // Calendar page
  "cal.title": "Calendar",

  // Add Trade page
  "addTrade.title": "Add trades",
  "addTrade.accountName": "Account name",
  "addTrade.accountType": "Account Type",
  "addTrade.live": "Live Account",
  "addTrade.eval": "Eval Account",
  "addTrade.funded": "Funded Account",
  "addTrade.accountSize": "Account Size",
  "addTrade.broker": "Broker",
  "addTrade.strategy": "Strategy (optional)",
  "addTrade.uploadCSV": "Upload CSV file",

  // Agent
  "agent.title": "AI Agent",

  // Emotion tags
  "tag.fomo": "FOMO",
  "tag.revenge": "Revenge",
  "tag.overconfident": "Overconfident",
  "tag.hesitation": "Hesitation",
  "tag.calm": "Calm & focus",
  "tag.followed": "Plan followed",
  "tag.boredom": "Bored trade",
  "tag.earlyexit": "Early exit",
  // Error tags
  "errtag.poorentry": "Poor entry",
  "errtag.poorexit": "Poor exit",
  "errtag.nosltp": "No SL/TP",
  "errtag.overleveraged": "Over-leveraged",
  "errtag.ignoredsignal": "Ignored signals",
  "errtag.badtiming": "Bad timing",
  "errtag.slttoosmall": "SL too short",
  "errtag.wronganalysis": "Wrong analysis",

  // Weekdays
  "wd.monday": "Monday",
  "wd.tuesday": "Tuesday",
  "wd.wednesday": "Wednesday",
  "wd.thursday": "Thursday",
  "wd.friday": "Friday",
  "wd.saturday": "Saturday",
  "wd.sunday": "Sunday",

  // Trades page detail panel
  "trades.tab.infos": "Trade",
  "trades.tab.strategies": "Strategy",
  "trades.notePlaceholder": "What happened? Why did you take this trade?",
  "trades.tradesOfDay": "{day} trades",
  "trades.voirPlus": "Show more ({n})",
  "trades.voirMoins": "Show less",
  "trades.deleting": "Deleting...",

  // Add trade page
  "addTrade.subtitle": "Import a CSV export from your broker",
  "addTrade.accountSection": "Pick or create an account",
  "addTrade.newAccount": "New account",
  "addTrade.existingAccount": "Existing account",
  "addTrade.chooseAccount": "Choose an account",
  "addTrade.accountPlaceholder": "e.g. FTMO Eval, Rithmic Live...",
  "addTrade.brokerSection": "Broker",
  "addTrade.chooseBroker": "Choose your broker",
  "addTrade.csvSection": "CSV File",
  "addTrade.dragDrop": "Drop your CSV file here",
  "addTrade.orBrowse": "or click to browse",
  "addTrade.importBtn": "Import",
  "addTrade.importing": "Importing...",
  "addTrade.instructions": "Export instructions",
  "addTrade.account": "Account",
  "addTrade.importTrades": "Import trades",
  "addTrade.processing": "Processing…",
  "addTrade.importError": "📂 Import trades",

  "cal.title": "Calendar",
  "cal.noTrades": "No trades this month",
  "cal.noTradesImported": "📥 No trades imported",
  "cal.noTradesImportedSub": "Import your trades to see daily stats",
  "cal.monthlyPnL": "Monthly P&L",
  "cal.monthlyTrades": "Monthly trades",
  "cal.maxDrawdown": "Max drawdown",
  "cal.profitDays": "Winning days",
  "cal.lossDays": "Losing days",
  "cal.legendPositive": "Winning days",
  "cal.legendNegative": "Losing days",
  "cal.legendEmpty": "No trades ({n} trades total)",

  // Dashboard KPIs
  "dash.kpi.totalPnL": "Total P&L",
  "dash.kpi.winRate": "Win rate",
  "dash.kpi.profitFactor": "Profit factor",
  "dash.kpi.totalTrades": "Total trades",
  "dash.kpi.avgWin": "Average win",
  "dash.kpi.avgLoss": "Average loss",
};

const DICTS: Record<Lang, Dict> = { fr: FR, en: EN };

/** Renvoie la chaîne traduite pour la langue courante (ou la clé si absente). */
export function t(key: string, lang?: Lang): string {
  const l = lang || getLang();
  return DICTS[l][key] ?? DICTS.fr[key] ?? key;
}
