import { BranchForm } from "@/components/admin/BranchForm";

export const metadata = { title: "Add branch" };

export default function Page() {
  return (
    <>
      <div className="admin-top"><h1>Add branch</h1></div>
      <BranchForm />
    </>
  );
}
