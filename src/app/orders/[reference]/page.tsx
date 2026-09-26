import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import OrderFile from "@/components/commerce/OrderFile";

type Props = { params: Promise<{ reference: string }> };

export const metadata: Metadata = { title: "Order File — SICKO SOUL" };

export default async function OrderPage({ params }: Props) {
  const { reference } = await params;
  return (
    <>
      <Navbar />
      <OrderFile reference={decodeURIComponent(reference)} />
    </>
  );
}
