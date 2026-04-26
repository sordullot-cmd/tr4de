"use client";

import React, { useEffect, useState } from "react";
import {
  User as IconUser,
  Shield as IconShield,
  CreditCard as IconCard,
  Settings as IconSettings,
  Briefcase as IconBriefcase,
  Target as IconTarget,
  DollarSign as IconDollar,
  GitBranch as IconBranch,
  Globe as IconGlobe,
  Tag as IconTag,
  FileText as IconFile,
  Bell as IconBell,
  ExternalLink,
  Sparkles,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { getLang, setLang as setLangPref, t, useLang } from "@/lib/i18n";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { DEFAULT_ALERT_SETTINGS } from "@/lib/hooks/useTradeAlerts";

const T = {
  white: "#FFFFFF",
  bg: "#FFFFFF",
  panel: "#FAFAFA",
  border: "#E5E5E5",
  borderHover: "#D4D4D4",
  text: "#0D0D0D",
  textSub: "#5C5C5C",
  textMut: "#8E8E8E",
  green: "#16A34A",
  red: "#EF4444",
};

const SECTIONS = [
  {
    label: "Utilisateur",
    items: [
      { id: "profile",      label: "Profil",      Icon: IconUser },
      { id: "security",     label: "Sécurité",    Icon: IconShield },
      { id: "subscription", label: "Abonnement",  Icon: IconCard },
    ],
  },
  {
    label: "Général",
    items: [
      { id: "accounts",     label: "Comptes",            Icon: IconBriefcase },
      { id: "globals",      label: "Paramètres globaux", Icon: IconGlobe },
      { id: "alerts",       label: "Alertes",            Icon: IconBell },
      { id: "import",       label: "Historique d'import", Icon: IconFile },
    ],
  },
];

export default function SettingsPage({ user, onBack }) {
  const [active, setActive] = useState("profile");

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1 }}>Paramètres</h1>
        <p style={{ fontSize: 13, color: T.textSub, margin: "4px 0 0" }}>Gérez votre compte et vos préférences</p>
      </div>

      <div className="tr4de-settings-grid" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "start" }}>
        {/* Left nav */}
        <SettingsNav active={active} setActive={setActive} />

        {/* Right content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {active === "profile"      && <ProfileSection user={user} />}
          {active === "security"     && <SecuritySection />}
          {active === "subscription" && <SubscriptionSection user={user} />}
          {active === "accounts"     && <AccountsSection />}
          {active === "globals"      && <GlobalsSection />}
          {active === "alerts"       && <AlertsSection />}
          {active === "import"       && <ImportHistorySection />}

          <FooterHelp />
        </div>
      </div>
    </div>
  );
}

function SettingsNav({ active, setActive }) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 16 }}>
      {SECTIONS.map((sec, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{
            padding: "8px 10px 4px", fontSize: 10, fontWeight: 600,
            color: T.textMut, letterSpacing: 0.5, textTransform: "uppercase",
          }}>
            {sec.label}
          </div>
          {sec.items.map(item => {
            const Icon = item.Icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                style={{
                  width: "100%", display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 8, border: "none",
                  background: isActive ? "#0D0D0D" : "transparent",
                  color: isActive ? "#FFFFFF" : T.text,
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F5F5F5"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={14} strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Card({ children, padded = true }) {
  return (
    <div style={{
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: padded ? 20 : 0,
      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: T.textMut, margin: "2px 0 0" }}>{subtitle}</p>}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        border: "1px solid #0D0D0D",
        background: "#0D0D0D",
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.6 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "background 120ms ease",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "#262626"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#0D0D0D"; }}
    >
      {Icon && <Icon size={14} strokeWidth={2} />}
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        background: T.bg,
        color: T.text,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "background 120ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#FAFAFA"; }}
      onMouseLeave={e => { e.currentTarget.style.background = T.bg; }}
    >
      {Icon && <Icon size={14} strokeWidth={1.75} />}
      {children}
    </button>
  );
}

function ComingSoonBadge() {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 999, background: "#F0F0F0",
      color: T.textSub, fontSize: 10, fontWeight: 500, marginLeft: 8,
    }}>
      Bientôt
    </span>
  );
}

/* =================== PROFILE =================== */
function ProfileSection({ user }) {
  const supabase = createClient();
  const meta = user?.user_metadata || {};
  const fullNameSrc = meta.full_name || meta.name || "";
  const initialFirst = meta.first_name || meta.given_name || (fullNameSrc?.split(" ")[0]) || "";
  const initialLast = meta.last_name || meta.family_name || (fullNameSrc?.split(" ").slice(1).join(" ")) || "";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);

  // Auto-save Google-provided names into first_name/last_name on first load
  // so they persist for future sessions and sync to other metadata consumers.
  useEffect(() => {
    if (!user) return;
    const needsBackfill =
      (!meta.first_name && (meta.given_name || fullNameSrc)) ||
      (!meta.last_name && (meta.family_name || fullNameSrc));
    if (!needsBackfill) return;
    const full = [initialFirst, initialLast].filter(Boolean).join(" ") || fullNameSrc;
    supabase.auth.updateUser({
      data: { first_name: initialFirst, last_name: initialLast, full_name: full },
    }).catch((e) => console.error("backfill names failed:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== "undefined") {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "Europe/Paris"; }
    }
    return "Europe/Paris";
  });
  const [now, setNow] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const initials = (firstName?.[0] || user?.email?.[0] || "U").toUpperCase() + (lastName?.[0] || "").toUpperCase();
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || (user?.email?.split("@")[0] || "Utilisateur");
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const tzAbbr = (() => {
    try {
      const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, timeZoneName: "short" }).formatToParts(now);
      return parts.find(p => p.type === "timeZoneName")?.value || timezone;
    } catch { return timezone; }
  })();

  const onSave = async () => {
    setSaving(true);
    setSavedMsg("");
    try {
      await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName, full_name: fullName } });
      setSavedMsg("Modifications enregistrées");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Bloc 1 : identite */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "#F0F0F0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 600, color: T.text, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{fullName}</div>
            <div style={{ fontSize: 13, color: T.textMut, marginTop: 2 }}>{user?.email}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12, color: T.textSub }}>
              <IconGlobe size={13} strokeWidth={1.75} />
              <span>{tzAbbr}</span>
              <span style={{ color: T.textMut, marginLeft: 6 }}>{timeStr}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Bloc 2 : informations personnelles */}
      <Card>
        <CardHeader title="Informations personnelles" subtitle="Mettez à jour vos informations" />
        <div style={{ height: 1, background: T.border, margin: "0 -20px 16px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Prénom">
            <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle()} />
          </Field>
          <Field label="Nom">
            <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle()} />
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Adresse e-mail">
              <input value={user?.email || ""} disabled placeholder="email@exemple.com" style={{ ...inputStyle(), background: "#FAFAFA", color: T.textSub, cursor: "not-allowed" }} />
              <div style={{ fontSize: 11, color: T.textMut, marginTop: 4 }}>L&apos;adresse e-mail ne peut pas être modifiée</div>
            </Field>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18, alignItems: "center", gap: 12 }}>
          {savedMsg && <span style={{ fontSize: 12, color: T.green }}>{savedMsg}</span>}
          <PrimaryButton onClick={onSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </PrimaryButton>
        </div>
      </Card>
    </>
  );
}

