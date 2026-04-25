import { describe, it, expect } from "vitest";
import { backtest, compareBacktests } from "@/lib/backtest/engine";

const T = (date: string, pnl: number, strategyId: string | null = null, symbol = "ES") =>
  ({ date, pnl, strategyId, symbol });

describe("backtest()", () => {
  it("returns zeros when no trades pass the filter", () => {
    const r = backtest([T("2026-01-01", 100, "s1")], { strategyIds: ["s2"] });
    expect(r.totalTrades).toBe(0);
    expect(r.totalPnL).toBe(0);
    expect(r.curve).toEqual([]);
    expect(r.maxDrawdown).toBe(0);
  });

  it("filters by strategyId", () => {
    const trades = [
      T("2026-01-01", 100, "s1"),
      T("2026-01-02", 50, "s2"),
      T("2026-01-03", -30, "s1"),
    ];
    const r = backtest(trades, { strategyIds: ["s1"] });
    expect(r.totalTrades).toBe(2);
    expect(r.totalPnL).toBe(70);
    expect(r.wins).toBe(1);
    expect(r.losses).toBe(1);
  });

  it("filters by date range", () => {
    const trades = [
      T("2026-01-01", 100),
      T("2026-02-01", 200),
      T("2026-03-01", 300),
    ];
    const r = backtest(trades, { fromDate: "2026-02-01", toDate: "2026-02-28" });
    expect(r.totalTrades).toBe(1);
    expect(r.totalPnL).toBe(200);
  });

  it("filters by symbol case-insensitively", () => {
    const trades = [T("2026-01-01", 100, null, "es"), T("2026-01-02", 50, null, "NQ")];
    const r = backtest(trades, { symbols: ["ES"] });
    expect(r.totalTrades).toBe(1);
    expect(r.totalPnL).toBe(100);
  });

  it("computes equity curve grouped by day", () => {
    const trades = [
      T("2026-01-01", 100),
      T("2026-01-01", 50),  // same day
      T("2026-01-02", -30),
    ];
    const r = backtest(trades);
    expect(r.curve).toHaveLength(2);
    expect(r.curve[0].dayPnL).toBe(150);
    expect(r.curve[0].count).toBe(2);
    expect(r.curve[0].cumPnL).toBe(150);
    expect(r.curve[1].dayPnL).toBe(-30);
    expect(r.curve[1].cumPnL).toBe(120);
  });

  it("computes max drawdown with peak/trough dates", () => {
    const trades = [
      T("2026-01-01", 100),  // cum: 100, peak
      T("2026-01-02", -40),  // cum: 60
      T("2026-01-03", -30),  // cum: 30, dd: 70
      T("2026-01-04", 50),   // cum: 80
    ];
    const r = backtest(trades);
    expect(r.maxDrawdown).toBe(70);
    expect(r.maxDrawdownPeakDate).toBe("2026-01-01");
    expect(r.maxDrawdownTroughDate).toBe("2026-01-03");
  });

  it("computes win/loss streaks", () => {
    const trades = [
      T("2026-01-01", 10),
      T("2026-01-02", 20),
      T("2026-01-03", 30),  // 3-win streak
      T("2026-01-04", -5),
      T("2026-01-05", -10), // 2-loss streak
      T("2026-01-06", 15),
    ];
    const r = backtest(trades);
    expect(r.longestWinStreak).toBe(3);
    expect(r.longestLossStreak).toBe(2);
  });

  it("returns Infinity profit factor when there are wins but no losses", () => {
    const trades = [T("2026-01-01", 100), T("2026-01-02", 50)];
    const r = backtest(trades);
    expect(r.profitFactor).toBe(Infinity);
  });

  it("computes expectancy = totalPnL / totalTrades", () => {
    const trades = [T("2026-01-01", 100), T("2026-01-02", -40), T("2026-01-03", 60)];
    const r = backtest(trades);
    expect(r.expectancy).toBe(40); // (100 - 40 + 60) / 3
  });
});

describe("compareBacktests()", () => {
  it("runs each filter and returns labeled results", () => {
    const trades = [
      T("2026-01-01", 100, "s1"),
      T("2026-01-02", -50, "s2"),
    ];
    const results = compareBacktests(trades, [
      { label: "Stratégie 1", filter: { strategyIds: ["s1"] } },
      { label: "Stratégie 2", filter: { strategyIds: ["s2"] } },
      { label: "Tout",        filter: {} },
    ]);
    expect(results).toHaveLength(3);
    expect(results[0].label).toBe("Stratégie 1");
    expect(results[0].result.totalPnL).toBe(100);
    expect(results[1].result.totalPnL).toBe(-50);
    expect(results[2].result.totalPnL).toBe(50);
  });
});
