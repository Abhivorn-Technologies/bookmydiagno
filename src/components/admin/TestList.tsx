"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "./useApi";
import { useToast } from "../Toaster";
import { api } from "@/lib/client-api";
import { formatINR } from "@/lib/format";
import type { TestDTO } from "@/types";

export function TestList() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const { data, error, loading, reload } = useApi<{ tests: TestDTO[] }>(`/api/admin/tests?q=${encodeURIComponent(q)}&status=${status}`);

  async function toggle(t: TestDTO) {
    const res = await api(`/api/admin/tests/${t.id}`, { method: "PATCH", json: { isActive: !t.isActive } });
    if (!res.ok) return toast(res.error, "bad");
    toast(t.isActive ? `${t.name} deactivated` : `${t.name} activated`);
    reload();
  }

  return (
    <>
      <div className="toolbar">
        <div className="field" style={{ flex: "1 1 240px" }}><label htmlFor="tq" className="small">Search</label><input id="tq" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, code or category" /></div>
        <div className="field">
          <label htmlFor="ts" className="small">Status</label>
          <select id="ts" className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      {error && <div className="alert alert-bad">{error}</div>}
      {loading && !data && <div className="skeleton" style={{ height: 240 }} />}
      {data && data.tests.length === 0 && <div className="empty"><h3>No tests found</h3><p className="muted">Add tests so patients can book them.</p><Link className="btn" href="/admin/tests/new">Add test</Link></div>}
      {data && data.tests.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Test</th><th>Category</th><th>Type</th><th className="num">Price</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.tests.map((t) => (
                <tr key={t.id}>
                  <td><Link href={`/admin/tests/${t.id}`}><strong>{t.name}</strong></Link><div className="small muted">{t.testCode}{t.isPopular ? " · Popular" : ""}</div></td>
                  <td>{t.category}</td>
                  <td>{t.kind === "PACKAGE" ? "Package" : "Test"}</td>
                  <td className="num">{formatINR(t.price)}</td>
                  <td><span className={`badge ${t.isActive ? "badge-ok" : ""}`}>{t.isActive ? "Active" : "Inactive"}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => toggle(t)}>{t.isActive ? "Deactivate" : "Activate"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
