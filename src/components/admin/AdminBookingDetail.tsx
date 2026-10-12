"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "./useApi";
import { useToast } from "../Toaster";
import { BookingReceipt } from "../BookingReceipt";
import { PaymentBadge } from "../Badges";
import { api } from "@/lib/client-api";
import { APPOINTMENT_TRANSITIONS, OFFLINE_PAYMENT_METHODS, label, type AppointmentStatus } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/format";
import type { AppointmentDTO, PaymentDTO } from "@/types";

export function AdminBookingDetail({ id }: { id: string }) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ appointment: AppointmentDTO; payments: PaymentDTO[] }>(`/api/admin/bookings/${id}`);
  const [status, setStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [method, setMethod] = useState<string>("CASH");
  const [payNote, setPayNote] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading && !data) return <div className="skeleton" style={{ height: 400 }} />;
  if (error) return <div className="alert alert-bad">{error} <Link href="/admin/bookings">Back to bookings</Link></div>;
  if (!data) return null;
  const a = data.appointment;
  const nextStatuses = APPOINTMENT_TRANSITIONS[a.appointmentStatus as AppointmentStatus].filter((s) => s !== "CANCELLED");
  const canCancel = APPOINTMENT_TRANSITIONS[a.appointmentStatus as AppointmentStatus].includes("CANCELLED");
  const due = ["PENDING", "FAILED"].includes(a.paymentStatus) && a.appointmentStatus !== "CANCELLED";
  const refundDue = a.paymentStatus === "REFUND_PENDING";

  async function run(key: string, url: string, init: { method: string; json: unknown }, success: string) {
    setBusy(key);
    setActionError(null);
    const res = await api(url, init);
    setBusy(null);
    if (!res.ok) {
      setActionError(res.fieldErrors ? Object.values(res.fieldErrors)[0] : res.error);
      return false;
    }
    toast(success);
    await reload();
    return true;
  }

  return (
    <>
      <div className="admin-top no-print">
        <div>
          <p className="small" style={{ margin: 0 }}><Link href="/admin/bookings">Bookings</Link> / {a.bookingReference}</p>
          <h1>{a.bookingReference}</h1>
        </div>
        <div className="row">
          {a.patientId && <Link href={`/admin/patients/${a.patientId}`} className="btn btn-ghost">Patient history</Link>}
          <button className="btn btn-ghost" onClick={() => window.print()}>Print receipt</button>
        </div>
      </div>
      {actionError && <div className="alert alert-bad no-print" role="alert">{actionError}</div>}

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, alignItems: "start" }} id="bd-grid">
        <div style={{ minWidth: 0 }}>
          <BookingReceipt appointment={a} />
          <section className="no-print" style={{ marginTop: 24 }}>
            <h3>Payments</h3>
            {data.payments.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}>No payment records yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>When</th><th>Reference</th><th>Type</th><th>Method</th><th className="num">Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="small">{formatDateTime(p.createdAt)}</td>
                        <td className="small">{p.paymentReference}{p.failureReason && <div className="muted">{p.failureReason}</div>}{p.note && <div className="muted">Note: {p.note}</div>}</td>
                        <td>{p.type === "REFUND" ? "Refund" : "Payment"}<div className="small muted">{p.provider === "DUMMY" ? "Demo online" : "Recorded by staff"}</div></td>
                        <td>{label(p.paymentMode)}</td>
                        <td className="num">{formatINR(p.amount)}</td>
                        <td><PaymentBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {a.statusHistory.length > 0 && (
            <section className="no-print" style={{ marginTop: 24 }}>
              <h3>Status history</h3>
              <ul className="line-items card" style={{ padding: "4px 16px" }}>
                {a.statusHistory.map((h, i) => (
                  <li key={i}>
                    <span>{h.from ? `${label(h.from)} → ` : ""}<strong>{label(h.to)}</strong>{h.note && <span className="muted"> — {h.note}</span>}</span>
                    <span className="small muted">{formatDateTime(h.at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="stack no-print">
          {nextStatuses.length > 0 && (
            <div className="card">
              <h3>Update appointment</h3>
              <div className="field">
                <label htmlFor="st">New status</label>
                <select id="st" className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Choose…</option>
                  {nextStatuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="stn">Note (optional)</label>
                <input id="stn" className="input" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
              </div>
              <button className="btn btn-block" disabled={!status || busy === "status"} onClick={async () => {
                if (await run("status", `/api/admin/bookings/${a.id}`, { method: "PATCH", json: { action: "status", status, note: statusNote } }, `Marked as ${label(status).toLowerCase()}`)) { setStatus(""); setStatusNote(""); }
              }}>{busy === "status" ? "Saving…" : "Update status"}</button>
            </div>
          )}

          {(due || refundDue) && (
            <div className="card">
              <h3>{refundDue ? "Record refund" : "Record payment received"}</h3>
              <p className="small muted">
                {refundDue
                  ? <>Patient paid {formatINR(a.amountPaid - a.amountRefunded)} before cancelling. Record it here once the money has been returned.</>
                  : <>Amount due: <strong className="money">{formatINR(a.totalAmount - a.amountPaid)}</strong>. Only record this after the money has actually been received.</>}
              </p>
              <div className="field">
                <label htmlFor="pm">Method</label>
                <select id="pm" className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {OFFLINE_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="pn">Note (optional)</label>
                <input id="pn" className="input" placeholder="e.g. UPI transaction ID" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              </div>
              <button className={`btn btn-block ${refundDue ? "" : "btn-teal"}`} disabled={busy === "pay"} onClick={async () => {
                if (await run("pay", `/api/admin/payments/${a.id}/record`, { method: "POST", json: { type: refundDue ? "REFUND" : "CHARGE", method, note: payNote } }, refundDue ? "Refund recorded" : "Payment recorded")) setPayNote("");
              }}>{busy === "pay" ? "Saving…" : refundDue ? "Record refund" : "Record payment"}</button>
            </div>
          )}

          <div className="card">
            <h3>Internal notes</h3>
            <textarea className="textarea" aria-label="Internal notes" value={notes ?? a.notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} disabled={notes === null || busy === "notes"} onClick={async () => {
              if (await run("notes", `/api/admin/bookings/${a.id}`, { method: "PATCH", json: { action: "notes", notes: notes ?? "" } }, "Notes saved")) setNotes(null);
            }}>Save notes</button>
          </div>

          {canCancel && (
            <div className="card">
              <h3>Cancel booking</h3>
              {!cancelOpen ? (
                <button className="btn btn-danger btn-block" onClick={() => setCancelOpen(true)}>Cancel this booking</button>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="cr">Reason</label>
                    <textarea id="cr" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>
                  {a.paymentStatus === "PAID" && <p className="small muted">This booking is paid — it will be marked “Refund pending”.</p>}
                  <div className="row">
                    <button className="btn btn-ghost" onClick={() => setCancelOpen(false)}>Keep</button>
                    <button className="btn btn-danger" disabled={reason.trim().length < 3 || busy === "cancel"} onClick={async () => {
                      if (await run("cancel", `/api/admin/bookings/${a.id}`, { method: "PATCH", json: { action: "cancel", reason } }, "Booking cancelled")) { setCancelOpen(false); setReason(""); }
                    }}>{busy === "cancel" ? "Cancelling…" : "Confirm cancellation"}</button>
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
      <style>{`@media (max-width: 1100px){ #bd-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
