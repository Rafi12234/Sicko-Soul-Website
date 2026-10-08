import type { RequestHandler } from "express";
import { complaintAccessSchema } from "./complaints.schema.js";
import { sendCustomerAccessLink } from "../customer-access/customer-access.service.js";
export const requestComplaintAccessController: RequestHandler = async (req, res) => {
  const { caseReference, email } = complaintAccessSchema.parse(req.body);
  await sendCustomerAccessLink("complaint", caseReference, email);
  res.set("Cache-Control", "no-store");
  res.json({ message: "If the case and email match, a secure access link will be sent." });
};
