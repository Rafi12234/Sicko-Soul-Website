import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import Cart from "@/components/commerce/Cart";

export const metadata: Metadata = {
  title: "Cart / Holding Cell — SICKO SOUL",
  description: "The Sicko Soul holding cell. Review the pieces before the order is taken.",
};

export default function CartPage() {
  return (
    <>
      <Navbar />
      <main>
        <Cart />
      </main>
    </>
  );
}
