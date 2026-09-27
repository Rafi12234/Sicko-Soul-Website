import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  adminComplaintIdParamsSchema,
  adminComplaintUpdateSchema,
  complaintReferenceParamsSchema,
  complaintReplySchema,
  createComplaintSchema,
} from "./complaints.schema.js";
import {
  createComplaint,
  getComplaintCase,
  getComplaintForAdmin,
  listComplaintsForAdmin,
  listPublicComplaintCategories,
  replyComplaintAsCustomer,
  replyComplaintAsStaff,
  updateComplaintForAdmin,
} from "./complaints.service.js";

export const listComplaintCategoriesController: RequestHandler = async (_req, res) => {
  res.json(await listPublicComplaintCategories());
};

export const createComplaintController: RequestHandler = async (req, res) => {
  const input = createComplaintSchema.parse(req.body);
  res.status(201).json(await createComplaint(input));
};

export const getComplaintController: RequestHandler = async (req, res) => {
  const { caseReference } = complaintReferenceParamsSchema.parse(req.params);
  res.json(await getComplaintCase(caseReference));
};

export const replyComplaintController: RequestHandler = async (req, res) => {
  const { caseReference } = complaintReferenceParamsSchema.parse(req.params);
  const { message } = complaintReplySchema.parse(req.body);
  res.json(await replyComplaintAsCustomer(caseReference, message));
};

export const adminListComplaintsController: RequestHandler = async (_req, res) => {
  const data = await listComplaintsForAdmin();
  res.json({ data, meta: { count: data.length } });
};

export const adminGetComplaintController: RequestHandler = async (req, res) => {
  const { complaintId } = adminComplaintIdParamsSchema.parse(req.params);
  res.json({ data: await getComplaintForAdmin(BigInt(complaintId)) });
};

export const adminUpdateComplaintController: RequestHandler = async (req, res) => {
  const { complaintId } = adminComplaintIdParamsSchema.parse(req.params);
  const input = adminComplaintUpdateSchema.parse(req.body);
  res.json({ data: await updateComplaintForAdmin(BigInt(complaintId), input, auditContextFromRequest(req, res)) });
};

export const adminReplyComplaintController: RequestHandler = async (req, res) => {
  const { complaintId } = adminComplaintIdParamsSchema.parse(req.params);
  const { message } = complaintReplySchema.parse(req.body);
  res.json({ data: await replyComplaintAsStaff(BigInt(complaintId), message, auditContextFromRequest(req, res)) });
};
