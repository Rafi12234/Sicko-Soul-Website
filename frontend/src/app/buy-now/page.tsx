import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import OrderIntake from "@/components/commerce/OrderIntake";
import { ApiError } from "@/lib/apiClient";
import { getCatalogProduct } from "@/lib/catalogApi";

export const metadata: Metadata = {
  title: "Order Intake — SICKO SOUL",
  description: "Submit a Sicko Soul order request. Stock and pricing are validated again by the order backend.",
};

export const dynamic = "force-dynamic";

type BuyNowPageProps = {
  searchParams: Promise<{
    source?: string;
    product?: string;
    size?: string;
    qty?: string;
  }>;
};

export default async function BuyNowPage({ searchParams }: BuyNowPageProps) {
  const params = await searchParams;
  const parsedQuantity = Number.parseInt(params.qty ?? "1", 10);
  let buyNowProduct = null;

  if (params.source !== "cart" && params.product) {
    try {
      buyNowProduct = await getCatalogProduct(params.product);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }

  return (
    <>
      <Navbar />
      <main>
        <OrderIntake
          source={params.source}
          productId={params.product}
          size={params.size}
          quantity={Number.isFinite(parsedQuantity) ? Math.max(1, parsedQuantity) : 1}
          buyNowProduct={buyNowProduct}
        />
      </main>
    </>
  );
}
