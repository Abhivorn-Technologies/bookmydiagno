import { NextResponse } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";

/** Error with an HTTP status that is safe to show to the user. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
  }
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string; fieldErrors?: Record<string, string> };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(status: number, error: string, fieldErrors?: Record<string, string>) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export function zodFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Converts any thrown error into a consistent JSON response without leaking internals. */
export function handleError(err: unknown) {
  if (err instanceof AppError) return fail(err.status, err.message, err.details);
  if (err instanceof ZodError) return fail(400, "Please correct the highlighted fields.", zodFieldErrors(err));
  if (err instanceof mongoose.Error.ValidationError) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(err.errors)) fieldErrors[k] = v.message;
    return fail(400, "Some values are invalid.", fieldErrors);
  }
  if (err instanceof mongoose.Error.CastError) return fail(400, "Invalid identifier.");
  if (typeof err === "object" && err && (err as { code?: number }).code === 11000) {
    return fail(409, "A record with the same unique value already exists.");
  }
  console.error("[api] unexpected error", err);
  return fail(500, "Something went wrong. Please try again.");
}

type RouteCtx<P> = { params: Promise<P> };

/** Wraps a route handler with error handling and same-origin protection for mutations. */
export function route<P = Record<string, string>>(
  fn: (req: Request, ctx: RouteCtx<P>) => Promise<Response>
) {
  return async (req: Request, ctx: RouteCtx<P>) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (err) {
      return handleError(err);
    }
  };
}

/**
 * Basic CSRF defence: state-changing requests must come from our own origin.
 * Combined with SameSite=Lax httpOnly cookies this blocks cross-site form posts.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, server-to-server) don't send Origin
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new AppError(403, "Cross-site request blocked.");
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(403, "Cross-site request blocked.");
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "Request body must be valid JSON.");
  }
}

export function isObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);
}

export function assertObjectId(id: string, what = "record") {
  if (!isObjectId(id)) throw new AppError(404, `${what[0].toUpperCase()}${what.slice(1)} not found.`);
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
