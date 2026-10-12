import { route, ok, readJson, AppError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { loginSchema } from "@/lib/validation";
import { burnPasswordCheck, setSessionCookie, verifyPassword } from "@/lib/auth";
import { User } from "@/models/User";
import type { Role } from "@/lib/constants";

const INVALID = "Incorrect phone number or password.";

export const POST = route(async (req) => {
  const body = loginSchema.parse(await readJson(req));
  await connectDB();

  const user = await User.findOne({ phone: body.phone }).select("+passwordHash").lean();
  if (!user) {
    await burnPasswordCheck(body.password);
    throw new AppError(401, INVALID);
  }
  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) throw new AppError(401, INVALID);
  if (!user.isActive) throw new AppError(403, "This account has been deactivated. Please contact support.");

  if (body.portal === "admin" && user.role !== "ADMIN") throw new AppError(401, INVALID);
  if (body.portal === "patient" && user.role === "ADMIN") {
    throw new AppError(400, "Administrator accounts must sign in from the admin login page.");
  }

  await setSessionCookie(String(user._id), user.role as Role);
  return ok({ id: String(user._id), name: user.name, phone: user.phone, role: user.role, phoneVerified: !!user.phoneVerified });
});
