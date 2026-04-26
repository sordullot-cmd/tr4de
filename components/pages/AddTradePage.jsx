"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Check as LucideCheck,
  Upload as LucideUpload,
  Star,
} from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { parseCSV } from "@/lib/csvParsers";
import SearchableSelect from "@/components/ui/SearchableSelect";
import QuickAccountSelector from "@/components/QuickAccountSelector";

export default function AddTradePage({ trades, setPage, setAccounts, setSelectedAccountIds, accountType, setAccountType, selectedEvalAccount, setSelectedEvalAccount, accounts = [], selectedAccountIds = [], addTrade, addStrategy, strategies = [], user }) {
  const [accountName, setAccountName] = useState("");
  const [selectedBroker, setSelectedBroker] = useState("tradovate");

  // Favoris brokers : localStorage = cache rapide, Supabase = source de vérité.
  const [favoriteBrokers, setFavoriteBrokers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tr4de_favorite_brokers") || "[]"); }
    catch { return []; }
  });

  // Charger depuis Supabase au montage + au focus
  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("favorite_brokers")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) {
          if (error.message?.includes("Could not find the table") || error.code === "PGRST116") return;
          throw error;
        }
        if (cancelled) return;
        const list = Array.isArray(data?.favorite_brokers) ? data.favorite_brokers : [];
        setFavoriteBrokers(list);
        try { localStorage.setItem("tr4de_favorite_brokers", JSON.stringify(list)); } catch {}
      } catch (e) { console.error("⚠️ load favorite_brokers failed:", e?.message || e); }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user?.id]);

  const toggleFavoriteBroker = (id) => {
    setFavoriteBrokers(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem("tr4de_favorite_brokers", JSON.stringify(next)); } catch {}
      // Push vers Supabase (upsert sur user_id UNIQUE)
      if (user?.id) {
        const supabase = createClient();
        supabase.from("user_preferences")
          .upsert([{ user_id: user.id, favorite_brokers: next }], { onConflict: "user_id" })
          .then(({ error }) => {
            if (error) console.error("⚠️ save favorite_brokers failed:", error.message);
          });
      }
      return next;
    });
  };
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedImportStrategy, setSelectedImportStrategy] = useState("");
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [strategyFormData, setStrategyFormData] = useState({ name: "", description: "", color: "#5F7FB4", groups: [{ id: Date.now(), name: "", rules: [{ id: Date.now() + 1, text: "" }] }] });
  const fileInputRef = useRef(null);

  const colors = ["#9B7D94", "#997B5D", "#A5956B", "#6B9B6F", "#4A9D6F", "#6B9D68", "#5F8BA0", "#5F7FB4", "#6B8BB4", "#8B7BA4", "#A07B94", "#7F7F7F"];

  // ✅ Les stratégies viennent maintenant du hook passé en props

  const getDefaultStrategyFormData = () => ({
    name: "",
    description: "",
    color: "#5F7FB4",
    groups: [{ id: Date.now(), name: "", rules: [{ id: Date.now() + 1, text: "" }] }]
  });

  const handleCreateStrategyFromForm = async () => {
    if (strategyFormData.name.trim() && strategyFormData.groups.length > 0) {
      const validGroups = strategyFormData.groups.every(g => g.rules && g.rules.length > 0);
      if (validGroups) {
        // ✅ Generate a proper UUID instead of timestamp
        const newId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newStrategy = {
          id: newId,
          name: strategyFormData.name,
          description: strategyFormData.description,
          color: strategyFormData.color,
          groups: strategyFormData.groups,
          // Don't add 'created' - it's added by addStrategy as 'created_at'
        };
        // ✅ Ajouter la stratégie via le hook avec gestion d'erreur
        try {
          console.log("📝 Creating strategy:", newStrategy);
          const created = await addStrategy(newStrategy);
          console.log("✅ Strategy created successfully:", created);
          setSelectedImportStrategy(newId);
          setStrategyFormData(getDefaultStrategyFormData());
          setShowStrategyForm(false);
        } catch (err) {
          const errMsg = err?.message || JSON.stringify(err) || "Unknown error";
          console.error("❌ Failed to create strategy:", errMsg);
          alert(`❌ Erreur lors de la création de la stratégie: ${errMsg}`);
        }
      }
    }
  };

  const addGroup = () => {
    setStrategyFormData({
      ...strategyFormData,
      groups: [...strategyFormData.groups, { id: Date.now(), name: "", rules: [{ id: Date.now(), text: "" }] }]
    });
  };

  const removeGroup = (groupId) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.filter(g => g.id !== groupId)
    });
  };

  const updateGroup = (groupId, field, value) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.map(g => g.id === groupId ? { ...g, [field]: value } : g)
    });
  };

  const addRule = (groupId) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.map(g => g.id === groupId ? { ...g, rules: [...g.rules, { id: Date.now(), text: "" }] } : g)
    });
  };

  const removeRule = (groupId, ruleId) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.map(g => g.id === groupId ? { ...g, rules: g.rules.filter(r => r.id !== ruleId) } : g)
    });
  };

  const updateRule = (groupId, ruleId, value) => {
    setStrategyFormData({
      ...strategyFormData,
      groups: strategyFormData.groups.map(g => g.id === groupId ? { ...g, rules: g.rules.map(r => r.id === ruleId ? { ...r, text: value } : r) } : g)
    });
  };

  const brokers = [
    // Futures / Prop firms
    { id: "tradovate",     name: "Tradovate",            format: "csv",  iconPath: "/trado.png" },
    { id: "rithmic",       name: "Rithmic R|Trader",     format: "csv",  iconPath: "/brokers/rithmic.png" },
    { id: "ninjatrader",   name: "NinjaTrader",          format: "csv",  iconPath: "/brokers/ninja%20trader.png" },
    { id: "topstep",       name: "Topstep X",            format: "csv",  iconPath: "/brokers/Topstep_Logo.jpg" },
    { id: "ftmo",          name: "FTMO",                 format: "csv",  iconPath: "/brokers/ftmo.png" },
    // Plateformes
    { id: "tradingview",   name: "TradingView",          format: "csv",  iconPath: "/brokers/tradingview.webp" },
    { id: "mt5",           name: "MetaTrader 5",         format: "html", iconPath: "/MetaTrader_5.png" },
    { id: "mt4",           name: "MetaTrader 4",         format: "html", iconPath: "/brokers/MetaTrader_4.png" },
    { id: "thinkorswim",   name: "thinkorswim",          format: "csv",  iconPath: "/brokers/thinkorswim.png" },
    { id: "wealthcharts",  name: "WealthCharts",         format: "csv",  iconPath: "/weal.webp" },
    // Brokers actions / CFD
    { id: "ibkr",          name: "Interactive Brokers",  format: "csv",  iconPath: "/brokers/Interactive%20broker.png" },
    { id: "capitalcom",    name: "Capital.com",          format: "csv",  iconPath: "/brokers/capital.png" },
    { id: "ig",            name: "IG",                   format: "csv",  iconPath: "/brokers/if%20logo.png" },
    { id: "webull",        name: "Webull",               format: "csv",  iconPath: "/brokers/webull.png" },
  ];

  const getBrokerInstructions = () => {
    const broker = brokers.find(b => b.id === selectedBroker);
    const iconPath = broker?.iconPath || "/trado.png";
    const name = broker?.name || "Broker";

    const map = {
      tradovate: {
        subtext: "Actifs : Futures (CME, ICE, Eurex)",
        steps: [
          "1. Ouvrir l'onglet Account de Tradovate",
          "2. Aller dans Settings → Orders",
          "3. Sélectionner la plage de dates et cliquer Go",
          "4. Cliquer Download Report (export CSV)",
          "5. Charger le fichier CSV ici"
        ]
      },
      rithmic: {
        subtext: "Actifs : Futures (multi-bourses)",
        steps: [
          "1. Ouvrir Rithmic R|Trader Pro",
          "2. Menu Reports → Order History (ou Trade History)",
          "3. Choisir la plage de dates puis Run Report",
          "4. Bouton Save / Export → format CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      ninjatrader: {
        subtext: "Actifs : Futures, Forex, Actions",
        steps: [
          "1. Ouvrir NinjaTrader Control Center",
          "2. Menu Account → Account Performance (ou Trade Performance)",
          "3. Filtrer par compte et période",
          "4. Clic-droit sur le tableau des Trades → Export → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      topstep: {
        subtext: "Prop firm Futures – plateforme TopstepX",
        steps: [
          "1. Se connecter au dashboard TopstepX",
          "2. Onglet Performance / Trade History",
          "3. Filtrer par compte et plage de dates",
          "4. Bouton Export → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      ftmo: {
        subtext: "Prop firm Forex / CFD – via MetaTrader",
        steps: [
          "1. Ouvrir MetaTrader 4/5 connecté au compte FTMO",
          "2. Onglet Toolbox → History",
          "3. Clic-droit → Custom Period et choisir la plage",
          "4. Clic-droit à nouveau → Save as Report (HTML)",
          "5. Charger le fichier HTML ici"
        ]
      },
      tradingview: {
        subtext: "Charts + brokers connectés",
        steps: [
          "1. Ouvrir le panneau Trading en bas de TradingView",
          "2. Onglet History des ordres ou trades",
          "3. Bouton Export ou ⋯ → Download CSV",
          "4. Charger le fichier CSV ici"
        ]
      },
      mt5: {
        subtext: "Forex, Actions, Indices, Crypto",
        steps: [
          "1. Ouvrir le terminal MetaTrader 5",
          "2. Onglet Toolbox → History",
          "3. Clic-droit → Custom Period et choisir la plage",
          "4. Clic-droit à nouveau → Report → Open XML (HTML)",
          "5. Charger le fichier HTML ici"
        ]
      },
      mt4: {
        subtext: "Forex, CFD",
        steps: [
          "1. Ouvrir le terminal MetaTrader 4",
          "2. Onglet Terminal → Account History",
          "3. Clic-droit → All History (ou période personnalisée)",
          "4. Clic-droit à nouveau → Save as Detailed Report (HTML)",
          "5. Charger le fichier HTML ici"
        ]
      },
      thinkorswim: {
        subtext: "Charles Schwab – Actions, Options, Futures",
        steps: [
          "1. Ouvrir thinkorswim Desktop",
          "2. Onglet Monitor → Account Statement",
          "3. Sélectionner la plage de dates",
          "4. Bouton menu (icône ⚙) → Export to File → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      wealthcharts: {
        subtext: "Plateforme charts – Futures, Actions, Indices",
        steps: [
          "1. Ouvrir WealthCharts Trading Platform",
          "2. Aller dans Orders ou History",
          "3. Exporter en CSV",
          "4. Vérifier que le fichier contient : order_id, qty_sent, qty_done, price_done",
          "5. Charger le fichier CSV ici"
        ]
      },
      ibkr: {
        subtext: "Actions, Options, Futures, Forex (multi-marchés)",
        steps: [
          "1. Se connecter au Client Portal IBKR",
          "2. Performance & Reports → Statements ou Flex Queries",
          "3. Configurer une Flex Query Trades / Executions",
          "4. Lancer la requête et télécharger le CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      capitalcom: {
        subtext: "CFD sur Forex, Actions, Indices, Crypto",
        steps: [
          "1. Se connecter au compte Capital.com (web)",
          "2. Menu My Account → Statements / Reports",
          "3. Filtrer par période → onglet Trades / Closed positions",
          "4. Bouton Export → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      ig: {
        subtext: "CFD, Spread Betting, Actions",
        steps: [
          "1. Se connecter à My IG (Web)",
          "2. Menu History (Live Account)",
          "3. Sélectionner la plage de dates",
          "4. Bouton Download → CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
      webull: {
        subtext: "Actions, Options, Crypto (US)",
        steps: [
          "1. Ouvrir l'app Webull Desktop ou Web",
          "2. Menu Account → Statements (Activity Statements)",
          "3. Choisir la période et type Trade Activity",
          "4. Export en CSV",
          "5. Charger le fichier CSV ici"
        ]
      },
    };

    const cfg = map[selectedBroker] || map.tradovate;
    return {
      iconPath,
      name,
      title: name,
      subtext: cfg.subtext,
      steps: cfg.steps,
    };
  };

  const lastSavedRef = useRef({ broker: null, type: null, size: null });

  // Charger les infos du compte quand le nom change
  useEffect(() => {
    if (accountName && accounts.length > 0) {
      const selectedAccount = accounts.find(acc => acc.name === accountName);
      if (selectedAccount) {
        const brokerMatch = brokers.find(b =>
          b.name.toLowerCase() === String(selectedAccount.broker || "").toLowerCase() ||
          b.id.toLowerCase() === String(selectedAccount.broker || "").toLowerCase()
        );
        const bId = brokerMatch?.id || "tradovate";
        const aType = selectedAccount.account_type || "live";
        const aSize = (aType === "eval" && selectedAccount.eval_account_size)
          ? selectedAccount.eval_account_size
          : "25k";

        lastSavedRef.current = { broker: bId, type: aType, size: aSize };
        setSelectedBroker(bId);
        setAccountType(aType);
        setSelectedEvalAccount(aSize);
        setIsEditingAccount(true);
      }
    } else {
      setIsEditingAccount(false);
    }
  }, [accountName, accounts]);

  // Auto-sauvegarde : ne fire que si la valeur diffère de ce qui est en DB
  useEffect(() => {
    if (!isEditingAccount) return;
    const saved = lastSavedRef.current;
    if (
      saved.broker === selectedBroker &&
      saved.type === accountType &&
      saved.size === selectedEvalAccount
    ) return;
    const t = setTimeout(() => {
      lastSavedRef.current = {
        broker: selectedBroker,
        type: accountType,
        size: selectedEvalAccount,
      };
      saveAccountChanges();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBroker, accountType, selectedEvalAccount, isEditingAccount]);

  // Sauvegarder les changements du compte
  const saveAccountChanges = async () => {
    console.log("🔄 Tentative de sauvegarde...");
    console.log("accountName:", accountName);
    console.log("isEditingAccount:", isEditingAccount);
    console.log("accounts:", accounts);
    
    if (!isEditingAccount || !accountName || accounts.length === 0) {
      console.log("❌ Conditions non remplies - early return");
      return;
    }
    
    setSaveStatus("saving");
    try {
      const supabase = createClient();
      const selectedAccount = accounts.find(acc => acc.name === accountName);
      console.log("selectedAccount trouvé:", selectedAccount);
      
      if (!selectedAccount) {
        console.log("❌ Compte NOT trouvé avec le nom:", accountName);
        setSaveStatus("error");
        return;
      }
      
      const brokerObj = brokers.find(b => b.id === selectedBroker);
      const updateData = {
        broker: brokerObj?.name || "Tradovate",
        account_type: accountType,
        eval_account_size: accountType === "eval" ? selectedEvalAccount : null,
      };
      console.log("Données à sauvegarder:", updateData);
      
      const { error } = await supabase
        .from("trading_accounts")
        .update(updateData)
        .eq("id", selectedAccount.id);
      
      console.log("Réponse DB - error:", error);
        
      if (error) {
        console.error("❌ Erreur DB:", error);
        setSaveStatus("error");
      } else {
        console.log("✅ Compte mis à jour!");
        
        // RECHARGER les comptes depuis la DB
        const userId = user?.id;
        const { data: refreshedAccounts } = await supabase
          .from("trading_accounts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        
        console.log("Comptes rechargés:", refreshedAccounts);
        
        if (setAccounts) {
          setAccounts(refreshedAccounts || []);
        }

        // Notifier les autres composants (sidebar, selecteurs) pour rafraichir le logo
        try {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("tr4de:accounts-changed"));
          }
        } catch {}

        setSaveStatus("success");
        setTimeout(() => setSaveStatus(""), 2000);
      }
    } catch (err) {
      console.error("❌ Exception:", err);
      setSaveStatus("error");
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setLoading(true);
    try {
      const content = await file.text();
      setFileContent(content);
      const trades = parseCSV(content, selectedBroker);
      if (trades.length === 0) {
        setError("❌ Aucun trade trouvé dans le fichier. Vérifiez le format.");
        setPreview([]);
        setLoading(false);
        return;
      }
      setPreview(trades.slice(0, 3));
      setError("");
    } catch (err) {
      setError(`❌ Erreur: ${err.message}`);
      setPreview([]);
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!accountName.trim()) {
      setError("❌ Veuillez entrer un nom de compte");
      return;
    }
    if (!fileContent) {
      setError("❌ Aucun fichier sélectionné");
      return;
    }
    
    setLoading(true);
    
    try {
      const supabase = createClient();
      const userId = user?.id;
      const importedTrades = parseCSV(fileContent, selectedBroker);
      if (importedTrades.length === 0) {
        setError("❌ Aucun trade trouvé");
        setLoading(false);
        return;
      }
      
      // Nom officiel du broker pour enregistrement DB
      const brokerObj = brokers.find(b => b.id === selectedBroker);
      const brokerFormatted = brokerObj?.name || "Tradovate";
      
      // Créer ou obtenir le compte
      let accountId;
      
      // Vérifier si le compte existe déjà
      const { data: existingAccount, error: checkError } = await supabase
        .from("trading_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("name", accountName.trim())
        .single();
      
      if (existingAccount) {
        // Le compte existe, utiliser son ID
        accountId = existingAccount.id;
      } else {
        // Créer un nouveau compte
        const { data: newAccount, error: createError } = await supabase
          .from("trading_accounts")
          .insert([{
            user_id: userId,
            name: accountName.trim(),
            broker: brokerFormatted,
            account_type: accountType,
            eval_account_size: accountType === "eval" ? selectedEvalAccount : null,
          }])
          .select();
        
        if (createError) {
          console.error("Error creating account:", createError);
          setError("❌ Erreur lors de la création du compte: " + createError.message);
          setLoading(false);
          return;
        }
        
        if (!newAccount || newAccount.length === 0) {
          setError("❌ Erreur: compte non créé");
          setLoading(false);
          return;
        }
        
        accountId = newAccount[0].id;
      }
      
      // Insérer les trades
      const tradesToInsert = importedTrades
        .map(t => ({
          user_id: userId,
          account_id: accountId,
          date: t.date,
          symbol: t.symbol,
          direction: t.direction,
          entry: t.entry,
          exit: t.exit,
          pnl: t.pnl,
          entry_time: t.entryTime || t.entry_time || null,
          exit_time: t.exitTime || t.exit_time || null,
        }));
      
      if (tradesToInsert.length === 0) {
        setError("❌ Aucun trade avec un P&L >= $50 trouvé");
        setLoading(false);
        return;
      }
      
      const { error: insertError } = await supabase
        .from("apex_trades")
        .insert(tradesToInsert);
      
      if (insertError) {
        console.error("Error inserting trades:", insertError);
        setError("❌ Erreur lors de la sauvegarde des trades: " + insertError.message);
        setLoading(false);
        return;
      }
      
      // ⭐ RECHARGER les trades depuis Supabase pour avoir les IDs UUID corrects
      // (et pas les IDs numériques du CSV qui causent des erreurs lors de la suppression)
      console.log("📥 Rechargement des trades depuis Supabase après import...");
      console.log("  Fetching ALL trades for user:", userId);
      
      // ✅ CRITICAL FIX 1: Fetch ALL trades for the user (not just this account)
      // to update localStorage which feeds the useTrades() hook
      const { data: allUserTrades, error: fetchError } = await supabase
        .from("apex_trades")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      console.log("  Fetch result:", { hasError: !!fetchError, tradesCount: allUserTrades?.length });
      
      let freshTrades = [];
      if (fetchError) {
        console.error("❌ Error fetching fresh trades:", fetchError);
        // Continue anyway - at least trades are saved
      } else if (allUserTrades && allUserTrades.length > 0) {
        freshTrades = allUserTrades;
        console.log(`✅ Loaded ${allUserTrades.length} fresh trades from Supabase`);
        console.log("First trade structure:", allUserTrades[0]);
        
        // ✅ CRITICAL FIX 2: Update localStorage AND dispatch event so useTrades() hook sees new trades
        // This triggers the component to re-render with imported trades WITHOUT needing a refresh
        localStorage.setItem("tr4de_trades", JSON.stringify(allUserTrades));
        console.log("💾 Updated tr4de_trades in localStorage");
        
        // ✅ CRITICAL FIX 2b: Dispatch custom event to notify useTrades hook in this same tab
        // (storage events don't fire in the same tab, only in other tabs)
        window.dispatchEvent(new CustomEvent("trades-refreshed", { detail: { trades: allUserTrades } }));
        console.log("🔔 Dispatched trades-refreshed event");
      } else {
        console.warn("⚠️  No fresh trades returned from Supabase");
      }
      
      // Link imported trades to strategy if selected
      // ⭐ IMPORTANT: Use ONLY freshTrades (the ones actually saved to DB), not importedTrades
      // because importedTrades includes ALL trades but some are filtered out (pnl < $50)
      if (selectedImportStrategy && freshTrades && freshTrades.length > 0) {
        console.log("🔗 LINKING TRADES TO STRATEGY START");
        console.log("  Selected Strategy ID:", selectedImportStrategy);
        console.log("  Fresh trades count (from Supabase):", freshTrades.length);
        
        const tradeStrategiesData = (() => {
          const saved = localStorage.getItem("tr4de_trade_strategies");
          return saved ? JSON.parse(saved) : {};
        })();
        
        console.log("📋 Current trade-strategy mapping BEFORE:", JSON.stringify(tradeStrategiesData, null, 2));
        
        freshTrades.forEach((trade, idx) => {
          // Normalize entry to string with 2 decimals for consistent key
          const normalizedEntry = parseFloat(trade.entry).toFixed(2);
          
          console.log(`\n  Trade ${idx + 1}:`, {
            date: trade.date,
            symbol: trade.symbol,
            entry: trade.entry,
            normalized_entry: normalizedEntry,
            pnl: trade.pnl,
            id: trade.id
          });
          
          // Use multiple key formats to ensure compatibility:
          // 1. date + symbol + entry (for backward compatibility with old format)
          // 2. UUID id (for Supabase trades)
          const keys = [
            `${trade.date}${trade.symbol}${trade.entry}`,           // Original format
            `${trade.date}${trade.symbol}${normalizedEntry}`,       // Normalized format
            trade.id                                                // Supabase UUID - NEW!
          ];
          
          const strategyId = String(selectedImportStrategy);
          let keyUsed = null;
          
          // Try each key format, in case there's a format mismatch
          for (const tradeIdKey of keys) {
            if (!tradeStrategiesData[tradeIdKey]) {
              tradeStrategiesData[tradeIdKey] = [];
            }
            
            if (!tradeStrategiesData[tradeIdKey].includes(strategyId)) {
              tradeStrategiesData[tradeIdKey].push(strategyId);
              if (!keyUsed) keyUsed = tradeIdKey;
              console.log(`    ✓ KEY: "${tradeIdKey}"`);
              console.log(`    ✓ Added strategy ${strategyId}`);
            }
          }
          
          if (!keyUsed) {
            console.log(`    ⚠️  Strategy already linked`);
          }
        });
        
        console.log("\n📝 Updated trade-strategy mapping AFTER:", JSON.stringify(tradeStrategiesData, null, 2));
        localStorage.setItem("tr4de_trade_strategies", JSON.stringify(tradeStrategiesData));
        console.log("✅ Saved to tr4de_trade_strategies");
      } else {
        if (!selectedImportStrategy) {
          console.warn("⚠️  No strategy selected - trades won't be linked");
        }
        if (!freshTrades || freshTrades.length === 0) {
          console.warn("⚠️  No fresh trades found - nothing to link");
        }
      }
      
      // Recharger les comptes en haut
      const { data: updatedAccounts } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (setAccounts) {
        setAccounts(updatedAccounts || []);
        
        // ✅ CRITICAL FIX 3: After successful import, ADD the new account to selected accounts
        // (Don't replace! User should see both old and new account trades)
        const importedAccount = updatedAccounts?.find(acc => acc.id === accountId);
        if (importedAccount) {
          // Append new account to existing selectedAccountIds
          const newSelectedIds = Array.from(new Set([...selectedAccountIds, accountId]));
          setSelectedAccountIds(newSelectedIds);
          localStorage.setItem('selectedAccountIds', JSON.stringify(newSelectedIds));
          console.log("✅ Account added to selection:", newSelectedIds);
        }
      }
      
      setAccountName("");
      setFileName("");
      setFileContent("");
      setPreview([]);
      setSelectedBroker("tradovate");
      setSelectedImportStrategy("");
      setError("");
      setLoading(false);
      
      // Rediriger vers la page des trades après 1.5s
      setTimeout(() => {
        setPage("trades");
      }, 1500);
    } catch (err) {
      setError(`❌ Erreur d'import: ${err.message}`);
      console.error("Import error:", err);
      setLoading(false);
    }
  };

  const brokerInfo = getBrokerInstructions();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "#fff", width: "100%", minHeight: "100%", fontFamily: "var(--font-sans)" }} className="anim-1">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: "#0D0D0D", margin: 0, letterSpacing: -0.1 }}>{t("addTrade.title") || "Importer des trades"}</h1>
        <div id="tr4de-page-header-slot" style={{ marginLeft: "auto" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
      {/* LEFT: QUESTIONNAIRE FORM */}
      <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, padding: 0, background: "#fff", flex: "0.7" }}>
          <div style={{ padding: 24 }}>
          
          {/* ACCOUNT SELECTOR */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#5C5C5C" }}>
              {t("addTrade.account")}
            </label>
            <QuickAccountSelector
              selectedAccountName={accountName}
              onAccountNameChange={setAccountName}
              T={T}
            />
          </div>
          {/* BROKER */}
          <div style={{ marginTop: "14px", marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#5C5C5C" }}>
              {t("addTrade.broker")}
            </label>
            <SearchableSelect
              value={selectedBroker}
              onChange={(id) => { setSelectedBroker(id); setError(""); }}
              options={(() => {
                const isFav = (id) => favoriteBrokers.includes(id);
                const sorted = [...brokers].sort((a, b) => {
                  const fa = isFav(a.id), fb = isFav(b.id);
                  if (fa !== fb) return fa ? -1 : 1;          // favoris en haut
                  return a.name.localeCompare(b.name);        // puis alphabétique
                });
                return sorted.map(b => ({
                  id: b.id,
                  label: b.name,
                  iconUrl: b.iconPath,
                  accessory: (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={isFav(b.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                      title={isFav(b.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                      onClick={() => toggleFavoriteBroker(b.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFavoriteBroker(b.id); } }}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 22, height: 22, borderRadius: 4,
                        background: "transparent", cursor: "pointer", padding: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F0F0F0"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <Star
                        size={13}
                        strokeWidth={1.75}
                        color={isFav(b.id) ? "#F59E0B" : "#8E8E8E"}
                        fill={isFav(b.id) ? "#F59E0B" : "none"}
                      />
                    </span>
                  ),
                }));
              })()}
              searchPlaceholder="Rechercher un courtier..."
              emptyLabel="Aucun courtier"
              small
            />
          </div>
          {/* ACCOUNT TYPE — toggle live/eval */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#5C5C5C" }}>
              {t("addTrade.accountType")}
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={accountType === "eval"}
              onClick={() => setAccountType(accountType === "eval" ? "live" : "eval")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              <span
                style={{
                  position: "relative",
                  width: 36,
                  height: 20,
                  borderRadius: 999,
                  background: accountType === "eval" ? T.text : "#D4D4D4",
                  transition: "background 160ms ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: accountType === "eval" ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    transition: "left 160ms ease",
                  }}
                />
              </span>
              <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                {accountType === "eval" ? t("addTrade.eval") : t("addTrade.live")}
              </span>
            </button>
            {accountType === "eval" && (
              <div style={{ marginTop: "12px" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "8px", color: T.textMut, textTransform: "uppercase" }}>
                  {t("addTrade.accountSize")}
                </label>
                <SearchableSelect
                  value={selectedEvalAccount}
                  onChange={setSelectedEvalAccount}
                  options={[
                    { id: "25k", label: "$25,000" },
                    { id: "50k", label: "$50,000" },
                    { id: "100k", label: "$100,000" },
                    { id: "150k", label: "$150,000" },
                  ]}
                  searchable={false}
                />
              </div>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${T.border}`, margin: "24px 0" }} />
          {/* FILE */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#5C5C5C" }}>
              Fichier
            </label>
            <div
              style={{
                padding: "36px 20px",
                border: `1px dashed ${fileName ? "#16A34A" : T.border}`,
                borderRadius: 12,
                textAlign: "center",
                cursor: "pointer",
                background: fileName ? "rgba(16, 163, 127, 0.04)" : "#FAFAFA",
                transition: "border-color 160ms ease, background 160ms ease",
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#0D0D0D"; e.currentTarget.style.background = "#F5F5F5"; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = fileName ? "#16A34A" : T.border; e.currentTarget.style.background = fileName ? "rgba(16, 163, 127, 0.04)" : "#FAFAFA"; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = fileName ? "#16A34A" : T.border;
                e.currentTarget.style.background = fileName ? "rgba(16, 163, 127, 0.04)" : "#FAFAFA";
                const file = e.dataTransfer.files?.[0];
                if (file && fileInputRef.current) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  fileInputRef.current.files = dt.files;
                  handleFileSelect({ target: { files: [file] } });
                }
              }}
            >
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: "none" }} accept=".csv,.html,.txt" />
              <button
                aria-label="Importer un fichier"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", fontFamily: "var(--font-sans)" }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 44, height: 44, borderRadius: "50%",
                  background: fileName ? "rgba(16, 163, 127, 0.12)" : "#F0F0F0",
                  color: fileName ? "#16A34A" : "#5C5C5C",
                  transition: "background 160ms ease, color 160ms ease",
                }}>
                  {fileName
                    ? <LucideCheck size={20} strokeWidth={2} />
                    : <LucideUpload size={20} strokeWidth={1.75} />}
                </span>
                <div>
                  <div style={{ fontSize: 13, color: "#0D0D0D", fontWeight: 600, marginBottom: 4 }}>
                    {fileName || "Glissez votre fichier ici"}
                  </div>
                  <div style={{ fontSize: 11, color: "#8E8E8E", fontWeight: 400 }}>
                    {fileName ? "Fichier prêt à être importé" : <>ou <span style={{ color: "#0D0D0D", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}>parcourir</span> · CSV, TXT, HTML</>}
                  </div>
                </div>
              </button>
            </div>
          </div>
          {/* PREVIEW */}
          {preview.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: T.textMut, marginBottom: "12px", textTransform: "uppercase" }}>
                Aperçu ({preview.length} trades)
              </label>
              <div style={{ overflowX: "auto", background: T.bg, borderRadius: "6px", padding: "12px" }}>
                <table style={{ width: "100%", fontSize: "10px" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: T.textSub }}>Date</th>
                      <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: T.textSub }}>Symbol</th>
                      <th style={{ padding: "8px", textAlign: "right", fontWeight: "600", color: T.textSub }}>Entry</th>
                      <th style={{ padding: "8px", textAlign: "right", fontWeight: "600", color: T.textSub }}>Exit</th>
                      <th style={{ padding: "8px", textAlign: "right", fontWeight: "600", color: T.textSub }}>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((trade, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "8px", color: T.textSub, fontSize: "10px" }}>{trade.date}</td>
                        <td style={{ padding: "8px", color: T.textSub, fontWeight: "600" }}>{trade.symbol}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: T.textSub }}>{trade.entry?.toFixed(2)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: T.textSub }}>{trade.exit?.toFixed(2)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: trade.pnl >= 0 ? T.green : T.red, fontWeight: "600" }}>
                          {trade.pnl >= 0 ? "+" : ""}{trade.pnl?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {error && <div style={{ padding: "12px", background: "#FEE2E2", border: `1px solid #FCA5A5`, borderRadius: "6px", fontSize: "12px", color: "#991B1B", marginBottom: "16px" }}>{error}</div>}

          <button
            onClick={handleImport}
            disabled={!fileContent || !accountName.trim() || loading}
            style={{
              width: "100%",
              padding: "12px 24px",
              borderRadius: "8px",
              background: fileContent && accountName.trim() && !loading ? T.green : T.border2,
              color: "#fff",
              border: "none",
              cursor: fileContent && accountName.trim() && !loading ? "pointer" : "not-allowed",
              fontSize: "12px",
              fontWeight: "600",
              opacity: fileContent && accountName.trim() && !loading ? 1 : 0.6,
            }}
          >
            {loading ? t("addTrade.processing") : t("addTrade.importTrades")}
          </button>

          {/* STRATEGY FORM MODAL */}
          {showStrategyForm && ReactDOM.createPortal(
            <div onClick={() => { setShowStrategyForm(false); setStrategyFormData(getDefaultStrategyFormData()); }} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div onClick={(e)=>e.stopPropagation()} style={{background:T.white,borderRadius:12,padding:40,maxWidth:600,width:"90%",maxHeight:"90vh",overflowY:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h2 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>Créer une stratégie</h2>
                  <button aria-label="Fermer" onClick={() => { setShowStrategyForm(false); setStrategyFormData(getDefaultStrategyFormData()); }} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:T.textMut}}>✕</button>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:6,color:T.textMut}}>Nom de la stratégie</label>
                  <input type="text" value={strategyFormData.name} onChange={(e)=>setStrategyFormData({...strategyFormData,name:e.target.value})} placeholder="ex. Scalp 5min FVG" style={{width:"100%",padding:"10px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:14,outline:"none"}}/>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:6,color:T.textMut}}>Description</label>
                  <textarea value={strategyFormData.description} onChange={(e)=>setStrategyFormData({...strategyFormData,description:e.target.value})} placeholder="Décrivez votre stratégie..." style={{width:"100%",padding:"10px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:14,outline:"none",resize:"vertical",minHeight:60}}/>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:8,color:T.textMut}}>Couleur</label>
                  <div style={{display:"flex",gap:8}}>
                    {colors.map(color=>(
                      <button key={color} aria-label={`Couleur ${color}`} aria-pressed={strategyFormData.color===color} onClick={()=>setStrategyFormData({...strategyFormData,color})} style={{width:32,height:32,borderRadius:8,background:color,border:strategyFormData.color===color?`3px solid ${T.text}`:"2px solid #ddd",cursor:"pointer"}}/>
                    ))}
                  </div>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:8,color:T.textMut}}>Groupes de règles</label>
                  {strategyFormData.groups && strategyFormData.groups.map((group,gIdx)=>(
                    <div key={group.id} style={{marginBottom:16,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.bg}}>
                      <div style={{display:"flex",gap:8,marginBottom:12}}>
                        <input type="text" placeholder="Nom du groupe" value={group.name} onChange={(e)=>updateGroup(group.id,"name",e.target.value)} style={{flex:1,padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,outline:"none"}}/>
                        {strategyFormData.groups.length > 1 && <button aria-label="Supprimer le groupe" onClick={()=>removeGroup(group.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:T.red}}>✕</button>}
                      </div>

                      <div style={{display:"flex",flexDirection:"column",gap:6,paddingLeft:20}}>
                        {group.rules && group.rules.map((rule,rIdx)=>(
                          <div key={rule.id} style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:10,color:T.textMut}}>•</span>
                            <input type="text" placeholder="ex., FVG 5m" value={rule.text} onChange={(e)=>updateRule(group.id,rule.id,e.target.value)} style={{flex:1,padding:"6px 10px",borderRadius:4,border:`1px solid ${T.border}`,fontSize:11,outline:"none"}}/>
                            {group.rules.length > 1 && <button aria-label="Supprimer la règle" onClick={()=>removeRule(group.id,rule.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:T.red}}>✕</button>}
                          </div>
                        ))}
                        <button onClick={()=>addRule(group.id)} style={{marginTop:4,fontSize:11,color:T.accent,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",padding:0}}>+ Ajouter une règle</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addGroup} style={{marginTop:12,fontSize:12,color:T.accent,background:"transparent",border:`1px dashed ${T.accent}`,cursor:"pointer",padding:"8px 12px",borderRadius:6,width:"100%"}}>+ Ajouter un groupe</button>
                </div>

                <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                  <button onClick={() => { setShowStrategyForm(false); setStrategyFormData(getDefaultStrategyFormData()); }} style={{padding:"10px 20px",borderRadius:6,border:`1px solid ${T.border}`,background:T.white,fontSize:12,fontWeight:600,cursor:"pointer"}}>Annuler</button>
                  <button onClick={handleCreateStrategyFromForm} style={{padding:"10px 20px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>✓ Créer une stratégie</button>
                </div>
              </div>
            </div>,
            document.body
          )}
          </div>
        </div>

        {/* RIGHT: INSTRUCTIONS */}
        <div style={{ display: "flex", flexDirection: "column", padding: "24px", paddingLeft: "32px", background: T.bg, borderLeft: `1px solid ${T.border}`, flex: 1, marginTop: "-16px", marginBottom: "-16px", paddingTop: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <img src={brokerInfo.iconPath} alt={brokerInfo.name} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: T.text }}>{brokerInfo.name}</h3>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", color: T.textMut, marginBottom: "8px", fontWeight: "600" }}>Types d'actifs supportés:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {brokerInfo.subtext.replace("Types d'actifs supportés: ", "").split(", ").map((asset, idx) => (
                <div key={idx} style={{ display: "inline-block", padding: "4px 10px", background: T.white, borderRadius: "6px", fontSize: "10px", color: T.textSub, fontWeight: "600", border: `1px solid ${T.border}` }}>
                  {asset}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", color: T.textMut, marginBottom: "12px", textTransform: "uppercase" }}>Comment exporter :</p>
            <ol style={{ padding: "0 0 0 16px", margin: 0, listStyleType: "decimal" }}>
              {brokerInfo.steps.map((step, idx) => (
                <li key={idx} style={{ fontSize: "11px", color: T.textSub, marginBottom: "8px", lineHeight: "1.3" }}>
                  {step.replace(/^\d+\. /, "")}
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>
      </div>
  );
}



