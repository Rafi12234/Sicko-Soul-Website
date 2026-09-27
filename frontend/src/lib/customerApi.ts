"use client";

import { ApiError, apiRequest } from "@/lib/apiClient";
import type {
  ComplaintCase,
  ComplaintCategoryCode,
  CollectionRecord,
  CreateOrderRequest,
  CustomerOrder,
  ProductReview,
  RefundRecord,
} from "@/types/commerce";

export async function createOrder(payload: CreateOrderRequest): Promise<CustomerOrder> {
  return apiRequest<CustomerOrder>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrder(orderReference: string): Promise<CustomerOrder | null> {
  try {
    return await apiRequest<CustomerOrder>(`/orders/${encodeURIComponent(orderReference)}`, {
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function lookupOrder(orderReference: string, identifier: string) {
  return apiRequest<CustomerOrder>("/orders/lookup", {
    method: "POST",
    body: JSON.stringify({ reference: orderReference, identifier }),
  });
}

export async function requestRefund(input: {
  orderReference: string;
  amount: number;
  reason: string;
}): Promise<RefundRecord> {
  return apiRequest<RefundRecord>(`/orders/${encodeURIComponent(input.orderReference)}/refunds`, {
    method: "POST",
    body: JSON.stringify({ amount: input.amount, reason: input.reason }),
  });
}

export async function createComplaint(input: {
  category: ComplaintCategoryCode;
  contactName?: string;
  contactEmail: string;
  orderReference?: string;
  subject?: string;
  message: string;
}): Promise<ComplaintCase> {
  return apiRequest<ComplaintCase>("/complaints", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getComplaintCase(caseReference: string): Promise<ComplaintCase | null> {
  try {
    return await apiRequest<ComplaintCase>(`/complaints/${encodeURIComponent(caseReference)}`, {
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function replyComplaint(caseReference: string, message: string) {
  return apiRequest<ComplaintCase>(
    `/complaints/${encodeURIComponent(caseReference)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
}

export async function listReviews(productId: string) {
  return apiRequest<ProductReview[]>(`/products/${encodeURIComponent(productId)}/reviews`, {
    cache: "no-store",
  });
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
  return apiRequest<ProductReview>(`/products/${encodeURIComponent(input.productId)}/reviews`, {
    method: "POST",
    body: JSON.stringify({
      displayName: input.displayName,
      email: input.email,
      rating: input.rating,
      title: input.title,
      text: input.text,
      orderReference: input.orderReference,
    }),
  });
}

export async function listCollections(): Promise<CollectionRecord[]> {
  return apiRequest<CollectionRecord[]>("/collections", { cache: "no-store" });
}

export async function getCollection(slug: string): Promise<CollectionRecord | null> {
  try {
    return await apiRequest<CollectionRecord>(`/collections/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
