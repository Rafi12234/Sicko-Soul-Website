import { AppError } from "../../errors/app-error.js";
import { mapPublicProduct } from "./products.mapper.js";
import {
  findPublicProductByIdentifier,
  listPublicProducts,
} from "./products.repository.js";
import type {
  ProductListQuery,
  ProductListResult,
  PublicProduct,
} from "./products.types.js";

export async function getPublicProducts(query: ProductListQuery): Promise<ProductListResult> {
  const { rows, total } = await listPublicProducts(query);

  return {
    products: rows.map(mapPublicProduct),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
  };
}

export async function getPublicProduct(identifier: string): Promise<PublicProduct> {
  const row = await findPublicProductByIdentifier(identifier);

  if (!row) {
    throw new AppError({
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
      message: "Product was not found.",
    });
  }

  return mapPublicProduct(row);
}
