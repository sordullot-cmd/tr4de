"use client";

import React, { useEffect, useMemo, useState } from "react";
import ApexChatNew from "@/components/ApexChatNew";
import { useAIReports, AIReport } from "@/lib/hooks/useAIReports";
import {
  MessageCircle,
  FileText,
  Brain,
  Dna,
  Plus,
  Search,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// Tokens charte OpenAI (alignes sur lib/design/tokens.ts)
const T = {
  bg: "#FFFFFF",
  panel: "#FAFAFA",
  panelHover: "#F0F0F0",
  border: "#E5E5E5",
  borderHover: "#D4D4D4",
  text: "#0D0D0D",
  textSub: "#5C5C5C",
  textMut: "#8E8E8E",
  accent: "#0D0D0D",      // primaire = noir
  accentSoft: "#F0F0F0",
  green: "#10A37F",
  red: "#EF4444",
  warn: "#F97316",
  info: "#A855F7",
};

interface AgentPanelProps {
  userId: string;
  trades: any[];
  strategies: any[];
  strategyStats: any[];
  journalNotes: any[];
  dailyNotes: Record<string, string>;
  accountInfo: any;
  weeklyStats: any[];
  monthlyStats: any[];
  disciplineSummary: any[];
  psychEvents: any[];
}

type TabId = "chat" | "reports" | "insights" | "profile";

export default function AgentPanel(props: AgentPanelProps) {
  const [tab, setTab] = useState<TabId>("chat");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", background: T.bg, fontFamily: "var(--font-sans)" }}>
      <TabsBar tab={tab} setTab={setTab} />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {tab === "chat" && (
          <ApexChatNew
            userId={props.userId}
            trades={props.trades}
            strategies={props.strategies}
            strategyStats={props.strategyStats}
            journalNotes={props.journalNotes}
            dailyNotes={props.dailyNotes}
            accountInfo={props.accountInfo}
            weeklyStats={props.weeklyStats}
            monthlyStats={props.monthlyStats}
            disciplineSummary={props.disciplineSummary}
            psychEvents={props.psychEvents}
          />
        )}
        {tab === "reports" && <ReportsPanel trades={props.trades} />}
        {tab === "insights" && <InsightsPanel trades={props.trades} />}
        {tab === "profile" && <ProfilePanel />}
      </div>
    </div>
  );
}

