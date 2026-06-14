"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import {
  X as LucideX,
  ChevronDown as LucideChevronDown,
  MoreHorizontal as LucideMoreHorizontal,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  ArrowDown as LucideArrowDown,
  SlidersHorizontal as LucideSlidersHorizontal,
  GripVertical as LucideGripVertical,
  Image as LucideImage,
  Plus as LucidePlus,
  Check as LucideCheck,
  Repeat as LucideRepeat,
  Pencil as LucidePencil,
} from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t, useLang } from "@/lib/i18n";
import { fmt } from "@/lib/ui/format";
import { rMultiple, fmtR } from "@/lib/userPrefs";
import { calculateFees } from "@/lib/tradeFees";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useTradeNotes } from "@/lib/hooks/useTradeNotes";
import { useTradeScreenshots } from "@/lib/hooks/useTradeScreenshots";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { useTradeEmotionTags, useTradeErrorTags } from "@/lib/hooks/useTradeEmotionTags";
import { backdropDismiss } from "@/lib/hooks/useBackdropDismiss";
import { useIsMobile } from "@/lib/hooks/useBreakpoint";

export default function TradesPage({ trades = [], strategies = [], onImportClick, onDeleteTrade, onClearTrades, embedded = false }) {
  useLang();
  const { user } = useAuth();
  const { notes: notesFromHook, setNote: setNoteHook } = useTradeNotes();
  const { urls: screenshotUrls, uploadScreenshot, removeScreenshot } = useTradeScreenshots();
  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const { emotionTags: emotionsFromHook, addEmotion, removeEmotion } = useTradeEmotionTags();
  const { errorTags: errorsFromHook, addError, removeError } = useTradeErrorTags();
  const [selectedTrade, setSelectedTrade] = useState(null);
  const isMobile = useIsMobile();
  // Date range filter (default = current week)
  const getInitWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] };
  };
  const [filterStartDate, setFilterStartDate] = useState(() => getInitWeekRange().start);
  const [filterEndDate, setFilterEndDate] = useState(() => getInitWeekRange().end);
  // Selection multiple via checkbox
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  // Index de la dernière case cochée pour permettre Shift+Clic = sélectionner la plage
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeletingTrades, setIsDeletingTrades] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);

  // Conteneur du tableau : on cale dynamiquement sa hauteur max sur le bas du
  // viewport (depuis sa position réelle) pour que la barre de défilement
  // HORIZONTALE reste toujours visible sans devoir scroller jusqu'en bas.
  // On écrit directement le style (pas de re-render) pour rester fluide au scroll.
  const tradesMainRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const node = tradesMainRef.current;
      if (!node) return;
      // Désactivé en mobile (la CSS passe en max-height:none, layout empilé).
      if (window.innerWidth <= 767) { node.style.maxHeight = ""; return; }
      const top = node.getBoundingClientRect().top;
      const h = Math.max(240, Math.round(window.innerHeight - top - 16));
      node.style.maxHeight = h + "px";
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true); // capture: capte le scroll des conteneurs internes
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(schedule);
      ro.observe(document.body);
    }
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (ro) ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [trades.length, embedded, selectedTrade]);

  // Ordre des colonnes du tableau, persisté côté compte (Supabase via useCloudState)
  // avec fallback localStorage. L'utilisateur peut les réordonner par drag-and-drop.
  // Colonnes existantes (visibles par défaut) + nouvelles catégories optionnelles
  // (masquées par défaut, activables depuis le bouton de config).
  const TRADE_COLUMN_IDS = [
    "asset","side","entryDate","entryTime","entry","exitDate","exitTime","exit",
    "lots","volume","pnl","pnlPct","r","duration",
    // Nouvelles colonnes
    "fees","netPnl","strategy","session","weekday",
  ];
  const DEFAULT_VISIBLE_COLUMNS = [
    "asset","side","entryDate","entryTime","entry","exitDate","exitTime","exit",
    "lots","volume","pnl","pnlPct","r","duration",
  ];
  const [rawColumnOrder, setRawColumnOrder] = useCloudState("tr4de_trades_columns", "trades_column_order", TRADE_COLUMN_IDS);
  // Validation : tout id stocké doit appartenir à TRADE_COLUMN_IDS et toutes
  // les colonnes du code doivent y être (autoriser la migration en ajoutant
  // les nouvelles colonnes en fin si elles manquent).
  const columnOrder = (() => {
    if (!Array.isArray(rawColumnOrder)) return TRADE_COLUMN_IDS;
    const cleaned = rawColumnOrder.filter(id => TRADE_COLUMN_IDS.includes(id));
    const missing = TRADE_COLUMN_IDS.filter(id => !cleaned.includes(id));
    return [...cleaned, ...missing];
  })();
  const setColumnOrder = setRawColumnOrder;

  // Colonnes visibles : persistées séparément. Par défaut on garde les
  // colonnes historiques visibles ; les nouvelles sont à activer manuellement.
  const [rawVisibleColumns, setRawVisibleColumns] = useCloudState(
    "tr4de_trades_visible_columns", "trades_visible_columns", DEFAULT_VISIBLE_COLUMNS
  );
  const visibleColumns = Array.isArray(rawVisibleColumns)
    ? rawVisibleColumns.filter(id => TRADE_COLUMN_IDS.includes(id))
    : DEFAULT_VISIBLE_COLUMNS;
  const setVisibleColumns = setRawVisibleColumns;
  const toggleColumnVisibility = (id) => {
    setVisibleColumns(prev => {
      const arr = Array.isArray(prev) ? prev : DEFAULT_VISIBLE_COLUMNS;
      return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
    });
  };
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [dragColId, setDragColId] = useState(null);
  const [dragGrabOffset, setDragGrabOffset] = useState(0);
  const [dragWidth, setDragWidth] = useState(0);
  const persistColumns = () => { /* useCloudState gère la persistance auto */ };
  const moveColRelative = (srcId, targetId, before) => {
    if (!srcId || srcId === targetId) return;
    setColumnOrder(prev => {
      const arr = prev.filter(x => x !== srcId);
      const targetIdx = arr.indexOf(targetId);
      if (targetIdx === -1) return prev;
      const insertAt = before ? targetIdx : targetIdx + 1;
      arr.splice(insertAt, 0, srcId);
      if (arr.length === prev.length && arr.every((x, i) => x === prev[i])) return prev;
      return arr;
    });
  };
  const [showBulkStrategyDropdown, setShowBulkStrategyDropdown] = useState(false);
  const [openStratMenuId, setOpenStratMenuId] = useState(null);

  // Fermer le menu strategie au clic exterieur
  React.useEffect(() => {
    if (!openStratMenuId) return;
    const handler = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('[data-strat-menu]')) setOpenStratMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openStratMenuId]);
  const [tradeNotes, setTradeNotes] = useState({});
  const [tradeStrategies, setTradeStrategies] = useState({});
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [checkedRules, setCheckedRules] = useState({});
  const [emotionTags, setEmotionTags] = useState({});
  const [errorTags, setErrorTags] = useState({});
  // Réponses à la checklist Oui/Non par trade : { [tradeId]: { [questionId]: "yes" | "no" } }
  const [tradeChecklist, setTradeChecklist] = useState({});
  // Unité de temps (timeframe) d'analyse par trade : { [tradeId]: "M15" }. Sélection unique.
  const [tradeTimeframe, setTradeTimeframe] = useState({});
  const TIMEFRAME_OPTIONS = ["M1", "M5", "M15", "H1", "H4"];
  // Liste complète des règles de la checklist (base + ajoutées), toutes
  // éditables/supprimables. Persistée globalement.
  const DEFAULT_CHECKLIST_RULES = [
    { id: "plan", label: "Plan respecté ?" },
    { id: "signal", label: "Entrée sur signal ?" },
    { id: "sltp", label: "SL / TP placés ?" },
    { id: "exitplan", label: "Sortie selon le plan ?" },
    { id: "rr2", label: "Profit sortie à 2 RR ?" },
  ];
  const [checklistRules, setChecklistRules] = useState(DEFAULT_CHECKLIST_RULES);
  const [newRuleText, setNewRuleText] = useState("");
  const [addingRule, setAddingRule] = useState(false);
  const [hoveredRuleId, setHoveredRuleId] = useState(null);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editRuleText, setEditRuleText] = useState("");
  const [dragRuleId, setDragRuleId] = useState(null);
  const [loadedStrategies, setLoadedStrategies] = useState([]);
  const [activeTab, setActiveTab] = useState("infos");

  const persistRules = (next) => { try { localStorage.setItem("tr4de_checklist_rules_v2", JSON.stringify(next)); } catch {} };
  const addCustomRule = (label) => {
    const text = String(label || "").trim();
    if (!text) return;
    setChecklistRules((prev) => { const next = [...prev, { id: `custom_${Date.now()}`, label: text }]; persistRules(next); return next; });
    setNewRuleText("");
  };
  const removeCustomRule = (id) => {
    setChecklistRules((prev) => { const next = prev.filter((r) => r.id !== id); persistRules(next); return next; });
  };
  const updateCustomRule = (id, label) => {
    const text = String(label || "").trim();
    if (!text) return;
    setChecklistRules((prev) => { const next = prev.map((r) => (r.id === id ? { ...r, label: text } : r)); persistRules(next); return next; });
  };
  // Réordonne une règle (glisser-déposer) : déplace srcId à la position de targetId.
  const moveRule = (srcId, targetId) => {
    if (!srcId || srcId === targetId) return;
    setChecklistRules((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((r) => r.id === srcId);
      const to = arr.findIndex((r) => r.id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      persistRules(arr);
      return arr;
    });
  };

  // Helper pour identifier un trade de maniere unique
  const tradeKey = (t) => t?.id != null ? `id:${t.id}` : `${t.date}_${t.symbol}_${t.entry}_${t.exit ?? ''}_${t.direction ?? ''}_${t.entryTime || ''}_${t.exitTime || ''}_${t.pnl ?? ''}`;

  // Clé de note d'un trade : on privilégie l'id (conserve les notes déjà
  // enregistrées en base sous trade_id) et on retombe sur tradeKey si l'id
  // manque. Le panneau de détail ET la colonne du tableau l'utilisent, ce qui
  // garantit que la note saisie s'affiche bien dans le tableau.
  const noteKeyOf = (t) => (t?.id != null ? t.id : tradeKey(t));

  // Toutes les clés sous lesquelles un trade peut être indexé pour ses notes /
  // stratégies. Identique au panneau de détail (id Supabase + 2 composites)
  // afin que le tableau lise EXACTEMENT ce que le panneau enregistre.
  // Inclut les clés de tous les trades enfants (cas d'un parent de groupe).
  const indexKeysOf = (tr) => {
    const keysFor = (one) => [
      one?.id,
      tradeKey(one),
      `${one?.date || ""}${one?.symbol || ""}${one?.entry ?? ""}`,
      (one?.date && one?.symbol && one?.entry != null)
        ? `${one.date}${one.symbol}${parseFloat(one.entry).toFixed(2)}`
        : null,
    ];
    let arr = keysFor(tr);
    if (Array.isArray(tr?._children)) tr._children.forEach((c) => { arr = arr.concat(keysFor(c)); });
    return Array.from(new Set(arr.filter((k) => k != null).map(String)));
  };

  // --- Frais de commission (futures) ---------------------------------------
  // Le P&L fourni par useTrades() est déjà NET de frais (le brut est conservé
  // dans `pnlGross`). On ne re-déduit donc jamais ici.
  //   - feesOf  : montant des frais du trade (pour la colonne "Frais")
  //   - netPnlOf: P&L net (= t.pnl, déjà net)
  const feesOf = (t) => {
    if (t == null) return 0;
    // Si le brut est connu, les frais réellement déduits = brut − net.
    if (t.pnlGross != null && Number.isFinite(Number(t.pnlGross))) {
      return Number(t.pnlGross) - (Number(t.pnl) || 0);
    }
    return calculateFees(t);
  };
  const netPnlOf = (t) => Number(t?.pnl) || 0;
  // Quantité de contrats/lots du trade (selon le champ disponible). null si inconnu.
  const qtyOf = (t) => {
    const q = Number(t?.quantity ?? t?.qty ?? t?.lots ?? t?.lot_size);
    return Number.isFinite(q) && q > 0 ? q : null;
  };
  // Volume notionnel du trade. null si inconnu.
  const volOf = (t) => {
    const v = Number(t?.volume);
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  // Groupes "trades pris sur plusieurs comptes" (même symbole/sens/prix d'entrée à 1 min près)
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const buildGroups = (list, windowSec = 60) => {
    const parseTs = (t) => {
      const dateStr = String(t.date || "").slice(0, 10);
      const time = t.entryTime || t.entry_time || "00:00:00";
      const m = String(time).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!m) return null;
      const dt = new Date(`${dateStr}T${String(m[1]).padStart(2, "0")}:${m[2]}:${m[3] || "00"}`);
      const v = dt.getTime();
      return isNaN(v) ? null : v;
    };
    const sig = (t) => {
      const sym = String(t.symbol || "").toUpperCase();
      const dir = String(t.direction || "").toLowerCase();
      const entry = Math.round((Number(t.entry) || 0) * 100);
      return `${sym}|${dir}|${entry}`;
    };
    // Bucket par signature
    const buckets = new Map();
    for (const t of list) {
      const key = sig(t);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ t, ts: parseTs(t) });
    }
    const groups = [];
    for (const arr of buckets.values()) {
      arr.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      let cur = null;
      for (const item of arr) {
        if (cur && item.ts !== null && cur.lastTs !== null && Math.abs(item.ts - cur.lastTs) <= windowSec * 1000) {
          cur.children.push(item.t);
          cur.lastTs = item.ts;
        } else {
          if (cur) groups.push(cur);
          cur = { children: [item.t], lastTs: item.ts };
        }
      }
      if (cur) groups.push(cur);
    }
    // Une clé stable basée sur le premier child
    return groups.map(g => ({
      key: `g_${tradeKey(g.children[0])}`,
      parent: g.children[0],
      children: g.children,
      pnlSum: g.children.reduce((s, x) => s + (Number(x.pnl) || 0), 0),
      feesSum: g.children.reduce((s, x) => s + feesOf(x), 0),
      netSum: g.children.reduce((s, x) => s + netPnlOf(x), 0),
      qtySum: g.children.reduce((s, x) => s + (qtyOf(x) || 0), 0),
      volSum: g.children.reduce((s, x) => s + (volOf(x) || 0), 0),
    }));
  };

  // Propage une opération à tous les trades enfants d'un groupe (si applicable)
  const childrenOf = (selected) => Array.isArray(selected?._children) && selected._children.length > 1
    ? selected._children
    : (selected ? [selected] : []);

  const allEmotionTags = [
    { id: "fomo", label: "FOMO", color: "#C94F4F" },
    { id: "revenge", label: "Vengeance", color: "#C94F4F" },
    { id: "overconfident", label: "Trop confiant", color: "#D4A574" },
    { id: "hesitation", label: "Hésitation", color: "#D4A574" },
    { id: "calm", label: "Calme & focus", color: "#4A9D6F" },
    { id: "followed", label: "Plan suivi", color: "#4A9D6F" },
    { id: "boredom", label: "Trade ennui", color: "#5B7EC9" },
    { id: "earlyexit", label: "Sortie anticipée", color: "#8B6BB6" }
  ];

  // Questions de la checklist Oui/Non du panneau détail (remplace direction + horaires)
  const checklistQuestions = Array.isArray(checklistRules) ? checklistRules : DEFAULT_CHECKLIST_RULES;

  // Nature de chaque émotion pour la note du trade (+1 positif, -1 négatif).
  const EMOTION_SENTIMENT = {
    calm: 1, followed: 1,
    fomo: -1, revenge: -1, overconfident: -1, hesitation: -1, boredom: -1, earlyexit: -1,
  };
  // Note du trade (sur 10) calculée depuis les règles respectées + les émotions.
  // Règle "Oui" = positif, "Non" = négatif ; émotion selon EMOTION_SENTIMENT.
  // Renvoie null si rien n'est renseigné.
  const computeTradeNote = (trade) => {
    const id = trade?.id;
    if (!id) return null;
    const answers = tradeChecklist[id] || {};
    let pos = 0, neg = 0;
    checklistQuestions.forEach((q) => {
      const a = answers[q.id];
      if (a === "yes") pos += 1;
      else if (a === "no") neg += 1;
    });
    (emotionTags[id] || []).forEach((eid) => {
      const s = EMOTION_SENTIMENT[eid] || 0;
      if (s > 0) pos += 1;
      else if (s < 0) neg += 1;
    });
    const total = pos + neg;
    if (total === 0) return null;
    const score = Math.round((pos / total) * 10);
    const color = score >= 7 ? T.green : score >= 4 ? "#F97316" : T.red;
    return { score, color };
  };

  // Coche une réponse de checklist et la propage aux trades enfants d'un groupe.
  const setChecklistAnswer = (selectedTrade, questionId, answer) => {
    const targets = childrenOf(selectedTrade);
    setTradeChecklist((prev) => {
      const updated = { ...prev };
      for (const child of targets) {
        const cid = child.id;
        if (!cid) continue;
        const cur = { ...(updated[cid] || {}) };
        // Re-cliquer la réponse déjà active la retire (toggle)
        if (cur[questionId] === answer) delete cur[questionId];
        else cur[questionId] = answer;
        updated[cid] = cur;
      }
      try { localStorage.setItem("tr4de_trade_checklist", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Sélectionne l'unité de temps (sélection unique) et la propage aux trades
  // enfants d'un groupe. Re-cliquer la valeur active la retire (toggle).
  const setTimeframeFor = (selectedTrade, tf) => {
    const targets = childrenOf(selectedTrade);
    setTradeTimeframe((prev) => {
      const updated = { ...prev };
      for (const child of targets) {
        const cid = child.id;
        if (!cid) continue;
        if (updated[cid] === tf) delete updated[cid];
        else updated[cid] = tf;
      }
      try { localStorage.setItem("tr4de_trade_timeframe", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Bascule une émotion (multi-sélection) et propage aux trades enfants d'un groupe.
  const toggleEmotion = (selectedTrade, tagId) => {
    const tradeId = selectedTrade?.id;
    if (!tradeId) return;
    const targets = childrenOf(selectedTrade);
    const isSelected = emotionTags[tradeId] && emotionTags[tradeId].includes(tagId);
    const updated = { ...emotionTags };
    for (const child of targets) {
      const cid = child.id;
      if (!cid) continue;
      const cur = updated[cid] || [];
      if (isSelected) {
        updated[cid] = cur.filter((x) => x !== tagId);
        removeEmotion(cid, tagId).catch((err) => console.error("❌ Remove emotion failed:", err?.message));
      } else if (!cur.includes(tagId)) {
        updated[cid] = [...cur, tagId];
        addEmotion(cid, tagId).catch((err) => console.error("❌ Add emotion failed:", err?.message));
      }
    }
    setEmotionTags(updated);
    try { localStorage.setItem("tr4de_emotion_tags", JSON.stringify(updated)); } catch {}
  };

  // Bascule une erreur (multi-sélection) et propage aux trades enfants d'un groupe.
  const toggleError = (selectedTrade, tagId) => {
    const tradeId = selectedTrade?.id;
    if (!tradeId) return;
    const targets = childrenOf(selectedTrade);
    const isSelected = errorTags[tradeId] && errorTags[tradeId].includes(tagId);
    const updated = { ...errorTags };
    for (const child of targets) {
      const cid = child.id;
      if (!cid) continue;
      const cur = updated[cid] || [];
      if (isSelected) {
        updated[cid] = cur.filter((x) => x !== tagId);
        removeError(cid, tagId).catch((err) => console.error("❌ Remove error failed:", err?.message));
      } else if (!cur.includes(tagId)) {
        updated[cid] = [...cur, tagId];
        addError(cid, tagId).catch((err) => console.error("❌ Add error failed:", err?.message));
      }
    }
    setErrorTags(updated);
    try { localStorage.setItem("tr4de_error_tags", JSON.stringify(updated)); } catch {}
  };

  const allErrorTags = [
    { id: "poorentry", label: "Mauvaise entrée", color: "#C94F4F" },
    { id: "poorexit", label: "Mauvaise sortie", color: "#C94F4F" },
    { id: "nosltp", label: "Pas de SL/TP", color: "#D4A574" },
    { id: "overleveraged", label: "Sur-leveragé", color: "#D4A574" },
    { id: "ignoredsignal", label: "Signaux ignorés", color: "#8B6BB6" },
    { id: "badtiming", label: "Mauvais timing", color: "#C94F4F" },
    { id: "slttoosmall", label: "SL trop petite", color: "#D4A574" },
    { id: "wronganalysis", label: "Mauvaise analyse", color: "#8B6BB6" }
  ];

  // ✅ Sync depuis Supabase (notes/emotions/errors): hook = source de vérité.
  React.useEffect(() => {
    if (notesFromHook && Object.keys(notesFromHook).length > 0) {
      setTradeNotes(notesFromHook);
      try { localStorage.setItem("tr4de_trade_notes", JSON.stringify(notesFromHook)); } catch {}
    }
  }, [notesFromHook]);
  React.useEffect(() => {
    if (emotionsFromHook && Object.keys(emotionsFromHook).length > 0) {
      setEmotionTags(emotionsFromHook);
      try { localStorage.setItem("tr4de_emotion_tags", JSON.stringify(emotionsFromHook)); } catch {}
    }
  }, [emotionsFromHook]);
  React.useEffect(() => {
    if (errorsFromHook && Object.keys(errorsFromHook).length > 0) {
      setErrorTags(errorsFromHook);
      try { localStorage.setItem("tr4de_error_tags", JSON.stringify(errorsFromHook)); } catch {}
    }
  }, [errorsFromHook]);

  // Debounce notes Supabase save (textarea fires per keystroke)
  const noteSaveTimers = React.useRef({});
  const persistNote = React.useCallback((tradeId, text) => {
    if (!tradeId) { console.warn("⚠️ persistNote: tradeId manquant — note non sauvegardée en ligne"); return; }
    if (noteSaveTimers.current[tradeId]) clearTimeout(noteSaveTimers.current[tradeId]);
    noteSaveTimers.current[tradeId] = setTimeout(() => {
      setNoteHook(tradeId, text)
        .then(() => { /* note saved */ })
        .catch(err => console.error("❌ Save note failed:", err?.message || err));
    }, 600);
  }, [setNoteHook]);

  // Charger l'onglet actif depuis localStorage au démarrage
  React.useEffect(() => {
    const savedTab = localStorage.getItem("tr4de_active_tab");
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Sauvegarder l'onglet actif dans localStorage quand il change
  React.useEffect(() => {
    localStorage.setItem("tr4de_active_tab", activeTab);
  }, [activeTab]);

  // Load trade notes and strategies from localStorage - RUNS EVERY TIME COMPONENT MOUNTS
  React.useEffect(() => {
    
    try {
      const savedNotes = localStorage.getItem("tr4de_trade_notes");
      if (savedNotes) {
        setTradeNotes(JSON.parse(savedNotes));
      }
      
      // ✅ Fast path: localStorage. Sync depuis Supabase juste après (voir useEffect dédié).
      const savedTradeStrategies = localStorage.getItem("tr4de_trade_strategies");
      if (savedTradeStrategies) {
        const parsed = JSON.parse(savedTradeStrategies);
        setTradeStrategies(parsed);
      }
      
      // ✅ CRITICAL: Always reload strategies list
      // Source de vérité : tr4de_strategies (clé actuelle). Fallback sur apex_strategies (legacy).
      const savedStrategies = localStorage.getItem("tr4de_strategies") || localStorage.getItem("apex_strategies");
      if (savedStrategies) {
        const parsed = JSON.parse(savedStrategies);
        setLoadedStrategies(parsed);
      }

      const savedEmotionTags = localStorage.getItem("tr4de_emotion_tags");
      if (savedEmotionTags) {
        setEmotionTags(JSON.parse(savedEmotionTags));
      }

      const savedErrorTags = localStorage.getItem("tr4de_error_tags");
      if (savedErrorTags) {
        setErrorTags(JSON.parse(savedErrorTags));
      }

      const savedChecklist = localStorage.getItem("tr4de_trade_checklist");
      if (savedChecklist) {
        setTradeChecklist(JSON.parse(savedChecklist));
      }

      const savedTimeframe = localStorage.getItem("tr4de_trade_timeframe");
      if (savedTimeframe) {
        setTradeTimeframe(JSON.parse(savedTimeframe));
      }

      const savedRules = localStorage.getItem("tr4de_checklist_rules_v2");
      if (savedRules) {
        const parsed = JSON.parse(savedRules);
        if (Array.isArray(parsed) && parsed.length) setChecklistRules(parsed);
      } else {
        // Migration depuis l'ancienne clé (ne contenait que les règles ajoutées)
        const old = localStorage.getItem("tr4de_checklist_rules");
        if (old) {
          const oldArr = JSON.parse(old);
          if (Array.isArray(oldArr) && oldArr.length) {
            const merged = [...DEFAULT_CHECKLIST_RULES, ...oldArr];
            setChecklistRules(merged);
            try { localStorage.setItem("tr4de_checklist_rules_v2", JSON.stringify(merged)); } catch {}
          }
        }
      }

      // Reload checked rules - ONLY use valid boolean values
      const savedCheckedRules = localStorage.getItem("tr4de_checked_rules");
      if (savedCheckedRules) {
        try {
          const parsed = JSON.parse(savedCheckedRules);
          // ✅ Clean: filter out non-boolean values to prevent corruption
          const cleaned = {};
          Object.keys(parsed).forEach(key => {
            if (typeof parsed[key] === 'boolean') {
              cleaned[key] = parsed[key];
            }
          });
          setCheckedRules(cleaned);
        } catch (e) {
          console.warn("⚠️ Corrupt checked rules data, resetting");
          setCheckedRules({});
          localStorage.removeItem("tr4de_checked_rules");
        }
      }
    } catch (err) {
      console.error("Error loading data from localStorage:", err);
    }
  }, []); // Empty dependency - runs ONLY on component mount

  // Charger les assignments trade↔strategy depuis Supabase (source de vérité).
  // Refetch sur focus pour synchroniser entre navigateurs.
  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    let cancelled = false;

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("trade_strategies")
          .select("trade_id, strategy_id")
          .eq("user_id", user.id);
        if (error) {
          if (error.message?.includes("Could not find the table") || error.code === "PGRST116") return;
          throw error;
        }
        if (cancelled) return;
        const map = {};
        (data || []).forEach((row) => {
          if (!map[row.trade_id]) map[row.trade_id] = [];
          map[row.trade_id].push(row.strategy_id);
        });
        setTradeStrategies(map);
        try { localStorage.setItem("tr4de_trade_strategies", JSON.stringify(map)); } catch {}
      } catch (err) {
        console.error("❌ Erreur chargement trade_strategies:", err?.message || err);
      }
    };

    loadFromSupabase();
    const onFocus = () => loadFromSupabase();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user?.id]);

  // Auto-save trade strategies: localStorage immédiat + Supabase (debounced full sync)
  const lastSyncedRef = React.useRef(null);
  React.useEffect(() => {
    if (Object.keys(tradeStrategies).length > 0) {
      try { localStorage.setItem("tr4de_trade_strategies", JSON.stringify(tradeStrategies)); } catch {}
    }

    if (!user?.id) return;
    const snapshot = JSON.stringify(tradeStrategies);
    if (snapshot === lastSyncedRef.current) return;

    const handle = setTimeout(async () => {
      const supabase = createClient();
      try {
        // Fetch existant pour diff
        const { data: existing, error: fetchErr } = await supabase
          .from("trade_strategies")
          .select("trade_id, strategy_id")
          .eq("user_id", user.id);
        if (fetchErr) {
          if (fetchErr.message?.includes("Could not find the table") || fetchErr.code === "PGRST116") return;
          throw fetchErr;
        }
        const existingSet = new Set((existing || []).map(r => `${r.trade_id}::${r.strategy_id}`));
        const desiredSet = new Set();
        const desiredRows = [];
        Object.entries(tradeStrategies).forEach(([tradeId, stratIds]) => {
          (stratIds || []).forEach(sid => {
            const key = `${tradeId}::${sid}`;
            desiredSet.add(key);
            desiredRows.push({ user_id: user.id, trade_id: String(tradeId), strategy_id: String(sid) });
          });
        });

        const toDelete = (existing || []).filter(r => !desiredSet.has(`${r.trade_id}::${r.strategy_id}`));
        const toInsert = desiredRows.filter(r => !existingSet.has(`${r.trade_id}::${r.strategy_id}`));

        // Delete supprimés
        for (const row of toDelete) {
          await supabase.from("trade_strategies")
            .delete()
            .eq("user_id", user.id)
            .eq("trade_id", row.trade_id)
            .eq("strategy_id", row.strategy_id);
        }
        // Insert ajoutés
        if (toInsert.length > 0) {
          await supabase.from("trade_strategies").insert(toInsert);
        }
        lastSyncedRef.current = snapshot;
      } catch (err) {
        console.error("❌ Erreur sync trade_strategies:", err?.message || err);
      }
    }, 600);

    return () => clearTimeout(handle);
  }, [tradeStrategies, user?.id]);

  // Auto-save checked rules to localStorage
  React.useEffect(() => {
    if (Object.keys(checkedRules).length > 0) {
      localStorage.setItem("tr4de_checked_rules", JSON.stringify(checkedRules));
    }
    // Notifier les autres composants du même onglet (le `storage` event
    // natif ne se déclenche que pour les autres onglets).
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tr4de:checked-rules-changed"));
    }
  }, [checkedRules]);

  // Paste depuis le presse-papier → upload sur le trade sélectionné (si pas déjà de screenshot)
  React.useEffect(() => {
    if (!selectedTrade || screenshotUrls[selectedTrade.id]) return;
    const onPaste = async (e) => {
      const ae = document.activeElement;
      const isEditable = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
      if (isEditable && ae.tagName !== "LABEL") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.kind === "file" && it.type?.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            e.preventDefault();
            setScreenshotBusy(true);
            try { await uploadScreenshot(selectedTrade.id, f); }
            finally { setScreenshotBusy(false); }
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [selectedTrade, screenshotUrls, uploadScreenshot]);

  // Auto-close selected trade panel if trade was deleted
  React.useEffect(() => {
    if (selectedTrade && trades) {
      const tradeExists = trades.some(t => 
        t.id === selectedTrade.id || 
        (t.date === selectedTrade.date && t.symbol === selectedTrade.symbol && t.entry === selectedTrade.entry)
      );
      
      if (!tradeExists) {
        setSelectedTrade(null);
      }
    }
  }, [trades]);

  // Filtrage par plage de dates (debut + fin)
  const getFilteredTrades = () => {
    if (!filterStartDate || !filterEndDate) return trades;
    const start = new Date(filterStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filterEndDate);
    end.setHours(23, 59, 59, 999);
    return trades.filter(t => {
      const tradeDate = new Date(t.date);
      return tradeDate >= start && tradeDate <= end;
    });
  };

  // Le filtrage par date est désormais géré globalement dans le layout.
  const filteredTrades = trades;

  if (!trades || trades.length === 0) {
    if (embedded) return null; // l'empty state est géré par le parent
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("journal.title")}</h1>
          <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
        </div>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"64px 40px",textAlign:"center",minHeight:"50vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <div style={{width:48,height:48,borderRadius:12,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
            <LucideTrendingUp size={22} strokeWidth={1.75} color={T.text}/>
          </div>
          <div style={{fontSize:17,fontWeight:600,color:T.text,marginBottom:6,letterSpacing:-0.1}}>{t("journal.empty")}</div>
          <div style={{fontSize:13,color:T.textSub,marginBottom:20,maxWidth:380,lineHeight:1.5}}>{t("journal.emptySub")}</div>
          <button onClick={onImportClick} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:999,background:T.white,color:T.text,fontSize:13,fontWeight:600,cursor:"pointer",border:`1px solid ${T.text}`,fontFamily:"var(--font-sans)"}}>
            <LucidePlus size={14} strokeWidth={2}/> {t("trades.importBtn").replace(/^\+\s*/, "")}
          </button>
        </div>
      </div>
    );
  }

  // Calculate symbol statistics
  const symbolStats = {};
  filteredTrades.forEach(t => {
    if (!symbolStats[t.symbol]) {
      symbolStats[t.symbol] = {
        trades: [],
        totalPnL: 0,
        wins: 0,
        losses: 0
      };
    }
    const net = netPnlOf(t);
    symbolStats[t.symbol].trades.push(t);
    symbolStats[t.symbol].totalPnL += net;
    if (net > 0) symbolStats[t.symbol].wins++;
    else if (net < 0) symbolStats[t.symbol].losses++;
  });

  // Find best and worst symbols
  let bestSymbol = null, worstSymbol = null, bestPnL = -Infinity, worstPnL = Infinity;
  Object.entries(symbolStats).forEach(([sym, stats]) => {
    if (stats.totalPnL > bestPnL) { bestPnL = stats.totalPnL; bestSymbol = sym; }
    if (stats.totalPnL < worstPnL) { worstPnL = stats.totalPnL; worstSymbol = sym; }
  });

  const totalPnL = filteredTrades.reduce((s,t)=>s+netPnlOf(t),0);
  const totalWins = filteredTrades.filter(t=>netPnlOf(t)>0).length;
  const winRate = filteredTrades.length > 0 ? ((totalWins/filteredTrades.length)*100).toFixed(0) : 0;
  const symbolCount = Object.keys(symbolStats).length;

  const topSymbol = Object.entries(symbolStats).sort((a,b)=>b[1].totalPnL-a[1].totalPnL)[0];

  // Handle clearing filtered trades
  const handleClearFilteredTrades = async () => {
    if (dateFilter === "all") {
      // Clear all trades
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer tous les ${filteredTrades.length} trades ?`)) {
        onClearTrades();
      }
    } else {
      // Clear filtered trades only
      const filterLabels = { day: "aujourd'hui", week: "cette semaine", month: "ce mois", year: "cette année" };
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer les ${filteredTrades.length} trades de ${filterLabels[dateFilter]} ?`)) {
        for (const trade of filteredTrades) {
          await onDeleteTrade(trade);
        }
      }
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
      {!embedded && (
        <div style={{display:"flex",alignItems:"center",marginBottom:8,gap:12,flexWrap:"wrap"}}>
          <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("trades.title")}</h1>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center",fontFamily:"var(--font-sans)"}}>
            <button onClick={onImportClick} style={{padding:"7px 16px",height:34,borderRadius:999,background:"#0D0D0D",border:"1px solid #0D0D0D",color:"#FFFFFF",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>{t("trades.importBtn")}</button>
          </div>
          <div id="tr4de-page-header-slot" />
        </div>
      )}

      {/* MODAL CONFIG COLONNES — apparaît centrée devant l'écran avec backdrop. */}
      {columnsMenuOpen && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          {...backdropDismiss(() => setColumnsMenuOpen(false))}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, animation: "fadeIn .15s ease",
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true"
            style={{
              width: "min(560px, 100%)", maxHeight: "min(80vh, 720px)",
              background: T.white, borderRadius: 14,
              boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              fontFamily: "var(--font-sans)",
              animation: "scaleIn .18s cubic-bezier(.2,.8,.2,1)",
            }}>
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
            <div style={{
              padding: "18px 22px 14px", display: "flex", alignItems: "center", gap: 12,
              borderBottom: `1px solid ${T.border}`,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>
                  Colonnes du tableau
                </div>
                <div style={{ fontSize: 12, color: T.textMut, marginTop: 2 }}>
                  Coche les catégories à afficher dans le tableau des trades.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColumnsMenuOpen(false)}
                aria-label="Fermer"
                style={{
                  marginLeft: "auto", width: 30, height: 30, borderRadius: 8,
                  border: "none", background: "transparent", color: T.textSub, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <LucideX size={16} strokeWidth={1.75} />
              </button>
            </div>
            <div style={{
              padding: "14px 16px", overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
            }}>
              {TRADE_COLUMN_IDS.map(id => {
                const labelMap = {
                  asset: t("trades.colAsset"), side: t("trades.colSide"),
                  entryDate: t("trades.colEntryDate"), entryTime: t("trades.colEntryTime"),
                  entry: t("trades.colEntry"), exitDate: t("trades.colExitDate"),
                  exitTime: t("trades.colExitTime"), exit: t("trades.colExit"),
                  lots: t("trades.colLots"), volume: t("trades.colVolume"),
                  pnl: t("trades.colPnL"), pnlPct: t("trades.colPnLPct"),
                  r: "R", duration: t("trades.colDuration"),
                  fees: "Frais", netPnl: "P&L net", strategy: "Stratégie",
                  session: "Session", weekday: "Jour",
                };
                const checked = visibleColumns.includes(id);
                return (
                  <label key={id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                      fontSize: 13, color: T.text, fontWeight: 500,
                      transition: "background .12s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.bg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleColumnVisibility(id)}
                      style={{ accentColor: T.text, cursor: "pointer", width: 14, height: 14, flexShrink: 0 }}
                    />
                    <span style={{ flex: 1 }}>{labelMap[id] || id}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* LAYOUT WITH TABLE + SIDE PANEL WITH TABS */}
      <div className="tr4de-trades-layout" style={{display:"flex",gap:16,alignItems:"flex-start"}}>

        {/* LEFT - TRADES TABLE */}
        <div ref={tradesMainRef} className="tr4de-trades-main" style={{flex:selectedTrade?"0 0 calc(100% - 376px)":"1",minWidth:0,background:T.white,border:`1px solid ${T.border}`,borderTop: embedded ? "none" : `1px solid ${T.border}`,borderRadius: embedded ? "0 0 12px 12px" : 12,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 200px)"}}>
          

          <div className="tr4de-trades-scroll" style={{overflowX:"scroll",overflowY:"auto",overscrollBehavior:"contain",flex:1,minHeight:0}}>
            <table style={{width:"max-content",minWidth:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"var(--font-sans)"}}>
              <thead style={{position:"sticky",top:0,background:T.bg,zIndex:10}}>
                <tr
                  style={{borderBottom:`1px solid ${T.border}`}}
                  onDragOver={(e) => {
                    if (!dragColId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const dragLeft = e.clientX - dragGrabOffset;
                    const dragRight = dragLeft + dragWidth;
                    const sourceIdx = columnOrder.indexOf(dragColId);
                    if (sourceIdx === -1) return;
                    // On parcourt les en-têtes des colonnes réordonnables
                    // (ils portent l'attribut data-col-id).
                    const cells = e.currentTarget.querySelectorAll("th[data-col-id]");
                    for (const th of cells) {
                      const cid = th.getAttribute("data-col-id");
                      if (!cid || cid === dragColId) continue;
                      const r = th.getBoundingClientRect();
                      const targetMid = r.left + r.width / 2;
                      const targetIdx = columnOrder.indexOf(cid);
                      if (targetIdx === -1) continue;
                      const movingRight = sourceIdx < targetIdx;
                      if (movingRight && dragRight >= targetMid) {
                        moveColRelative(dragColId, cid, false);
                        return;
                      }
                      if (!movingRight && dragLeft <= targetMid) {
                        moveColRelative(dragColId, cid, true);
                        return;
                      }
                    }
                  }}
                  onDrop={(e) => { e.preventDefault(); persistColumns(columnOrder); setDragColId(null); }}
                >
                  {/* Symbol : master checkbox quand >= 1 selectionne */}
                  <th style={{padding:"12px 22px",textAlign:"left",fontSize:11,fontWeight:500,color:T.textMut,whiteSpace:"nowrap",background:T.bg,height:42,minWidth:130,width:130}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:8,height:22,verticalAlign:"middle"}}>
                      <span style={{width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {selectedIds.size > 0 && (
                          <input
                            type="checkbox"
                            checked={filteredTrades.length > 0 && filteredTrades.every(t => selectedIds.has(tradeKey(t)))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const next = new Set(selectedIds);
                                filteredTrades.forEach(t => next.add(tradeKey(t)));
                                setSelectedIds(next);
                              } else {
                                setSelectedIds(new Set());
                              }
                            }}
                            style={{cursor:"pointer",width:14,height:14,accentColor:"#0D0D0D",margin:0,display:"block",verticalAlign:"middle"}}
                            onClick={(e)=>e.stopPropagation()}
                          />
                        )}
                      </span>
                      <span>{t("common.symbol")}</span>
                    </span>
                  </th>
                  {(() => {
                    const labels = {
                      asset:     { label: t("trades.colAsset") },
                      side:      { label: t("trades.colSide") },
                      entryDate: { label: t("trades.colEntryDate"), sorted: true },
                      entryTime: { label: t("trades.colEntryTime") },
                      entry:     { label: t("trades.colEntry") },
                      exitDate:  { label: t("trades.colExitDate") },
                      exitTime:  { label: t("trades.colExitTime") },
                      exit:      { label: t("trades.colExit") },
                      lots:      { label: t("trades.colLots") },
                      volume:    { label: t("trades.colVolume") },
                      pnl:       { label: t("trades.colPnL") },
                      pnlPct:    { label: t("trades.colPnLPct") },
                      r:         { label: "R" },
                      duration:  { label: t("trades.colDuration") },
                      // Nouvelles colonnes (activables via le bouton de config)
                      fees:      { label: "Frais" },
                      netPnl:    { label: "P&L net" },
                      strategy:  { label: "Stratégie" },
                      session:   { label: "Session" },
                      weekday:   { label: "Jour" },
                    };
                    return columnOrder.filter(id => visibleColumns.includes(id)).map(id => {
                      const h = labels[id]; if (!h) return null;
                      const isDragging = dragColId === id;
                      return (
                        <th
                          key={id}
                          data-col-id={id}
                          draggable
                          onDragStart={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            e.dataTransfer.setData("text/plain", id);
                            e.dataTransfer.effectAllowed = "move";
                            setDragColId(id);
                            setDragGrabOffset(e.clientX - rect.left);
                            setDragWidth(rect.width);
                          }}
                          onDragEnd={() => { persistColumns(columnOrder); setDragColId(null); }}
                          title="Glisser pour réordonner"
                          style={{
                            position: "relative",
                            padding: "12px 22px",
                            textAlign: "left", fontSize: 11, fontWeight: 500,
                            color: T.textMut,
                            whiteSpace: "nowrap",
                            background: T.bg,
                            cursor: "grab",
                            opacity: isDragging ? 0.45 : 1,
                            userSelect: "none",
                          }}
                        >
                          {/* Poignée en position absolue dans le padding gauche : elle ne
                              décale pas le libellé, qui reste aligné sur les données. */}
                          <LucideGripVertical size={11} strokeWidth={1.75} style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", color: T.textMut, opacity: 0.55 }} />
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {h.label}
                            {h.sorted && <LucideArrowDown size={11} strokeWidth={1.75} />}
                          </span>
                        </th>
                      );
                    });
                  })()}
                  {/* Settings column header */}
                  <th style={{padding:"12px 8px",textAlign:"right",background:T.bg,width:32}}>
                    <button
                      aria-label="Configurer colonnes"
                      onClick={(e) => { e.stopPropagation(); setColumnsMenuOpen(v => !v); }}
                      style={{background: columnsMenuOpen ? "#F0F0F0" : "transparent",border:"none",padding:4,cursor:"pointer",color:T.textMut,display:"inline-flex",alignItems:"center",borderRadius:6,transition:"background .12s ease"}}
                      onMouseEnter={(e)=>{ if(!columnsMenuOpen) e.currentTarget.style.background="#F0F0F0" }}
                      onMouseLeave={(e)=>{ if(!columnsMenuOpen) e.currentTarget.style.background="transparent" }}
                    >
                      <LucideSlidersHorizontal size={14} strokeWidth={1.75} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const fmtTime = (v) => {
                    if (!v) return '—';
                    // Si c'est déjà une heure formatée "HH:MM" ou "HH:MM:SS"
                    if (/^\d{1,2}:\d{2}/.test(String(v))) return String(v);
                    // Sinon parser comme date
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return '—';
                    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  };
                  // Construire les groupes d'abord, puis aplatir en rangées (parent + enfants si dépliés)
                  const groups = buildGroups(filteredTrades, 60);
                  groups.sort((a, b) => {
                    const dateA = String(a.parent.date || "").slice(0, 10);
                    const dateB = String(b.parent.date || "").slice(0, 10);
                    if (dateA !== dateB) return dateB.localeCompare(dateA);
                    const timeA = a.parent.exitTime || a.parent.exit_time || "00:00:00";
                    const timeB = b.parent.exitTime || b.parent.exit_time || "00:00:00";
                    return String(timeB).localeCompare(String(timeA));
                  });
                  // Aplatir : pour chaque groupe → ligne parent (groupRow=true si N>1) + enfants si déplié
                  const rows = [];
                  for (const g of groups) {
                    const isGroup = g.children.length > 1;
                    const parentTrade = isGroup
                      ? { ...g.parent, _children: g.children, _groupKey: g.key, _groupPnl: g.pnlSum, _groupFees: g.feesSum, _groupNet: g.netSum, _groupQty: g.qtySum, _groupVolume: g.volSum }
                      : g.parent;
                    rows.push({ trade: parentTrade, isGroupParent: isGroup, isChild: false, groupKey: g.key, groupSize: g.children.length });
                    if (isGroup && expandedGroups.has(g.key)) {
                      for (let ci = 1; ci < g.children.length; ci++) {
                        rows.push({ trade: g.children[ci], isGroupParent: false, isChild: true, groupKey: g.key, groupSize: g.children.length });
                      }
                    }
                  }
                  return rows.map(({ trade: t, isGroupParent, isChild, groupKey, groupSize }, i) => {
                  // Toutes les métriques dérivées (%, R, P&L net) sont calculées net de frais.
                  const rowNet = t._groupNet != null ? t._groupNet : netPnlOf(t);
                  const ret = ((rowNet/(t.entry*100))*100).toFixed(2);
                  const dateObj = new Date(t.date);
                  const openDate = dateObj.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'2-digit'});
                  const openTime = fmtTime(t.entryTime || t.entry_time);
                  const closeDate = openDate;
                  const closeTime = fmtTime(t.exitTime || t.exit_time);
                  const tKey = tradeKey(t);
                  // Pour un parent de groupe : la case est cochée seulement si
                  // TOUS les enfants du lot sont sélectionnés. Permet à la
                  // suppression en masse de viser le lot entier.
                  const groupChildKeys = isGroupParent && Array.isArray(t._children)
                    ? t._children.map(c => tradeKey(c))
                    : null;
                  const isChecked = isGroupParent
                    ? (groupChildKeys && groupChildKeys.length > 0 && groupChildKeys.every(k => selectedIds.has(k)))
                    : selectedIds.has(tKey);
                  const isHovered = hoveredRowId === tKey;
                  const isOpen = selectedTrade && tradeKey(selectedTrade) === tKey;
                  const showCheckbox = isChecked || isHovered;
                  // Coche/décoche la ligne (gère Shift+clic pour sélectionner une plage).
                  const onCheckboxClick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const shouldCheck = !isChecked;
                    const next = new Set(selectedIds);
                    if (e.shiftKey && lastSelectedIndex != null && lastSelectedIndex !== i) {
                      const lo = Math.min(lastSelectedIndex, i);
                      const hi = Math.max(lastSelectedIndex, i);
                      for (let k = lo; k <= hi; k++) {
                        const r = rows[k];
                        if (!r || r.isChild) continue;
                        const rt = r.trade;
                        const rChildKeys = r.isGroupParent && Array.isArray(rt._children)
                          ? rt._children.map(c => tradeKey(c))
                          : null;
                        if (rChildKeys) {
                          if (shouldCheck) rChildKeys.forEach(kk => next.add(kk));
                          else rChildKeys.forEach(kk => next.delete(kk));
                        } else {
                          const rKey = tradeKey(rt);
                          if (shouldCheck) next.add(rKey); else next.delete(rKey);
                        }
                      }
                    } else if (isGroupParent && groupChildKeys) {
                      if (shouldCheck) groupChildKeys.forEach(k => next.add(k));
                      else groupChildKeys.forEach(k => next.delete(k));
                    } else {
                      if (shouldCheck) next.add(tKey); else next.delete(tKey);
                    }
                    setSelectedIds(next);
                    setLastSelectedIndex(i);
                  };
                  const selectedBg = "#F0F0F0";
                  const hoverBg = "#FAFAFA";
                  const openBg = "#F5F5F5";

                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom:`1px solid ${T.border}`,
                        background: isOpen ? openBg : (isChecked ? selectedBg : (isHovered ? hoverBg : T.white)),
                        boxShadow: isOpen ? `inset 3px 0 0 0 ${T.text}` : "none",
                        cursor:"pointer",
                        transition:"box-shadow .12s ease",
                      }}
                      onClick={()=>{
                        const isSelectedDetail = selectedTrade && tradeKey(selectedTrade) === tKey;
                        if(isSelectedDetail) {
                          setSelectedTrade(null);
                        } else {
                          setSelectedTrade(t);
                        }
                      }}
                      onMouseEnter={()=>setHoveredRowId(tKey)}
                      onMouseLeave={()=>setHoveredRowId(null)}
                    >
                      {/* Symbol + checkbox conditionnelle + icone trending + badge groupe */}
                      <td style={{padding:"12px 22px",fontWeight:600,color:T.text,fontFamily:"var(--font-sans)",height:42,minWidth:130,width:130, paddingLeft: isChild ? 44 : 22}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:8,height:22,verticalAlign:"middle"}}>
                          {!isChild && (
                            // Carré unique 22px : contient l'icône du symbole (ou le chevron de
                            // groupe) par défaut, et la case à cocher au survol/sélection. La
                            // largeur étant fixe, le texte ne se décale jamais.
                            <span style={{width:22,height:22,borderRadius:6,background:T.bg,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              {isGroupParent && !isChecked ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedGroups(prev => {
                                      const next = new Set(prev);
                                      if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
                                      return next;
                                    });
                                  }}
                                  aria-label={expandedGroups.has(groupKey) ? "Replier" : "Déplier"}
                                  style={{
                                    width: 22, height: 22, borderRadius: 6,
                                    background: "transparent", border: "none",
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", color: T.textMut, flexShrink: 0, padding: 0,
                                    transform: expandedGroups.has(groupKey) ? "rotate(0deg)" : "rotate(-90deg)",
                                    transition: "transform .15s ease",
                                  }}
                                >
                                  <LucideChevronDown size={13} strokeWidth={2} />
                                </button>
                              ) : (isGroupParent || showCheckbox) ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  onClick={onCheckboxClick}
                                  style={{cursor:"pointer",width:14,height:14,accentColor:"#0D0D0D",margin:0,display:"block",verticalAlign:"middle",flexShrink:0}}
                                />
                              ) : (
                                <LucideTrendingUp size={13} strokeWidth={1.75} color={T.textMut} />
                              )}
                            </span>
                          )}
                          <span>{t.symbol}</span>
                          {isGroupParent && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: T.textSub,
                              padding: "1px 6px", borderRadius: 999,
                              background: T.bg, border: `1px solid ${T.border}`,
                            }}>
                              ×{groupSize}
                            </span>
                          )}
                        </span>
                      </td>
                      {(() => {
                        const tdBase = { padding: "12px 22px" };
                        const cellStyle = (_id, base) => base;
                        const duration = (() => {
                          const entry = t.entryTime || t.entry_time;
                          const exit = t.exitTime || t.exit_time;
                          if (!entry || !exit) return "—";
                          const toSec = (v) => {
                            const m = String(v).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                            if (!m) return null;
                            return (+m[1])*3600 + (+m[2])*60 + (+(m[3]||0));
                          };
                          const s1 = toSec(entry); const s2 = toSec(exit);
                          if (s1 === null || s2 === null) return "—";
                          let sec = s2 - s1;
                          if (sec < 0) sec += 24*3600;
                          if (Number.isNaN(sec)) return "—";
                          if (sec < 60) return `${sec}s`;
                          if (sec < 3600) return `${Math.floor(sec/60)}m`;
                          const h = Math.floor(sec/3600);
                          const mm = Math.floor((sec%3600)/60);
                          return mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2,"0")}`;
                        })();
                        // Helpers pour les nouvelles colonnes
                        // Pour un parent de groupe : on somme les frais/net des enfants.
                        const fees = t._groupFees != null ? t._groupFees : feesOf(t);
                        const netPnl = t._groupNet != null ? t._groupNet : netPnlOf(t);
                        const tk = tradeKey(t);
                        // Clés d'indexation communes au panneau de détail (notes + stratégies).
                        const idxKeys = indexKeysOf(t);
                        // Stratégie : le panneau stocke un TABLEAU d'ids de stratégies, réparti sur
                        // plusieurs clés. On fait l'union puis on affiche les noms correspondants.
                        const stratIds = Array.from(new Set(idxKeys.flatMap(k => tradeStrategies[k] || [])));
                        const stratNames = stratIds
                          .map(id => (strategies.find(x => x.id === id) || loadedStrategies.find(x => x.id === id))?.name)
                          .filter(Boolean);
                        const sessionLabel = (() => {
                          const v = t.entryTime || t.entry_time || "";
                          const m = String(v).match(/(\d{1,2}):/);
                          if (!m) return "—";
                          const h = +m[1];
                          if (h < 8) return "Asia";
                          if (h < 13) return "London";
                          if (h < 22) return "NY";
                          return "Asia";
                        })();
                        const weekdayLabel = (() => {
                          const d = new Date(t.date);
                          if (isNaN(d.getTime())) return "—";
                          return d.toLocaleDateString("fr-FR", { weekday: "short" });
                        })();

                        const cells = {
                          asset:     <td key="asset" style={cellStyle("asset",{...tdBase,color:T.textSub})}>Future</td>,
                          side:      <td key="side" style={cellStyle("side",{...tdBase,fontWeight:500,color:T.text,fontSize:13})}>{t.direction}</td>,
                          entryDate: <td key="entryDate" style={cellStyle("entryDate",{...tdBase,color:T.textSub})}>{openDate}</td>,
                          entryTime: <td key="entryTime" style={cellStyle("entryTime",{...tdBase,color:T.textSub,fontSize:12})}>{openTime}</td>,
                          entry:     <td key="entry" style={cellStyle("entry",{...tdBase,color:T.text,fontFamily:"var(--font-sans)",fontSize:13})}>${t.entry.toFixed(2)}</td>,
                          exitDate:  <td key="exitDate" style={cellStyle("exitDate",{...tdBase,color:T.textSub})}>{closeDate}</td>,
                          exitTime:  <td key="exitTime" style={cellStyle("exitTime",{...tdBase,color:T.textSub,fontSize:12})}>{closeTime}</td>,
                          exit:      <td key="exit" style={cellStyle("exit",{...tdBase,color:T.text,fontFamily:"var(--font-sans)",fontSize:13})}>${t.exit.toFixed(2)}</td>,
                          lots:      <td key="lots" style={cellStyle("lots",{...tdBase,color:T.textSub})}>{(() => { const q = t._groupQty != null && t._groupQty > 0 ? t._groupQty : qtyOf(t); return q != null ? q : "—"; })()}</td>,
                          volume:    <td key="volume" style={cellStyle("volume",{...tdBase,color:T.textSub})}>{(() => { const v = t._groupVolume != null && t._groupVolume > 0 ? t._groupVolume : volOf(t); return v != null ? fmt(v, false) : "—"; })()}</td>,
                          pnl:       (() => { const p = t._groupPnl != null ? t._groupPnl : t.pnl; return <td key="pnl" style={cellStyle("pnl",{...tdBase,fontWeight:600,color:p>=0?T.green:T.red,fontFamily:"var(--font-sans)"})}>{p>=0?"+":""}{fmt(p,false)}</td>; })(),
                          pnlPct:    <td key="pnlPct" style={cellStyle("pnlPct",{...tdBase,fontWeight:600,color:rowNet>=0?T.green:T.red,fontFamily:"var(--font-sans)"})}>{ret>0?"+":""}{ret}%</td>,
                          r:         <td key="r" style={cellStyle("r",{...tdBase,fontWeight:600,color:rowNet>=0?T.green:T.red,fontFamily:"var(--font-sans)",fontSize:12,whiteSpace:"nowrap"})}>{fmtR(rMultiple({...t, pnl: rowNet}))}</td>,
                          duration:  <td key="duration" style={cellStyle("duration",{...tdBase,color:T.textSub,fontSize:12})}>{duration}</td>,
                          // Nouvelles cellules
                          fees:      <td key="fees" style={cellStyle("fees",{...tdBase,color:T.textSub,fontFamily:"var(--font-sans)",fontSize:12})}>{fees > 0 ? `$${fees.toFixed(2)}` : "—"}</td>,
                          netPnl:    <td key="netPnl" style={cellStyle("netPnl",{...tdBase,fontWeight:600,color:netPnl>=0?T.green:T.red,fontFamily:"var(--font-sans)"})}>{netPnl>=0?"+":""}{fmt(netPnl,false)}</td>,
                          strategy:  <td key="strategy" style={cellStyle("strategy",{...tdBase,color:T.textSub,fontSize:12,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"})}>{stratNames.length ? stratNames.join(", ") : "—"}</td>,
                          session:   <td key="session" style={cellStyle("session",{...tdBase,color:T.textSub,fontSize:12})}>{sessionLabel}</td>,
                          weekday:   <td key="weekday" style={cellStyle("weekday",{...tdBase,color:T.textSub,fontSize:12,textTransform:"capitalize"})}>{weekdayLabel}</td>,
                        };
                        return columnOrder.filter(id => visibleColumns.includes(id)).map(id => cells[id] || null);
                      })()}
                      {/* Cellule vide pour aligner avec le header settings */}
                      <td style={{padding:"12px 8px",width:32}} />
                    </tr>
                  );
                });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT - DETAIL PANEL WITH TABS.
            Mobile : rendu via un portal (plein écran) pour échapper au bloc englobant
            créé par l'animation .anim-1 (transform résiduel), sinon le fixed serait confiné. */}
        {selectedTrade && (() => {
          const panel = (
          <div className="tr4de-trade-side" style={{width:360,maxHeight:"calc(100vh - 200px)",background:T.white,border:`1px solid ${T.border}`,borderRadius:12,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            
            {/* HEADER WITH TABS */}
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:"var(--font-sans)"}}>Trade info</span>
              </div>
              <button onClick={()=>setSelectedTrade(null)} aria-label={t("trades.detail.close")} style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMut,padding:4,display:"inline-flex",alignItems:"center"}}>
                <LucideX size={16} strokeWidth={2} />
              </button>
            </div>

            {/* TRADE HEADER INFO */}

            {/* SCROLL CONTENT */}
            <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
              
              {/* INFOS */}
              {(() => {
                const tId = selectedTrade.id;
                const dirRaw = String(selectedTrade.direction || "").toUpperCase();
                const isLong = dirRaw.includes("LONG") || dirRaw === "BUY";
                const entryTime = selectedTrade.entryTime || selectedTrade.entry_time || "";
                const exitTime = selectedTrade.exitTime || selectedTrade.exit_time || "";
                const rVal = rMultiple({ ...selectedTrade, pnl: netPnlOf(selectedTrade) });
                const fmtDate = (d) => { if (!d) return "—"; const dt = new Date(d); return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); };
                const pnlVal = Number(selectedTrade.pnl) || 0; // déjà net de frais
                const pnlColor = pnlVal >= 0 ? T.green : T.red;
                const dateTime = fmtDate(selectedTrade.date);
                const timeStats = [
                  { label: "Heure d'entrée", value: entryTime || "—" },
                  { label: "Heure de sortie", value: exitTime || "—" },
                ];
                const tradeNote = computeTradeNote(selectedTrade);
                const insetSep = { borderBottom: `1px solid ${T.border}` };
                return (
                <>
                  {/* HERO — données automatiques (P&L mis en avant) */}
                  <div style={{order:-2,padding:"18px 16px 20px", ...insetSep}}>
                    {/* Symbole · sens · horodatage */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                      <span style={{fontSize:16,fontWeight:700,color:T.text,letterSpacing:0.2}}>{selectedTrade.symbol || "—"}</span>
                      <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:isLong?`${T.green}14`:`${T.red}14`,color:isLong?T.green:T.red}}>
                        {isLong ? <LucideTrendingUp size={11} strokeWidth={2.25}/> : <LucideArrowDown size={11} strokeWidth={2.25}/>}
                        {isLong ? "Long" : "Short"}
                      </span>
                      <span style={{marginLeft:"auto",fontSize:12,color:T.textMut,whiteSpace:"nowrap"}}>{dateTime}</span>
                    </div>
                    {/* P&L héro + R-multiple */}
                    <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                      <span style={{fontSize:30,fontWeight:700,letterSpacing:-0.4,color:pnlColor,lineHeight:1}}>{pnlVal>=0?"+":""}{fmt(pnlVal,true)}</span>
                      {rVal != null && Number.isFinite(rVal) && (
                        <span style={{fontSize:14,fontWeight:600,color:rVal>=0?T.green:T.red,letterSpacing:-0.1}}>{fmtR(rVal)}</span>
                      )}
                    </div>
                    {/* Heures d'entrée / sortie + note du trade */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:"14px 16px",marginTop:18,alignItems:"start"}}>
                      {timeStats.map((s)=>(
                        <div key={s.label}>
                          <div style={{fontSize:11,color:T.textMut,marginBottom:3}}>{s.label}</div>
                          <div style={{fontSize:13,fontWeight:600,color:T.text}}>{s.value}</div>
                        </div>
                      ))}
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:11,color:T.textMut,marginBottom:3}}>Note</div>
                        <div style={{fontSize:13,fontWeight:700,color:tradeNote?tradeNote.color:T.textMut}}>{tradeNote ? `${tradeNote.score}/10` : "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* RÈGLE RESPECTÉE (manuel) */}
                  <div style={{padding:"16px 16px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:0.5}}>Règle respectée</div>
                    <button type="button" onClick={()=>setAddingRule(true)} aria-label="Ajouter une règle"
                      style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMut,padding:2,display:"inline-flex",alignItems:"center",borderRadius:6,transition:"color .12s ease"}}
                      onMouseEnter={(e)=>{e.currentTarget.style.color=T.text}}
                      onMouseLeave={(e)=>{e.currentTarget.style.color=T.textMut}}>
                      <LucidePlus size={15} strokeWidth={2} />
                    </button>
                  </div>
                  {/* CHECKLIST OUI/NON (remplace direction + horaires) */}
                  {checklistQuestions.map((q) => {
                    const ans = (tradeChecklist[selectedTrade.id] || {})[q.id];
                    return (
                      <div key={q.id}
                        draggable={editingRuleId !== q.id}
                        onDragStart={()=>setDragRuleId(q.id)}
                        onDragOver={(e)=>{ e.preventDefault(); }}
                        onDrop={(e)=>{ e.preventDefault(); moveRule(dragRuleId, q.id); setDragRuleId(null); }}
                        onDragEnd={()=>setDragRuleId(null)}
                        onMouseEnter={()=>setHoveredRuleId(q.id)}
                        onMouseLeave={()=>setHoveredRuleId(prev=>prev===q.id?null:prev)}
                        style={{position:"relative",padding:"10px 16px 10px 26px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,fontFamily:"var(--font-sans)",opacity:dragRuleId===q.id?0.4:1,background:dragRuleId===q.id?T.accentBg:"transparent"}}>
                        {hoveredRuleId === q.id && editingRuleId !== q.id && (
                          <div aria-hidden style={{position:"absolute",left:6,top:0,bottom:0,display:"flex",alignItems:"center",color:T.textMut,cursor:"grab"}}>
                            <LucideGripVertical size={14} strokeWidth={2} />
                          </div>
                        )}
                        {editingRuleId === q.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={editRuleText}
                            onChange={(e)=>setEditRuleText(e.target.value)}
                            onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); updateCustomRule(q.id, editRuleText); setEditingRuleId(null); } if(e.key==="Escape"){ setEditingRuleId(null); } }}
                            onBlur={()=>{ updateCustomRule(q.id, editRuleText); setEditingRuleId(null); }}
                            style={{flex:1,minWidth:0,border:"none",background:"transparent",outline:"none",padding:0,fontSize:13,fontWeight:500,fontFamily:"var(--font-sans)",color:T.text}}
                          />
                        ) : (
                          <div style={{fontSize:13,fontWeight:500,color:T.text}}>{q.label}</div>
                        )}
                        <div style={{display:"flex",alignItems:"center",flexShrink:0,position:"relative"}}>
                          {hoveredRuleId === q.id && editingRuleId !== q.id && (
                            <div style={{position:"absolute",right:"100%",marginRight:8,display:"flex",alignItems:"center",gap:8}}>
                              <button type="button" onClick={()=>{ setEditingRuleId(q.id); setEditRuleText(q.label); }} aria-label="Modifier la règle"
                                style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMut,padding:0,display:"inline-flex",alignItems:"center"}}
                                onMouseEnter={(e)=>{e.currentTarget.style.color=T.text}}
                                onMouseLeave={(e)=>{e.currentTarget.style.color=T.textMut}}>
                                <LucidePencil size={13} strokeWidth={2} />
                              </button>
                              <button type="button" onClick={()=>removeCustomRule(q.id)} aria-label="Supprimer la règle"
                                style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMut,padding:0,display:"inline-flex",alignItems:"center"}}
                                onMouseEnter={(e)=>{e.currentTarget.style.color=T.red}}
                                onMouseLeave={(e)=>{e.currentTarget.style.color=T.textMut}}>
                                <LucideX size={13} strokeWidth={2} />
                              </button>
                            </div>
                          )}
                          <div style={{display:"flex",gap:2,padding:3,background:T.accentBg,borderRadius:999}}>
                            {[{v:"yes",label:"Oui",color:T.green},{v:"no",label:"Non",color:T.red}].map((opt)=>{
                              const active = ans === opt.v;
                              return (
                                <button key={opt.v} type="button" onClick={()=>setChecklistAnswer(selectedTrade,q.id,opt.v)}
                                  style={{
                                    padding:"5px 16px",borderRadius:999,border:"none",
                                    background:active?T.white:"transparent",
                                    color:active?opt.color:T.textMut,
                                    fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                                    boxShadow:active?"0 1px 2px rgba(0,0,0,0.08)":"none",
                                    transition:"color .15s ease, background .15s ease, box-shadow .15s ease",
                                  }}>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* AJOUTER UNE RÈGLE — champ affiché seulement au clic sur le + */}
                  {addingRule && (
                    <div style={{minHeight:31,padding:"10px 16px 10px 26px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8,fontFamily:"var(--font-sans)"}}>
                      <input
                        type="text"
                        autoFocus
                        value={newRuleText}
                        onChange={(e)=>setNewRuleText(e.target.value)}
                        onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); addCustomRule(newRuleText); setAddingRule(false); } if(e.key==="Escape"){ setNewRuleText(""); setAddingRule(false); } }}
                        onBlur={()=>{ if(newRuleText.trim()) addCustomRule(newRuleText); setAddingRule(false); }}
                        placeholder="Nouvelle règle"
                        style={{flex:1,border:"none",background:"transparent",outline:"none",padding:0,fontSize:13,fontFamily:"var(--font-sans)",color:T.text}}
                      />
                    </div>
                  )}

                  {/* UNITÉ DE TEMPS (timeframe d'analyse) — sélection unique, placée sous les règles */}
                  <div style={{padding:"16px 16px",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>Unité de temps</div>
                    <div style={{display:"flex",gap:2,padding:3,background:T.accentBg,borderRadius:999}}>
                      {TIMEFRAME_OPTIONS.map((opt)=>{
                        const active = (tradeTimeframe[selectedTrade.id] || "") === opt;
                        return (
                          <button key={opt} type="button" onClick={()=>setTimeframeFor(selectedTrade, opt)}
                            style={{
                              flex:1,padding:"6px 0",borderRadius:999,border:"none",
                              background:active?T.white:"transparent",
                              color:active?T.text:T.textMut,
                              fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                              boxShadow:active?"0 1px 2px rgba(0,0,0,0.08)":"none",
                              transition:"color .15s ease, background .15s ease, box-shadow .15s ease",
                            }}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* EMOTION TAGS — menu déroulant multi-sélection */}
                  <div style={{padding:"16px 16px",borderBottom:`1px solid ${T.border}`}} key={`emotion-${selectedTrade.date}-${selectedTrade.symbol}-${selectedTrade.entry}`}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{t("trades.detail.emotionTags")}</div>
                    <TagMultiSelect
                      placeholder={t("trades.detail.emotionTags")}
                      allTags={allEmotionTags}
                      selected={emotionTags[selectedTrade.id] || []}
                      onToggle={(id)=>toggleEmotion(selectedTrade, id)}
                    />
                  </div>


                  {/* SCREENSHOT — placé sous les tags d'erreurs */}
                  {(() => {
                    const tradeId = selectedTrade.id;
                    const url = screenshotUrls[tradeId];
                    const handleFile = async (file) => {
                      if (!file || !file.type?.startsWith("image/")) return;
                      setScreenshotBusy(true);
                      try { await uploadScreenshot(tradeId, file); }
                      finally { setScreenshotBusy(false); }
                    };
                    const extractImageFromClipboard = (e) => {
                      const items = e.clipboardData?.items;
                      if (!items) return null;
                      for (const it of items) {
                        if (it.kind === "file" && it.type?.startsWith("image/")) {
                          const f = it.getAsFile();
                          if (f) return f;
                        }
                      }
                      return null;
                    };
                    return (
                      <div style={{padding:"16px",borderBottom:`1px solid ${T.border}`}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:0.5}}>Screenshot</div>
                          {url && (
                            <div style={{display:"inline-flex",alignItems:"center",gap:4}}>
                              <label
                                style={{padding:"4px 8px",fontSize:11,fontWeight:500,color:T.text,background:"transparent",border:"none",cursor:screenshotBusy?"not-allowed":"pointer",fontFamily:"inherit"}}>
                                {t("trades.detail.modify")}
                                <input type="file" accept="image/*" disabled={screenshotBusy}
                                  onChange={async (e) => {
                                    const f = e.target.files?.[0]; if (!f) { return; }
                                    setScreenshotBusy(true);
                                    try { await removeScreenshot(tradeId); await uploadScreenshot(tradeId, f); }
                                    finally { setScreenshotBusy(false); e.target.value = ""; }
                                  }}
                                  style={{display:"none"}} />
                              </label>
                              <button type="button" onClick={async () => { setScreenshotBusy(true); try { await removeScreenshot(tradeId); } finally { setScreenshotBusy(false); } }}
                                disabled={screenshotBusy}
                                style={{padding:"4px 8px",fontSize:11,fontWeight:500,color:T.red,background:"transparent",border:"none",cursor:screenshotBusy?"not-allowed":"pointer",fontFamily:"inherit"}}>
                                {t("trades.detail.delete")}
                              </button>
                            </div>
                          )}
                        </div>
                        {url ? (
                          <button type="button" onClick={() => setLightboxUrl(url)}
                            style={{display:"block",width:"100%",padding:0,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden",background:T.bg,cursor:"zoom-in",fontFamily:"inherit"}}>
                            <img src={url} alt="Trade screenshot" style={{display:"block",width:"100%",maxHeight:320,objectFit:"contain",background:T.bg}} />
                          </button>
                        ) : (
                          <label
                            tabIndex={0}
                            onPaste={async (e) => {
                              const f = extractImageFromClipboard(e);
                              if (f) { e.preventDefault(); await handleFile(f); }
                            }}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = "#F0F0F0"; e.currentTarget.style.borderColor = T.text; }}
                            onDragLeave={(e) => { e.currentTarget.style.background = T.bg; e.currentTarget.style.borderColor = T.border; }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.currentTarget.style.background = T.bg;
                              e.currentTarget.style.borderColor = T.border;
                              const f = e.dataTransfer.files?.[0];
                              if (f) await handleFile(f);
                            }}
                            style={{
                              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,
                              padding:"28px 16px",border:`1.5px dashed ${T.border}`,borderRadius:12,
                              cursor:screenshotBusy?"not-allowed":"pointer",background:T.bg,
                              color:T.textMut,fontSize:12,fontWeight:500,
                              outline: "none",
                              transition:"background .12s ease, border-color .12s ease",
                            }}>
                            <span style={{width:40,height:40,borderRadius:"50%",background:T.accentBg,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                              <LucideImage size={18} strokeWidth={1.75} color={T.textSub} />
                            </span>
                            <span style={{fontSize:12,fontWeight:500,color:T.textSub}}>{screenshotBusy ? t("trades.detail.uploading") : t("trades.detail.dragImage")}</span>
                            <input type="file" accept="image/*" disabled={screenshotBusy}
                              onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; await handleFile(f); e.target.value = ""; }}
                              style={{display:"none"}} />
                          </label>
                        )}
                      </div>
                    );
                  })()}

                  {/* NOTES (manuel) */}
                  <div style={{padding:"16px 16px",display:"flex",flexDirection:"column"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>Notes</div>
                    <textarea
                      placeholder={t("trades.notePlaceholder")}
                      value={tradeNotes[noteKeyOf(selectedTrade)] ?? tradeNotes[selectedTrade.id] ?? ""}
                      onChange={(e)=>{
                        const key = noteKeyOf(selectedTrade);
                        if (!key) return;
                        const updated = {...tradeNotes, [key]: e.target.value};
                        setTradeNotes(updated);
                        localStorage.setItem("tr4de_trade_notes", JSON.stringify(updated));
                        persistNote(key, e.target.value);
                      }}
                      style={{
                        flex:1,
                        minHeight:100,
                        border:`1px solid ${T.border}`,
                        borderRadius:8,
                        padding:12,
                        fontSize:12,
                        fontFamily:"var(--font-sans)",
                        color:T.text,
                        background:T.bg,
                        resize:"none",
                        outline:"none"
                      }}
                    />
                  </div>
                </>
                );
              })()}

              {/* STRATÉGIE */}
              {(() => {
                const tradeId = selectedTrade.date + selectedTrade.symbol + selectedTrade.entry;
                // Toutes les clés sous lesquelles ce trade peut être indexé (l'import en crée 3) :
                // UUID Supabase, composite, composite normalisé. On les met TOUTES à jour pour
                // éviter qu'une stratégie reste fantôme via une clé non nettoyée.
                // Inclut les clés de TOUS les trades du groupe (si groupé) pour appliquer en bloc
                const allTrades = childrenOf(selectedTrade);
                const tradeKeys = Array.from(new Set(
                  allTrades.flatMap(tr => [
                    tr.id,
                    `${tr.date || ""}${tr.symbol || ""}${tr.entry ?? ""}`,
                    (tr.date && tr.symbol && tr.entry != null)
                      ? `${tr.date}${tr.symbol}${parseFloat(tr.entry).toFixed(2)}`
                      : null,
                  ]).filter(Boolean).map(String)
                ));
                // Source de vérité pour l'UI : union de toutes les stratégies trouvées sur n'importe quelle clé
                const selectedIds = Array.from(new Set(tradeKeys.flatMap(k => tradeStrategies[k] || [])));
                
                // Calculate total rules checked across all selected strategies
                const allSelectedStrats = loadedStrategies.filter(s => selectedIds.includes(s.id));
                const totalRulesCount = allSelectedStrats.reduce((sum, s) => sum + (s.groups?.flatMap(g => g.rules) || []).length, 0);
                const totalCheckedCount = allSelectedStrats.reduce((sum, s) => {
                  const rulesForStrat = (s.groups?.flatMap(g => g.rules) || []);
                  const checkedInStrat = rulesForStrat.filter(r => {
                    const key = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${s.id}_${r.id}`;
                    return checkedRules[key];
                  }).length;
                  return sum + checkedInStrat;
                }, 0);
                const progressPercent = totalRulesCount > 0 ? (totalCheckedCount / totalRulesCount) * 100 : 0;
                
                return (
                  <div style={{order:-1,padding:"16px",borderBottom:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMut,textTransform:"uppercase",letterSpacing:0.5}}>Stratégie</div>
                    {selectedIds.length === 0 ? (
                      <>
                        <div style={{position:"relative",width:"100%",display:"flex"}}>
                          <button
                            onClick={()=>setShowStrategyDropdown(!showStrategyDropdown)}
                            style={{
                              width:"100%",
                              padding:"8px 16px",
                              borderRadius:999,
                              border:`1px solid ${T.border}`,
                              background:T.white,
                              fontSize:13,
                              fontWeight:500,
                              color:T.text,
                              cursor:"pointer",
                              display:"flex",
                              alignItems:"center",
                              justifyContent:"center",
                              gap:6,
                              transition:"background .12s ease",
                              fontFamily:"var(--font-sans)",
                            }}
                            onMouseEnter={(e)=>{e.currentTarget.style.background=T.accentBg}}
                            onMouseLeave={(e)=>{e.currentTarget.style.background=T.white}}
                          >
                            <LucidePlus size={14} strokeWidth={2.25} />
                            {t("trades.detail.addStrategy")}
                          </button>
                          
                          {/* STRATEGY DROPDOWN */}
                          {showStrategyDropdown && (
                            <div style={{
                              position:"absolute",
                              top:"100%",
                              left:0,
                              right:0,
                              marginTop:8,
                              background:T.white,
                              border:`1px solid ${T.border}`,
                              borderRadius:8,
                              boxShadow:"0 4px 12px rgba(0,0,0,0.1)",
                              zIndex:100,
                              maxHeight:200,
                              overflowY:"auto"
                            }}>
                              {loadedStrategies.length === 0 ? (
                                <div style={{padding:12,textAlign:"center",fontSize:11,color:T.textSub}}>{t("trades.detail.noStrategy")}</div>
                              ) : (
                                loadedStrategies.map(strat=>{
                                  const isSelected = selectedIds.includes(strat.id);
                                  return (
                                    <button key={strat.id} onClick={()=>{
                                      // Mise à jour cohérente sur TOUTES les clés du trade
                                      const newTradeStrategies = {...tradeStrategies};
                                      tradeKeys.forEach(k => {
                                        const current = newTradeStrategies[k] || [];
                                        const updated = isSelected
                                          ? current.filter(id => id !== strat.id)
                                          : (current.includes(strat.id) ? current : [...current, strat.id]);
                                        newTradeStrategies[k] = updated;
                                      });
                                      setTradeStrategies(newTradeStrategies);
                                      setShowStrategyDropdown(false);
                                    }} style={{width:"100%",padding:"8px 12px",borderBottom:`1px solid ${T.border}`,background:isSelected?T.accentBg:T.white,border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
                                    <div style={{width:10,height:10,borderRadius:3,background:strat.color}}/>
                                    <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:T.text}}>{strat.name}</div><div style={{fontSize:9,color:T.textSub}}>{t("trades.detail.groupCount").replace("{n}", String(strat.groups?.length || 0))}</div></div>
                                    {isSelected && <span style={{fontSize:12}}>✓</span>}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}

                    {/* SELECTED STRATEGIES DETAILS */}
                    {(() => {
                      const selectedStrats = loadedStrategies.filter(s => selectedIds.includes(s.id));
                      return selectedStrats.length > 0 ? (
                        <div style={{width:"100%",display:"flex",flexDirection:"column"}}>
                          {selectedStrats.map((strat,idx)=>{
                            const allRules = strat.groups.flatMap(g=>g.rules);
                            const checkedCount = allRules.filter(r=>{
                              const key = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${strat.id}_${r.id}`;
                              return checkedRules[key];
                            }).length;
                            const stratProgressPercent = allRules.length > 0 ? (checkedCount / allRules.length) * 100 : 0;
                            return (
                              <div key={strat.id} style={{display:"flex",flexDirection:"column"}}>
                                <div style={{borderBottom:`1px solid ${T.border}`,paddingBottom:12}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                                    <div style={{width:12,height:12,borderRadius:3,background:strat.color}}/>
                                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{strat.name}</div>
                                    <div data-strat-menu style={{marginLeft:"auto",position:"relative"}}>
                                      <button
                                        onClick={(e)=>{e.stopPropagation();setOpenStratMenuId(openStratMenuId===strat.id?null:strat.id);}}
                                        aria-label="Options stratégie"
                                        style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMut,padding:4,display:"inline-flex",alignItems:"center",borderRadius:6,transition:"background .12s ease"}}
                                        onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}}
                                        onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
                                      >
                                        <LucideMoreHorizontal size={16} strokeWidth={2} />
                                      </button>
                                      {openStratMenuId === strat.id && (
                                        <div
                                          role="menu"
                                          style={{
                                            position:"absolute",
                                            top:"calc(100% + 4px)",
                                            right:0,
                                            background:"#FFFFFF",
                                            border:"1px solid #E5E5E5",
                                            borderRadius:8,
                                            boxShadow:"0 8px 24px rgba(0,0,0,0.10)",
                                            minWidth:180,
                                            padding:4,
                                            zIndex:50,
                                            fontFamily:"var(--font-sans)",
                                          }}
                                        >
                                          <button
                                            onClick={(e)=>{
                                              e.stopPropagation();
                                              // Retirer la stratégie courante puis ouvrir le sélecteur
                                              const newTradeStrategies = {...tradeStrategies};
                                              tradeKeys.forEach(k => {
                                                const current = newTradeStrategies[k] || [];
                                                newTradeStrategies[k] = current.filter(id => id !== strat.id);
                                              });
                                              setTradeStrategies(newTradeStrategies);
                                              localStorage.setItem("tr4de_trade_strategies", JSON.stringify(newTradeStrategies));
                                              setOpenStratMenuId(null);
                                              setShowStrategyDropdown(true);
                                            }}
                                            style={{
                                              display:"flex",alignItems:"center",gap:8,width:"100%",
                                              padding:"8px 10px",borderRadius:6,border:"none",
                                              background:"transparent",color:T.text,
                                              fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                                            }}
                                            onMouseEnter={(e)=>{e.currentTarget.style.background=T.accentBg}}
                                            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
                                          >
                                            <LucideRepeat size={14} strokeWidth={1.75} />
                                            Changer de stratégie
                                          </button>
                                          <button
                                            onClick={(e)=>{
                                              e.stopPropagation();
                                              // Retirer la stratégie de TOUTES les clés du trade
                                              const newTradeStrategies = {...tradeStrategies};
                                              tradeKeys.forEach(k => {
                                                const current = newTradeStrategies[k] || [];
                                                newTradeStrategies[k] = current.filter(id => id !== strat.id);
                                              });
                                              setTradeStrategies(newTradeStrategies);
                                              localStorage.setItem("tr4de_trade_strategies", JSON.stringify(newTradeStrategies));
                                              setOpenStratMenuId(null);
                                            }}
                                            style={{
                                              display:"flex",alignItems:"center",gap:8,width:"100%",
                                              padding:"8px 10px",borderRadius:6,border:"none",
                                              background:"transparent",color:"#EF4444",
                                              fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                                            }}
                                            onMouseEnter={(e)=>{e.currentTarget.style.background="#FEF2F2"}}
                                            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
                                          >
                                            <LucideTrash2 size={14} strokeWidth={1.75} />
                                            Enlever la stratégie
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {/* PROGRESS BAR */}
                                  <div style={{width:"100%",marginBottom:12}}>
                                    <div style={{fontSize:10,fontWeight:600,color:T.textMut,marginBottom:4}}>Règles suivies: {checkedCount}/{allRules.length}</div>
                                    <div style={{width:"100%",height:6,background:T.bg,borderRadius:3,overflow:"hidden"}}>
                                      <div style={{height:"100%",background:T.accent,width:`${stratProgressPercent}%`,transition:"width 0.3s ease"}}/>
                                    </div>
                                  </div>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                    <div/>
                                    <button style={{background:"transparent",border:"none",cursor:"pointer",fontSize:10,fontWeight:600,color:T.accent}}>TOUT DÉCOCHER</button>
                                  </div>
                                </div>

                                <div style={{paddingTop:12}}>
                                  {strat.groups.map(group=>(
                                    <div key={group.id} style={{marginBottom:14}}>
                                      <div style={{fontSize:11,fontWeight:600,color:T.text,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>{group.name}</div>
                                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                        {group.rules.map(rule=>{
                                          const ruleKey = `${selectedTrade.date}_${selectedTrade.symbol}_${selectedTrade.entry}_${selectedTrade.exit}_${selectedTrade.direction}_${strat.id}_${rule.id}`;
                                          const isChecked = checkedRules[ruleKey] || false;
                                          const rc = T.text;
                                          return (
                                            <button key={rule.id} type="button" onClick={()=>setCheckedRules({...checkedRules,[ruleKey]:!isChecked})}
                                              style={{
                                                display:"inline-flex",alignItems:"center",gap:7,
                                                padding:"6px 11px 6px 8px",borderRadius:999,border:"none",
                                                background:T.accentBg,
                                                cursor:"pointer",fontFamily:"inherit",
                                                transition:"background .12s ease",
                                              }}>
                                              <span style={{
                                                width:15,height:15,borderRadius:5,flexShrink:0,
                                                display:"inline-flex",alignItems:"center",justifyContent:"center",
                                                border:`1.5px solid ${isChecked?rc:T.border}`,
                                                background:isChecked?rc:T.white,
                                                transition:"border-color .12s ease, background .12s ease",
                                              }}>
                                                {isChecked && <LucideCheck size={11} strokeWidth={3} color="#fff" />}
                                              </span>
                                              <span style={{fontSize:12,fontWeight:isChecked?600:500,color:isChecked?T.text:T.textMut}}>{rule.text}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null;
                    })()}
                  </div>
                );
              })()}

            </div>

          </div>
          );
          return isMobile ? ReactDOM.createPortal(panel, document.body) : panel;
        })()}

      </div>

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteOpen && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          {...backdropDismiss(() => !isDeletingTrades && setConfirmDeleteOpen(false))}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)",padding:"24px"}}
        >
          <div
            onClick={(e)=>e.stopPropagation()}
            style={{background:"#FFFFFF",borderRadius:14,maxWidth:420,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,0.22)",border:"1px solid #E5E5E5",overflow:"hidden"}}
          >
            <div style={{padding:"20px 24px 8px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <LucideTrash2 size={16} strokeWidth={1.75} color="#EF4444"/>
              </div>
              <h3 style={{fontSize:15,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1}}>
                {t("trades.deleteConfirm").replace("{n}", String(selectedIds.size)).replace("{s}", selectedIds.size > 1 ? "s" : "")}
              </h3>
            </div>
            <div style={{padding:"4px 24px 20px",fontSize:13,color:"#5C5C5C",lineHeight:1.5}}>
              {t("trades.deleteWarning")}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #F0F0F0",background:"#FAFAFA"}}>
              <button
                onClick={()=>setConfirmDeleteOpen(false)}
                disabled={isDeletingTrades}
                style={{padding:"0 16px",height:36,borderRadius:8,border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#0D0D0D",fontSize:13,fontWeight:500,cursor:isDeletingTrades?"not-allowed":"pointer",fontFamily:"inherit",opacity:isDeletingTrades?0.5:1}}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async ()=>{
                  setIsDeletingTrades(true);
                  try {
                    const tradesToDelete = filteredTrades.filter(t => selectedIds.has(tradeKey(t)));
                    for (const t of tradesToDelete) {
                      if (onDeleteTrade) await onDeleteTrade(t);
                    }
                    setSelectedIds(new Set());
                  } catch (e) { console.error("delete trades failed:", e); }
                  finally {
                    setIsDeletingTrades(false);
                    setConfirmDeleteOpen(false);
                  }
                }}
                disabled={isDeletingTrades}
                style={{padding:"0 16px",height:36,borderRadius:8,border:"1px solid #EF4444",background:"#EF4444",color:"#FFFFFF",fontSize:13,fontWeight:600,cursor:isDeletingTrades?"not-allowed":"pointer",fontFamily:"inherit",opacity:isDeletingTrades?0.7:1}}
              >
                {isDeletingTrades ? t("trades.deleting") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* BOTTOM ACTION BAR (visible quand au moins 1 trade selectionne) */}
      {selectedIds.size > 0 && (
        <div style={{
          position:"fixed",
          bottom:24,
          left:"50%",
          transform:"translateX(-50%)",
          maxWidth:"calc(100vw - 24px)",
          background:"#FFFFFF",
          color:"#0D0D0D",
          borderRadius:12,
          padding:"10px 14px",
          display:"flex",
          alignItems:"center",
          flexWrap:"wrap",
          justifyContent:"center",
          gap:14,
          fontFamily:"var(--font-sans)",
          fontSize:13,
          border:"1px solid #E5E5E5",
          boxShadow:"0 12px 32px rgba(0,0,0,0.14)",
          zIndex:100,
        }}>
          <span style={{fontWeight:600}}>
            {t("trades.selected").replace("{n}", String(selectedIds.size)).replace(/\{s\}/g, selectedIds.size > 1 ? "s" : "")}
          </span>

          <span style={{width:1,height:18,background:"#E5E5E5"}} />

          {/* Ajouter une strategie */}
          <div style={{position:"relative"}}>
            <button
              onClick={() => setShowBulkStrategyDropdown(v => !v)}
              style={{background:"transparent",border:"none",color:"#0D0D0D",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",borderRadius:6,display:"inline-flex",alignItems:"center",gap:4}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
            >
              {t("trades.addStrategy")}
            </button>
            {showBulkStrategyDropdown && (
              <div style={{
                position:"absolute",
                bottom:"calc(100% + 6px)",
                left:0,
                background:"#FFFFFF",
                color:"#0D0D0D",
                border:"1px solid #E5E5E5",
                borderRadius:10,
                boxShadow:"0 8px 24px rgba(0,0,0,0.10)",
                minWidth:200,
                maxHeight:240,
                overflowY:"auto",
                padding:4,
              }}>
                {(loadedStrategies && loadedStrategies.length > 0) ? loadedStrategies.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const next = {...tradeStrategies};
                      selectedIds.forEach(id => { next[id] = s.id; });
                      setTradeStrategies(next);
                      localStorage.setItem("tr4de_trade_strategies", JSON.stringify(next));
                      setShowBulkStrategyDropdown(false);
                    }}
                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,color:"#0D0D0D",borderRadius:6,textAlign:"left"}}
                    onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0"}}
                    onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
                  >
                    <span style={{width:8,height:8,borderRadius:"50%",background:s.color||"#16A34A"}}/>
                    {s.name}
                  </button>
                )) : (
                  <div style={{padding:"10px 10px",fontSize:12,color:"#8E8E8E"}}>Aucune stratégie disponible</div>
                )}
              </div>
            )}
          </div>

          <span style={{width:1,height:18,background:"#E5E5E5"}} />

          <button
            onClick={() => setConfirmDeleteOpen(true)}
            style={{background:"transparent",border:"none",color:"#EF4444",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",borderRadius:6}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="#FEF2F2"}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}
          >
            Supprimer
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            aria-label="Tout désélectionner"
            style={{background:"transparent",border:"none",color:"#8E8E8E",fontSize:16,cursor:"pointer",fontFamily:"inherit",padding:"2px 6px",lineHeight:1}}
            onMouseEnter={(e)=>{e.currentTarget.style.color="#0D0D0D"}}
            onMouseLeave={(e)=>{e.currentTarget.style.color="#8E8E8E"}}
          >
            ×
          </button>
        </div>
      )}

      {lightboxUrl && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          {...backdropDismiss(() => setLightboxUrl(null))}
          style={{position:"fixed",top:0,left:0,right:0,bottom:0,width:"100vw",height:"100vh",background:"rgba(0,0,0,0.2)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <div onClick={(e)=>e.stopPropagation()} style={{position:"relative",display:"inline-block",lineHeight:0}}>
            <img src={lightboxUrl} alt="Trade screenshot"
              style={{display:"block",maxWidth:"70vw",maxHeight:"75vh",objectFit:"contain",borderRadius:8,boxShadow:"0 12px 48px rgba(0,0,0,0.4)"}} />
            <button type="button" aria-label="Fermer" onClick={()=>setLightboxUrl(null)}
              style={{position:"absolute",top:8,right:8,width:24,height:24,borderRadius:999,background:"rgba(0,0,0,0.55)",border:"none",color:"#fff",fontSize:14,lineHeight:1,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
              ×
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* Menu déroulant multi-sélection (émotions / erreurs) du panneau détail.
   Affiche les tags choisis en pastilles dans le déclencheur ; le menu liste
   tous les tags avec une case à cocher. Se ferme au clic en dehors. */
function TagMultiSelect({ placeholder, allTags, selected, onToggle }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const chosen = allTags.filter((tg) => selected.includes(tg.id));
  return (
    <div ref={ref} style={{ position: "relative", fontFamily: "var(--font-sans)" }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: `1px solid ${T.border}`, borderRadius: 999, background: T.white, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chosen.length === 0
            ? <span style={{ fontSize: 13, color: T.textMut }}>{placeholder}</span>
            : chosen.map((tg) => (
                <span key={tg.id} style={{ fontSize: 11, fontWeight: 600, color: tg.color, background: `${tg.color}1A`, border: `1px solid ${tg.color}55`, borderRadius: 999, padding: "2px 8px" }}>{tg.label}</span>
              ))}
        </div>
        <LucideChevronDown size={15} strokeWidth={2} color={T.textMut} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.14)", maxHeight: 260, overflowY: "auto" }}>
          {allTags.map((tg) => {
            const on = selected.includes(tg.id);
            return (
              <button key={tg.id} type="button" onClick={() => onToggle(tg.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "none", borderRadius: 8, background: on ? T.accentBg : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = T.bg || "#FAFAFA"; }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${on ? tg.color : T.border}`, background: on ? tg.color : T.white, color: "#fff", fontSize: 11, lineHeight: 1 }}>{on ? "✓" : ""}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: tg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: T.text }}>{tg.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

