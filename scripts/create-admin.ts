/**
 * Creates (or resets the password of) the initial administrator account.
 *
 *   ADMIN_NAME="Clinic Admin" ADMIN_PHONE=9XXXXXXXXX ADMIN_PASSWORD='...' npm run create-admin
 *
 * Values can also come from .env.local. Run it from your own machine against the
 * production MONGODB_URI. The website itself never allows creating admins.
 */
import "./load-env";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { normalizePhone } from "../src/lib/validation";
import { User } from "../src/models/User";

async function main() {
  const uri = process.env.MONGODB_URI;
  const name = process.env.ADMIN_NAME?.trim() || "BookMyDiagno Admin";
  const phone = normalizePhone(process.env.ADMIN_PHONE ?? "");
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!uri) throw new Error("MONGODB_URI is not set.");
  if (!phone) throw new Error("ADMIN_PHONE must be a valid 10-digit Indian mobile number.");
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters and include letters and numbers.");
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  await User.syncIndexes();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ phone });

  if (existing && existing.role !== "ADMIN") {
    throw new Error(`Phone ${phone} already belongs to a patient account. Use a different ADMIN_PHONE.`);
  }
  if (existing) {
    existing.name = name;
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    await existing.save();
    console.log(`✔ Updated administrator ${phone} (password reset).`);
  } else {
    await User.create({ name, phone, passwordHash, role: "ADMIN", phoneVerified: false, isActive: true });
    console.log(`✔ Created administrator ${phone}. Sign in at /admin/login`);
  }
  console.log("  Remove ADMIN_PASSWORD from your shell history / env file now that it's set.");
}

main()
  .catch((err) => {
    console.error("✖", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