/* =================== SECURITY =================== */
function SecuritySection() {
  return (
    <Card>
      <CardHeader title="Sécurité" subtitle="Gérez la sécurité de votre compte" />
      <div style={{ height: 1, background: T.border, margin: "0 -20px 0" }} />

      <SecurityRow
        Icon={IconShield}
        title="Mot de passe"
        description="Connexion via Google. Mot de passe géré par Google."
        action={<SecondaryButton icon={ExternalLink}>Gérer</SecondaryButton>}
      />
      <SecurityRow
        Icon={Sparkles}
        title="Authentification à deux facteurs"
        badge={<ComingSoonBadge />}
        description="Ajoutez une couche de sécurité supplémentaire à votre compte"
        action={<SecondaryButton>Activer</SecondaryButton>}
      />
      <SecurityRow
        Icon={IconGlobe}
        title="Sessions actives"
        badge={<ComingSoonBadge />}
        description="Gérez vos sessions actives sur tous vos appareils"
        action={<SecondaryButton>Voir tout</SecondaryButton>}
        last
      />
    </Card>
  );
}

function SecurityRow({ Icon, title, description, badge, action, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "16px 0",
      borderBottom: last ? "none" : `1px solid ${T.border}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: "#F5F5F5",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={16} strokeWidth={1.75} color={T.text} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 600, color: T.text }}>
          {title}{badge}
        </div>
        <div style={{ fontSize: 12, color: T.textMut, marginTop: 2 }}>{description}</div>
      </div>
      {action}
    </div>
  );
}

/* =================== SUBSCRIPTION =================== */
function SubscriptionSection({ user }) {
  const memberSince = (() => {
    if (!user?.created_at) return "—";
    return new Date(user.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  })();
  const accountId = user?.id ? `${user.id.slice(0, 8)}...` : "—";

  return (
    <>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>Plan actuel</h2>
          <PrimaryButton icon={Sparkles}>Passer Pro</PrimaryButton>
        </div>
        <div style={{
          padding: 16, borderRadius: 10, background: "#FAFAFA",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: T.bg,
            border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconCard size={16} strokeWidth={1.75} color={T.text} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Plan Gratuit</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 10, fontWeight: 500 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#EF4444" }} />
                Inactif
              </span>
            </div>
            <div style={{ fontSize: 12, color: T.textMut, marginTop: 2 }}>Passez à un plan supérieur pour débloquer toutes les fonctionnalités</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Informations du compte" />
        <div style={{ height: 1, background: T.border, margin: "0 -20px 4px" }} />
        <Row label="Membre depuis" value={memberSince} />
        <Row label="ID du compte" value={
          <span style={{ padding: "3px 8px", borderRadius: 6, background: "#F5F5F5", border: `1px solid ${T.border}`, fontSize: 11, fontFamily: "ui-monospace, monospace" }}>{accountId}</span>
        } last />
      </Card>
    </>
  );
}

function Row({ label, value, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0", borderBottom: last ? "none" : `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 13, color: T.textSub }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{value}</span>
    </div>
  );
}

