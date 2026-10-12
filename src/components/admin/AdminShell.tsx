"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "../Icons";
import { api } from "@/lib/client-api";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/bookings/new", label: "New walk-in booking" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/patients", label: "Patients" },
  { href: "/admin/tests", label: "Tests & packages" },
  { href: "/admin/branches", label: "Branches" },
  { href: "/admin/reports", label: "Reports" },
];

export function AdminShell({ user, children }: { user: { name: string; phone: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const current = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/bookings") return pathname.startsWith("/admin/bookings") && pathname !== "/admin/bookings/new";
    return pathname.startsWith(href);
  };

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <div className="admin-mobile-bar no-print">
        <Link href="/admin" className="brand"><LogoMark size={26} /> <span>BookMy<b style={{ color: "#5ed3cf" }}>Diagno</b></span></Link>
        <button className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Menu"}</button>
      </div>
      <aside className={`admin-side no-print ${open ? "open" : ""}`}>
        <Link href="/admin" className="brand"><LogoMark size={28} /> <span>BookMy<b>Diagno</b></span></Link>
        <nav className="admin-nav" aria-label="Admin">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={current(n.href) ? "page" : undefined}>{n.label}</Link>
          ))}
        </nav>
        <div className="who">
          <div style={{ color: "#fff", fontWeight: 700 }}>{user.name}</div>
          <div>Administrator</div>
          <div className="row" style={{ marginTop: 10 }}>
            <Link href="/" style={{ color: "#c9d6e1" }}>View website</Link>
            <button className="link-btn" style={{ color: "#c9d6e1" }} onClick={logout}>Log out</button>
          </div>
        </div>
      </aside>
      <main className="admin-main" id="main">{children}</main>
    </div>
  );
}
