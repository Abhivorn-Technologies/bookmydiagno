import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";
import { LogoMark } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin login" };

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") redirect("/admin");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--ink)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="row" style={{ color: "#fff", marginBottom: 18 }}>
          <LogoMark /> <strong style={{ fontFamily: "var(--font-head)", fontSize: "1.2rem" }}>BookMyDiagno admin</strong>
        </div>
        <div className="card card-pad-lg">
          <h1 style={{ fontSize: "1.5rem" }}>Staff sign in</h1>
          {user && <div className="alert alert-warn">You’re signed in as a patient. Log in with an administrator account to continue.</div>}
          <Suspense><LoginForm portal="admin" /></Suspense>
        </div>
        <p className="small" style={{ marginTop: 14 }}><Link href="/" style={{ color: "#c9d6e1" }}>Back to website</Link></p>
      </div>
    </div>
  );
}
