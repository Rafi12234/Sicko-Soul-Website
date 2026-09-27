import type { Prisma, sizes_size_group } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";

async function resolveCategory(identifier: string) {
  const row = await prisma.product_categories.findFirst({
    where: { OR: [{ slug: identifier }, { code: identifier }] },
  });
  if (!row) throw new AppError({ statusCode: 422, code: "CATEGORY_NOT_FOUND", message: "Product category was not found." });
  return row;
}

async function resolveProduct(publicId: string) {
  const row = await prisma.products.findUnique({ where: { public_id: publicId } });
  if (!row) throw new AppError({ statusCode: 404, code: "PRODUCT_NOT_FOUND", message: "Product was not found." });
  return row;
}

async function resolveSize(
  tx: Prisma.TransactionClient,
  code: string,
  label: string | undefined,
  sizeGroup: sizes_size_group,
) {
  return tx.sizes.upsert({
    where: { code_size_group: { code, size_group: sizeGroup } },
    create: {
      code,
      label: label ?? code,
      size_group: sizeGroup,
      sort_order: 0,
      is_active: true,
    },
    update: {
      ...(label ? { label } : {}),
      is_active: true,
    },
  });
}

export async function listCategoriesForAdmin() {
  const rows = await prisma.product_categories.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sort_order: "asc" }, { category_id: "asc" }],
  });
  return rows.map((row) => ({
    id: row.category_id.toString(),
    code: row.code,
    slug: row.slug,
    indexCode: row.index_code,
    name: row.name,
    ghostName: row.ghost_name,
    spec: row.spec,
    tagline: row.tagline,
    registry: row.registry,
    coverUrl: row.cover_url,
    coverAlt: row.cover_alt,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    productCount: row._count.products,
  }));
}

export async function createCategoryForAdmin(
  input: {
    code: string;
    slug: string;
    indexCode?: string | null | undefined;
    name: string;
    ghostName?: string | null | undefined;
    spec?: string | null | undefined;
    tagline?: string | null | undefined;
    registry?: string | null | undefined;
    coverUrl?: string | null | undefined;
    coverAlt?: string | null | undefined;
    sortOrder: number;
    isActive: boolean;
  },
  audit: AuditContext,
) {
  const row = await prisma.product_categories.create({
    data: {
      code: input.code,
      slug: input.slug,
      index_code: input.indexCode ?? null,
      name: input.name,
      ghost_name: input.ghostName ?? null,
      spec: input.spec ?? null,
      tagline: input.tagline ?? null,
      registry: input.registry ?? null,
      cover_url: input.coverUrl ?? null,
      cover_alt: input.coverAlt ?? null,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    },
  });
  await recordAudit(audit, {
    action: "CATEGORY_CREATE",
    entityType: "product_category",
    entityId: row.category_id,
    newData: row,
  });
  return { id: row.category_id.toString(), slug: row.slug, name: row.name };
}

export async function updateCategoryForAdmin(
  categoryId: bigint,
  input: Record<string, unknown>,
  audit: AuditContext,
) {
  const old = await prisma.product_categories.findUnique({ where: { category_id: categoryId } });
  if (!old) throw new AppError({ statusCode: 404, code: "CATEGORY_NOT_FOUND", message: "Product category was not found." });

  const body = input as {
    code?: string;
    slug?: string;
    indexCode?: string | null;
    name?: string;
    ghostName?: string | null;
    spec?: string | null;
    tagline?: string | null;
    registry?: string | null;
    coverUrl?: string | null;
    coverAlt?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  };
  const data: Prisma.product_categoriesUpdateInput = {};
  if (body.code !== undefined) data.code = body.code;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.indexCode !== undefined) data.index_code = body.indexCode;
  if (body.name !== undefined) data.name = body.name;
  if (body.ghostName !== undefined) data.ghost_name = body.ghostName;
  if (body.spec !== undefined) data.spec = body.spec;
  if (body.tagline !== undefined) data.tagline = body.tagline;
  if (body.registry !== undefined) data.registry = body.registry;
  if (body.coverUrl !== undefined) data.cover_url = body.coverUrl;
  if (body.coverAlt !== undefined) data.cover_alt = body.coverAlt;
  if (body.sortOrder !== undefined) data.sort_order = body.sortOrder;
  if (body.isActive !== undefined) data.is_active = body.isActive;

  const row = await prisma.product_categories.update({ where: { category_id: categoryId }, data });
  await recordAudit(audit, {
    action: "CATEGORY_UPDATE",
    entityType: "product_category",
    entityId: categoryId,
    oldData: old,
    newData: row,
  });
  return { id: row.category_id.toString(), slug: row.slug, name: row.name, isActive: row.is_active };
}

