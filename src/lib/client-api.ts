"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string>; status: number };

/** Thin fetch wrapper for our JSON API that never throws. */
export async function api<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = init;
  try {
    const res = await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = await res.json().catch(() => null);
    if (body && body.ok) return { ok: true, data: body.data as T };
    return {
      ok: false,
      status: res.status,
      error: body?.error ?? (res.status >= 500 ? "The server had a problem. Please try again." : "Request failed."),
      fieldErrors: body?.fieldErrors,
    };
  } catch {
    return { ok: false, status: 0, error: "Couldn't reach the server. Check your internet connection and try again." };
  }
}
