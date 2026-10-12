import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches } from "@/lib/queries";
import { env } from "@/lib/env";
import { BookingWizard } from "@/components/BookingWizard";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book a test" };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const [user, branches, sp] = await Promise.all([getCurrentUser(), getActiveBranches(), searchParams]);
  if (user?.role === "ADMIN") {
    return (
      <div className="container section">
        <div className="alert alert-info">You’re signed in as an administrator. Create bookings for patients from the <Link href="/admin/bookings/new">admin panel</Link>.</div>
      </div>
    );
  }
  return (
    <div className="container section-tight">
      <h1 style={{ fontSize: "2.2rem" }}>Book your tests</h1>
      <BookingWizard
        user={user ? { name: user.name, phone: user.phone } : null}
        branches={branches}
        initialBranchId={sp.branch ?? null}
        payAtBranchEnabled={env.payAtBranchEnabled()}
        windowDays={env.bookingWindowDays()}
      />
    </div>
  );
}