export async function listProductsForAdmin() {
  const rows = await prisma.products.findMany({
    include: {
      product_categories: { select: { slug: true, name: true } },
      _count: {
        select: {
          product_images: true,
          product_features: true,
          product_variants: true,
        },
      },
    },
    orderBy: [{ created_at: "desc" }],
  });
  return rows.map((row) => ({
    id: row.product_id.toString(),
    publicId: row.public_id,
    slug: row.slug,
    name: row.name,
    skuBase: row.sku_base,
    category: row.product_categories,
    basePrice: Number(row.base_price.toString()),
    currency: row.currency,
    status: row.status,
    publishedAt: row.published_at?.toISOString() ?? null,
    imageCount: row._count.product_images,
    featureCount: row._count.product_features,
    variantCount: row._count.product_variants,
  }));
}

type CreateProductInput = {
  category: string;
  publicId: string;
  slug: string;
  indexCode?: string | null | undefined;
  skuBase: string;
  name: string;
  basePrice: number;
  currency: string;
  spec?: string | null | undefined;
  tagline?: string | null | undefined;
  description?: string | null | undefined;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  publishedAt?: string | null | undefined;
  images: Array<{ type: "STILL" | "WORN" | "GALLERY" | "OTHER"; url: string; alt?: string | null | undefined; sortOrder: number }>;
  features: string[];
  variants: Array<{
    sizeCode: string;
    sizeLabel?: string | undefined;
    sizeGroup: "TOP" | "PANT" | "GENERAL";
    sku: string;
    priceOverride?: number | null | undefined;
    isDefault: boolean;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    initialStock: number;
    reorderLevel: number;
  }>;
};

