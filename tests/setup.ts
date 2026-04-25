import "@testing-library/jest-dom/vitest";

// Polyfill localStorage if jsdom does not provide a full Storage API
if (typeof window !== "undefined") {
  const hasFullStorage =
    typeof window.localStorage?.removeItem === "function" &&
    typeof window.localStorage?.clear === "function";
  if (!hasFullStorage) {
    const store = new Map<string, string>();
    const storage: Storage = {
      get length() { return store.size; },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
    };
    Object.defineProperty(window, "localStorage", { value: storage, writable: true, configurable: true });
  }
}
