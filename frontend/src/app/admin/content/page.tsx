"use client";
import {useRouter} from "next/navigation";
import {useAdminSession} from "@/components/admin/AdminSessionProvider";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import ContentUpdateEditor from "@/components/admin/ContentUpdateEditor";
export default function Page(){const {token}=useAdminSession();const router=useRouter();return <><AdminPageHeading eyebrow="Workspace / CMS" title="CONTENT UPDATE" description="Edit homepage copy, navigation labels, headlines, captions and section text. Saves persist in the site-content database."/><ContentUpdateEditor token={token} onMedia={()=>router.push("/admin/media")}/></>}
