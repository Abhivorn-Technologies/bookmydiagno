"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { useToast } from "../Toaster";
import { WEEKDAYS } from "@/lib/constants";
import type { BranchDTO } from "@/types";

type FormState = {
  name: string; branchCode: string; address: string; city: string; state: string; pincode: string; phone: string;
  latitude: string; longitude: string; open: string; close: string; days: number[]; services: string;
  homeCollection: boolean; slotDurationMinutes: string; slotCapacity: string; isActive: boolean;
};

const fromBranch = (b?: BranchDTO): FormState => ({
  name: b?.name ?? "", branchCode: b?.branchCode ?? "", address: b?.address ?? "", city: b?.city ?? "", state: b?.state ?? "",
  pincode: b?.pincode ?? "", phone: b?.phone ?? "", latitude: b?.latitude?.toString() ?? "", longitude: b?.longitude?.toString() ?? "",
  open: b?.openingHours.open ?? "07:00", close: b?.openingHours.close ?? "19:00", days: b?.openingHours.days ?? [1, 2, 3, 4, 5, 6],
  services: b?.services.join(", ") ?? "", homeCollection: b?.homeCollection ?? false,
  slotDurationMinutes: String(b?.slotDurationMinutes ?? 30), slotCapacity: String(b?.slotCapacity ?? 4), isActive: b?.isActive ?? true,
});

export function BranchForm({ branch }: { branch?: BranchDTO }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<FormState>(fromBranch(branch));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const payload = {
      name: f.name, branchCode: f.branchCode, address: f.address, city: f.city, state: f.state, pincode: f.pincode, phone: f.phone,
      latitude: f.latitude.trim() === "" ? null : Number(f.latitude),
      longitude: f.longitude.trim() === "" ? null : Number(f.longitude),
      openingHours: { open: f.open, close: f.close, days: [...f.days].sort() },
      services: f.services, homeCollection: f.homeCollection,
      slotDurationMinutes: Number(f.slotDurationMinutes), slotCapacity: Number(f.slotCapacity), isActive: f.isActive,
    };
    const res = await api<{ branch: BranchDTO }>(branch ? `/api/admin/branches/${branch.id}` : "/api/admin/branches", { method: branch ? "PATCH" : "POST", json: payload });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
      setErrors(res.fieldErrors ?? {});
      return;
    }
    toast(branch ? "Branch saved" : "Branch added");
    router.push("/admin/branches");
    router.refresh();
  }

  const field = (k: keyof FormState, labelText: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div className="field">
      <label htmlFor={`bf-${k}`}>{labelText}</label>
      <input id={`bf-${k}`} className="input" value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} aria-invalid={!!errors[k]} {...props} />
      {hint && <span className="hint">{hint}</span>}
      {errors[k] && <span className="error">{errors[k]}</span>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="stack" style={{ maxWidth: 860 }}>
      {formError && <div className="alert alert-bad" role="alert">{formError}</div>}
      <section className="card">
        <h3>Branch details</h3>
        <div className="form-grid">
          {field("name", "Branch name")}
          {field("branchCode", "Branch code", { style: { textTransform: "uppercase" } }, "Unique short code, e.g. HYD-KPHB")}
          {field("phone", "Phone number", { inputMode: "tel" })}
        </div>
        {field("address", "Full address", {}, "Building, street and area")}
        <div className="form-grid">
          {field("city", "City")}
          {field("state", "State")}
          {field("pincode", "PIN code", { inputMode: "numeric", maxLength: 6 })}
        </div>
      </section>
      <section className="card">
        <h3>Location on map</h3>
        <p className="small muted">Used to sort branches by distance for patients. In Google Maps, right-click the branch’s exact spot and click the coordinates to copy them. Leave both empty if you don’t have them yet — the branch is still bookable.</p>
        <div className="form-grid">
          {field("latitude", "Latitude", { inputMode: "decimal", placeholder: "e.g. 17.4486" })}
          {field("longitude", "Longitude", { inputMode: "decimal", placeholder: "e.g. 78.3908" })}
        </div>
      </section>
      <section className="card">
        <h3>Opening hours and slots</h3>
        <div className="form-grid">
          {field("open", "Opens at", { type: "time" })}
          {field("close", "Closes at", { type: "time" })}
          <div className="field">
            <label htmlFor="bf-dur">Slot length</label>
            <select id="bf-dur" className="select" value={f.slotDurationMinutes} onChange={(e) => set("slotDurationMinutes", e.target.value)}>
              {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </div>
          {field("slotCapacity", "Patients per slot", { type: "number", min: 1, max: 100 }, "How many patients can be booked into the same slot")}
        </div>
        {errors["openingHours.close"] && <span className="error">{errors["openingHours.close"]}</span>}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ marginBottom: 8 }}>Open on</legend>
          <div className="row">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className="check" style={{ alignItems: "center" }}>
                <input type="checkbox" checked={f.days.includes(i)} onChange={() => set("days", f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i])} /> {d}
              </label>
            ))}
          </div>
          {errors["openingHours.days"] && <span className="error">{errors["openingHours.days"]}</span>}
        </fieldset>
      </section>
      <section className="card">
        <h3>Services</h3>
        <div className="field">
          <label htmlFor="bf-svc">Available services</label>
          <textarea id="bf-svc" className="textarea" value={f.services} onChange={(e) => set("services", e.target.value)} placeholder="Blood tests, ECG, X-ray" />
          <span className="hint">Separate with commas or new lines.</span>
        </div>
        <label className="check"><input type="checkbox" checked={f.homeCollection} onChange={(e) => set("homeCollection", e.target.checked)} /> Offers home sample collection</label>
        <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active — show on website and allow bookings</label>
      </section>
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : branch ? "Save branch" : "Add branch"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
