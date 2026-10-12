"use client";
import Link from "next/link";
import { ADMIN_SECTIONS,canAccessSection } from "@/lib/adminNavigation";
import {useAdminSession} from "@/components/admin/AdminSessionProvider";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
export default function AdminOverview() {
 const {staff}=useAdminSession();
 return <><AdminPageHeading eyebrow="Workspace / Overview" title="ADMIN DASHBOARD" description="Dedicated tools for site content, merchandising, fulfillment and staff management. Every operation is authenticated on the backend."/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{ADMIN_SECTIONS.filter(x=>x.href!=="/admin"&&staff&&canAccessSection(staff.role,x.href)).map(x=><Link href={x.href} key={x.href} className="group min-w-0 border border-white/15 bg-[#131316] p-5 transition-colors hover:border-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"><span className="font-mono text-xs text-red-400">{x.short} / {x.group}</span><h2 className="mt-4 font-display text-2xl uppercase">{x.label}</h2><span className="mt-5 inline-block text-xs uppercase tracking-wide text-white/45 group-hover:text-white">Open workspace →</span></Link>)}</div></>;
}
