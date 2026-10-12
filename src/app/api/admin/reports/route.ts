import { route, ok } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { bookingFilterSchema, searchParamsToObject } from "@/lib/validation";
import { buildBookingQuery, getDashboardStats } from "@/lib/stats";
import { label } from "@/lib/constants";
import { Appointment } from "@/models/Appointment";

export const dynamic = "force-dynamic";

function csvCell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET = route(async (req) => {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const f = bookingFilterSchema.parse({ ...searchParamsToObject(sp), page: 1, limit: 100 });
  await connectDB();
  const query = buildBookingQuery(f);

  if (sp.get("format") === "csv") {
    const rows = await Appointment.find(query).sort({ appointmentDate: 1, timeSlot: 1 }).limit(10_000).lean();
    const header = ["Booking Ref", "Date", "Time", "Branch", "Patient", "Phone", "Tests", "Total (INR)", "Paid (INR)", "Refunded (INR)", "Appointment Status", "Payment Status", "Payment Mode", "Source", "Collection", "Booked At", "Cancellation Reason"];
    const lines = rows.map((a) => [
      a.bookingReference, a.appointmentDate, a.timeSlot, a.branchNameSnapshot, a.patientNameSnapshot, a.patientPhoneSnapshot,
      a.tests.map((t) => `${t.name} (${t.price})`).join("; "), a.totalAmount, a.amountPaid ?? 0, a.amountRefunded ?? 0,
      label(a.appointmentStatus), label(a.paymentStatus), label(a.paymentMode), label(a.bookingSource), label(a.collectionMethod),
      a.createdAt instanceof Date ? a.createdAt.toISOString() : "", a.cancellationReason ?? "",
    ].map(csvCell).join(","));
    const body = "﻿" + [header.join(","), ...lines].join("\r\n");
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bookmydiagno-bookings-${f.from ?? f.date ?? "all"}${f.to ? `-to-${f.to}` : ""}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const [stats, rows] = await Promise.all([
    getDashboardStats({ from: f.from ?? f.date, to: f.to ?? f.date, branchId: f.branchId }),
    Appointment.find(query).select("branchId branchNameSnapshot appointmentDate appointmentStatus totalAmount amountPaid amountRefunded paymentStatus bookingSource").lean(),
  ]);

  type Agg = { key: string; label: string; bookings: number; cancelled: number; value: number; collected: number; pending: number };
  const blank = (key: string, lbl: string): Agg => ({ key, label: lbl, bookings: 0, cancelled: 0, value: 0, collected: 0, pending: 0 });
  const byBranch = new Map<string, Agg>();
  const byDay = new Map<string, Agg>();
  for (const a of rows) {
    const bKey = String(a.branchId);
    const b = byBranch.get(bKey) ?? blank(bKey, a.branchNameSnapshot);
    const d = byDay.get(a.appointmentDate) ?? blank(a.appointmentDate, a.appointmentDate);
    for (const agg of [b, d]) {
      agg.bookings += 1;
      agg.collected += (a.amountPaid ?? 0) - (a.amountRefunded ?? 0);
      if (a.appointmentStatus === "CANCELLED") agg.cancelled += 1;
      else {
        agg.value += a.totalAmount;
        if (a.paymentStatus === "PENDING" || a.paymentStatus === "FAILED") agg.pending += a.totalAmount - (a.amountPaid ?? 0);
      }
    }
    byBranch.set(bKey, b);
    byDay.set(a.appointmentDate, d);
  }
  const round = (x: Agg) => ({ ...x, value: Math.round(x.value * 100) / 100, collected: Math.round(x.collected * 100) / 100, pending: Math.round(x.pending * 100) / 100 });
  return ok({
    stats,
    byBranch: [...byBranch.values()].map(round).sort((a, b) => b.value - a.value),
    byDay: [...byDay.values()].map(round).sort((a, b) => a.key.localeCompare(b.key)),
  });
});