export async function createProductForAdmin(input: CreateProductInput, audit: AuditContext) {
  const category = await resolveCategory(input.category);

  const productId = await prisma.$transaction(async (tx) => {
    const product = await tx.products.create({
      data: {
        category_id: category.category_id,
        public_id: input.publicId,
        slug: input.slug,
        index_code: input.indexCode ?? null,
        sku_base: input.skuBase,
        name: input.name,
        base_price: input.basePrice,
        currency: input.currency,
        spec: input.spec ?? null,
        tagline: input.tagline ?? null,
        description: input.description ?? null,
        status: input.status,
        published_at: input.publishedAt
          ? new Date(input.publishedAt)
          : input.status === "ACTIVE"
            ? new Date()
            : null,
      },
    });

    if (input.images.length) {
      await tx.product_images.createMany({
        data: input.images.map((image) => ({
          product_id: product.product_id,
          image_type: image.type,
          image_url: image.url,
          alt_text: image.alt ?? null,
          sort_order: image.sortOrder,
        })),
      });
    }
    if (input.features.length) {
      await tx.product_features.createMany({
        data: input.features.map((feature, index) => ({
          product_id: product.product_id,
          feature_text: feature,
          sort_order: (index + 1) * 10,
        })),
      });
    }

    for (const variantInput of input.variants) {
      const size = await resolveSize(tx, variantInput.sizeCode, variantInput.sizeLabel, variantInput.sizeGroup);
      if (variantInput.isDefault) {
        await tx.product_variants.updateMany({
          where: { product_id: product.product_id },
          data: { is_default: false },
        });
      }
      const variant = await tx.product_variants.create({
        data: {
          product_id: product.product_id,
          size_id: size.size_id,
          sku: variantInput.sku,
          price_override: variantInput.priceOverride ?? null,
          is_default: variantInput.isDefault,
          status: variantInput.status,
        },
      });
      await tx.inventory_stock.create({
        data: {
          variant_id: variant.variant_id,
          on_hand_qty: variantInput.initialStock,
          reserved_qty: 0,
          reorder_level: variantInput.reorderLevel,
        },
      });
      if (variantInput.initialStock > 0) {
        await tx.inventory_movements.create({
          data: {
            variant_id: variant.variant_id,
            movement_type: "INITIAL",
            on_hand_delta: variantInput.initialStock,
            reserved_delta: 0,
            reference_type: "SYSTEM",
            note: "Initial stock created with product.",
            created_by_staff_id: audit.staff.id,
          },
        });
      }
    }

    await recordAudit(
      audit,
      {
        action: "PRODUCT_CREATE",
        entityType: "product",
        entityId: product.product_id,
        newData: { publicId: product.public_id, name: product.name, status: product.status },
      },
      tx,
    );

    return product.product_id;
  });

  const product = await prisma.products.findUnique({ where: { product_id: productId } });
  if (!product) throw new AppError({ statusCode: 500, code: "PRODUCT_READBACK_FAILED", message: "Product could not be read after creation.", expose: false });
  return { id: product.product_id.toString(), publicId: product.public_id, slug: product.slug, status: product.status };
}

export async function updateProductForAdmin(
  publicId: string,
  input: {
    category?: string | undefined;
    publicId?: string | undefined;
    slug?: string | undefined;
    indexCode?: string | null | undefined;
    skuBase?: string | undefined;
    name?: string | undefined;
    basePrice?: number | undefined;
    currency?: string | undefined;
    spec?: string | null | undefined;
    tagline?: string | null | undefined;
    description?: string | null | undefined;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | undefined;
    publishedAt?: string | null | undefined;
  },
  audit: AuditContext,
) {
  const old = await resolveProduct(publicId);
  const category = input.category ? await resolveCategory(input.category) : null;
  const data: Prisma.productsUncheckedUpdateInput = {};
  if (category) data.category_id = category.category_id;
  if (input.publicId !== undefined) data.public_id = input.publicId;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.indexCode !== undefined) data.index_code = input.indexCode;
  if (input.skuBase !== undefined) data.sku_base = input.skuBase;
  if (input.name !== undefined) data.name = input.name;
  if (input.basePrice !== undefined) data.base_price = input.basePrice;
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.spec !== undefined) data.spec = input.spec;
  if (input.tagline !== undefined) data.tagline = input.tagline;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.publishedAt !== undefined) data.published_at = input.publishedAt ? new Date(input.publishedAt) : null;
  else if (input.status === "ACTIVE" && old.published_at === null) data.published_at = new Date();

  const row = await prisma.products.update({
    where: { product_id: old.product_id },
    data,
  });
  await recordAudit(audit, {
    action: "PRODUCT_UPDATE",
    entityType: "product",
    entityId: row.product_id,
    oldData: old,
    newData: row,
  });
  return { id: row.product_id.toString(), publicId: row.public_id, slug: row.slug, status: row.status };
}

export async function archiveProductForAdmin(publicId: string, audit: AuditContext) {
  return updateProductForAdmin(publicId, { status: "ARCHIVED" }, audit);
}

export async function addProductImage(
  publicId: string,
  input: { type: "STILL" | "WORN" | "GALLERY" | "OTHER"; url: string; alt?: string | null | undefined; sortOrder: number },
  audit: AuditContext,
) {
  const product = await resolveProduct(publicId);
  const row = await prisma.product_images.create({
    data: {
      product_id: product.product_id,
      image_type: input.type,
      image_url: input.url,
      alt_text: input.alt ?? null,
      sort_order: input.sortOrder,
    },
  });
  await recordAudit(audit, { action: "PRODUCT_IMAGE_ADD", entityType: "product", entityId: product.product_id, newData: row });
  return { id: row.image_id.toString(), type: row.image_type, url: row.image_url };
}

