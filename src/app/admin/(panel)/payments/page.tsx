import { PaymentList } from "@/components/admin/PaymentList";

export const metadata = { title: "Payments" };

export default function Page() {
  return (
    <>
      <div className="admin-top"><div><h1>Payments</h1><p className="muted" style={{ margin: 0 }}>Every payment attempt, counter collection and refund.</p></div></div>
      <PaymentList />
    </>
  );
}
