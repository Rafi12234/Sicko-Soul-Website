"use client";
import {useAdminSession} from "@/components/admin/AdminSessionProvider";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import CatalogHierarchyEditor from "@/components/admin/CatalogHierarchyEditor";
export default function Page(){const {token}=useAdminSession();return <><AdminPageHeading eyebrow="Commerce / Catalog" title="CATEGORIES & SEGMENTS" description="Manage the existing Clothing and Lifestyle hierarchy without affecting product images or stock."/><CatalogHierarchyEditor token={token}/></>}