export async function deleteProductImage(publicId: string, imageId: bigint, audit: AuditContext) {
  const product = await resolveProduct(publicId);
  const row = await prisma.product_images.findFirst({ where: { image_id: imageId, product_id: product.product_id } });
  if (!row) throw new AppError({ statusCode: 404, code: "PRODUCT_IMAGE_NOT_FOUND", message: "Product image was not found." });
  await prisma.product_images.delete({ where: { image_id: imageId } });
  await recordAudit(audit, { action: "PRODUCT_IMAGE_DELETE", entityType: "product", entityId: product.product_id, oldData: row });
  return { deleted: true };
}

export async function addProductFeature(
  publicId: string,
  input: { text: string; sortOrder: number },
  audit: AuditContext,
) {
  const product = await resolveProduct(publicId);
  const row = await prisma.product_features.create({
    data: { product_id: product.product_id, feature_text: input.text, sort_order: input.sortOrder },
  });
  await recordAudit(audit, { action: "PRODUCT_FEATURE_ADD", entityType: "product", entityId: product.product_id, newData: row });
  return { id: row.feature_id.toString(), text: row.feature_text, sortOrder: row.sort_order };
}

export async function deleteProductFeature(publicId: string, featureId: bigint, audit: AuditContext) {
  const product = await resolveProduct(publicId);
  const row = await prisma.product_features.findFirst({ where: { feature_id: featureId, product_id: product.product_id } });
  if (!row) throw new AppError({ statusCode: 404, code: "PRODUCT_FEATURE_NOT_FOUND", message: "Product feature was not found." });
  await prisma.product_features.delete({ where: { feature_id: featureId } });
  await recordAudit(audit, { action: "PRODUCT_FEATURE_DELETE", entityType: "product", entityId: product.product_id, oldData: row });
  return { deleted: true };
}

export async function addProductVariant(
  publicId: string,
  input: {
    sizeCode: string;
    sizeLabel?: string | undefined;
    sizeGroup: "TOP" | "PANT" | "GENERAL";
    sku: string;
    priceOverride?: number | null | undefined;
    isDefault: boolean;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    initialStock: number;
    reorderLevel: number;
  },
  audit: AuditContext,
) {
  const product = await resolveProduct(publicId);
  const variantId = await prisma.$transaction(async (tx) => {
    const size = await resolveSize(tx, input.sizeCode, input.sizeLabel, input.sizeGroup);
    if (input.isDefault) {
      await tx.product_variants.updateMany({ where: { product_id: product.product_id }, data: { is_default: false } });
    }
    const variant = await tx.product_variants.create({
      data: {
        product_id: product.product_id,
        size_id: size.size_id,
        sku: input.sku,
        price_override: input.priceOverride ?? null,
        is_default: input.isDefault,
        status: input.status,
      },
    });
    await tx.inventory_stock.create({
      data: {
        variant_id: variant.variant_id,
        on_hand_qty: input.initialStock,
        reserved_qty: 0,
        reorder_level: input.reorderLevel,
      },
    });
    if (input.initialStock > 0) {
      await tx.inventory_movements.create({
        data: {
          variant_id: variant.variant_id,
          movement_type: "INITIAL",
          on_hand_delta: input.initialStock,
          reference_type: "SYSTEM",
          note: "Initial stock created with variant.",
          created_by_staff_id: audit.staff.id,
        },
      });
    }
    await recordAudit(audit, { action: "PRODUCT_VARIANT_ADD", entityType: "product", entityId: product.product_id, newData: variant }, tx);
    return variant.variant_id;
  });
  return { id: variantId.toString() };
}

