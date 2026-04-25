import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

function fireKey(key: string, opts: { altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; target?: EventTarget } = {}) {
  const event = new KeyboardEvent("keydown", { key, altKey: opts.altKey, ctrlKey: opts.ctrlKey, shiftKey: opts.shiftKey, bubbles: true });
  if (opts.target) {
    Object.defineProperty(event, "target", { value: opts.target, writable: false });
  }
  window.dispatchEvent(event);
}

describe("useKeyboardShortcuts()", () => {
  it("fires the handler on a matching key (case-insensitive)", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "k", handler }]));
    fireKey("K");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("respects the alt modifier", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "1", alt: true, handler }]));
    fireKey("1"); // no alt
    expect(handler).not.toHaveBeenCalled();
    fireKey("1", { altKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores events from input/textarea by default", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "k", handler }]));
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireKey("k", { target: input });
    expect(handler).not.toHaveBeenCalled();
    input.remove();
  });

  it("can override the input-ignore behavior with ignoreInInputs: false", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "k", handler, ignoreInInputs: false }]));
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireKey("k", { target: input });
    expect(handler).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it("does not fire when modifier keys do not match", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "s", ctrlOrCmd: true, handler }]));
    fireKey("s"); // no modifier
    expect(handler).not.toHaveBeenCalled();
  });

  it("cleans up the listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts([{ key: "k", handler }]));
    fireKey("k");
    expect(handler).toHaveBeenCalledTimes(1);
    unmount();
    fireKey("k");
    expect(handler).toHaveBeenCalledTimes(1); // not incremented
  });
});
