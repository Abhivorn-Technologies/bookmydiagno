import type { BranchDoc } from "@/models/Branch";
import type { DiagnosticTestDoc } from "@/models/DiagnosticTest";
import type { AppointmentDoc } from "@/models/Appointment";
import type { PaymentDoc } from "@/models/Payment";
import type { BranchDTO, TestDTO, AppointmentDTO, PaymentDTO } from "@/types";

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? String(d) : null);

export function serializeBranch(b: BranchDoc, opts: { admin?: boolean } = {}): BranchDTO {
  return {
    id: String(b._id),
    name: b.name,
    branchCode: b.branchCode,
    address: b.address,
    city: b.city,
    state: b.state,
    pincode: b.pincode,
    phone: b.phone,
    latitude: b.latitude ?? null,
    longitude: b.longitude ?? null,
    openingHours: { open: b.openingHours.open, close: b.openingHours.close, days: [...(b.openingHours.days ?? [])] },
    services: [...(b.services ?? [])],
    homeCollection: !!b.homeCollection,
    slotDurationMinutes: b.slotDurationMinutes ?? 30,
    slotCapacity: b.slotCapacity ?? 4,
    isActive: !!b.isActive,
    ...(opts.admin ? { createdAt: iso(b.createdAt), updatedAt: iso(b.updatedAt) } : {}),
  };
}

export function serializeTest(t: DiagnosticTestDoc): TestDTO {
  return {
    id: String(t._id),
    name: t.name,
    testCode: t.testCode,
    kind: (t.kind ?? "TEST") as TestDTO["kind"],
    category: t.category,
    description: t.description ?? "",
    preparationInstructions: t.preparationInstructions ?? "",
    includes: [...(t.includes ?? [])],
    reportTime: t.reportTime ?? "",
    price: t.price,
    isPopular: !!t.isPopular,
    isActive: !!t.isActive,
  };
}

export function serializeAppointment(a: AppointmentDoc, opts: { admin?: boolean } = {}): AppointmentDTO {
  return {
    id: String(a._id),
    bookingReference: a.bookingReference,
    patientId: a.patientId ? String(a.patientId) : null,
    patientName: a.patientNameSnapshot,
    patientPhone: a.patientPhoneSnapshot,
    patientAge: a.patientAge ?? null,
    patientGender: a.patientGender ?? null,
    branchId: String(a.branchId),
    branchName: a.branchNameSnapshot,
    branchCode: a.branchCodeSnapshot,
    tests: a.tests.map((t) => ({ testId: String(t.testId), name: t.name, testCode: t.testCode, price: t.price })),
    appointmentDate: a.appointmentDate,
    timeSlot: a.timeSlot,
    collectionMethod: a.collectionMethod as AppointmentDTO["collectionMethod"],
    collectionAddress: a.collectionAddress ?? "",
    bookingSource: a.bookingSource as AppointmentDTO["bookingSource"],
    appointmentStatus: a.appointmentStatus as AppointmentDTO["appointmentStatus"],
    paymentMode: a.paymentMode as AppointmentDTO["paymentMode"],
    paymentStatus: a.paymentStatus as AppointmentDTO["paymentStatus"],
    totalAmount: a.totalAmount,
    amountPaid: a.amountPaid ?? 0,
    amountRefunded: a.amountRefunded ?? 0,
    cancellationReason: a.cancellationReason ?? "",
    cancelledBy: a.cancelledBy ?? null,
    cancelledAt: iso(a.cancelledAt),
    notes: opts.admin ? a.notes ?? "" : "",
    createdAt: iso(a.createdAt)!,
    updatedAt: iso(a.updatedAt)!,
    statusHistory: opts.admin
      ? (a.statusHistory ?? []).map((s) => ({ from: s.from ?? null, to: s.to, note: s.note ?? "", at: iso(s.at)! }))
      : [],
  };
}

export function serializePayment(p: PaymentDoc): PaymentDTO {
  return {
    id: String(p._id),
    appointmentId: String(p.appointmentId),
    bookingReference: p.bookingReference,
    provider: p.provider as PaymentDTO["provider"],
    type: (p.type ?? "CHARGE") as PaymentDTO["type"],
    paymentReference: p.paymentReference,
    gatewayPaymentId: p.gatewayPaymentId ?? null,
    paymentMode: p.paymentMode as PaymentDTO["paymentMode"],
    amount: p.amount,
    status: p.status as PaymentDTO["status"],
    failureReason: p.failureReason ?? "",
    note: p.note ?? "",
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt)!,
  };
}
