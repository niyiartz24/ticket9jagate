import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export const ticketCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(64)
  // Ticket codes are alphanumeric; reject anything containing URL syntax,
  // whitespace-in-the-middle, or control characters before it ever reaches
  // a query.
  .regex(/^[A-Za-z0-9\-_]+$/, "Ticket code contains invalid characters");

export const verifyTicketSchema = z.object({
  rawScanValue: z.string().trim().min(1).max(2048),
  eventId: z.string().cuid(),
});

export const checkInSchema = z.object({
  ticketCode: ticketCodeSchema,
  eventId: z.string().cuid(),
  scannedAt: z.string().datetime(),
  deviceId: z.string().max(128).optional(),
  clientScanId: z.string().uuid().optional(),
  adminOverrideReason: z.string().min(3).max(500).optional(),
});

export const syncBatchSchema = z.object({
  scans: z
    .array(
      z.object({
        clientScanId: z.string().uuid(),
        ticketCode: ticketCodeSchema,
        eventId: z.string().cuid(),
        scannedAt: z.string().datetime(),
        deviceId: z.string().max(128).optional(),
        localResult: z.enum(["SUCCESS", "DUPLICATE", "INVALID", "PAYMENT_INELIGIBLE"]),
      })
    )
    .max(200),
});

export const createEventSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  venue: z.string().min(2).max(300),
  eventDate: z.string().datetime(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).default("DRAFT"),
});

export const updateEventSchema = createEventSchema.partial();

export const createStaffSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(10).max(200),
  eventIds: z.array(z.string().cuid()).optional(),
});

export const updateStaffSchema = z.object({
  isActive: z.boolean().optional(),
  eventIds: z.array(z.string().cuid()).optional(),
  newPassword: z.string().min(10).max(200).optional(),
});

export const scanHistoryQuerySchema = z.object({
  eventId: z.string().cuid().optional(),
  staffId: z.string().cuid().optional(),
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const integrationConfigSchema = z.object({
  provider: z.literal("budpay"),
  apiKey: z.string().min(1),
  secretKey: z.string().min(1),
  baseUrl: z.string().url(),
  isActive: z.boolean(),
});
