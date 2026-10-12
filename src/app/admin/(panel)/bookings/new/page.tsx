import { OfflineBookingForm } from "@/components/admin/OfflineBookingForm";

export const metadata = { title: "New walk-in booking" };

export default function NewBookingPage() {
  return (
    <>
      <div className="admin-top">
        <div><h1>New walk-in booking</h1><p className="muted" style={{ margin: 0 }}>Book on behalf of a patient at the counter or over the phone.</p></div>
      </div>
      <OfflineBookingForm />
    </>
  );
}
