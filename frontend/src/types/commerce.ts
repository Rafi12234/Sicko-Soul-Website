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

export type PublicProductImageRecord = {
  id: string;
  type: ProductImageType;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type PublicProductFeatureRecord = {
  id: string;
  text: string;
  sortOrder: number;
};

export type PublicProductVariantRecord = {
  id: string;
  size: string;
  sizeLabel: string;
  sizeGroup: "TOP" | "PANT" | "GENERAL";
  sku: string;
  price: number;
  availableQty: number;
  onHandQty: number;
  reservedQty: number;
  status: VariantStatus;
  isDefault: boolean;
};

export type PublicProductRecord = {
  id: string;
  slug: string;
  indexCode: string | null;
  skuBase: string;
  name: string;
  basePrice: number;
  currency: string;
  spec: string | null;
  tagline: string | null;
  description: string | null;
  category: {
    id: string;
    code: string;
    slug: string;
    name: string;
  };
  images: PublicProductImageRecord[];
  features: PublicProductFeatureRecord[];
  variants: PublicProductVariantRecord[];
  defaultVariantId: string | null;
  primaryImage: PublicProductImageRecord | null;
  wornImage: PublicProductImageRecord | null;
  availability: {
    status: "IN_STOCK" | "OUT_OF_STOCK";
    availableQty: number;
  };
};

export type PublicCategoryRecord = {
  id: string;
  code: string;
  slug: string;
  indexCode: string | null;
  name: string;
  ghostName: string | null;
  spec: string | null;
  tagline: string | null;
  registry: string | null;
  coverUrl: string | null;
  coverAlt: string | null;
  sortOrder: number;
  productCount: number;
};

export type CartStatus = "ACTIVE" | "CONVERTED" | "ABANDONED" | "EXPIRED";

export type ServerCartItemRecord = {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productIndex?: string | null;
  categoryName?: string | null;
  categoryIndex?: string | null;
  productSpec?: string | null;
  size: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  priceWhenAdded: number;
  currentPrice: number;
  availableQty: number;
  variantStatus: VariantStatus;
  lineTotal: number;
};

export type ServerCartRecord = {
  token: string;
  status: CartStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ServerCartItemRecord[];
  subtotal: number;
  currency: "BDT";
};

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

export type PaymentRecord = {
  id: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: "INITIATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "PARTIALLY_REFUNDED" | "REFUNDED";
  provider?: string | null;
  providerReference?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

export type CustomerOrder = {
  accessToken?: string;
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
  payments?: PaymentRecord[];
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

export type ComplaintCategoryCode = string;

export type ComplaintCategoryRecord = {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
};

export type ComplaintDirectory = {
  data: ComplaintCategoryRecord[];
  meta: {
    categoryCount: number;
    caseCount: number;
    resolvedCount: number;
  };
};

export type ComplaintMessage = {
  id: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  message: string;
  createdAt: string;
};

export type ComplaintCase = {
  accessToken?: string;
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
  publishedAt?: string | null;
  productName?: string;
};

export type PublicReviewFeed = {
  data: ProductReview[];
  meta: {
    total: number;
    averageRating: number;
    verifiedCount: number;
  };
};

export type CollectionProductRecord = {
  productId: string;
  sealed: boolean;
  sortOrder: number;
  product?: PublicProductRecord;
};

export type CollectionRecord = {
  id: string;
  code: string;
  slug: string;
  name: string;
  tagline?: string | null;
  releaseYear?: number | null;
  status: CollectionStatus;
  opensAt?: string | null;
  closesAt?: string | null;
  productCount?: number;
  products: CollectionProductRecord[];
};
