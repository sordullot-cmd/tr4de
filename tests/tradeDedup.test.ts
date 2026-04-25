import { describe, it, expect } from "vitest";
import { dedupKey, mergeUnique } from "@/lib/utils/tradeDedup";

const T = (date: string, symbol: string, entry: number) => ({ date, symbol, entry, exit: 0, pnl: 0 });

describe("dedupKey()", () => {
  it("produces the same key for identical trade", () => {
    const a = T("2026-01-01", "ES", 5000);
    const b = T("2026-01-01", "ES", 5000);
    expect(dedupKey(a)).toBe(dedupKey(b));
  });

  it("normalises symbol case", () => {
    expect(dedupKey(T("2026-01-01", "es", 5000))).toBe(dedupKey(T("2026-01-01", "ES", 5000)));
  });

  it("ignores ISO time portion", () => {
    expect(dedupKey({ date: "2026-01-01T14:30:00Z", symbol: "ES", entry: 100 }))
      .toBe(dedupKey({ date: "2026-01-01", symbol: "ES", entry: 100 }));
  });

  it("preserves entry precision (4 decimals)", () => {
    expect(dedupKey(T("2026-01-01", "ES", 5000.1234))).not.toBe(dedupKey(T("2026-01-01", "ES", 5000.1235)));
  });
});

describe("mergeUnique()", () => {
  it("adds all when no overlap", () => {
    const existing = [T("2026-01-01", "ES", 5000)];
    const incoming = [T("2026-01-02", "NQ", 18000)];
    const { merged, report } = mergeUnique(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(report.added).toHaveLength(1);
    expect(report.skipped).toHaveLength(0);
  });

  it("skips duplicates from incoming", () => {
    const existing = [T("2026-01-01", "ES", 5000)];
    const incoming = [T("2026-01-01", "ES", 5000), T("2026-01-02", "ES", 5005)];
    const { merged, report } = mergeUnique(existing, incoming);
    expect(merged).toHaveLength(2);          // 1 existing + 1 new
    expect(report.added).toHaveLength(1);
    expect(report.skipped).toHaveLength(1);
  });

  it("dedupes within incoming itself", () => {
    const incoming = [T("2026-01-01", "ES", 5000), T("2026-01-01", "ES", 5000)];
    const { merged, report } = mergeUnique([], incoming);
    expect(merged).toHaveLength(1);
    expect(report.skipped).toHaveLength(1);
  });

  it("preserves existing trades unchanged", () => {
    const existing = [T("2026-01-01", "ES", 5000)];
    const { merged } = mergeUnique(existing, []);
    expect(merged).toEqual(existing);
  });
});
