import type { customers_status } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";

function mapCustomer(row: {
  customer_id: bigint;
  full_name: string;
  email: string;
  phone: string;
  status: customers_status;
  first_order_at: Date | null;
  last_order_at: Date | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: row.customer_id.toString(),
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    firstOrderAt: row.first_order_at?.toISOString() ?? null,
    lastOrderAt: row.last_order_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listCustomersForAdmin() {
  const rows = await prisma.customers.findMany({
    orderBy: [{ created_at: "desc" }],
    take: 500,
  });
  return rows.map(mapCustomer);
}

export async function getCustomerForAdmin(customerId: bigint) {
  const row = await prisma.customers.findUnique({
    where: { customer_id: customerId },
    include: {
      customer_addresses: { orderBy: [{ created_at: "desc" }] },
      orders: {
        select: {
          order_reference: true,
          order_status: true,
          payment_status: true,
          grand_total: true,
          currency: true,
          placed_at: true,
        },
        orderBy: [{ placed_at: "desc" }],
        take: 50,
      },
    },
  });

  if (!row) {
    throw new AppError({
      statusCode: 404,
      code: "CUSTOMER_NOT_FOUND",
      message: "Customer was not found.",
    });
  }

  return {
    ...mapCustomer(row),
    addresses: row.customer_addresses.map((address) => ({
      id: address.address_id.toString(),
      label: address.label,
      recipientName: address.recipient_name,
      recipientPhone: address.recipient_phone,
      address: address.address_line,
      city: address.city,
      district: address.district,
      postalCode: address.postal_code,
      landmark: address.landmark,
      isDefault: address.is_default,
    })),
    orders: row.orders.map((order) => ({
      reference: order.order_reference,
      status: order.order_status,
      paymentStatus: order.payment_status,
      grandTotal: Number(order.grand_total.toString()),
      currency: order.currency,
      placedAt: order.placed_at.toISOString(),
    })),
  };
}

export async function updateCustomerStatusForAdmin(
  customerId: bigint,
  status: customers_status,
  audit: AuditContext,
) {
  const old = await prisma.customers.findUnique({ where: { customer_id: customerId } });
  if (!old) {
    throw new AppError({
      statusCode: 404,
      code: "CUSTOMER_NOT_FOUND",
      message: "Customer was not found.",
    });
  }

  const row = await prisma.customers.update({
    where: { customer_id: customerId },
    data: { status },
  });

  await recordAudit(audit, {
    action: "CUSTOMER_STATUS_UPDATE",
    entityType: "customer",
    entityId: customerId,
    oldData: { status: old.status },
    newData: { status: row.status },
  });

  return mapCustomer(row);
}
