import type { Metadata } from "next";
import ProductArchive from "@/components/sections/ProductArchive";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Product Archive — SICKO SOUL",
  description: "Every Sicko Soul category currently cleared for viewing.",
  openGraph: {
    title: "SICKO SOUL — Product Archive",
    description: "Every piece we let you see. Nothing more.",
    type: "website",
  },
};

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <main>
        <ProductArchive />
      </main>
    </>
  );
}