function TabsBar({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  const tabs = [
    { id: "chat" as TabId,     Icon: MessageCircle, label: "Chat" },
    { id: "reports" as TabId,  Icon: FileText,      label: "Rapports" },
    { id: "insights" as TabId, Icon: Brain,         label: "Pattern" },
    { id: "profile" as TabId,  Icon: Dna,           label: "Profil" },
  ];
  return (
    <div style={{ display: "flex", gap: 2, padding: "8px 20px 0", borderBottom: `1px solid ${T.border}`, background: T.bg, justifyContent: "center" }}>
      {tabs.map(({ id, Icon, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "10px 14px",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${active ? T.text : "transparent"}`,
              color: active ? T.text : T.textSub,
              fontWeight: active ? 600 : 500,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "color 120ms ease, border-color 120ms ease",
              marginBottom: -1,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.textSub; }}
          >
            <Icon size={15} strokeWidth={1.75} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function primaryBtnStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #0D0D0D",
    background: "#0D0D0D",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font-sans)",
    opacity: disabled ? 0.6 : 1,
    transition: "background 120ms ease",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function secondaryBtnStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #E5E5E5",
    background: "#FFFFFF",
    color: "#0D0D0D",
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font-sans)",
    opacity: disabled ? 0.6 : 1,
    transition: "background 120ms ease",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function ReportsPanel({ trades }: { trades: any[] }) {
  const { reports, loading, generating, status, clearStatus, generate, markRead, unreadCount } = useAIReports({ autoGenerate: true, trades });
  const [selected, setSelected] = useState<AIReport | null>(null);
  const [filter, setFilter] = useState<"all" | "daily" | "weekly">("all");

  useEffect(() => {
    if (status.kind === "success" || status.kind === "no_trades") {
      const t = setTimeout(clearStatus, 5000);
      return () => clearTimeout(t);
    }
  }, [status, clearStatus]);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter(r => r.report_type === filter);
  }, [reports, filter]);

  const handleSelect = (r: AIReport) => {
    setSelected(r);
    if (!r.is_read) markRead(r.id);
  };

  const handleGenerateToday = async () => {
    const today = new Date().toISOString().split("T")[0];
    const r = await generate("daily", today, true);
    if (r) setSelected(r);
  };

  const handleGenerateThisWeek = async () => {
    const today = new Date().toISOString().split("T")[0];
    const r = await generate("weekly", today, true);
    if (r) setSelected(r);
  };

  const statusBanner = status.kind !== "idle" ? (
    <div
      style={{
        padding: "10px 14px",
        marginBottom: 12,
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background:
          status.kind === "error" ? "#FEF2F2" :
          status.kind === "no_trades" ? "#FEF9C3" :
          status.kind === "success" ? "#DCFCE7" :
          "#E3ECFB",
        color:
          status.kind === "error" ? "#991B1B" :
          status.kind === "no_trades" ? "#854D0E" :
          status.kind === "success" ? "#166534" :
          T.accent,
        border: `1px solid ${
          status.kind === "error" ? "#FECACA" :
          status.kind === "no_trades" ? "#FDE68A" :
          status.kind === "success" ? "#BBF7D0" :
          "#B8CCEB"
        }`,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {status.kind === "error" ? <AlertTriangle size={14} strokeWidth={2} /> :
         status.kind === "no_trades" ? <Info size={14} strokeWidth={2} /> :
         status.kind === "success" ? <CheckCircle2 size={14} strokeWidth={2} /> :
         <Loader2 size={14} strokeWidth={2} className="anim-fade-in" style={{ animation: "spin 1s linear infinite" }} />}
      </span>
      <span style={{ flex: 1 }}>
        {status.kind === "generating" ? "Génération en cours..." : "message" in status ? status.message : ""}
      </span>
      <button
        onClick={clearStatus}
        style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, display: "inline-flex" }}
        aria-label="Fermer"
      ><X size={14} /></button>
    </div>
  ) : null;

  return (
    <div style={{ display: "flex", height: "100%", background: T.bg }}>
      {/* Liste */}
      <div style={{ width: 340, minWidth: 340, borderRight: `1px solid ${T.border}`, overflowY: "auto", padding: 16 }}>
        {statusBanner}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>
            Rapports {unreadCount > 0 && <span style={{ marginLeft: 6, padding: "2px 8px", borderRadius: 999, background: T.accent, color: "#fff", fontSize: 11 }}>{unreadCount}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {(["all", "daily", "weekly"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${filter === f ? T.accent : T.border}`,
                background: filter === f ? T.accent : "transparent",
                color: filter === f ? "#fff" : T.textSub,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {f === "all" ? "Tous" : f === "daily" ? "Jour" : "Semaine"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          <button
            onClick={handleGenerateToday}
            disabled={generating}
            style={{ ...secondaryBtnStyle(generating), justifyContent: "flex-start", width: "100%" }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.background = T.panelHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; }}
          >
            <Plus size={14} strokeWidth={2} />
            {generating ? "Génération..." : "Rapport du jour"}
          </button>
          <button
            onClick={handleGenerateThisWeek}
            disabled={generating}
            style={{ ...secondaryBtnStyle(generating), justifyContent: "flex-start", width: "100%" }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.background = T.panelHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; }}
          >
            <Plus size={14} strokeWidth={2} />
            {generating ? "Génération..." : "Rapport de la semaine"}
          </button>
        </div>

        {loading ? (
          <div style={{ color: T.textMut, fontSize: 13, padding: 12 }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: T.textMut, fontSize: 13, padding: 12, textAlign: "center" }}>
            Aucun rapport.<br />
            Ajoute des trades pour que l&apos;IA en génère.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(r => (
              <ReportCard key={r.id} report={r} selected={selected?.id === r.id} onClick={() => handleSelect(r)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: T.bg }}>
        {selected ? <ReportDetail report={selected} /> : (
          <div style={{ color: T.textMut, fontSize: 14, textAlign: "center", marginTop: 48 }}>
            Sélectionnez un rapport pour le consulter
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, selected, onClick }: { report: AIReport; selected: boolean; onClick: () => void }) {
  const pnl = Number(report.stats?.totalPnL || 0);
  const isProfitable = pnl > 0;
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 12,
        borderRadius: 10,
        border: `1px solid ${selected ? T.accent : T.border}`,
        background: selected ? "#EEF4FF" : T.bg,
        cursor: "pointer",
        fontFamily: "inherit",
        position: "relative",
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = T.borderHover; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = T.border; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ padding: "2px 8px", borderRadius: 999, background: report.report_type === "daily" ? "#E3ECFB" : "#F5EAE0", color: report.report_type === "daily" ? T.accent : "#9D8555", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
          {report.report_type === "daily" ? "Jour" : "Semaine"}
        </span>
        {!report.is_read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent }} />}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{report.title}</div>
      <div style={{ display: "flex", gap: 10, fontSize: 11, color: T.textSub }}>
        <span>{report.stats?.totalTrades || 0} trades</span>
        <span style={{ color: isProfitable ? T.green : pnl < 0 ? T.red : T.textSub, fontWeight: 600 }}>
          {pnl > 0 ? "+" : ""}{pnl.toFixed(2)}$
        </span>
        {report.stats?.winRate != null && <span>WR {report.stats.winRate.toFixed(0)}%</span>}
      </div>
    </button>
  );
}

function ReportDetail({ report }: { report: AIReport }) {
  const d = new Date(report.created_at);
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.textMut, marginBottom: 4 }}>
          Généré le {d.toLocaleString("fr-FR")}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>{report.title}</h2>
      </div>

      {report.stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 20 }}>
          <Stat label="Trades" value={String(report.stats.totalTrades || 0)} />
          <Stat label="Win Rate" value={`${(report.stats.winRate || 0).toFixed(1)}%`} />
          <Stat label="P&L" value={`${(report.stats.totalPnL || 0) > 0 ? "+" : ""}${(report.stats.totalPnL || 0).toFixed(2)}$`} positive={(report.stats.totalPnL || 0) > 0} negative={(report.stats.totalPnL || 0) < 0} />
          <Stat label="W/L" value={`${report.stats.wins || 0} / ${report.stats.losses || 0}`} />
        </div>
      )}

      <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${T.border}`, background: T.panel, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, color: T.text }}>
        {report.content}
      </div>
    </div>
  );
}

function Stat({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg }}>
      <div style={{ fontSize: 11, color: T.textMut, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: positive ? T.green : negative ? T.red : T.text }}>{value}</div>
    </div>
  );
}

interface AIPattern {
  id: string;
  pattern_type: string;
  pattern_data: any;
  occurrences: number;
  avg_pnl_impact: number | null;
  last_detected_at: string;
}

function InsightsPanel({ trades = [] }: { trades?: any[] }) {
  const [patterns, setPatterns] = useState<AIPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "no_trades" | "error"; message?: string }>({ kind: "idle" });
  const autoRanRef = React.useRef(false);

  const load = async (): Promise<{ list: AIPattern[]; ok: boolean; errMsg?: string }> => {
    try {
      const res = await fetch("/api/ai/patterns", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setPatterns([]);
        return { list: [], ok: false, errMsg: `Erreur ${res.status}: ${text.slice(0, 200) || "impossible de charger (migrations appliquees ?)"}` };
      }
      const data = await res.json();
      const list = data.patterns || [];
      setPatterns(list);
      return { list, ok: true };
    } catch (e: any) {
      console.error(e);
      return { list: [], ok: false, errMsg: e?.message || "Erreur reseau" };
    } finally {
      setLoading(false);
    }
  };

  const runAnalyze = async () => {
    setAnalyzing(true);
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/ai/patterns/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trades }),
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }

      if (!res.ok) {
        const hint = res.status === 500 ? " (verifie que les migrations 007-009 sont appliquees)" : "";
        setStatus({ kind: "error", message: `Erreur ${res.status}: ${data?.error || "serveur"}${hint}` });
        return;
      }

      const { list } = await load();
      if (list.length === 0) {
        setStatus({ kind: "no_trades", message: data?.message || "Aucun pattern detecte — ajoute plus de trades (minimum 60 derniers jours)" });
      } else {
        setStatus({ kind: "success", message: `${list.length} pattern${list.length > 1 ? "s" : ""} detecte${list.length > 1 ? "s" : ""}` });
      }
    } catch (e: any) {
      console.error(e);
      setStatus({ kind: "error", message: `Erreur reseau: ${e?.message || "inconnue"}` });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { list, ok, errMsg } = await load();
      if (!ok && errMsg) {
        setStatus({ kind: "error", message: errMsg });
        return;
      }
      if (!autoRanRef.current && list.length === 0 && (trades?.length || 0) > 0) {
        autoRanRef.current = true;
        await runAnalyze();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades?.length]);

  useEffect(() => {
    if (status.kind === "success" || status.kind === "no_trades") {
      const t = setTimeout(() => setStatus({ kind: "idle" }), 6000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const typeMeta = (t: string): { label: string; Icon: any } => {
    const map: Record<string, { label: string; Icon: any }> = {
      revenge_trading: { label: "Revenge trading", Icon: AlertTriangle },
      overtrading: { label: "Overtrading", Icon: AlertTriangle },
      losing_streak: { label: "Séries perdantes", Icon: AlertTriangle },
      best_setup: { label: "Meilleur setup", Icon: CheckCircle2 },
      worst_setup: { label: "Pire setup", Icon: AlertTriangle },
      best_hour: { label: "Meilleure heure", Icon: CheckCircle2 },
      worst_hour: { label: "Pire heure", Icon: AlertTriangle },
      emotion_impact: { label: "Impact émotionnel", Icon: Brain },
    };
    return map[t] || { label: t, Icon: Info };
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "24px 32px", background: T.bg, fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header style site */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, display: "inline-flex", alignItems: "center", gap: 4 }}>
              Pattern <span style={{ color: T.textMut, fontWeight: 500 }}>›</span>
            </h1>
            <p style={{ fontSize: 12, color: T.textMut, margin: "2px 0 0" }}>
              Comportements et tendances détectés automatiquement
            </p>
          </div>
          <button
            onClick={runAnalyze}
            disabled={analyzing}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E5E5",
              background: "#FFFFFF", color: T.text, fontSize: 13, fontWeight: 500,
              cursor: analyzing ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: analyzing ? 0.6 : 1, transition: "background 120ms ease",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={e => { if (!analyzing) e.currentTarget.style.background = "#FAFAFA"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; }}
          >
            {analyzing && <Loader2 size={13} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />}
            {analyzing ? "Analyse..." : "Analyser"}
          </button>
        </div>

        {/* Status banner discret */}
        {status.kind !== "idle" && (
          <div
            style={{
              padding: "8px 12px", marginBottom: 16, borderRadius: 8,
              fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 8,
              background: status.kind === "error" ? "#FEF2F2" : status.kind === "no_trades" ? "#FFF8E6" : "#F0FAF6",
              color: status.kind === "error" ? "#991B1B" : status.kind === "no_trades" ? "#854D0E" : "#166534",
              border: `1px solid ${status.kind === "error" ? "#FECACA" : status.kind === "no_trades" ? "#FCD79B" : "#A7E6CF"}`,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              {status.kind === "error" ? <AlertTriangle size={13} strokeWidth={2} /> :
               status.kind === "no_trades" ? <Info size={13} strokeWidth={2} /> :
               <CheckCircle2 size={13} strokeWidth={2} />}
            </span>
            <span style={{ flex: 1 }}>{status.message}</span>
            <button onClick={() => setStatus({ kind: "idle" })} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", padding: 0, display: "inline-flex" }}><X size={13} /></button>
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div style={{ color: T.textMut, padding: 16, fontSize: 12 }}>Chargement…</div>
        ) : patterns.length === 0 ? (
          // Empty state style site (icone ronde + texte + bouton)
          <div style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "#F5F5F5",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={20} strokeWidth={1.5} color="#5C5C5C" />
            </div>
            <div style={{ fontSize: 13, color: T.textSub, maxWidth: 320, lineHeight: 1.4 }}>
              Aucun pattern détecté pour l&apos;instant. Ajoute plus de trades, puis lance une analyse.
            </div>
          </div>
        ) : (
          // Liste de patterns en cartes propres
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {patterns.map(p => {
              const meta = typeMeta(p.pattern_type);
              const Icon = meta.Icon;
              const isPositive = p.avg_pnl_impact != null && p.avg_pnl_impact > 0;
              const isNegative = p.avg_pnl_impact != null && p.avg_pnl_impact < 0;
              const iconColor = isNegative ? T.red : isPositive ? T.green : T.textSub;
              const iconBg = isNegative ? "#FEF2F2" : isPositive ? "#E6F7F1" : "#F5F5F5";
              return (
                <div
                  key={p.id}
                  style={{
                    padding: 14, borderRadius: 10,
                    border: `1px solid ${T.border}`, background: "#FFFFFF",
                    display: "flex", gap: 12, alignItems: "flex-start",
                    transition: "border-color 120ms ease, box-shadow 120ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#D4D4D4"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
                >
                  {/* Icone ronde */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: iconBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon size={15} strokeWidth={1.75} color={iconColor} />
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: T.textMut, fontWeight: 500, marginBottom: 3 }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>
                      {p.pattern_data?.detail || p.pattern_data?.description || "—"}
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: 11, color: T.textMut, alignItems: "center" }}>
                      <span>{p.occurrences} occurrence{p.occurrences > 1 ? "s" : ""}</span>
                      {p.avg_pnl_impact != null && (
                        <>
                          <span>·</span>
                          <span style={{ color: isPositive ? T.green : isNegative ? T.red : T.textMut, fontWeight: 600 }}>
                            {p.avg_pnl_impact > 0 ? "+" : ""}{p.avg_pnl_impact.toFixed(2)}$
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface UserMemory {
  trading_style: string | null;
  recurring_errors: string[];
  strengths: string[];
  emotional_patterns: string[];
  goals: string[];
  coach_notes: string | null;
  last_updated_at: string | null;
  messages_processed: number;
}

function ProfilePanel() {
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserMemory | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error" | "info"; message?: string }>({ kind: "idle" });

  const load = async () => {
    try {
      const res = await fetch("/api/ai/memory", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setStatus({ kind: "error", message: `Erreur ${res.status}: ${text.slice(0, 200) || "migrations 010 appliquee ?"}` });
        return;
      }
      const data = await res.json();
      const m = normalizeMemory(data.memory);
      setMemory(m);
      setDraft(m);
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message || "Erreur reseau" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (status.kind === "success" || status.kind === "info") {
      const t = setTimeout(() => setStatus({ kind: "idle" }), 5000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const runUpdate = async () => {
    setUpdating(true);
    setStatus({ kind: "info", message: "Distillation en cours (peut prendre quelques secondes)..." });
    try {
      const res = await fetch("/api/ai/memory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: `Erreur ${res.status}: ${data?.error || "serveur"}` });
        return;
      }
      if (data.error === "no_conversations" || data.error === "no_messages") {
        setStatus({ kind: "info", message: "Pas encore de conversations a analyser. Discute avec le coach et reviens." });
        return;
      }
      const m = normalizeMemory(data.memory);
      setMemory(m);
      setDraft(m);
      setStatus({ kind: "success", message: `Profil mis a jour (${data.processed_messages || 0} messages analyses)` });
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message || "Erreur reseau" });
    } finally {
      setUpdating(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ai/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trading_style: draft.trading_style,
          recurring_errors: draft.recurring_errors,
          strengths: draft.strengths,
          emotional_patterns: draft.emotional_patterns,
          goals: draft.goals,
          coach_notes: draft.coach_notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: `Erreur ${res.status}: ${data?.error || "serveur"}` });
        return;
      }
      const m = normalizeMemory(data.memory);
      setMemory(m);
      setDraft(m);
      setEditing(false);
      setStatus({ kind: "success", message: "Profil enregistre" });
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message || "Erreur reseau" });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm("Reinitialiser entierement le profil ? L'IA repartira de zero.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ai/memory", { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        setStatus({ kind: "error", message: "Erreur lors de la reinitialisation" });
        return;
      }
      await load();
      setEditing(false);
      setStatus({ kind: "success", message: "Profil reinitialise" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: T.textMut, fontFamily: "var(--font-sans)" }}>Chargement du profil...</div>;
  if (!memory || !draft) return <div style={{ padding: 32, color: T.textMut, fontFamily: "var(--font-sans)" }}>Aucun profil disponible.</div>;

  const view = editing ? draft : memory;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "24px 32px", background: T.bg, fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Profil IA — ce que le coach sait de toi</h2>
            <p style={{ fontSize: 13, color: T.textSub, margin: "4px 0 0" }}>
              Distille a partir de tes conversations. Plus tu discutes, plus le profil s&apos;enrichit.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!editing ? (
              <>
                <button
                  onClick={runUpdate}
                  disabled={updating}
                  style={primaryBtnStyle(updating)}
                  onMouseEnter={e => { if (!updating) e.currentTarget.style.background = "#262626"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#0D0D0D"; }}
                >
                  {updating ? "Mise à jour..." : "Mettre à jour"}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  style={secondaryBtnStyle()}
                  onMouseEnter={e => { e.currentTarget.style.background = T.panelHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; }}
                >
                  Éditer
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={save}
                  disabled={saving}
                  style={primaryBtnStyle(saving)}
                  onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#262626"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#0D0D0D"; }}
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  onClick={() => { setDraft(memory); setEditing(false); }}
                  style={secondaryBtnStyle()}
                  onMouseEnter={e => { e.currentTarget.style.background = T.panelHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; }}
                >
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>

        {memory.last_updated_at && (
          <div style={{ fontSize: 11, color: T.textMut, marginBottom: 16 }}>
            Derniere mise a jour : {new Date(memory.last_updated_at).toLocaleString("fr-FR")} — {memory.messages_processed} messages analyses
          </div>
        )}

        {status.kind !== "idle" && (
          <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 10, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
            background: status.kind === "error" ? "#FEF2F2" : status.kind === "info" ? "#E3ECFB" : "#DCFCE7",
            color: status.kind === "error" ? "#991B1B" : status.kind === "info" ? T.accent : "#166534",
            border: `1px solid ${status.kind === "error" ? "#FECACA" : status.kind === "info" ? "#B8CCEB" : "#BBF7D0"}` }}>
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              {status.kind === "error" ? <AlertTriangle size={14} strokeWidth={2} /> :
               status.kind === "info" ? <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> :
               <CheckCircle2 size={14} strokeWidth={2} />}
            </span>
            <span style={{ flex: 1 }}>{status.message}</span>
            <button onClick={() => setStatus({ kind: "idle" })} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, display: "inline-flex" }}><X size={14} /></button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field
            label="Style de trading"
            kind="text"
            value={view.trading_style || ""}
            editing={editing}
            onChange={v => setDraft({ ...draft, trading_style: v as string })}
            placeholder="Pas encore renseigne"
            helper="1-2 phrases qui te decrivent (instruments, timeframe, approche)"
          />
          <Field
            label="Erreurs recurrentes"
            kind="list"
            value={view.recurring_errors}
            editing={editing}
            onChange={v => setDraft({ ...draft, recurring_errors: v as string[] })}
            placeholder="Ex: revenge trade apres une perte"
          />
          <Field
            label="Forces"
            kind="list"
            value={view.strengths}
            editing={editing}
            onChange={v => setDraft({ ...draft, strengths: v as string[] })}
            placeholder="Ex: discipline les lundis"
          />
          <Field
            label="Patterns emotionnels"
            kind="list"
            value={view.emotional_patterns}
            editing={editing}
            onChange={v => setDraft({ ...draft, emotional_patterns: v as string[] })}
            placeholder="Ex: FOMO en fin de journee"
          />
          <Field
            label="Objectifs"
            kind="list"
            value={view.goals}
            editing={editing}
            onChange={v => setDraft({ ...draft, goals: v as string[] })}
            placeholder="Ex: passer en funded 50k"
          />
          <Field
            label="Notes du coach"
            kind="textarea"
            value={view.coach_notes || ""}
            editing={editing}
            onChange={v => setDraft({ ...draft, coach_notes: v as string })}
            placeholder="Observations libres du coach"
            helper="Ce que le coach a remarque sur ta personnalite, ton etat d'esprit, ta sensibilite"
          />
        </div>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          <button
            onClick={reset}
            disabled={saving}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.red}`, background: "transparent", color: T.red, fontSize: 11, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            Reinitialiser le profil
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, kind, value, editing, onChange, placeholder, helper,
}: {
  label: string;
  kind: "text" | "textarea" | "list";
  value: string | string[];
  editing: boolean;
  onChange: (v: string | string[]) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        {helper && <div style={{ fontSize: 10, color: T.textMut }}>{helper}</div>}
      </div>

      {kind === "text" && (
        editing ? (
          <input
            type="text"
            value={value as string}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontSize: 14, color: T.text, fontFamily: "inherit", outline: "none" }}
          />
        ) : (
          <div style={{ fontSize: 14, color: value ? T.text : T.textMut, lineHeight: 1.5 }}>
            {value || placeholder}
          </div>
        )
      )}

      {kind === "textarea" && (
        editing ? (
          <textarea
            value={value as string}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontSize: 14, color: T.text, fontFamily: "inherit", outline: "none", resize: "vertical" }}
          />
        ) : (
          <div style={{ fontSize: 14, color: value ? T.text : T.textMut, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {value || placeholder}
          </div>
        )
      )}

      {kind === "list" && (
        <ListEditor
          items={value as string[]}
          editing={editing}
          onChange={onChange as (v: string[]) => void}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function ListEditor({ items, editing, onChange, placeholder }: { items: string[]; editing: boolean; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const safeItems = Array.isArray(items) ? items : [];

  if (!editing) {
    if (safeItems.length === 0) return <div style={{ fontSize: 14, color: T.textMut }}>Aucun element</div>;
    return (
      <ul style={{ margin: 0, paddingLeft: 16, listStyle: "disc", display: "flex", flexDirection: "column", gap: 4 }}>
        {safeItems.map((item, i) => (
          <li key={i} style={{ fontSize: 14, color: T.text, lineHeight: 1.5 }}>{item}</li>
        ))}
      </ul>
    );
  }

  const add = () => {
    const t = input.trim();
    if (!t) return;
    onChange([...safeItems, t]);
    setInput("");
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {safeItems.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              value={item}
              onChange={e => {
                const next = [...safeItems];
                next[i] = e.target.value;
                onChange(next);
              }}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }}
            />
            <button
              onClick={() => onChange(safeItems.filter((_, j) => j !== i))}
              style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.panel, color: T.red, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            >
              Suppr
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder || "Ajouter un element"}
          style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }}
        />
        <button
          onClick={add}
          style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.accent}`, background: T.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          + Ajouter
        </button>
      </div>
    </div>
  );
}

function normalizeMemory(raw: any): UserMemory {
  return {
    trading_style: raw?.trading_style || null,
    recurring_errors: Array.isArray(raw?.recurring_errors) ? raw.recurring_errors : [],
    strengths: Array.isArray(raw?.strengths) ? raw.strengths : [],
    emotional_patterns: Array.isArray(raw?.emotional_patterns) ? raw.emotional_patterns : [],
    goals: Array.isArray(raw?.goals) ? raw.goals : [],
    coach_notes: raw?.coach_notes || null,
    last_updated_at: raw?.last_updated_at || null,
    messages_processed: Number(raw?.messages_processed) || 0,
  };
}
