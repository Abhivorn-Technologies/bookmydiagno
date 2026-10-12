"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "./useApi";
import { AppointmentBadge, PaymentBadge } from "../Badges";
import { APPOINTMENT_STATUSES, PAYMENT_STATUSES, label } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { formatDateLabel, formatSlot } from "@/lib/time";
import type { AppointmentDTO, BranchDTO } from "@/types";

const FILTER_KEYS = ["q", "date", "from", "to", "branchId", "appointmentStatus", "paymentStatus", "bookingSource", "page"] as const;

export function BookingsList() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const branches = useApi<{ branches: BranchDTO[] }>("/api/admin/branches");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) sp.set(k, v);
    }
    return sp;
  }, [params]);
  const { data, error, loading } = useApi<{ bookings: AppointmentDTO[]; total: number; page: number; pages: number }>(`/api/admin/bookings?${query}`);

  function setFilter(key: string, value: string) {
    const sp = new URLSearchParams(query);
    if (value) sp.set(key, value);
    else sp.delete(key);
    if (key !== "page") sp.delete("page");
    if (key === "date" && value) { sp.delete("from"); sp.delete("to"); }
    router.replace(`/admin/bookings${sp.size ? `?${sp}` : ""}`);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q.trim()) setFilter("q", q.trim());
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const exportQuery = new URLSearchParams(query);
  exportQuery.delete("page");
  exportQuery.set("format", "csv");

  return (
    <>
      <div className="toolbar">
        <div className="field" style={{ flex: "1 1 240px" }}>
          <label htmlFor="bq" className="small">Search</label>
          <input id="bq" className="input" placeholder="Reference, patient name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bdate" className="small">Appointment date</label>
          <input id="bdate" type="date" className="input" value={params.get("date") ?? ""} onChange={(e) => setFilter("date", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bbranch" className="small">Branch</label>
          <select id="bbranch" className="select" value={params.get("branchId") ?? ""} onChange={(e) => setFilter("branchId", e.target.value)}>
            <option value="">All branches</option>
            {branches.data?.branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isActive ? "" : " (inactive)"}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bstatus" className="small">Appointment</label>
          <select id="bstatus" className="select" value={params.get("appointmentStatus") ?? ""} onChange={(e) => setFilter("appointmentStatus", e.target.value)}>
            <option value="">Any status</option>
            {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bpay" className="small">Payment</label>
          <select id="bpay" className="select" value={params.get("paymentStatus") ?? ""} onChange={(e) => setFilter("paymentStatus", e.target.value)}>
            <option value="">Any payment</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bsrc" className="small">Source</label>
          <select id="bsrc" className="select" value={params.get("bookingSource") ?? ""} onChange={(e) => setFilter("bookingSource", e.target.value)}>
            <option value="">Online &amp; offline</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>
        {query.size > 0 && <button className="btn btn-ghost btn-sm" onClick={() => { setQ(""); router.replace("/admin/bookings"); }}>Clear</button>}
        <a className="btn btn-ghost btn-sm" href={`/api/admin/reports?${exportQuery}`} download>Export CSV</a>
      </div>

      {error && <div className="alert alert-bad" role="alert">{error}</div>}
      {loading && !data && <div className="skeleton" style={{ height: 320 }} />}
      {data && data.bookings.length === 0 && <div className="empty"><h3>No bookings found</h3><p className="muted" style={{ margin: 0 }}>Try removing a filter.</p></div>}
      {data && data.bookings.length > 0 && (
        <>
          <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="table">
              <thead>
                <tr><th>Reference</th><th>Appointment</th><th>Patient</th><th>Branch</th><th>Status</th><th>Payment</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {data.bookings.map((a) => (
                  <tr key={a.id}>
                    <td><Link href={`/admin/bookings/${a.id}`}><strong>{a.bookingReference}</strong></Link><div className="small muted">{label(a.bookingSource)}</div></td>
                    <td>{formatDateLabel(a.appointmentDate)}<div className="small muted">{formatSlot(a.timeSlot)}</div></td>
                    <td>{a.patientName}<div className="small muted">{a.patientPhone}</div></td>
                    <td>{a.branchName}</td>
                    <td><AppointmentBadge status={a.appointmentStatus} /></td>
                    <td><PaymentBadge status={a.paymentStatus} /><div className="small muted">{label(a.paymentMode)}</div></td>
                    <td className="num">{formatINR(a.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span className="small muted">{data.total} bookings · page {data.page} of {data.pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={data.page <= 1} onClick={() => setFilter("page", String(data.page - 1))}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled={data.page >= data.pages} onClick={() => setFilter("page", String(data.page + 1))}>Next</button>
          </div>
        </>
      )}
    </>
  );
}
