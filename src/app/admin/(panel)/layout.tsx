import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin · BookMyDiagno" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  return <AdminShell user={{ name: user.name, phone: user.phone }}>{children}</AdminShell>;
}
