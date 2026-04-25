"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { parseCSV, calculateStats } from "@/lib/csvParsers";
import { createClient } from "@/lib/supabase/client";
import { getLocalDateString } from "@/lib/dateUtils";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { useTrades } from "@/lib/hooks/useTradeData";
import { useStrategies, useUserPreferences } from "@/lib/hooks/useUserData";
import { useTradeNotes } from "@/lib/hooks/useTradeNotes";
import { useTradeEmotionTags, useTradeErrorTags } from "@/lib/hooks/useTradeEmotionTags";
import { useDailySessionNotes } from "@/lib/hooks/useDailySessionNotes";
import { useDisciplineTracking } from "@/lib/hooks/useDisciplineTracking";
import { useCustomDisciplineRules } from "@/lib/hooks/useCustomDisciplineRules";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { getPlaceholderAccountId, isPlaceholderAccount } from "@/lib/utils/placeholderAccount";
import StrategyPage from "@/components/StrategyPage";
import StrategyDetailPage from "@/components/StrategyDetailPage";
import GoalsPage from "@/components/pages/GoalsPage";
import DailyPlannerPage from "@/components/pages/DailyPlannerPage";
import FocusTimerPage from "@/components/pages/FocusTimerPage";
import ReadingListPage from "@/components/pages/ReadingListPage";
import CalendarPage from "@/components/pages/CalendarPage";
import JournalPage from "@/components/pages/JournalPage";
import DashboardPage from "@/components/pages/DashboardPage";
import DisciplinePage from "@/components/pages/DisciplinePage";
import TradesPage from "@/components/pages/TradesPage";
import QuickAccountSelector from "@/components/QuickAccountSelector";
import MultiAccountSelector from "@/components/MultiAccountSelector";
import ApexChatNew from "@/components/ApexChatNew";
import AgentPanel from "@/components/AgentPanel";
import AIReportSummaryCard from "@/components/AIReportSummaryCard";
import SettingsPage from "@/components/pages/SettingsPage";
import Sidebar from "@/components/ui/Sidebar";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { getCurrencySymbol, getUserTimezone } from "@/lib/userPrefs";
import { t, useLang } from "@/lib/i18n";
import {
  LayoutDashboard,
  LineChart as LucideLineChart,
  Calendar as LucideCalendar,
  ListChecks,
  NotebookPen,
  ShieldCheck,
  Target as LucideTarget,
  Bot,
  Upload as LucideUpload,
  Settings as LucideSettings,
  FileText as LucideFileText,
  X as LucideX,
  ChevronDown as LucideChevronDown,
  MoreHorizontal as LucideMoreHorizontal,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  ArrowDown as LucideArrowDown,
  SlidersHorizontal as LucideSlidersHorizontal,
  Check as LucideCheck,
  User,
  Moon,
  Sun,
  LogOut,
  Star,
  Pencil,
  Plus,
  GripVertical,
  ListTodo as LucideListTodo,
  Zap as LucideZap,
  CalendarDays as LucideCalendarDays,
  Flame as LucideFlame,
  Timer as LucideTimer,
  BookOpen as LucideBookOpen,
  Menu as LucideMenu,
} from "lucide-react";

/* ─── TOKENS (OpenAI palette) ──────────────────────────────────────── */
const T = {
  white:   "#FFFFFF",
  bg:      "#FFFFFF",
  surface: "#FFFFFF",
  border:  "#E5E5E5",
  border2: "#D4D4D4",
  text:    "#0D0D0D",
  textSub: "#5C5C5C",
  textMut: "#8E8E8E",
  green:   "#10A37F",
  greenBg: "#E6F7F1",
  greenBd: "#A7E6CF",
  red:     "#EF4444",
  redBg:   "#FEF2F2",
  redBd:   "#FECACA",
  accent:  "#0D0D0D",
  accentBg:"#F0F0F0",
  accentBd:"#D4D4D4",
  amber:   "#F97316",
  amberBg: "#FFF4E6",
  blue:    "#3B82F6",
  blueBg:  "#EFF6FF",
};

const css = `
  body { background: ${T.bg}; color: ${T.text}; font-family: var(--font-sans); min-height: 100vh; font-size: 14px; }
  button { font-family: inherit; cursor: pointer; }
  select { font-family: inherit; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .anim-1 { animation: fadeUp .25s ease both; }
  .anim-2 { animation: fadeUp .25s .05s ease both; }
  .nav-item:hover { background: ${T.accentBg} !important; }
  .card-hover:hover { border-color: ${T.border2} !important; box-shadow: 0 4px 12px rgba(0,0,0,.06) !important; }
`;

