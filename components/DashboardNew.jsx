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
import AddTradePage from "@/components/pages/AddTradePage";
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
