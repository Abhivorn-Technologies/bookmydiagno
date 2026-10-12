"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

/** Floating reminder that tests are waiting in the booking. */
export function BookingBar() {
  const cart = useCart();
  if (!cart.ready || cart.ids.length === 0) return null;
  return (
    <div className="no-print" style={{ position: "sticky", bottom: 16, marginTop: 24, zIndex: 20 }}>
      <div className="card spread" style={{ boxShadow: "var(--shadow-lift)", borderColor: "#b9d1e8" }}>
        <strong>{cart.ids.length} {cart.ids.length === 1 ? "test" : "tests"} selected</strong>
        <Link href="/booking" className="btn">Continue to booking</Link>
      </div>
    </div>
  );
}
