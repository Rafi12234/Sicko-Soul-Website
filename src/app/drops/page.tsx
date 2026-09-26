import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import DropsArchive from "@/components/commerce/DropsArchive";

export const metadata: Metadata = {
  title: "Drop Archive — SICKO SOUL",
  description: "Live, scheduled and sealed Sicko Soul drop files.",
};

export default function DropsPage() {
  return (
    <>
      <Navbar />
      <DropsArchive />
    </>
  );
}
