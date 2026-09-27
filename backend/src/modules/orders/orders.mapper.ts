import { decimalToNumber } from "../../utils/decimal.js";
import type { OrderDetailRow } from "./orders.repository.js";

export function mapOrder(row: OrderDetailRow) {
  const shipment = row.shipments[0] ?? null;
  return {
    reference: row.order_reference,
    source: row.source,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    shippingAddress: row.shipping_address,
    shippingCity: row.shipping_city,
    shippingDistrict: row.shipping_district,
    shippingPostalCode: row.shipping_postal_code ?? undefined,
    shippingLandmark: row.shipping_landmark ?? undefined,
    note: row.order_note ?? undefined,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.order_status,
    currency: row.currency,
    subtotal: decimalToNumber(row.subtotal),
    deliveryCharge: decimalToNumber(row.delivery_charge),
    grandTotal: decimalToNumber(row.grand_total),
    placedAt: row.placed_at.toISOString(),
    items: row.order_items.map((item) => ({
      id: item.order_item_id.toString(),
      productId: item.product_public_id_snapshot,
      variantId: item.variant_id?.toString() ?? null,
      productName: item.product_name_snapshot,
      size: item.size_snapshot,
      sku: item.sku_snapshot,
      imageUrl: item.image_url_snapshot ?? undefined,
      unitPrice: decimalToNumber(item.unit_price),
      quantity: item.quantity,
      lineTotal: decimalToNumber(item.line_total),
    })),
    history: row.order_status_history.map((entry) => ({
      id: entry.history_id.toString(),
      fromStatus: entry.from_status ?? null,
      toStatus: entry.to_status,
      note: entry.note ?? undefined,
      changedAt: entry.changed_at.toISOString(),
    })),
    shipment: shipment
      ? {
          id: shipment.shipment_id.toString(),
          courierName: shipment.courier_name ?? undefined,
          courierService: shipment.courier_service ?? undefined,
          trackingCode: shipment.tracking_code ?? undefined,
          status: shipment.status,
          shippingCost: decimalToNumber(shipment.shipping_cost),
          shippedAt: shipment.shipped_at?.toISOString() ?? null,
          deliveredAt: shipment.delivered_at?.toISOString() ?? null,
          history: shipment.shipment_status_history.map((entry) => ({
            id: entry.history_id.toString(),
            fromStatus: entry.from_status ?? null,
            toStatus: entry.to_status,
            note: entry.note ?? undefined,
            changedAt: entry.changed_at.toISOString(),
          })),
        }
      : null,
    refunds: row.refunds.map((refund) => ({
      id: refund.refund_id.toString(),
      amount: decimalToNumber(refund.amount),
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.created_at.toISOString(),
      processedAt: refund.processed_at?.toISOString() ?? null,
    })),
    payments: row.payments.map((payment) => ({
      id: payment.payment_id.toString(),
      method: payment.method,
      amount: decimalToNumber(payment.amount),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      providerReference: payment.provider_reference,
      paidAt: payment.paid_at?.toISOString() ?? null,
      createdAt: payment.created_at.toISOString(),
    })),
  };
}
