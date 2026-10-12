function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const env = {
  mongodbUri: () => required("MONGODB_URI"),
  authSecret: () => {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters long");
    }
    return secret;
  },
  cancellationCutoffHours: () => intFromEnv("CANCELLATION_CUTOFF_HOURS", 2),
  bookingWindowDays: () => intFromEnv("BOOKING_WINDOW_DAYS", 30),
  payAtBranchEnabled: () => (process.env.PAY_AT_BRANCH_ENABLED ?? "true").toLowerCase() !== "false",
  isProduction: () => process.env.NODE_ENV === "production",
};
