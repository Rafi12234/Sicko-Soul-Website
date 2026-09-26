export type ProductImageType = "STILL" | "WORN" | "GALLERY" | "OTHER";
export type ProductVariantStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type ProductAvailabilityStatus = "IN_STOCK" | "OUT_OF_STOCK";

export type ProductCategoryRef = {
  id: string;
  code: string;
  slug: string;
  name: string;
};

export type ProductImage = {
  id: string;
  type: ProductImageType;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type ProductFeature = {
  id: string;
  text: string;
  sortOrder: number;
};

export type ProductVariant = {
  id: string;
  size: string;
  sizeLabel: string;
  sizeGroup: "TOP" | "PANT" | "GENERAL";
  sku: string;
  price: number;
  availableQty: number;
  onHandQty: number;
  reservedQty: number;
  status: ProductVariantStatus;
  isDefault: boolean;
};

export type ProductAvailability = {
  status: ProductAvailabilityStatus;
  availableQty: number;
};

export type PublicProduct = {
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
  category: ProductCategoryRef;
  images: ProductImage[];
  features: ProductFeature[];
  variants: ProductVariant[];
  defaultVariantId: string | null;
  primaryImage: ProductImage | null;
  wornImage: ProductImage | null;
  availability: ProductAvailability;
};

export type ProductListQuery = {
  page: number;
  limit: number;
  category?: string | undefined;
  q?: string | undefined;
};

export type ProductListResult = {
  products: PublicProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
