export type ProductImageType = "STILL" | "WORN" | "GALLERY" | "OTHER";

export type ProductImageRecord = {
  id: string;
  type: ProductImageType;
  url: string;
  alt: string;
  label?: string;
  sortOrder: number;
};

export type VariantStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type ProductVariantRecord = {
  id: string;
  size: string;
  sku: string;
  price: number;
  availableQty: number;
  status: VariantStatus;
  isDefault?: boolean;
};

export type CartStatus = "ACTIVE" | "CONVERTED" | "ABANDONED" | "EXPIRED";

export type PaymentMethod =
  | "COD"
  | "MANUAL"
  | "MOBILE_FINANCIAL_SERVICE"
  | "BANK_TRANSFER"
  | "CARD";

export type OrderStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED"
  | "RETURNED";

export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type ShipmentStatus =
  | "PENDING"
  | "READY"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED"
  | "CANCELLED";

export type RefundStatus = "REQUESTED" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";

export type ComplaintStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";

export type CollectionStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "SEALED" | "ARCHIVED";

export type OrderLineSnapshot = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  size: string;
  sku: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderHistoryEntry = {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string;
  changedAt: string;
};

export type ShipmentHistoryEntry = {
  id: string;
  fromStatus?: ShipmentStatus | null;
  toStatus: ShipmentStatus;
  note?: string;
  changedAt: string;
};

export type ShipmentRecord = {
  id: string;
  courierName?: string;
  courierService?: string;
  trackingCode?: string;
  status: ShipmentStatus;
  shippingCost: number;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  history: ShipmentHistoryEntry[];
};

export type RefundRecord = {
  id: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  processedAt?: string | null;
};

export type CustomerOrder = {
  reference: string;
  source: "CART" | "BUY_NOW";
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingPostalCode?: string;
  shippingLandmark?: string;
  note?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  currency: "BDT";
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  placedAt: string;
  items: OrderLineSnapshot[];
  history: OrderHistoryEntry[];
  shipment?: ShipmentRecord | null;
  refunds?: RefundRecord[];
};

export type CreateOrderRequest = {
  idempotencyKey: string;
  source: "CART" | "BUY_NOW";
  cartToken?: string | null;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  shipping: {
    address: string;
    city: string;
    district: string;
    postalCode?: string;
    landmark?: string;
  };
  note?: string;
  paymentMethod: PaymentMethod;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
};

export type ComplaintCategoryCode = "defect" | "delivery" | "sizing" | "refund" | "other";

export type ComplaintMessage = {
  id: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  message: string;
  createdAt: string;
};

export type ComplaintCase = {
  reference: string;
  category: ComplaintCategoryCode;
  orderReference?: string;
  contactName?: string;
  contactEmail: string;
  subject?: string;
  message: string;
  status: ComplaintStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdAt: string;
  messages: ComplaintMessage[];
};

export type ProductReview = {
  id: string;
  productId: string;
  displayName: string;
  rating: number;
  title?: string;
  text: string;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  submittedAt: string;
};

export type CollectionProductRecord = {
  productId: string;
  sealed: boolean;
  sortOrder: number;
};

export type CollectionRecord = {
  id: string;
  code: string;
  slug: string;
  name: string;
  tagline?: string;
  releaseYear?: number;
  status: CollectionStatus;
  opensAt?: string | null;
  closesAt?: string | null;
  products: CollectionProductRecord[];
};
