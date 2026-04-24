"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push("/dashboard");
    };
    checkAuth();
  }, [router, supabase.auth]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/dashboard");
      } else {
        if (password !== confirmPassword) throw new Error("Les mots de passe ne correspondent pas");
        if (password.length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères");

        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setError("");
        alert("Vérifiez votre email pour confirmer votre inscription !");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur s'est produite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* Logo + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 8, background: "#0D0D0D",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FFFFFF", fontSize: 16, fontWeight: 700,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#0D0D0D" }}>tao trade</div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0D0D0D", margin: 0, letterSpacing: -0.2 }}>
          {isLogin ? "Connexion" : "Créer un compte"}
        </h1>
        <p style={{ fontSize: 14, color: "#5C5C5C", marginTop: 4, marginBottom: 24 }}>
          {isLogin ? "Accède à ton dashboard de trading" : "Quelques secondes pour commencer"}
        </p>

        {/* Form */}
        <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@email.com"
              required
              style={inputStyle()}
            />
          </Field>

          <Field label="Mot de passe">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle()}
            />
          </Field>

          {!isLogin && (
            <Field label="Confirme le mot de passe">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle()}
              />
            </Field>
          )}

          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "10px 12px", background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 8, color: "#991B1B", fontSize: 12,
            }}>
              <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" loading={loading} fullWidth size="lg">
            {isLogin ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#E5E5E5" }} />
          <span style={{ fontSize: 11, color: "#8E8E8E", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>OU</span>
          <div style={{ flex: 1, height: 1, background: "#E5E5E5" }} />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #E5E5E5",
            background: "#FFFFFF",
            color: "#0D0D0D",
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: loading ? 0.6 : 1,
            transition: "background 120ms ease",
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#F5F5F5"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>

        {/* Switch mode */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#5C5C5C", marginTop: 24 }}>
          {isLogin ? "Pas encore de compte ? " : "Déjà inscrit ? "}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            style={{
              background: "transparent", border: "none", padding: 0,
              color: "#0D0D0D", fontWeight: 600, cursor: "pointer",
              textDecoration: "underline", fontFamily: "inherit", fontSize: "inherit",
            }}
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#0D0D0D", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #E5E5E5",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#0D0D0D",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
  };
}
