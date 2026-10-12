"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";

/** Loads JSON from our API and exposes loading / error / reload. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    const res = await api<T>(url);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(res.error);
    setLoading(false);
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
