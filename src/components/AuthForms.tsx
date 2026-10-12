"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";

/** Only allow redirects to paths on this site. */
function safeNext(next: string | null, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

function PasswordInput({ id, value, onChange, invalid, autoComplete }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-group">
      <input id={id} className="input" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} autoComplete={autoComplete} />
      <button type="button" className="toggle" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function clientPhoneError(phone: string) {
  const d = phone.replace(/[\s-]/g, "").replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? null : "Enter a valid 10-digit Indian mobile number.";
}

export function LoginForm({ portal }: { portal: "patient" | "admin" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const pe = clientPhoneError(phone);
    if (pe) errs.phone = pe;
    if (!password) errs.password = "Password is required.";
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await api("/api/auth/login", { method: "POST", json: { phone, password, portal } });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      return;
    }
    router.push(safeNext(params.get("next"), portal === "admin" ? "/admin" : "/dashboard"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError && <div className="alert alert-bad" role="alert">{formError}</div>}
      <div className="field">
        <label htmlFor="phone">Mobile number</label>
        <input id="phone" className="input" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined} placeholder="10-digit mobile number" />
        {errors.phone && <span className="error" id="phone-err">{errors.phone}</span>}
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <PasswordInput id="password" value={password} onChange={setPassword} invalid={!!errors.password} autoComplete="current-password" />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>
      <button className="btn btn-block" disabled={busy}>{busy ? <><span className="spinner" aria-hidden /> Logging in…</> : "Log in"}</button>
      {portal === "patient" && (
        <p className="small" style={{ marginTop: 16, textAlign: "center" }}>
          New here? <Link href={`/register${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}>Create an account</Link>
        </p>
      )}
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ name: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Enter your full name.";
    const pe = clientPhoneError(form.phone);
    if (pe) errs.phone = pe;
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errs.password = "Password must contain at least one letter and one number.";
    if (form.confirmPassword !== form.password) errs.confirmPassword = "Passwords do not match.";
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await api("/api/auth/register", { method: "POST", json: form });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      return;
    }
    router.push(safeNext(params.get("next"), "/dashboard"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError && <div className="alert alert-bad" role="alert">{formError}</div>}
      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" className="input" autoComplete="name" value={form.name} onChange={(e) => set("name")(e.target.value)} aria-invalid={!!errors.name} />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      <div className="field">
        <label htmlFor="phone">Mobile number</label>
        <input id="phone" className="input" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} aria-invalid={!!errors.phone} placeholder="10-digit mobile number" />
        <span className="hint">We don’t send an OTP in this version, so your number won’t be verified yet.</span>
        {errors.phone && <span className="error">{errors.phone}</span>}
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <PasswordInput id="password" value={form.password} onChange={set("password")} invalid={!!errors.password} autoComplete="new-password" />
        <span className="hint">At least 8 characters, with a letter and a number.</span>
        {errors.password && <span className="error">{errors.password}</span>}
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirm password</label>
        <PasswordInput id="confirmPassword" value={form.confirmPassword} onChange={set("confirmPassword")} invalid={!!errors.confirmPassword} autoComplete="new-password" />
        {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
      </div>
      <button className="btn btn-block" disabled={busy}>{busy ? <><span className="spinner" aria-hidden /> Creating account…</> : "Create account"}</button>
      <p className="small" style={{ marginTop: 16, textAlign: "center" }}>
        Already registered? <Link href={`/login${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}>Log in</Link>
      </p>
    </form>
  );
}
