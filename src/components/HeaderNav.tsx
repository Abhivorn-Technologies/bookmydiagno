"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { CartIcon } from "./Icons";
import { api } from "@/lib/client-api";

export function HeaderNav({ user }: { user: { name: string; role: string } | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();

  useEffect(() => setOpen(false), [pathname]);

  const is = (href: string) => (pathname === href || (href !== "/" && pathname.startsWith(href)) ? "page" : undefined);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm menu-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "Menu"}
      </button>
      <nav id="site-nav" className={`nav ${open ? "open" : ""}`} aria-label="Main">
        <Link href="/tests" aria-current={is("/tests")}>Tests &amp; packages</Link>
        <Link href="/branches" aria-current={is("/branches")}>Branches</Link>
        <Link href="/booking" aria-current={is("/booking")} className="cart-pill">
          <CartIcon /> Booking{cart.ready && cart.ids.length > 0 && <span className="count" aria-label={`${cart.ids.length} tests selected`}>{cart.ids.length}</span>}
        </Link>
        {user?.role === "PATIENT" && <Link href="/dashboard" aria-current={is("/dashboard")}>My bookings</Link>}
        {user?.role === "ADMIN" && <Link href="/admin">Admin panel</Link>}
        {user ? (
          <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
        ) : (
          <>
            <Link href="/login" aria-current={is("/login")}>Log in</Link>
            <Link href="/register" className="btn btn-sm" style={{ color: "#fff" }}>Register</Link>
          </>
        )}
      </nav>
    </>
  );
}
