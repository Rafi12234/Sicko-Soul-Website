import type { Metadata } from "next";
import AdminConsole from "@/components/admin/AdminConsole";

export const metadata: Metadata = {
  title: "SICKO SOUL / OPERATIONS",
  robots: { index: false, follow: false, nocache: true },
};
export default function AdminPage() { return <AdminConsole />; }
