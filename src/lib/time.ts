// All appointment dates/times are India Standard Time (UTC+05:30, no DST).
// Dates are stored as "YYYY-MM-DD" and slots as "HH:mm" so they never shift with server time zones.

const IST_OFFSET_MIN = 330;

export function nowInIST(now: Date = new Date()) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  const date = shifted.toISOString().slice(0, 10);
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return { date, minutes, weekday: shifted.getUTCDay() };
}

export function todayIST(now: Date = new Date()) {
  return nowInIST(now).date;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Absolute instant (UTC Date) for an IST date + slot. */
export function istToDate(date: string, slot: string): Date {
  return new Date(`${date}T${slot}:00+05:30`);
}

export type OpeningHours = { open: string; close: string; days: number[] };

/** All slot start times for a branch on a date (empty if the branch is closed that day). */
export function generateSlots(hours: OpeningHours, date: string, durationMinutes: number): string[] {
  if (!hours.days.includes(weekdayOf(date))) return [];
  const start = toMinutes(hours.open);
  const end = toMinutes(hours.close);
  const slots: string[] = [];
  for (let t = start; t + durationMinutes <= end; t += durationMinutes) slots.push(fromMinutes(t));
  return slots;
}

/** A slot is bookable only if it starts at least `leadMinutes` from now (IST). */
export function isSlotInPast(date: string, slot: string, now: Date = new Date(), leadMinutes = 30): boolean {
  return istToDate(date, slot).getTime() < now.getTime() + leadMinutes * 60_000;
}

export function formatSlot(slot: string): string {
  const mins = toMinutes(slot);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
