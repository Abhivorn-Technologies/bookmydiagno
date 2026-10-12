"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { useToast } from "../Toaster";
import type { TestDTO } from "@/types";

export function TestForm({ test, categories = [] }: { test?: TestDTO; categories?: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState({
    name: test?.name ?? "", testCode: test?.testCode ?? "", kind: test?.kind ?? "TEST", category: test?.category ?? "",
    description: test?.description ?? "", preparationInstructions: test?.preparationInstructions ?? "",
    includes: test?.includes.join("\n") ?? "", reportTime: test?.reportTime ?? "", price: test ? String(test.price) : "",
    isPopular: test?.isPopular ?? false, isActive: test?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const res = await api<{ test: TestDTO }>(test ? `/api/admin/tests/${test.id}` : "/api/admin/tests", {
      method: test ? "PATCH" : "POST",
      json: { ...f, price: f.price === "" ? undefined : Number(f.price) },
    });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
      setErrors(res.fieldErrors ?? {});
      return;
    }
    toast(test ? "Test saved" : "Test added");
    router.push("/admin/tests");
    router.refresh();
  }

  const err = (k: string) => errors[k] && <span className="error">{errors[k]}</span>;

  return (
    <form onSubmit={submit} noValidate className="stack" style={{ maxWidth: 820 }}>
      {formError && <div className="alert alert-bad" role="alert">{formError}</div>}
      {test && <div className="alert alert-info">Changing the price only affects new bookings. Existing bookings keep the price they were booked at.</div>}
      <section className="card">
        <div className="form-grid">
          <div className="field"><label htmlFor="tn">Name</label><input id="tn" className="input" value={f.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />{err("name")}</div>
          <div className="field"><label htmlFor="tc">Test code</label><input id="tc" className="input" style={{ textTransform: "uppercase" }} value={f.testCode} onChange={(e) => set("testCode", e.target.value)} aria-invalid={!!errors.testCode} /><span className="hint">Unique, e.g. CBC or LIPID</span>{err("testCode")}</div>
          <div className="field">
            <label htmlFor="tk">Type</label>
            <select id="tk" className="select" value={f.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="TEST">Individual test</option><option value="PACKAGE">Health package</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="tcat">Category</label>
            <input id="tcat" className="input" list="cats" value={f.category} onChange={(e) => set("category", e.target.value)} aria-invalid={!!errors.category} placeholder="e.g. Blood tests, Thyroid, Diabetes" />
            <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            {err("category")}
          </div>
          <div className="field"><label htmlFor="tp">Price (₹)</label><input id="tp" className="input" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} aria-invalid={!!errors.price} />{err("price")}</div>
          <div className="field"><label htmlFor="tr">Report time (optional)</label><input id="tr" className="input" value={f.reportTime} onChange={(e) => set("reportTime", e.target.value)} placeholder="e.g. 24 hours" /></div>
        </div>
        <div className="field"><label htmlFor="td">Description</label><textarea id="td" className="textarea" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="field"><label htmlFor="tprep">Preparation instructions</label><textarea id="tprep" className="textarea" value={f.preparationInstructions} onChange={(e) => set("preparationInstructions", e.target.value)} placeholder="e.g. 10–12 hours fasting. Water is allowed." /></div>
        {f.kind === "PACKAGE" && (
          <div className="field"><label htmlFor="ti">Tests included</label><textarea id="ti" className="textarea" value={f.includes} onChange={(e) => set("includes", e.target.value)} /><span className="hint">One per line.</span></div>
        )}
        <label className="check"><input type="checkbox" checked={f.isPopular} onChange={(e) => set("isPopular", e.target.checked)} /> Show on the home page as popular</label>
        <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active — available for booking</label>
      </section>
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : test ? "Save test" : "Add test"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