/* =================== ACCOUNTS =================== */
function AccountsSection() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase.from("trading_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        setAccounts(data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  // count trades per account
  const [tradeCounts, setTradeCounts] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("apex_trades").select("account_id").eq("user_id", user.id);
        const counts = {};
        (data || []).forEach(r => { if (r.account_id) counts[r.account_id] = (counts[r.account_id] || 0) + 1; });
        setTradeCounts(counts);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const brokerLogo = (broker) => {
    if (!broker) return null;
    const k = String(broker).toLowerCase();
    if (k.includes("trado")) return "/trado.png";
    if (k.includes("mt5") || k.includes("meta")) return "/MetaTrader_5.png";
    if (k.includes("wealth")) return "/weal.webp";
    return null;
  };

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>Comptes de trading</h2>
          <p style={{ fontSize: 12, color: T.textMut, margin: "2px 0 0" }}>Gérez vos comptes de trading connectés</p>
        </div>
        <PrimaryButton>+ Ajouter un compte</PrimaryButton>
      </div>
      <div style={{ height: 1, background: T.border, margin: "0 -20px 0" }} />

      {loading ? (
        <div style={{ padding: 16, color: T.textMut, fontSize: 12 }}>Chargement...</div>
      ) : accounts.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: T.textMut, fontSize: 13 }}>Aucun compte connecté</div>
      ) : (
        accounts.map((acc, i) => {
          const logo = brokerLogo(acc.broker);
          const count = tradeCounts[acc.id] || 0;
          return (
            <div key={acc.id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
              borderBottom: i < accounts.length - 1 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: "#F5F5F5",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                overflow: "hidden",
              }}>
                {logo ? <img src={logo} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} /> : <IconBriefcase size={16} strokeWidth={1.75} color={T.text} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{acc.name}</div>
                <div style={{ fontSize: 12, color: T.textMut, marginTop: 2 }}>
                  {acc.broker ? acc.broker.charAt(0).toUpperCase() + acc.broker.slice(1) : "—"} · {count} trade{count !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          );
        })
      )}
    </Card>
  );
}

