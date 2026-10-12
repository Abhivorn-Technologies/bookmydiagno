"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "./useApi";
import { formatDateTime } from "@/lib/format";

type Row = { id: string; name: string; phone: string; phoneVerified: boolean; isActive: boolean; createdAt: string; bookingCount: number };

export function PatientList() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, loading } = useApi<{ patients: Row[]; total: number; page: number; pages: number }>(`/api/admin/patients?q=${encodeURIComponent(debounced)}&page=${page}`);

  return (
    <>
      <div className="toolbar">
        <div className="field" style={{ flex: "1 1 280px" }}><label htmlFor="pq" className="small">Search</label><input id="pq" className="input" placeholder="Name or phone number" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {error && <div className="alert alert-bad">{error}</div>}
      {loading && !data && <div className="skeleton" style={{ height: 240 }} />}
      {data && data.patients.length === 0 && <div className="empty"><h3>No patients found</h3><p className="muted" style={{ margin: 0 }}>Patients appear here after they register on the website.</p></div>}
      {data && data.patients.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Phone</th><th>Registered</th><th className="num">Bookings</th></tr></thead>
              <tbody>
                {data.patients.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/admin/patients/${p.id}`}><strong>{p.name}</strong></Link>{!p.isActive && <span className="badge" style={{ marginLeft: 6 }}>Inactive</span>}</td>
                    <td>{p.phone} {!p.phoneVerified && <span className="small muted">(not verified)</span>}</td>
                    <td className="small">{formatDateTime(p.createdAt)}</td>
                    <td className="num">{p.bookingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span className="small muted">{data.total} patients · page {data.page} of {data.pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </>
  );
}
