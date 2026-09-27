import type { Prisma, payments_status } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";
import { decimalToNumber } from "../../utils/decimal.js";

function mapPayment(row: {
  payment_id: bigint;
  order_id: bigint;
  method: string;
  amount: { toString(): string };
  currency: string;
  status: string;
  provider: string | null;
  provider_reference: string | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: row.payment_id.toString(),
    orderId: row.order_id.toString(),
    method: row.method,
    amount: decimalToNumber(row.amount),
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference,
    paidAt: row.paid_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function syncOrderPaymentStatus(
  tx: Prisma.TransactionClient,
  orderId: bigint,
): Promise<void> {
  const order = await tx.orders.findUnique({
    where: { order_id: orderId },
    select: { grand_total: true },
  });
  if (!order) return;

  const [payments, refunds] = await Promise.all([
    tx.payments.findMany({ where: { order_id: orderId } }),
    tx.refunds.findMany({ where: { order_id: orderId, status: "COMPLETED" } }),
  ]);

  const orderTotal = decimalToNumber(order.grand_total);
  const refundedTotal = refunds.reduce(
    (sum, refund) => sum + decimalToNumber(refund.amount),
    0,
  );
  const paidTotal = payments
    .filter((payment) => ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status))
    .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);

  const status =
    refundedTotal >= orderTotal && orderTotal > 0
      ? "REFUNDED"
      : refundedTotal > 0
        ? "PARTIALLY_REFUNDED"
        : paidTotal >= orderTotal && orderTotal > 0
          ? "PAID"
          : payments.some((payment) => ["INITIATED", "PENDING"].includes(payment.status))
            ? "PENDING"
            : payments.some((payment) => payment.status === "FAILED")
              ? "FAILED"
              : "UNPAID";

  await tx.orders.update({
    where: { order_id: orderId },
    data: { payment_status: status },
  });
}


export async function listPaymentsForAdmin() {
  const rows = await prisma.payments.findMany({
    include: {
      orders: {
        select: {
          order_reference: true,
          customer_name: true,
        },
      },
    },
    orderBy: [{ created_at: "desc" }],
    take: 300,
  });

  return rows.map((row) => ({
    ...mapPayment(row),
    orderReference: row.orders.order_reference,
    customerName: row.orders.customer_name,
  }));
}

export async function createPaymentForAdmin(
  input: {
    orderReference: string;
    method: "COD" | "MANUAL" | "MOBILE_FINANCIAL_SERVICE" | "BANK_TRANSFER" | "CARD";
    amount: number;
    provider?: string | null | undefined;
    providerReference?: string | null | undefined;
    status: payments_status;
  },
  audit: AuditContext,
) {
  const order = await prisma.orders.findUnique({
    where: { order_reference: input.orderReference },
  });
  if (!order) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });

  return prisma.$transaction(async (tx) => {
    const row = await tx.payments.create({
      data: {
        order_id: order.order_id,
        method: input.method,
        amount: input.amount,
        currency: order.currency,
        status: input.status,
        provider: input.provider ?? null,
        provider_reference: input.providerReference ?? null,
        received_by_staff_id: audit.staff.id,
        paid_at: input.status === "PAID" ? new Date() : null,
      },
    });

    await syncOrderPaymentStatus(tx, order.order_id);
    await recordAudit(
      audit,
      {
        action: "PAYMENT_CREATE",
        entityType: "payment",
        entityId: row.payment_id,
        newData: mapPayment(row),
      },
      tx,
    );

    return mapPayment(row);
  });
}

export async function updatePaymentForAdmin(
  paymentId: bigint,
  input: {
    status: payments_status;
    provider?: string | null | undefined;
    providerReference?: string | null | undefined;
  },
  audit: AuditContext,
) {
  const old = await prisma.payments.findUnique({ where: { payment_id: paymentId } });
  if (!old) throw new AppError({ statusCode: 404, code: "PAYMENT_NOT_FOUND", message: "Payment was not found." });

  return prisma.$transaction(async (tx) => {
    const row = await tx.payments.update({
      where: { payment_id: paymentId },
      data: {
        status: input.status,
        ...(input.provider !== undefined ? { provider: input.provider } : {}),
        ...(input.providerReference !== undefined ? { provider_reference: input.providerReference } : {}),
        received_by_staff_id: audit.staff.id,
        paid_at: input.status === "PAID" ? old.paid_at ?? new Date() : old.paid_at,
      },
    });

    await syncOrderPaymentStatus(tx, row.order_id);
    await recordAudit(
      audit,
      {
        action: "PAYMENT_UPDATE",
        entityType: "payment",
        entityId: paymentId,
        oldData: mapPayment(old),
        newData: mapPayment(row),
      },
      tx,
    );

    return mapPayment(row);
  });
}
