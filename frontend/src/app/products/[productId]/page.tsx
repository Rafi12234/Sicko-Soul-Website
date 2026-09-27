import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import ProductDetail from "@/components/commerce/ProductDetail";
import { ApiError } from "@/lib/apiClient";
import { getCatalogProduct } from "@/lib/catalogApi";

type ProductPageProps = {
  params: Promise<{ productId: string }>;
};

export const dynamic = "force-dynamic";

async function loadProduct(productId: string) {
  try {
    return await getCatalogProduct(productId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const lookup = await loadProduct(productId);
  if (!lookup) return { title: "Product File — SICKO SOUL" };

  return {
    title: `${lookup.product.name} — SICKO SOUL`,
    description: lookup.product.description,
    openGraph: {
      title: `${lookup.product.name} — SICKO SOUL`,
      description: lookup.product.line,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productId } = await params;
  const lookup = await loadProduct(productId);
  if (!lookup) notFound();

  return (
    <>
      <Navbar />
      <main>
        <ProductDetail product={lookup.product} category={lookup.category} />
      </main>
    </>
  );
}
