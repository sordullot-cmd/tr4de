"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictée vocale en streaming temps réel via OpenAI Realtime API (WebRTC).
 *
 * - Le navigateur ouvre une RTCPeerConnection directement vers OpenAI à l'aide
 *   d'un client_secret éphémère minté côté serveur (/api/ai/realtime-token).
 * - Le micro est ajouté comme track audio sur la PC.
 * - OpenAI streame les `*.delta` de transcription mot par mot via un
 *   DataChannel. Chaque delta est append immédiatement → texte qui se construit
 *   en quasi temps réel à l'écran (style Claude Code).
 * - Le Voice Activity Detection serveur découpe les phrases automatiquement.
 *
 * Les deltas Whisper-streaming arrivent déjà avec leur ponctuation/espaces, donc
 * le consumer doit les concaténer brut (pas de séparation manuelle).
 */
export function useDictation(opts: {
  lang?: string;
  onTranscript: (chunk: string) => void;
}) {
  const { onTranscript } = opts;
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef(false);

  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      !!navigator?.mediaDevices?.getUserMedia &&
      typeof window.RTCPeerConnection !== "undefined";
    setSupported(ok);
  }, []);

  const cleanup = useCallback(() => {
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (recordingRef.current || connecting) return;
    setError(null);
    if (!supported) {
      setError("Navigateur sans support WebRTC");
      return;
    }
    setConnecting(true);
    try {
      // 1. Mint d'un token éphémère via notre route
      console.log("[Dictation] requesting ephemeral token…");
      const tokenRes = await fetch("/api/ai/realtime-token", { method: "POST" });
      const tokenJson = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        throw new Error(tokenJson?.error || `Token HTTP ${tokenRes.status}`);
      }
      const ephemeral: string =
        tokenJson?.client_secret?.value || tokenJson?.client_secret;
      if (!ephemeral) throw new Error("Token éphémère absent dans la réponse");
      console.log("[Dictation] token OK");

      // 2. Récupérer le micro
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log("[Dictation] mic OK");

      // 3. Préparer la PeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.addTrack(stream.getAudioTracks()[0]);
      pc.addEventListener("connectionstatechange", () => {
        console.log("[Dictation] pc state:", pc.connectionState);
        if (pc.connectionState === "failed") {
          setError("Connexion WebRTC échouée");
          setRecording(false);
          recordingRef.current = false;
        }
      });
      pc.addEventListener("iceconnectionstatechange", () => {
        console.log("[Dictation] ice state:", pc.iceConnectionState);
      });

      // 4. DataChannel pour recevoir les events de transcription
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("open", () => {
        console.log("[Dictation] datachannel open — pushing FR config");
        // On ré-impose la langue et le modèle FR-friendly après l'ouverture du
        // canal. Sans ça, certains comptes ignorent les hints de la session
        // initiale et le modèle bascule sur "auto-detect", ce qui peut
        // produire des transcriptions partielles ou en anglais.
        try {
          dc.send(
            JSON.stringify({
              type: "transcription_session.update",
              session: {
                input_audio_transcription: {
                  model: "whisper-1",
                  language: "fr",
                  prompt:
                    "Transcription en français. Trading, futures, P&L, win rate, trade.",
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.4,
                  prefix_padding_ms: 500,
                  silence_duration_ms: 900,
                },
              },
            })
          );
        } catch (e) {
          console.warn("[Dictation] failed to push session config:", e);
        }
      });
      dc.addEventListener("close", () => console.log("[Dictation] datachannel closed"));

      // Buffer du texte déjà émis pour gérer la transition delta → completed.
      // whisper-1 streaming envoie souvent des deltas approximatifs qu'il
      // remplace ensuite par un `completed` propre. On préfère ne pousser que
      // sur `completed` pour éviter les corrections sauvages à l'écran.
      dc.addEventListener("message", (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.type) console.log("[Dictation] event:", data.type);
          if (
            data?.type ===
              "conversation.item.input_audio_transcription.completed" &&
            typeof data.transcript === "string"
          ) {
            const t = data.transcript.trim();
            if (t) {
              // On ré-introduit un espace devant si la note ne se termine pas
              // déjà par un espace ou un saut de ligne (les `completed` ne
              // commencent pas par un espace).
              onTranscriptRef.current(" " + t);
            }
          } else if (data?.type === "error") {
            const msg = data?.error?.message || "Erreur Realtime";
            setError(msg);
            console.warn("[Dictation] error event:", data);
          }
        } catch (e) {
          console.warn("[Dictation] bad event payload:", ev.data);
        }
      });
      dc.addEventListener("error", (e) => {
        console.warn("[Dictation] datachannel error:", e);
      });

      // 5. SDP offer → POST à OpenAI → answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[Dictation] posting SDP offer…");

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?intent=transcription",
        {
          method: "POST",
          body: offer.sdp || "",
          headers: {
            Authorization: `Bearer ${ephemeral}`,
            "Content-Type": "application/sdp",
            "OpenAI-Beta": "realtime=v1",
          },
        }
      );
      if (!sdpRes.ok) {
        const txt = await sdpRes.text().catch(() => "");
        console.error("[Dictation] SDP exchange failed", sdpRes.status, txt);
        throw new Error(`SDP HTTP ${sdpRes.status}: ${txt.slice(0, 300)}`);
      }
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      console.log("[Dictation] SDP answer applied");

      recordingRef.current = true;
      setRecording(true);
    } catch (e: any) {
      console.error("[Dictation] start failed:", e);
      const name = e?.name || "";
      const map: Record<string, string> = {
        NotAllowedError: "Micro refusé par le navigateur",
        NotFoundError: "Aucun micro détecté",
        NotReadableError: "Micro déjà utilisé par une autre application",
        SecurityError: "Origine non sécurisée — HTTPS requis",
      };
      setError(map[name] || e?.message || "Impossible de démarrer la dictée");
      cleanup();
      recordingRef.current = false;
      setRecording(false);
    } finally {
      setConnecting(false);
    }
  }, [supported, cleanup, connecting]);

  const stop = useCallback(() => {
    if (!recordingRef.current && !connecting) return;
    recordingRef.current = false;
    setRecording(false);
    cleanup();
  }, [cleanup, connecting]);

  const toggle = useCallback(() => {
    if (recordingRef.current) stop(); else void start();
  }, [start, stop]);

  useEffect(() => {
    return () => {
      recordingRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // `transcribing` reste exposé pour compat avec le composant — il indique
  // l'état de connexion / d'attente d'un premier delta.
  return {
    recording,
    transcribing: connecting,
    supported,
    error,
    start,
    stop,
    toggle,
  };
}

/**
 * Push-to-talk : maintenir la barre espace dans un textarea déclenche la
 * dictée (style Claude Code). Tap court = espace normal.
 */
export function useSpaceHoldDictation(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  dictation: ReturnType<typeof useDictation>,
  holdMs: number = 220
) {
  const dictRef = useRef(dictation);
  dictRef.current = dictation;
  const longPressed = useRef(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const insertSpace = () => {
      const pos = el.selectionStart ?? el.value.length;
      const val = el.value;
      const next = val.slice(0, pos) + " " + val.slice(pos);
      const desc = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      );
      const setter = desc?.set;
      if (setter) setter.call(el, next);
      else el.value = next;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      const newPos = pos + 1;
      requestAnimationFrame(() => {
        try { el.setSelectionRange(newPos, newPos); } catch {}
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      e.preventDefault();
      if (e.repeat) return;
      if (timerRef.current) return;
      longPressed.current = false;
      timerRef.current = setTimeout(() => {
        longPressed.current = true;
        timerRef.current = null;
        void dictRef.current.start();
      }, holdMs);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (longPressed.current) {
        longPressed.current = false;
        dictRef.current.stop();
      } else {
        insertSpace();
      }
    };

    const onBlur = () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (longPressed.current) {
        longPressed.current = false;
        dictRef.current.stop();
      }
    };

    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("keyup", onKeyUp);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("blur", onBlur);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ref, holdMs]);
}
