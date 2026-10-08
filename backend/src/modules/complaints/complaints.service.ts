import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { env } from "../../config/env.js";
import { signCustomerAccess } from "../customer-access/customer-access.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";
import { createCaseReference } from "../../utils/references.js";
import { enqueueEmail } from "../email/email.service.js";

const complaintInclude = {
  complaint_categories: true,
  complaint_messages: {
    orderBy: [{ created_at: "asc" }, { complaint_message_id: "asc" }],
  },
  orders: {
    select: { order_reference: true },
  },
} satisfies Prisma.complaintsInclude;

type ComplaintWithRelations = Prisma.complaintsGetPayload<{
  include: typeof complaintInclude;
}>;

function mapComplaint(row: ComplaintWithRelations) {
  return {
    reference: row.case_reference,
    category: row.complaint_categories.code,
    orderReference: row.orders?.order_reference ?? undefined,
    contactName: row.contact_name ?? undefined,
    contactEmail: row.contact_email,
    subject: row.subject ?? undefined,
    message: row.message,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at.toISOString(),
    messages: row.complaint_messages.map((message) => ({
      id: message.complaint_message_id.toString(),
      senderType: message.sender_type,
      message: message.message,
      createdAt: message.created_at.toISOString(),
    })),
  };
}


export async function listPublicComplaintCategories() {
  const [categories, caseCount, resolvedCount] = await prisma.$transaction([
    prisma.complaint_categories.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { complaint_category_id: "asc" }],
    }),
    prisma.complaints.count(),
    prisma.complaints.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
  ]);

  return {
    data: categories.map((category) => ({
      id: category.complaint_category_id.toString(),
      code: category.code,
      label: category.label,
      sortOrder: category.sort_order,
    })),
    meta: {
      categoryCount: categories.length,
      caseCount,
      resolvedCount,
    },
  };
}

export async function createComplaint(input: {
  category: string;
  contactName?: string | undefined;
  contactEmail: string;
  orderReference?: string | undefined;
  subject?: string | undefined;
  message: string;
}) {
  const category = await prisma.complaint_categories.findFirst({
    where: { code: input.category, is_active: true },
  });
  if (!category) throw new AppError({ statusCode: 422, code: "COMPLAINT_CATEGORY_INVALID", message: "Complaint category is not available." });

  const order = input.orderReference
    ? await prisma.orders.findUnique({ where: { order_reference: input.orderReference } })
    : null;
  if (input.orderReference && !order) {
    throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Referenced order was not found." });
  }
  if (
    order &&
    order.customer_email.toLowerCase() !== input.contactEmail.trim().toLowerCase()
  ) {
    throw new AppError({
      statusCode: 422,
      code: "ORDER_CONTACT_MISMATCH",
      message: "The complaint email does not match the referenced order.",
    });
  }

  const customer =
    order
      ? await prisma.customers.findUnique({ where: { customer_id: order.customer_id } })
      : await prisma.customers.findUnique({ where: { email: input.contactEmail.toLowerCase() } });

  const complaint = await prisma.complaints.create({
    data: {
      case_reference: createCaseReference(),
      customer_id: customer?.customer_id ?? null,
      order_id: order?.order_id ?? null,
      complaint_category_id: category.complaint_category_id,
      contact_name: input.contactName ?? null,
      contact_email: input.contactEmail.toLowerCase(),
      subject: input.subject ?? null,
      message: input.message,
      priority: "NORMAL",
      status: "OPEN",
      complaint_messages: {
        create: [
          {
            sender_type: "CUSTOMER",
            customer_id: customer?.customer_id ?? null,
            message: input.message,
          },
          {
            sender_type: "SYSTEM",
            message: "CASE FILE CREATED. SUPPORT HAS BEEN NOTIFIED.",
          },
        ],
      },
    },
    include: complaintInclude,
  });

  // Never grant immediate read access based on an unverified email address.
  // Only the mailbox owner receives the short-lived case access capability.
  const url = `${env.FRONTEND_ORIGIN}/support/case/${encodeURIComponent(complaint.case_reference)}#access=${encodeURIComponent(signCustomerAccess("complaint", complaint.case_reference, 30 * 60))}`;
  await prisma.$transaction(async (tx) => {
    await enqueueEmail(tx, {
      dedupeKey: `new-complaint-access:${complaint.complaint_id.toString()}`,
      eventType: "CUSTOMER_ACCESS", complaintId: complaint.complaint_id,
      recipientEmail: complaint.contact_email,
      subject: `SICKO SOUL / CASE ${complaint.case_reference} ACCESS`,
      templateKey: "customer-access",
      payload: { accessLink: url, expiresIn: "30 minutes", security: "Only the named mailbox can open this case." },
    });
  });
  return { reference: complaint.case_reference, status: complaint.status };
}

export async function getComplaintCase(reference: string) {
  const row = await prisma.complaints.findUnique({
    where: { case_reference: reference },
    include: complaintInclude,
  });
  if (!row) throw new AppError({ statusCode: 404, code: "COMPLAINT_NOT_FOUND", message: "Complaint case was not found." });
  return mapComplaint(row);
}

