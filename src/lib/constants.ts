// Shared enums used by both server and client code. No server imports here.

export const ROLES = ["PATIENT", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const APPOINTMENT_STATUSES = [
  "BOOKED",
  "CONFIRMED",
  "SAMPLE_COLLECTED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Allowed appointment status changes. Anything not listed here is rejected by the server. */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  BOOKED: ["CONFIRMED", "SAMPLE_COLLECTED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["SAMPLE_COLLECTED", "COMPLETED", "CANCELLED", "NO_SHOW"],
  SAMPLE_COLLECTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUND_PENDING", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** How the patient chose to pay for the booking. */
export const BOOKING_PAYMENT_MODES = ["ONLINE", "PAY_AT_BRANCH"] as const;
export type BookingPaymentMode = (typeof BOOKING_PAYMENT_MODES)[number];

/** The actual instrument used for a recorded payment. */
export const PAYMENT_METHODS = ["DUMMY_ONLINE", "CASH", "UPI", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const OFFLINE_PAYMENT_METHODS = ["CASH", "UPI", "CARD", "OTHER"] as const;

export const PAYMENT_PROVIDERS = ["DUMMY", "OFFLINE"] as const;
export const PAYMENT_TYPES = ["CHARGE", "REFUND"] as const;
export const PAYMENT_RECORD_STATUSES = ["CREATED", "SUCCESS", "FAILED", "CANCELLED"] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export const BOOKING_SOURCES = ["ONLINE", "OFFLINE"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const COLLECTION_METHODS = ["BRANCH_VISIT", "HOME_COLLECTION"] as const;
export type CollectionMethod = (typeof COLLECTION_METHODS)[number];

export const TEST_KINDS = ["TEST", "PACKAGE"] as const;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const STATUS_LABELS: Record<string, string> = {
  BOOKED: "Booked",
  CONFIRMED: "Confirmed",
  SAMPLE_COLLECTED: "Sample collected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
  ONLINE: "Online",
  OFFLINE: "Offline",
  PAY_AT_BRANCH: "Pay at branch",
  BRANCH_VISIT: "Branch visit",
  HOME_COLLECTION: "Home collection",
  DUMMY_ONLINE: "Demo online payment",
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card (at counter)",
  OTHER: "Other",
};

export const label = (value: string | null | undefined) => (value ? STATUS_LABELS[value] ?? value : "—");
