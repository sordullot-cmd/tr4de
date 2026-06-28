"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function mapGetUserMediaError(err: any): string {
  const name = err?.name || "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Micro refusé par le navigateur";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Aucun micro détecté";
    case "NotReadableError":
    case "TrackStartError":
      return "Micro déjà utilisé par une autre application";
    case "SecurityError":
      return "Origine non sécurisée — HTTPS requis";
    default:
      return err?.message || "Impossible d'accéder au micro";
  }
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export function useAudioRecorder(): {
  recording: boolean;
  durationSec: number;
  error: string | null;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  reset: () => void;
} {
  const [recording, setRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimestampRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>("");
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  useEffect(() => {
    const ok =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined";
    setSupported(ok);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        clearTimer();
        stopTracks();
        mediaRecorderRef.current = null;
        setRecording(false);
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        if (resolve) resolve(blob);
      };

      startTimestampRef.current = Date.now();
      setDurationSec(0);
      recorder.start();

      clearTimer();
      timerRef.current = setInterval(() => {
        setDurationSec((Date.now() - startTimestampRef.current) / 1000);
      }, 100);

      setRecording(true);
    } catch (err: any) {
      stopTracks();
      clearTimer();
      setRecording(false);
      setError(mapGetUserMediaError(err));
    }
  }, [clearTimer, stopTracks]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        clearTimer();
        stopTracks();
        setRecording(false);
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      try {
        recorder.stop();
      } catch {
        clearTimer();
        stopTracks();
        setRecording(false);
        stopResolveRef.current = null;
        resolve(null);
      }
    });
  }, [clearTimer, stopTracks]);

  const reset = useCallback(() => {
    setDurationSec(0);
    setError(null);
    chunksRef.current = [];
    startTimestampRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { recording, durationSec, error, supported, start, stop, reset };
}
