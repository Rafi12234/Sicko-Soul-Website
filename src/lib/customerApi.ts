"use client";

import { ALL_PRODUCTS, findProductById, getProductVariants } from "@/data/products";
import type {
  ComplaintCase,
  ComplaintCategoryCode,
  CollectionRecord,
  CreateOrderRequest,
  CustomerOrder,
  ProductReview,
  RefundRecord,
} from "@/types/commerce";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

const ORDER_KEY = "sicko-soul-demo-orders";
const CASE_KEY = "sicko-soul-demo-cases";
const REVIEW_KEY = "sicko-soul-demo-reviews";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error("DEMO_MODE");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "REQUEST FAILED";
    try {
      const payload = await response.json();
      message = payload?.message ?? payload?.error ?? message;
    } catch {
      // Keep the generic message when the API returned no JSON body.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

function reference(prefix: string) {
  const time = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${time}${random}`;
}

function findVariant(productId: string, variantId: string) {
  const lookup = findProductById(productId);
  if (!lookup) return null;
  const variant = getProductVariants(lookup.product).find((entry) => entry.id === variantId);
  return variant ? { ...lookup, variant } : null;
}

export async function createOrder(payload: CreateOrderRequest): Promise<CustomerOrder> {
  if (API_BASE) {
    return api<CustomerOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 700));

  const items = payload.items.map((line, index) => {
    const lookup = findVariant(line.productId, line.variantId);
    if (!lookup) throw new Error("ONE OR MORE GARMENTS ARE NO LONGER AVAILABLE.");

    const { product, variant } = lookup;
    if (variant.status !== "ACTIVE" || variant.availableQty < line.quantity) {
      throw new Error(`${product.name} / ${variant.size} DOES NOT HAVE ENOUGH STOCK.`);
    }

    return {
      id: `line-${index + 1}`,
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      size: variant.size,
      sku: variant.sku,
      imageUrl: product.still,
      unitPrice: variant.price,
      quantity: line.quantity,
      lineTotal: variant.price * line.quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryCharge = 0;
  const now = new Date().toISOString();

  const order: CustomerOrder = {
    reference: reference("SS"),
    source: payload.source,
    customerName: payload.customer.name,
    customerPhone: payload.customer.phone,
    customerEmail: payload.customer.email,
    shippingAddress: payload.shipping.address,
    shippingCity: payload.shipping.city,
    shippingDistrict: payload.shipping.district,
    shippingPostalCode: payload.shipping.postalCode,
    shippingLandmark: payload.shipping.landmark,
    note: payload.note,
    paymentMethod: payload.paymentMethod,
    paymentStatus: "UNPAID",
    status: "PENDING_CONFIRMATION",
    currency: "BDT",
    subtotal,
    deliveryCharge,
    grandTotal: subtotal + deliveryCharge,
    placedAt: now,
    items,
    history: [
      {
        id: "history-1",
        fromStatus: null,
        toStatus: "PENDING_CONFIRMATION",
        note: "Order request received.",
        changedAt: now,
      },
    ],
    shipment: null,
    refunds: [],
  };

  const orders = readLocal<CustomerOrder[]>(ORDER_KEY, []);
  writeLocal(ORDER_KEY, [order, ...orders]);
  return order;
}

export async function getOrder(orderReference: string): Promise<CustomerOrder | null> {
  if (API_BASE) {
    try {
      return await api<CustomerOrder>(`/orders/${encodeURIComponent(orderReference)}`);
    } catch {
      return null;
    }
  }

  const orders = readLocal<CustomerOrder[]>(ORDER_KEY, []);
  return (
    orders.find((order) => order.reference.toLowerCase() === orderReference.toLowerCase()) ?? null
  );
}

export async function lookupOrder(orderReference: string, identifier: string) {
  if (API_BASE) {
    return api<CustomerOrder>("/orders/lookup", {
      method: "POST",
      body: JSON.stringify({ reference: orderReference, identifier }),
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 450));
  const order = await getOrder(orderReference);
  if (!order) throw new Error("NO MATCHING ORDER FILE WAS FOUND.");

  const needle = identifier.trim().toLowerCase();
  const valid =
    order.customerEmail.trim().toLowerCase() === needle ||
    order.customerPhone.trim().toLowerCase() === needle;

  if (!valid) throw new Error("ORDER REFERENCE AND CONTACT DO NOT MATCH.");
  return order;
}

export async function requestRefund(input: {
  orderReference: string;
  amount: number;
  reason: string;
}): Promise<RefundRecord> {
  if (API_BASE) {
    return api<RefundRecord>(`/orders/${encodeURIComponent(input.orderReference)}/refunds`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  const orders = readLocal<CustomerOrder[]>(ORDER_KEY, []);
  const index = orders.findIndex((order) => order.reference === input.orderReference);
  if (index < 0) throw new Error("ORDER NOT FOUND.");

  const refund: RefundRecord = {
    id: reference("RF"),
    amount: input.amount,
    reason: input.reason,
    status: "REQUESTED",
    createdAt: new Date().toISOString(),
  };

  orders[index] = {
    ...orders[index],
    refunds: [...(orders[index].refunds ?? []), refund],
  };
  writeLocal(ORDER_KEY, orders);
  return refund;
}

export async function createComplaint(input: {
  category: ComplaintCategoryCode;
  contactName?: string;
  contactEmail: string;
  orderReference?: string;
  subject?: string;
  message: string;
}): Promise<ComplaintCase> {
  if (API_BASE) {
    return api<ComplaintCase>("/complaints", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 550));
  const now = new Date().toISOString();

  const complaint: ComplaintCase = {
    reference: reference("CASE"),
    category: input.category,
    orderReference: input.orderReference,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    subject: input.subject,
    message: input.message,
    priority: "NORMAL",
    status: "OPEN",
    createdAt: now,
    messages: [
      {
        id: "message-1",
        senderType: "CUSTOMER",
        message: input.message,
        createdAt: now,
      },
      {
        id: "message-2",
        senderType: "SYSTEM",
        message: "CASE FILE CREATED. SUPPORT HAS BEEN NOTIFIED.",
        createdAt: now,
      },
    ],
  };

  const cases = readLocal<ComplaintCase[]>(CASE_KEY, []);
  writeLocal(CASE_KEY, [complaint, ...cases]);
  return complaint;
}

export async function getComplaintCase(caseReference: string): Promise<ComplaintCase | null> {
  if (API_BASE) {
    try {
      return await api<ComplaintCase>(`/complaints/${encodeURIComponent(caseReference)}`);
    } catch {
      return null;
    }
  }

  const cases = readLocal<ComplaintCase[]>(CASE_KEY, []);
  return cases.find((entry) => entry.reference.toLowerCase() === caseReference.toLowerCase()) ?? null;
}

export async function replyComplaint(caseReference: string, message: string) {
  if (API_BASE) {
    return api<ComplaintCase>(`/complaints/${encodeURIComponent(caseReference)}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  const cases = readLocal<ComplaintCase[]>(CASE_KEY, []);
  const index = cases.findIndex((entry) => entry.reference === caseReference);
  if (index < 0) throw new Error("CASE NOT FOUND.");

  const next: ComplaintCase = {
    ...cases[index],
    messages: [
      ...cases[index].messages,
      {
        id: reference("MSG"),
        senderType: "CUSTOMER",
        message,
        createdAt: new Date().toISOString(),
      },
    ],
  };
  cases[index] = next;
  writeLocal(CASE_KEY, cases);
  return next;
}

const BASE_REVIEWS: ProductReview[] = [
  {
    id: "review-seed-1",
    productId: "shirt-03",
    displayName: "M. RAHMAN",
    rating: 5,
    title: "THE CUT IS SERIOUS.",
    text: "Heavy enough to keep shape, but it still moves properly. The collar is the part that makes it.",
    verifiedPurchase: true,
    status: "APPROVED",
    submittedAt: "2026-08-14T14:22:00.000Z",
  },
  {
    id: "review-seed-2",
    productId: "dropshoulder-02",
    displayName: "NABIL",
    rating: 5,
    title: "LOOKS BETTER AFTER DARK.",
    text: "The body is wider than a normal tee without becoming sloppy. Exactly what I wanted.",
    verifiedPurchase: true,
    status: "APPROVED",
    submittedAt: "2026-08-22T11:05:00.000Z",
  },
];

export async function listReviews(productId: string) {
  if (API_BASE) return api<ProductReview[]>(`/products/${encodeURIComponent(productId)}/reviews`);

  const local = readLocal<ProductReview[]>(REVIEW_KEY, []);
  return [...BASE_REVIEWS, ...local].filter(
    (review) => review.productId === productId && review.status === "APPROVED",
  );
}

export async function submitReview(input: {
  productId: string;
  displayName: string;
  email: string;
  rating: number;
  title?: string;
  text: string;
  orderReference?: string;
}) {
  if (API_BASE) {
    return api<ProductReview>(`/products/${encodeURIComponent(input.productId)}/reviews`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  const review: ProductReview = {
    id: reference("REV"),
    productId: input.productId,
    displayName: input.displayName,
    rating: Math.max(1, Math.min(5, input.rating)),
    title: input.title,
    text: input.text,
    verifiedPurchase: false,
    status: "PENDING",
    submittedAt: new Date().toISOString(),
  };

  const local = readLocal<ProductReview[]>(REVIEW_KEY, []);
  writeLocal(REVIEW_KEY, [review, ...local]);
  return review;
}

export async function listCollections(): Promise<CollectionRecord[]> {
  if (API_BASE) return api<CollectionRecord[]>("/collections");

  const products = ALL_PRODUCTS.map(({ product }, index) => ({
    productId: product.id,
    sealed: false,
    sortOrder: index + 1,
  }));

  return [
    {
      id: "drop-001",
      code: "DROP-001",
      slug: "black-file",
      name: "BLACK FILE",
      tagline: "THE FIRST RECORD NEVER CLOSED.",
      releaseYear: 2026,
      status: "LIVE",
      opensAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      closesAt: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
      products: products.slice(0, 6),
    },
    {
      id: "drop-000",
      code: "DROP-000",
      slug: "first-offense",
      name: "FIRST OFFENSE",
      tagline: "THE ORIGINAL INCIDENT.",
      releaseYear: 2026,
      status: "SEALED",
      opensAt: null,
      closesAt: null,
      products: products.slice(2, 7).map((entry) => ({ ...entry, sealed: true })),
    },
  ];
}

export async function getCollection(slug: string) {
  if (API_BASE) {
    try {
      return await api<CollectionRecord>(`/collections/${encodeURIComponent(slug)}`);
    } catch {
      return null;
    }
  }

  const collections = await listCollections();
  return collections.find((entry) => entry.slug === slug) ?? null;
}
