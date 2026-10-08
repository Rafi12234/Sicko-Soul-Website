"use client";

import { ApiError, apiRequest } from "@/lib/apiClient";
import { authHeaders, saveCustomerAccess } from "@/lib/customerAccess";
import type {
  ComplaintCase,
  ComplaintCategoryCode,
  ComplaintDirectory,
  CollectionRecord,
  CreateOrderRequest,
  CustomerOrder,
  ProductReview,
  PublicReviewFeed,
  RefundRecord,
} from "@/types/commerce";

export async function createOrder(payload: CreateOrderRequest): Promise<CustomerOrder> {
  const order = await apiRequest<CustomerOrder>("/orders", {
    method: "POST", body: JSON.stringify(payload), cache: "no-store",
  });
  if (order.accessToken) saveCustomerAccess("order", order.reference, order.accessToken);
  return order;
}

export async function getOrder(orderReference: string): Promise<CustomerOrder | null> {
  try {
    return await apiRequest<CustomerOrder>(`/orders/${encodeURIComponent(orderReference)}`, {
      cache: "no-store", headers: authHeaders("order", orderReference),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function lookupOrder(orderReference: string, identifier: string) {
  return apiRequest<{ message: string }>("/orders/lookup", {
    method: "POST", cache: "no-store",
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
    headers: authHeaders("order", input.orderReference), cache: "no-store",
  });
}

export async function requestComplaintAccess(caseReference: string, email: string): Promise<{message: string}> {
  return apiRequest<{message: string}>("/complaints/access", {
    method: "POST", cache: "no-store", body: JSON.stringify({ caseReference, email }),
  });
}

export async function listComplaintCategories(): Promise<ComplaintDirectory> {
  return apiRequest<ComplaintDirectory>("/complaints/categories", { cache: "no-store" });
}

export async function createComplaint(input: {
  category: ComplaintCategoryCode;
  contactName?: string;
  contactEmail: string;
  orderReference?: string;
  subject?: string;
  message: string;
}): Promise<Pick<ComplaintCase, "reference" | "status">> {
  const complaint = await apiRequest<Pick<ComplaintCase, "reference" | "status">>("/complaints", {
    method: "POST", cache: "no-store",
    headers: input.orderReference ? authHeaders("order", input.orderReference) : {},
    body: JSON.stringify(input),
  });
  return complaint;
}

export async function getComplaintCase(caseReference: string): Promise<ComplaintCase | null> {
  try {
    return await apiRequest<ComplaintCase>(`/complaints/${encodeURIComponent(caseReference)}`, {
      cache: "no-store", headers: authHeaders("complaint", caseReference),
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
      headers: authHeaders("complaint", caseReference), cache: "no-store",
    },
  );
}

export async function listPublicReviews(limit = 18): Promise<PublicReviewFeed> {
  return apiRequest<PublicReviewFeed>(`/reviews?limit=${Math.max(1, Math.min(60, Math.round(limit)))}`, {
    cache: "no-store",
  });
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
    headers: input.orderReference ? authHeaders("order", input.orderReference) : {},
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