/* =================== GLOBAL SETTINGS =================== */
function GlobalsSection() {
  const { user } = useAuth();
  const supabase = createClient();
  const [timezone, setTimezone] = useState(() => {
    if (typeof window === "undefined") return "America/New_York";
    try {
      return localStorage.getItem("tr4de_timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch { return "America/New_York"; }
  });
  const [currency, setCurrency] = useState(() => {
    if (typeof window === "undefined") return "USD";
    return localStorage.getItem("tr4de_base_currency") || "USD";
  });
  const [lang, setLangState] = useState(() => (typeof window === "undefined" ? "fr" : getLang()));
  const [savedMsg, setSavedMsg] = useState("");
  const [loadedFromCloud, setLoadedFromCloud] = useState(false);

  // Charger depuis Supabase au montage (et sur focus)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("timezone, base_currency")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) {
          // Table ou colonnes manquantes → on log et on autorise quand même la sauvegarde
          // (l'upsert ultérieur aura aussi son propre log d'erreur si rien n'existe).
          console.warn("⚠️ load preferences error:", error.code, error.message);
        } else if (!cancelled) {
          if (data?.timezone) {
            setTimezone(data.timezone);
            try { localStorage.setItem("tr4de_timezone", data.timezone); } catch {}
          }
          if (data?.base_currency) {
            setCurrency(data.base_currency);
            try { localStorage.setItem("tr4de_base_currency", data.base_currency); } catch {}
          }
        }
      } catch (e) {
        console.error("⚠️ load preferences failed:", e?.message || e);
      } finally {
        if (!cancelled) setLoadedFromCloud(true);
      }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user?.id]);

  // Auto-save dans Supabase + localStorage à chaque changement (debounced 400ms).
  useEffect(() => {
    console.log("🔁 prefs effect:", { userId: user?.id, loadedFromCloud, timezone, currency });
    if (!user?.id) { console.warn("⏭ skip save: pas de user.id"); return; }
    if (!loadedFromCloud) { console.warn("⏭ skip save: pas encore loadedFromCloud"); return; }
    try {
      localStorage.setItem("tr4de_timezone", timezone);
      localStorage.setItem("tr4de_base_currency", currency);
      window.dispatchEvent(new Event("tr4de:prefs-changed"));
    } catch {}
    const handle = setTimeout(async () => {
      console.log("📤 upsert prefs:", { user_id: user.id, timezone, base_currency: currency });
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .upsert([{
            user_id: user.id,
            timezone,
            base_currency: currency,
            updated_at: new Date().toISOString(),
          }], { onConflict: "user_id" })
          .select();
        if (error) {
          console.error("❌ save preferences failed:", error.message, error.code, error.details);
          return;
        }
        console.log("✅ prefs sauvegardées en ligne:", data);
        setSavedMsg("Sauvegardé");
        setTimeout(() => setSavedMsg(""), 1500);
      } catch (e) { console.error("❌ save preferences error:", e); }
    }, 400);
    return () => clearTimeout(handle);
  }, [timezone, currency, user?.id, loadedFromCloud]);

  const onSave = () => {
    try {
      localStorage.setItem("tr4de_timezone", timezone);
      localStorage.setItem("tr4de_base_currency", currency);
      setSavedMsg("Préférences enregistrées");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (e) { console.error(e); }
  };

  const TIMEZONE_OPTIONS = [
    { id: "America/New_York",    label: "Eastern Time (ET) — New York" },
    { id: "America/Chicago",     label: "Central Time (CT) — Chicago" },
    { id: "America/Denver",      label: "Mountain Time (MT) — Denver" },
    { id: "America/Los_Angeles", label: "Pacific Time (PT) — Los Angeles" },
    { id: "Europe/Paris",        label: "Europe / Paris (CET/CEST)" },
    { id: "Europe/London",       label: "Europe / London (GMT/BST)" },
    { id: "Asia/Tokyo",          label: "Asia / Tokyo (JST)" },
  ];

  const CURRENCY_OPTIONS = [
    { id: "USD", label: "USD — Dollar américain" },
    { id: "EUR", label: "EUR — Euro" },
    { id: "GBP", label: "GBP — Livre sterling" },
    { id: "JPY", label: "JPY — Yen japonais" },
    { id: "CAD", label: "CAD — Dollar canadien" },
    { id: "CHF", label: "CHF — Franc suisse" },
  ];

  return (
    <Card>
      <CardHeader title="Affichage et données" subtitle="Configurez le fuseau horaire et la devise par défaut" />
      <div style={{ height: 1, background: T.border, margin: "0 -20px 16px" }} />

      <SectionLabel>Fuseau horaire</SectionLabel>
      <SearchableSelect
        value={timezone}
        onChange={setTimezone}
        options={TIMEZONE_OPTIONS}
        searchPlaceholder="Rechercher un fuseau horaire..."
      />
      <div style={{ fontSize: 11, color: T.textMut, marginTop: 4 }}>Utilisé pour l&apos;affichage des heures de trade et du calendrier</div>

      <SectionLabel mt={20}>Devise de base</SectionLabel>
      <SearchableSelect
        value={currency}
        onChange={setCurrency}
        options={CURRENCY_OPTIONS}
        searchable={false}
      />
      <div style={{ fontSize: 11, color: T.textMut, marginTop: 4 }}>Devise par défaut affichée dans toute l&apos;application</div>

      <SectionLabel mt={20}>Risque par trade (R)</SectionLabel>
      <input
        type="number"
        min={1}
        step={10}
        defaultValue={typeof window !== "undefined" ? (parseFloat(localStorage.getItem("tr4de_risk_per_trade") || "100") || 100) : 100}
        onChange={(e) => {
          const n = Math.max(1, parseFloat(e.target.value) || 0);
          try { localStorage.setItem("tr4de_risk_per_trade", String(n)); } catch {}
        }}
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: T.text, outline: "none", background: T.white }}
      />
      <div style={{ fontSize: 11, color: T.textMut, marginTop: 4 }}>Montant de risque par défaut. Sert à calculer le R-multiple (R = P&L / risque).</div>

      <SectionLabel mt={20}>Langue</SectionLabel>
      <SearchableSelect
        value={lang}
        onChange={(v) => { setLangState(v); setLangPref(v); }}
        options={[
          { id: "fr", label: "Français" },
          { id: "en", label: "English" },
        ]}
        searchable={false}
      />
      <div style={{ fontSize: 11, color: T.textMut, marginTop: 4 }}>Langue d&apos;affichage de l&apos;interface</div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
        {savedMsg && <span style={{ fontSize: 12, color: T.green }}>{savedMsg}</span>}
        <PrimaryButton onClick={onSave}>Enregistrer les modifications</PrimaryButton>
      </div>
    </Card>
  );
}

