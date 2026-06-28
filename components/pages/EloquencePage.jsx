"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Mic, Square, Volume2, Loader2, Check, ChevronRight,
  Sparkles, RefreshCw, Lightbulb, TrendingUp, BookOpen, MessageCircle, Target,
} from "lucide-react";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import {
  ELOQ_STORAGE_KEY, ELOQ_CLOUD_KEY, LEVELS, LEVEL_BY_ID, SCORE_AXES, FIDELITY_AXIS,
  READING_TEXTS, TONGUE_TWISTERS, WARMUPS, TOPIC_THEMES, STRUCTURE_FRAMEWORKS,
  EXERCISE_MODES, countWords, countFillers, computeWpm, describeWpm, overallScore,
  getTopicsFromBank, pickRandomTopic,
} from "@/lib/eloquenceData";

/* ─────────────── Palette (cohérente avec le reste du projet) ─────────────── */
const T = {
  white: "#FFFFFF", border: "#E5E5E5", bg: "#F5F5F5",
  text: "#0D0D0D", textSub: "#5C5C5C", textMut: "#8E8E8E",
  accent: "#0D0D0D", accentBg: "#F0F0F0",
  green: "#16A34A", red: "#EF4444", blue: "#3B82F6", amber: "#F59E0B",
};

/* ─────────────── Helpers génériques ─────────────── */
// Couleur d'un score 0–100.
function scoreColor(v) {
  if (v == null) return T.textMut;
  if (v >= 80) return T.green;
  if (v >= 65) return T.blue;
  if (v >= 50) return T.amber;
  return T.red;
}
// Couleur d'un "tone" renvoyé par describeWpm.
function toneColor(tone) {
  return { green: T.green, blue: T.blue, amber: T.amber, red: T.red, mut: T.textMut }[tone] || T.textMut;
}
// Format mm:ss.
function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
// Identifiant unique côté client.
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* Styles partagés */
const card = {
  background: T.white, border: `1px solid ${T.border}`, borderRadius: 14,
  padding: 18, boxSizing: "border-box",
};
const pill = (active) => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "6px 14px", borderRadius: 999, cursor: "pointer",
  border: `1px solid ${active ? T.text : T.border}`,
  background: active ? T.text : T.white, color: active ? "#fff" : T.text,
  fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  transition: "all 120ms ease",
});
const ghost = (disabled) => ({
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "9px 16px", borderRadius: 999,
  border: `1px solid ${T.border}`, background: T.white, color: T.text,
  fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  transition: "all 120ms ease",
});
const primary = (disabled) => ({
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "9px 18px", borderRadius: 999,
  border: `1px solid ${T.text}`, background: T.text, color: "#fff",
  fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
  transition: "all 120ms ease",
});

/* ─────────────── Synthèse vocale (modèle à écouter) ─────────────── */
function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const speak = (text) => {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 0.95;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch { setSpeaking(false); }
  };
  const stop = () => {
    try { if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel(); } catch {}
    setSpeaking(false);
  };
  // Coupe la synthèse au démontage.
  useEffect(() => () => { try { if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel(); } catch {} }, []);
  const supported = typeof window !== "undefined" && !!window.speechSynthesis;
  return { speaking, speak, stop, supported };
}

// Bouton « Écouter le modèle » réutilisable.
function ListenButton({ text }) {
  const { speaking, speak, stop, supported } = useSpeech();
  if (!supported || !text) return null;
  return (
    <button
      type="button"
      style={ghost(false)}
      onClick={() => (speaking ? stop() : speak(text))}
    >
      {speaking ? <Square size={15} /> : <Volume2 size={15} />}
      {speaking ? "Arrêter" : "Écouter le modèle"}
    </button>
  );
}

