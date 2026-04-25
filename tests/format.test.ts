import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/userPrefs", () => ({
  getCurrencySymbol: () => "$",
}));

import { fmt } from "@/lib/ui/format";

describe("fmt()", () => {
  it("formats positive numbers with $ prefix", () => {
    expect(fmt(123.4)).toBe("$123.40");
  });

  it("formats negative numbers with leading minus", () => {
    expect(fmt(-50)).toBe("-$50.00");
  });

  it("adds + sign when sign=true and number is positive", () => {
    expect(fmt(42, true)).toBe("+$42.00");
  });

  it("does not add + when sign=true and number is zero", () => {
    expect(fmt(0, true)).toBe("$0.00");
  });

  it("rounds to 2 decimals", () => {
    expect(fmt(1.234)).toBe("$1.23");
  });

  it("uses absolute value for the number portion", () => {
    expect(fmt(-1234)).toBe("-$1,234.00");
  });
});
