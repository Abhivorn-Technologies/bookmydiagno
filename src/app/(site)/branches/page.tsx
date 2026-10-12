import { getActiveBranches } from "@/lib/queries";
import { BranchFinder } from "@/components/BranchFinder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Branches" };

export default async function BranchesPage() {
  const branches = await getActiveBranches();
  return (
    <div className="container section-tight">
      <h1 style={{ fontSize: "2.2rem" }}>Our branches</h1>
      <p className="lede">Find the branch closest to you. Choosing “Use my location” sorts branches by distance; your location is used only for this and is never saved.</p>
      <BranchFinder initialBranches={branches} mode="browse" />
    </div>
  );
}
