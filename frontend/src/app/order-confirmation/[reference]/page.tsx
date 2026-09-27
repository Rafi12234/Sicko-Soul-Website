import Navbar from "@/components/ui/Navbar";
import OrderFile from "@/components/commerce/OrderFile";

type Props = { params: Promise<{ reference: string }> };

export default async function OrderConfirmationPage({ params }: Props) {
  const { reference } = await params;
  return (
    <>
      <Navbar />
      <OrderFile reference={decodeURIComponent(reference)} confirmation />
    </>
  );
}
