import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback } from "react";

const BUCKET = "trade_screenshots";

/**
 * Hook minimal pour gérer les screenshots de trades.
 * Stocke l'URL publique dans trade_details.screenshot_url, l'image dans le bucket Supabase.
 */
export function useTradeScreenshots() {
  const { user } = useAuth();
  const supabase = createClient();
  const [urls, setUrls] = useState<Record<string, string>>({}); // tradeId -> public url
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("trade_details")
          .select("trade_id, screenshot_url")
          .eq("user_id", user.id)
          .not("screenshot_url", "is", null);
        if (error) throw error;
        if (cancelled) return;
        const map: Record<string, string> = {};
        data?.forEach((d: { trade_id: string; screenshot_url: string }) => {
          if (d.screenshot_url) map[d.trade_id] = d.screenshot_url;
        });
        setUrls(map);
      } catch {
        if (!cancelled) setUrls({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, supabase]);

  const uploadScreenshot = useCallback(async (tradeId: string, file: File): Promise<string | null> => {
    if (!user?.id || !tradeId || !file) return null;
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const safeId = tradeId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${user.id}/${safeId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) {
      console.error("upload screenshot failed:", upErr.message);
      return null;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: dbErr } = await supabase
      .from("trade_details")
      .upsert({ user_id: user.id, trade_id: tradeId, screenshot_url: url }, { onConflict: "user_id,trade_id" });
    if (dbErr) {
      console.error("save screenshot_url failed:", dbErr.message);
      return null;
    }
    setUrls(prev => ({ ...prev, [tradeId]: url }));
    return url;
  }, [user?.id, supabase]);

  const removeScreenshot = useCallback(async (tradeId: string) => {
    if (!user?.id || !tradeId) return;
    const url = urls[tradeId];
    if (url) {
      // Best-effort delete in storage; ignore errors (RLS / missing path).
      const idx = url.indexOf("/" + BUCKET + "/");
      if (idx >= 0) {
        const path = url.slice(idx + BUCKET.length + 2);
        await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
      }
    }
    await supabase
      .from("trade_details")
      .update({ screenshot_url: null })
      .eq("user_id", user.id)
      .eq("trade_id", tradeId);
    setUrls(prev => {
      const next = { ...prev };
      delete next[tradeId];
      return next;
    });
  }, [user?.id, urls, supabase]);

  return { urls, uploadScreenshot, removeScreenshot, loading };
}
