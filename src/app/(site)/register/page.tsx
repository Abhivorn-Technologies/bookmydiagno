import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/AuthForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  return (
    <div className="container">
      <div className="auth-wrap">
        <h1 style={{ fontSize: "2rem" }}>Create your account</h1>
        <p className="muted">It takes a minute, and keeps all your bookings and receipts together.</p>
        <div className="card"><Suspense><RegisterForm /></Suspense></div>
      </div>
    </div>
  );
}