export async function updateProductVariant(
  publicId: string,
  variantId: bigint,
  input: {
    sku?: string | undefined;
    priceOverride?: number | null | undefined;
    isDefault?: boolean | undefined;
    status?: "ACTIVE" | "INACTIVE" | "ARCHIVED" | undefined;
    reorderLevel?: number | undefined;
  },
  audit: AuditContext,
) {
  const product = await resolveProduct(publicId);
  const old = await prisma.product_variants.findFirst({ where: { variant_id: variantId, product_id: product.product_id } });
  if (!old) throw new AppError({ statusCode: 404, code: "VARIANT_NOT_FOUND", message: "Product variant was not found." });

  const row = await prisma.$transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx.product_variants.updateMany({ where: { product_id: product.product_id }, data: { is_default: false } });
    }
    const updated = await tx.product_variants.update({
      where: { variant_id: variantId },
      data: {
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.priceOverride !== undefined ? { price_override: input.priceOverride } : {}),
        ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    if (input.reorderLevel !== undefined) {
      await tx.inventory_stock.update({
        where: { variant_id: variantId },
        data: { reorder_level: input.reorderLevel },
      });
    }
    await recordAudit(audit, { action: "PRODUCT_VARIANT_UPDATE", entityType: "product", entityId: product.product_id, oldData: old, newData: updated }, tx);
    return updated;
  });

  return { id: row.variant_id.toString(), sku: row.sku, status: row.status, isDefault: row.is_default };
}

export async function getProductForAdmin(publicId: string) {
  const product = await resolveProduct(publicId);
  const row = await prisma.products.findUnique({
    where: { product_id: product.product_id },
    include: {
      product_categories: true,
      product_images: { orderBy: [{ sort_order: "asc" }, { image_id: "asc" }] },
      product_features: { orderBy: [{ sort_order: "asc" }, { feature_id: "asc" }] },
      product_variants: {
        include: { sizes: true, inventory_stock: true },
        orderBy: [{ variant_id: "asc" }],
      },
    },
  });
  if (!row) throw new AppError({ statusCode: 404, code: "PRODUCT_NOT_FOUND", message: "Product was not found." });

  return {
    id: row.product_id.toString(),
    publicId: row.public_id,
    slug: row.slug,
    indexCode: row.index_code,
    skuBase: row.sku_base,
    name: row.name,
    basePrice: Number(row.base_price.toString()),
    currency: row.currency,
    spec: row.spec,
    tagline: row.tagline,
    description: row.description,
    status: row.status,
    publishedAt: row.published_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    category: {
      id: row.product_categories.category_id.toString(),
      code: row.product_categories.code,
      slug: row.product_categories.slug,
      name: row.product_categories.name,
    },
    images: row.product_images.map((image) => ({
      id: image.image_id.toString(),
      type: image.image_type,
      url: image.image_url,
      alt: image.alt_text,
      sortOrder: image.sort_order,
    })),
    features: row.product_features.map((feature) => ({
      id: feature.feature_id.toString(),
      text: feature.feature_text,
      sortOrder: feature.sort_order,
    })),
    variants: row.product_variants.map((variant) => ({
      id: variant.variant_id.toString(),
      size: variant.sizes.code,
      sizeLabel: variant.sizes.label,
      sizeGroup: variant.sizes.size_group,
      sku: variant.sku,
      priceOverride: variant.price_override ? Number(variant.price_override.toString()) : null,
      isDefault: variant.is_default,
      status: variant.status,
      inventory: variant.inventory_stock
        ? {
            onHandQty: variant.inventory_stock.on_hand_qty,
            reservedQty: variant.inventory_stock.reserved_qty,
            availableQty: Math.max(
              0,
              variant.inventory_stock.on_hand_qty - variant.inventory_stock.reserved_qty,
            ),
            reorderLevel: variant.inventory_stock.reorder_level,
          }
        : null,
    })),
  };
}
