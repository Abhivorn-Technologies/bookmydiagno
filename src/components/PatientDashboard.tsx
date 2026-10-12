"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppointmentBadge, PaymentBadge } from "./Badges";
import { formatINR } from "@/lib/format";
import { formatDateLabel, formatSlot, todayIST } from "@/lib/time";
import { label } from "@/lib/constants";
import type { AppointmentDTO } from "@/types";

type Tab = "upcoming" | "previous" | "cancelled" | "all";

export function PatientDashboard({ user, bookings }: { user: { name: string; phone: string; phoneVerified: boolean }; bookings: AppointmentDTO[] }) {
  const today = todayIST();
  const groups = useMemo(() => {
    const upcoming = bookings
      .filter((b) => b.appointmentDate >= today && ["BOOKED", "CONFIRMED"].includes(b.appointmentStatus))
      .sort((a, b) => (a.appointmentDate + a.timeSlot).localeCompare(b.appointmentDate + b.timeSlot));
    const cancelled = bookings.filter((b) => b.appointmentStatus === "CANCELLED");
    const previous = bookings.filter((b) => !upcoming.includes(b) && b.appointmentStatus !== "CANCELLED");
    return { upcoming, previous, cancelled, all: bookings };
  }, [bookings, today]);
  const [tab, setTab] = useState<Tab>(groups.upcoming.length ? "upcoming" : "all");
  const list = groups[tab];
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <div className="spread" style={{ alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: 4 }}>Hello, {firstName}</h1>
          <p className="muted" style={{ margin: 0 }}>Here are your bookings and receipts.</p>
        </div>
        <Link href="/tests" className="btn">Book a new test</Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 24, alignItems: "start" }} id="dash-grid">
        <section>
          <div className="tabs" role="tablist" aria-label="Bookings">
            {(["upcoming", "previous", "cancelled", "all"] as Tab[]).map((t) => (
              <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === "all" ? "Booking history" : t[0].toUpperCase() + t.slice(1)} ({groups[t].length})
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <div className="empty">
              <h3>{tab === "upcoming" ? "No upcoming appointments" : tab === "cancelled" ? "No cancelled bookings" : "No bookings yet"}</h3>
              <p className="muted">When you book a test, it will appear here with its receipt.</p>
              <Link href="/tests" className="btn btn-ghost">Browse tests</Link>
            </div>
          ) : (
            <div className="stack">
              {list.map((b) => (
                <article key={b.id} className="card booking-item">
                  <div>
                    <div className="when">{formatDateLabel(b.appointmentDate)}, {formatSlot(b.timeSlot)}</div>
                    <div className="muted small">{b.branchName} · Ref {b.bookingReference}</div>
                    <div style={{ marginTop: 6 }}>{b.tests.map((t) => t.name).join(", ")}</div>
                    <div className="row" style={{ marginTop: 8, gap: 6 }}>
                      <AppointmentBadge status={b.appointmentStatus} />
                      <PaymentBadge status={b.paymentStatus} />
                      <span className="chip chip-outline">{label(b.paymentMode)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="money" style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "1.15rem" }}>{formatINR(b.totalAmount)}</div>
                    <Link href={`/dashboard/bookings/${b.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>View details</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <aside className="card">
          <h3>Your profile</h3>
          <dl className="kv" style={{ gridTemplateColumns: "1fr", gap: 2 }}>
            <dt>Name</dt><dd style={{ marginBottom: 10 }}>{user.name}</dd>
            <dt>Mobile number</dt>
            <dd>{user.phone} {!user.phoneVerified && <span className="badge" style={{ marginLeft: 4 }}>Not verified</span>}</dd>
          </dl>
          {!user.phoneVerified && <p className="small muted" style={{ marginTop: 10 }}>Phone verification isn’t available in this version, so your number hasn’t been verified by OTP.</p>}
          <hr className="divider" />
          <p className="small muted" style={{ margin: 0 }}>Total bookings: <strong>{bookings.length}</strong></p>
        </aside>
      </div>
      <style>{`@media (max-width: 860px){ #dash-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
