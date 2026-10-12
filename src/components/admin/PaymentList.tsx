"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "./useApi";
import { PaymentBadge } from "../Badges";
import { label } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/format";
import type { PaymentDTO } from "@/types";

export function PaymentList() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [provider, setProvider] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, error, loading } = useApi<{ payments: PaymentDTO[]; total: number; page: number; pages: number }>(
    `/api/admin/payments?q=${encodeURIComponent(dq)}&status=${status}&type=${type}&provider=${provider}&page=${page}`
  );

  return (
    <>
      <div className="alert alert-info">To record a payment received at the counter, open the booking and use <strong>Record payment received</strong>. Online payments are in demo mode.</div>
      <div className="toolbar">
        <div className="field" style={{ flex: "1 1 240px" }}><label htmlFor="payq" className="small">Search</label><input id="payq" className="input" placeholder="Booking or payment reference" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="field"><label htmlFor="pst" className="small">Status</label>
          <select id="pst" className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Any</option><option value="SUCCESS">Successful</option><option value="FAILED">Failed</option><option value="CANCELLED">Cancelled</option><option value="CREATED">Awaiting payment</option>
          </select></div>
        <div className="field"><label htmlFor="pty" className="small">Type</label>
          <select id="pty" className="select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">Payments &amp; refunds</option><option value="CHARGE">Payments</option><option value="REFUND">Refunds</option>
          </select></div>
        <div className="field"><label htmlFor="ppr" className="small">Channel</label>
          <select id="ppr" className="select" value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}>
            <option value="">All</option><option value="DUMMY">Demo online</option><option value="OFFLINE">Recorded by staff</option>
          </select></div>
      </div>
      {error && <div className="alert alert-bad">{error}</div>}
      {loading && !data && <div className="skeleton" style={{ height: 240 }} />}
      {data && data.payments.length === 0 && <div className="empty">No payment records match.</div>}
      {data && data.payments.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Booking</th><th>Payment reference</th><th>Type</th><th>Method</th><th className="num">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="small">{formatDateTime(p.createdAt)}</td>
                    <td><Link href={`/admin/bookings/${p.appointmentId}`}>{p.bookingReference}</Link></td>
                    <td className="small">{p.paymentReference}{p.failureReason && <div className="muted">{p.failureReason}</div>}</td>
                    <td>{p.type === "REFUND" ? "Refund" : "Payment"}</td>
                    <td>{label(p.paymentMode)}</td>
                    <td className="num">{p.type === "REFUND" ? "−" : ""}{formatINR(p.amount)}</td>
                    <td><PaymentBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span className="small muted">{data.total} records · page {data.page} of {data.pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </>
  );
}
