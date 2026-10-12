"use client";

import Link from "next/link";
import { useApi } from "./useApi";
import { useToast } from "../Toaster";
import { api } from "@/lib/client-api";
import { formatSlot } from "@/lib/time";
import type { BranchDTO } from "@/types";

export function BranchList() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ branches: BranchDTO[] }>("/api/admin/branches");

  async function toggle(b: BranchDTO) {
    const res = await api(`/api/admin/branches/${b.id}`, { method: "PATCH", json: { isActive: !b.isActive } });
    if (!res.ok) return toast(res.error, "bad");
    toast(b.isActive ? `${b.name} deactivated` : `${b.name} activated`);
    reload();
  }

  if (loading && !data) return <div className="skeleton" style={{ height: 240 }} />;
  if (error) return <div className="alert alert-bad">{error}</div>;
  if (!data?.branches.length) return (
    <div className="empty"><h3>No branches yet</h3><p className="muted">Add your first branch so patients can book.</p><Link className="btn" href="/admin/branches/new">Add branch</Link></div>
  );
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Branch</th><th>Address</th><th>Hours</th><th>Slots</th><th>Map</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {data.branches.map((b) => (
            <tr key={b.id}>
              <td><Link href={`/admin/branches/${b.id}`}><strong>{b.name}</strong></Link><div className="small muted">{b.branchCode} · {b.phone}</div></td>
              <td className="small">{b.address}, {b.city}, {b.state} {b.pincode}</td>
              <td className="small">{formatSlot(b.openingHours.open)}–{formatSlot(b.openingHours.close)}</td>
              <td className="small">{b.slotCapacity} per {b.slotDurationMinutes} min{b.homeCollection && <div><span className="chip">Home collection</span></div>}</td>
              <td className="small">{b.latitude !== null ? "Set" : <span className="badge badge-warn">Missing</span>}</td>
              <td><span className={`badge ${b.isActive ? "badge-ok" : ""}`}>{b.isActive ? "Active" : "Inactive"}</span></td>
              <td><button className="btn btn-ghost btn-sm" onClick={() => toggle(b)}>{b.isActive ? "Deactivate" : "Activate"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
