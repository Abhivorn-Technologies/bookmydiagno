import { label } from "@/lib/constants";

const appointmentTone: Record<string, string> = {
  BOOKED: "badge-blue",
  CONFIRMED: "badge-teal",
  SAMPLE_COLLECTED: "badge-teal",
  COMPLETED: "badge-ok",
  CANCELLED: "badge-bad",
  NO_SHOW: "",
};
const paymentTone: Record<string, string> = {
  PENDING: "badge-warn",
  PAID: "badge-ok",
  FAILED: "badge-bad",
  REFUND_PENDING: "badge-warn",
  REFUNDED: "",
  CREATED: "badge-warn",
  SUCCESS: "badge-ok",
  CANCELLED: "",
};

export function AppointmentBadge({ status }: { status: string }) {
  return <span className={`badge ${appointmentTone[status] ?? ""}`}>{label(status)}</span>;
}

export function PaymentBadge({ status }: { status: string }) {
  const text = status === "SUCCESS" ? "Successful" : status === "CREATED" ? "Awaiting payment" : label(status);
  return <span className={`badge ${paymentTone[status] ?? ""}`}>{text}</span>;
}
