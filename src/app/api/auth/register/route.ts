import { route, ok, readJson, AppError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { registerSchema } from "@/lib/validation";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { User } from "@/models/User";

export const POST = route(async (req) => {
  const body = registerSchema.parse(await readJson(req));
  await connectDB();

  const existing = await User.exists({ phone: body.phone });
  if (existing) {
    throw new AppError(409, "An account with this phone number already exists. Please log in.", {
      phone: "This phone number is already registered.",
    });
  }

  let user;
  try {
    user = await User.create({
      name: body.name,
      phone: body.phone,
      passwordHash: await hashPassword(body.password),
      role: "PATIENT", // public registration can never create an admin
      phoneVerified: false, // no OTP provider configured in this version
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new AppError(409, "An account with this phone number already exists. Please log in.", { phone: "This phone number is already registered." });
    }
    throw err;
  }

  await setSessionCookie(String(user._id), "PATIENT");
  return ok({ id: String(user._id), name: user.name, phone: user.phone, role: user.role, phoneVerified: false }, 201);
});
