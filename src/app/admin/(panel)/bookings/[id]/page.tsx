import { AdminBookingDetail } from "@/components/admin/AdminBookingDetail";

export const metadata = { title: "Booking" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminBookingDetail id={id} />;
}
