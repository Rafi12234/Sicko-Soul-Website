import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import OrderIntake from "@/components/commerce/OrderIntake";

export const metadata: Metadata = {
  title: "Order Intake — SICKO SOUL",
  description: "Submit the details for a Sicko Soul order request. No online payment is collected on this page.",
};

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

  return (
    <>
      <Navbar />
      <main>
        <OrderIntake
          source={params.source}
          productId={params.product}
          size={params.size}
          quantity={Number.isFinite(parsedQuantity) ? parsedQuantity : 1}
        />
      </main>
    </>
  );
}
