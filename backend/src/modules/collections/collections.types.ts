import type { PublicProduct } from "../products/products.types.js";

export type CollectionStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "SEALED" | "ARCHIVED";

export type PublicCollectionSummary = {
  id: string;
  code: string;
  slug: string;
  name: string;
  tagline: string | null;
  releaseYear: number | null;
  status: CollectionStatus;
  opensAt: string | null;
  closesAt: string | null;
  productCount: number;
};

export type PublicCollectionDetail = PublicCollectionSummary & {
  products: Array<{
    productId: string;
    sealed: boolean;
    sortOrder: number;
    product: PublicProduct;
  }>;
};
