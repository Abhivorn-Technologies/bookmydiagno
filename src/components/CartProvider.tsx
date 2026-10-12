"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * The cart only stores test IDs in the browser. Names and prices are always
 * re-fetched and the final total is computed on the server when booking.
 */
type CartCtx = {
  ids: string[];
  ready: boolean;
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  set: (ids: string[]) => void;
};

const KEY = "bmd_cart_v1";
const Ctx = createContext<CartCtx | null>(null);

function readStored(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && /^[a-f\d]{24}$/i.test(x)).slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(readStored());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setIds(readStored());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — cart still works for this page view */
    }
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      ids,
      ready,
      has: (id) => ids.includes(id),
      add: (id) => !ids.includes(id) && persist([...ids, id].slice(0, 20)),
      remove: (id) => persist(ids.filter((x) => x !== id)),
      toggle: (id) => persist(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, 20)),
      clear: () => persist([]),
      set: (next) => persist([...new Set(next)].slice(0, 20)),
    }),
    [ids, ready, persist]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