function SectionLabel({ children, mt }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: T.textMut, letterSpacing: 0.5,
      textTransform: "uppercase", marginBottom: 8, marginTop: mt || 0,
    }}>
      {children}
    </div>
  );
}

/* =================== IMPORT HISTORY =================== */
function ImportHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        // Recuperer un resume des trades par account_id (proxy d'imports)
        const { data: accounts } = await supabase.from("trading_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        const items = [];
        for (const acc of accounts || []) {
          const { count } = await supabase.from("apex_trades").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("account_id", acc.id);
          items.push({
            id: acc.id, name: "Orders.csv", account: acc.name, broker: acc.broker,
            count: count || 0, date: acc.created_at,
          });
        }
        setHistory(items);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <Card>
      <CardHeader title="Historique d'import" subtitle="Consultez et gérez vos imports passés" />
      <div style={{ height: 1, background: T.border, margin: "0 -20px 0" }} />

      {loading ? (
        <div style={{ padding: 16, color: T.textMut, fontSize: 12 }}>Chargement...</div>
      ) : history.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: T.textMut, fontSize: 13 }}>Aucun import effectué</div>
      ) : (
        history.map((h, i) => (
          <div key={h.id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
            borderBottom: i < history.length - 1 ? `1px solid ${T.border}` : "none",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{h.name}</span>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, background: "#F0FDF4", border: "1px solid #86EFAC", color: "#0F8B6C", fontSize: 10, fontWeight: 500 }}>
                  Succès
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: T.textMut, marginTop: 4 }}>
                <span>{h.account}</span>
                <span>·</span>
                <span>{h.broker || "—"}</span>
                <span>·</span>
                <span>{h.count} trade{h.count !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
            </div>
            <button
              aria-label="Supprimer"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: 6, color: T.red, display: "inline-flex", alignItems: "center",
                borderRadius: 6, transition: "background 120ms ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        ))
      )}
    </Card>
  );
}

/* =================== HELPERS =================== */
function FooterHelp() {
  return (
    <div style={{ paddingTop: 8, paddingBottom: 16, fontSize: 12, color: T.textMut }}>
      Besoin d&apos;aide avec vos paramètres ? <a href="mailto:support@taotrade.com" style={{ color: T.text, fontWeight: 500, textDecoration: "underline" }}>Contacter notre support</a>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.text, marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.textMut, marginTop: 6, lineHeight: 1.45 }}>{hint}</div>}
    </div>
  );
}

