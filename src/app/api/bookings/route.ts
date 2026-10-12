import { route, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requirePatient } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validation";
import { createBooking } from "@/lib/booking";
import { serializeAppointment } from "@/lib/serialize";

export const POST = route(async (req) => {
  const user = await requirePatient();
  const body = createBookingSchema.parse(await readJson(req));
  await connectDB();

  // Totals are never accepted from the browser; createBooking re-prices from the database.
  const appointment = await createBooking({
    source: "ONLINE",
    patientId: user.id,
    patientName: body.patientName ?? user.name,
    patientPhone: user.phone,
    patientAge: body.patientAge ?? null,
    patientGender: body.patientGender ?? null,
    branchId: body.branchId,
    testIds: body.testIds,
    appointmentDate: body.appointmentDate,
    timeSlot: body.timeSlot,
    paymentMode: body.paymentMode,
    collectionMethod: body.collectionMethod,
    collectionAddress: body.collectionAddress,
    notes: body.notes,
    createdBy: user.id,
  });
  return ok({ appointment: serializeAppointment(appointment) }, 201);
});
