import type {
  CollectionStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ShipmentStatus,
} from "@/types/commerce";

export function money(value: number, currency = "BDT") {
  if (currency === "BDT") return `৳ ${Math.round(value).toLocaleString("en-BD")}`;
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(value);
}

export function clampQuantity(value: number, max: number) {
  return Math.max(1, Math.min(Number.isFinite(value) ? Math.round(value) : 1, Math.max(1, max)));
}

export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function humanizeStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function orderStatusIndex(status: OrderStatus) {
  const timeline: OrderStatus[] = [
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
  ];
  return timeline.indexOf(status);
}

export function orderStatusTone(status: OrderStatus) {
  if (status === "CANCELLED" || status === "REJECTED" || status === "RETURNED") return "danger";
  if (status === "DELIVERED") return "success";
  if (status === "PENDING_CONFIRMATION") return "warning";
  return "active";
}

export function shipmentStatusTone(status: ShipmentStatus) {
  if (status === "FAILED" || status === "RETURNED" || status === "CANCELLED") return "danger";
  if (status === "DELIVERED") return "success";
  return "active";
}

export function refundStatusTone(status: RefundStatus) {
  if (status === "REJECTED") return "danger";
  if (status === "COMPLETED") return "success";
  return "warning";
}

export function paymentStatusTone(status: PaymentStatus) {
  if (status === "PAID") return "success";
  if (status === "FAILED" || status === "REFUNDED") return "danger";
  return "warning";
}

export function collectionLabel(status: CollectionStatus) {
  switch (status) {
    case "LIVE":
      return "VAULT OPEN";
    case "SCHEDULED":
      return "ACCESS SCHEDULED";
    case "SEALED":
      return "VAULT SEALED";
    case "ARCHIVED":
      return "ARCHIVED";
    default:
      return "OFF RECORD";
  }
}
