"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/client-api";
import { directionsUrl } from "@/lib/geo";
import { WEEKDAYS } from "@/lib/constants";
import { formatSlot } from "@/lib/time";
import { ClockIcon, LocateIcon, PhoneIcon, PinIcon } from "./Icons";
import type { BranchDTO } from "@/types";

type Props = {
  initialBranches: BranchDTO[];
  mode: "browse" | "select";
  limit?: number;
  selectedId?: string | null;
  onSelect?: (b: BranchDTO) => void;
};

export function openingDaysLabel(days: number[]) {
  const sorted = [...days].sort();
  if (sorted.length === 7) return "Every day";
  if (sorted.join() === "1,2,3,4,5,6") return "Mon–Sat";
  if (sorted.join() === "1,2,3,4,5") return "Mon–Fri";
  return sorted.map((d) => WEEKDAYS[d]).join(", ");
}

export function BranchFinder({ initialBranches, mode, limit, selectedId, onSelect }: Props) {
  const [branches, setBranches] = useState<BranchDTO[]>(initialBranches);
  const [nearestId, setNearestId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "warn" | "bad"; text: string } | null>(null);

  function useLocation() {
    if (!("geolocation" in navigator)) {
      setMessage({ tone: "warn", text: "Your browser can’t share location. Search by PIN code, city or branch name instead." });
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Coordinates are only sent to sort branches; they are not saved anywhere.
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        const res = await api<{ branches: BranchDTO[]; nearestId: string | null }>(`/api/branches/nearby?lat=${lat}&lng=${lng}`);
        setLocating(false);
        if (!res.ok) return setMessage({ tone: "bad", text: res.error });
        setBranches(res.data.branches);
        setNearestId(res.data.nearestId);
        setQ("");
        if (!res.data.nearestId) setMessage({ tone: "info", text: "Branch locations haven’t been added yet, so we can’t sort by distance. Search by PIN code or city instead." });
      },
      (err) => {
        setLocating(false);
        setMessage({
          tone: "warn",
          text: err.code === err.PERMISSION_DENIED
            ? "Location access wasn’t allowed. That’s fine — search by PIN code, city or branch name instead."
            : "We couldn’t get your location. Search by PIN code, city or branch name instead.",
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? branches.filter((b) => [b.name, b.city, b.pincode, b.address, b.branchCode].some((f) => f.toLowerCase().includes(term)))
      : branches;
    return limit && !term ? list.slice(0, limit) : list;
  }, [branches, q, limit]);

  if (initialBranches.length === 0) {
    return (
      <div className="empty">
        <h3>No branches are open for booking yet</h3>
        <p className="muted" style={{ margin: 0 }}>Branches will appear here as soon as they are added.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="locate-bar">
        <button type="button" className="btn btn-ghost" onClick={useLocation} disabled={locating}>
          {locating ? <span className="spinner" aria-hidden /> : <LocateIcon />} {locating ? "Finding branches…" : "Use my location"}
        </button>
        <label htmlFor={`branch-q-${mode}`} className="sr-only">Search branches by PIN code, city or name</label>
        <input id={`branch-q-${mode}`} className="input" placeholder="PIN code, city or branch name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {message && <div className={`alert alert-${message.tone}`} role="status">{message.text}</div>}
      {visible.length === 0 ? (
        <div className="empty"><h3>No branch matches “{q}”</h3><p className="muted" style={{ margin: 0 }}>Try a nearby PIN code or just the city name.</p></div>
      ) : (
        <div className="grid grid-3">
          {visible.map((b) => {
            const selected = selectedId === b.id;
            return (
              <article key={b.id} className={`card branch-card ${selected ? "selected" : ""}`}>
                <div className="spread" style={{ alignItems: "flex-start" }}>
                  <h3 style={{ margin: 0 }}>{b.name}</h3>
                  {b.id === nearestId && <span className="badge nearest">Nearest</span>}
                </div>
                {typeof b.distanceKm === "number" && <div className="dist">{b.distanceKm < 1 ? "Under 1 km" : `${b.distanceKm} km`} away</div>}
                <div className="meta">
                  <span><PinIcon /> <span>{b.address}, {b.city}, {b.state} {b.pincode}</span></span>
                  <span><ClockIcon /> <span>{openingDaysLabel(b.openingHours.days)}, {formatSlot(b.openingHours.open)} – {formatSlot(b.openingHours.close)}</span></span>
                  <span><PhoneIcon /> <a href={`tel:${b.phone.replace(/\s/g, "")}`}>{b.phone}</a></span>
                </div>
                {(b.services.length > 0 || b.homeCollection) && (
                  <div className="row" style={{ gap: 6 }}>
                    {b.homeCollection && <span className="chip">Home collection</span>}
                    {b.services.slice(0, 4).map((s) => <span key={s} className="chip chip-outline">{s}</span>)}
                  </div>
                )}
                <div className="row" style={{ marginTop: "auto", paddingTop: 8 }}>
                  {mode === "browse" ? (
                    <Link href={`/booking?branch=${b.id}`} className="btn btn-sm">Book at this branch</Link>
                  ) : (
                    <button type="button" className={`btn btn-sm ${selected ? "btn-teal" : ""}`} aria-pressed={selected} onClick={() => onSelect?.(b)}>
                      {selected ? "Selected" : "Choose this branch"}
                    </button>
                  )}
                  <a className="btn btn-ghost btn-sm" href={directionsUrl(b)} target="_blank" rel="noopener noreferrer">Get directions</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
