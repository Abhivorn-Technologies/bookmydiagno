"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "./useApi";
import { useToast } from "../Toaster";
import { api } from "@/lib/client-api";
import { OFFLINE_PAYMENT_METHODS, label } from "@/lib/constants";
import { formatINR, roundMoney } from "@/lib/format";
import { formatSlot, todayIST } from "@/lib/time";
import type { AppointmentDTO, BranchDTO, SlotDTO, TestDTO } from "@/types";

type PatientHit = { id: string; name: string; phone: string };

export function OfflineBookingForm() {
  const router = useRouter();
  const toast = useToast();
  const branches = useApi<{ branches: BranchDTO[] }>("/api/admin/branches");
  const tests = useApi<{ tests: TestDTO[] }>("/api/admin/tests?status=active");
  const activeBranches = useMemo(() => branches.data?.branches.filter((b) => b.isActive) ?? [], [branches.data]);

  const [patientQuery, setPatientQuery] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [patient, setPatient] = useState<{ id: string | null; name: string; phone: string; age: string; gender: string }>({ id: null, name: "", phone: "", age: "", gender: "" });
  const [branchId, setBranchId] = useState("");
  const [testIds, setTestIds] = useState<string[]>([]);
  const [testQuery, setTestQuery] = useState("");
  const [date, setDate] = useState(todayIST());
  const [slots, setSlots] = useState<SlotDTO[] | null>(null);
  const [slot, setSlot] = useState("");
  const [collectionMethod, setCollectionMethod] = useState<"BRANCH_VISIT" | "HOME_COLLECTION">("BRANCH_VISIT");
  const [collectionAddress, setCollectionAddress] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const branch = activeBranches.find((b) => b.id === branchId);

  useEffect(() => {
    if (patientQuery.trim().length < 2) return setHits([]);
    const t = setTimeout(async () => {
      const res = await api<{ patients: PatientHit[] }>(`/api/admin/patients?limit=6&q=${encodeURIComponent(patientQuery.trim())}`);
      if (res.ok) setHits(res.data.patients);
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  useEffect(() => {
    if (!branchId || !date) return setSlots(null);
    setSlots(null);
    setSlot("");
    api<{ slots: SlotDTO[] }>(`/api/branches/${branchId}/slots?date=${date}&allowPast=1`).then((res) => setSlots(res.ok ? res.data.slots : []));
  }, [branchId, date]);

  const selectedTests = (tests.data?.tests ?? []).filter((t) => testIds.includes(t.id));
  const total = roundMoney(selectedTests.reduce((s, t) => s + t.price, 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});
    const res = await api<{ appointment: AppointmentDTO; paymentError: string | null }>("/api/admin/bookings", {
      method: "POST",
      json: {
        patientId: patient.id,
        patientName: patient.name,
        patientPhone: patient.phone,
        patientAge: patient.age ? Number(patient.age) : null,
        patientGender: patient.gender || null,
        branchId,
        testIds,
        appointmentDate: date,
        timeSlot: slot,
        collectionMethod,
        collectionAddress,
        notes,
        paymentStatus,
        paymentMethod: paymentStatus === "PAID" ? paymentMethod : undefined,
        allowPastSlot: true,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
      setErrors(res.fieldErrors ?? {});
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (res.data.paymentError) toast(`Booking created, but payment wasn’t recorded: ${res.data.paymentError}`, "bad");
    else toast(`Booking ${res.data.appointment.bookingReference} created`);
    router.push(`/admin/bookings/${res.data.appointment.id}`);
  }

  const err = (k: string) => errors[k] && <span className="error">{errors[k]}</span>;

  return (
    <form onSubmit={submit} noValidate className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 320px", gap: 24, alignItems: "start" }} id="ob-grid">
      <div className="stack" style={{ minWidth: 0 }}>
        {formError && <div className="alert alert-bad" role="alert">{formError}</div>}

        <section className="card">
          <h3>Patient</h3>
          <div className="field">
            <label htmlFor="ps">Find a registered patient (optional)</label>
            <input id="ps" className="input" placeholder="Search by name or phone" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
            {hits.length > 0 && (
              <ul className="line-items" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px" }}>
                {hits.map((h) => (
                  <li key={h.id}>
                    <span>{h.name} <span className="muted small">{h.phone}</span></span>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setPatient({ ...patient, id: h.id, name: h.name, phone: h.phone }); setPatientQuery(""); setHits([]); }}>Use</button>
                  </li>
                ))}
              </ul>
            )}
            {patient.id && <span className="hint">Linked to registered patient account. <button type="button" className="link-btn" onClick={() => setPatient({ ...patient, id: null })}>Unlink</button></span>}
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="pn2">Patient name</label><input id="pn2" className="input" value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} aria-invalid={!!errors.patientName} />{err("patientName")}</div>
            <div className="field"><label htmlFor="pp">Mobile number</label><input id="pp" className="input" inputMode="tel" value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value })} aria-invalid={!!errors.patientPhone} />{err("patientPhone")}</div>
            <div className="field"><label htmlFor="pa">Age (optional)</label><input id="pa" className="input" inputMode="numeric" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value.replace(/\D/g, "").slice(0, 3) })} />{err("patientAge")}</div>
            <div className="field">
              <label htmlFor="pg">Gender (optional)</label>
              <select id="pg" className="select" value={patient.gender} onChange={(e) => setPatient({ ...patient, gender: e.target.value })}>
                <option value="">Not specified</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Tests</h3>
          {tests.loading && <div className="skeleton" style={{ height: 60 }} />}
          <input className="input" placeholder="Search tests" aria-label="Search tests" value={testQuery} onChange={(e) => setTestQuery(e.target.value)} />
          <div style={{ maxHeight: 260, overflowY: "auto", marginTop: 10, border: "1px solid var(--line-2)", borderRadius: 10, padding: "4px 12px" }}>
            {(tests.data?.tests ?? [])
              .filter((t) => !testQuery || t.name.toLowerCase().includes(testQuery.toLowerCase()) || t.testCode.toLowerCase().includes(testQuery.toLowerCase()))
              .map((t) => (
                <label key={t.id} className="check" style={{ padding: "8px 0", borderBottom: "1px dashed var(--line-2)" }}>
                  <input type="checkbox" checked={testIds.includes(t.id)} onChange={() => setTestIds((ids) => (ids.includes(t.id) ? ids.filter((x) => x !== t.id) : [...ids, t.id]))} />
                  <span style={{ flex: 1 }}>{t.name} <span className="small muted">{t.testCode}</span></span>
                  <span className="money">{formatINR(t.price)}</span>
                </label>
              ))}
            {tests.data && tests.data.tests.length === 0 && <p className="muted">No active tests. Add tests first.</p>}
          </div>
          {err("testIds")}
        </section>

        <section className="card">
          <h3>Branch and slot</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="br">Branch</label>
              <select id="br" className="select" value={branchId} onChange={(e) => { setBranchId(e.target.value); setCollectionMethod("BRANCH_VISIT"); }} aria-invalid={!!errors.branchId}>
                <option value="">Choose branch</option>
                {activeBranches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.branchCode})</option>)}
              </select>
              {err("branchId")}
            </div>
            <div className="field">
              <label htmlFor="dt">Date</label>
              <input id="dt" type="date" className="input" min={todayIST()} value={date} onChange={(e) => setDate(e.target.value)} />
              {err("appointmentDate")}
            </div>
          </div>
          {branchId && !slots && <div className="skeleton" style={{ height: 60 }} />}
          {slots && slots.length === 0 && <p className="muted">Branch is closed on this date or the date is outside the booking window.</p>}
          {slots && slots.length > 0 && (
            <div className="slots" role="group" aria-label="Time slot">
              {slots.map((s) => (
                <button type="button" key={s.time} className="slot-btn" disabled={!s.bookable} aria-pressed={slot === s.time} onClick={() => setSlot(s.time)}>
                  {formatSlot(s.time)}<small>{s.available}/{s.capacity} free</small>
                </button>
              ))}
            </div>
          )}
          {err("timeSlot")}
          {branch?.homeCollection && (
            <div style={{ marginTop: 16 }}>
              <label className="check"><input type="checkbox" checked={collectionMethod === "HOME_COLLECTION"} onChange={(e) => setCollectionMethod(e.target.checked ? "HOME_COLLECTION" : "BRANCH_VISIT")} /> Home sample collection</label>
              {collectionMethod === "HOME_COLLECTION" && (
                <div className="field" style={{ marginTop: 10 }}>
                  <label htmlFor="ca">Collection address</label>
                  <textarea id="ca" className="textarea" value={collectionAddress} onChange={(e) => setCollectionAddress(e.target.value)} />
                  {err("collectionAddress")}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="card">
          <h3>Payment</h3>
          <label className="choice"><input type="radio" name="ps" checked={paymentStatus === "PENDING"} onChange={() => setPaymentStatus("PENDING")} /><span><strong>Payment pending</strong><br /><span className="small muted">Patient will pay later at the counter.</span></span></label>
          <label className="choice"><input type="radio" name="ps" checked={paymentStatus === "PAID"} onChange={() => setPaymentStatus("PAID")} /><span><strong>Paid now</strong><br /><span className="small muted">Money has been received at the counter.</span></span></label>
          {paymentStatus === "PAID" && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="pmeth">Payment method</label>
              <select id="pmeth" className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {OFFLINE_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
              </select>
              {err("paymentMethod")}
            </div>
          )}
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="nt">Internal notes (optional)</label>
            <textarea id="nt" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>
        </section>
      </div>

      <aside className="card summary">
        <h3>Summary</h3>
        {selectedTests.length === 0 ? <p className="muted small">No tests selected.</p> : (
          <ul className="line-items">{selectedTests.map((t) => <li key={t.id}><span>{t.name}</span><span className="money">{formatINR(t.price)}</span></li>)}</ul>
        )}
        <div className="total-row"><span>Total</span><span className="money">{formatINR(total)}</span></div>
        <p className="small muted">Prices are re-checked by the server when you save.</p>
        <button className="btn btn-block" disabled={busy || !branchId || !slot || testIds.length === 0 || !patient.name || !patient.phone}>
          {busy ? "Creating…" : paymentStatus === "PAID" ? "Create booking and record payment" : "Create booking"}
        </button>
      </aside>
      <style>{`@media (max-width: 1100px){ #ob-grid { grid-template-columns: 1fr !important; } }`}</style>
    </form>
  );
}