const fmt = (n, sign=false) => `${sign && n>0?"+":""}${n<0?"-":""}${getCurrencySymbol()}${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// Bouton compte utilisateur dans la barre du haut (à droite du gris)
function TopBarUserMenu({ user, onProfile, onSettings, onDarkMode, onLogout }) {
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  // Synchronise l'état visuel du toggle avec l'attribut sur <html>
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.dataset.theme === "dark");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const firstName = (user.name || "").split(" ")[0];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "4px 12px 4px 4px", borderRadius: 999,
          background: open ? "#EDEDED" : "transparent", border: "none",
          cursor: "pointer", fontFamily: "var(--font-sans)", color: "#0D0D0D",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "#EDEDED"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#F7F7F7",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#0D0D0D", flexShrink: 0,
          border: "1px solid #ECECEC",
        }}>{user.initials}</div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{firstName}</span>
      </button>
      {open && (
        <div role="menu" style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 200,
          background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: 4, zIndex: 100,
          fontFamily: "var(--font-sans)",
        }}>
          {onProfile && (
            <button onClick={() => { setOpen(false); onProfile(); }} style={menuItemStyle()}>
              <User size={14} strokeWidth={1.75} /><span>Profil</span>
            </button>
          )}
          {onSettings && (
            <button onClick={() => { setOpen(false); onSettings(); }} style={menuItemStyle()}>
              <LucideSettings size={14} strokeWidth={1.75} /><span>Paramètres</span>
            </button>
          )}
          {onDarkMode && (
            <button onClick={() => onDarkMode()} style={{ ...menuItemStyle(), justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {isDark
                  ? <Sun size={14} strokeWidth={1.75} />
                  : <Moon size={14} strokeWidth={1.75} />}
                <span>Mode Sombre</span>
              </span>
              {/* Mini toggle visuel */}
              <span
                aria-hidden
                style={{
                  position: "relative",
                  width: 28, height: 16, borderRadius: 999,
                  background: isDark ? "#10A37F" : "#D4D4D4",
                  transition: "background 150ms ease",
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 2,
                  left: isDark ? 14 : 2,
                  width: 12, height: 12, borderRadius: "50%",
                  background: "#FFFFFF",
                  transition: "left 150ms ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
                }}/>
              </span>
            </button>
          )}
          {onLogout && (onProfile || onSettings || onDarkMode) && (
            <div style={{ height: 1, background: "#E5E5E5", margin: "4px 0" }} />
          )}
          {onLogout && (
            <button onClick={() => { setOpen(false); onLogout(); }} style={{ ...menuItemStyle(), color: "#EF4444" }}>
              <LogOut size={14} strokeWidth={1.75} /><span>Se déconnecter</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
function menuItemStyle() {
  return {
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    textAlign: "left", padding: "8px 10px", borderRadius: 6, border: "none",
    background: "transparent", color: "#0D0D0D",
    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
  };
}

// Portal: rend ses enfants dans le slot d'en-tête de page (id="tr4de-page-header-slot")
// si présent. Permet aux pages d'inclure des éléments contrôlés depuis le layout.
function HeaderSlotPortal({ children }) {
  const [target, setTarget] = useState(null);
  useEffect(() => {
    const find = () => setTarget(document.getElementById("tr4de-page-header-slot"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  if (!target) return null;
  return ReactDOM.createPortal(children, target);
}

function Pill({ children, color="gray", small }) {
  const map = {
    green: { bg:T.greenBg, bd:T.greenBd, txt:T.green },
    red:   { bg:T.redBg,   bd:T.redBd,   txt:T.red   },
    blue:  { bg:T.blueBg,  bd:"#DCFCE7",  txt:T.blue  },
    gray:  { bg:T.bg,      bd:T.border,   txt:T.textSub },
  };
  const s = map[color] || map.gray;
  return <span style={{display:"inline-flex", alignItems:"center", padding: small ? "1px 7px" : "3px 10px", borderRadius: 20, fontSize: small ? 11 : 12, fontWeight: 500, background: s.bg, border: `1px solid ${s.bd}`, color: s.txt,}}>{children}</span>;
}

function TradingViewChart({ trade }) {
  return null; // Removed chart component
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button className="nav-item" onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:8,border:"none",background: active ? T.accentBg : "transparent",color: active ? T.accent : T.textSub,fontSize:13,fontWeight: active ? 600 : 400,transition:"all .15s",textAlign:"left",}}>
      <span style={{fontSize:15,opacity: active?1:.7}}>{icon}</span>
      <span>{label}</span>
      {badge && <span style={{marginLeft:"auto",fontSize:10,padding:"1px 6px",borderRadius:20,background:T.red+"20",color:T.red,fontWeight:600}}>{badge}</span>}
    </button>
  );
}

function AddTradePage({ trades, setPage, setAccounts, setSelectedAccountIds, accountType, setAccountType, selectedEvalAccount, setSelectedEvalAccount, accounts = [], selectedAccountIds = [], addTrade, addStrategy, strategies = [], user }) {
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
    <div style={{ display: "flex", flexDirection: "row", gap: "16px", padding: "16px", background: "#fff", width: "100%", height: "100%", minHeight: "100%" }} className="anim-1">
      {/* LEFT: QUESTIONNAIRE FORM */}
      <div style={{ display: "flex", flexDirection: "column", borderRadius: "12px", border: `1px solid ${T.border}`, padding: "0", background: "#fff", flex: "0.7" }}>
          <div style={{ padding: "24px" }}>
          
          {/* ACCOUNT SELECTOR */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              {t("addTrade.account")}
            </label>
            <QuickAccountSelector
              selectedAccountName={accountName}
              onAccountNameChange={setAccountName}
              T={T}
            />
          </div>
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>

          {/* BROKER */}
          <div style={{ marginTop: "14px", marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
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
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 14px -24px" }}></div>

          {/* ACCOUNT TYPE */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              {t("addTrade.accountType")}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {["live", "eval"].map((type) => (
                <button
                  key={type}
                  onClick={() => setAccountType(type)}
                  onMouseEnter={(e) => {
                    if (accountType !== type) {
                      e.currentTarget.style.background = "#F5F5F5";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (accountType !== type) {
                      e.currentTarget.style.background = T.white;
                    }
                  }}
                  style={{
                    padding: "8px 12px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    background: accountType === type ? "#F0F0F0" : T.white,
                    color: T.text,
                    fontSize: 13,
                    fontWeight: accountType === type ? 600 : 500,
                    cursor: "pointer",
                    transition: "background 120ms ease, font-weight 0ms",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {type === "live" ? t("addTrade.live") : t("addTrade.eval")}
                </button>
              ))}
            </div>
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
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>

          {/* STRATEGY SELECTOR */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              {t("addTrade.strategy")}
            </label>
            <SearchableSelect
              value={selectedImportStrategy}
              onChange={(id) => {
                if (id === "create_new") {
                  setShowStrategyForm(true);
                  setStrategyFormData(getDefaultStrategyFormData());
                } else {
                  setSelectedImportStrategy(id);
                }
              }}
              options={[
                { id: "", label: "Aucune stratégie" },
                ...strategies.map((s) => ({
                  id: s.id,
                  label: s.name,
                  iconNode: <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color || "#10A37F", display: "inline-block" }} />,
                })),
                { id: "create_new", label: "+ Créer une stratégie", isAction: true },
              ]}
              searchPlaceholder="Rechercher une stratégie..."
              emptyLabel="Aucune stratégie"
              placeholder="Sélectionner une stratégie"
            />
          </div>
          <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>

          {/* FILE */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "12px", color: T.textMut, textTransform: "uppercase" }}>
              Fichier
            </label>
            <div style={{
              padding: "20px",
              border: `2px dashed ${T.border}`,
              borderRadius: "8px",
              textAlign: "center",
              cursor: "pointer",
              background: T.bg,
            }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file && fileInputRef.current) { const dt = new DataTransfer(); dt.items.add(file); fileInputRef.current.files = dt.files; handleFileSelect({ target: { files: [file] } }); } }}>
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: "none" }} accept=".csv,.html,.txt" />
              <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%", fontFamily: "var(--font-sans)" }}>
                {!fileName ? (
                  <LucideUpload size={22} strokeWidth={1.5} color={T.textMut} />
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#10A37F" }}>
                    <LucideCheck size={16} strokeWidth={2} />
                  </span>
                )}
                <div style={{ fontSize: 12, color: fileName ? "#0D0D0D" : T.textSub, fontWeight: 500 }}>
                  {fileName || "Glissez votre fichier ici ou parcourir"}
                </div>
                {!fileName && <div style={{ fontSize: 11, color: T.textMut }}>CSV, TXT, ou HTML</div>}
              </button>
            </div>
          </div>
          {preview.length > 0 && <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>}

          {/* PREVIEW */}
          {preview.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
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
          {(preview.length > 0 || error) && <div style={{ borderBottom: `1px solid ${T.border}`, margin: "0 -24px 20px -24px" }}></div>}

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
                  <button onClick={() => { setShowStrategyForm(false); setStrategyFormData(getDefaultStrategyFormData()); }} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:T.textMut}}>✕</button>
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
                      <button key={color} onClick={()=>setStrategyFormData({...strategyFormData,color})} style={{width:32,height:32,borderRadius:8,background:color,border:strategyFormData.color===color?`3px solid ${T.text}`:"2px solid #ddd",cursor:"pointer"}}/>
                    ))}
                  </div>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:8,color:T.textMut}}>Groupes de règles</label>
                  {strategyFormData.groups && strategyFormData.groups.map((group,gIdx)=>(
                    <div key={group.id} style={{marginBottom:16,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.bg}}>
                      <div style={{display:"flex",gap:8,marginBottom:12}}>
                        <input type="text" placeholder="Nom du groupe" value={group.name} onChange={(e)=>updateGroup(group.id,"name",e.target.value)} style={{flex:1,padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,outline:"none"}}/>
                        {strategyFormData.groups.length > 1 && <button onClick={()=>removeGroup(group.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:T.red}}>✕</button>}
                      </div>

                      <div style={{display:"flex",flexDirection:"column",gap:6,paddingLeft:20}}>
                        {group.rules && group.rules.map((rule,rIdx)=>(
                          <div key={rule.id} style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:10,color:T.textMut}}>•</span>
                            <input type="text" placeholder="ex., FVG 5m" value={rule.text} onChange={(e)=>updateRule(group.id,rule.id,e.target.value)} style={{flex:1,padding:"6px 10px",borderRadius:4,border:`1px solid ${T.border}`,fontSize:11,outline:"none"}}/>
                            {group.rules.length > 1 && <button onClick={()=>removeRule(group.id,rule.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:T.red}}>✕</button>}
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
  );
}



export default function App() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  useLang(); // re-render app on language change

  // Re-render quand l'utilisateur change la devise / le fuseau horaire dans Settings.
  const [, forcePrefRefresh] = useState(0);
  useEffect(() => {
    const onPrefs = () => forcePrefRefresh(v => v + 1);
    window.addEventListener("tr4de:prefs-changed", onPrefs);
    return () => window.removeEventListener("tr4de:prefs-changed", onPrefs);
  }, []);
  const [accountType, setAccountType] = useState(() => {
    try {
      const saved = localStorage.getItem('accountType');
      return saved ? saved : "live";
    } catch (e) {
      return "live";
    }
  });
  const [selectedEvalAccount, setSelectedEvalAccount] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedEvalAccount');
      return saved ? saved : "25k";
    } catch (e) {
      return "25k";
    }
  });
  const [page, setPage] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  const [aiReportsUnread, setAiReportsUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/ai/reports?limit=30", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const unread = (data.reports || []).filter((r) => !r.is_read).length;
        setAiReportsUnread(unread);
      } catch (e) {
        // silent
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [page]);
  // ✅ Utiliser les hooks pour Trades et Stratégies (auto-stockés dans Supabase)
  const { trades, addTrade, updateTrade, deleteTrade } = useTrades();
  const { strategies, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const { notes: agentTradeNotes } = useTradeNotes();
  const { notes: agentDailyNotes } = useDailySessionNotes();
  const { emotionTags: agentEmotionTags } = useTradeEmotionTags();
  const { errorTags: agentErrorTags } = useTradeErrorTags();
  const { disciplineData: agentDisciplineData, baseRules: agentBaseRules } = useDisciplineTracking();
  const { customRules: agentCustomRules } = useCustomDisciplineRules();
  const [userId, setUserId] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIdHeader, setSelectedAccountIdHeader] = useState(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedAccountIds');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [previousSelectedAccountIds, setPreviousSelectedAccountIds] = useState([]);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // Construire l'objet affichage utilisateur à partir de l'utilisateur authentifié
  const displayUser = {
    name: user?.email?.split('@')[0] || "Trader",
    email: user?.email || "trader@taotrade.com",
    initials: (user?.email?.split('@')[0] || "TR").substring(0, 2).toUpperCase()
  };

  // Sauvegarder la sélection de comptes dans localStorage
  useEffect(() => {
    localStorage.setItem('selectedAccountIds', JSON.stringify(selectedAccountIds));
    console.log("💾 Saved selectedAccountIds to localStorage:", selectedAccountIds);
  }, [selectedAccountIds]);

  // (On ne ré-injecte plus le placeholder : aucune sélection = 0 trades)

  // ✅ Nettoyer le placeholder quand un vrai compte est sélectionné
  useEffect(() => {
    if (user?.id && selectedAccountIds.length > 0) {
      const placeholderId = getPlaceholderAccountId(user.id);
      const hasPlaceholder = selectedAccountIds.includes(placeholderId);
      const hasRealAccounts = selectedAccountIds.some(id => !isPlaceholderAccount(id));
      
      // Si on a à la fois le placeholder et des vrais comptes, retirer le placeholder
      if (hasPlaceholder && hasRealAccounts) {
        const cleaned = selectedAccountIds.filter(id => !isPlaceholderAccount(id));
        setSelectedAccountIds(cleaned);
        console.log("🧹 Removed placeholder account, keeping real accounts:", cleaned);
      }
    }
  }, [selectedAccountIds, user?.id]);

  // Sauvegarder le type de compte dans localStorage
  useEffect(() => {
    localStorage.setItem('accountType', accountType);
  }, [accountType]);

  // Sauvegarder la taille du compte Eval dans localStorage
  useEffect(() => {
    localStorage.setItem('selectedEvalAccount', selectedEvalAccount);
  }, [selectedEvalAccount]);

  // ✅ Les stratégies sont auto-sauvegardées via le hook useStrategies()

  // Mettre à jour accountType et selectedEvalAccount en fonction du compte sélectionné
  useEffect(() => {
    if (selectedAccountIds.length === 1 && accounts.length > 0) {
      const selectedAccountId = selectedAccountIds[0];
      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
      if (selectedAccount) {
        // Si le compte a des infos de type, les utiliser
        if (selectedAccount.account_type) {
          setAccountType(selectedAccount.account_type);
        }
        if (selectedAccount.eval_account_size && selectedAccount.account_type === "eval") {
          setSelectedEvalAccount(selectedAccount.eval_account_size);
        }
      }
    }
  }, [selectedAccountIds, accounts]);

  // Récupérer l'utilisateur Supabase
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error) {
          console.warn("Not authenticated:", error.message);
          setUserId(null);
        } else if (authUser) {
          setUserId(authUser.id);
        } else {
          console.warn("No authenticated user");
          setUserId(null);
        }
      } catch (err) {
        console.error("Error getting user:", err);
        setUserId(null);
      } finally {
        setLoadingUser(false);
      }
    };

    getUser();
  }, [supabase]);

  // Charger les comptes au démarrage
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const supabase = createClient();
        const userId = user?.id;
        
        const { data, error } = await supabase
          .from("trading_accounts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading accounts:", error);
          setAccounts([]);
          return;
        }

        const loadedAccounts = data || [];
        setAccounts(loadedAccounts);

        // À chaque chargement de la page : si rien n'est sélectionné (premier visit
        // OU sélection vide sauvegardée), on coche tous les comptes par défaut.
        try {
          const saved = localStorage.getItem("selectedAccountIds");
          let current = [];
          try { current = saved ? JSON.parse(saved) : []; } catch {}
          if ((!Array.isArray(current) || current.length === 0) && loadedAccounts.length > 0) {
            const allIds = loadedAccounts.map(a => a.id);
            setSelectedAccountIds(allIds);
            localStorage.setItem("selectedAccountIds", JSON.stringify(allIds));
          }
        } catch {}
      } catch (err) {
        console.error("Error loading accounts:", err);
        setAccounts([]);
      }
    };

    if (user?.id) {
      loadAccounts();
    }
  }, [user?.id]);

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    try {
      console.log("🔓 Déconnexion...");
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // ⏳ Attendre 500ms pour s'assurer que la session est complètement effacée
      // et que les listeners d'auth ont le temps de se mettre à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Nettoyer localStorage
      localStorage.clear();
      
      // 🚀 Rediriger vers la page d'accueil (qui redirigera vers /login)
      console.log("✅ Déconnexion réussie, redirection vers login...");
      window.location.href = '/login';
    } catch (err) {
      console.error("❌ Erreur lors de la déconnexion:", err);
      // En cas d'erreur, forcer la redirection vers login
      window.location.href = '/login';
    }
  };

  // ✅ Vérifier l'authentification et rediriger si nécessaire
  // ATTENDRE que l'authentification soit complètement chargée avant de rediriger
  useEffect(() => {
    if (authLoading) {
      // Authentification en cours de chargement, ne rien faire
      console.log("⏳ Authentification en cours de chargement...");
      return;
    }

    // Authentification terminée, vérifier si l'utilisateur existe
    if (!user) {
      console.log("🚫 Utilisateur non authentifié, redirection vers connexion...");
      window.location.href = '/login';
    }
  }, [authLoading, user]);

  // ✅ Filtrer les comptes visibles (exclure le placeholder)
  const visibleAccounts = accounts.filter(acc => !isPlaceholderAccount(acc.id));

  // Plage de dates par page (chaque page garde sa propre sélection).
  const iso = (d) => d.toISOString().split("T")[0];
  const defaultDateRange = (pageId) => {
    const today = new Date();
    // Dashboard / Stratégies : tout depuis le premier trade
    if (pageId === "dashboard" || pageId === "strategies" || pageId === "calendar" || pageId === "discipline") {
      const earliest = (trades || []).reduce((min, t) => {
        try {
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return min;
          return !min || d < min ? d : min;
        } catch { return min; }
      }, null);
      const start = earliest || new Date(today.getFullYear(), 0, 1);
      return { start: iso(start), end: iso(today) };
    }
    // Trades / Journal : semaine en cours
    const dow = today.getDay();
    const monday = new Date(today); monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { start: iso(monday), end: iso(sunday) };
  };
  const [dateRangesByPage, setDateRangesByPage] = useState(() => {
    try {
      const saved = localStorage.getItem("tr4de_date_ranges_by_page");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  React.useEffect(() => {
    try { localStorage.setItem("tr4de_date_ranges_by_page", JSON.stringify(dateRangesByPage)); } catch {}
  }, [dateRangesByPage]);
  const globalDateRange = dateRangesByPage[page] || defaultDateRange(page);
  const setGlobalDateRange = (r) => setDateRangesByPage(prev => ({ ...prev, [page]: r }));

  const filteredTrades = (() => {
    const realSelected = selectedAccountIds.filter(id => !isPlaceholderAccount(id));
    if (realSelected.length === 0) return [];
    const byAccount = trades.filter(t => realSelected.includes(t.account_id));
    const { start, end } = globalDateRange || {};
    if (!start || !end) return byAccount;
    return byAccount.filter(t => {
      try {
        const d = (t.date || "").split("T")[0];
        return d >= start && d <= end;
      } catch { return true; }
    });
  })();

  // ✅ DEBUG: Log when account selection changes
  React.useEffect(() => {
    console.log("📊 DEBUG - Account Selection State:");
    console.log("   accounts:", accounts.map(a => ({ id: a.id, name: a.name })));
    console.log("   selectedAccountIds:", selectedAccountIds);
    console.log("   trades.length:", trades.length);
    console.log("   filteredTrades.length:", filteredTrades.length);
    console.log("   First trade structure:", trades[0]);
    console.log("   Trades with account_id:", trades.filter(t => t.account_id).length);
    console.log("   Filter logic: if selectedAccountIds.length (" + selectedAccountIds.length + ") > 0, filter by account, else show none");
  }, [selectedAccountIds, trades, accounts, filteredTrades]);

  const handleImport = async (data) => {
    const { trades: newTrades } = data;
    for (const newTrade of newTrades) {
      const existing = trades.find(t => t.date === newTrade.date && t.symbol === newTrade.symbol && t.entry === newTrade.entry);
      if (!existing) {
        await addTrade(newTrade);
      } else {
        // Backfill des champs manquants (ex: entry_time / exit_time après ajout du parser)
        const patch = {};
        if (newTrade.entryTime && !existing.entry_time && !existing.entryTime) patch.entry_time = newTrade.entryTime;
        if (newTrade.exitTime && !existing.exit_time && !existing.exitTime) patch.exit_time = newTrade.exitTime;
        if (Object.keys(patch).length > 0) {
          try { await updateTrade(existing.id, patch); } catch (err) { console.error("⚠️ updateTrade failed:", err); }
        }
      }
    }
  };

  const handleClearTrades = async () => {
    try {
      // ✅ Supprimer tous les trades filtrés via la fonction du hook
      for (const trade of filteredTrades) {
        await deleteTrade(trade.id);
      }
    } catch (err) {
      console.error("Error deleting trades:", err);
    }
  };

  const handleDeleteTrade = async (trade) => {
    if (!trade || !trade.id) {
      console.warn("❌ Trade invalid ou sans ID:", trade);
      return;
    }
    // ✅ Supprimer le trade directement via le hook
    await deleteTrade(trade.id);
  };

  const handleDeleteAccount = async (accountId) => {
    if (!accountId) {
      return;
    }

    const accountToDelete = accounts.find(acc => acc.id === accountId);
    if (!accountToDelete) return;

    try {
      const supabase = createClient();
      const userId = user?.id;

      // Supprimer les trades associés au compte
      const { error: tradesError } = await supabase
        .from("apex_trades")
        .delete()
        .eq("account_id", accountId)
        .eq("user_id", userId);

      if (tradesError) {
        console.error("Error deleting trades:", tradesError);
        return;
      }

      // Supprimer le compte
      const { error: accountError } = await supabase
        .from("trading_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", userId);

      if (accountError) {
        console.error("Error deleting account:", accountError);
        return;
      }

      // Retirer le compte de la sélection
      setSelectedAccountIds(prev => prev.filter(id => id !== accountId));

      // Réinitialiser la sélection d'en-tête si c'était celui-ci
      if (selectedAccountIdHeader === accountId) {
        setSelectedAccountIdHeader("");
      }

      // Recharger les comptes
      const { data: updatedAccounts } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setAccounts(updatedAccounts || []);
      // ✅ Les trades seront auto-reloadés via le hook useTrades
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const SIDEBAR_SECTIONS = [
    {
      label: t("nav.trading"),
      items: [
        { id: "add-trade",  icon: LucideUpload,       label: t("nav.addTrade") },
        { id: "dashboard",  icon: LayoutDashboard,    label: t("nav.dashboard") },
        { id: "calendar",   icon: LucideCalendar,     label: t("nav.calendar") },
        { id: "trades",     icon: ListChecks,         label: t("nav.trades"), badge: filteredTrades.length > 0 ? filteredTrades.length : 0 },
        { id: "strategies", icon: LucideTarget,       label: t("nav.strategies") },
      ],
    },
    {
      label: t("nav.analyse"),
      items: [
        { id: "journal",    icon: NotebookPen,        label: t("nav.journal"), badge: filteredTrades.filter(tr => {try { const d = new Date(tr.date); return getLocalDateString(d) === getLocalDateString(); } catch (e) { return false; }}).length },
        { id: "discipline", icon: ShieldCheck,        label: t("nav.discipline") },
        { id: "agent",      icon: Bot,                label: t("nav.agent"), badge: aiReportsUnread > 0 ? aiReportsUnread : 0 },
      ],
    },
    {
      label: t("nav.productivity"),
      items: [
        { id: "daily-planner", icon: LucideCalendarDays, label: t("nav.dailyPlanner") },
        { id: "goals",         icon: LucideZap,          label: t("nav.goals") },
        { id: "focus",         icon: LucideTimer,        label: t("nav.focus") },
        { id: "reading",       icon: LucideBookOpen,     label: t("nav.reading") },
      ],
    },
  ];

  const pages = {
    dashboard:  <DashboardPage trades={filteredTrades} setPage={setPage} />,
    "add-trade": <AddTradePage trades={filteredTrades} setPage={setPage} setAccounts={setAccounts} setSelectedAccountIds={setSelectedAccountIds} accountType={accountType} setAccountType={setAccountType} selectedEvalAccount={selectedEvalAccount} setSelectedEvalAccount={setSelectedEvalAccount} accounts={accounts} selectedAccountIds={selectedAccountIds} addTrade={addTrade} addStrategy={addStrategy} strategies={strategies} user={user} />,
    trades:     <TradesPage trades={filteredTrades} strategies={strategies} onImportClick={() => setPage("add-trade")} onDeleteTrade={handleDeleteTrade} onClearTrades={handleClearTrades} />,
    calendar:   <CalendarPage trades={filteredTrades} accountType={accountType} evalAccountSize={selectedEvalAccount} />,
    journal: <JournalPage trades={filteredTrades} />,
    discipline: <DisciplinePage trades={filteredTrades} />,
    strategies: <StrategyPage setPage={setPage} setSelectedStrategyId={setSelectedStrategyId} />,
    "strategy-detail": <StrategyDetailPage setPage={setPage} />,
    goals: <GoalsPage />,
    "daily-planner": <DailyPlannerPage />,
    focus: <FocusTimerPage />,
    reading: <ReadingListPage />,
    agent: (() => {
      // Convertir la map { [tradeId]: "note" } en tableau pour l'API
      const journalNotesArr = Object.entries(agentTradeNotes || {})
        .filter(([, n]) => n && String(n).trim())
        .map(([trade_id, notes]) => {
          const emotions = (agentEmotionTags || {})[trade_id] || [];
          const errors = (agentErrorTags || {})[trade_id] || [];
          return { trade_id, notes: String(notes), emotion_tags: emotions, error_tags: errors };
        });

      // Calculer les stats par stratégie en utilisant le mapping localStorage
      let assignments = {};
      try {
        const raw = localStorage.getItem("tr4de_trade_strategies");
        assignments = raw ? JSON.parse(raw) : {};
      } catch {}

      const strategyStats = (strategies || []).map((strategy) => {
        const stratTrades = filteredTrades.filter((t) => {
          const byId = assignments[t.id] || [];
          const byComposite = assignments[`${t.date}${t.symbol}${t.entry}`] || [];
          return byId.includes(strategy.id) || byComposite.includes(strategy.id);
        });
        if (!stratTrades.length) return null;
        const wins = stratTrades.filter((t) => (t.pnl || 0) > 0).length;
        const losses = stratTrades.filter((t) => (t.pnl || 0) < 0).length;
        const totalPnL = stratTrades.reduce((s, t) => s + (t.pnl || 0), 0);
        return {
          id: strategy.id,
          name: strategy.name,
          tradeCount: stratTrades.length,
          wins,
          losses,
          winRate: stratTrades.length ? ((wins / stratTrades.length) * 100).toFixed(1) : "0",
          totalPnL: totalPnL.toFixed(2),
          avgPnL: (totalPnL / stratTrades.length).toFixed(2),
        };
      }).filter(Boolean);

      // Infos compte
      const accountInfo = {
        type: accountType,
        evalSize: accountType === "eval" ? selectedEvalAccount : null,
        selectedAccountsCount: (selectedAccountIds || []).length,
        totalAccountsCount: (accounts || []).length,
      };

      // Helpers dates
      const dayKey = (d) => {
        try { return getLocalDateString(new Date(d)); } catch { return null; }
      };
      const weekKey = (d) => {
        try {
          const dt = new Date(d);
          const day = (dt.getDay() + 6) % 7; // Monday = 0
          const monday = new Date(dt);
          monday.setDate(dt.getDate() - day);
          return getLocalDateString(monday);
        } catch { return null; }
      };
      const monthKey = (d) => {
        try { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; } catch { return null; }
      };

      const aggregate = (list, keyFn) => {
        const map = {};
        (list || []).forEach((t) => {
          const k = keyFn(t.entry_time || t.date);
          if (!k) return;
          if (!map[k]) map[k] = { key: k, trades: 0, wins: 0, losses: 0, pnl: 0 };
          map[k].trades += 1;
          const p = Number(t.pnl) || 0;
          if (p > 0) map[k].wins += 1;
          else if (p < 0) map[k].losses += 1;
          map[k].pnl += p;
        });
        return Object.values(map)
          .sort((a, b) => (a.key < b.key ? 1 : -1))
          .slice(0, 12)
          .map((r) => ({
            period: r.key,
            trades: r.trades,
            wins: r.wins,
            losses: r.losses,
            winRate: r.trades ? ((r.wins / r.trades) * 100).toFixed(1) : "0",
            pnl: r.pnl.toFixed(2),
          }));
      };

      const weeklyStats = aggregate(filteredTrades, weekKey);
      const monthlyStats = aggregate(filteredTrades, monthKey);

      // Discipline: synthèse par jour (% de règles respectées)
      const allRuleIds = [
        ...(agentBaseRules || []).map((r) => ({ id: r.id, label: r.label })),
        ...(agentCustomRules || []).map((r) => ({ id: r.rule_id || r.id, label: r.text })),
      ];
      const disciplineSummary = Object.entries(agentDisciplineData || {})
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, 14)
        .map(([date, rules]) => {
          const total = allRuleIds.length || Object.keys(rules || {}).length;
          const respected = Object.values(rules || {}).filter(Boolean).length;
          const violated = allRuleIds
            .filter((r) => rules && rules[r.id] === false)
            .map((r) => r.label);
          return {
            date,
            respected,
            total,
            score: total ? Math.round((respected / total) * 100) : 0,
            violated,
          };
        });

      // Événements psychologiques (heuristiques simples)
      const psychEvents = [];
      const tradesByDay = {};
      (filteredTrades || []).forEach((t) => {
        const k = dayKey(t.entry_time || t.date);
        if (!k) return;
        (tradesByDay[k] = tradesByDay[k] || []).push(t);
      });
      Object.entries(tradesByDay).forEach(([date, dayTrades]) => {
        dayTrades.sort((a, b) => new Date(a.entry_time || a.date) - new Date(b.entry_time || b.date));
        // Overtrading
        if (dayTrades.length >= 6) {
          psychEvents.push({ date, type: "overtrading", detail: `${dayTrades.length} trades dans la journée` });
        }
        // Revenge trading: trade <15min après une perte
        for (let i = 1; i < dayTrades.length; i++) {
          const prev = dayTrades[i - 1];
          const cur = dayTrades[i];
          if ((Number(prev.pnl) || 0) < 0) {
            const dt = (new Date(cur.entry_time || cur.date) - new Date(prev.entry_time || prev.date)) / 60000;
            if (dt > 0 && dt < 15) {
              psychEvents.push({ date, type: "revenge_trading", detail: `Trade ${dt.toFixed(0)}min après une perte de ${prev.pnl}$` });
              break;
            }
          }
        }
        // Tilted: 3 pertes consécutives
        let streak = 0, maxStreak = 0;
        dayTrades.forEach((t) => {
          if ((Number(t.pnl) || 0) < 0) { streak += 1; maxStreak = Math.max(maxStreak, streak); }
          else streak = 0;
        });
        if (maxStreak >= 3) {
          psychEvents.push({ date, type: "losing_streak", detail: `${maxStreak} pertes consécutives` });
        }
      });
      // Émotions négatives répétées
      const negativeEmotions = ["angry", "colère", "fear", "peur", "fomo", "frustré", "revenge", "tilt"];
      const emotionCount = {};
      Object.values(agentEmotionTags || {}).forEach((tags) => {
        (tags || []).forEach((tag) => {
          const low = String(tag).toLowerCase();
          if (negativeEmotions.some((n) => low.includes(n))) {
            emotionCount[tag] = (emotionCount[tag] || 0) + 1;
          }
        });
      });
      Object.entries(emotionCount).forEach(([tag, count]) => {
        if (count >= 2) psychEvents.push({ date: "", type: "emotional_pattern", detail: `"${tag}" signalé sur ${count} trades` });
      });

      return (
        <AgentPanel
          userId={user?.id}
          trades={filteredTrades}
          strategies={strategies || []}
          strategyStats={strategyStats}
          journalNotes={journalNotesArr}
          dailyNotes={agentDailyNotes || {}}
          accountInfo={accountInfo}
          weeklyStats={weeklyStats}
          monthlyStats={monthlyStats}
          disciplineSummary={disciplineSummary}
          psychEvents={psychEvents.slice(0, 20)}
        />
      );
    })(),
    settings: <SettingsPage user={user} onBack={() => setPage("dashboard")} />,
  };

  // ✅ Afficher un écran de chargement pendant que l'authentification se charge
  // Le useEffect redirigera si l'utilisateur n'est pas authentifié
  if (authLoading) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,flexDirection:"column",gap:20}}>
        <div style={{fontSize:16,fontWeight:600,color:T.text}}>⏳ Chargement...</div>
        <div style={{fontSize:12,color:T.textMut}}>Vérification de votre authentification</div>
      </div>
    );
  }

  // Si pas d'utilisateur après le chargement, le useEffect va rediriger vers "/"
  if (!user) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,flexDirection:"column",gap:20}}>
        <div style={{fontSize:16,fontWeight:600,color:T.text}}>⏳ Redirection...</div>
        <div style={{fontSize:12,color:T.textMut}}>Redirection vers la page de connexion</div>
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="tr4de-root" style={{display:"flex",minHeight:"100vh",background:"#F5F5F5"}}>
        {/* SIDEBAR (OpenAI-style) */}
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          brand="tao trade"
          workspace={(() => {
            if (selectedAccountIds.length === 1) {
              const acc = accounts.find(a => a.id === selectedAccountIds[0]);
              if (acc) return { id: acc.id, name: acc.name || "Compte" };
            }
            if (selectedAccountIds.length > 1) return { id: "multi", name: `${selectedAccountIds.length} comptes` };
            return null;
          })()}
          workspaces={visibleAccounts.map(a => ({ id: a.id, name: a.name || "Compte" }))}
          onSelectWorkspace={(id) => setSelectedAccountIds([id])}
          onCreateWorkspace={() => setPage("add-trade")}
          sections={SIDEBAR_SECTIONS}
          activeId={page}
          onSelect={(id) => {
            if (page === "add-trade" && id !== "add-trade") {
              setSelectedAccountIds(previousSelectedAccountIds);
              localStorage.setItem('selectedAccountIds', JSON.stringify(previousSelectedAccountIds));
            }
            if (id === "add-trade") {
              setPreviousSelectedAccountIds(selectedAccountIds);
              setSelectedAccountIdHeader("");
              setSelectedAccountIds([]);
            }
            setPage(id);
            setMobileNavOpen(false);
          }}
        />


        {/* MAIN */}
        <div className="tr4de-main" style={{flex:1,minWidth:0,height:"100vh",display:"flex",flexDirection:"column",background:"transparent"}}>
          <div className="tr4de-topbar" style={{flexShrink:0,zIndex:10,background:"#F5F5F5",padding:"10px 28px",display:"flex",alignItems:"center",gap:12,fontFamily:"var(--font-sans)"}}>
            <button
              type="button"
              className="tr4de-hamburger"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Ouvrir le menu"
              style={{display:"none",width:36,height:36,borderRadius:8,border:"1px solid "+T.border,background:T.white,color:T.text,cursor:"pointer",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"inherit"}}
            >
              <LucideMenu size={18} strokeWidth={1.75} />
            </button>
            <div style={{marginLeft:"auto"}}>
              <TopBarUserMenu
                user={{ name: displayUser.name, initials: displayUser.initials }}
                onLogout={handleLogout}
                onSettings={() => setPage("settings")}
                onProfile={() => setPage("settings")}
                onDarkMode={() => {
                  const cur = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
                  const next = cur === "dark" ? "light" : "dark";
                  document.documentElement.dataset.theme = next;
                  try { localStorage.setItem("tr4de_theme", next); } catch {}
                }}
              />
            </div>
          </div>
          <div style={{flex:1,minHeight:0,padding: "0 8px 8px 0",display:"flex"}}>
            <div className="scroll-thin" style={{
              background: "#FFFFFF",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: 10,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
              padding: page === "add-trade" ? "0" : "20px 24px",
              display: page === "add-trade" ? "flex" : "block",
              width: "100%",
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              position: "relative",
            }}>
              {(() => {
                // Pages de productivité : pas de DateRangePicker ni de sélecteur de comptes.
                const PRODUCTIVITY_PAGES = ["daily-planner", "goals", "focus", "reading"];
                const isProductivity = PRODUCTIVITY_PAGES.includes(page);
                if (page === "add-trade") return null;
                if (isProductivity) return null; // la page gère son propre header
                return (
                  <HeaderSlotPortal>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {["dashboard","strategies","journal","trades","discipline"].includes(page) && (
                        <DateRangePicker
                          value={globalDateRange}
                          onChange={(r) => setGlobalDateRange(r)}
                        />
                      )}
                      <MultiAccountSelector
                        accounts={visibleAccounts}
                        selectedAccountIds={selectedAccountIds}
                        onSelectionChange={setSelectedAccountIds}
                        onDeleteAccount={handleDeleteAccount}
                        onCreateAccount={() => setPage("add-trade")}
                        T={T}
                      />
                    </div>
                  </HeaderSlotPortal>
                );
              })()}
              {pages[page] || pages.dashboard}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
