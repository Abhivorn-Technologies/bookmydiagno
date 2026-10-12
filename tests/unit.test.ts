import { describe, expect, it } from "vitest";
import { addDays, generateSlots, isSlotInPast, isValidDateString, nowInIST, formatSlot } from "@/lib/time";
import { distanceKm } from "@/lib/geo";
import { normalizePhone, registerSchema, branchSchema, createBookingSchema } from "@/lib/validation";
import { APPOINTMENT_TRANSITIONS } from "@/lib/constants";

describe("time (IST)", () => {
  it("converts UTC instants to IST calendar date", () => {
    // 2026-10-11 20:00 UTC is 2026-10-12 01:30 IST
    expect(nowInIST(new Date("2026-10-11T20:00:00Z"))).toMatchObject({ date: "2026-10-12", minutes: 90 });
  });
  it("generates slots inside opening hours only on working days", () => {
    const hours = { open: "07:00", close: "09:00", days: [1] }; // Mondays
    expect(generateSlots(hours, "2026-10-12", 30)).toEqual(["07:00", "07:30", "08:00", "08:30"]); // Monday
    expect(generateSlots(hours, "2026-10-13", 30)).toEqual([]); // Tuesday
  });
  it("treats slots starting within 30 minutes as past", () => {
    const now = new Date("2026-10-12T02:00:00Z"); // 07:30 IST
    expect(isSlotInPast("2026-10-12", "07:30", now)).toBe(true);
    expect(isSlotInPast("2026-10-12", "08:00", now)).toBe(false);
  });
  it("validates dates and adds days across months", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(formatSlot("13:05")).toBe("1:05 PM");
  });
});

describe("geo", () => {
  it("computes great-circle distance in km", () => {
    // Charminar → Hyderabad airport is roughly 23 km in a straight line
    const d = distanceKm(17.3616, 78.4747, 17.2403, 78.4294);
    expect(d).toBeGreaterThan(13);
    expect(d).toBeLessThan(15);
    expect(distanceKm(17, 78, 17, 78)).toBe(0);
  });
});

describe("validation", () => {
  it("normalises Indian mobile numbers", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
    expect(normalizePhone("1234567890")).toBeNull();
    expect(normalizePhone("98765")).toBeNull();
  });
  it("requires matching passwords with a letter and a digit", () => {
    expect(registerSchema.safeParse({ name: "Asha", phone: "9876543210", password: "abc12345", confirmPassword: "abc12345" }).success).toBe(true);
    expect(registerSchema.safeParse({ name: "Asha", phone: "9876543210", password: "abc12345", confirmPassword: "abc12346" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Asha", phone: "9876543210", password: "abcdefgh", confirmPassword: "abcdefgh" }).success).toBe(false);
  });
  it("ignores client-sent totals when parsing bookings", () => {
    const parsed = createBookingSchema.parse({
      branchId: "a".repeat(24), testIds: ["b".repeat(24)], appointmentDate: "2026-10-20", timeSlot: "09:00",
      paymentMode: "ONLINE", totalAmount: 1,
    });
    expect("totalAmount" in parsed).toBe(false);
  });
  it("requires both coordinates or neither for branches", () => {
    const base = { name: "Branch", branchCode: "B-1", address: "Some street 1", city: "City", state: "State", pincode: "500001", phone: "9876543210", openingHours: { open: "07:00", close: "19:00", days: [1] } };
    expect(branchSchema.safeParse({ ...base, latitude: 17.4, longitude: null }).success).toBe(false);
    expect(branchSchema.safeParse(base).success).toBe(true);
    expect(branchSchema.safeParse({ ...base, openingHours: { open: "19:00", close: "07:00", days: [1] } }).success).toBe(false);
  });
});

describe("appointment status rules", () => {
  it("terminal statuses cannot change", () => {
    expect(APPOINTMENT_TRANSITIONS.COMPLETED).toEqual([]);
    expect(APPOINTMENT_TRANSITIONS.CANCELLED).toEqual([]);
    expect(APPOINTMENT_TRANSITIONS.BOOKED).not.toContain("COMPLETED");
  });
});

describe("branch coordinates", () => {
  it("keeps missing coordinates as null instead of 0", () => {
    const base = { name: "Branch", branchCode: "B-1", address: "Some street 1", city: "City", state: "State", pincode: "500001", phone: "9876543210", openingHours: { open: "07:00", close: "19:00", days: [1] } };
    const parsed = branchSchema.parse({ ...base, latitude: null, longitude: null });
    expect(parsed.latitude).toBeNull();
    expect(parsed.longitude).toBeNull();
    expect(branchSchema.parse({ ...base, latitude: "17.44", longitude: "78.39" }).latitude).toBe(17.44);
  });
});
