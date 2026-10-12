import { route, ok, AppError, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { bookingWindow, getSlotAvailability } from "@/lib/booking";
import { Branch } from "@/models/Branch";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  assertObjectId(id, "branch");
  const sp = new URL(req.url).searchParams;
  const date = sp.get("date") ?? "";
  await connectDB();
  const branch = await Branch.findOne({ _id: id, isActive: true }).lean();
  if (!branch) throw new AppError(404, "Branch not found.");

  // Staff creating walk-ins may pick a slot that has already started today.
  let allowPast = false;
  if (sp.get("allowPast") === "1") {
    const user = await getCurrentUser();
    allowPast = user?.role === "ADMIN";
  }
  const slots = await getSlotAvailability(branch, date, { allowPast });
  return ok({ date, slots, window: bookingWindow() });
});
