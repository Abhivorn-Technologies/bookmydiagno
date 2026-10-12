import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  return (
    <div className="container">
      <div className="auth-wrap">
        <h1 style={{ fontSize: "2rem" }}>Log in</h1>
        <p className="muted">Use the mobile number and password you registered with.</p>
        <div className="card"><Suspense><LoginForm portal="patient" /></Suspense></div>
      </div>
    </div>
  );
}
