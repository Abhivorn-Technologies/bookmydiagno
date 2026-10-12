"use client";

import { useState } from "react";
import { useApi } from "./useApi";
import { formatINR } from "@/lib/format";
import { addDays, formatDateLabel, todayIST } from "@/lib/time";
import type { BranchDTO, DashboardStats } from "@/types";

type Agg = { key: string; label: string; bookings: number; cancelled: number; value: number; collected: number; pending: number };

export function Reports() {
  const today = todayIST();
  const [from, setFrom] = useState(addDays(today, -29));
  const [to, setTo] = useState(today);
  const [branchId, setBranchId] = useState("");
  const branches = useApi<{ branches: BranchDTO[] }>("/api/admin/branches");
  const qs = new URLSearchParams({ from, to, ...(branchId ? { branchId } : {}) });
  const { data, error, loading } = useApi<{ stats: DashboardStats; byBranch: Agg[]; byDay: Agg[] }>(`/api/admin/reports?${qs}`);
  const csv = new URLSearchParams(qs);
  csv.set("format", "csv");

  const table = (rows: Agg[], first: string, fmt: (a: Agg) => string) => (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>{first}</th><th className="num">Bookings</th><th className="num">Cancelled</th><th className="num">Booking value</th><th className="num">Collected (net)</th><th className="num">Pending</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}><td>{fmt(r)}</td><td className="num">{r.bookings}</td><td className="num">{r.cancelled}</td><td className="num">{formatINR(r.value)}</td><td className="num">{formatINR(r.collected)}</td><td className="num">{formatINR(r.pending)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="toolbar">
        <div className="field"><label htmlFor="rf" className="small">From (appointment date)</label><input id="rf" type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field"><label htmlFor="rt" className="small">To</label><input id="rt" type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="field"><label htmlFor="rb" className="small">Branch</label>
          <select id="rb" className="select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {branches.data?.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select></div>
        <a className="btn btn-ghost btn-sm" href={`/api/admin/reports?${csv}`} download>Download CSV</a>
      </div>
      {error && <div className="alert alert-bad">{error}</div>}
      {loading && !data && <div className="skeleton" style={{ height: 300 }} />}
      {data && (
        <div className="stack" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="stat-grid">
            <div className="stat"><div className="k">Bookings</div><div className="v">{data.stats.totalBookings}</div><div className="note">{data.stats.cancelledBookings} cancelled</div></div>
            <div className="stat stat-money"><div className="k">Booking value</div><div className="v">{formatINR(data.stats.totalBookingValue)}</div></div>
            <div className="stat stat-good"><div className="k">Collected (net)</div><div className="v">{formatINR(data.stats.paymentsCollected)}</div><div className="note">Gross {formatINR(data.stats.grossCollected)} − refunds {formatINR(data.stats.refundsPaid)}</div></div>
            <div className="stat stat-warn"><div className="k">Pending</div><div className="v">{formatINR(data.stats.pendingPayments)}</div></div>
            <div className="stat"><div className="k">Refunds due</div><div className="v">{formatINR(data.stats.refundsDue)}</div></div>
            <div className="stat"><div className="k">Online / offline</div><div className="v">{data.stats.onlineBookings} / {data.stats.offlineBookings}</div></div>
          </div>
          <h2 style={{ fontSize: "1.25rem", marginTop: 12 }}>By branch</h2>
          {data.byBranch.length ? table(data.byBranch, "Branch", (r) => r.label) : <div className="empty">No bookings in this period.</div>}
          <h2 style={{ fontSize: "1.25rem", marginTop: 12 }}>By day</h2>
          {data.byDay.length ? table(data.byDay, "Date", (r) => formatDateLabel(r.key)) : <div className="empty">No bookings in this period.</div>}
        </div>
      )}
    </>
  );
}