/* ─────────────── Panneau d'enregistrement + analyse IA ─────────────── */
function RecorderPanel({ mode, referenceText, topic, framework, onResult }) {
  const { recording, durationSec, error, supported, start, stop, reset } = useAudioRecorder();
  const [phase, setPhase] = useState("idle"); // idle | analyzing | error
  const [netError, setNetError] = useState(null);

  const handleStart = async () => {
    setNetError(null);
    try { await start(); } catch { setNetError("Impossible d'accéder au micro."); }
  };

  const handleStop = async () => {
    let blob = null;
    try { blob = await stop(); } catch { /* ignore */ }
    if (!blob) { setNetError("Aucun enregistrement capté. Réessaie."); return; }
    await analyze(blob);
  };

  const analyze = async (blob) => {
    setPhase("analyzing");
    setNetError(null);
    try {
      // 1) Transcription
      const fd = new FormData();
      fd.append("audio", blob, "speech.webm");
      fd.append("lang", "fr");
      const tr = await fetch("/api/ai/eloquence/transcribe", { method: "POST", body: fd });
      if (!tr.ok) throw new Error("transcribe");
      const { text, duration } = await tr.json();

      // 2) Métriques locales (avant l'IA)
      const dur = duration || durationSec || 0;
      const wordCount = countWords(text);
      const wpm = computeWpm(wordCount, dur);
      const { total: fillerCount, byWord: fillers } = countFillers(text);

      // 3) Analyse IA
      const an = await fetch("/api/ai/eloquence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode, transcript: text, referenceText, topic, framework,
          durationSec: dur, wpm, fillerCount, fillers,
        }),
      });
      if (!an.ok) throw new Error("analyze");
      const analysis = await an.json();

      onResult({ transcript: text, durationSec: dur, wpm, fillerCount, fillers, analysis });
      setPhase("idle");
      reset();
    } catch {
      setPhase("error");
      setNetError("L'analyse a échoué. Vérifie ta connexion et réessaie.");
    }
  };

  if (!supported) {
    return (
      <div style={{ ...card, color: T.red, fontSize: 14 }}>
        L'enregistrement audio n'est pas pris en charge par ce navigateur.
      </div>
    );
  }

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      {/* Animation de pulsation pour le micro */}
      <style>{`@keyframes eloqPulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.45)}70%{box-shadow:0 0 0 16px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}`}</style>

      {phase === "analyzing" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 0" }}>
          <Loader2 size={34} color={T.text} style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize: 14, color: T.textSub, fontWeight: 600 }}>Analyse en cours…</div>
          <div style={{ fontSize: 12, color: T.textMut }}>Transcription puis évaluation par l'IA.</div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={recording ? handleStop : handleStart}
            style={{
              width: 96, height: 96, borderRadius: "50%", cursor: "pointer",
              border: "none", fontFamily: "inherit",
              background: recording ? T.red : T.text, color: "#fff",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              animation: recording ? "eloqPulse 1.6s infinite" : "none",
              transition: "background 150ms ease",
            }}
          >
            {recording ? <Square size={26} fill="#fff" /> : <Mic size={28} />}
            <span style={{ fontSize: 11, fontWeight: 700 }}>{recording ? "Arrêter" : "Commencer"}</span>
          </button>

          <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: recording ? T.red : T.textMut }}>
            {fmtTime(durationSec)}
          </div>
          <div style={{ fontSize: 12, color: T.textMut, textAlign: "center" }}>
            {recording ? "Parle clairement, puis appuie sur Arrêter." : "Appuie pour démarrer l'enregistrement."}
          </div>
        </>
      )}

      {(error || netError) && (
        <div style={{ color: T.red, fontSize: 13, textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
          <span>{netError || error}</span>
          {phase === "error" && (
            <button type="button" style={ghost(false)} onClick={() => { setPhase("idle"); setNetError(null); }}>
              <RefreshCw size={14} /> Réessayer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Carte de résultats d'analyse ─────────────── */
function ResultCard({ result, showFidelity }) {
  if (!result || !result.analysis) return null;
  const { analysis, wpm, fillerCount, fillers, durationSec, transcript } = result;
  const overall = analysis.overall != null ? analysis.overall : overallScore(analysis.scores);
  const wpmInfo = describeWpm(wpm);

  // Axes à afficher (+ fidélité si pertinent et présent)
  const axes = [...SCORE_AXES];
  if (showFidelity && analysis.scores && analysis.scores.fidelity != null) axes.push(FIDELITY_AXIS);

  const topFillers = Object.entries(fillers || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
      {/* Score global */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div style={{
          width: 92, height: 92, borderRadius: "50%", flexShrink: 0,
          background: scoreColor(overall), color: "#fff",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{overall}</span>
          <span style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>/ 100</span>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Score global</div>
          {analysis.summary && (
            <div style={{ fontSize: 13, color: T.textSub, marginTop: 4, fontStyle: "italic" }}>{analysis.summary}</div>
          )}
        </div>
      </div>

      {/* Barres par axe + retour critique justifiant chaque note */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {axes.map((ax) => {
          const v = analysis.scores ? analysis.scores[ax.id] : null;
          const val = typeof v === "number" ? v : 0;
          const fb = analysis.axisFeedback ? analysis.axisFeedback[ax.id] : null;
          return (
            <div key={ax.id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 96, fontSize: 13, color: T.textSub, fontWeight: 600 }} title={ax.desc}>{ax.label}</div>
                <div style={{ flex: 1, height: 8, background: T.accentBg, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${val}%`, height: "100%", background: scoreColor(val), borderRadius: 999, transition: "width 400ms ease" }} />
                </div>
                <div style={{ width: 30, textAlign: "right", fontSize: 13, fontWeight: 700, color: scoreColor(val) }}>{val}</div>
              </div>
              {fb && (
                <div style={{ paddingLeft: 108, fontSize: 12.5, color: T.textSub, lineHeight: 1.5, borderLeft: `2px solid ${scoreColor(val)}`, marginLeft: 2, paddingTop: 1, paddingBottom: 1 }}>
                  {fb}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Métriques rapides */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={metricBox}>
          <div style={metricLabel}>Débit</div>
          <div style={{ ...metricVal, color: toneColor(wpmInfo.tone) }}>{wpm || 0} mpm</div>
          <div style={{ fontSize: 11, color: toneColor(wpmInfo.tone), fontWeight: 600 }}>{wpmInfo.label}</div>
        </div>
        <div style={metricBox}>
          <div style={metricLabel}>Durée</div>
          <div style={metricVal}>{fmtTime(durationSec)}</div>
        </div>
        <div style={metricBox}>
          <div style={metricLabel}>Mots de remplissage</div>
          <div style={{ ...metricVal, color: fillerCount > 5 ? T.amber : T.text }}>{fillerCount || 0}</div>
          {topFillers.length > 0 && (
            <div style={{ fontSize: 11, color: T.textMut }} title={topFillers.map(([w, n]) => `${w} ×${n}`).join(", ")}>
              {topFillers.map(([w, n]) => `${w} ×${n}`).join(" · ")}
            </div>
          )}
        </div>
      </div>

      {/* Points forts / À améliorer / Conseils */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <FeedbackList title="Points forts" icon={<Check size={15} color={T.green} />} color={T.green} items={analysis.strengths} />
        <FeedbackList title="À améliorer" icon={<ChevronRight size={15} color={T.amber} />} color={T.amber} items={analysis.improvements} />
        <FeedbackList title="Conseils" icon={<Lightbulb size={15} color={T.blue} />} color={T.blue} items={analysis.tips} />
      </div>

      {/* Suggestions de vocabulaire */}
      {Array.isArray(analysis.vocabSuggestions) && analysis.vocabSuggestions.length > 0 && (
        <div>
          <div style={sectionTitle}>Dis plutôt</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {analysis.vocabSuggestions.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ color: T.textMut, textDecoration: "line-through" }}>{s.original}</span>
                <ChevronRight size={14} color={T.textMut} />
                <span style={{ color: T.green, fontWeight: 600 }}>{s.better}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcription repliable */}
      {transcript && (
        <details style={{ fontSize: 13 }}>
          <summary style={{ cursor: "pointer", color: T.textSub, fontWeight: 600 }}>Voir la transcription</summary>
          <p style={{ marginTop: 8, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{transcript}</p>
        </details>
      )}
    </div>
  );
}

const metricBox = { flex: 1, minWidth: 120, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", background: T.bg };
const metricLabel = { fontSize: 11, color: T.textMut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 };
const metricVal = { fontSize: 18, fontWeight: 700, color: T.text, marginTop: 2 };
const sectionTitle = { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 };

function FeedbackList({ title, icon, color, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ ...sectionTitle, color }}>{title}</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: T.textSub, lineHeight: 1.4 }}>
            <span style={{ marginTop: 2, flexShrink: 0 }}>{icon}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────── Pastilles de sélection de niveau ─────────────── */
function LevelFilter({ value, onChange, allLabel = "Tous" }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" style={pill(value === 0)} onClick={() => onChange(0)}>{allLabel}</button>
      {LEVELS.map((l) => (
        <button
          key={l.id}
          type="button"
          style={{ ...pill(value === l.id), borderColor: value === l.id ? l.color : T.border, background: value === l.id ? l.color : T.white, color: value === l.id ? "#fff" : T.text }}
          onClick={() => onChange(l.id)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// Badge de niveau (coloré).
function LevelBadge({ level }) {
  const l = LEVEL_BY_ID[level];
  if (!l) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: l.color, padding: "2px 8px", borderRadius: 999 }}>
      {l.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONGLET — Lecture
   ═══════════════════════════════════════════════════════════ */
function ReadingTab({ onSession }) {
  const [level, setLevel] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);

  const list = useMemo(
    () => READING_TEXTS.filter((tx) => level === 0 || tx.level === level),
    [level]
  );
  const selected = READING_TEXTS.find((tx) => tx.id === selectedId) || null;

  const handleResult = (r) => {
    setResult(r);
    onSession({ mode: "reading", r });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={lead}>Lis un texte à voix haute. L'IA évalue ta diction, ta clarté et ta fidélité au texte.</p>
      <LevelFilter value={level} onChange={(v) => { setLevel(v); }} />

      {/* Cartes de textes */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {list.map((tx) => {
          const active = tx.id === selectedId;
          return (
            <button
              key={tx.id}
              type="button"
              onClick={() => { setSelectedId(tx.id); setResult(null); }}
              style={{
                ...card, textAlign: "left", cursor: "pointer", width: 240, fontFamily: "inherit",
                borderColor: active ? T.text : T.border, borderWidth: active ? 2 : 1,
                background: active ? T.accentBg : T.white,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: T.textMut, fontWeight: 600 }}>{tx.genre}</span>
                <LevelBadge level={tx.level} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{tx.title}</div>
            </button>
          );
        })}
      </div>

      {/* Texte sélectionné */}
      {selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.title}</div>
              <ListenButton text={selected.text} />
            </div>
            <p style={{ fontSize: 18, lineHeight: 1.8, color: T.text, margin: 0 }}>{selected.text}</p>
          </div>
          <RecorderPanel mode="reading" referenceText={selected.text} onResult={handleResult} />
          {result && <ResultCard result={result} showFidelity />}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONGLET — Discours libre
   ═══════════════════════════════════════════════════════════ */
function FreeSpeechTab({ onSession, presetTopic, clearPreset }) {
  const [topic, setTopic] = useState("");
  const [prep, setPrep] = useState(0); // 0 / 30 / 60
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState(null);

  // Pré-remplissage depuis l'onglet « Sujets ».
  useEffect(() => {
    if (presetTopic) { setTopic(presetTopic); setResult(null); clearPreset && clearPreset(); }
  }, [presetTopic, clearPreset]);

  // Compte à rebours de préparation.
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // Tirage instantané depuis la banque locale (pas d'attente réseau).
  const drawTopic = () => {
    const tp = pickRandomTopic("surprise");
    if (tp) { setTopic(tp.title); setResult(null); }
  };

  const handleResult = (r) => {
    setResult(r);
    onSession({ mode: "freeSpeech", r });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={lead}>Choisis ou tire un sujet, prépare-toi, puis improvise. L'IA juge ta structure et ton vocabulaire.</p>

      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={topic}
          onChange={(e) => { setTopic(e.target.value); setResult(null); }}
          placeholder="Écris ton sujet, ou tire-en un au hasard…"
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", color: T.text, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={ghost(false)} onClick={drawTopic}>
            <Sparkles size={14} /> Tirer un sujet
          </button>
          <span style={{ fontSize: 12, color: T.textMut }}>Préparation :</span>
          {[0, 30, 60].map((s) => (
            <button key={s} type="button" style={pill(prep === s)} onClick={() => setPrep(s)}>
              {s === 0 ? "Aucune" : `${s}s`}
            </button>
          ))}
          {prep > 0 && (
            <button type="button" style={primary(countdown > 0)} disabled={countdown > 0} onClick={() => setCountdown(prep)}>
              {countdown > 0 ? `${countdown}s…` : "Démarrer la prépa"}
            </button>
          )}
        </div>
        {countdown > 0 && (
          <div style={{ textAlign: "center", fontSize: 40, fontWeight: 800, color: T.amber }}>{countdown}</div>
        )}
      </div>

      {topic.trim() && countdown === 0 && (
        <>
          <RecorderPanel mode="freeSpeech" topic={topic.trim()} onResult={handleResult} />
          {result && <ResultCard result={result} />}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONGLET — Sujets (générateur)
   ═══════════════════════════════════════════════════════════ */
function TopicsTab({ onPractice }) {
  const [theme, setTheme] = useState(TOPIC_THEMES[0].key);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const generate = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/ai/eloquence/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "topics", theme, count: 4 }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setTopics(data.topics || []);
    } catch {
      setErr("La génération a échoué. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  // Pioche instantanée depuis la banque locale (sans IA).
  const pickFromBank = () => { setErr(null); setTopics(getTopicsFromBank(theme, 4)); };

  // Préchargement : on affiche d'emblée des sujets de la banque.
  useEffect(() => { setTopics(getTopicsFromBank(TOPIC_THEMES[0].key, 4)); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={lead}>Pioche dans la banque (instantané) ou génère des sujets sur mesure avec l'IA, puis lance-toi en discours libre.</p>

      {/* Grille de thèmes */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {TOPIC_THEMES.map((th) => (
          <button
            key={th.key}
            type="button"
            onClick={() => setTheme(th.key)}
            style={{ ...pill(theme === th.key), padding: "8px 14px", fontSize: 14 }}
          >
            <span>{th.emoji}</span> {th.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={ghost(false)} onClick={pickFromBank}>
          <RefreshCw size={14} /> Piocher dans la banque
        </button>
        <button type="button" style={primary(loading)} disabled={loading} onClick={generate}>
          {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={15} />}
          Générer avec l'IA
        </button>
      </div>

      {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}

      {/* Cartes de sujets */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {topics.map((tp, i) => (
          <div key={i} style={{ ...card, width: 280, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{tp.title}</div>
            {tp.angle && <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.4 }}>{tp.angle}</div>}
            {tp.suggestedStructure && (
              <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, color: T.blue, background: "#EFF6FF", padding: "2px 8px", borderRadius: 999 }}>
                {tp.suggestedStructure}
              </span>
            )}
            <button type="button" style={{ ...ghost(false), marginTop: 4, alignSelf: "flex-start" }} onClick={() => onPractice(tp.title)}>
              <Mic size={14} /> S'entraîner sur ce sujet
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONGLET — Diction
   ═══════════════════════════════════════════════════════════ */
function DictionTab({ onSession }) {
  const [openWarmup, setOpenWarmup] = useState(null);
  const [level, setLevel] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);

  const twisters = useMemo(
    () => TONGUE_TWISTERS.filter((tw) => level === 0 || tw.level === level),
    [level]
  );
  const selected = TONGUE_TWISTERS.find((tw) => tw.id === selectedId) || null;

  const handleResult = (r) => {
    setResult(r);
    onSession({ mode: "diction", r });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Échauffements */}
      <div>
        <div style={blockTitle}>Échauffement</div>
        <p style={lead}>Prépare ta voix avant de t'entraîner. Pas d'enregistrement, juste à suivre.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {WARMUPS.map((w) => {
            const open = openWarmup === w.id;
            return (
              <div key={w.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpenWarmup(open ? null : w.id)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ChevronRight size={16} color={T.textMut} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 150ms ease" }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{w.title}</span>
                  </span>
                  <span style={{ fontSize: 12, color: T.textMut }}>{w.duration}s</span>
                </button>
                {open && <div style={{ padding: "0 16px 14px 42px", fontSize: 13, color: T.textSub, lineHeight: 1.6 }}>{w.instruction}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Virelangues */}
      <div>
        <div style={blockTitle}>Virelangues</div>
        <p style={lead}>Articule un virelangue le plus nettement possible. L'IA évalue ta diction et ta fidélité.</p>
        <div style={{ marginBottom: 12 }}>
          <LevelFilter value={level} onChange={setLevel} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {twisters.map((tw) => {
            const active = tw.id === selectedId;
            return (
              <button
                key={tw.id}
                type="button"
                onClick={() => { setSelectedId(tw.id); setResult(null); }}
                style={{ ...card, width: 300, textAlign: "left", cursor: "pointer", fontFamily: "inherit", borderColor: active ? T.text : T.border, borderWidth: active ? 2 : 1, background: active ? T.accentBg : T.white }}
              >
                <div style={{ marginBottom: 6 }}><LevelBadge level={tw.level} /></div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.4 }}>{tw.text}</div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
              <p style={{ fontSize: 22, lineHeight: 1.6, color: T.text, margin: 0, fontWeight: 600 }}>{selected.text}</p>
              <ListenButton text={selected.text} />
            </div>
            <RecorderPanel mode="diction" referenceText={selected.text} onResult={handleResult} />
            {result && <ResultCard result={result} showFidelity />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONGLET — Structure
   ═══════════════════════════════════════════════════════════ */
function StructureTab({ onSession }) {
  const [selectedId, setSelectedId] = useState(null);
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  const selected = STRUCTURE_FRAMEWORKS.find((f) => f.id === selectedId) || null;

  const genExercise = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/ai/eloquence/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "exercise" }),
      });
      if (!r.ok) throw new Error();
      const { exercise: ex } = await r.json();
      setExercise(ex || null);
      setResult(null);
    } catch {
      setErr("La génération a échoué. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const handleResult = (r) => {
    setResult(r);
    onSession({ mode: "structure", r });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={lead}>Choisis un cadre, reçois un exercice, puis structure ton propos. L'IA juge le respect du plan.</p>

      {/* Cartes de frameworks */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {STRUCTURE_FRAMEWORKS.map((f) => {
          const active = f.id === selectedId;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { setSelectedId(f.id); setResult(null); }}
              style={{ ...card, width: 300, textAlign: "left", cursor: "pointer", fontFamily: "inherit", borderColor: active ? T.text : T.border, borderWidth: active ? 2 : 1, background: active ? T.accentBg : T.white }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{f.name}</div>
              <div style={{ fontSize: 12, color: T.textMut, fontWeight: 600, marginBottom: 6 }}>{f.short}</div>
              <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.4, marginBottom: 10 }}>{f.description}</div>
              <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {f.steps.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: T.textSub }}>
                    <span style={{ fontWeight: 700, color: T.text }}>{s.label}</span>
                    {s.hint ? ` — ${s.hint}` : ""}
                  </li>
                ))}
              </ol>
            </button>
          );
        })}
      </div>

      <div>
        <button type="button" style={primary(loading)} disabled={loading} onClick={genExercise}>
          {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={15} />}
          Générer un exercice
        </button>
      </div>
      {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}

      {/* Exercice généré */}
      {exercise && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 8, background: T.bg }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMut, textTransform: "uppercase", letterSpacing: 0.4 }}>Exercice</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{exercise.prompt}</div>
          {exercise.framework && <div style={{ fontSize: 13, color: T.blue, fontWeight: 600 }}>Cadre conseillé : {exercise.framework}</div>}
          {Array.isArray(exercise.tips) && exercise.tips.length > 0 && (
            <ul style={{ margin: "4px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {exercise.tips.map((tp, i) => <li key={i} style={{ fontSize: 13, color: T.textSub }}>{tp}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Enregistrement guidé par le framework choisi */}
      {selected && (
        <>
          <div style={{ ...card }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Ton guide : {selected.name}</div>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {selected.steps.map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: T.textSub }}>
                  <span style={{ fontWeight: 700, color: T.text }}>{s.label}</span>{s.hint ? ` — ${s.hint}` : ""}
                </li>
              ))}
            </ol>
          </div>
          <RecorderPanel
            mode="structure"
            framework={{ name: selected.name, steps: selected.steps }}
            topic={exercise ? exercise.prompt : undefined}
            onResult={handleResult}
          />
          {result && <ResultCard result={result} />}
        </>
      )}
    </div>
  );
}

const lead = { fontSize: 14, color: T.textSub, lineHeight: 1.5, margin: 0 };
const blockTitle = { fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 };

/* ─────────────── Tableau de bord de progression ─────────────── */
function ProgressDashboard({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div style={{ fontSize: 13, color: T.textMut, marginBottom: 4 }}>
        Commence ta première session pour suivre ta progression.
      </div>
    );
  }
  const n = sessions.length;
  const avg = Math.round(sessions.reduce((a, s) => a + (s.overall || 0), 0) / n);
  const best = Math.max(...sessions.map((s) => s.overall || 0));
  const wpms = sessions.map((s) => s.wpm || 0).filter((w) => w > 0);
  const avgWpm = wpms.length ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : 0;

  const stats = [
    { label: "Sessions", value: n, icon: <MessageCircle size={16} color={T.textMut} /> },
    { label: "Score moyen", value: avg, icon: <Target size={16} color={scoreColor(avg)} />, color: scoreColor(avg) },
    { label: "Meilleur score", value: best, icon: <TrendingUp size={16} color={scoreColor(best)} />, color: scoreColor(best) },
    { label: "Débit moyen", value: avgWpm ? `${avgWpm} mpm` : "—", icon: <BookOpen size={16} color={T.textMut} /> },
  ];

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {stats.map((s, i) => (
        <div key={i} style={{ ...metricBox, minWidth: 130, background: T.white }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{s.icon}<span style={metricLabel}>{s.label}</span></div>
          <div style={{ ...metricVal, color: s.color || T.text }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Progression détaillée par critère ───────────────
 * Montre, pour chaque axe noté, la moyenne et la tendance (sessions récentes vs
 * anciennes), plus un mini-graphique de l'évolution du score global. */
function ProgressByAxis({ sessions }) {
  // Au moins 2 sessions pour parler de progression.
  if (!sessions || sessions.length < 2) return null;

  // Ordre chronologique (l'historique est stocké du plus récent au plus ancien).
  const chrono = [...sessions].reverse();
  const allAxes = [...SCORE_AXES, FIDELITY_AXIS];

  // Tendance d'une série : compare la moyenne de la 2nde moitié (récent) à la 1re.
  const trend = (vals) => {
    if (vals.length < 2) return null;
    const mid = Math.floor(vals.length / 2);
    const older = vals.slice(0, mid);
    const recent = vals.slice(mid);
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    return Math.round(mean(recent) - mean(older));
  };
  const mean = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);

  const rows = allAxes
    .map((ax) => {
      const vals = chrono
        .map((s) => (s.scores ? s.scores[ax.id] : null))
        .filter((v) => typeof v === "number");
      if (vals.length < 1) return null;
      return { ax, avg: mean(vals), delta: trend(vals), count: vals.length, last: vals[vals.length - 1] };
    })
    .filter(Boolean);

  // Série du score global pour le sparkline.
  const overalls = chrono.map((s) => s.overall || 0);

  return (
    <details style={{ ...card, padding: 0, overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: T.text, listStyle: "none" }}>
        <TrendingUp size={16} color={T.text} />
        Progression par critère
        <span style={{ fontSize: 12, color: T.textMut, fontWeight: 500 }}>· {sessions.length} sessions</span>
      </summary>

      <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Mini-graphique du score global dans le temps */}
        <div>
          <div style={{ ...metricLabel, marginBottom: 6 }}>Score global au fil du temps</div>
          <Sparkline values={overalls} />
        </div>

        {/* Tendance par axe */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(({ ax, avg, delta }) => (
            <div key={ax.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 96, fontSize: 13, color: T.textSub, fontWeight: 600 }} title={ax.desc}>{ax.label}</div>
              <div style={{ flex: 1, height: 8, background: T.accentBg, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${avg}%`, height: "100%", background: scoreColor(avg), borderRadius: 999 }} />
              </div>
              <div style={{ width: 30, textAlign: "right", fontSize: 13, fontWeight: 700, color: scoreColor(avg) }}>{avg}</div>
              <div style={{ width: 52, textAlign: "right", fontSize: 12, fontWeight: 700 }}>
                {delta == null ? (
                  <span style={{ color: T.textMut }}>—</span>
                ) : delta > 0 ? (
                  <span style={{ color: T.green }}>▲ +{delta}</span>
                ) : delta < 0 ? (
                  <span style={{ color: T.red }}>▼ {delta}</span>
                ) : (
                  <span style={{ color: T.textMut }}>= 0</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: T.textMut }}>
          Moyenne sur toutes les sessions · tendance = écart entre tes sessions récentes et plus anciennes.
        </div>
      </div>
    </details>
  );
}

// Mini-courbe SVG (sparkline) d'une série de valeurs 0–100.
function Sparkline({ values }) {
  if (!values || values.length < 2) return null;
  const W = 100, H = 28, pad = 2;
  const max = 100, min = 0;
  const pts = values.map((v, i) => {
    const x = pad + (i * (W - 2 * pad)) / (values.length - 1);
    const y = pad + (1 - (v - min) / (max - min)) * (H - 2 * pad);
    return [x, y];
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 40, display: "block" }}>
      <polyline points={`${pad},${H - pad} ${pts.map((p) => p.join(",")).join(" ")} ${W - pad},${H - pad}`} fill="rgba(13,13,13,0.04)" stroke="none" />
      <path d={path} fill="none" stroke={scoreColor(last)} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r={2.2} fill={scoreColor(last)} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */
const TABS = [
  { id: EXERCISE_MODES.reading,    label: "Lecture" },
  { id: EXERCISE_MODES.freeSpeech, label: "Discours libre" },
  { id: EXERCISE_MODES.topics,     label: "Sujets" },
  { id: EXERCISE_MODES.diction,    label: "Diction" },
  { id: EXERCISE_MODES.structure,  label: "Structure" },
];

export default function EloquencePage() {
  const [tab, setTab] = useState(EXERCISE_MODES.reading);
  const [store, setStore] = useCloudState(ELOQ_STORAGE_KEY, ELOQ_CLOUD_KEY, { sessions: [] });
  const [presetTopic, setPresetTopic] = useState(null);

  const sessions = (store && store.sessions) || [];

  // Enregistre une session dans l'historique (en tête, limité à 100).
  const recordSession = ({ mode, r }) => {
    if (!r || !r.analysis) return;
    const entry = {
      id: uid(),
      date: new Date().toISOString(),
      mode,
      overall: r.analysis.overall != null ? r.analysis.overall : overallScore(r.analysis.scores),
      scores: r.analysis.scores,
      wpm: r.wpm,
      fillerCount: r.fillerCount,
    };
    setStore((prev) => {
      const list = (prev && prev.sessions) || [];
      return { ...(prev || {}), sessions: [entry, ...list].slice(0, 100) };
    });
  };

  // Bascule vers « Discours libre » avec un sujet pré-rempli.
  const practiceTopic = (title) => {
    setPresetTopic(title);
    setTab(EXERCISE_MODES.freeSpeech);
  };

  return (
    <div className="anim-1" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* En-tête de page — aligné sur les pages Productivité (titre 17/600) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.1, fontFamily: "var(--font-sans)" }}>
          Éloquence
        </h1>
        <span style={{ fontSize: 12, color: T.textMut }}>
          Structure, vocabulaire, clarté, confiance &amp; diction
        </span>
      </div>

      {/* Tableau de bord de progression */}
      <ProgressDashboard sessions={sessions} />
      <ProgressByAxis sessions={sessions} />

      {/* Onglets — segment control (style du projet) */}
      <div style={{ display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
        <div style={{ display: "inline-flex", gap: 4, padding: 3, background: T.accentBg, borderRadius: 999 }}>
          {TABS.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                style={{
                  flexShrink: 0, padding: "6px 14px", borderRadius: 999, border: "none",
                  background: active ? T.white : "transparent",
                  color: active ? T.text : T.textSub,
                  fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,.08)" : "none",
                  whiteSpace: "nowrap", transition: "all 120ms ease",
                }}
              >
                {tb.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu de l'onglet actif */}
      {tab === EXERCISE_MODES.reading && <ReadingTab onSession={recordSession} />}
      {tab === EXERCISE_MODES.freeSpeech && (
        <FreeSpeechTab onSession={recordSession} presetTopic={presetTopic} clearPreset={() => setPresetTopic(null)} />
      )}
      {tab === EXERCISE_MODES.topics && <TopicsTab onPractice={practiceTopic} />}
      {tab === EXERCISE_MODES.diction && <DictionTab onSession={recordSession} />}
      {tab === EXERCISE_MODES.structure && <StructureTab onSession={recordSession} />}
    </div>
  );
}
