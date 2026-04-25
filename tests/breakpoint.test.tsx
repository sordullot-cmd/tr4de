import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBreakpoint, useIsMobile } from "@/lib/hooks/useBreakpoint";

function setWidth(w: number) {
  Object.defineProperty(window, "innerWidth", { value: w, writable: true, configurable: true });
}

describe("useBreakpoint()", () => {
  it("returns 'mobile' below 768px", () => {
    setWidth(500);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("mobile");
  });

  it("returns 'tablet' between 768 and 1023px", () => {
    setWidth(900);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("tablet");
  });

  it("returns 'desktop' at 1024px and above", () => {
    setWidth(1200);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("desktop");
  });
});

describe("useIsMobile()", () => {
  it("returns true at 480px", () => {
    setWidth(480);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false at 1024px", () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});
