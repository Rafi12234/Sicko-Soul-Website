import { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";
import { decimalToNumber } from "../../utils/decimal.js";

function mapRefund(row: {
  refund_id: bigint;
  amount: { toString(): string };
  reason: string;
  status: "REQUESTED" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";
  created_at: Date;
  processed_at: Date | null;
}) {
  return {
    id: row.refund_id.toString(),
    amount: decimalToNumber(row.amount),
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    processedAt: row.processed_at?.toISOString() ?? null,
  };
}

export async function requestRefund(
  reference: string,
  input: { amount: number; reason: string },
) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ order_id: bigint }>>(
      Prisma.sql`SELECT order_id FROM orders WHERE order_reference = ${reference} FOR UPDATE`,
    );
    const orderId = locked[0]?.order_id;
    if (!orderId) {
      throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });
    }

    const order = await tx.orders.findUnique({
      where: { order_id: orderId },
      include: {
        refunds: true,
        payments: { orderBy: [{ created_at: "desc" }] },
      },
    });
    if (!order) {
      throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });
    }
    if (["CANCELLED", "REJECTED"].includes(order.order_status)) {
      throw new AppError({ statusCode: 409, code: "REFUND_NOT_ALLOWED", message: "A refund cannot be requested for this order status." });
    }

    const committed = order.refunds
      .filter((refund) => refund.status !== "REJECTED")
      .reduce((sum, refund) => sum + decimalToNumber(refund.amount), 0);
    const maxRefundable = Math.max(0, decimalToNumber(order.grand_total) - committed);
    if (input.amount > maxRefundable) {
      throw new AppError({
        statusCode: 422,
        code: "REFUND_AMOUNT_TOO_HIGH",
        message: "Requested refund exceeds the remaining refundable amount.",
        details: { maxRefundable },
      });
    }

    const payment = order.payments.find((entry) =>
      ["PAID", "PARTIALLY_REFUNDED"].includes(entry.status),
    );
    const row = await tx.refunds.create({
      data: {
        order_id: order.order_id,
        payment_id: payment?.payment_id ?? null,
        amount: input.amount,
        reason: input.reason,
        status: "REQUESTED",
      },
    });
    return mapRefund(row);
  });
}


export async function listRefundsForAdmin() {
  const rows = await prisma.refunds.findMany({
    include: {
      orders: { select: { order_reference: true, customer_name: true, grand_total: true } },
      payments: true,
    },
    orderBy: [{ created_at: "desc" }],
    take: 300,
  });
  return rows.map((row) => ({
    ...mapRefund(row),
    orderReference: row.orders.order_reference,
    customerName: row.orders.customer_name,
    orderTotal: decimalToNumber(row.orders.grand_total),
    paymentId: row.payment_id?.toString() ?? null,
  }));
}

export async function updateRefundForAdmin(
  refundId: bigint,
  input: {
    status: "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";
    paymentId?: string | null | undefined;
  },
  audit: AuditContext,
) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refunds.findUnique({
      where: { refund_id: refundId },
      include: { orders: true },
    });
    if (!refund) {
      throw new AppError({ statusCode: 404, code: "REFUND_NOT_FOUND", message: "Refund was not found." });
    }

    const paymentId =
      input.paymentId === undefined
        ? refund.payment_id
        : input.paymentId === null
          ? null
          : BigInt(input.paymentId);

    if (paymentId) {
      const payment = await tx.payments.findFirst({
        where: { payment_id: paymentId, order_id: refund.order_id },
      });
      if (!payment) {
        throw new AppError({ statusCode: 422, code: "REFUND_PAYMENT_MISMATCH", message: "Selected payment does not belong to the refund order." });
      }
    }

    const row = await tx.refunds.update({
      where: { refund_id: refundId },
      data: {
        status: input.status,
        payment_id: paymentId,
        processed_by_staff_id: audit.staff.id,
        processed_at: ["COMPLETED", "REJECTED"].includes(input.status) ? new Date() : null,
      },
    });

    if (input.status === "COMPLETED") {
      const completed = await tx.refunds.findMany({
        where: { order_id: refund.order_id, status: "COMPLETED" },
      });
      const totalRefunded = completed.reduce((sum, item) => sum + decimalToNumber(item.amount), 0);
      const orderTotal = decimalToNumber(refund.orders.grand_total);
      const fullyRefunded = totalRefunded >= orderTotal;

      await tx.orders.update({
        where: { order_id: refund.order_id },
        data: { payment_status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      });

      if (paymentId) {
        await tx.payments.update({
          where: { payment_id: paymentId },
          data: { status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" },
        });
      }
    }

    await recordAudit(
      audit,
      {
        action: "REFUND_STATUS_UPDATE",
        entityType: "refund",
        entityId: refundId,
        oldData: { status: refund.status },
        newData: { status: input.status, paymentId: paymentId?.toString() ?? null },
      },
      tx,
    );

    return mapRefund(row);
  });
}
