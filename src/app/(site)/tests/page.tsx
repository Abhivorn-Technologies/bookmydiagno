import { Suspense } from "react";
import { TestCatalog } from "@/components/TestCatalog";
import { BookingBar } from "@/components/BookingBar";

export const metadata = { title: "Tests & packages" };

export default function TestsPage() {
  return (
    <div className="container section-tight">
      <h1 style={{ fontSize: "2.2rem" }}>Tests &amp; packages</h1>
      <p className="lede">All prices are in rupees and include sample collection at the branch. Add the tests you need, then continue to booking.</p>
      <Suspense fallback={<div className="skeleton" style={{ height: 300 }} />}>
        <TestCatalog />
      </Suspense>
      <BookingBar />
    </div>
  );
}
