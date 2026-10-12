"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TestCard } from "./TestCard";
import { api } from "@/lib/client-api";
import type { TestDTO } from "@/types";

export function TestCatalog() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [kind, setKind] = useState(params.get("kind") ?? "");
  const [tests, setTests] = useState<TestDTO[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (category) sp.set("category", category);
      if (kind) sp.set("kind", kind);
      router.replace(`/tests${sp.size ? `?${sp}` : ""}`, { scroll: false });
      const res = await api<{ tests: TestDTO[]; categories: string[] }>(`/api/tests?${sp}`);
      if (cancelled) return;
      if (res.ok) {
        setTests(res.data.tests);
        setCategories(res.data.categories);
        setError(null);
      } else setError(res.error);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, category, kind, router]);

  const count = useMemo(() => tests?.length ?? 0, [tests]);

  return (
    <div>
      <div className="search-bar" role="search" style={{ maxWidth: 640 }}>
        <label htmlFor="test-q" className="sr-only">Search tests</label>
        <input id="test-q" className="input" placeholder="Search by test name or code" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        {q && <button className="btn btn-ghost btn-sm" onClick={() => setQ("")} type="button">Clear</button>}
      </div>
      <div className="filters" aria-label="Filter tests">
        <button className="filter-pill" aria-pressed={!kind} onClick={() => setKind("")}>Everything</button>
        <button className="filter-pill" aria-pressed={kind === "TEST"} onClick={() => setKind("TEST")}>Individual tests</button>
        <button className="filter-pill" aria-pressed={kind === "PACKAGE"} onClick={() => setKind("PACKAGE")}>Health packages</button>
        <label className="sr-only" htmlFor="cat">Category</label>
        <select id="cat" className="select" style={{ width: "auto", minHeight: 36, padding: "6px 10px", borderRadius: 999 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-bad" role="alert">{error}</div>}
      {tests === null && !error && (
        <div className="grid grid-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 210 }} />)}</div>
      )}
      {tests && tests.length === 0 && (
        <div className="empty">
          <h3>No tests match your search</h3>
          <p className="muted">Try a shorter name, or clear the filters to see everything we offer.</p>
          <button className="btn btn-ghost" onClick={() => { setQ(""); setCategory(""); setKind(""); }}>Clear filters</button>
        </div>
      )}
      {tests && tests.length > 0 && (
        <>
          <p className="small muted" aria-live="polite">{count} {count === 1 ? "result" : "results"}</p>
          <div className="grid grid-3">{tests.map((t) => <TestCard key={t.id} test={t} />)}</div>
        </>
      )}
    </div>
  );
}
