import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import ProductDetail from "@/components/commerce/ProductDetail";
import { ALL_PRODUCTS, findProductById } from "@/data/products";

type ProductPageProps = {
  params: Promise<{ productId: string }>;
};

export function generateStaticParams() {
  return ALL_PRODUCTS.map(({ product }) => ({ productId: product.id }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const lookup = findProductById(productId);
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
  const lookup = findProductById(productId);
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
