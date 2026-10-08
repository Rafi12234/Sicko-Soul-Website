import { z } from "zod";

export const createComplaintSchema = z.object({
  category: z.string().trim().min(1).max(64),
  contactName: z.string().trim().max(150).optional(),
  contactEmail: z.string().trim().email().max(255),
  orderReference: z.string().trim().min(3).max(32).optional(),
  subject: z.string().trim().max(255).optional(),
  message: z.string().trim().min(5).max(10000),
});

export const complaintReferenceParamsSchema = z.object({
  caseReference: z.string().trim().min(3).max(32),
});

export const complaintAccessSchema = z.object({
  caseReference: z.string().trim().min(3).max(32),
  email: z.string().trim().email().max(255),
});

export const complaintReplySchema = z.object({
  message: z.string().trim().min(2).max(10000),
});

export const adminComplaintIdParamsSchema = z.object({
  complaintId: z.string().regex(/^\d+$/),
});

export const adminComplaintUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "REJECTED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedToStaffId: z.string().regex(/^\d+$/).nullable().optional(),
});
