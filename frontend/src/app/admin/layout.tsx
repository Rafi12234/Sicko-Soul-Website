import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminSessionProvider from "@/components/admin/AdminSessionProvider";
export const metadata: Metadata = {title:{default:"SICKO SOUL / CONTROL ROOM",template:"%s | SICKO SOUL ADMIN"},robots:{index:false,follow:false,nocache:true}};
export default function AdminLayout({children}:{children:ReactNode}) {
  return <AdminSessionProvider><AdminShell>{children}</AdminShell></AdminSessionProvider>;
}
