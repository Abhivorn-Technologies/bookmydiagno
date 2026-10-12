"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import { BranchFinder } from "./BranchFinder";
import { useToast } from "./Toaster";
import { api } from "@/lib/client-api";
import { formatINR, roundMoney } from "@/lib/format";
import { addDays, formatDateLabel, formatSlot, todayIST, weekdayOf } from "@/lib/time";
import { WEEKDAYS } from "@/lib/constants";
import type { AppointmentDTO, BranchDTO, SlotDTO, TestDTO } from "@/types";

type User = { name: string; phone: string } | null;
type Step = "tests" | "account" | "branch" | "slot" | "details" | "review";
const STEP_LABELS: Record<Step, string> = {
  tests: "Tests",
  account: "Log in",
  branch: "Branch",
  slot: "Date & time",
  details: "Patient details",
  review: "Review & pay",
};

export function BookingWizard({
  user,
  branches,
  initialBranchId,
  payAtBranchEnabled,
  windowDays,
}: {
  user: User;
  branches: BranchDTO[];
  initialBranchId: string | null;
  payAtBranchEnabled: boolean;
  windowDays: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const steps: Step[] = user ? ["tests", "branch", "slot", "details", "review"] : ["tests", "account", "branch", "slot", "details", "review"];

  const [step, setStep] = useState<Step>("tests");
  const [catalog, setCatalog] = useState<TestDTO[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [extraQuery, setExtraQuery] = useState("");
  const [branch, setBranch] = useState<BranchDTO | null>(() => branches.find((b) => b.id === initialBranchId) ?? null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDTO[] | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [details, setDetails] = useState({
    patientName: user?.name ?? "",
    patientAge: "",
    patientGender: "",
    collectionMethod: "BRANCH_VISIT" as "BRANCH_VISIT" | "HOME_COLLECTION",
    collectionAddress: "",
    notes: "",
  });
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "PAY_AT_BRANCH">("ONLINE");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    api<{ tests: TestDTO[] }>("/api/tests").then((res) => {
      if (res.ok) setCatalog(res.data.tests);
      else setCatalogError(res.error);
    });
  }, []);

  // Drop cart items that are no longer active.
  useEffect(() => {
    if (!catalog || !cart.ready) return;
    const valid = cart.ids.filter((id) => catalog.some((t) => t.id === id));
    if (valid.length !== cart.ids.length) cart.set(valid);
  }, [catalog, cart]);

  const selected = useMemo(() => (catalog ?? []).filter((t) => cart.ids.includes(t.id)), [catalog, cart.ids]);
  const total = roundMoney(selected.reduce((s, t) => s + t.price, 0));
  const prep = selected.filter((t) => t.preparationInstructions).map((t) => `${t.name}: ${t.preparationInstructions}`);

  const dates = useMemo(() => {
    const today = todayIST();
    return Array.from({ length: Math.min(windowDays, 14) + 1 }, (_, i) => addDays(today, i));
  }, [windowDays]);

  const loadSlots = useCallback(async (b: BranchDTO, d: string) => {
    setSlots(null);
    setSlotError(null);
    const res = await api<{ slots: SlotDTO[] }>(`/api/branches/${b.id}/slots?date=${d}`);
    if (res.ok) setSlots(res.data.slots);
    else setSlotError(res.error);
  }, []);

  useEffect(() => {
    if (branch && date) loadSlots(branch, date);
  }, [branch, date, loadSlots]);

  const idx = steps.indexOf(step);
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => go(steps[Math.min(idx + 1, steps.length - 1)]);
  const back = () => go(steps[Math.max(idx - 1, 0)]);

  function validateDetails() {
    const errs: Record<string, string> = {};
    if (details.patientName.trim().length < 2) errs.patientName = "Enter the patient’s full name.";
    if (details.patientAge && (Number(details.patientAge) < 0 || Number(details.patientAge) > 120 || !Number.isInteger(Number(details.patientAge)))) errs.patientAge = "Enter a valid age in years.";
    if (details.collectionMethod === "HOME_COLLECTION" && details.collectionAddress.trim().length < 10) errs.collectionAddress = "Enter the full address for sample collection.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit() {
    if (!branch || !date || !slot || selected.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await api<{ appointment: AppointmentDTO }>("/api/bookings", {
      method: "POST",
      json: {
        branchId: branch.id,
        testIds: selected.map((t) => t.id),
        appointmentDate: date,
        timeSlot: slot,
        paymentMode,
        collectionMethod: details.collectionMethod,
        collectionAddress: details.collectionAddress,
        notes: details.notes,
        patientName: details.patientName.trim(),
        patientAge: details.patientAge ? Number(details.patientAge) : null,
        patientGender: details.patientGender || null,
      },
    });
    if (!res.ok) {
      setSubmitting(false);
      if (res.status === 401) {
        setSubmitError("Your session has expired. Please log in again — your selection is saved.");
        return;
      }
      setSubmitError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      if (res.status === 409) {
        setSlot(null);
        loadSlots(branch, date);
        toast("That slot just filled up. Please pick another time.", "bad");
        go("slot");
      }
      return;
    }
    cart.clear();
    const a = res.data.appointment;
    toast(`Booking ${a.bookingReference} created`);
    router.push(paymentMode === "ONLINE" ? `/booking/${a.id}/pay` : `/booking/${a.id}/confirmation`);
  }

  const canNext: Record<Step, boolean> = {
    tests: selected.length > 0,
    account: !!user,
    branch: !!branch,
    slot: !!date && !!slot,
    details: true,
    review: true,
  };

  return (
    <div className="wizard">
      <div style={{ minWidth: 0 }}>
        <ol className="wizard-steps" aria-label="Booking steps">
          {steps.map((s, i) => (
            <li key={s} data-state={i < idx ? "done" : i === idx ? "current" : "todo"} aria-current={i === idx ? "step" : undefined}>
              {STEP_LABELS[s]}
            </li>
          ))}
        </ol>

        {step === "tests" && (
          <section className="card card-pad-lg">
            <h2>Your tests</h2>
            {catalogError && <div className="alert alert-bad">{catalogError}</div>}
            {!catalog && !catalogError && <div className="skeleton" style={{ height: 120 }} />}
            {catalog && selected.length === 0 && (
              <div className="empty" style={{ marginBottom: 16 }}>
                <h3>No tests selected yet</h3>
                <p className="muted">Search below or <Link href="/tests">browse all tests</Link>.</p>
              </div>
            )}
            {selected.length > 0 && (
              <ul className="line-items" style={{ marginBottom: 16 }}>
                {selected.map((t) => (
                  <li key={t.id}>
                    <span>
                      <strong>{t.name}</strong>
                      <br />
                      <span className="small muted">{t.preparationInstructions || "No special preparation"}</span>
                    </span>
                    <span className="row" style={{ flexWrap: "nowrap" }}>
                      <span className="money">{formatINR(t.price)}</span>
                      <button className="link-btn small" onClick={() => cart.remove(t.id)} aria-label={`Remove ${t.name}`}>Remove</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {catalog && (
              <div className="field">
                <label htmlFor="add-test">Add another test</label>
                <input id="add-test" className="input" placeholder="Type a test name" value={extraQuery} onChange={(e) => setExtraQuery(e.target.value)} />
                {extraQuery.trim().length > 1 && (
                  <ul className="line-items" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px" }}>
                    {catalog
                      .filter((t) => !cart.ids.includes(t.id) && t.name.toLowerCase().includes(extraQuery.trim().toLowerCase()))
                      .slice(0, 6)
                      .map((t) => (
                        <li key={t.id}>
                          <span>{t.name} <span className="muted small">· {formatINR(t.price)}</span></span>
                          <button className="btn btn-sm btn-teal" onClick={() => { cart.add(t.id); setExtraQuery(""); }}>Add</button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {step === "account" && (
          <section className="card card-pad-lg">
            <h2>Log in to continue</h2>
            <p>Your selected tests are saved. Log in or create a free account so we can keep your booking and receipts in one place.</p>
            <div className="row">
              <Link href="/login?next=/booking" className="btn">Log in</Link>
              <Link href="/register?next=/booking" className="btn btn-ghost">Create an account</Link>
            </div>
          </section>
        )}

        {step === "branch" && (
          <section>
            <h2>Choose a branch</h2>
            <BranchFinder
              initialBranches={branches}
              mode="select"
              selectedId={branch?.id}
              onSelect={(b) => {
                setBranch(b);
                setSlot(null);
                if (!b.homeCollection) setDetails((d) => ({ ...d, collectionMethod: "BRANCH_VISIT" }));
              }}
            />
          </section>
        )}

        {step === "slot" && branch && (
          <section className="card card-pad-lg">
            <h2>Pick a date and time</h2>
            <p className="muted">At {branch.name}. Open {branch.openingHours.days.map((d) => WEEKDAYS[d]).join(", ")}.</p>
            <div className="dates" role="group" aria-label="Date">
              {dates.map((d) => {
                const closed = !branch.openingHours.days.includes(weekdayOf(d));
                const dt = new Date(`${d}T00:00:00Z`);
                return (
                  <button
                    key={d}
                    type="button"
                    className="date-btn"
                    aria-pressed={date === d}
                    disabled={closed}
                    onClick={() => { setDate(d); setSlot(null); }}
                    aria-label={`${formatDateLabel(d)}${closed ? " (closed)" : ""}`}
                  >
                    <small>{WEEKDAYS[dt.getUTCDay()]}</small>
                    <strong>{dt.getUTCDate()}</strong>
                    <small>{closed ? "Closed" : dt.toLocaleString("en-IN", { month: "short", timeZone: "UTC" })}</small>
                  </button>
                );
              })}
            </div>
            {!date && <p className="muted">Choose a date to see open slots.</p>}
            {date && slotError && <div className="alert alert-bad">{slotError}</div>}
            {date && !slots && !slotError && <div className="skeleton" style={{ height: 96 }} />}
            {date && slots && slots.length === 0 && <div className="empty">No slots on this date. Please choose another day.</div>}
            {date && slots && slots.length > 0 && (
              <>
                {slots.every((s) => !s.bookable) && <div className="alert alert-warn">All slots on this date are taken or have passed. Try the next day.</div>}
                <div className="slots" role="group" aria-label="Time slot">
                  {slots.map((s) => (
                    <button key={s.time} type="button" className="slot-btn" disabled={!s.bookable} aria-pressed={slot === s.time} onClick={() => setSlot(s.time)}>
                      {formatSlot(s.time)}
                      <small>{s.bookable ? `${s.available} left` : s.available === 0 ? "Full" : "Passed"}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {step === "details" && (
          <section className="card card-pad-lg">
            <h2>Patient details</h2>
            <p className="muted">Booking for someone in your family? Change the name below. Reports will be issued in this name.</p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="pname">Patient full name</label>
                <input id="pname" className="input" value={details.patientName} aria-invalid={!!fieldErrors.patientName} onChange={(e) => setDetails({ ...details, patientName: e.target.value })} />
                {fieldErrors.patientName && <span className="error">{fieldErrors.patientName}</span>}
              </div>
              <div className="field">
                <label htmlFor="page">Age (years, optional)</label>
                <input id="page" className="input" inputMode="numeric" value={details.patientAge} aria-invalid={!!fieldErrors.patientAge} onChange={(e) => setDetails({ ...details, patientAge: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
                {fieldErrors.patientAge && <span className="error">{fieldErrors.patientAge}</span>}
              </div>
              <div className="field">
                <label htmlFor="pgender">Gender (optional)</label>
                <select id="pgender" className="select" value={details.patientGender} onChange={(e) => setDetails({ ...details, patientGender: e.target.value })}>
                  <option value="">Prefer not to say</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <p className="small muted">Contact number for this booking: {user?.phone} (from your account)</p>

            {branch?.homeCollection && (
              <fieldset style={{ border: 0, padding: 0, margin: "8px 0 16px" }}>
                <legend className="label" style={{ marginBottom: 8 }}>Sample collection</legend>
                <label className="choice">
                  <input type="radio" name="cm" checked={details.collectionMethod === "BRANCH_VISIT"} onChange={() => setDetails({ ...details, collectionMethod: "BRANCH_VISIT" })} />
                  <span><strong>I’ll visit the branch</strong><br /><span className="small muted">{branch.address}, {branch.city}</span></span>
                </label>
                <label className="choice">
                  <input type="radio" name="cm" checked={details.collectionMethod === "HOME_COLLECTION"} onChange={() => setDetails({ ...details, collectionMethod: "HOME_COLLECTION" })} />
                  <span><strong>Collect my sample at home</strong><br /><span className="small muted">A phlebotomist from this branch visits at your chosen time.</span></span>
                </label>
                {details.collectionMethod === "HOME_COLLECTION" && (
                  <div className="field" style={{ marginTop: 12 }}>
                    <label htmlFor="addr">Collection address</label>
                    <textarea id="addr" className="textarea" value={details.collectionAddress} aria-invalid={!!fieldErrors.collectionAddress} onChange={(e) => setDetails({ ...details, collectionAddress: e.target.value })} placeholder="House / flat, street, area, landmark, PIN code" />
                    {fieldErrors.collectionAddress && <span className="error">{fieldErrors.collectionAddress}</span>}
                  </div>
                )}
              </fieldset>
            )}
            <div className="field">
              <label htmlFor="notes">Anything the branch should know? (optional)</label>
              <textarea id="notes" className="textarea" maxLength={500} value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} />
            </div>
          </section>
        )}

        {step === "review" && branch && date && slot && (
          <section className="card card-pad-lg">
            <h2>Review and choose payment</h2>
            <dl className="kv" style={{ marginBottom: 20 }}>
              <dt>Patient</dt><dd>{details.patientName}{details.patientAge ? `, ${details.patientAge} yrs` : ""}</dd>
              <dt>Branch</dt><dd>{branch.name}<br /><span className="small muted" style={{ fontWeight: 400 }}>{branch.address}, {branch.city}</span></dd>
              <dt>Appointment</dt><dd>{formatDateLabel(date)}, {formatSlot(slot)}</dd>
              <dt>Collection</dt><dd>{details.collectionMethod === "HOME_COLLECTION" ? `Home collection — ${details.collectionAddress}` : "At the branch"}</dd>
            </dl>
            {prep.length > 0 && (
              <div className="alert alert-info"><strong>Before your test:</strong><ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{prep.map((p) => <li key={p}>{p}</li>)}</ul></div>
            )}
            <fieldset style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
              <legend className="label" style={{ marginBottom: 8 }}>How would you like to pay?</legend>
              <label className="choice">
                <input type="radio" name="pm" checked={paymentMode === "ONLINE"} onChange={() => setPaymentMode("ONLINE")} />
                <span><strong>Pay online now</strong> <span className="badge badge-warn" style={{ marginLeft: 4 }}>Demo</span><br /><span className="small muted">Demo checkout — no real money is charged.</span></span>
              </label>
              {payAtBranchEnabled && (
                <label className="choice">
                  <input type="radio" name="pm" checked={paymentMode === "PAY_AT_BRANCH"} onChange={() => setPaymentMode("PAY_AT_BRANCH")} />
                  <span><strong>Pay at the branch</strong><br /><span className="small muted">Pay by cash, UPI or card when you arrive.</span></span>
                </label>
              )}
            </fieldset>
            {submitError && <div className="alert alert-bad" role="alert">{submitError}{submitError.includes("log in") && <> <Link href="/login?next=/booking">Log in</Link></>}</div>}
            <button className="btn btn-block" onClick={submit} disabled={submitting}>
              {submitting ? <><span className="spinner" aria-hidden /> Booking…</> : paymentMode === "ONLINE" ? `Book and pay ${formatINR(total)}` : "Confirm booking"}
            </button>
          </section>
        )}

        {step !== "review" && step !== "account" && (
          <div className="spread" style={{ marginTop: 18 }}>
            {idx > 0 ? <button className="btn btn-ghost" onClick={back}>Back</button> : <span />}
            <button
              className="btn"
              disabled={!canNext[step]}
              onClick={() => {
                if (step === "details" && !validateDetails()) return;
                next();
              }}
            >
              Continue
            </button>
          </div>
        )}
        {(step === "review" || step === "account") && idx > 0 && (
          <div style={{ marginTop: 18 }}><button className="btn btn-ghost" onClick={back}>Back</button></div>
        )}
      </div>

      <aside className="card summary" aria-label="Booking summary">
        <h3>Price breakdown</h3>
        {selected.length === 0 ? (
          <p className="muted small">No tests selected.</p>
        ) : (
          <ul className="line-items">
            {selected.map((t) => (
              <li key={t.id}><span>{t.name}</span><span className="money">{formatINR(t.price)}</span></li>
            ))}
          </ul>
        )}
        <div className="total-row"><span>Total</span><span className="money">{formatINR(total)}</span></div>
        <p className="small muted" style={{ marginTop: 8 }}>The final amount is confirmed by our system when you book.</p>
        {(branch || date) && <hr className="divider" />}
        {branch && <p className="small" style={{ margin: 0 }}><strong>{branch.name}</strong></p>}
        {date && <p className="small" style={{ margin: 0 }}>{formatDateLabel(date)}{slot ? `, ${formatSlot(slot)}` : ""}</p>}
      </aside>
    </div>
  );
}
