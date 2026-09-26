import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import OrderLookup from "@/components/commerce/OrderLookup";

export const metadata: Metadata = {
  title: "Track Order — SICKO SOUL",
  description: "Locate a Sicko Soul order file.",
};

export default function TrackOrderPage() {
  return (
    <>
      <Navbar />
      <OrderLookup />
    </>
  );
}