function inputStyle() {
  return {
    width: "100%",
    padding: "8px 12px",
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    background: T.bg,
    color: T.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };
}

function selectStyle() {
  return {
    ...inputStyle(),
    cursor: "pointer",
    appearance: "none",
    backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%238E8E8E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>\')',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 36,
  };
}

/* ── Alerts section ────────────────────────────────────────────────── */
function AlertsSection() {
  const [settings, setSettings] = useCloudState(
    "tr4de_alert_settings",
    "alert_settings",
    DEFAULT_ALERT_SETTINGS
  );
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [testing, setTesting] = useState(false);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
    } catch {}
  };

  const fireTest = () => {
    setTesting(true);
    window.dispatchEvent(new CustomEvent("tr4de:alert", {
      detail: { title: "Alerte test", body: "Si tu vois ce toast, c'est que tout marche.", severity: "info" },
    }));
    if (permission === "granted") {
      try { new Notification("tao trade — Test", { body: "Alerte test depuis les Paramètres." }); } catch {}
    }
    setTimeout(() => setTesting(false), 1200);
  };

  const update = (patch) => setSettings(prev => ({ ...prev, ...patch }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <CardHeader title="Alertes" subtitle="Reçois une notification quand certains seuils P&L sont atteints." />

      {/* Permission */}
      <div style={{
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Notifications navigateur</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>
            Statut : {permission === "granted" ? "✅ activées" : permission === "denied" ? "❌ refusées (à activer dans les paramètres du navigateur)" : "⚠️ pas encore demandées"}
          </div>
        </div>
        {permission !== "granted" && permission !== "denied" && (
          <button onClick={requestPermission} style={primaryBtn()}>Activer</button>
        )}
        <button onClick={fireTest} disabled={testing} style={secondaryBtn(testing)}>
          {testing ? "Envoyé !" : "Tester"}
        </button>
      </div>

      {/* Master switch */}
      <Field label="Surveillance active" hint="Désactive temporairement toutes les alertes sans perdre tes seuils.">
        <AlertSwitch
          checked={settings.enabled}
          onChange={v => update({ enabled: v })}
          label={settings.enabled ? "Activée" : "Désactivée"}
        />
      </Field>

      {/* Thresholds */}
      <Field label="Take profit journalier" hint="Notification quand le P&L du jour dépasse ce seuil. 0 pour désactiver.">
        <NumberInput
          value={settings.dailyTakeProfit}
          onChange={v => update({ dailyTakeProfit: v })}
          suffix="$"
          placeholder="500"
        />
      </Field>

      <Field label="Perte journalière maximale" hint="Notification 'STOP' quand la perte du jour atteint ce montant (en valeur absolue). 0 pour désactiver.">
        <NumberInput
          value={settings.dailyMaxLoss}
          onChange={v => update({ dailyMaxLoss: v })}
          suffix="$"
          placeholder="300"
        />
      </Field>

      <Field label="Série perdante" hint="Alerte après N pertes consécutives. 0 pour désactiver.">
        <NumberInput
          value={settings.losingStreak}
          onChange={v => update({ losingStreak: v })}
          suffix="trades"
          placeholder="3"
        />
      </Field>
    </div>
  );
}

function AlertSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        background: "transparent", border: "none", cursor: "pointer",
        padding: 0, fontFamily: "inherit",
      }}
    >
      <span style={{
        width: 36, height: 20, borderRadius: 999,
        background: checked ? T.green : T.border,
        position: "relative", transition: "background 150ms",
        flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          transition: "left 150ms",
        }} />
      </span>
      <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

function NumberInput({ value, onChange, suffix, placeholder }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number"
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        placeholder={placeholder}
        min={0}
        style={{ ...inputStyle(), maxWidth: 160 }}
      />
      {suffix && <span style={{ fontSize: 12, color: T.textMut, fontWeight: 500 }}>{suffix}</span>}
    </div>
  );
}

function primaryBtn() {
  return {
    padding: "8px 14px", borderRadius: 8, border: "none",
    background: T.text, color: "#fff",
    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  };
}
function secondaryBtn(disabled) {
  return {
    padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
    background: T.white, color: T.text,
    fontSize: 12, fontWeight: 600, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1, fontFamily: "inherit",
  };
}
