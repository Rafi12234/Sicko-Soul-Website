import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { enqueueEmail } from "../email/email.service.js";
import { signCustomerAccess, type AccessKind } from "./customer-access.js";

// Never reveal whether a reference/email pair exists. The link's secret is a URL
// fragment, so it is not sent in HTTP requests to Next.js or the API.
export async function sendCustomerAccessLink(kind: AccessKind, reference: string, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const entity = kind === "order"
    ? await prisma.orders.findFirst({ where: { order_reference: reference, customer_email: normalized }, select: { order_id: true } })
    : await prisma.complaints.findFirst({ where: { case_reference: reference, contact_email: normalized }, select: { complaint_id: true } });
  if (!entity) return;
  const token = signCustomerAccess(kind, reference, 30 * 60, true);
  const path = kind === "order" ? `/orders/${encodeURIComponent(reference)}` : `/support/case/${encodeURIComponent(reference)}`;
  const accessLink = `${env.FRONTEND_ORIGIN}${path}#access=${encodeURIComponent(token)}`;
  // A fixed time bucket prevents unlimited repeated emails for the same record.
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  await prisma.$transaction(async (tx) => {
    await enqueueEmail(tx, {
      dedupeKey: `access:${kind}:${reference}:${bucket}`,
      eventType: "CUSTOMER_ACCESS",
      ...(kind === "order" ? { orderId: (entity as {order_id: bigint}).order_id } : { complaintId: (entity as {complaint_id: bigint}).complaint_id }),
      recipientEmail: normalized,
      subject: "SICKO SOUL / SECURE ACCESS LINK",
      templateKey: "customer-access",
      payload: { accessLink, expiresIn: "30 minutes", security: "Do not forward this link." },
    });
  });
}
