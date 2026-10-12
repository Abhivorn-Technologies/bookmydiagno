"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import { formatINR } from "@/lib/format";
import { formatDateLabel, formatSlot } from "@/lib/time";
import type { AppointmentDTO, PaymentDTO } from "@/types";

type Outcome = "success" | "failure" | "cancel";

export function DemoCheckout({ appointment }: { appointment: AppointmentDTO }) {
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [result, setResult] = useState<{ tone: "bad" | "warn"; text: string } | null>(null);
  const started = useRef(false);

  async function startAttempt() {
    setError(null);
    setPayment(null);
    const res = await api<{ payment: PaymentDTO }>("/api/payments/create", { method: "POST", json: { appointmentId: appointment.id } });
    if (res.ok) setPayment(res.data.payment);
    else setError(res.error);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function simulate(outcome: Outcome) {
    if (!payment) return;
    setBusy(outcome);
    setResult(null);
    const res = await api<{ payment: PaymentDTO; paymentStatus: string }>(`/api/payments/${payment.id}/simulate`, { method: "POST", json: { outcome } });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (outcome === "success") {
      router.push(`/booking/${appointment.id}/confirmation?paid=1`);
      router.refresh();
      return;
    }
    setPayment(null);
    setResult(
      outcome === "failure"
        ? { tone: "bad", text: "Payment failed. Your booking is saved and your slot is held — you can try again or pay at the branch." }
        : { tone: "warn", text: "You cancelled the payment. Your booking is saved; you can pay now or at the branch." }
    );
  }

  return (
    <div className="checkout">
      <div className="demo-banner" role="note">Demo Payment — No Real Money Charged</div>
      <div className="card card-pad-lg">
        <div className="spread" style={{ marginBottom: 12 }}>
          <strong style={{ fontFamily: "var(--font-head)", fontSize: "1.1rem" }}>BookMyDiagno checkout</strong>
          <span className="small muted">{appointment.bookingReference}</span>
        </div>
        <dl className="kv" style={{ gridTemplateColumns: "110px 1fr", marginBottom: 16 }}>
          <dt>Patient</dt><dd>{appointment.patientName}</dd>
          <dt>Branch</dt><dd>{appointment.branchName}</dd>
          <dt>Slot</dt><dd>{formatDateLabel(appointment.appointmentDate)}, {formatSlot(appointment.timeSlot)}</dd>
        </dl>
        <ul className="line-items">
          {appointment.tests.map((t) => <li key={t.testId}><span>{t.name}</span><span className="money">{formatINR(t.price)}</span></li>)}
        </ul>
        <div className="total-row"><span>Amount</span><span className="money">{formatINR(payment?.amount ?? appointment.totalAmount - appointment.amountPaid)}</span></div>

        <hr className="divider" />
        {result && <div className={`alert alert-${result.tone}`} role="status">{result.text}</div>}
        {error && <div className="alert alert-bad" role="alert">{error}</div>}

        {payment ? (
          <>
            <p className="small muted">Payment reference <strong>{payment.paymentReference}</strong>. This demo does not ask for card or UPI details. Choose what the bank should do:</p>
            <div className="stack">
              <button className="btn btn-teal btn-block" disabled={!!busy} onClick={() => simulate("success")}>
                {busy === "success" ? <><span className="spinner" aria-hidden /> Processing…</> : "Simulate successful payment"}
              </button>
              <button className="btn btn-danger btn-block" disabled={!!busy} onClick={() => simulate("failure")}>
                {busy === "failure" ? "Processing…" : "Simulate failed payment"}
              </button>
              <button className="btn btn-ghost btn-block" disabled={!!busy} onClick={() => simulate("cancel")}>
                {busy === "cancel" ? "Cancelling…" : "Cancel payment"}
              </button>
            </div>
          </>
        ) : (
          <div className="stack">
            {!result && !error && <div className="row muted"><span className="spinner" aria-hidden /> Preparing payment…</div>}
            {(result || error) && <button className="btn btn-block" onClick={startAttempt}>Try paying again</button>}
            <Link className="btn btn-ghost btn-block" href={`/booking/${appointment.id}/confirmation`}>I’ll pay at the branch</Link>
          </div>
        )}
      </div>
    </div>
  );
}
