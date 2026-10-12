import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { connectDB } from "./mongodb";
import { env } from "./env";
import { AppError } from "./api";
import { User } from "@/models/User";
import type { Role } from "./constants";

export const SESSION_COOKIE = "bmd_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const BCRYPT_ROUNDS = 12;

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  phoneVerified: boolean;
};

const secretKey = () => new TextEncoder().encode(env.authSecret());

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Used to keep login timing similar whether or not the phone exists.
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= bcrypt.hash("bookmydiagno-timing-guard", BCRYPT_ROUNDS);
  await bcrypt.compare(password, await dummyHash).catch(() => false);
}

export async function signSession(userId: string, role: Role) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setIssuer("bookmydiagno")
    .sign(secretKey());
}

export async function setSessionCookie(userId: string, role: Role) {
  const token = await signSession(userId, role);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: env.isProduction(), sameSite: "lax", path: "/", maxAge: 0 });
}

/**
 * Resolves the logged-in user from the session cookie.
 * The user is re-loaded from MongoDB on every request so deactivated
 * accounts and role changes take effect immediately.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: "bookmydiagno", algorithms: ["HS256"] });
    if (!payload.sub) return null;
    await connectDB();
    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) return null;
    return {
      id: String(user._id),
      name: user.name,
      phone: user.phone,
      role: user.role as Role,
      phoneVerified: !!user.phoneVerified,
    };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "Please log in to continue.");
  return user;
}

export async function requirePatient(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "PATIENT") throw new AppError(403, "This action is only available to patient accounts.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AppError(403, "Administrator access required.");
  return user;
}
