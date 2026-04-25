import { NextRequest, NextResponse } from "next/server";

// Map trading symbols -> Yahoo Finance tickers (futures continuous)
const SYMBOL_MAP: Record<string, string> = {
  NQ: "NQ=F",
  ES: "ES=F",
  YM: "YM=F",
  RTY: "RTY=F",
  CL: "CL=F",
  GC: "GC=F",
  SI: "SI=F",
  NG: "NG=F",
  ZB: "ZB=F",
  ZN: "ZN=F",
  "6E": "6E=F",
  "6B": "6B=F",
  "6J": "6J=F",
  BTC: "BTC-USD",
  ETH: "ETH-USD",
};

function resolveYahooSymbol(raw: string): string {
  const s = (raw || "").toUpperCase().trim();
  if (SYMBOL_MAP[s]) return SYMBOL_MAP[s];
  // Already a Yahoo ticker (contains =F, -USD, ^, etc)
  if (/[=\-\^]/.test(s)) return s;
  // Fallback: assume equity ticker
  return s;
}

// Yahoo intraday availability constraints (days back from now)
// 1m: 7d, 2m: 60d, 5m: 60d, 15m: 60d, 30m: 60d, 60m/1h: 730d, 1d: unlimited
function pickInterval(fromSec: number, toSec: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const daysBack = (nowSec - fromSec) / 86400;
  const durationHours = (toSec - fromSec) / 3600;

  if (daysBack > 60) return durationHours > 48 ? "1d" : "1h";
  if (durationHours <= 4) return daysBack <= 7 ? "1m" : "5m";
  if (durationHours <= 24) return "5m";
  if (durationHours <= 72) return "15m";
  if (durationHours <= 168) return "30m";
  return "1h";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const from = Number(searchParams.get("from"));
    const to = Number(searchParams.get("to"));
    const intervalParam = searchParams.get("interval");

    if (!symbol || !from || !to || to <= from) {
      return NextResponse.json(
        { error: "symbol, from, to (unix seconds) required" },
        { status: 400 }
      );
    }

    const yahooSymbol = resolveYahooSymbol(symbol);
    const interval = intervalParam || pickInterval(from, to);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSymbol
    )}?period1=${from}&period2=${to}&interval=${interval}&includePrePost=true`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo ${res.status}`, yahooSymbol },
        { status: 502 }
      );
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json(
        { error: "No data", yahooSymbol, raw: json?.chart?.error },
        { status: 404 }
      );
    }

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const o = quote.open || [];
    const h = quote.high || [];
    const l = quote.low || [];
    const c = quote.close || [];
    const v = quote.volume || [];

    const candles = timestamps
      .map((t, i) => ({
        time: t,
        open: o[i],
        high: h[i],
        low: l[i],
        close: c[i],
        volume: v[i] ?? 0,
      }))
      .filter(
        (k) =>
          k.open != null &&
          k.high != null &&
          k.low != null &&
          k.close != null
      );

    return NextResponse.json({
      symbol: yahooSymbol,
      interval,
      candles,
      meta: {
        currency: result.meta?.currency,
        exchangeName: result.meta?.exchangeName,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}
