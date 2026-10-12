import type {
  AppointmentStatus,
  BookingPaymentMode,
  BookingSource,
  CollectionMethod,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  Role,
} from "@/lib/constants";

export type OpeningHoursDTO = { open: string; close: string; days: number[] };

export type BranchDTO = {
  id: string;
  name: string;
  branchCode: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  openingHours: OpeningHoursDTO;
  services: string[];
  homeCollection: boolean;
  slotDurationMinutes: number;
  slotCapacity: number;
  isActive: boolean;
  distanceKm?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TestDTO = {
  id: string;
  name: string;
  testCode: string;
  kind: "TEST" | "PACKAGE";
  category: string;
  description: string;
  preparationInstructions: string;
  includes: string[];
  reportTime: string;
  price: number;
  isPopular: boolean;
  isActive: boolean;
};

export type BookedTestDTO = { testId: string; name: string; testCode: string; price: number };

export type AppointmentDTO = {
  id: string;
  bookingReference: string;
  patientId: string | null;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientGender: string | null;
  branchId: string;
  branchName: string;
  branchCode: string;
  tests: BookedTestDTO[];
  appointmentDate: string;
  timeSlot: string;
  collectionMethod: CollectionMethod;
  collectionAddress: string;
  bookingSource: BookingSource;
  appointmentStatus: AppointmentStatus;
  paymentMode: BookingPaymentMode;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  amountPaid: number;
  amountRefunded: number;
  cancellationReason: string;
  cancelledBy: string | null;
  cancelledAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: { from: string | null; to: string; note: string; at: string }[];
};

export type PaymentDTO = {
  id: string;
  appointmentId: string;
  bookingReference: string;
  provider: "DUMMY" | "OFFLINE";
  type: "CHARGE" | "REFUND";
  paymentReference: string;
  gatewayPaymentId: string | null;
  paymentMode: PaymentMethod;
  amount: number;
  status: PaymentRecordStatus;
  failureReason: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type MeDTO = { id: string; name: string; phone: string; role: Role; phoneVerified: boolean };

export type SlotDTO = { time: string; available: number; capacity: number; bookable: boolean };

export type DashboardStats = {
  totalBookings: number;
  todaysBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalBookingValue: number;
  paymentsCollected: number;
  grossCollected: number;
  refundsPaid: number;
  pendingPayments: number;
  refundsDue: number;
  onlineBookings: number;
  offlineBookings: number;
  activeBranches: number;
  registeredPatients: number;
};
