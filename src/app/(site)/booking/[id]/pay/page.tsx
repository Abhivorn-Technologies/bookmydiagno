import Link from "next/link";
import { loadPatientBooking } from "@/lib/page-data";
import { DemoCheckout } from "@/components/DemoCheckout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment" };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { appointment } = await loadPatientBooking(id, `/booking/${id}/pay`);
  const payable = appointment.paymentMode === "ONLINE" && ["PENDING", "FAILED"].includes(appointment.paymentStatus) && !["CANCELLED", "NO_SHOW"].includes(appointment.appointmentStatus);
  return (
    <div className="container section">
      {payable ? (
        <DemoCheckout appointment={appointment} />
      ) : (
        <div className="checkout card card-pad-lg">
          <h1 style={{ fontSize: "1.6rem" }}>Nothing to pay</h1>
          <p>{appointment.paymentStatus === "PAID" ? "This booking is already paid." : "This booking can’t be paid online right now."}</p>
          <Link className="btn" href={`/booking/${id}/confirmation`}>View booking</Link>
        </div>
      )}
    </div>
  );
}