export async function replyComplaintAsCustomer(reference: string, message: string) {
  const complaint = await prisma.complaints.findUnique({ where: { case_reference: reference } });
  if (!complaint) throw new AppError({ statusCode: 404, code: "COMPLAINT_NOT_FOUND", message: "Complaint case was not found." });
  if (["CLOSED", "REJECTED"].includes(complaint.status)) {
    throw new AppError({ statusCode: 409, code: "COMPLAINT_CLOSED", message: "This complaint case is closed." });
  }

  await prisma.$transaction([
    prisma.complaint_messages.create({
      data: {
        complaint_id: complaint.complaint_id,
        sender_type: "CUSTOMER",
        customer_id: complaint.customer_id,
        message,
      },
    }),
    prisma.complaints.update({
      where: { complaint_id: complaint.complaint_id },
      data: { status: "OPEN" },
    }),
  ]);

  return getComplaintCase(reference);
}

export async function listComplaintsForAdmin() {
  const rows = await prisma.complaints.findMany({
    include: {
      complaint_categories: true,
      orders: { select: { order_reference: true } },
      staff_users: { select: { staff_user_id: true, full_name: true, email: true } },
      _count: { select: { complaint_messages: true } },
    },
    orderBy: [{ created_at: "desc" }],
    take: 300,
  });
  return rows.map((row) => ({
    id: row.complaint_id.toString(),
    reference: row.case_reference,
    category: row.complaint_categories.code,
    orderReference: row.orders?.order_reference ?? null,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    subject: row.subject,
    priority: row.priority,
    status: row.status,
    assignedTo: row.staff_users
      ? {
          id: row.staff_users.staff_user_id.toString(),
          name: row.staff_users.full_name,
          email: row.staff_users.email,
        }
      : null,
    messageCount: row._count.complaint_messages,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function getComplaintForAdmin(complaintId: bigint) {
  const row = await prisma.complaints.findUnique({
    where: { complaint_id: complaintId },
    include: complaintInclude,
  });
  if (!row) {
    throw new AppError({
      statusCode: 404,
      code: "COMPLAINT_NOT_FOUND",
      message: "Complaint was not found.",
    });
  }
  return {
    id: row.complaint_id.toString(),
    ...mapComplaint(row),
  };
}

export async function updateComplaintForAdmin(
  complaintId: bigint,
  input: {
    status?: "OPEN" | "IN_REVIEW" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED" | "REJECTED" | undefined;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | undefined;
    assignedToStaffId?: string | null | undefined;
  },
  audit: AuditContext,
) {
  const old = await prisma.complaints.findUnique({ where: { complaint_id: complaintId } });
  if (!old) throw new AppError({ statusCode: 404, code: "COMPLAINT_NOT_FOUND", message: "Complaint was not found." });

  const assigned =
    input.assignedToStaffId === undefined
      ? old.assigned_to_staff_id
      : input.assignedToStaffId === null
        ? null
        : BigInt(input.assignedToStaffId);

  if (assigned) {
    const staff = await prisma.staff_users.findFirst({
      where: { staff_user_id: assigned, is_active: true },
    });
    if (!staff) throw new AppError({ statusCode: 422, code: "ASSIGNEE_INVALID", message: "Assigned staff user does not exist or is inactive." });
  }

  const status = input.status ?? old.status;
  const row = await prisma.complaints.update({
    where: { complaint_id: complaintId },
    data: {
      status,
      priority: input.priority ?? old.priority,
      assigned_to_staff_id: assigned,
      closed_at: ["CLOSED", "REJECTED"].includes(status) ? new Date() : null,
    },
  });

  await recordAudit(audit, {
    action: "COMPLAINT_UPDATE",
    entityType: "complaint",
    entityId: complaintId,
    oldData: old,
    newData: row,
  });

  return { id: row.complaint_id.toString(), reference: row.case_reference, status: row.status, priority: row.priority };
}

export async function replyComplaintAsStaff(
  complaintId: bigint,
  message: string,
  audit: AuditContext,
) {
  const complaint = await prisma.complaints.findUnique({ where: { complaint_id: complaintId } });
  if (!complaint) throw new AppError({ statusCode: 404, code: "COMPLAINT_NOT_FOUND", message: "Complaint was not found." });

  await prisma.$transaction(async (tx) => {
    const reply = await tx.complaint_messages.create({
      data: {
        complaint_id: complaintId,
        sender_type: "STAFF",
        staff_user_id: audit.staff.id,
        message,
      },
    });
    await tx.complaints.update({
      where: { complaint_id: complaintId },
      data: { status: "WAITING_CUSTOMER", assigned_to_staff_id: complaint.assigned_to_staff_id ?? audit.staff.id },
    });
    await enqueueEmail(tx, {
      dedupeKey: `complaint-reply:${reply.complaint_message_id.toString()}`,
      eventType: "COMPLAINT_REPLY",
      complaintId,
      customerId: complaint.customer_id,
      recipientName: complaint.contact_name,
      recipientEmail: complaint.contact_email,
      subject: `SICKO SOUL / CASE ${complaint.case_reference} UPDATED`,
      templateKey: "complaint-reply",
      payload: { caseReference: complaint.case_reference, message },
    });
    await recordAudit(
      audit,
      {
        action: "COMPLAINT_REPLY",
        entityType: "complaint",
        entityId: complaintId,
        newData: { message },
      },
      tx,
    );
  });

  return getComplaintCase(complaint.case_reference);
}
