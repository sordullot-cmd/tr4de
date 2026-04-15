"use client";

import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import QuickAccountSelector from "@/components/QuickAccountSelector";

interface TradeFormProps {
  userId: string;
  strategies?: string[];
  onSuccess?: (tradeId: string) => void;
  existingTrade?: any;
}

const emotionTags = [
  { label: "FOMO", type: "negative" },
  { label: "Revenge", type: "negative" },
  { label: "Overconfident", type: "negative" },
  { label: "Overtrading", type: "negative" },
  { label: "Hesitation", type: "neutral" },
  { label: "Boredom", type: "neutral" },
  { label: "Early Exit", type: "neutral" },
  { label: "Calm", type: "positive" },
  { label: "Focused", type: "positive" },
  { label: "Patient", type: "positive" },
];

const exitTypes = ["Manuel", "Stop Loss", "Take Profit", "AutoLiq"];

export default function TradeForm({
  userId,
  strategies = [],
  onSuccess,
  existingTrade,
}: TradeFormProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadedStrategies, setLoadedStrategies] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Basic form state
  const [symbol, setSymbol] = useState(existingTrade?.symbol || "");
  const [direction, setDirection] = useState(existingTrade?.direction || "LONG");
  const [entryPrice, setEntryPrice] = useState(
    existingTrade?.entry_price || ""
  );
  const [exitPrice, setExitPrice] = useState(existingTrade?.exit_price || "");
  const [quantity, setQuantity] = useState(existingTrade?.quantity || "");
  const [entryTime, setEntryTime] = useState(
    existingTrade?.entry_time?.substring(0, 16) || ""
  );
  const [exitTime, setExitTime] = useState(
    existingTrade?.exit_time?.substring(0, 16) || ""
  );
  const [setupName, setSetupName] = useState(existingTrade?.setup_name || "");
  const [selectedAccountId, setSelectedAccountId] = useState(existingTrade?.account_id || null);
  const [exitType, setExitType] = useState(existingTrade?.exit_type || "");
  const [selectedStrategy, setSelectedStrategy] = useState("");

  // Subjective fields
  const [notes, setNotes] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [qualityScore, setQualityScore] = useState(5);
  const [screenshot, setScreenshot] = useState<File | null>(null);

  // Load strategies from localStorage
  useEffect(() => {
    const savedStrategies = localStorage.getItem("apex_strategies");
    if (savedStrategies) {
      setLoadedStrategies(JSON.parse(savedStrategies));
    }
  }, []);

  const handleEmotionToggle = (emotion: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleScreenshotUpload = async (file: File) => {
    setScreenshot(file);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.max(120, textareaRef.current.scrollHeight) + "px";
    }
  };

  const validateForm = (): boolean => {
    if (!symbol || !entryPrice || !quantity || !entryTime) {
      setError("Remplis les champs obligatoires");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validation: vérifier qu'un compte est sélectionné
      if (!selectedAccountId) {
        setError("Veuillez sélectionner un compte de trading");
        return;
      }

      // Validation: userId est optionnel (fonctionne avec localStorage seul)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUserId = userId && uuidRegex.test(userId) ? userId : "local_user";

      // 1. Calculer P&L
      const pnl =
        direction === "LONG"
          ? (parseFloat(exitPrice || "0") - parseFloat(entryPrice)) *
            parseFloat(quantity)
          : (parseFloat(entryPrice) - parseFloat(exitPrice || "0")) *
            parseFloat(quantity);

      // 2. Créer/mettre à jour le trade
      const tradeData = {
        user_id: validUserId,
        symbol,
        direction,
        entry_price: parseFloat(entryPrice),
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        quantity: parseFloat(quantity),
        pnl: exitPrice ? pnl : null,
        setup_name: setupName,
        account_id: selectedAccountId,
        exit_type: exitType || null,
        entry_time: entryTime,
        exit_time: exitTime || null,
      };

      let tradeId = existingTrade?.id;

      if (existingTrade) {
        const { error: updateError } = await supabase
          .from("trades")
          .update(tradeData)
          .eq("id", tradeId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("trades")
          .insert([tradeData])
          .select();

        if (insertError) throw insertError;
        tradeId = data?.[0]?.id;
      }

      // 3. Uploader screenshot si présent
      let screenshotUrl = null;
      if (screenshot) {
        const fileName = `${userId}/${tradeId}/${Date.now()}`;
        const { error: uploadError, data } = await supabase.storage
          .from("trade_screenshots")
          .upload(fileName, screenshot);

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("trade_screenshots").getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }

      // 4. Créer/mettre à jour les détails du trade
      const detailsData = {
        user_id: userId,
        trade_id: tradeId,
        notes,
        emotion_tags: selectedEmotions,
        quality_score: qualityScore,
        screenshot_url: screenshotUrl,
      };

      const { data: existingDetails } = await supabase
        .from("trade_details")
        .select("id")
        .eq("trade_id", tradeId)
        .single();

      if (existingDetails) {
        await supabase
          .from("trade_details")
          .update(detailsData)
          .eq("id", existingDetails.id);
      } else {
        await supabase.from("trade_details").insert([detailsData]);
      }

      // 5. Link trade to strategy if selected
      if (selectedStrategy) {
        const tradeIdKey = `${entryTime.split("T")[0]}${symbol}${entryPrice}`;
        const savedTradeStrategies = localStorage.getItem("tr4de_trade_strategies");
        const tradeStrategies = savedTradeStrategies ? JSON.parse(savedTradeStrategies) : {};
        
        if (!tradeStrategies[tradeIdKey]) {
          tradeStrategies[tradeIdKey] = [];
        }
        
        // Add strategy ID if not already present
        const strategyId = parseInt(selectedStrategy);
        if (!tradeStrategies[tradeIdKey].includes(strategyId)) {
          tradeStrategies[tradeIdKey].push(strategyId);
        }
        
        localStorage.setItem("tr4de_trade_strategies", JSON.stringify(tradeStrategies));
      }

      // 6. Déclencher l'analyse IA
      const analyzeResponse = await fetch("/api/ai/analyze-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId, userId }),
      });

      const analysis = await analyzeResponse.json();

      setSuccess(
        `Trade sauvegardé! ${analysis.notification?.message || "Analysé par l'IA"}`
      );
      onSuccess?.(tradeId);

      // Reset form
      setSymbol("");
      setEntryPrice("");
      setExitPrice("");
      setQuantity("");
      setDirection("LONG");
      setNotes("");
      setSelectedEmotions([]);
      setQualityScore(5);
      setScreenshot(null);
      setSelectedStrategy("");
    } catch (err) {
      setError(`Erreur: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const getQualityLabel = (score: number) => {
    if (score <= 3) return "Trade impulsif";
    if (score <= 6) return "Trade correct";
    if (score <= 9) return "Bon trade";
    return "Trade parfait";
  };

  const T = {
    white: "#FFFFFF",
    bg: "#F8FAFB",
    border: "#E3E6EB",
    text: "#1A1F2E",
    textSub: "#5F6B7E",
    textMut: "#8B95AA",
    accent: "#5F7FB4",
    accentBg: "#E3ECFB",
    green: "#4A9D6F",
    greenBg: "#E6F3EB",
    red: "#AD6B6B",
    redBg: "#F5E6E6",
    amber: "#9D8555",
    amberBg: "#F5EAE0",
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: T.redBg,
            color: T.red,
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: T.greenBg,
            color: T.green,
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          {success}
        </div>
      )}

      {/* BASIC INFO SECTION */}
      <div
        style={{
          marginBottom: 24,
          padding: "16px 14px",
          background: T.bg,
          borderRadius: 6,
          border: `1px solid ${T.border}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: T.text }}>
          Informations de base
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input
            type="text"
            placeholder="Symbole (NQ, ES...)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />

          <select
            value={exitType}
            onChange={(e) => setExitType(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <option value="">Type de sortie</option>
            {exitTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            margin: "12px 0",
          }}
        >
          <button
            type="button"
            onClick={() => setDirection("LONG")}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: direction === "LONG" ? T.green : T.white,
              color: direction === "LONG" ? T.white : T.text,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📈 LONG
          </button>
          <button
            type="button"
            onClick={() => setDirection("SHORT")}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: direction === "SHORT" ? T.red : T.white,
              color: direction === "SHORT" ? T.white : T.text,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📉 SHORT
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <input
            type="number"
            placeholder="Prix entry"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            step="0.01"
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <input
            type="number"
            placeholder="Prix exit"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            step="0.01"
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <input
            type="number"
            placeholder="Quantité"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            step="0.01"
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <input
            type="datetime-local"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <input
            type="datetime-local"
            value={exitTime}
            onChange={(e) => setExitTime(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
        </div>

        {/* Sélecteur de compte - remplace setupName */}
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 6 }}>
            Compte de Trading
          </label>
          <QuickAccountSelector
            selectedAccountName={setupName}
            onAccountNameChange={setSetupName}
            T={T}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <input
            type="text"
            placeholder="Setup utilisé (optionnel)"
            value={setupName}
            onChange={(e) => setSetupName(e.target.value)}
            list="strategies-list"
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <option value="">Sélectionner une stratégie (optionnel)</option>
            {loadedStrategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        <datalist id="strategies-list">
          {loadedStrategies.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
      </div>

      {/* SUBJECTIVE FIELDS */}
      <div
        style={{
          marginBottom: 24,
          padding: "16px 14px",
          background: T.bg,
          borderRadius: 6,
          border: `1px solid ${T.border}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: T.text }}>
          Analyse personnelle
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 6 }}>
            Notes
          </label>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={handleTextareaChange}
            placeholder="Décris ce trade: pourquoi tu l'as pris, ce que tu ressentais, ce qui s'est passé..."
            style={{
              width: "100%",
              minHeight: 120,
              padding: "10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Emotions */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 6 }}>
            Émotions ressenties
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {emotionTags.map((tag) => {
              let bgColor = T.white;
              let textColor = T.text;
              if (tag.type === "negative") {
                bgColor = selectedEmotions.includes(tag.label) ? T.red : T.redBg;
                textColor = selectedEmotions.includes(tag.label) ? T.white : T.red;
              } else if (tag.type === "neutral") {
                bgColor = selectedEmotions.includes(tag.label) ? T.amber : T.amberBg;
                textColor = selectedEmotions.includes(tag.label) ? T.white : T.amber;
              } else if (tag.type === "positive") {
                bgColor = selectedEmotions.includes(tag.label) ? T.green : T.greenBg;
                textColor = selectedEmotions.includes(tag.label) ? T.white : T.green;
              }

              return (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleEmotionToggle(tag.label)}
                  style={{
                    padding: "8px 10px",
                    background: bgColor,
                    color: textColor,
                    border: `1px solid ${textColor}`,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quality Score */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 6 }}>
            Score de qualité: <strong>{qualityScore}/10</strong> — {getQualityLabel(qualityScore)}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={qualityScore}
            onChange={(e) => setQualityScore(parseInt(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        {/* Screenshot Upload */}
        <div
          style={{
            padding: "12px 10px",
            border: `2px dashed ${T.border}`,
            borderRadius: 6,
            textAlign: "center",
            cursor: "pointer",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith("image/")) {
              handleScreenshotUpload(file);
            }
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleScreenshotUpload(file);
            };
            input.click();
          }}
        >
          {screenshot ? (
            <div style={{ fontSize: 12, color: T.green }}>✅ {screenshot.name}</div>
          ) : (
            <div style={{ fontSize: 12, color: T.textSub }}>
              📸 Drag & drop une image du graphique ou clique pour upload
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: loading ? T.textMut : T.accent,
          color: T.white,
          border: "none",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Traitement..." : "Sauvegarder le trade"}
      </button>
    </form>
  );
}
