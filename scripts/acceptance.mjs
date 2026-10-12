/**
 * End-to-end acceptance check against a RUNNING BookMyDiagno server.
 * It creates real records (a branch, tests, patients, bookings, payments),
 * so run it against a local or staging database — not your live production data.
 *
 *   BASE_URL=http://localhost:3000 ADMIN_PHONE=9XXXXXXXXX ADMIN_PASSWORD='...' node scripts/acceptance.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_PHONE = process.env.ADMIN_PHONE;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PHONE || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_PHONE and ADMIN_PASSWORD (the account created with `npm run create-admin`).");
  process.exit(1);
}

const run = Date.now().toString(36).toUpperCase();
let passed = 0;
let failed = 0;
const results = [];

function check(name, cond, detail = "") {
  if (cond) passed++;
  else failed++;
  results.push(`${cond ? "PASS" : "FAIL"}  ${name}${!cond && detail ? `  →  ${detail}` : ""}`);
}

class Client {
  constructor() { this.cookie = ""; }
  async req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(";");
      if (pair.startsWith("bmd_session=")) this.cookie = pair.endsWith("=") ? "" : pair;
    }
    const type = res.headers.get("content-type") ?? "";
    const json = type.includes("json") ? await res.json() : null;
    const text = json ? null : await res.text();
    return { status: res.status, json, text, headers: res.headers };
  }
  get(p) { return this.req("GET", p); }
  post(p, b) { return this.req("POST", p, b ?? {}); }
  patch(p, b) { return this.req("PATCH", p, b); }
}

// IST helpers
const istDate = (offsetDays) => new Date(Date.now() + 330 * 60_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
const phone = (n) => `9${String(Date.now()).slice(-8)}${n}`.slice(0, 10);

const admin = new Client();
const alice = new Client();
const bob = new Client();
const anon = new Client();

// ---------- Admin login + setup ----------
let r = await admin.post("/api/auth/login", { phone: ADMIN_PHONE, password: ADMIN_PASSWORD, portal: "admin" });
check("Admin can log in through the admin portal", r.status === 200 && r.json?.data?.role === "ADMIN", JSON.stringify(r.json));

r = await anon.get("/api/admin/dashboard");
check("Admin API rejects anonymous requests (401)", r.status === 401);

const branchCode = `T-${run}`.slice(0, 20);
r = await admin.post("/api/admin/branches", {
  name: `Acceptance Test Branch ${run}`, branchCode, address: "Test address, Street 1", city: "Testcity", state: "Telangana",
  pincode: "500001", phone: "040 1234 5678", latitude: 17.4, longitude: 78.4,
  openingHours: { open: "00:00", close: "23:30", days: [0, 1, 2, 3, 4, 5, 6] }, services: "Blood tests, ECG",
  homeCollection: true, slotDurationMinutes: 30, slotCapacity: 2, isActive: true,
});
const branch = r.json?.data?.branch;
check("5. Admin can add a branch", r.status === 201 && !!branch?.id, JSON.stringify(r.json));

r = await admin.post("/api/admin/branches", { ...branch, id: undefined, createdAt: undefined, updatedAt: undefined, distanceKm: undefined, services: branch.services });
check("Branch codes must be unique (409)", r.status === 409);

r = await anon.get("/api/branches");
check("5. New branch appears on the public website", r.json?.data?.branches?.some((b) => b.id === branch.id));

r = await anon.get(`/api/branches?q=500001`);
check("4. Branch search by PIN code works", r.json?.data?.branches?.some((b) => b.id === branch.id));

r = await anon.get(`/api/branches/nearby?lat=17.41&lng=78.41`);
const nearby = r.json?.data?.branches ?? [];
const mine = nearby.find((b) => b.id === branch.id);
check("4. Nearby branches return distances in km, sorted", !!mine && typeof mine.distanceKm === "number" && nearby.filter((b) => b.distanceKm !== null).every((b, i, a) => i === 0 || a[i - 1].distanceKm <= b.distanceKm));
r = await anon.get(`/api/branches/nearby?lat=abc&lng=1`);
check("Nearby rejects invalid coordinates (400)", r.status === 400);

r = await admin.post("/api/admin/branches", {
  name: `No-Map Branch ${run}`, branchCode: `N-${run}`.slice(0, 20), address: "Second test address", city: "Testcity", state: "Telangana",
  pincode: "500002", phone: "040 9999 0000", latitude: null, longitude: null, openingHours: { open: "08:00", close: "18:00", days: [1, 2, 3, 4, 5, 6] },
  services: [], homeCollection: false, isActive: true,
});
const noMap = r.json?.data?.branch;
check("Branch without coordinates is saved with null (not 0,0)", r.status === 201 && noMap?.latitude === null && noMap?.longitude === null, JSON.stringify(r.json));
r = await anon.get(`/api/branches/nearby?lat=17.41&lng=78.41`);
check("Branches without coordinates are listed after sorted ones", r.json?.data?.branches?.find((b) => b.id === noMap?.id)?.distanceKm === null);
await admin.patch(`/api/admin/branches/${noMap.id}`, { isActive: false });

r = await admin.post("/api/admin/tests", { name: `Acceptance CBC ${run}`, testCode: `ACBC${run}`.slice(0, 30), category: "Blood tests", price: 300, preparationInstructions: "None", isActive: true });
const t1 = r.json?.data?.test;
r = await admin.post("/api/admin/tests", { name: `Acceptance Lipid ${run}`, testCode: `ALIP${run}`.slice(0, 30), category: "Heart health", price: 650.5, preparationInstructions: "12 hours fasting", isActive: true });
const t2 = r.json?.data?.test;
check("Admin can add tests", !!t1?.id && !!t2?.id);

r = await anon.get(`/api/tests?q=${encodeURIComponent(`Acceptance CBC ${run}`)}`);
check("3. Patients can browse/search tests with INR prices", r.json?.data?.tests?.[0]?.price === 300);

// ---------- Registration / login ----------
const alicePhone = phone(1);
r = await alice.post("/api/auth/register", { name: "Alice Test", phone: alicePhone, password: "secret123", confirmPassword: "nope1234" });
check("1. Registration rejects mismatched passwords", r.status === 400 && !!r.json?.fieldErrors?.confirmPassword);
r = await alice.post("/api/auth/register", { name: "Alice Test", phone: "12345", password: "secret123", confirmPassword: "secret123" });
check("1. Registration rejects invalid phone numbers", r.status === 400 && !!r.json?.fieldErrors?.phone);
r = await alice.post("/api/auth/register", { name: "Alice Test", phone: alicePhone, password: "secret123", confirmPassword: "secret123" });
check("1. Patient can register (name, phone, password, confirm)", r.status === 201 && r.json?.data?.phoneVerified === false);
r = await anon.post("/api/auth/register", { name: "Dup", phone: alicePhone, password: "secret123", confirmPassword: "secret123" });
check("1. Phone numbers must be unique (409)", r.status === 409);

r = await alice.post("/api/auth/logout");
r = await alice.get("/api/auth/me");
check("2. Patient can log out", r.json?.data?.user === null);
r = await alice.post("/api/auth/login", { phone: alicePhone, password: "wrongpass1" });
check("2. Wrong password is rejected", r.status === 401);
r = await alice.post("/api/auth/login", { phone: `+91 ${alicePhone}`, password: "secret123" });
check("2. Patient can log in (accepts +91 format)", r.status === 200);
r = await alice.post("/api/auth/login", { phone: alicePhone, password: "secret123", portal: "admin" });
check("Patients cannot use the admin portal", r.status === 401);
await alice.post("/api/auth/login", { phone: alicePhone, password: "secret123" });
r = await alice.get("/api/admin/bookings");
check("Patients get 403 on admin APIs", r.status === 403);

const bobPhone = phone(2);
await bob.post("/api/auth/register", { name: "Bob Test", phone: bobPhone, password: "secret123", confirmPassword: "secret123" });

// ---------- Booking ----------
const date = istDate(2);
r = await alice.get(`/api/branches/${branch.id}/slots?date=${date}`);
const slots = r.json?.data?.slots ?? [];
check("Slots are generated from branch hours", slots.length > 10 && slots.every((s) => s.capacity === 2));
const slot = slots.find((s) => s.bookable)?.time;

r = await anon.post("/api/bookings", { branchId: branch.id, testIds: [t1.id], appointmentDate: date, timeSlot: slot, paymentMode: "ONLINE" });
check("Booking requires login (401)", r.status === 401);

r = await alice.post("/api/bookings", { branchId: branch.id, testIds: [t1.id, t2.id], appointmentDate: date, timeSlot: slot, paymentMode: "ONLINE", totalAmount: 1, price: 1 });
const b1 = r.json?.data?.appointment;
check("6. Patient can select a branch and book tests", r.status === 201 && /^BMD-\d{6}-[A-Z0-9]{5}$/.test(b1?.bookingReference ?? ""), JSON.stringify(r.json));
check("13. Server computes total (ignores browser-sent total)", b1?.totalAmount === 950.5, `got ${b1?.totalAmount}`);

r = await alice.post("/api/bookings", { branchId: branch.id, testIds: [t1.id], appointmentDate: date, timeSlot: slot, paymentMode: "PAY_AT_BRANCH" });
const b2 = r.json?.data?.appointment;
check("Second booking in same slot allowed (capacity 2)", r.status === 201);
r = await bob.post("/api/bookings", { branchId: branch.id, testIds: [t1.id], appointmentDate: date, timeSlot: slot, paymentMode: "PAY_AT_BRANCH" });
check("Slot capacity is enforced (409 when full)", r.status === 409);

// concurrency: 6 parallel bookings into a fresh slot with capacity 2
const slot2 = slots.filter((s) => s.bookable)[3].time;
const parallel = await Promise.all(Array.from({ length: 6 }, () => bob.post("/api/bookings", { branchId: branch.id, testIds: [t1.id], appointmentDate: date, timeSlot: slot2, paymentMode: "PAY_AT_BRANCH" })));
check("Simultaneous bookings never exceed slot capacity", parallel.filter((p) => p.status === 201).length === 2, parallel.map((p) => p.status).join(","));

r = await alice.post("/api/bookings", { branchId: branch.id, testIds: [t1.id], appointmentDate: istDate(-1), timeSlot: slot, paymentMode: "ONLINE" });
check("Past dates are rejected", r.status === 400 || r.status === 409);
r = await alice.post("/api/bookings", { branchId: branch.id, testIds: [t1.id], appointmentDate: date, timeSlot: "23:59", paymentMode: "ONLINE" });
check("Slots outside branch hours are rejected", r.status === 400);

// ---------- Dummy payment ----------
r = await alice.post("/api/payments/create", { appointmentId: b1.id });
let pay = r.json?.data?.payment;
check("Payment attempt has a server-generated reference and amount", r.status === 201 && pay?.paymentReference?.startsWith("pay_DEMO_") && pay?.amount === 950.5);
r = await alice.post(`/api/payments/${pay.id}/simulate`, { outcome: "failure" });
check("12. Simulated failure → payment FAILED", r.json?.data?.payment?.status === "FAILED" && r.json?.data?.paymentStatus === "FAILED");
r = await alice.post(`/api/payments/${pay.id}/simulate`, { outcome: "success" });
check("Closed attempts cannot be reused (409)", r.status === 409);

r = await alice.post("/api/payments/create", { appointmentId: b1.id });
pay = r.json?.data?.payment;
r = await alice.post(`/api/payments/${pay.id}/simulate`, { outcome: "cancel" });
check("12. Simulated cancellation → attempt CANCELLED", r.json?.data?.payment?.status === "CANCELLED");

r = await alice.post("/api/payments/create", { appointmentId: b1.id });
pay = r.json?.data?.payment;
r = await bob.post(`/api/payments/${pay.id}/simulate`, { outcome: "success" });
check("Another patient cannot complete someone else's payment", r.status === 404);
const [s1, s2] = await Promise.all([
  alice.post(`/api/payments/${pay.id}/simulate`, { outcome: "success" }),
  alice.post(`/api/payments/${pay.id}/simulate`, { outcome: "success" }),
]);
check("12. Simulated success → PAID (exactly once under double-submit)", [s1, s2].filter((x) => x.status === 200).length === 1 && [s1, s2].some((x) => x.json?.data?.paymentStatus === "PAID"), `${s1.status},${s2.status}`);
r = await alice.post("/api/payments/create", { appointmentId: b1.id });
check("Paid bookings cannot be paid again", r.status === 409);
r = await alice.post("/api/payments/create", { appointmentId: b2.id });
check("Pay-at-branch bookings cannot start online payment", r.status === 400);
r = await alice.get(`/api/bookings/${b2.id}`);
check("Pay-at-branch booking stays PENDING until staff records payment", r.json?.data?.appointment?.paymentStatus === "PENDING");

// ---------- Patient history / privacy ----------
r = await alice.get("/api/bookings/my");
check("7. Patient can view their bookings", r.json?.data?.bookings?.length === 2);
r = await bob.get(`/api/bookings/${b1.id}`);
check("8. Patient cannot view another patient's booking (404)", r.status === 404);
r = await bob.get("/api/bookings/my");
check("8. Patient history only contains own bookings", (r.json?.data?.bookings ?? []).every((b) => b.patientPhone === bobPhone));

// ---------- Cancellation ----------
r = await alice.post(`/api/bookings/${b1.id}/cancel`, { reason: "Plans changed" });
check("Patient can cancel; paid booking becomes REFUND_PENDING", r.json?.data?.appointment?.appointmentStatus === "CANCELLED" && r.json?.data?.appointment?.paymentStatus === "REFUND_PENDING");
r = await alice.get(`/api/branches/${branch.id}/slots?date=${date}`);
check("Cancellation frees the slot", r.json?.data?.slots?.find((s) => s.time === slot)?.available === 1);
r = await alice.post(`/api/bookings/${b1.id}/cancel`, { reason: "again" });
check("Cancelled bookings cannot be cancelled twice", r.status === 400);

// ---------- Admin: offline booking + payments ----------
r = await admin.post("/api/admin/bookings", {
  patientName: "Walk In Patient", patientPhone: phone(3), branchId: branch.id, testIds: [t2.id],
  appointmentDate: istDate(0), timeSlot: "23:00", paymentStatus: "PAID", paymentMethod: "UPI", allowPastSlot: true,
});
const off = r.json?.data?.appointment;
check("10. Admin can create an offline appointment (paid by UPI)", r.status === 201 && off?.bookingSource === "OFFLINE" && off?.paymentStatus === "PAID" && off?.amountPaid === 650.5, JSON.stringify(r.json));

r = await admin.post("/api/admin/bookings", {
  patientName: "Alice Test", patientPhone: alicePhone, branchId: branch.id, testIds: [t1.id],
  appointmentDate: date, timeSlot: slots.filter((s) => s.bookable)[6].time, paymentStatus: "PENDING",
});
const off2 = r.json?.data?.appointment;
check("Walk-in with a registered phone links to that patient", off2?.patientId && off2.patientId === (await alice.get("/api/auth/me")).json?.data?.user?.id);

r = await admin.post(`/api/admin/payments/${b2.id}/record`, { type: "CHARGE", method: "CASH" });
check("11. Admin can record an offline payment", r.status === 201 && r.json?.data?.appointment?.paymentStatus === "PAID" && r.json?.data?.payment?.amount === 300);
r = await admin.post(`/api/admin/payments/${b2.id}/record`, { type: "CHARGE", method: "CASH" });
check("11. Offline payment cannot be recorded twice", r.status === 409);
r = await admin.post(`/api/admin/payments/${b1.id}/record`, { type: "REFUND", method: "UPI" });
check("Admin can record a refund for a cancelled paid booking", r.status === 201 && r.json?.data?.appointment?.paymentStatus === "REFUNDED");

// ---------- Admin: status transitions ----------
r = await admin.patch(`/api/admin/bookings/${b2.id}`, { action: "status", status: "COMPLETED" });
check("Invalid status jump BOOKED→COMPLETED is rejected", r.status === 400);
r = await admin.patch(`/api/admin/bookings/${b2.id}`, { action: "status", status: "CONFIRMED" });
r = await admin.patch(`/api/admin/bookings/${b2.id}`, { action: "status", status: "COMPLETED" });
check("Admin can move a booking BOOKED→CONFIRMED→COMPLETED", r.json?.data?.appointment?.appointmentStatus === "COMPLETED");
r = await admin.patch(`/api/admin/bookings/${off2.id}`, { action: "cancel", reason: "Patient called to cancel" });
check("Admin can cancel with a reason", r.json?.data?.appointment?.appointmentStatus === "CANCELLED" && r.json?.data?.appointment?.cancellationReason === "Patient called to cancel");

// ---------- Price snapshots ----------
await admin.patch(`/api/admin/tests/${t1.id}`, { ...t1, id: undefined, price: 999 });
r = await alice.get(`/api/bookings/${b2.id}`);
check("Historical bookings keep the price at booking time", r.json?.data?.appointment?.tests?.[0]?.price === 300);

// ---------- Dashboard / reports ----------
r = await admin.get(`/api/admin/reports?branchId=${branch.id}`);
const st = r.json?.data?.stats;
// This branch: b1 950.5 cancelled+refunded, b2 300 paid+completed, 2 parallel unpaid (300 each), off 650.5 paid, off2 300 cancelled
check("9. Dashboard totals computed from data", !!st &&
  st.totalBookings === 6 && st.cancelledBookings === 2 &&
  st.totalBookingValue === 300 + 600 + 650.5 &&
  st.grossCollected === 950.5 + 300 + 650.5 && st.refundsPaid === 950.5 &&
  st.paymentsCollected === 950.5 && st.pendingPayments === 600 &&
  st.onlineBookings === 4 && st.offlineBookings === 2, JSON.stringify(st));
r = await admin.get(`/api/admin/dashboard`);
check("9. Admin dashboard endpoint responds", r.status === 200 && typeof r.json?.data?.stats?.totalBookings === "number");
r = await admin.get(`/api/admin/reports?branchId=${branch.id}&format=csv`);
check("Bookings export as CSV", r.status === 200 && (r.text ?? "").includes(b2.bookingReference));
r = await admin.get(`/api/admin/patients?q=${alicePhone}`);
check("Admin patient search by phone (no password hash exposed)", r.json?.data?.patients?.length === 1 && !JSON.stringify(r.json).includes("passwordHash"));

// ---------- Deactivate branch ----------
r = await admin.patch(`/api/admin/branches/${branch.id}`, { isActive: false });
r = await anon.get("/api/branches");
check("Deactivated branch disappears from the public site", !r.json?.data?.branches?.some((b) => b.id === branch.id));
r = await alice.get(`/api/bookings/${b2.id}`);
check("Deactivating a branch keeps its bookings", r.status === 200);
r = await alice.post("/api/bookings", { branchId: branch.id, testIds: [t2.id], appointmentDate: date, timeSlot: slot, paymentMode: "ONLINE" });
check("Inactive branches cannot be booked", r.status === 400);

r = await anon.req("POST", "/api/auth/login", { phone: alicePhone, password: "secret123" });
const csrf = await fetch(BASE + "/api/auth/logout", { method: "POST", headers: { Origin: "https://evil.example" } });
check("Cross-site POSTs are blocked", csrf.status === 403);

console.log(results.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
