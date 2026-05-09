import type { BrokerAdapter, BrokerId } from "@/lib/brokers/types";
import { tradovate } from "@/lib/brokers/tradovate";
import { parseMT5CSV, parseMT5HTML, parseWealthChartsCSV, parseNinjaTraderCSV } from "@/lib/csvParsers";

/**
 * Registry des brokers supportés. Pour ajouter un broker :
 *   1) implémenter `BrokerAdapter` dans lib/brokers/<id>.ts
 *   2) l'ajouter ici
 */

export const BROKERS: Record<BrokerId, BrokerAdapter> = {
  tradovate,
  rithmic: {
    meta: {
      id: "rithmic",
      name: "Rithmic",
      description: "Futures broker. Format compatible Tradovate (mêmes colonnes Orders).",
      features: { fileImport: true, apiSync: false },
      color: "#7C3AED",
      initial: "R",
    },
    parseFile: tradovate.parseFile,
  },
  mt5: {
    meta: {
      id: "mt5",
      name: "MetaTrader 5",
      description: "Forex / CFD. Export CSV ou rapport HTML depuis Historique > Détaillé.",
      features: { fileImport: true, apiSync: false },
      color: "#0891B2",
      initial: "M",
    },
    parseFile(content: string) {
      // Détecte HTML vs CSV selon le contenu
      if (/<html/i.test(content) || /<table/i.test(content)) {
        return parseMT5HTML(content);
      }
      return parseMT5CSV(content);
    },
  },
  ninjatrader: {
    meta: {
      id: "ninjatrader",
      name: "NinjaTrader",
      description: "Futures (live & sim/démo). Export depuis Control Center → Trade Performance → Right-click → Export.",
      features: { fileImport: true, apiSync: false },
      color: "#F97316",
      initial: "N",
    },
    parseFile(content: string) {
      return parseNinjaTraderCSV(content);
    },
  },
  ibkr: {
    meta: {
      id: "ibkr",
      name: "Interactive Brokers",
      description: "Stocks, options, futures. Export Activity Statement → CSV.",
      features: { fileImport: false, apiSync: false },
      color: "#DC2626",
      initial: "I",
    },
  },
  wealthcharts: {
    meta: {
      id: "wealthcharts",
      name: "WealthCharts",
      description: "Plateforme de trading. Export trades → CSV.",
      features: { fileImport: true, apiSync: false },
      color: "#059669",
      initial: "W",
    },
    parseFile(content: string) {
      return parseWealthChartsCSV(content);
    },
  },
};

export function getBroker(id: string): BrokerAdapter | null {
  return BROKERS[id as BrokerId] || null;
}

export function listBrokers(): BrokerAdapter[] {
  return Object.values(BROKERS);
}
