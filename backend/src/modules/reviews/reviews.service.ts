import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";

function mapReview(row: {
  review_id: bigint;
  reviewer_display_name: string;
  reviewer_email: string;
  rating: number;
  title: string | null;
  review_text: string;
  is_verified_purchase: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  submitted_at: Date;
  published_at: Date | null;
  products: { public_id: string; name: string };
}) {
  return {
    id: row.review_id.toString(),
    productId: row.products.public_id,
    displayName: row.reviewer_display_name,
    rating: row.rating,
    title: row.title ?? undefined,
    text: row.review_text,
    verifiedPurchase: row.is_verified_purchase,
    status: row.status,
    submittedAt: row.submitted_at.toISOString(),
    publishedAt: row.published_at?.toISOString() ?? null,
    productName: row.products.name,
  };
}

async function resolveProduct(identifier: string) {
  const product = await prisma.products.findFirst({
    where: {
      OR: [{ public_id: identifier }, { slug: identifier }],
      status: "ACTIVE",
      product_categories: { is: { is_active: true } },
    },
  });
  if (!product) {
    throw new AppError({ statusCode: 404, code: "PRODUCT_NOT_FOUND", message: "Product was not found." });
  }
  return product;
}

export async function listApprovedReviews(productIdentifier: string) {
  const product = await resolveProduct(productIdentifier);
  const rows = await prisma.product_reviews.findMany({
    where: { product_id: product.product_id, status: "APPROVED" },
    include: { products: { select: { public_id: true, name: true } } },
    orderBy: [{ published_at: "desc" }, { submitted_at: "desc" }],
  });
  return rows.map(mapReview);
}

export async function listApprovedReviewFeed(limit: number) {
  const where = {
    status: "APPROVED",
    products: {
      is: {
        status: "ACTIVE",
        product_categories: { is: { is_active: true } },
      },
    },
  } satisfies Prisma.product_reviewsWhereInput;

  const [rows, aggregate, verifiedCount] = await prisma.$transaction([
    prisma.product_reviews.findMany({
      where,
      include: { products: { select: { public_id: true, name: true } } },
      orderBy: [{ published_at: "desc" }, { submitted_at: "desc" }],
      take: limit,
    }),
    prisma.product_reviews.aggregate({
      where,
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.product_reviews.count({
      where: { ...where, is_verified_purchase: true },
    }),
  ]);

  return {
    data: rows.map(mapReview),
    meta: {
      total: aggregate._count._all,
      averageRating: aggregate._avg.rating ?? 0,
      verifiedCount,
    },
  };
}

export async function submitReview(
  productIdentifier: string,
  input: {
    displayName: string;
    email: string;
    rating: number;
    title?: string | undefined;
    text: string;
    orderReference?: string | undefined;
  },
) {
  const product = await resolveProduct(productIdentifier);

  let customerId: bigint | null = null;
  let orderItemId: bigint | null = null;
  let verified = false;

  if (input.orderReference) {
    const order = await prisma.orders.findUnique({
      where: { order_reference: input.orderReference },
      include: {
        order_items: {
          where: { product_id: product.product_id },
        },
      },
    });

    if (
      order &&
      order.customer_email.toLowerCase() === input.email.trim().toLowerCase() &&
      order.order_status === "DELIVERED"
    ) {
      const item = order.order_items.find((candidate) => candidate.product_id === product.product_id);
      if (item) {
        const existing = await prisma.product_reviews.findUnique({
          where: { order_item_id: item.order_item_id },
        });
        if (existing) {
          throw new AppError({
            statusCode: 409,
            code: "ORDER_ITEM_ALREADY_REVIEWED",
            message: "This purchased item already has a review.",
          });
        }
        customerId = order.customer_id;
        orderItemId = item.order_item_id;
        verified = true;
      }
    }
  }

  const row = await prisma.product_reviews.create({
    data: {
      product_id: product.product_id,
      customer_id: customerId,
      order_item_id: orderItemId,
      reviewer_display_name: input.displayName,
      reviewer_email: input.email.toLowerCase(),
      rating: input.rating,
      title: input.title ?? null,
      review_text: input.text,
      is_verified_purchase: verified,
      status: "PENDING",
    },
    include: { products: { select: { public_id: true, name: true } } },
  });

  return mapReview(row);
}

export async function listReviewsForAdmin() {
  const rows = await prisma.product_reviews.findMany({
    include: {
      products: { select: { public_id: true, name: true } },
    },
    orderBy: [{ submitted_at: "desc" }],
    take: 300,
  });

  return rows.map((row) => ({
    ...mapReview(row),
    productName: row.products.name,
    reviewerEmail: row.reviewer_email,
    moderationNote: row.moderation_note,
    publishedAt: row.published_at?.toISOString() ?? null,
  }));
}

export async function moderateReview(
  reviewId: bigint,
  input: { status: "APPROVED" | "REJECTED" | "HIDDEN"; note?: string | undefined },
  audit: AuditContext,
) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.product_reviews.findUnique({
      where: { review_id: reviewId },
    });
    if (!review) throw new AppError({ statusCode: 404, code: "REVIEW_NOT_FOUND", message: "Review was not found." });

    const row = await tx.product_reviews.update({
      where: { review_id: reviewId },
      data: {
        status: input.status,
        moderated_by_staff_id: audit.staff.id,
        moderation_note: input.note ?? null,
        published_at: input.status === "APPROVED" ? new Date() : review.published_at,
      },
      include: { products: { select: { public_id: true, name: true } } },
    });

    await tx.product_review_status_history.create({
      data: {
        review_id: reviewId,
        from_status: review.status,
        to_status: input.status,
        changed_by_staff_id: audit.staff.id,
        note: input.note ?? null,
      },
    });

    await recordAudit(
      audit,
      {
        action: "REVIEW_MODERATE",
        entityType: "product_review",
        entityId: reviewId,
        oldData: { status: review.status },
        newData: { status: input.status, note: input.note },
      },
      tx,
    );

    return mapReview(row);
  });
}
