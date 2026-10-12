import { route, ok, AppError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { serializeBranch } from "@/lib/serialize";
import { distanceKm } from "@/lib/geo";
import { Branch } from "@/models/Branch";

export const dynamic = "force-dynamic";

/**
 * Sorts active branches by distance from the coordinates in the query string.
 * The patient's coordinates are used only for this calculation; they are never stored or logged.
 */
export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!sp.get("lat") || !sp.get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new AppError(400, "Valid latitude and longitude are required.");
  }
  await connectDB();
  const branches = await Branch.find({ isActive: true }).lean();
  const withDistance = branches
    .filter((b) => typeof b.latitude === "number" && typeof b.longitude === "number")
    .map((b) => ({ ...serializeBranch(b), distanceKm: Math.round(distanceKm(lat, lng, b.latitude!, b.longitude!) * 10) / 10 }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const withoutLocation = branches
    .filter((b) => typeof b.latitude !== "number" || typeof b.longitude !== "number")
    .map((b) => ({ ...serializeBranch(b), distanceKm: null }));
  return ok({ branches: [...withDistance, ...withoutLocation], nearestId: withDistance[0]?.id ?? null });
});
