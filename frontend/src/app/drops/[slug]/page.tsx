import Navbar from "@/components/ui/Navbar";
import DropFile from "@/components/commerce/DropFile";

type Props = { params: Promise<{ slug: string }> };

export default async function DropPage({ params }: Props) {
  const { slug } = await params;
  return (
    <>
      <Navbar />
      <DropFile slug={decodeURIComponent(slug)} />
    </>
  );
}
